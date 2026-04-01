export interface Album {
  albumartist: string;
  album: string;
}

export interface Song {
  title: string;
  artist: string;
  album: string;
  albumartist: string;
  file: string;
  track: string;
  duration: number;
}

export interface FolderItem {
  name: string;
  relpath: string;
  type: 'dir' | 'file';
}

export interface FolderContent {
  path: string;
  items: FolderItem[];
}
