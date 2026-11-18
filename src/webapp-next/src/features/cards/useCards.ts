import { useCallback, useEffect, useState } from 'react';
import { request } from '../../services/request';
import type { CardsMap } from './cardUtils';

export function useCards() {
  const [cards, setCards] = useState<CardsMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { result, error: err } = await request<CardsMap>('cardsList');
    if (err) setError(err);
    else {
      setCards(result ?? {});
      setError(null);
    }
    return result ?? {};
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { cards, error, reload };
}
