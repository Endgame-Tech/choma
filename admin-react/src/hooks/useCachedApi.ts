import { useState, useEffect, useCallback } from 'react';
import { cacheService, CACHE_DURATIONS } from '../services/cacheService';

interface UseCachedApiOptions<T> {
  cacheKey: string;
  cacheDuration?: number;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

interface UseCachedApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  fetchData: (useCache?: boolean) => Promise<void>;
}

/**
 * Custom hook for cached API requests
 */
export function useCachedApi<T>(
  apiFunction: () => Promise<T>,
  options: UseCachedApiOptions<T>
): UseCachedApiReturn<T> {
  const {
    cacheKey,
    cacheDuration = CACHE_DURATIONS.DASHBOARD_STATS,
    immediate = true,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (useCache: boolean = true) => {
    try {
      // Check cache first if useCache is true
      if (useCache) {
        const cachedData = cacheService.get<T>(cacheKey);
        if (cachedData) {
          console.log(`📦 Cache hit: ${cacheKey}`);
          setData(cachedData);
          setError(null);
          onSuccess?.(cachedData);
          return;
        }
      }

      console.log(`🌐 Cache miss, fetching: ${cacheKey}`);
      setLoading(true);
      setError(null);

      const result = await apiFunction();
      
      // Cache the result
      cacheService.set(cacheKey, result, cacheDuration);
      
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API request failed';
      setError(errorMessage);
      onError?.(err);
      console.error(`❌ API Error for ${cacheKey}:`, err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cacheDuration, apiFunction, onSuccess, onError]);

  const refetch = useCallback(async () => {
    await fetchData(false); // Force fetch, bypass cache
  }, [fetchData]);

  const clearCache = useCallback(() => {
    cacheService.delete(cacheKey);
  }, [cacheKey]);

  useEffect(() => {
    if (immediate) {
      fetchData(true);
    }
  }, [fetchData, immediate]);
  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    fetchData
  };
}

/**
 * Hook for debounced API calls (useful for search/filters)
 */
export function useDebouncedApi<T>(
  apiFunction: () => Promise<T>,
  dependencies: unknown[],
  delay: number = 500,
  options: Omit<UseCachedApiOptions<T>, 'immediate'> = { cacheKey: 'debounced' }
) {
  const [debouncedDeps, setDebouncedDeps] = useState(dependencies);
  const { fetchData, ...rest } = useCachedApi(apiFunction, {
    ...options,
    immediate: false
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDeps(dependencies);
    }, delay);

    return () => clearTimeout(timer);
  }, [dependencies, delay]);

  useEffect(() => {
    // Only fetch when debounced dependencies are not the initial empty array,
    // or if you want to allow fetching with initial dependencies.
    fetchData(true);
  }, [debouncedDeps, fetchData]);

  return rest;
}

/**
 * Hook for periodic data refresh with caching
 */
export function usePeriodicApi<T>(
  apiFunction: () => Promise<T>,
  options: UseCachedApiOptions<T> & { refreshInterval?: number }
) {
  const { refreshInterval = 60000, ...apiOptions } = options; // Default 1 minute refresh
  
  const result = useCachedApi(apiFunction, apiOptions);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      // Only refetch if data exists (user is actively viewing)
      if (result.data && !result.loading) {
        console.log(`🔄 Periodic refresh: ${options.cacheKey}`);
        result.refetch();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, result, options.cacheKey]);

  return result;
}