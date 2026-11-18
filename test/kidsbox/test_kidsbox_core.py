"""Unit tests for the kids mode core (components/kidsbox/core.py).

core.py has no dependency on the Jukebox runtime, so it is loaded directly from
its file (importing the package would pull in pulsectl/mpd/ruamel).
"""
import importlib.util
import json
import os

import pytest

_CORE = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'jukebox', 'components', 'kidsbox', 'core.py')
_spec = importlib.util.spec_from_file_location('kidsbox_core_under_test', os.path.abspath(_CORE))
core = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(core)


class FakePlayer:
    def __init__(self):
        self.state = 'stop'
        self.folder = ''
        self.mpd = {}
        self.files = []
        self.calls = []

    def status(self):
        return dict(self.mpd, state=self.state)

    def last_folder(self):
        return self.folder

    def resume(self):
        self.calls.append(('resume',))
        self.state = 'play'

    def play_folder(self, folder, recursive):
        self.calls.append(('play_folder', folder, recursive))
        self.folder = folder
        self.state = 'play'

    def playlist_files(self):
        return list(self.files)

    def seek(self, song_pos, seconds):
        self.calls.append(('seek', song_pos, seconds))


class Env:
    """Player + volume + store wired together, with an event log to check ordering."""

    def __init__(self, tmp_path, volume=40, **kwargs):
        self.player = FakePlayer()
        self.volume = volume
        self.events = []
        self.now = 0.0
        self.store = core.ResumeStore(str(tmp_path / 'kidsbox.json'))
        outer = self

        orig_play_folder = self.player.play_folder

        def logged_play_folder(folder, recursive):
            outer.events.append(('play_folder', folder))
            orig_play_folder(folder, recursive)

        self.player.play_folder = logged_play_folder
        self.core = core.KidsBoxCore(
            self.player, self.store,
            get_volume=lambda: self.volume, set_volume=self._set_volume,
            sleep=lambda s: None, clock=lambda: self.now,
            **kwargs)

    def _set_volume(self, v):
        self.volume = v
        self.events.append(('volume', v))


@pytest.fixture
def env(tmp_path):
    return Env(tmp_path)


# --- second swipe / same card -------------------------------------------------

def test_same_card_while_playing_does_not_restart(env):
    env.player.folder, env.player.state = 'Pumuckl', 'play'
    assert env.core.play_card('Pumuckl') == 'continued'
    assert env.player.calls == []
    assert env.events == []


def test_same_card_repeated_many_times_never_restarts(env):
    env.player.folder, env.player.state = 'Pumuckl', 'play'
    for _ in range(20):
        env.core.play_card('Pumuckl')
    assert env.player.calls == []


def test_same_card_while_paused_resumes(env):
    env.player.folder, env.player.state = 'Pumuckl', 'pause'
    assert env.core.play_card('Pumuckl') == 'resumed'
    assert env.player.calls == [('resume',)]


def test_same_card_after_stop_starts_again(env):
    env.player.folder, env.player.state = 'Pumuckl', 'stop'
    assert env.core.play_card('Pumuckl', True) == 'started'
    assert env.player.calls == [('play_folder', 'Pumuckl', True)]


def test_first_card_starts_without_fade(env):
    assert env.core.play_card('A') == 'started'
    assert [e for e in env.events if e[0] == 'volume'] == []


def test_empty_folder_rejected(env):
    with pytest.raises(ValueError):
        env.core.play_card('  ')


# --- switching cards -----------------------------------------------------------

def test_switch_fades_out_then_in_and_restores_volume(env):
    env.player.folder, env.player.state = 'A', 'play'
    assert env.core.play_card('B') == 'switched'
    kinds = [e[0] for e in env.events]
    switch = kinds.index('play_folder')
    volumes_before = [v for k, v in env.events[:switch] if k == 'volume']
    volumes_after = [v for k, v in env.events[switch + 1:] if k == 'volume']
    assert volumes_before[-1] == 0                       # silent when the folder is replaced
    assert volumes_before == sorted(volumes_before, reverse=True)
    assert volumes_after == sorted(volumes_after)        # fade-in is monotonic
    assert env.volume == 40                              # exactly the old volume again


def test_switch_never_exceeds_original_volume(env):
    env.player.folder, env.player.state = 'A', 'play'
    env.core.play_card('B')
    assert max(v for k, v in env.events if k == 'volume') <= 40


def test_volume_restored_when_play_folder_fails(env):
    env.player.folder, env.player.state = 'A', 'play'

    def boom(folder, recursive):
        raise RuntimeError('mpd gone')

    env.player.play_folder = boom
    with pytest.raises(RuntimeError):
        env.core.play_card('B')
    assert env.volume == 40


def test_no_fade_when_paused_or_muted_or_disabled(tmp_path):
    e = Env(tmp_path)
    e.player.folder, e.player.state = 'A', 'pause'
    e.core.play_card('B')
    assert [x for x in e.events if x[0] == 'volume'] == []

    e = Env(tmp_path, volume=0)
    e.player.folder, e.player.state = 'A', 'play'
    e.core.play_card('B')
    assert [x for x in e.events if x[0] == 'volume'] == []

    e = Env(tmp_path, fade_ms=0)
    e.player.folder, e.player.state = 'A', 'play'
    e.core.play_card('B')
    assert [x for x in e.events if x[0] == 'volume'] == []


# --- resume ---------------------------------------------------------------------

def _playing(env, folder, file, elapsed, song=0, length=3, duration=600):
    env.player.folder, env.player.state = folder, 'play'
    env.player.mpd = {'file': file, 'elapsed': str(elapsed), 'song': str(song),
                      'playlistlength': str(length), 'duration': str(duration)}


