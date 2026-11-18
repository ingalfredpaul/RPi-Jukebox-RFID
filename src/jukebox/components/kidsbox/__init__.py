"""
Kids mode plugin ("kidsbox")

Thin glue between the Jukebox daemon and :mod:`components.kidsbox.core`.
All behaviour lives in ``core.py`` (unit-tested). This file only wires it to MPD,
the volume plugin, the config and the RFID reader callbacks.

Enable it in ``shared/settings/jukebox.yaml``::

    modules:
      named:
        ...
        player: playermpd
        kidsbox: kidsbox        # <- after "player" and "volume"

RPC (package ``kidsbox``):

* ``play_card(folder, recursive=False)``  kid-friendly folder start (card alias ``play_card_kids``)
* ``get_config()``                        current settings for the web UI
* ``set_folder_resume(folder, enabled)``  remember position for this folder (audio books)
* ``set_resume_default(enabled)``         default for folders without own setting
* ``clear_resume(folder)``                forget the stored position
"""

import logging
import os
import threading
import time
from typing import Dict, List, Optional

import jukebox.cfghandler
import jukebox.multitimer as multitimer
import jukebox.plugs as plugin

from .core import KidsBoxCore, ResumeStore

logger = logging.getLogger('jb.kidsbox')
cfg = jukebox.cfghandler.get_handler('jukebox')

core: Optional[KidsBoxCore] = None
_unknown_sound: Optional[str] = None
_unknown_cooldown_s = 5.0
_last_unknown_at = 0.0
_lock = threading.Lock()


class MpdPlayerAdapter:
    """Adapts playermpd.PlayerMPD to the small interface the core needs."""

    def __init__(self):
        # Resolved lazily: the player module is loaded before us, but be defensive.
        self._player = None

    @property
    def player(self):
        if self._player is None:
            self._player = plugin.get('player', 'ctrl')
        return self._player

    def status(self) -> Dict:
        return dict(self.player.mpd_status)

    def last_folder(self) -> str:
        return self.player.music_player_status['player_status'].get('last_played_folder', '') or ''

    def resume(self) -> None:
        self.player.play()

    def play_folder(self, folder: str, recursive: bool) -> None:
        self.player.play_folder(folder, recursive)

    def playlist_files(self) -> List[str]:
        with self.player.mpd_lock:
            return [song['file'] for song in self.player.mpd_client.playlistinfo()]

    def seek(self, song_pos: int, seconds: float) -> None:
        with self.player.mpd_lock:
            self.player.mpd_client.seek(song_pos, seconds)


def _get_volume() -> Optional[int]:
    return plugin.call_ignore_errors('volume', 'ctrl', 'get_volume')


def _set_volume(volume: int) -> None:
    plugin.call_ignore_errors('volume', 'ctrl', 'set_volume', args=[volume])


@plugin.initialize
def initialize():
    global core, _unknown_sound, _unknown_cooldown_s
    # Defaults are written to the config on first start, so they show up in jukebox.yaml.
    state_file = cfg.setndefault('kidsbox', 'state_file', value='../../shared/settings/kidsbox.json')
    fade_ms = cfg.setndefault('kidsbox', 'fade_ms', value=400)
    rewind_s = cfg.setndefault('kidsbox', 'resume_rewind_sec', value=3)
    save_interval = cfg.setndefault('kidsbox', 'resume_save_interval_sec', value=30)
    sound = cfg.setndefault('kidsbox', 'unknown_card_sound', value='../../resources/audio/unknown-card.wav')
    _unknown_cooldown_s = float(cfg.setndefault('kidsbox', 'unknown_card_cooldown_sec', value=5))
    _unknown_sound = os.path.abspath(sound) if sound else None

    store = ResumeStore(os.path.abspath(state_file))
    core = KidsBoxCore(MpdPlayerAdapter(), store,
                       get_volume=_get_volume, set_volume=_set_volume,
                       fade_ms=fade_ms, rewind_s=rewind_s, save_interval_s=save_interval)
    logger.info(f"Kids mode ready (fade {fade_ms} ms, state in {state_file})")


def _on_card_detected(card_id: str, state) -> None:
    """RFID reader callback: short signal for cards the box does not know."""
    global _last_unknown_at
    if state.name != 'isUnkown' or not _unknown_sound:  # sic: upstream spelling
        return
    with _lock:
        now = time.monotonic()
        if now - _last_unknown_at < _unknown_cooldown_s:
            return
        _last_unknown_at = now
    logger.info(f"Unknown card '{card_id}': playing signal")
    plugin.call_ignore_errors('jingle', 'play', args=[_unknown_sound], as_thread=True, thread_name='kidsbox-unknown')


@plugin.finalize
def finalize():
    # Periodic position saving (cheap: only touches the disk when something changed).
    timer = multitimer.GenericEndlessTimerClass('kidsbox.timer_resume', 2.0, core.tick)
    timer.start()
    # Unknown-card signal: only if the RFID reader plugin is loaded.
    try:
        from components.rfid.reader import rfid_card_detect_callbacks
        rfid_card_detect_callbacks.register(_on_card_detected)
    except Exception as e:
        logger.warning(f"Unknown-card signal not available: {e.__class__.__name__}: {e}")


@plugin.register
def play_card(folder: str, recursive: bool = False):
    """Kid-friendly 'play folder' for RFID cards (continue on same card, fade on switch, optional resume)"""
    return core.play_card(folder, recursive)


@plugin.register
def get_config():
    """Settings of the kids mode for the web UI"""
    result = core.get_config()
    result['unknown_card_sound'] = bool(_unknown_sound and os.path.exists(_unknown_sound))
    result['second_swipe'] = 'continue'
    return result


@plugin.register
def set_folder_resume(folder: str, enabled: Optional[bool] = True):
    """Remember the position for this folder (audio books). enabled=None: use the default again"""
    core.store.set_resume(folder, enabled)
    if enabled is False:
        core.store.clear_position(folder)


@plugin.register
def set_resume_default(enabled: bool):
    """Default for folders without an own resume setting"""
    core.store.set_resume_default(enabled)


@plugin.register
def clear_resume(folder: str):
    """Forget the stored position of a folder (next start begins at the top)"""
    core.store.clear_position(folder)


@plugin.atexit
def atexit(**ignored_kwargs):
    if core is not None:
        try:
            core.snapshot()
        except Exception as e:
            logger.error(f"Could not store position at exit: {e}")
