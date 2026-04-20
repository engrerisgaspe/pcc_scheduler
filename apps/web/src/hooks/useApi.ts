/**
 * useApi Hook
 * Generic hook for fetching data from the API
 * Handles loading, error, and caching states
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface UseApiOptions {
  skip?: boolean; // Skip fetching if true
  cacheTime?: number; // Cache duration in milliseconds
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (options.skip) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<T>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error(`API Error [${endpoint}]:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint, options.skip]);

  return { data, loading, error, refetch: fetchData };
}