def test_resume_remembers_position_when_switching_away(env):
    env.store.set_resume('Buch', True)
    _playing(env, 'Buch', 'Buch/02.mp3', 123.4, song=1)
    env.core.play_card('Musik')
    assert env.store.get_position('Buch') == {'file': 'Buch/02.mp3', 'elapsed': 123.4}


def test_resume_not_stored_for_music_folders(env):
    _playing(env, 'Musik', 'Musik/01.mp3', 50)
    env.core.play_card('Buch')
    assert env.store.get_position('Musik') is None


def test_resume_applied_with_rewind(tmp_path):
    e = Env(tmp_path, rewind_s=3)
    e.store.set_resume('Buch', True)
    e.store.save_position('Buch', 'Buch/02.mp3', 100.0)
    e.player.files = ['Buch/01.mp3', 'Buch/02.mp3', 'Buch/03.mp3']
    e.core.play_card('Buch')
    assert ('seek', 1, 97.0) in e.player.calls


def test_resume_off_starts_from_the_top(env):
    env.store.save_position('Buch', 'Buch/02.mp3', 100.0)   # stale position, but resume disabled
    env.player.files = ['Buch/01.mp3', 'Buch/02.mp3']
    env.core.play_card('Buch')
    assert not any(c[0] == 'seek' for c in env.player.calls)


def test_resume_position_dropped_when_file_is_gone(env):
    env.store.set_resume('Buch', True)
    env.store.save_position('Buch', 'Buch/old.mp3', 100.0)
    env.player.files = ['Buch/01.mp3']
    env.core.play_card('Buch')
    assert not any(c[0] == 'seek' for c in env.player.calls)
    assert env.store.get_position('Buch') is None


def test_rewind_never_goes_negative(tmp_path):
    e = Env(tmp_path, rewind_s=10)
    e.store.set_resume('Buch', True)
    e.store.save_position('Buch', 'Buch/01.mp3', 4.0)
    e.player.files = ['Buch/01.mp3']
    e.core.play_card('Buch')
    assert ('seek', 0, 0.0) in e.player.calls


def test_finished_book_starts_over_next_time(env):
    env.store.set_resume('Buch', True)
    env.store.save_position('Buch', 'Buch/03.mp3', 10.0)
    _playing(env, 'Buch', 'Buch/03.mp3', 596, song=2, length=3, duration=600)
    env.core.snapshot()
    assert env.store.get_position('Buch') is None


def test_mid_book_is_not_finished(env):
    env.store.set_resume('Buch', True)
    _playing(env, 'Buch', 'Buch/01.mp3', 596, song=0, length=3, duration=600)
    env.core.snapshot()
    assert env.store.get_position('Buch') is not None


def test_resume_default_applies_to_folders_without_override(env):
    env.store.set_resume_default(True)
    assert env.store.resume_enabled('Irgendwas')
    env.store.set_resume('Musik', False)
    assert not env.store.resume_enabled('Musik')
    env.store.set_resume('Musik', None)
    assert env.store.resume_enabled('Musik')


# --- tick (periodic saving) ----------------------------------------------------

def test_tick_saves_throttled_while_playing(tmp_path):
    e = Env(tmp_path, save_interval_s=30)
    e.store.set_resume('Buch', True)
    _playing(e, 'Buch', 'Buch/01.mp3', 10)
    e.core.tick()                                   # first save
    assert e.store.get_position('Buch')['elapsed'] == 10.0
    e.player.mpd['elapsed'] = '20'
    e.now += 5
    e.core.tick()                                   # within 30 s: no write
    assert e.store.get_position('Buch')['elapsed'] == 10.0
    e.now += 30
    e.core.tick()
    assert e.store.get_position('Buch')['elapsed'] == 20.0


def test_tick_saves_immediately_on_stop_after_play(tmp_path):
    e = Env(tmp_path, save_interval_s=30)
    e.store.set_resume('Buch', True)
    _playing(e, 'Buch', 'Buch/01.mp3', 10)
    e.core.tick()
    e.player.mpd['elapsed'] = '77'
    e.player.state = 'stop'                         # e.g. sleep timer stopped the player
    e.core.tick()
    assert e.store.get_position('Buch')['elapsed'] == 77.0


# --- store -----------------------------------------------------------------------

def test_store_roundtrip_and_atomic_file(tmp_path):
    path = tmp_path / 'k.json'
    s = core.ResumeStore(str(path))
    s.set_resume('Ä Ö/Buch', True)
    s.save_position('Ä Ö/Buch', 'Ä Ö/Buch/1.mp3', 5)
    again = core.ResumeStore(str(path))
    assert again.resume_enabled('Ä Ö/Buch')
    assert again.get_position('Ä Ö/Buch')['file'] == 'Ä Ö/Buch/1.mp3'
    assert [p for p in os.listdir(tmp_path) if p.endswith('.tmp')] == []
    assert json.loads(path.read_text(encoding='utf-8'))['version'] == 1


def test_corrupt_store_does_not_break_playback(tmp_path):
    path = tmp_path / 'k.json'
    path.write_text('{ this is not json')
    s = core.ResumeStore(str(path))
    assert s.resume_default is False
    assert (tmp_path / 'k.json.broken').exists()
    s.set_resume('A', True)                          # and it can write a fresh file again
    assert core.ResumeStore(str(path)).resume_enabled('A')


def test_get_config(env):
    env.store.set_resume('Buch', True)
    cfg = env.core.get_config()
    assert cfg['resume_folders'] == {'Buch': True}
    assert cfg['resume_default'] is False
    assert cfg['fade_ms'] == 400
