import { describe, it, expect, beforeEach } from 'vitest';
import { usePubSubStore } from '../pubSubStore';

describe('pubSubStore', () => {
  beforeEach(() => {
    usePubSubStore.setState({
      volume: { level: 0, mute: false },
      batteryStatus: null,
      cpuTemp: null,
      rfidCardId: null,
      coreVersion: null,
      startedAt: null,
      pluginsLoaded: {},
    });
  });

  describe('handleEvent', () => {
    it('should handle volume.level events', () => {
      usePubSubStore.getState().handleEvent('volume.level', { level: 75, mute: false });
      expect(usePubSubStore.getState().volume).toEqual({ level: 75, mute: false });
    });

    it('should handle host.temperature.cpu events', () => {
      usePubSubStore.getState().handleEvent('host.temperature.cpu', 55.3);
      expect(usePubSubStore.getState().cpuTemp).toBe(55.3);
    });

    it('should handle rfid.card_id events', () => {
      usePubSubStore.getState().handleEvent('rfid.card_id', '1234567890');
      expect(usePubSubStore.getState().rfidCardId).toBe('1234567890');
    });

    it('should handle core.version events', () => {
      usePubSubStore.getState().handleEvent('core.version', '3.5.0');
      expect(usePubSubStore.getState().coreVersion).toBe('3.5.0');
    });
  });
});
