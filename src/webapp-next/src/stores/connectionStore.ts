import { create } from 'zustand';

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStoreState {
  state: ConnectionState;
  setState: (state: ConnectionState) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  state: 'connected',
  setState: (state) => set({ state }),
}));
