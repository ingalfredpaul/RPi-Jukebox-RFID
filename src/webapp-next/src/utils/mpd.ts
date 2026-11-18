import type { PlayerStatus } from '../types/player';

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/** Convert the raw MPD status published on `playerstatus` into a typed object. */
export function normalizeStatus(raw: Record<string, unknown>): PlayerStatus {
  const state = raw.state === 'play' || raw.state === 'pause' ? raw.state : 'stop';
  return {
    state,
    title: str(raw.title),
    artist: str(raw.artist),
    album: str(raw.album),
    albumartist: str(raw.albumartist),
    file: str(raw.file),
    track: str(raw.track),
    elapsed: num(raw.elapsed),
    duration: num(raw.duration ?? raw.time),
    songid: str(raw.songid),
    song: num(raw.song, -1),
    playlistlength: num(raw.playlistlength),
    shuffle: str(raw.random) === '1' || raw.shuffle === true,
    repeat: str(raw.repeat) === '1' || raw.repeat === true,
    single: str(raw.single) === '1' || raw.single === true,
  };
}

/** Last path segment without extension, used as fallback title for files without tags. */
export function titleFromFile(file: string): string {
  const name = file.split('/').pop() ?? file;
  return name.replace(/\.[^.]+$/, '');
}

/** Folder part of an MPD file URL (`Pumuckl/01.mp3` -> `Pumuckl`). */
export function folderOfFile(file: string): string {
  const i = file.lastIndexOf('/');
  return i < 0 ? '' : file.slice(0, i);
}
