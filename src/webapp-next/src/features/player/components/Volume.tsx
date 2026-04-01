import { useState, useCallback } from 'react';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { request } from '../../../services/request';
import styles from './Volume.module.css';

export function Volume() {
  const volume = usePubSubStore((s) => s.volume);
  const [localLevel, setLocalLevel] = useState<number | null>(null);
  const displayLevel = localLevel ?? volume.level;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLocalLevel(value);
  }, []);

  const handleCommit = useCallback(() => {
    if (localLevel !== null) {
      request('setVolume', { volume: localLevel });
      setLocalLevel(null);
    }
  }, [localLevel]);

  const handleMute = useCallback(() => {
    request('toggleMuteVolume');
  }, []);

  return (
    <div className={styles.container}>
      <button
        className={`${styles.muteBtn} ${volume.mute ? styles.muted : ''}`}
        onClick={handleMute}
        aria-label={volume.mute ? 'Unmute' : 'Mute'}
      >
        {volume.mute || displayLevel === 0 ? '🔇' : displayLevel < 50 ? '🔉' : '🔊'}
      </button>

      <input
        type="range"
        min={0}
        max={100}
        value={displayLevel}
        onChange={handleChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className={styles.slider}
        style={{ '--progress': `${displayLevel}%` } as React.CSSProperties}
      />

      <span className={styles.level}>{displayLevel}</span>
    </div>
  );
}
