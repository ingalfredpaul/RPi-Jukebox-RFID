import { useTranslation } from 'react-i18next';
import { useSpotifyStore } from '../../../stores/spotifyStore';
import styles from '../spotify.module.css';

export function SpotifyConnect() {
  const { t } = useTranslation();
  const connect = useSpotifyStore((s) => s.connect);

  return (
    <div className={styles.connectContainer}>
      <span className={styles.spotifyIcon}>🎵</span>
      <h2 className={styles.connectTitle}>Spotify</h2>
      <p className={styles.connectStatus}>{t('spotify.not-connected')}</p>
      <button className={styles.connectBtn} onClick={connect}>
        {t('spotify.connect')}
      </button>
    </div>
  );
}
