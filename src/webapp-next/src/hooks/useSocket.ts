import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { usePlayerStore } from '../stores/playerStore';
import { usePubSubStore } from '../stores/pubSubStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { normalizeStatus } from '../utils/mpd';

/** True only when the connection just came back (not on every message while connected). */
export function shouldReloadSettings(wasConnected: boolean, connected: boolean): boolean {
  return connected && !wasConnected;
}

/** The daemon publishes the player status several times per second. */
const STALE_AFTER_MS = 8000;
const WATCHDOG_INTERVAL_MS = 2000;

/**
 * Connects the app to the box. Must be mounted exactly once (see App.tsx).
 *
 * Phones suspend WebSockets when the screen is locked, so a watchdog
 * detects silence and rebuilds the sockets, also when the page becomes
 * visible again.
 */
export function useSocketInit(): void {
  useEffect(() => {
    const socket = getSocket();
    const connection = useConnectionStore.getState();
    connection.setState('connecting');
    usePubSubStore.getState().markConnecting();

    const unsubscribe = socket.onPubSub((topic, data) => {
      if (topic === 'playerstatus') {
        usePlayerStore.getState().setStatus(normalizeStatus((data ?? {}) as Record<string, unknown>));
      } else {
        usePubSubStore.getState().handleEvent(topic, data);
      }
    });

    // The socket reports "connected" for EVERY PubSub message (several per second). Only a real
    // change of the connection state (compare with the store, the watchdog sets it from outside)
    // may reload the settings, otherwise every open tab hammers the box with RPC calls.
    socket.setConnectionChangeHandler((connected) => {
      const store = useConnectionStore.getState();
      const wasConnected = store.state === 'connected';
      store.setState(connected ? 'connected' : 'reconnecting');
      if (shouldReloadSettings(wasConnected, connected)) void useSettingsStore.getState().loadSettings();
    });

    let lastReconnect = Date.now();
    const watchdog = setInterval(() => {
      const now = Date.now();
      const silent = now - Math.max(socket.lastMessageAt, lastReconnect);
      if (silent > STALE_AFTER_MS) {
        useConnectionStore.getState().setState(socket.lastMessageAt ? 'reconnecting' : 'disconnected');
        if (silent > STALE_AFTER_MS * 2) {
          lastReconnect = now;
          usePubSubStore.getState().markConnecting();
          socket.reconnectAll();
        }
      }
    }, WATCHDOG_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - socket.lastMessageAt > 3000) {
        lastReconnect = Date.now();
        usePubSubStore.getState().markConnecting();
        socket.reconnectAll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    void useSettingsStore.getState().loadSettings();

    return () => {
      unsubscribe();
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, []);
}
