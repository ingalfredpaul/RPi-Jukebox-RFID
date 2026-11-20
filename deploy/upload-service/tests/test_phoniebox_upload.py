import http.client
import json
import os
import socket
import sys
import threading
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import phoniebox_upload as pu  # noqa: E402

CSRF = {"X-Requested-With": "phoniebox"}


# ---------------------------------------------------------------- paths
@pytest.mark.parametrize("bad", [
    "../x", "a/../../x", "a/..", "..", "/etc/passwd", "a\\..\\b", "a\\b", "a\0b",
    "a//b", "a/./b", ".hidden", "a/.hidden/b", ".", "a/", "x" * 300, "a/b\nc",
    "/".join(["d"] * 20), "a" * 2000,
])
def test_clean_relpath_rejects(bad):
    with pytest.raises(pu.ApiError) as e:
        pu.clean_relpath(bad)
    assert e.value.status == 400


def test_clean_relpath_accepts():
    assert pu.clean_relpath("Pumuckl/01 Intro äöü.mp3") == ["Pumuckl", "01 Intro äöü.mp3"]
    assert pu.clean_relpath("", allow_empty=True) == []
    # url-encoded leftovers are just harmless literal names, not traversal
    assert pu.clean_relpath("%2e%2e/x") == ["%2e%2e", "x"]


def test_urldecoded_traversal_rejected():
    from urllib.parse import unquote
    with pytest.raises(pu.ApiError):
        pu.clean_relpath(unquote("%2e%2e/%2e%2e/etc"))


@pytest.mark.parametrize("name,ok", [
    ("a.mp3", True), ("A.MP3", True), ("a.FlAc", True), ("c.jpg", True), ("c.png", True),
    ("a.opus", True), ("a.m4b", True), ("a.mp3.exe", False), ("a", False), ("a.txt", False),
    ("a.mp3.", False), ("mp3", False), ("a.svg", False),
])
def test_extension_whitelist(name, ok):
    if ok:
        pu.check_extension(name)
    else:
        with pytest.raises(pu.ApiError) as e:
            pu.check_extension(name)
        assert e.value.status == 415


def test_symlink_in_tree_rejected(tmp_path):
    root = tmp_path / "root"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (root / "link").symlink_to(outside)
    with pytest.raises(pu.ApiError):
        pu.walk_existing(str(root), ["link", "x.mp3"])
    with pytest.raises(pu.ApiError):
        pu.ensure_dir(str(root), ["link", "sub"])
    with pytest.raises(pu.ApiError):
        pu.FileWriter(str(root), ["link", "x.mp3"], 100)
    assert list(outside.iterdir()) == []


def test_symlink_file_target_rejected(tmp_path):
    root = tmp_path / "root"
    root.mkdir()
    victim = tmp_path / "victim.mp3"
    victim.write_bytes(b"orig")
    (root / "a.mp3").symlink_to(victim)
    with pytest.raises(pu.ApiError):
        pu.FileWriter(str(root), ["a.mp3"], 100)
    assert victim.read_bytes() == b"orig"


# ------------------------------------------------------------ atomic write
def test_atomic_commit_and_modes(tmp_path):
    w = pu.FileWriter(str(tmp_path), ["Album", "x.mp3"], 100)
    w.write(b"hello")
    assert (tmp_path / "Album" / "x.mp3").exists() is False
    assert w.commit() == 5
    f = tmp_path / "Album" / "x.mp3"
    assert f.read_bytes() == b"hello"
    assert oct(f.stat().st_mode & 0o777) == "0o664"
    assert oct(f.parent.stat().st_mode & 0o777) == "0o775"
    assert [p.name for p in f.parent.iterdir()] == ["x.mp3"]


