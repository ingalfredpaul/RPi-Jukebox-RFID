import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../../../stores/playerStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { request } from '../../../services/request';
import styles from '../player.module.css';

export function Cover() {
  const { t } = useTranslation();
  const file = usePlayerStore((s) => s.status?.file ?? '');
  const coverUrl = usePlayerStore((s) => s.coverUrl);
  const setCoverUrl = usePlayerStore((s) => s.setCoverUrl);
  const showCovers = useSettingsStore((s) => s.settings.show_covers);

  useEffect(() => {
    if (!file || !showCovers) {
      setCoverUrl(null);
      return;
    }
    let cancelled = false;
    void request<string>('getSingleCoverArt', { song_url: file }).then(({ result }) => {
      if (!cancelled) setCoverUrl(result ? `/cover-cache/${result}` : null);
    });
    return () => {
      cancelled = true;
    };
  }, [file, showCovers, setCoverUrl]);

  return (
    <div className={styles.cover}>
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={t('player.cover.alt')}
          className={styles.coverImg}
          onError={() => setCoverUrl(null)}
        />
      ) : (
        <div className={styles.coverFallback} aria-hidden="true">♪</div>
      )}
    </div>
  );
}
