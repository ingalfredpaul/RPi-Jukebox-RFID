import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Re-fetch when the arguments change (e.g. another folder), not on every render.
  const kwargsKey = JSON.stringify(kwargs ?? {});
  const latest = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const ticket = ++latest.current;
    setIsLoading(true);
    setError(null);

    const result: RequestResult<T> = await request<T>(command, JSON.parse(kwargsKey));
    if (ticket !== latest.current) return; // a newer request superseded this one

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.result ?? null);
    }

    setIsLoading(false);
  }, [command, enabled, kwargsKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch: fetchData };
}
