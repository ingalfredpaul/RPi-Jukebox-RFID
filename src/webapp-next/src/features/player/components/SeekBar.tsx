import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../../../stores/playerStore';
import { request } from '../../../services/request';
import { toHHMMSS, timeToProgress } from '../../../utils/time';
import styles from '../player.module.css';

export function SeekBar() {
  const { t } = useTranslation();
  const elapsedStatus = usePlayerStore((s) => s.status?.elapsed ?? 0);
  const duration = usePlayerStore((s) => s.status?.duration ?? 0);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [elapsed, setElapsed] = useState(0);
  const seeking = useRef(false);

  useEffect(() => {
    if (!seeking.current) setElapsed(elapsedStatus);
  }, [elapsedStatus]);

  // Smooth ticking between the (sparse) status updates.
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;
    const id = setInterval(() => {
      if (!seeking.current) setElapsed((prev) => Math.min(prev + 1, duration));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, duration]);

  const progress = timeToProgress(elapsed, duration);

  const commit = () => {
    if (!seeking.current) return;
    seeking.current = false;
    void request('seek', { new_time: Math.floor(elapsed) });
  };

  return (
    <div className={styles.seek}>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        disabled={duration <= 0}
        aria-label={t('player.seekbar.position')}
        onChange={(e) => {
          seeking.current = true;
          setElapsed((Number(e.target.value) / 100) * duration);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className={styles.slider}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      />
      <div className={styles.times}>
        <span>{toHHMMSS(elapsed)}</span>
        <span>{duration > 0 ? toHHMMSS(duration) : '--:--'}</span>
      </div>
    </div>
  );
}
