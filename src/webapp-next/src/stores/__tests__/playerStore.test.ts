import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      status: null,
      coverUrl: null,
      isPlaying: false,
    });
  });

  it('should set player status', () => {
    const status = {
      state: 'play' as const,
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      albumartist: 'Test Artist',
      file: 'test.mp3',
      track: '1',
      elapsed: 10,
      duration: 200,
      songid: '1',
      shuffle: false,
      repeat: false,
      single: false,
    };

    usePlayerStore.getState().setStatus(status);

    expect(usePlayerStore.getState().status).toEqual(status);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('should set isPlaying to false when paused', () => {
    usePlayerStore.getState().setStatus({
      state: 'pause',
      title: '', artist: '', album: '', albumartist: '',
      file: '', track: '', elapsed: 0, duration: 0,
      songid: '', shuffle: false, repeat: false, single: false,
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('should set cover URL', () => {
    usePlayerStore.getState().setCoverUrl('/test-cover.png');
    expect(usePlayerStore.getState().coverUrl).toBe('/test-cover.png');
  });
});
