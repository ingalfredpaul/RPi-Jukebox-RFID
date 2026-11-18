#!/usr/bin/env python3
"""Phoniebox upload service (stdlib only, Python >= 3.13).

Small HTTP service that lets the web app upload and manage audio files below
the Phoniebox audio folder. It streams uploads to disk (64 KiB chunks, never
the whole file in RAM), writes atomically (tmp + rename) and triggers an MPD
database update afterwards.

SECURITY MODEL: there is NO login and NO HTTPS. The service binds to
127.0.0.1 by default and is meant to be reached only through the nginx
frontdoor inside the home network. The X-Requested-With header on POST
requests is only a CSRF speed bump, not authentication. Do not expose the
box to the internet.
"""
from __future__ import annotations

import argparse
import errno
import json
import logging
import os
import re
import secrets
import shutil
import signal
import socket
import stat
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

log = logging.getLogger("phoniebox-upload")

ALLOWED_EXTENSIONS = (
    "mp3", "m4a", "m4b", "ogg", "opus", "flac", "wav",  # audio
    "jpg", "jpeg", "png",  # cover images
)
CHUNK = 64 * 1024
MAX_PATH_BYTES = 1024
MAX_COMPONENT_BYTES = 255
MAX_DEPTH = 16
FILE_MODE = 0o664
DIR_MODE = 0o775
CSRF_HEADER = "X-Requested-With"
CSRF_VALUE = "phoniebox"


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

