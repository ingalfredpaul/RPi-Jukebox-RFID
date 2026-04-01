import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PlayerPage } from './features/player/PlayerPage';

const LibraryPage = lazy(() => import('./features/library/LibraryPage').then(m => ({ default: m.LibraryPage })));
const CardsPage = lazy(() => import('./features/cards/CardsPage').then(m => ({ default: m.CardsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SpotifyPage = lazy(() => import('./features/spotify/SpotifyPage').then(m => ({ default: m.SpotifyPage })));
const RadioPage = lazy(() => import('./features/radio/RadioPage').then(m => ({ default: m.RadioPage })));

export function AppRouter() {
  return (
    <>
      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<PlayerPage />} />
            <Route path="/library/*" element={<LibraryPage />} />
            <Route path="/cards/*" element={<CardsPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="/spotify/*" element={<SpotifyPage />} />
            <Route path="/radio/*" element={<RadioPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Navigation />
    </>
  );
}
