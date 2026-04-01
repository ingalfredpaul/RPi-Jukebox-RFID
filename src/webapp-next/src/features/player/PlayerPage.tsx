import { useSocketInit } from '../../hooks/useSocket';
import { usePlayerStore } from '../../stores/playerStore';
import { Cover } from './components/Cover';
import { Display } from './components/Display';
import { SeekBar } from './components/SeekBar';
import { Controls } from './components/Controls';
import { Volume } from './components/Volume';
import styles from './player.module.css';

export function PlayerPage() {
  useSocketInit();
  const coverUrl = usePlayerStore((s) => s.coverUrl);

  return (
    <div className={styles.page}>
      {coverUrl && (
        <div
          className={styles.backdrop}
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}
      <div className={styles.content}>
        <Cover />
        <Display />
        <SeekBar />
        <Controls />
        <Volume />
      </div>
    </div>
  );
}
