import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { usePlayerStore } from '../stores/playerStore';
import { usePubSubStore } from '../stores/pubSubStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { PlayerStatus } from '../types/player';

export function useSocketInit(): void {
  useEffect(() => {
    const socket = getSocket();

    const unsubscribe = socket.onPubSub((topic, data) => {
      if (topic === 'playerstatus') {
        usePlayerStore.getState().setStatus(data as PlayerStatus);
      } else {
        usePubSubStore.getState().handleEvent(topic, data);
      }
    });

    socket.setConnectionChangeHandler((connected) => {
      useConnectionStore.getState().setState(connected ? 'connected' : 'reconnecting');
    });

    useSettingsStore.getState().loadSettings();

    return () => {
      unsubscribe();
    };
  }, []);
}
