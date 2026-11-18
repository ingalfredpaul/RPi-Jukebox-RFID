import { describe, it, expect } from 'vitest';
import { isAllowedName, extensionOf, totalProgress, type UploadItem } from '../uploader';
import { joinPath, parentPath } from '../files';

describe('uploader helpers', () => {
  it('accepts only whitelisted extensions, case-insensitive', () => {
    expect(isAllowedName('a.MP3')).toBe(true);
    expect(isAllowedName('a.m4b')).toBe(true);
    expect(isAllowedName('a.exe')).toBe(false);
    expect(isAllowedName('a.mp3.exe')).toBe(false);
    expect(isAllowedName('noext')).toBe(false);
    expect(extensionOf('x.tar.gz')).toBe('gz');
  });
  it('computes total progress ignoring canceled items', () => {
    const base = { name: '', path: '', attempts: 0 };
    const items: UploadItem[] = [
      { ...base, id: '1', size: 100, loaded: 100, status: 'done' },
      { ...base, id: '2', size: 100, loaded: 50, status: 'uploading' },
      { ...base, id: '3', size: 800, loaded: 0, status: 'canceled' },
    ];
    expect(totalProgress(items)).toBe(0.75);
  });
  it('joins paths', () => {
    expect(joinPath('a', '', 'b/c', '/d')).toBe('a/b/c/d');
    expect(parentPath('a/b/c.mp3')).toBe('a/b');
    expect(parentPath('c.mp3')).toBe('');
  });
});