def test_abort_leaves_no_part_and_keeps_old(tmp_path):
    (tmp_path / "x.mp3").write_bytes(b"old")
    w = pu.FileWriter(str(tmp_path), ["x.mp3"], 100)
    assert w.replaced
    w.write(b"new")
    w.abort()
    assert (tmp_path / "x.mp3").read_bytes() == b"old"
    assert [p.name for p in tmp_path.iterdir()] == ["x.mp3"]


def test_limit_enforced(tmp_path):
    w = pu.FileWriter(str(tmp_path), ["x.mp3"], 10)
    w.write(b"12345")
    with pytest.raises(pu.ApiError) as e:
        w.write(b"678901")
    assert e.value.status == 413
    w.abort()
    assert list(tmp_path.iterdir()) == []


# --------------------------------------------------------------- multipart
def build_body(boundary, fields):
    out = b""
    for name, filename, data in fields:
        out += b"--" + boundary.encode() + b"\r\n"
        cd = 'Content-Disposition: form-data; name="%s"' % name
        if filename is not None:
            cd += '; filename="%s"' % filename
        out += cd.encode() + b"\r\n"
        if filename is not None:
            out += b"Content-Type: application/octet-stream\r\n"
        out += b"\r\n" + data + b"\r\n"
    return out + b"--" + boundary.encode() + b"--\r\n"


def run_parser(body, step):
    p = pu.MultipartParser("BOUND")
    parts, cur = [], None
    for i in range(0, len(body), step):
        for ev in p.feed(body[i:i + step]):
            if ev[0] == "start":
                cur = [ev[1], ev[2], b""]
                parts.append(cur)
            elif ev[0] == "data":
                cur[2] += ev[1]
    assert p.done
    return parts


@pytest.mark.parametrize("step", [1, 2, 3, 7, 64, 100000])
def test_multipart_chunk_boundaries(step):
    payload = b"\r\n--BOUN\r\n--BOUND\x00\xff\r\n\r\n--BOUN" * 3 + b"\r\n"  # tricky binary
    payload = payload.replace(b"--BOUND", b"--BOUNX")
    body = build_body("BOUND", [("path", None, "Ä/ü ö.mp3".encode()),
                                ("file", "Ä ü.mp3", payload)])
    parts = run_parser(body, step)
    assert parts[0] == ["path", None, "Ä/ü ö.mp3".encode()]
    assert parts[1][0] == "file" and parts[1][1] == "Ä ü.mp3"
    assert parts[1][2] == payload


def test_multipart_preamble_and_epilogue():
    body = b"junk\r\n" + build_body("BOUND", [("path", None, b"a.mp3")]) + b"epilogue"
    assert run_parser(body, 5) == [["path", None, b"a.mp3"]]


def test_multipart_garbage():
    p = pu.MultipartParser("BOUND")
    with pytest.raises(pu.MultipartError):
        p.feed(b"--BOUNDxx")


def test_multipart_empty_file():
    body = build_body("BOUND", [("file", "e.mp3", b"")])
    assert run_parser(body, 3) == [["file", "e.mp3", b""]]


# ------------------------------------------------------------ fake MPD
class FakeMpd:
    def __init__(self):
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(5)
        self.port = self.sock.getsockname()[1]
        self.commands = []
        self.reply = b"OK\n"
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        while True:
            try:
                c, _ = self.sock.accept()
            except OSError:
                return
            c.sendall(b"OK MPD 0.23.0\n")
            f = c.makefile("rb")
            self.commands.append(f.readline().decode().strip())
            c.sendall(self.reply)
            c.close()

    def close(self):
        self.sock.close()


