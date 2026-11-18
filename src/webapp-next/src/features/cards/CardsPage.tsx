import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ParentGate } from '../../components/ParentGate';
import { CardsList } from './components/CardsList';
import { CardWizard } from './components/CardWizard';

export function CardsPage() {
  return (
    <ErrorBoundary>
      <ParentGate>
        <Routes>
          <Route index element={<CardsList />} />
          <Route path="new" element={<CardWizard />} />
          <Route path="edit/:cardId" element={<CardWizard />} />
        </Routes>
      </ParentGate>
    </ErrorBoundary>
  );
}
