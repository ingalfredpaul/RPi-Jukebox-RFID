"""
Kids mode core logic: pure Python, no dependency on the Jukebox runtime.

Everything that touches the outside world (MPD, volume) is injected, so this
file can be unit-tested without a Raspberry Pi (see test/kidsbox/).

What it does, and why (details: documentation/kinder-verhalten.md):

* Same card again while its folder is playing -> do nothing (keep playing).
  Children hold cards on the reader for a long time or tap them repeatedly;
  restarting the story every time is the most annoying behaviour possible.
* Same card again while paused -> resume.
* Different card while playing -> short fade-out, switch, fade-in (no click/bang).
* Optional "resume" per folder (audio books): remember file + position, continue
  there the next time the folder is started. Music folders start from the beginning.
"""

import json
import logging
import os
import tempfile
import threading
import time
from typing import Callable, Dict, List, Optional, Protocol

logger = logging.getLogger('jb.kidsbox')

#: A position this close to the end of the last track counts as "finished":
#: the next start of the folder begins from the top again.
FINISHED_TOLERANCE_S = 10.0


class PlayerPort(Protocol):
    """What the core needs from the music player (adapter in __init__.py)."""

    def status(self) -> Dict:
        ...

    def last_folder(self) -> str:
        ...

    def resume(self) -> None:
        ...

    def play_folder(self, folder: str, recursive: bool) -> None:
        ...

    def playlist_files(self) -> List[str]:
        ...

    def seek(self, song_pos: int, seconds: float) -> None:
        ...


class ResumeStore:
    """Small JSON file with per-folder resume settings and positions (atomic writes)."""

    def __init__(self, path: str):
        self.path = path
        self._lock = threading.RLock()
        self._data = {'version': 1, 'resume_default': False, 'folders': {}, 'positions': {}}
        self._load()

    def _load(self):
        try:
            with open(self.path, encoding='utf-8') as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                for key in ('resume_default', 'folders', 'positions'):
                    if key in loaded:
                        self._data[key] = loaded[key]
        except FileNotFoundError:
            pass
        except (OSError, ValueError) as e:
            # A corrupt file must never break card playback: start fresh, keep the broken file aside.
            logger.error(f"Could not read {self.path}: {e}. Starting with empty kids-mode state.")
            try:
                os.replace(self.path, self.path + '.broken')
            except OSError:
                pass

    def _save(self):
        directory = os.path.dirname(self.path) or '.'
        fd, tmp = tempfile.mkstemp(prefix='.kidsbox-', suffix='.tmp', dir=directory)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(self._data, f, ensure_ascii=False, indent=1)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.path)
        except OSError as e:
            logger.error(f"Could not write {self.path}: {e}")
            try:
                os.unlink(tmp)
            except OSError:
                pass

    # --- settings ---------------------------------------------------------

    @property
    def resume_default(self) -> bool:
        with self._lock:
            return bool(self._data['resume_default'])

    def set_resume_default(self, enabled: bool):
        with self._lock:
            self._data['resume_default'] = bool(enabled)
            self._save()

    def resume_enabled(self, folder: str) -> bool:
        with self._lock:
            return bool(self._data['folders'].get(folder, self._data['resume_default']))

    def set_resume(self, folder: str, enabled: Optional[bool]):
        """enabled=None removes the per-folder override (falls back to the default)."""
        with self._lock:
            if enabled is None:
                self._data['folders'].pop(folder, None)
            else:
                self._data['folders'][folder] = bool(enabled)
            self._save()

    def folder_settings(self) -> Dict[str, bool]:
        with self._lock:
            return dict(self._data['folders'])

    # --- positions --------------------------------------------------------

    def get_position(self, folder: str) -> Optional[Dict]:
        with self._lock:
            pos = self._data['positions'].get(folder)
            return dict(pos) if pos else None

    def save_position(self, folder: str, file: str, elapsed: float):
        with self._lock:
            self._data['positions'][folder] = {'file': file, 'elapsed': round(float(elapsed), 1)}
            self._save()

    def clear_position(self, folder: str):
        with self._lock:
            if self._data['positions'].pop(folder, None) is not None:
                self._save()


