import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton cache instance
const analyticsCache = new AnalyticsCache();

export const useAnalyticsCache = () => {
  const getCachedData = useCallback(<T>(key: string): T | null => {
    return analyticsCache.get<T>(key);
  }, []);

  const setCachedData = useCallback(<T>(key: string, data: T, ttl?: number): void => {
    analyticsCache.set(key, data, ttl);
  }, []);

  const invalidateCache = useCallback((pattern?: string): void => {
    analyticsCache.invalidate(pattern);
  }, []);

  return { getCachedData, setCachedData, invalidateCache };
};

export const useProgressiveLoading = <T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    pageSize?: number;
    cacheKey?: string;
    enableCache?: boolean;
  } = {}
) => {
  const { pageSize = 20, cacheKey, enableCache = true } = options;
  const { getCachedData, setCachedData } = useAnalyticsCache();
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const currentPage = reset ? 0 : page;
      const cacheKeyWithPage = cacheKey ? `${cacheKey}_page_${currentPage}` : null;
      
      // Try cache first
      if (enableCache && cacheKeyWithPage) {
        const cached = getCachedData<T[]>(cacheKeyWithPage);
        if (cached && !reset) {
          setData(prev => reset ? cached : [...prev, ...cached]);
          setPage(prev => reset ? 1 : prev + 1);
          setLoading(false);
          return;
        }
      }

      const newData = await fetchFunction();
      const dataArray = Array.isArray(newData) ? newData : [newData];
      
      // Paginate the data
      const startIndex = currentPage * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = dataArray.slice(startIndex, endIndex);
      
      if (enableCache && cacheKeyWithPage) {
        setCachedData(cacheKeyWithPage, pageData);
      }

      setData(prev => reset ? pageData : [...prev, ...pageData]);
      setHasMore(endIndex < dataArray.length);
      setPage(prev => reset ? 1 : prev + 1);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize, cacheKey, enableCache, loading, getCachedData, setCachedData]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadData(false);
    }
  }, [loading, hasMore, loadData]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    refresh();
  }, dependencies);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    refresh
  };
};

export const useBackgroundRefresh = (
  refreshFunction: () => Promise<void>,
  interval: number = 30000, // 30 seconds
  dependencies: any[] = []
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const startBackgroundRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        await refreshFunction();
        setLastRefresh(new Date());
      } catch (error) {
        console.warn('Background refresh failed:', error);
      }
    }, interval);
  }, [refreshFunction, interval]);

  const stopBackgroundRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startBackgroundRefresh();
    return () => stopBackgroundRefresh();
  }, [startBackgroundRefresh, stopBackgroundRefresh, ...dependencies]);

  return {
    lastRefresh,
    startBackgroundRefresh,
    stopBackgroundRefresh
  };
};

export const useQueryOptimization = () => {
  const optimizeQuery = useCallback((
    baseQuery: any,
    options: {
      limit?: number;
      orderBy?: { column: string; ascending?: boolean }[];
      filters?: Record<string, any>;
      select?: string;
    } = {}
  ) => {
    let query = baseQuery;

    // Apply select fields for performance
    if (options.select) {
      query = query.select(options.select);
    }

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([column, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(column, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.like(column, value);
          } else {
            query = query.eq(column, value);
          }
        }
      });
    }

    // Apply ordering
    if (options.orderBy) {
      options.orderBy.forEach(({ column, ascending = false }) => {
        query = query.order(column, { ascending });
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }, []);

  const batchQueries = useCallback(async (queries: (() => Promise<any>)[]) => {
    const results = await Promise.allSettled(queries.map(query => query()));
    
    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }, []);

  return {
    optimizeQuery,
    batchQueries
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    updateCount: number;
    lastUpdate: Date;
  }>({
    renderTime: 0,
    updateCount: 0,
    lastUpdate: new Date()
  });

  useEffect(() => {
    const renderTime = Date.now() - startTime.current;
    setMetrics(prev => ({
      renderTime,
      updateCount: prev.updateCount + 1,
      lastUpdate: new Date()
    }));

    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
    }
  });

  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  return metrics;
};