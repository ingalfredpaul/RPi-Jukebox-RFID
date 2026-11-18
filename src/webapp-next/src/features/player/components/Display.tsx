import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../../../stores/playerStore';
import { titleFromFile } from '../../../utils/mpd';
import styles from '../player.module.css';

export function Display() {
  const { t } = useTranslation();
  const title = usePlayerStore((s) => s.status?.title ?? '');
  const file = usePlayerStore((s) => s.status?.file ?? '');
  const artist = usePlayerStore((s) => s.status?.artist ?? '');
  const album = usePlayerStore((s) => s.status?.album ?? '');
  const state = usePlayerStore((s) => s.status?.state ?? 'stop');

  const shownTitle = title || (file ? titleFromFile(file) : t('player.display.not-playing'));
  const sub = [artist, album].filter(Boolean).join(' · ');

  return (
    <div className={styles.display}>
      <h2 className={styles.title}>{shownTitle}</h2>
      {sub ? <p className={styles.sub}>{sub}</p> : null}
      {state === 'stop' && file ? <p className={styles.sub}>{t('player.display.stopped')}</p> : null}
    </div>
  );
}