def _float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _int(value, default=-1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class KidsBoxCore:
    def __init__(self, player: PlayerPort, store: ResumeStore, *,
                 get_volume: Callable[[], Optional[int]],
                 set_volume: Callable[[int], None],
                 fade_ms: int = 400, fade_steps: int = 6, rewind_s: float = 3.0,
                 save_interval_s: float = 30.0,
                 sleep: Callable[[float], None] = time.sleep,
                 clock: Callable[[], float] = time.monotonic):
        self.player = player
        self.store = store
        self._get_volume = get_volume
        self._set_volume = set_volume
        self.fade_ms = max(0, int(fade_ms))
        self.fade_steps = max(1, int(fade_steps))
        self.rewind_s = max(0.0, float(rewind_s))
        self.save_interval_s = max(0.0, float(save_interval_s))
        self._sleep = sleep
        self._clock = clock
        # Card reads can arrive from several threads (reader, RPC): one at a time.
        self._lock = threading.RLock()
        self._last_state = 'stop'
        self._last_saved_at = -1e9

    # --- card playback ----------------------------------------------------

    def play_card(self, folder: str, recursive: bool = False) -> str:
        """Kid-friendly replacement for ``player.ctrl.play_card``.

        Returns what happened: 'continued', 'resumed', 'started' or 'switched'
        (used for logging and in the tests).
        """
        folder = (folder or '').strip()
        if not folder:
            raise ValueError("kidsbox.play_card: folder must not be empty")

        with self._lock:
            state = self.player.status().get('state', 'stop')
            same_folder = self.player.last_folder() == folder

            if same_folder and state == 'play':
                logger.info(f"Same card again, '{folder}' already playing: keep playing")
                return 'continued'
            if same_folder and state == 'pause':
                logger.info(f"Same card again, '{folder}' paused: resume")
                self.player.resume()
                return 'resumed'

            # Another folder (or the same one after it stopped): remember where the old one was.
            self.snapshot()

            start_volume = None
            if state == 'play' and self.fade_ms > 0:
                start_volume = self._fade_out()
            try:
                self.player.play_folder(folder, recursive)
                self._apply_resume(folder)
            finally:
                if start_volume is not None:
                    self._fade_in(start_volume)
            return 'switched' if state == 'play' else 'started'

    def _fade_out(self) -> Optional[int]:
        volume = self._get_volume()
        if not volume or volume <= 0:
            return None
        delay = self.fade_ms / 1000.0 / self.fade_steps
        try:
            for i in range(1, self.fade_steps + 1):
                self._set_volume(round(volume * (1 - i / self.fade_steps)))
                self._sleep(delay)
        except Exception:
            # Whatever happens: never leave the box silent.
            self._set_volume(volume)
            raise
        return volume

    def _fade_in(self, volume: int):
        delay = self.fade_ms / 1000.0 / self.fade_steps
        try:
            for i in range(1, self.fade_steps):
                self._set_volume(round(volume * i / self.fade_steps))
                self._sleep(delay)
        finally:
            self._set_volume(volume)

    def _apply_resume(self, folder: str):
        if not self.store.resume_enabled(folder):
            return
        pos = self.store.get_position(folder)
        if not pos:
            return
        try:
            files = self.player.playlist_files()
            song = files.index(pos['file'])
        except (ValueError, KeyError):
            logger.info(f"Resume position for '{folder}' no longer matches the files, starting from the top")
            self.store.clear_position(folder)
            return
        seconds = max(0.0, _float(pos.get('elapsed')) - self.rewind_s)
        logger.info(f"Resuming '{folder}' at track {song + 1}, {seconds:.0f}s")
        self.player.seek(song, seconds)

    # --- remembering positions -------------------------------------------

    def snapshot(self, force: bool = True) -> bool:
        """Store the current position for the active folder if resume is enabled for it."""
        folder = self.player.last_folder()
        if not folder or not self.store.resume_enabled(folder):
            return False
        st = self.player.status()
        file = st.get('file')
        if not file:
            return False
        elapsed = _float(st.get('elapsed'))
        duration = _float(st.get('duration'))
        song = _int(st.get('song'))
        length = _int(st.get('playlistlength'), 0)
        finished = (length > 0 and song == length - 1 and duration > 0
                    and duration - elapsed < FINISHED_TOLERANCE_S)
        if finished:
            self.store.clear_position(folder)
        else:
            self.store.save_position(folder, file, elapsed)
        self._last_saved_at = self._clock()
        return True

    def tick(self):
        """Call every second or two: saves on pause/stop immediately, while playing every save_interval_s."""
        with self._lock:
            state = self.player.status().get('state', 'stop')
            previous = self._last_state
            self._last_state = state
            if state == 'play':
                if self._clock() - self._last_saved_at >= self.save_interval_s:
                    self.snapshot()
            elif previous == 'play':
                # play -> pause/stop: the status still carries the position of this moment
                self.snapshot()

    # --- settings API (RPC) ----------------------------------------------

    def get_config(self) -> Dict:
        return {
            'resume_default': self.store.resume_default,
            'resume_folders': self.store.folder_settings(),
            'fade_ms': self.fade_ms,
        }
