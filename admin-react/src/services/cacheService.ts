interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<unknown>>();
  private defaultTTL = 30000; // 30 seconds default

  /**
   * Set cache item with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + ttl
    });
  }

  /**
   * Get cache item if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if cache item exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear specific cache item
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    const items = Array.from(this.cache.values());
    const expired = items.filter(item => now > item.expires).length;
    
    return {
      total: this.cache.size,
      valid: this.cache.size - expired,
      expired
    };
  }

  /**
   * Start periodic cleanup of expired items
   */
  startPeriodicCleanup(intervalMs: number = 300000) { // 5 minutes default
    console.log('🧹 Starting cache cleanup service');
    
    setInterval(() => {
      const beforeSize = this.cache.size;
      this.cleanup();
      const afterSize = this.cache.size;
      const cleaned = beforeSize - afterSize;
      
      if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: removed ${cleaned} expired items`);
      }
    }, intervalMs);
  }

  /**
   * Get cache memory usage estimate (rough calculation)
   */
  getMemoryUsage() {
    let totalSize = 0;
    for (const [key, item] of this.cache.entries()) {
      // Rough estimate: key + timestamp + expires + JSON string of data
      totalSize += key.length * 2; // UTF-16 chars
      totalSize += 16; // timestamp + expires
      totalSize += JSON.stringify(item.data).length * 2;
    }
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / 1024 / 1024)
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache TTL constants (in milliseconds) - OPTIMIZED to reduce server load
export const CACHE_DURATIONS = {
  DASHBOARD_STATS: 300000,    // 5 minutes (was 30s) - reduced frequency for dashboard
  ANALYTICS: 600000,          // 10 minutes (was 1m) - analytics don't change rapidly
  USER_LIST: 180000,          // 3 minutes (was 45s) - user data is relatively stable
  MEAL_PLANS: 900000,         // 15 minutes (was 2m) - meal plans are static content
  CHEFS: 600000,              // 10 minutes (was 1m) - chef data changes infrequently
  ORDERS: 60000,              // 1 minute (was 15s) - balance between freshness and load
  SETTINGS: 1800000,          // 30 minutes (was 5m) - settings change very rarely
  NOTIFICATIONS: 60000,       // 1 minute (was 10s) - reduced with WebSocket fallback
} as const;

export default cacheService;