def wait_for(cond, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        if cond():
            return True
        time.sleep(0.02)
    return False


def test_mpd_update_protocol():
    m = FakeMpd()
    pu.mpd_update("127.0.0.1", m.port, 'A "b"')
    assert m.commands == ['update "A \\"b\\""']
    pu.mpd_update("127.0.0.1", m.port, "")
    assert m.commands[-1] == "update"
    m.reply = b"ACK [50@0] {update} nope\n"
    with pytest.raises(OSError):
        pu.mpd_update("127.0.0.1", m.port, "x")
    m.close()


def test_mpd_updater_debounce_and_tolerates_failure():
    m = FakeMpd()
    u = pu.MpdUpdater("127.0.0.1", m.port, debounce=0.2, max_wait=2)
    for i in range(5):
        u.schedule(["Album", "t%d.mp3" % i])
    assert wait_for(lambda: m.commands)
    time.sleep(0.5)
    assert m.commands == ['update "Album"']
    u.schedule(["A", "x.mp3"])
    u.schedule(["B", "y.mp3"])
    assert wait_for(lambda: len(m.commands) == 2)
    assert m.commands[1] == "update"
    u.stop()
    m.close()
    # unreachable MPD must not raise
    u2 = pu.MpdUpdater("127.0.0.1", 1, debounce=0.05)
    u2.schedule(["x", "a.mp3"])
    time.sleep(0.4)
    u2.stop()


# ---------------------------------------------------------------- end to end
@pytest.fixture
def env(tmp_path):
    mpd = FakeMpd()
    root = tmp_path / "audio"
    cfg = {"root": str(root), "host": "127.0.0.1", "port": 0, "max_bytes": 200_000,
           "mpd_host": "127.0.0.1", "mpd_port": mpd.port, "max_uploads": 4}
    updater = pu.MpdUpdater("127.0.0.1", mpd.port, debounce=0.1, max_wait=1)
    srv = pu.Server(cfg, updater)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield srv, root, mpd
    srv.shutdown()
    srv.server_close()
    updater.stop()
    mpd.close()


def req(srv, method, path, body=None, headers=None, raw=False):
    c = http.client.HTTPConnection("127.0.0.1", srv.server_address[1], timeout=10)
    h = dict(headers or {})
    if isinstance(body, (dict, list)):
        body = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    c.request(method, path, body=body, headers=h)
    r = c.getresponse()
    data = r.read()
    c.close()
    return r.status, (data if raw else json.loads(data))


def upload(srv, path, data, headers=CSRF, fields=None):
    b = "XyZ123"
    fields = fields or [("path", None, path.encode()), ("file", "ignored.mp3", data)]
    h = dict(headers)
    h["Content-Type"] = "multipart/form-data; boundary=" + b
    return req(srv, "POST", "/upload", build_body(b, fields), h)


def test_e2e_flow(env):
    srv, root, mpd = env
    data = os.urandom(150_000) + b"\r\n--XyZ12\r\n"
    st, j = upload(srv, "Pumuckl/Teil 1/01 Intro äö.mp3", data)
    assert st == 201 and j["ok"] and j["size"] == len(data) and j["replaced"] is False
    f = root / "Pumuckl" / "Teil 1" / "01 Intro äö.mp3"
    assert f.read_bytes() == data
    assert oct(f.stat().st_mode & 0o777) == "0o664"
    st, j = upload(srv, "Pumuckl/Teil 1/01 Intro äö.mp3", b"x")
    assert st == 201 and j["replaced"] is True
    assert wait_for(lambda: mpd.commands)
    assert mpd.commands[0] == 'update "Pumuckl/Teil 1"'

    (root / "Pumuckl" / "notes.txt").write_text("x")
    (root / "Pumuckl" / ".hidden.mp3").write_text("x")
    (root / "Pumuckl" / "b10.mp3").write_text("x")
    (root / "Pumuckl" / "b2.mp3").write_text("x")
    (root / "outside").symlink_to("/etc")
    st, j = req(srv, "GET", "/files/list?path=Pumuckl")
    assert [i["name"] for i in j["items"]] == ["Teil 1", "b2.mp3", "b10.mp3"]
    assert j["items"][0]["type"] == "dir"
    st, j = req(srv, "GET", "/files/list")
    assert [i["name"] for i in j["items"]] == ["Pumuckl"]  # symlink hidden
    assert req(srv, "GET", "/files/list?path=outside")[0] == 400
    assert req(srv, "GET", "/files/list?path=..")[0] == 400
    assert req(srv, "GET", "/files/list?path=nope")[0] == 404

    st, j = req(srv, "POST", "/files/mkdir", {"path": "Neu/Sub"}, CSRF)
    assert st == 201 and (root / "Neu" / "Sub").is_dir()
    st, j = req(srv, "POST", "/files/rename", {"path": "Neu", "to": "Alt"}, CSRF)
    assert st == 200 and (root / "Alt" / "Sub").is_dir()
    assert req(srv, "POST", "/files/rename", {"path": "Alt", "to": "Pumuckl"}, CSRF)[0] == 409
    assert req(srv, "POST", "/files/rename", {"path": "Alt", "to": "Alt/Sub/x"}, CSRF)[0] == 400
    assert req(srv, "POST", "/files/rename", {"path": "Pumuckl/b2.mp3", "to": "Pumuckl/b2.exe"}, CSRF)[0] == 415
    assert req(srv, "POST", "/files/rename", {"path": "Pumuckl/b2.mp3", "to": "Alt/b3.mp3"}, CSRF)[0] == 200
    assert (root / "Alt" / "b3.mp3").exists()
    st, j = req(srv, "POST", "/files/delete", {"path": "Alt"}, CSRF)
    assert st == 200 and not (root / "Alt").exists()
    assert req(srv, "POST", "/files/delete", {"path": ""}, CSRF)[0] == 400
    assert req(srv, "POST", "/files/delete", {"path": "outside"}, CSRF)[0] == 400
    assert Path("/etc/passwd").exists()
    assert req(srv, "POST", "/files/delete", {"path": "nope"}, CSRF)[0] == 404

    st, j = req(srv, "GET", "/files/info")
    assert j["max_bytes"] == 200_000 and "mp3" in j["allowed_extensions"] and j["free_bytes"] > 0
    assert req(srv, "GET", "/files/health")[1] == {"ok": True}
    assert req(srv, "GET", "/nothing")[0] == 404


def test_e2e_rejections(env):
    srv, root, _ = env
    # CSRF
    st, j = upload(srv, "a.mp3", b"x", headers={})
    assert st == 403 and j["error"] == "csrf"
    assert req(srv, "POST", "/files/mkdir", {"path": "x"})[0] == 403
    assert not (root / "x").exists()
    # traversal / bad ext
    for bad in ["../evil.mp3", "/abs.mp3", "a/../../e.mp3", "a\\b.mp3", ".h.mp3"]:
        assert upload(srv, bad, b"x")[0] == 400, bad
    assert upload(srv, "a.txt", b"x")[0] == 415
    assert upload(srv, "a.mp3.exe", b"x")[0] == 415
    # file before path
    st, j = upload(srv, "", b"", fields=[("file", "a.mp3", b"x"), ("path", None, b"a.mp3")])
    assert st == 400 and j["error"] == "path_first"
    # too large (stream limit; stays below header limit)
    st, j = upload(srv, "big.mp3", b"x" * 250_000)
    assert st == 413
    # not multipart
    st, j = req(srv, "POST", "/upload", b"x", {**CSRF, "Content-Type": "text/plain"})
    assert st == 400
    assert not (root / "evil.mp3").exists()
    leftovers = [p for p in root.rglob("*") if p.name.endswith(".part") or p.name.endswith(".mp3")]
    assert leftovers == []


def test_e2e_symlink_target_dir(env):
    srv, root, _ = env
    outside = root.parent / "out"
    outside.mkdir()
    (root / "ln").symlink_to(outside)
    assert upload(srv, "ln/a.mp3", b"x")[0] == 400
    assert req(srv, "POST", "/files/mkdir", {"path": "ln/sub"}, CSRF)[0] == 400
    assert list(outside.iterdir()) == []


def test_e2e_aborted_upload_leaves_nothing(env):
    srv, root, _ = env
    (root / "x.mp3").write_bytes(b"old")
    b = "XyZ123"
    body = build_body(b, [("path", None, b"x.mp3"), ("file", "x.mp3", b"N" * 100_000)])
    s = socket.create_connection(("127.0.0.1", srv.server_address[1]))
    head = ("POST /upload HTTP/1.1\r\nHost: x\r\nX-Requested-With: phoniebox\r\n"
            "Content-Type: multipart/form-data; boundary=%s\r\nContent-Length: %d\r\n\r\n" % (b, len(body)))
    s.sendall(head.encode() + body[:50_000])
    time.sleep(0.2)
    s.close()
    assert wait_for(lambda: [p.name for p in root.iterdir()] == ["x.mp3"])
    assert (root / "x.mp3").read_bytes() == b"old"


def test_e2e_no_content_length(env):
    srv, _, _ = env
    s = socket.create_connection(("127.0.0.1", srv.server_address[1]))
    s.sendall(b"POST /upload HTTP/1.1\r\nHost: x\r\nX-Requested-With: phoniebox\r\n"
              b"Content-Type: multipart/form-data; boundary=a\r\n\r\n")
    assert b" 411 " in s.recv(4096).split(b"\r\n")[0]
    s.close()


def test_busy_returns_429(env):
    srv, root, _ = env
    for _ in range(4):
        srv.upload_slots.acquire()
    st, j = upload(srv, "a.mp3", b"x")
    assert st == 429
    for _ in range(4):
        srv.upload_slots.release()
    assert upload(srv, "a.mp3", b"x")[0] == 201


def test_config(tmp_path):
    conf = tmp_path / "c.conf"
    conf.write_text("# c\nPHONIEBOX_UPLOAD_PORT=9000\nPHONIEBOX_UPLOAD_ROOT=/srv/a\n")
    cfg = pu.load_config({"PHONIEBOX_UPLOAD_PORT": "9001"}, str(conf))
    assert cfg["port"] == 9001 and cfg["root"] == "/srv/a" and cfg["host"] == "127.0.0.1"


# ---------------------------------------------------------------- import from link
FAKE_YTDLP = r'''#!/usr/bin/env python3
import os, sys, time
args = sys.argv[1:]
out = args[args.index("-o") + 1]
url = args[args.index("--") + 1]
if "fail" in url:
    print("ERROR: [youtube] abc: Video unavailable", file=sys.stderr)
    sys.exit(1)
if "slow" in url:
    time.sleep(30)
path = out.replace("%(title)s", "Mein Lied / Teil 1").replace("%(ext)s", "mp3")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path.replace("/ Teil", "- Teil"), "wb") as f:
    f.write(b"ID3fake")
'''


def wait_job(srv, job_id, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        st, r = req(srv, "GET", "/files/import/status?id=" + job_id)
        assert st == 200
        if r["state"] != "running":
            return r
        time.sleep(0.05)
    raise AssertionError("job did not finish")


@pytest.fixture
def ytenv(env, tmp_path):
    srv = env[0]
    fake = tmp_path / "fake-yt-dlp"
    fake.write_text(FAKE_YTDLP)
    fake.chmod(0o755)
    srv.imports.cfg["ytdlp"] = str(fake)
    return env


def test_safe_name():
    assert pu.safe_name("a/b\\c\x00d") == "a b c d"
    assert pu.safe_name("...") == "Import"
    assert pu.safe_name("  .hidden  ") == "hidden"
    assert len(pu.safe_name("ä" * 200).encode()) <= pu.MAX_NAME_BYTES


def test_import_new_folder_from_title(ytenv):
    srv, root, _ = ytenv
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/watch?v=1"}, CSRF)
    assert st == 202 and r["state"] == "running"
    r = wait_job(srv, r["id"])
    assert r["state"] == "done", r
    assert r["folder"] == "Mein Lied - Teil 1" and r["file"] == "Mein Lied - Teil 1.mp3"
    assert (root / r["folder"] / r["file"]).read_bytes() == b"ID3fake"
    assert not [p for p in root.iterdir() if p.name.startswith(".import-")]


def test_import_into_existing_folder_no_overwrite(ytenv):
    srv, root, _ = ytenv
    (root / "Lieder").mkdir(parents=True)
    (root / "Lieder" / "Mein Lied - Teil 1.mp3").write_bytes(b"old")
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/x", "folder": "Lieder"}, CSRF)
    r = wait_job(srv, r["id"])
    assert r["state"] == "done" and r["file"] == "Mein Lied - Teil 1 (2).mp3"
    assert (root / "Lieder" / "Mein Lied - Teil 1.mp3").read_bytes() == b"old"


def test_import_failure_reports_message(ytenv):
    srv, root, _ = ytenv
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/fail"}, CSRF)
    r = wait_job(srv, r["id"])
    assert r["state"] == "error" and "Video unavailable" in r["message"]
    assert not [p for p in root.iterdir() if p.name.startswith(".import-")]


@pytest.mark.parametrize("body", [
    {"url": "file:///etc/passwd"}, {"url": "-o /tmp/x"}, {"url": "ftp://x/y"}, {"url": 5}, {},
    {"url": "https://example.org/x", "folder": "../etc"},
])
def test_import_rejects_bad_input(ytenv, body):
    srv = ytenv[0]
    st, r = req(srv, "POST", "/files/import", body, CSRF)
    assert st == 400


def test_import_needs_csrf_and_single_job(ytenv):
    srv = ytenv[0]
    assert req(srv, "POST", "/files/import", {"url": "https://example.org/x"})[0] == 403
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/slow"}, CSRF)
    assert st == 202
    assert req(srv, "POST", "/files/import", {"url": "https://example.org/x"}, CSRF)[0] == 429


def test_import_missing_downloader(env):
    srv = env[0]
    srv.imports.cfg["ytdlp"] = "/nonexistent/yt-dlp"
    assert req(srv, "GET", "/files/info")[1]["import_available"] is False
    assert req(srv, "POST", "/files/import", {"url": "https://example.org/x"}, CSRF)[0] == 501


def test_import_unknown_job(env):
    assert req(env[0], "GET", "/files/import/status?id=nope")[0] == 404


def test_import_reports_progress_and_done(ytenv):
    srv, root, _ = ytenv
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/watch?v=2"}, CSRF)
    r = wait_job(srv, r["id"])
    assert r["state"] == "done" and r["progress"] == 100 and r["stage"] == "done"


def test_import_cancel_stops_download_and_cleans_up(ytenv):
    srv, root, _ = ytenv
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/slow"}, CSRF)
    assert st == 202
    st, c = req(srv, "POST", "/files/import/cancel", {"id": r["id"]}, CSRF)
    assert st == 200
    r = wait_job(srv, r["id"], timeout=10)
    assert r["state"] == "cancelled" and r["message"] == pu.CANCELLED_MSG
    assert not [p for p in root.iterdir() if p.name.startswith(".import-")]
    # the box is free again for the next job
    st, r2 = req(srv, "POST", "/files/import", {"url": "https://example.org/watch?v=3"}, CSRF)
    assert st == 202
    assert wait_job(srv, r2["id"])["state"] == "done"


def test_cancel_finished_job_changes_nothing(ytenv):
    srv, root, _ = ytenv
    st, r = req(srv, "POST", "/files/import", {"url": "https://example.org/watch?v=4"}, CSRF)
    r = wait_job(srv, r["id"])
    st, c = req(srv, "POST", "/files/import/cancel", {"id": r["id"]}, CSRF)
    assert st == 200 and c["state"] == "done"


def test_cancel_unknown_job_is_404(ytenv):
    srv, _, _ = ytenv
    st, r = req(srv, "POST", "/files/import/cancel", {"id": "nope"}, CSRF)
    assert st == 404
