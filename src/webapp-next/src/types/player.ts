/**
 * Normalised player status.
 *
 * MPD (via the Jukebox daemon) publishes everything as strings
 * (`elapsed: "12.3"`, `random: "0"`, ...). `normalizeStatus()` in
 * `utils/mpd.ts` converts the raw payload into this shape.
 */
export interface PlayerStatus {
  state: 'play' | 'pause' | 'stop';
  title: string;
  artist: string;
  album: string;
  albumartist: string;
  file: string;
  track: string;
  elapsed: number;
  duration: number;
  songid: string;
  /** Position of the current song in the playlist (0-based) or -1. */
  song: number;
  playlistlength: number;
  shuffle: boolean;
  repeat: boolean;
  single: boolean;
}

export interface Volume {
  level: number;
  mute: boolean;
}

export interface BatteryStatus {
  level: number;
  charging: boolean;
}

export interface CoverArt {
  url: string | null;
}
