import { describe, it, expect } from 'vitest';
import { shouldReloadSettings } from '../useSocket';

describe('shouldReloadSettings', () => {
  it('reloads only when the connection just came back', () => {
    expect(shouldReloadSettings(false, true)).toBe(true);
  });
  it('does not reload on every message while already connected', () => {
    expect(shouldReloadSettings(true, true)).toBe(false);
  });
  it('does not reload when the connection is lost', () => {
    expect(shouldReloadSettings(true, false)).toBe(false);
    expect(shouldReloadSettings(false, false)).toBe(false);
  });
});
