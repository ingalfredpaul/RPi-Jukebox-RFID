import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';

export function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <ConnectionStatus />
        <AppRouter />
      </ErrorBoundary>
    </HashRouter>
  );
}
