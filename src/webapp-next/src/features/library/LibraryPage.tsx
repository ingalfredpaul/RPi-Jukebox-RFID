import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { AlbumList } from './components/AlbumList';
import { SongList } from './components/SongList';
import { FolderList } from './components/FolderList';
import { FileManager } from './components/FileManager';
import styles from './library.module.css';

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAlbums = pathname === '/library' || pathname.startsWith('/library/albums');
  const isFolders = pathname.startsWith('/library/folders');

  return (
    <div className={styles.page}>
      <Header
        title={t('navigation.library')}
        actions={
          <button className={styles.uploadBtn} onClick={() => navigate('/library/upload')}>
            ↑
          </button>
        }
      />

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isAlbums ? styles.activeTab : ''}`}
          onClick={() => navigate('/library')}
        >
          {t('library.selector.albums')}
        </button>
        <button
          className={`${styles.tab} ${isFolders ? styles.activeTab : ''}`}
          onClick={() => navigate('/library/folders')}
        >
          {t('library.selector.folders')}
        </button>
      </div>

      <ErrorBoundary>
        <Routes>
          <Route index element={<AlbumList />} />
          <Route path="albums/:artist/:album" element={<SongList />} />
          <Route path="folders" element={<FolderList />} />
          <Route path="folders/*" element={<FolderList />} />
          <Route path="upload" element={<FileManager />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
