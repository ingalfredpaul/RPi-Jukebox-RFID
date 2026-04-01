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
