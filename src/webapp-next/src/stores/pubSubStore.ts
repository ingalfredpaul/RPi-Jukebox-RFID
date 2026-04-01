import { create } from 'zustand';
import type { Volume, BatteryStatus } from '../types/player';

interface PubSubState {
  volume: Volume;
  batteryStatus: BatteryStatus | null;
  cpuTemp: number | null;
  rfidCardId: string | null;
  coreVersion: string | null;
  startedAt: string | null;
  pluginsLoaded: Record<string, boolean>;

  setVolume: (volume: Volume) => void;
  setBatteryStatus: (status: BatteryStatus) => void;
  setCpuTemp: (temp: number) => void;
  setRfidCardId: (id: string | null) => void;
  setCoreVersion: (version: string) => void;
  setStartedAt: (time: string) => void;
  setPluginsLoaded: (plugins: Record<string, boolean>) => void;
  handleEvent: (topic: string, data: unknown) => void;
}

export const usePubSubStore = create<PubSubState>((set) => ({
  volume: { level: 0, mute: false },
  batteryStatus: null,
  cpuTemp: null,
  rfidCardId: null,
  coreVersion: null,
  startedAt: null,
  pluginsLoaded: {},

  setVolume: (volume) => set({ volume }),
  setBatteryStatus: (status) => set({ batteryStatus: status }),
  setCpuTemp: (temp) => set({ cpuTemp: temp }),
  setRfidCardId: (id) => set({ rfidCardId: id }),
  setCoreVersion: (version) => set({ coreVersion: version }),
  setStartedAt: (time) => set({ startedAt: time }),
  setPluginsLoaded: (plugins) => set({ pluginsLoaded: plugins }),

  handleEvent: (topic, data) => {
    switch (topic) {
      case 'volume.level':
        set({ volume: data as Volume });
        break;
      case 'batt_status':
        set({ batteryStatus: data as BatteryStatus });
        break;
      case 'host.temperature.cpu':
        set({ cpuTemp: data as number });
        break;
      case 'rfid.card_id':
        set({ rfidCardId: data as string });
        break;
      case 'core.version':
        set({ coreVersion: data as string });
        break;
      case 'core.started_at':
        set({ startedAt: data as string });
        break;
      case 'core.plugins.loaded':
        set({ pluginsLoaded: data as Record<string, boolean> });
        break;
    }
  },
}));
