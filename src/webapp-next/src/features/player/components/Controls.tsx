import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../../../stores/playerStore';
import { request } from '../../../services/request';
import styles from '../player.module.css';

export function Controls() {
  const { t } = useTranslation();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isShuffle = usePlayerStore((s) => s.status?.shuffle ?? false);
  const repeat = usePlayerStore((s) => s.status?.repeat ?? false);
  const single = usePlayerStore((s) => s.status?.single ?? false);
  const hasSong = usePlayerStore((s) => Boolean(s.status?.file));
  const isStopped = usePlayerStore((s) => (s.status?.state ?? 'stop') === 'stop');

  // MPD's pause toggle does nothing when stopped, so start playback explicitly then.
  return (
    <div className={styles.controls}>
      <button
        className={`${styles.btn} ${styles.secondary} ${isShuffle ? styles.active : ''}`}
        onClick={() => request('shuffle', { option: 'toggle' })}
        aria-label={t('player.controls.shuffle')}
        aria-pressed={isShuffle}
      >
        ⇄
      </button>

      <button
        className={styles.btn}
        onClick={() => request('prev_song')}
        aria-label={t('player.controls.prev')}
        disabled={!hasSong}
      >
        ⏮
      </button>

      <button
        className={`${styles.btn} ${styles.playPause}`}
        onClick={() => request(isStopped ? 'play' : 'toggle')}
        aria-label={isPlaying ? t('player.controls.pause') : t('player.controls.play')}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        className={styles.btn}
        onClick={() => request('next_song')}
        aria-label={t('player.controls.next')}
        disabled={!hasSong}
      >
        ⏭
      </button>

      <button
        className={`${styles.btn} ${styles.secondary} ${repeat ? styles.active : ''}`}
        onClick={() => request('repeat', { option: 'toggle' })}
        aria-label={t('player.controls.repeat')}
        aria-pressed={repeat}
      >
        {repeat && single ? '🔂' : '↻'}
      </button>
    </div>
  );
}
