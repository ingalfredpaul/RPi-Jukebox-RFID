import { create } from 'zustand';
import { request } from '../services/request';

interface AppSettings {
  show_covers: boolean;
}

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    show_covers: true,
  },
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    const { result, error } = await request<AppSettings>('getAppSettings');

    if (error) {
      set({ isLoading: false, error });
    } else if (result) {
      set({ settings: result, isLoading: false });
    }
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });

    const { error } = await request('setAppSettings', { settings: newSettings });
    if (error) {
      console.error('[Settings] Update failed:', error);
    }
  },
}));
