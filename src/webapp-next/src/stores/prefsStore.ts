import { create } from 'zustand';

/**
 * Per-device UI preferences (localStorage). Nothing here affects the box.
 */
const KEY = 'pb.prefs';

interface Prefs {
  /** Largest allowed volume change per touch gesture (percent points). 0 = unlimited. */
  maxVolumeJump: number;
  /** Volume change of the +/- buttons. */
  volumeStep: number;
}

const DEFAULTS: Prefs = { maxVolumeJump: 15, volumeStep: 5 };

function load(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface PrefsState extends Prefs {
  update: (partial: Partial<Prefs>) => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...load(),
  update: (partial) => {
    set(partial);
    const { maxVolumeJump, volumeStep } = get();
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ maxVolumeJump, volumeStep }));
    } catch {
      /* ignore */
    }
  },
}));

/** Clamp a requested volume so one gesture never jumps more than `maxJump` away from `from`. */
export function limitJump(from: number, requested: number, maxJump: number): number {
  if (maxJump <= 0) return requested;
  return Math.max(from - maxJump, Math.min(from + maxJump, requested));
}
