import type { Album } from '../types/library';

export function flatByAlbum(
  list: Array<{ albumartist: string; album: string }>,
): Album[] {
  const seen = new Set<string>();
  const result: Album[] = [];

  for (const item of list) {
    const key = `${item.albumartist}|||${item.album}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ albumartist: item.albumartist, album: item.album });
    }
  }

  return result;
}

export function pluginIsLoaded(
  plugins: Record<string, boolean>,
  name: string,
): boolean {
  return plugins[name] === true;
}
