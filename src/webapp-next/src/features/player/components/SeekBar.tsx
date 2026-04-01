import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../../stores/playerStore';
import { request } from '../../../services/request';
import { toHHMMSS, timeToProgress } from '../../../utils/time';
import styles from './SeekBar.module.css';

export function SeekBar() {
  const status = usePlayerStore((s) => s.status);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [elapsed, setElapsed] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const duration = status?.duration || 0;
  const progress = duration > 0 ? timeToProgress(elapsed, duration) : 0;

  // Sync elapsed from status
  useEffect(() => {
    if (!isSeeking && status) {
      setElapsed(status.elapsed);
    }
  }, [status?.elapsed, isSeeking]);

  // Tick every second while playing
  useEffect(() => {
    if (!isPlaying || isSeeking || duration <= 0) return;

    const interval = setInterval(() => {
      setElapsed((prev) => Math.min(prev + 1, duration));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isSeeking, duration]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = Number(e.target.value);
    const newTime = (newProgress / 100) * duration;
    setElapsed(newTime);
  }, [duration]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback((e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const value = Number((e.target as HTMLInputElement).value);
    const newTime = (value / 100) * duration;
    request('seek', { new_time: Math.floor(newTime) });
    setIsSeeking(false);
  }, [duration]);

  return (
    <div className={styles.container}>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={handleChange}
        onMouseDown={handleSeekStart}
        onMouseUp={handleSeekEnd}
        onTouchStart={handleSeekStart}
        onTouchEnd={handleSeekEnd}
        className={styles.slider}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      />
      <div className={styles.times}>
        <span>{toHHMMSS(elapsed)}</span>
        <span>{toHHMMSS(duration)}</span>
      </div>
    </div>
  );
}
