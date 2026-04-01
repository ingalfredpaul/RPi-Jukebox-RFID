import { usePlayerStore } from '../../../stores/playerStore';
import { request } from '../../../services/request';
import styles from './Controls.module.css';

export function Controls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const status = usePlayerStore((s) => s.status);
  const isShuffle = status?.shuffle ?? false;
  const isRepeat = status?.repeat ?? false;

  return (
    <div className={styles.container}>
      <button
        className={`${styles.btn} ${styles.secondary} ${isShuffle ? styles.active : ''}`}
        onClick={() => request('shuffle', { option: isShuffle ? 'off' : 'on' })}
        aria-label="Shuffle"
      >
        ⇄
      </button>

      <button
        className={`${styles.btn} ${styles.secondary}`}
        onClick={() => request('prev_song')}
        aria-label="Previous"
      >
        ⏮
      </button>

      <button
        className={`${styles.btn} ${styles.playPause}`}
        onClick={() => request('toggle')}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        className={`${styles.btn} ${styles.secondary}`}
        onClick={() => request('next_song')}
        aria-label="Next"
      >
        ⏭
      </button>

      <button
        className={`${styles.btn} ${styles.secondary} ${isRepeat ? styles.active : ''}`}
        onClick={() => request('repeat', { option: isRepeat ? 'off' : 'on' })}
        aria-label="Repeat"
      >
        ↻
      </button>
    </div>
  );
}
