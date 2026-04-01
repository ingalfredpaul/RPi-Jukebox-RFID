import { useState, useEffect, useCallback } from 'react';
import { request, type RequestResult } from '../services/request';
import type { CommandName } from '../services/commands';

interface UseRequestState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useRequest<T = unknown>(
  command: CommandName,
  kwargs?: Record<string, unknown>,
  options?: { enabled?: boolean },
): UseRequestState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    const result: RequestResult<T> = await request<T>(command, kwargs);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.result ?? null);
    }

    setIsLoading(false);
  }, [command, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch: fetchData };
}
