// Simple in-memory cache for analytics data
class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live for each cache entry
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate cache key
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}${sortedParams ? '|' + sortedParams : ''}`;
  }

  // Set cache entry
  set(key, value, ttlMs = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
    
    // Schedule cleanup
    setTimeout(() => {
      this.delete(key);
    }, ttlMs);

    return value;
  }

  // Get cache entry
  get(key) {
    const expiry = this.ttl.get(key);
    
    // Check if expired
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length
    };
  }

  // Cache wrapper function
  async cacheWrapper(key, fetchFunction, ttlMs = this.defaultTTL) {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch and cache the result
    try {
      const result = await fetchFunction();
      return this.set(key, result, ttlMs);
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const analyticsCache = new AnalyticsCache();

// Cache configurations for different data types
const CACHE_CONFIGS = {
  KPI_DATA: {
    prefix: 'kpi',
    ttl: 3 * 60 * 1000 // 3 minutes for KPI data
  },
  CHART_DATA: {
    prefix: 'charts',
    ttl: 5 * 60 * 1000 // 5 minutes for chart data
  },
  INSIGHTS_DATA: {
    prefix: 'insights',
    ttl: 10 * 60 * 1000 // 10 minutes for insights
  },
  BASIC_STATS: {
    prefix: 'basic_stats',
    ttl: 2 * 60 * 1000 // 2 minutes for basic dashboard stats
  }
};

// Helper functions for different data types
const cacheHelpers = {
  // Cache KPI data
  cacheKPIData: async (timeRange, fetchFunction) => {
    const key = analyticsCache.generateKey(CACHE_CONFIGS.KPI_DATA.prefix, { timeRange });
    return analyticsCache.cacheWrapper(key, fetchFunction, CACHE_CONFIGS.KPI_DATA.ttl);
  },

  // Cache chart data
  cacheChartData: async (timeRange, fetchFunction) => {
    const key = analyticsCache.generateKey(CACHE_CONFIGS.CHART_DATA.prefix, { timeRange });
    return analyticsCache.cacheWrapper(key, fetchFunction, CACHE_CONFIGS.CHART_DATA.ttl);
  },

  // Cache insights data
  cacheInsightsData: async (timeRange, fetchFunction) => {
    const key = analyticsCache.generateKey(CACHE_CONFIGS.INSIGHTS_DATA.prefix, { timeRange });
    return analyticsCache.cacheWrapper(key, fetchFunction, CACHE_CONFIGS.INSIGHTS_DATA.ttl);
  },

  // Cache basic stats
  cacheBasicStats: async (fetchFunction) => {
    const key = analyticsCache.generateKey(CACHE_CONFIGS.BASIC_STATS.prefix);
    return analyticsCache.cacheWrapper(key, fetchFunction, CACHE_CONFIGS.BASIC_STATS.ttl);
  },

  // Invalidate related caches (useful when data changes)
  invalidateAnalyticsCache: () => {
    analyticsCache.clear();
  },

  // Get cache statistics
  getCacheStats: () => {
    return analyticsCache.getStats();
  }
};

module.exports = {
  analyticsCache,
  cacheHelpers,
  CACHE_CONFIGS
};