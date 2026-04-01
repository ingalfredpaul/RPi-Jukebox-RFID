import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { request } from '../../../services/request';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import styles from '../library.module.css';

interface FolderItem {
  name: string;
  relpath: string;
  type: 'dir' | 'file';
}

export function FolderList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const dir = pathname.replace('/library/folders', '') || '/';

  const { data, isLoading } = useRequest<FolderItem[]>('folderList', { dir });

  const handleClick = (item: FolderItem) => {
    if (item.type === 'dir') {
      navigate(`/library/folders${item.relpath}`);
    } else {
      request('play_single', { song_url: item.relpath });
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {dir !== '/' && (
        <div
          className={`${styles.listItem} ${styles.backItem}`}
          onClick={() => navigate(-1)}
        >
          <div className={styles.itemIcon}>←</div>
          <div className={styles.itemInfo}>
            <div className={styles.itemTitle}>{t('library.folders.back')}</div>
          </div>
        </div>
      )}

      {(!data || data.length === 0) ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📁</span>
          <p>{t('library.folders.no-folders')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {data.map((item) => (
            <div
              key={item.relpath}
              className={styles.listItem}
              onClick={() => handleClick(item)}
            >
              <div className={styles.itemIcon}>
                {item.type === 'dir' ? '📁' : '♪'}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemTitle}>{item.name}</div>
              </div>
              {item.type === 'dir' && (
                <span className={styles.itemAction}>→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
