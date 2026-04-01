import { useEffect } from 'react';
import { usePlayerStore } from '../../../stores/playerStore';
import { request } from '../../../services/request';
import styles from './Cover.module.css';

export function Cover() {
  const status = usePlayerStore((s) => s.status);
  const coverUrl = usePlayerStore((s) => s.coverUrl);
  const setCoverUrl = usePlayerStore((s) => s.setCoverUrl);

  useEffect(() => {
    if (!status?.file) {
      setCoverUrl(null);
      return;
    }

    async function loadCover() {
      const { result } = await request<string>('getSingleCoverArt', {
        song_url: status!.file,
      });
      if (result) {
        setCoverUrl(`/cover-cache/${result}`);
      } else {
        setCoverUrl(null);
      }
    }

    loadCover();
  }, [status?.file, setCoverUrl]);

  return (
    <div className={styles.container}>
      {coverUrl ? (
        <img src={coverUrl} alt="Cover" className={styles.image} />
      ) : (
        <div className={styles.fallback}>
          <span className={styles.icon}>♪</span>
        </div>
      )}
    </div>
  );
}
