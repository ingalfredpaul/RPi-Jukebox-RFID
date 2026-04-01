import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SpotifyConnect } from './components/SpotifyConnect';
import { SpotifySearch } from './components/SpotifySearch';
import { SpotifyPlaylists } from './components/SpotifyPlaylists';
import { useSpotifyStore } from '../../stores/spotifyStore';
import styles from './spotify.module.css';

export function SpotifyPage() {
  const { t } = useTranslation();
  const isConnected = useSpotifyStore((s) => s.isConnected);

  return (
    <div className={styles.page}>
      <Header title={t('spotify.title')} />
      <ErrorBoundary>
        {!isConnected ? (
          <SpotifyConnect />
        ) : (
          <>
            <SpotifySearch />
            <Routes>
              <Route index element={<SpotifyPlaylists />} />
            </Routes>
          </>
        )}
      </ErrorBoundary>
    </div>
  );
}
