#!/usr/bin/env python3
"""
Applies the kids-friendly defaults to an EXISTING Phoniebox installation.

Run it on the box with the Jukebox's own Python (it contains ruamel.yaml, which keeps
all comments in the YAML files):

    cd ~/RPi-Jukebox-RFID
    .venv/bin/python deploy/kids-config/apply-kids-config.py --dry-run     # only show
    .venv/bin/python deploy/kids-config/apply-kids-config.py               # write (with backup)

What it changes (all values can be overridden, see --help):

  shared/settings/jukebox.yaml
    modules.named.kidsbox         enable the kids mode plugin (after "player")
    kidsbox.*                     defaults of the plugin (fade, resume, unknown-card signal)
    pulse.startup_volume          volume after every start      (default 25)
    pulse.soft_max_volume         hearing protection limit      (default 60)
    timers.idle_shutdown.timeout_sec   switch off when idle     (default 0 = off; the Zero has no power button)
    playermpd.second_swipe_action.alias   "play": same card again never restarts the music
                                          (only used by the old play_card/play_folder cards;
                                          kidsbox cards handle this themselves)
  shared/settings/rfid.yaml
    same_id_delay                 debounce for repeated scans   (default 2.0 s)

Existing keys are only changed when the value differs. A timestamped backup of each
file is written next to it before anything is modified. Restart the jukebox-daemon afterwards.
"""
import argparse
import datetime
import os
import shutil
import sys

try:
    from ruamel.yaml import YAML
    from ruamel.yaml.comments import CommentedMap
except ImportError:
    sys.exit("ruamel.yaml not found. Run this script with the Jukebox venv: .venv/bin/python " + sys.argv[0])

KIDSBOX_DEFAULTS = [
    ('state_file', '../../shared/settings/kidsbox.json', 'positions and per-folder resume settings'),
    ('fade_ms', 400, 'fade out/in (ms) when another card replaces running music; 0 = hard cut'),
    ('resume_rewind_sec', 3, 'when resuming, jump back this many seconds'),
    ('resume_save_interval_sec', 30, 'save position of "resume" folders at most this often (SD card wear)'),
    ('unknown_card_sound', '../../resources/audio/unknown-card.wav', 'signal for unknown cards, empty = silent'),
    ('unknown_card_cooldown_sec', 5, 'minimum time between two signals'),
]


def make_yaml():
    yaml = YAML(typ='rt')
    yaml.preserve_quotes = True
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.width = 4096
    return yaml


def ensure(mapping, key, value, changes, path):
    """Set mapping[key] = value if different; record the change."""
    if key not in mapping or mapping[key] != value:
        old = mapping.get(key, '<missing>')
        mapping[key] = value
        changes.append(f"{path}.{key}: {old} -> {value}")


def ensure_map(mapping, key, changes, path):
    if key not in mapping or mapping[key] is None:
        mapping[key] = CommentedMap()
        changes.append(f"{path}.{key}: <missing> -> {{}}")
    return mapping[key]


def patch_jukebox(data, args):
    changes = []
    # 1) module list: add "kidsbox: kidsbox" right after "player"
    named = ensure_map(ensure_map(data, 'modules', changes, ''), 'named', changes, 'modules')
    if 'kidsbox' not in named:
        keys = list(named.keys())
        pos = keys.index('player') + 1 if 'player' in keys else len(keys)
        named.insert(pos, 'kidsbox', 'kidsbox')
        changes.append("modules.named.kidsbox: <missing> -> kidsbox")

    # 2) plugin defaults (do not overwrite values the user already tuned)
    section = ensure_map(data, 'kidsbox', changes, '')
    for key, value, _comment in KIDSBOX_DEFAULTS:
        if key not in section:
            section[key] = value
            changes.append(f"kidsbox.{key}: <missing> -> {value}")

    # 3) volume: startup + hearing protection
    pulse = ensure_map(data, 'pulse', changes, '')
    ensure(pulse, 'startup_volume', args.startup_volume, changes, 'pulse')
    ensure(pulse, 'soft_max_volume', args.max_volume, changes, 'pulse')
    if args.startup_volume > args.max_volume:
        sys.exit("startup volume must not be higher than the maximum volume")

    # 4) switch off when idle (seconds, at least 60; 0 disables)
    idle = ensure_map(ensure_map(data, 'timers', changes, ''), 'idle_shutdown', changes, 'timers')
    ensure(idle, 'timeout_sec', args.idle_minutes * 60, changes, 'timers.idle_shutdown')

    # 5) second swipe for classic cards
    mpd = ensure_map(data, 'playermpd', changes, '')
    swipe = ensure_map(mpd, 'second_swipe_action', changes, 'playermpd')
    ensure(swipe, 'alias', 'play', changes, 'playermpd.second_swipe_action')
    return changes


def patch_rfid(data, args):
    changes = []
    readers = data.get('rfid', {}).get('readers', {}) if data else {}
    for name, reader in readers.items():
        ensure(reader, 'same_id_delay', args.same_id_delay, changes, f"rfid.readers.{name}")
    if not readers:
        changes.append("rfid.yaml: no reader configured, nothing to change")
    return changes


def process(path, patcher, args):
    yaml = make_yaml()
    with open(path, encoding='utf-8') as f:
        data = yaml.load(f)
    changes = patcher(data, args)
    real = [c for c in changes if '->' in c]
    print(f"\n{path}:")
    if not real:
        print("  already up to date" if changes == [] else "  " + "\n  ".join(changes))
        return
    for c in real:
        print("  " + c)
    if args.dry_run:
        return
    backup = f"{path}.bak-{datetime.datetime.now():%Y%m%d-%H%M%S}"
    shutil.copy2(path, backup)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        yaml.dump(data, f)
    os.replace(tmp, path)
    print(f"  written (backup: {backup})")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--root', default=os.path.expanduser('~/RPi-Jukebox-RFID'), help='Phoniebox directory')
    parser.add_argument('--dry-run', action='store_true', help='only show what would change')
    parser.add_argument('--max-volume', type=int, default=60, help='soft maximum volume in percent (default 60)')
    parser.add_argument('--startup-volume', type=int, default=25, help='volume after start in percent (default 25)')
    parser.add_argument('--idle-minutes', type=int, default=0, help='switch off after N idle minutes, 0 = never (default 0; a switched-off Zero needs a power cycle)')
    parser.add_argument('--same-id-delay', type=float, default=2.0, help='seconds before the same card triggers again (default 2.0)')
    args = parser.parse_args()
    if args.idle_minutes != 0 and args.idle_minutes < 1:
        parser.error("--idle-minutes must be 0 or at least 1")

    settings = os.path.join(args.root, 'shared', 'settings')
    process(os.path.join(settings, 'jukebox.yaml'), patch_jukebox, args)
    rfid = os.path.join(settings, 'rfid.yaml')
    if os.path.exists(rfid):
        process(rfid, patch_rfid, args)
    if args.dry_run:
        print("\n(dry run: nothing written)")
    else:
        print("\nDone. Restart the daemon:  systemctl --user restart jukebox-daemon")


if __name__ == '__main__':
    main()
