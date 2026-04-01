import { useTranslation } from 'react-i18next';
import { useRadioStore } from '../../../stores/radioStore';
import { FileUpload } from '../../../components/FileUpload';
import { showToast } from '../../../components/Toast';
import { toHHMMSS } from '../../../utils/time';
import styles from '../radio.module.css';

export function PodcastManager() {
  const { t } = useTranslation();
  const podcasts = useRadioStore((s) => s.podcasts);
  const playPodcast = useRadioStore((s) => s.playPodcast);
  const removePodcast = useRadioStore((s) => s.removePodcast);

  const handleUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'podcast');

      try {
        await fetch(`http://${window.location.hostname}/upload`, {
          method: 'POST',
          body: formData,
        });
      } catch {
        showToast('error', t('upload.error', { file: file.name }));
      }
    }
    showToast('success', t('upload.complete'));
  };

  return (
    <div>
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionSubtitle}>{t('radio.podcasts.add')}</h3>
        <FileUpload onUpload={handleUpload} accept="audio/*" multiple />
      </div>

      {podcasts.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎙</span>
          <p>{t('radio.podcasts.no-podcasts')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {podcasts.map((podcast) => {
            const progress = podcast.duration > 0
              ? (podcast.position / podcast.duration) * 100
              : 0;

            return (
              <div key={podcast.id} className={styles.podcastItem}>
                <div className={styles.stationIcon}>🎙</div>
                <div className={styles.stationInfo} onClick={() => playPodcast(podcast.id)}>
                  <div className={styles.stationName}>{podcast.name}</div>
                  {podcast.position > 0 && (
                    <div className={styles.podcastProgress}>
                      {t('radio.podcasts.resume')} {toHHMMSS(podcast.position)}
                    </div>
                  )}
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className={styles.stationActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.playBtn}`}
                    onClick={() => playPodcast(podcast.id)}
                    aria-label="Play"
                  >
                    ▶
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => removePodcast(podcast.id)}
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