def load_config(environ=None, conf_path: str | None = None) -> dict:
    """Merge defaults < config file (KEY=VALUE) < environment."""
    environ = os.environ if environ is None else environ
    values: dict[str, str] = {}
    path = conf_path or environ.get("PHONIEBOX_UPLOAD_CONF")
    if path and os.path.isfile(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    for k, v in environ.items():
        if k.startswith("PHONIEBOX_UPLOAD_"):
            values[k] = v

    def get(name, default):
        return values.get("PHONIEBOX_UPLOAD_" + name, default)

    return {
        "root": os.path.abspath(os.path.expanduser(
            get("ROOT", "~/RPi-Jukebox-RFID/shared/audiofolders"))),
        "host": get("HOST", "127.0.0.1"),
        "port": int(get("PORT", "8081")),
        "max_bytes": int(get("MAX_BYTES", str(1024 ** 3))),
        "mpd_host": get("MPD_HOST", "localhost"),
        "mpd_port": int(get("MPD_PORT", "6600")),
        "max_uploads": int(get("MAX_UPLOADS", "4")),
    }


# --------------------------------------------------------------------------
# Path handling
# --------------------------------------------------------------------------

def clean_relpath(raw, allow_empty: bool = False) -> list[str]:
    """Validate a user supplied relative path and return its components.

    Rejects absolute paths, '..', '.', empty components, hidden names,
    backslashes, NUL/control characters and overlong paths.
    """
    if not isinstance(raw, str):
        raise ApiError(400, "bad_path", "Ungültiger Pfad.")
    if raw == "" or raw == "/":
        if allow_empty:
            return []
        raise ApiError(400, "bad_path", "Pfad fehlt.")
    if len(raw.encode("utf-8", "surrogatepass")) > MAX_PATH_BYTES:
        raise ApiError(400, "bad_path", "Pfad zu lang.")
    if raw.startswith("/"):
        raise ApiError(400, "bad_path", "Absolute Pfade sind nicht erlaubt.")
    if "\\" in raw:
        raise ApiError(400, "bad_path", "Ungültige Zeichen im Pfad.")
    parts = raw.split("/")
    if len(parts) > MAX_DEPTH:
        raise ApiError(400, "bad_path", "Pfad zu tief.")
    for p in parts:
        if p in ("", ".", "..") or p.startswith("."):
            raise ApiError(400, "bad_path", "Ungültiger Pfad (versteckte oder leere Namen).")
        if any(ord(c) < 0x20 or ord(c) == 0x7F for c in p):
            raise ApiError(400, "bad_path", "Ungültige Zeichen im Pfad.")
        try:
            if len(p.encode("utf-8")) > MAX_COMPONENT_BYTES:
                raise ApiError(400, "bad_path", "Name zu lang.")
        except UnicodeEncodeError:
            raise ApiError(400, "bad_path", "Ungültige Zeichen im Pfad.") from None
    return parts


def check_extension(name: str) -> str:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ApiError(415, "bad_extension",
                       "Dateityp nicht erlaubt (erlaubt: " + ", ".join(ALLOWED_EXTENSIONS) + ").")
    return ext


def _lstat(path: str):
    try:
        return os.lstat(path)
    except FileNotFoundError:
        return None


def walk_existing(root: str, parts: list[str]) -> str:
    """Join root + parts, refusing symlinks in every existing component.

    Components that do not exist yet are fine. Returns the full path.
    """
    cur = root
    for p in parts:
        cur = os.path.join(cur, p)
        st = _lstat(cur)
        if st is None:
            continue
        if stat.S_ISLNK(st.st_mode):
            raise ApiError(400, "symlink", "Symbolische Links sind nicht erlaubt.")
    return cur


def ensure_dir(root: str, parts: list[str]) -> str:
    """Create directories below root (no symlinks, mode 0775) and return the path."""
    cur = root
    for p in parts:
        cur = os.path.join(cur, p)
        st = _lstat(cur)
        if st is None:
            try:
                os.mkdir(cur, DIR_MODE)
            except FileExistsError:
                pass
            os.chmod(cur, DIR_MODE)
            st = os.lstat(cur)
        if stat.S_ISLNK(st.st_mode):
            raise ApiError(400, "symlink", "Symbolische Links sind nicht erlaubt.")
        if not stat.S_ISDIR(st.st_mode):
            raise ApiError(409, "not_a_directory", "Dort liegt bereits eine Datei.")
    return cur


# --------------------------------------------------------------------------
# Atomic file writer
# --------------------------------------------------------------------------

class FileWriter:
    """Write a file via a hidden tmp file in the target folder, then rename."""

    def __init__(self, root: str, parts: list[str], max_bytes: int):
        check_extension(parts[-1])
        self.max_bytes = max_bytes
        folder = ensure_dir(root, parts[:-1])
        self.final = os.path.join(folder, parts[-1])
        st = _lstat(self.final)
        if st is not None and stat.S_ISLNK(st.st_mode):
            raise ApiError(400, "symlink", "Symbolische Links sind nicht erlaubt.")
        if st is not None and stat.S_ISDIR(st.st_mode):
            raise ApiError(409, "is_directory", "Dort liegt bereits ein Ordner.")
        self.replaced = st is not None
        self.tmp = os.path.join(folder, ".upload-%s.part" % secrets.token_hex(6))
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
        self.fd = os.open(self.tmp, flags, 0o600)
        self.size = 0

    def write(self, data: bytes) -> None:
        self.size += len(data)
        if self.size > self.max_bytes:
            raise ApiError(413, "too_large", "Datei ist zu groß (Limit %d MB)." % (self.max_bytes // 1048576))
        view = memoryview(data)
        while view:
            n = os.write(self.fd, view)
            view = view[n:]

    def commit(self) -> int:
        os.fsync(self.fd)
        os.close(self.fd)
        self.fd = -1
        os.chmod(self.tmp, FILE_MODE)
        os.replace(self.tmp, self.final)
        self.tmp = None
        return self.size

    def abort(self) -> None:
        if self.fd >= 0:
            try:
                os.close(self.fd)
            except OSError:
                pass
            self.fd = -1
        if self.tmp:
            try:
                os.unlink(self.tmp)
            except OSError:
                pass
            self.tmp = None


# --------------------------------------------------------------------------
# Minimal streaming multipart parser
# --------------------------------------------------------------------------

class MultipartError(ValueError):
    pass


_CD_PARAM = re.compile(r'([A-Za-z*]+)="((?:[^"\\]|\\.)*)"|([A-Za-z*]+)=([^;\s]+)')


def _parse_disposition(value: str) -> dict:
    out = {}
    for m in _CD_PARAM.finditer(value):
        key = (m.group(1) or m.group(3)).lower()
        val = m.group(2) if m.group(1) else m.group(4)
        if m.group(1):
            val = re.sub(r"\\(.)", r"\1", val).replace("%22", '"')
        out[key] = val
    return out


class MultipartParser:
    """Incremental parser. feed(bytes) -> list of events:
    ('start', name, filename_or_None), ('data', bytes), ('end',).
    """
    PREAMBLE, AFTER_DELIM, HEADERS, BODY, DONE = range(5)

    def __init__(self, boundary: str):
        if not boundary or len(boundary) > 200:
            raise MultipartError("bad boundary")
        self.delim = b"\r\n--" + boundary.encode("latin-1")
        self.buf = b"\r\n"  # lets the very first boundary match like all others
        self.state = self.PREAMBLE

    @property
    def done(self) -> bool:
        return self.state == self.DONE

    def feed(self, chunk: bytes) -> list:
        events = []
        self.buf += chunk
        keep = len(self.delim) - 1
        while True:
            if self.state == self.PREAMBLE:
                i = self.buf.find(self.delim)
                if i < 0:
                    self.buf = self.buf[-keep:]
                    break
                self.buf = self.buf[i + len(self.delim):]
                self.state = self.AFTER_DELIM
            elif self.state == self.AFTER_DELIM:
                if len(self.buf) < 2:
                    break
                if self.buf[:2] == b"--":
                    self.state = self.DONE
                    self.buf = b""
                elif self.buf[:2] == b"\r\n":
                    self.buf = self.buf[2:]
                    self.state = self.HEADERS
                else:
                    raise MultipartError("bad boundary line")
            elif self.state == self.HEADERS:
                i = self.buf.find(b"\r\n\r\n")
                if i < 0:
                    if len(self.buf) > 16384:
                        raise MultipartError("headers too large")
                    break
                head = self.buf[:i].decode("utf-8", "replace")
                self.buf = self.buf[i + 4:]
                disp = {}
                for line in head.split("\r\n"):
                    k, _, v = line.partition(":")
                    if k.strip().lower() == "content-disposition":
                        disp = _parse_disposition(v)
                if "name" not in disp:
                    raise MultipartError("part without name")
                events.append(("start", disp["name"], disp.get("filename")))
                self.state = self.BODY
            elif self.state == self.BODY:
                i = self.buf.find(self.delim)
                if i >= 0:
                    if i:
                        events.append(("data", self.buf[:i]))
                    events.append(("end",))
                    self.buf = self.buf[i + len(self.delim):]
                    self.state = self.AFTER_DELIM
                else:
                    if len(self.buf) > keep:
                        events.append(("data", self.buf[:-keep]))
                        self.buf = self.buf[-keep:]
                    break
            else:  # DONE: ignore epilogue
                self.buf = b""
                break
        return events


# --------------------------------------------------------------------------
# MPD database update (tiny protocol client, debounced)
# --------------------------------------------------------------------------

def mpd_quote(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def mpd_update(host: str, port: int, uri: str = "", timeout: float = 3.0) -> None:
    with socket.create_connection((host, port), timeout=timeout) as s:
        s.settimeout(timeout)
        f = s.makefile("rwb")
        greeting = f.readline()
        if not greeting.startswith(b"OK MPD"):
            raise OSError("unexpected MPD greeting: %r" % greeting)
        cmd = "update" + (" " + mpd_quote(uri) if uri else "")
        f.write(cmd.encode("utf-8") + b"\n")
        f.flush()
        while True:
            line = f.readline()
            if not line:
                raise OSError("MPD closed connection")
            if line.startswith(b"OK"):
                return
            if line.startswith(b"ACK"):
                raise OSError("MPD error: " + line.decode("utf-8", "replace").strip())


class MpdUpdater:
    """Collects changed paths; one MPD update after things calm down."""

    def __init__(self, host, port, debounce: float = 3.0, max_wait: float = 20.0):
        self.host, self.port = host, port
        self.debounce, self.max_wait = debounce, max_wait
        self._cond = threading.Condition()
        self._pending: list[list[str]] = []
        self._first = 0.0
        self._last = 0.0
        self._stop = False
        self._thread = threading.Thread(target=self._run, name="mpd-updater", daemon=True)
        self._thread.start()

    def schedule(self, parts: list[str]) -> None:
        """parts: components of a changed file/folder (the parent folder is updated)."""
        with self._cond:
            now = time.monotonic()
            if not self._pending:
                self._first = now
            self._last = now
            self._pending.append(parts[:-1] if parts else [])
            self._cond.notify()

    @staticmethod
    def common_uri(paths: list[list[str]]) -> str:
        common = paths[0]
        for p in paths[1:]:
            n = 0
            while n < min(len(common), len(p)) and common[n] == p[n]:
                n += 1
            common = common[:n]
        return "/".join(common)

    def _run(self) -> None:
        while True:
            with self._cond:
                while not self._pending and not self._stop:
                    self._cond.wait()
                while self._pending and not self._stop:
                    now = time.monotonic()
                    due = min(self._last + self.debounce, self._first + self.max_wait)
                    if now >= due:
                        break
                    self._cond.wait(due - now)
                if not self._pending:
                    if self._stop:
                        return
                    continue
                paths, self._pending = self._pending, []
            uri = self.common_uri(paths)
            try:
                mpd_update(self.host, self.port, uri)
                log.info("MPD update triggered (%r)", uri or "<all>")
            except Exception as exc:  # never break uploads because of MPD
                log.warning("MPD update failed: %s", exc)

    def stop(self) -> None:
        with self._cond:
            self._stop = True
            self._cond.notify()
        self._thread.join(timeout=10)


# --------------------------------------------------------------------------
# HTTP layer
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    timeout = 60  # slow-loris protection
    server_version = "PhonieboxUpload/1.0"

    def log_message(self, fmt, *args):
        log.info("%s %s", self.address_string(), fmt % args)

    # -- helpers
    @property
    def cfg(self):
        return self.server.cfg

    def send_json(self, status: int, payload: dict, close: bool = False) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if close:
            self.send_header("Connection", "close")
            self.close_connection = True
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def fail(self, err: ApiError, close: bool = False) -> None:
        self.send_json(err.status, {"ok": False, "error": err.code, "message": err.message}, close)

    def read_json(self) -> dict:
        try:
            n = int(self.headers.get("Content-Length", ""))
        except ValueError:
            raise ApiError(411, "length_required", "Content-Length fehlt.") from None
        if n < 0 or n > 65536:
            raise ApiError(413, "too_large", "Anfrage zu groß.")
        try:
            data = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "bad_json", "Ungültiges JSON.") from None
        if not isinstance(data, dict):
            raise ApiError(400, "bad_json", "Ungültiges JSON.")
        return data

    def dispatch(self, table: dict) -> None:
        close = False
        try:
            route = urlsplit(self.path)
            fn = table.get(route.path)
            if fn is None:
                close = self.command == "POST"
                raise ApiError(404, "not_found", "Nicht gefunden.")
            if self.command == "POST":
                if self.headers.get(CSRF_HEADER) != CSRF_VALUE:
                    close = True
                    raise ApiError(403, "csrf", "Anfrage abgelehnt (Header fehlt).")
                close = fn == self.h_upload
            fn(route)
        except ApiError as e:
            self.fail(e, close)
        except (ConnectionError, socket.timeout, TimeoutError):
            self.close_connection = True
        except Exception:
            log.exception("unhandled error")
            self.fail(ApiError(500, "internal", "Interner Fehler."), True)

    def do_GET(self):
        self.dispatch({"/files/list": self.h_list, "/files/info": self.h_info,
                       "/files/health": self.h_health})

    do_HEAD = do_GET

    def do_POST(self):
        self.dispatch({"/upload": self.h_upload, "/files/mkdir": self.h_mkdir,
                       "/files/delete": self.h_delete, "/files/rename": self.h_rename})

    # -- GET handlers
    def h_health(self, route):
        self.send_json(200, {"ok": True})

    def h_info(self, route):
        free = shutil.disk_usage(self.cfg["root"]).free
        self.send_json(200, {"ok": True, "max_bytes": self.cfg["max_bytes"],
                             "allowed_extensions": list(ALLOWED_EXTENSIONS), "free_bytes": free})

    def h_list(self, route):
        raw = parse_qs(route.query).get("path", [""])[0]
        parts = clean_relpath(raw, allow_empty=True)
        root = self.cfg["root"]
        full = walk_existing(root, parts)
        st = _lstat(full)
        if st is None or not stat.S_ISDIR(st.st_mode):
            raise ApiError(404, "not_found", "Ordner nicht gefunden.")
        items = []
        with os.scandir(full) as it:
            for e in it:
                if e.name.startswith("."):
                    continue
                try:
                    est = e.stat(follow_symlinks=False)
                except OSError:
                    continue
                if stat.S_ISDIR(est.st_mode):
                    typ = "dir"
                elif stat.S_ISREG(est.st_mode):
                    try:
                        check_extension(e.name)
                    except ApiError:
                        continue
                    typ = "file"
                else:
                    continue  # symlinks and specials stay invisible
                items.append({"name": e.name, "type": typ,
                              "size": est.st_size if typ == "file" else 0,
                              "mtime": int(est.st_mtime)})
        items.sort(key=lambda i: (i["type"] != "dir", natural_key(i["name"])))
        self.send_json(200, {"ok": True, "path": "/".join(parts), "items": items})

    # -- POST handlers
    def h_mkdir(self, route):
        parts = clean_relpath(self.read_json().get("path"))
        ensure_dir(self.cfg["root"], parts)
        self.server.updater.schedule(parts)
        self.send_json(201, {"ok": True, "path": "/".join(parts)})

    def h_delete(self, route):
        parts = clean_relpath(self.read_json().get("path"))
        full = walk_existing(self.cfg["root"], parts)
        st = _lstat(full)
        if st is None:
            raise ApiError(404, "not_found", "Nicht gefunden.")
        if stat.S_ISDIR(st.st_mode):
            shutil.rmtree(full)
        else:
            os.unlink(full)
        self.server.updater.schedule(parts)
        self.send_json(200, {"ok": True, "path": "/".join(parts)})

    def h_rename(self, route):
        data = self.read_json()
        src = clean_relpath(data.get("path"))
        dst = clean_relpath(data.get("to"))
        root = self.cfg["root"]
        src_full = walk_existing(root, src)
        st = _lstat(src_full)
        if st is None:
            raise ApiError(404, "not_found", "Nicht gefunden.")
        if stat.S_ISREG(st.st_mode):
            check_extension(dst[-1])
        if dst[:len(src)] == src:
            raise ApiError(400, "bad_path", "Ordner kann nicht in sich selbst verschoben werden.")
        dst_full = os.path.join(ensure_dir(root, dst[:-1]), dst[-1])
        if os.path.lexists(dst_full):
            raise ApiError(409, "exists", "Ziel existiert bereits.")
        os.rename(src_full, dst_full)
        self.server.updater.schedule(src)
        self.server.updater.schedule(dst)
        self.send_json(200, {"ok": True, "path": "/".join(dst)})

    def h_upload(self, route):
        ctype = self.headers.get("Content-Type", "")
        m = re.match(r"multipart/form-data\s*;.*boundary=(?:\"([^\"]+)\"|([^;\s]+))", ctype, re.I)
        if not m:
            raise ApiError(400, "bad_content_type", "multipart/form-data erwartet.")
        boundary = m.group(1) or m.group(2)
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            raise ApiError(411, "length_required", "Content-Length fehlt.") from None
        max_bytes = self.cfg["max_bytes"]
        if length <= 0 or length > max_bytes + 1024 * 1024:
            raise ApiError(413, "too_large", "Datei ist zu groß (Limit %d MB)." % (max_bytes // 1048576))
        sem = self.server.upload_slots
        if not sem.acquire(blocking=False):
            raise ApiError(429, "busy", "Die Box nimmt gerade schon Dateien an. Bitte gleich nochmal.")
        writer = None
        try:
            parser = MultipartParser(boundary)
            remaining = length
            current = None
            path_buf = bytearray()
            parts = None
            result = None
            while remaining > 0:
                chunk = self.rfile.read(min(CHUNK, remaining))
                if not chunk:
                    raise ApiError(400, "incomplete", "Upload abgebrochen.")
                remaining -= len(chunk)
                try:
                    events = parser.feed(chunk)
                except MultipartError:
                    raise ApiError(400, "bad_multipart", "Ungültige Anfrage.") from None
                for ev in events:
                    if ev[0] == "start":
                        current = ev[1] if ev[1] in ("path", "file") else None
                        if current == "path":
                            path_buf = bytearray()
                        elif current == "file":
                            if result is not None:
                                raise ApiError(400, "multiple_files", "Nur eine Datei pro Anfrage.")
                            if parts is None:
                                raise ApiError(400, "path_first", "Feld 'path' muss vor 'file' stehen.")
                            writer = FileWriter(self.cfg["root"], parts, max_bytes)
                    elif ev[0] == "data":
                        if current == "path":
                            path_buf += ev[1]
                            if len(path_buf) > 4096:
                                raise ApiError(400, "bad_path", "Pfad zu lang.")
                        elif current == "file":
                            writer.write(ev[1])
                    else:  # end
                        if current == "path":
                            try:
                                parts = clean_relpath(path_buf.decode("utf-8"))
                            except UnicodeDecodeError:
                                raise ApiError(400, "bad_path", "Ungültiger Pfad.") from None
                            check_extension(parts[-1])
                        elif current == "file":
                            replaced = writer.replaced
                            size = writer.commit()
                            writer = None
                            result = {"ok": True, "path": "/".join(parts), "size": size, "replaced": replaced}
                        current = None
            if result is None:
                raise ApiError(400, "no_file", "Keine Datei im Upload.")
            self.server.updater.schedule(parts)
            log.info("uploaded %s (%d bytes)", result["path"], result["size"])
            self.send_json(201, result)
        except OSError as e:
            if e.errno == errno.ENOSPC:
                raise ApiError(507, "disk_full", "Speicherkarte ist voll.") from None
            raise
        finally:
            if writer is not None:
                writer.abort()
            sem.release()


def natural_key(s: str):
    return [(0, int(t)) if t.isdigit() else (1, t.lower()) for t in re.split(r"(\d+)", s) if t]


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 16

    def __init__(self, cfg: dict, updater=None):
        self.cfg = cfg
        os.makedirs(cfg["root"], exist_ok=True)
        self.upload_slots = threading.BoundedSemaphore(cfg.get("max_uploads", 4))
        self.updater = updater or MpdUpdater(cfg["mpd_host"], cfg["mpd_port"])
        super().__init__((cfg["host"], cfg["port"]), Handler)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--config", help="Pfad zu upload-service.conf (KEY=VALUE)")
    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                        format="%(levelname)s %(name)s: %(message)s")
    cfg = load_config(conf_path=args.config)
    server = Server(cfg)
    log.info("listening on %s:%d, root=%s, max_bytes=%d",
             cfg["host"], server.server_address[1], cfg["root"], cfg["max_bytes"])

    def on_term(signum, frame):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, on_term)
    signal.signal(signal.SIGINT, on_term)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        server.updater.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
