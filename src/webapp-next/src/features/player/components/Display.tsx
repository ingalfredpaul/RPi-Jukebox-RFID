import { usePlayerStore } from '../../../stores/playerStore';
import { useTranslation } from 'react-i18next';
import styles from './Display.module.css';

export function Display() {
  const status = usePlayerStore((s) => s.status);
  const { t } = useTranslation();

  const title = status?.title || t('player.display.no-title');
  const artist = status?.artist || t('player.display.no-artist');
  const album = status?.album || '';

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.artist}>{artist}</p>
      {album && <p className={styles.album}>{album}</p>}
    </div>
  );
}
