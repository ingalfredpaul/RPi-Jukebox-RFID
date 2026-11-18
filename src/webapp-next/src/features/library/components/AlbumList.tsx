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
  const { data, isLoading, error, refetch } = useRequest<Album[]>('albumList');
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

  if (error) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📡</span>
        <p>{t('general.loadingerror')}</p>
        <button className="ui-btn" onClick={refetch}>{t('general.buttons.retry')}</button>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.searchContainer}>
        <input
          className="ui-input"
          type="search"
          placeholder={t('library.search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📀</span>
          <p>{search ? t('library.search.noresults') : t('library.albums.noalbums')}</p>
          {!search && <p className="ui-hint">{t('library.albums.hint')}</p>}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((album) => (
            <div key={`${album.albumartist}-${album.album}`} className={styles.listItem}>
              <button
                className={styles.rowMain}
                onClick={() =>
                  navigate(`/library/albums/${encodeURIComponent(album.albumartist)}/${encodeURIComponent(album.album)}`)
                }
              >
                <span className={styles.itemIcon}>📀</span>
                <span className={styles.itemInfo}>
                  <span className={styles.itemTitle} style={{ display: 'block' }}>{album.album}</span>
                  <span className={styles.itemSubtitle} style={{ display: 'block' }}>{album.albumartist}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
