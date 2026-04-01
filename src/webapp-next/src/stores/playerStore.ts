import { create } from 'zustand';
import type { PlayerStatus } from '../types/player';

interface PlayerState {
  status: PlayerStatus | null;
  coverUrl: string | null;
  isPlaying: boolean;
  setStatus: (status: PlayerStatus) => void;
  setCoverUrl: (url: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  status: null,
  coverUrl: null,
  isPlaying: false,

  setStatus: (status) =>
    set({
      status,
      isPlaying: status.state === 'play',
    }),

  setCoverUrl: (url) => set({ coverUrl: url }),
}));
