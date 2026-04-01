import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import styles from '../library.module.css';

interface Album {
  albumartist: string;
  album: string;
}

export function AlbumList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRequest<Album[]>('albumList');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (a) => a.album.toLowerCase().includes(q) || a.albumartist.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className={styles.searchContainer}>
        <input
          className={styles.searchInput}
          placeholder={t('library.search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📀</span>
          <p>{search ? t('library.search.no-results') : t('library.albums.no-albums')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((album) => (
            <div
              key={`${album.albumartist}-${album.album}`}
              className={styles.listItem}
              onClick={() =>
                navigate(`/library/albums/${encodeURIComponent(album.albumartist)}/${encodeURIComponent(album.album)}`)
              }
            >
              <div className={styles.itemIcon}>📀</div>
              <div className={styles.itemInfo}>
                <div className={styles.itemTitle}>{album.album}</div>
                <div className={styles.itemSubtitle}>{album.albumartist}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
