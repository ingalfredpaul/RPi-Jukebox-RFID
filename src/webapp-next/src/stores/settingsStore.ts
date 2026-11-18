import { create } from 'zustand';
import { request } from '../services/request';

interface AppSettings {
  show_covers: boolean;
}

interface SettingsState {
  settings: AppSettings;
  /** Soft maximum volume (hearing protection) as configured on the box, 0..100. */
  softMaxVolume: number;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setSoftMaxVolume: (value: number) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    show_covers: true,
  },
  softMaxVolume: 100,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    const [app, max] = await Promise.all([
      request<AppSettings>('getAppSettings'),
      request<number>('getMaxVolume'),
    ]);

    set({
      isLoading: false,
      error: app.error ?? null,
      ...(app.result ? { settings: { ...get().settings, ...app.result } } : {}),
      ...(typeof max.result === 'number' ? { softMaxVolume: max.result } : {}),
    });
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });

    const { error } = await request('setAppSettings', { settings: newSettings });
    if (error) {
      console.error('[Settings] Update failed:', error);
    }
  },

  setSoftMaxVolume: async (value) => {
    const { error } = await request('setMaxVolume', { max_volume: value });
    if (error) return false;
    set({ softMaxVolume: value });
    return true;
  },
}));
