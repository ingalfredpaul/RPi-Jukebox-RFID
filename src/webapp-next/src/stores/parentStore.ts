import { create } from 'zustand';

/**
 * Parent mode ("Elternmodus").
 *
 * IMPORTANT: this is child protection, not security. The PIN only lives in
 * this browser (localStorage) and is checked in JavaScript. Anybody who can
 * open the developer tools, or simply use another phone, can bypass it. That
 * is intentional: the goal is "a 5 year old cannot accidentally delete the
 * audio books", not "protect against an attacker". The box has no accounts
 * and runs in the home network without HTTPS.
 *
 * The hash is a small non-cryptographic one on purpose: `crypto.subtle` does
 * not exist on plain http:// pages, which is how the box is reached.
 */

const STORAGE_KEY = 'pb.parent';
const SESSION_KEY = 'pb.parent.until';
export const AUTO_LOCK_MS = 10 * 60 * 1000;
const LOCK_KEY = 'pb.parent.lock';
const MAX_TRIES = 3;
const LOCKOUT_MS = 30_000;

interface Stored {
  salt: string;
  hash: string;
}

/** cyrb53 string hash (public domain), 53 bit, good enough for a child lock. */
export function hashPin(pin: string, salt: string): string {
  let h1 = 0xdeadbeef ^ salt.length;
  let h2 = 0x41c6ce57 ^ pin.length;
  const input = `${salt}:${pin}`;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function load(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function loadUnlockedUntil(): number {
  try {
    return Number(window.sessionStorage.getItem(SESSION_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Failed tries and lockout survive a page reload (still only child protection: clearing site data resets it). */
function loadLock(): { failedTries: number; lockedOutUntil: number } {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    const v = raw ? (JSON.parse(raw) as { failedTries?: number; lockedOutUntil?: number }) : {};
    return { failedTries: Number(v.failedTries) || 0, lockedOutUntil: Number(v.lockedOutUntil) || 0 };
  } catch {
    return { failedTries: 0, lockedOutUntil: 0 };
  }
}

function persistLock(failedTries: number, lockedOutUntil: number) {
  try {
    if (failedTries === 0 && lockedOutUntil === 0) window.localStorage.removeItem(LOCK_KEY);
    else window.localStorage.setItem(LOCK_KEY, JSON.stringify({ failedTries, lockedOutUntil }));
  } catch {
    /* ignore */
  }
}

function persistUntil(ts: number) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

interface ParentState {
  stored: Stored | null;
  unlockedUntil: number;
  failedTries: number;
  lockedOutUntil: number;
  /** true when no PIN is set (open) or the parent mode is currently unlocked */
  isParent: () => boolean;
  hasPin: () => boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
  touch: () => void;
  setPin: (newPin: string, currentPin?: string) => boolean;
  removePin: (currentPin: string) => boolean;
}

export const useParentStore = create<ParentState>((set, get) => ({
  stored: load(),
  unlockedUntil: loadUnlockedUntil(),
  ...loadLock(),

  hasPin: () => get().stored !== null,

  isParent: () => get().stored === null || Date.now() < get().unlockedUntil,

  unlock: (pin) => {
    const { stored, lockedOutUntil, failedTries } = get();
    if (!stored) return true;
    if (Date.now() < lockedOutUntil) return false;
    if (hashPin(pin, stored.salt) === stored.hash) {
      const until = Date.now() + AUTO_LOCK_MS;
      persistUntil(until);
      persistLock(0, 0);
      set({ unlockedUntil: until, failedTries: 0, lockedOutUntil: 0 });
      return true;
    }
    const tries = failedTries + 1;
    const next = tries >= MAX_TRIES
      ? { failedTries: 0, lockedOutUntil: Date.now() + LOCKOUT_MS }
      : { failedTries: tries, lockedOutUntil };
    persistLock(next.failedTries, next.lockedOutUntil);
    set(next);
    return false;
  },

  lock: () => {
    persistUntil(0);
    set({ unlockedUntil: 0 });
  },

  // Called on user activity inside the parent area: keeps the session alive.
  touch: () => {
    if (get().stored && Date.now() < get().unlockedUntil) {
      const until = Date.now() + AUTO_LOCK_MS;
      persistUntil(until);
      set({ unlockedUntil: until });
    }
  },

  setPin: (newPin, currentPin) => {
    const { stored } = get();
    if (stored && (currentPin === undefined || hashPin(currentPin, stored.salt) !== stored.hash)) {
      return false;
    }
    const salt = Math.random().toString(36).slice(2, 10);
    const next: Stored = { salt, hash: hashPin(newPin, salt) };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return false;
    }
    const until = Date.now() + AUTO_LOCK_MS;
    persistUntil(until);
    set({ stored: next, unlockedUntil: until });
    return true;
  },

  removePin: (currentPin) => {
    const { stored } = get();
    if (!stored || hashPin(currentPin, stored.salt) !== stored.hash) return false;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    persistUntil(0);
    set({ stored: null, unlockedUntil: 0 });
    return true;
  },
}));

/** Reactive helper for components. */
export function useIsParent(): boolean {
  // Subscribe to the fields that influence the result so the component re-renders.
  const stored = useParentStore((s) => s.stored);
  const until = useParentStore((s) => s.unlockedUntil);
  return stored === null || Date.now() < until;
}
