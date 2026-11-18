import { describe, it, expect } from 'vitest';
import { normalizeStatus, titleFromFile, folderOfFile } from '../mpd';

describe('mpd status normalisation', () => {
  it('converts MPD string values', () => {
    const s = normalizeStatus({ state: 'play', elapsed: '12.5', duration: '200.0', random: '1', repeat: '0', single: '0', song: '2' });
    expect(s.elapsed).toBe(12.5);
    expect(s.duration).toBe(200);
    expect(s.shuffle).toBe(true);
    expect(s.repeat).toBe(false);
    expect(s.song).toBe(2);
  });
  it('handles missing values', () => {
    const s = normalizeStatus({});
    expect(s.state).toBe('stop');
    expect(s.elapsed).toBe(0);
    expect(s.song).toBe(-1);
  });
  it('helpers', () => {
    expect(titleFromFile('A/B/01 Intro.mp3')).toBe('01 Intro');
    expect(folderOfFile('A/B/01.mp3')).toBe('A/B');
  });
});
