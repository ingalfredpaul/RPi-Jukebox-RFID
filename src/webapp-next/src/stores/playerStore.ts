import { create } from 'zustand';
import type { PlayerStatus } from '../types/player';

interface PlayerState {
  status: PlayerStatus | null;
  coverUrl: string | null;
  isPlaying: boolean;
  setStatus: (status: PlayerStatus) => void;
  setCoverUrl: (url: string | null) => void;
}

function sameStatus(a: PlayerStatus | null, b: PlayerStatus): boolean {
  if (!a) return false;
  return (Object.keys(b) as (keyof PlayerStatus)[]).every((k) => a[k] === b[k]);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  status: null,
  coverUrl: null,
  isPlaying: false,

  // The daemon publishes the status several times a second. Skip identical
  // updates so React does not re-render for nothing (battery of the phone).
  setStatus: (status) => {
    if (sameStatus(get().status, status)) return;
    set({ status, isPlaying: status.state === 'play' });
  },

  setCoverUrl: (url) => set({ coverUrl: url }),
}));
