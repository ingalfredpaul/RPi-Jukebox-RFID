import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ToastContainer } from './components/Toast';
import { useSocketInit } from './hooks/useSocket';
import { CardScanWatcher } from './features/cards/CardScanWatcher';

function Shell() {
  // One connection for the whole app, independent of the current page.
  useSocketInit();
  return (
    <>
      <ConnectionStatus />
      <CardScanWatcher />
      <AppRouter />
      <ToastContainer />
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    </HashRouter>
  );
}
