import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useParentStore, hashPin } from '../parentStore';
import { limitJump } from '../prefsStore';

describe('parent mode', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useParentStore.setState({ stored: null, unlockedUntil: 0, failedTries: 0, lockedOutUntil: 0 });
  });

  it('is open while no PIN is set', () => {
    expect(useParentStore.getState().isParent()).toBe(true);
  });

  it('locks after a PIN is removed from session and unlocks with the right PIN only', () => {
    const s = useParentStore.getState();
    expect(s.setPin('1234')).toBe(true);
    s.lock();
    expect(useParentStore.getState().isParent()).toBe(false);
    expect(useParentStore.getState().unlock('0000')).toBe(false);
    expect(useParentStore.getState().unlock('1234')).toBe(true);
    expect(useParentStore.getState().isParent()).toBe(true);
  });

  it('locks out after three wrong tries', () => {
    useParentStore.getState().setPin('1234');
    useParentStore.getState().lock();
    for (let i = 0; i < 3; i++) useParentStore.getState().unlock('9999');
    expect(useParentStore.getState().unlock('1234')).toBe(false);
  });

  it('changing the PIN needs the current one', () => {
    useParentStore.getState().setPin('1234');
    expect(useParentStore.getState().setPin('5678', '0000')).toBe(false);
    expect(useParentStore.getState().setPin('5678', '1234')).toBe(true);
  });

  it('hash depends on salt', () => {
    expect(hashPin('1234', 'a')).not.toBe(hashPin('1234', 'b'));
  });
});

describe('volume jump limit', () => {
  it('limits big jumps in both directions', () => {
    expect(limitJump(20, 80, 15)).toBe(35);
    expect(limitJump(50, 0, 15)).toBe(35);
    expect(limitJump(20, 25, 15)).toBe(25);
    expect(limitJump(20, 80, 0)).toBe(80);
  });
});

describe('parent lockout survives a page reload', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.useRealTimers());

  it('stays locked after reload, opens again after 30 s', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
    let mod = await import('../parentStore');
    mod.useParentStore.getState().setPin('1234');
    mod.useParentStore.getState().lock();
    for (let i = 0; i < 3; i++) mod.useParentStore.getState().unlock('9999');

    // "reload": fresh module instance, only localStorage is left
    vi.resetModules();
    mod = await import('../parentStore');
    expect(mod.useParentStore.getState().unlock('1234')).toBe(false); // still locked out
    vi.setSystemTime(new Date('2026-11-18T12:00:31Z'));
    expect(mod.useParentStore.getState().unlock('1234')).toBe(true);
  });

  it('counts wrong tries across reloads and clears the counter on success', async () => {
    let mod = await import('../parentStore');
    mod.useParentStore.getState().setPin('1234');
    mod.useParentStore.getState().lock();
    mod.useParentStore.getState().unlock('0000');
    mod.useParentStore.getState().unlock('0000');
    vi.resetModules();
    mod = await import('../parentStore');
    expect(mod.useParentStore.getState().failedTries).toBe(2);
    expect(mod.useParentStore.getState().unlock('1234')).toBe(true);
    expect(localStorage.getItem('pb.parent.lock')).toBeNull();
  });
});
