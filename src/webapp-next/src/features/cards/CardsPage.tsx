import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { CardsList } from './components/CardsList';
import { CardRegister } from './components/CardRegister';
import { CardEdit } from './components/CardEdit';

export function CardsPage() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route index element={<CardsList />} />
        <Route path="register" element={<CardRegister />} />
        <Route path=":cardId/edit" element={<CardEdit />} />
      </Routes>
    </ErrorBoundary>
  );
}
