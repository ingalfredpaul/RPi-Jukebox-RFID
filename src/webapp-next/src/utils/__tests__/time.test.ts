import { describe, it, expect } from 'vitest';
import { toHHMMSS, timeToProgress, progressToTime } from '../time';

describe('time utils', () => {
  describe('toHHMMSS', () => {
    it('should format seconds as MM:SS', () => {
      expect(toHHMMSS(0)).toBe('00:00');
      expect(toHHMMSS(65)).toBe('01:05');
      expect(toHHMMSS(599)).toBe('09:59');
    });

    it('should include hours when >= 3600', () => {
      expect(toHHMMSS(3600)).toBe('01:00:00');
      expect(toHHMMSS(3661)).toBe('01:01:01');
    });
  });

  describe('timeToProgress', () => {
    it('should return 0 when duration is 0', () => {
      expect(timeToProgress(50, 0)).toBe(0);
    });

    it('should calculate correct progress percentage', () => {
      expect(timeToProgress(50, 100)).toBe(50);
      expect(timeToProgress(25, 200)).toBe(12.5);
    });

    it('should cap at 100%', () => {
      expect(timeToProgress(150, 100)).toBe(100);
    });
  });

  describe('progressToTime', () => {
    it('should convert progress to time', () => {
      expect(progressToTime(50, 200)).toBe(100);
      expect(progressToTime(0, 200)).toBe(0);
      expect(progressToTime(100, 200)).toBe(200);
    });
  });
});
