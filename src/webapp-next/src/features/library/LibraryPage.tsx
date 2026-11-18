import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ParentGate } from '../../components/ParentGate';
import { AlbumList } from './components/AlbumList';
import { SongList } from './components/SongList';
import { FolderBrowser } from './components/FolderBrowser';
import { UploadPage } from './components/UploadPage';
import styles from './library.module.css';

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAlbums = pathname.startsWith('/library/albums');
  const showTabs = !pathname.startsWith('/library/upload') && !pathname.startsWith('/library/manage');

  return (
    <div className={styles.page}>
      {showTabs && (
        <>
          <Header title={t('navigation.library')} />
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={!isAlbums}
              className={`${styles.tab} ${!isAlbums ? styles.activeTab : ''}`}
              onClick={() => navigate('/library/folders')}
            >
              {t('library.selector.folders')}
            </button>
            <button
              role="tab"
              aria-selected={isAlbums}
              className={`${styles.tab} ${isAlbums ? styles.activeTab : ''}`}
              onClick={() => navigate('/library/albums')}
            >
              {t('library.selector.albums')}
            </button>
          </div>
        </>
      )}

      <ErrorBoundary>
        <Routes>
          <Route index element={<Navigate to="folders" replace />} />
          <Route path="albums" element={<AlbumList />} />
          <Route path="albums/:artist/:album" element={<SongList />} />
          <Route path="folders/*" element={<FolderBrowser mode="play" />} />
          <Route
            path="manage/*"
            element={
              <ParentGate>
                <Header title={t('library.manage.title')} />
                <FolderBrowser mode="manage" />
              </ParentGate>
            }
          />
          <Route path="upload" element={<ParentGate><UploadPage /></ParentGate>} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
