import { create } from 'zustand';
import type { Volume, BatteryStatus } from '../types/player';

export interface CardScan {
  id: string;
  /** Local timestamp, so scanning the same card twice is a new event. */
  at: number;
}

interface PubSubState {
  volume: Volume;
  batteryStatus: BatteryStatus | null;
  cpuTemp: number | null;
  rfidCardId: string | null;
  lastScan: CardScan | null;
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

/** `core.plugins.loaded` is a list of package names; keep a lookup map. */
function toPluginMap(data: unknown): Record<string, boolean> {
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((name) => [String(name), true]));
  }
  if (data && typeof data === 'object') return data as Record<string, boolean>;
  return {};
}

export const usePubSubStore = create<PubSubState>((set) => ({
  volume: { level: 0, mute: false },
  batteryStatus: null,
  cpuTemp: null,
  rfidCardId: null,
  lastScan: null,
  coreVersion: null,
  startedAt: null,
  pluginsLoaded: {},

  setVolume: (volume) => set({ volume }),
  setBatteryStatus: (status) => set({ batteryStatus: status }),
  setCpuTemp: (temp) => set({ cpuTemp: temp }),
  setRfidCardId: (id) =>
    set({ rfidCardId: id, lastScan: id ? { id, at: Date.now() } : null }),
  setCoreVersion: (version) => set({ coreVersion: version }),
  setStartedAt: (time) => set({ startedAt: time }),
  setPluginsLoaded: (plugins) => set({ pluginsLoaded: plugins }),

  handleEvent: (topic, data) => {
    switch (topic) {
      case 'volume.level': {
        // Backend payload: { volume: 42, mute: false }
        const d = (data ?? {}) as { volume?: number; level?: number; mute?: boolean };
        set({ volume: { level: Number(d.volume ?? d.level ?? 0), mute: Boolean(d.mute) } });
        break;
      }
      case 'batt_status':
        set({ batteryStatus: data as BatteryStatus });
        break;
      case 'host.temperature.cpu': {
        const temp = Number(data);
        if (Number.isFinite(temp)) set({ cpuTemp: temp });
        break;
      }
      case 'rfid.card_id':
        set({ rfidCardId: String(data), lastScan: { id: String(data), at: Date.now() } });
        break;
      case 'core.version':
        set({ coreVersion: String(data) });
        break;
      case 'core.started_at':
        set({ startedAt: String(data) });
        break;
      case 'core.plugins.loaded':
        set({ pluginsLoaded: toPluginMap(data) });
        break;
    }
  },
}));
