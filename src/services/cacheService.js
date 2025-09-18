// src/services/cacheService.js - Smart caching with stale-while-revalidate strategy
import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheConfig = {
      // Cache durations in milliseconds
      dashboard: 5 * 60 * 1000,     // 5 minutes
      mealPlans: 30 * 60 * 1000,    // 30 minutes
      mealPlanDetails: 20 * 60 * 1000, // 20 minutes for individual meal plan details
      tags: 60 * 60 * 1000,         // 1 hour
      userSubscriptions: 10 * 60 * 1000, // 10 minutes
      userOrders: 2 * 60 * 1000,    // 2 minutes (more frequently updated)
      banners: 15 * 60 * 1000,      // 15 minutes
      userProfile: 30 * 60 * 1000,  // 30 minutes
      notifications: 5 * 60 * 1000, // 5 minutes
      authUser: 24 * 60 * 60 * 1000, // 24 hours for optimistic auth loading
      discountData: 15 * 60 * 1000, // 15 minutes for discount calculations
      profileStats: 10 * 60 * 1000, // 10 minutes for user stats
      profileSubscriptions: 5 * 60 * 1000, // 5 minutes for subscriptions
      profileActivity: 15 * 60 * 1000, // 15 minutes for user activity
      profileAchievements: 30 * 60 * 1000, // 30 minutes for achievements
    };
    
    this.maxMemoryCacheSize = 50; // Maximum items in memory cache
  }

  /**
   * Generate cache key with prefix
   */
  getCacheKey(type, userId = 'anonymous', additionalParams = '') {
    return `cache_${type}_${userId}${additionalParams ? `_${additionalParams}` : ''}`;
  }

  /**
   * Check if cached data is still valid
   */
  isValid(cachedItem, type) {
    if (!cachedItem || !cachedItem.timestamp) {
      return false;
    }
    
    const maxAge = this.cacheConfig[type] || 5 * 60 * 1000; // Default 5 minutes
    const age = Date.now() - cachedItem.timestamp;
    return age < maxAge;
  }

  /**
   * Check if data is stale but usable (for stale-while-revalidate)
   */
  isStale(cachedItem, type) {
    if (!cachedItem || !cachedItem.timestamp) {
      return true;
    }
    
    const maxAge = this.cacheConfig[type] || 5 * 60 * 1000;
    const staleAge = maxAge * 0.8; // Consider stale at 80% of max age
    const age = Date.now() - cachedItem.timestamp;
    return age > staleAge;
  }

  /**
   * Get data from cache (memory first, then AsyncStorage)
   */
  async get(type, userId = 'anonymous', additionalParams = '') {
    const key = this.getCacheKey(type, userId, additionalParams);
    
    try {
      // Check memory cache first (fastest)
      if (this.memoryCache.has(key)) {
        const memoryItem = this.memoryCache.get(key);
        if (this.isValid(memoryItem, type)) {
          console.log(`📋 Cache HIT (memory): ${type}`);
          return {
            data: memoryItem.data,
            isStale: this.isStale(memoryItem, type),
            source: 'memory'
          };
        } else {
          // Remove invalid memory cache
          this.memoryCache.delete(key);
        }
      }

      // Check AsyncStorage cache
      const asyncStorageData = await AsyncStorage.getItem(key);
      if (asyncStorageData) {
        const cachedItem = JSON.parse(asyncStorageData);
        if (this.isValid(cachedItem, type)) {
          console.log(`📋 Cache HIT (storage): ${type}`);
          
          // Add to memory cache for faster future access
          this.addToMemoryCache(key, cachedItem);
          
          return {
            data: cachedItem.data,
            isStale: this.isStale(cachedItem, type),
            source: 'storage'
          };
        } else {
          // Remove invalid storage cache
          await AsyncStorage.removeItem(key);
        }
      }

      console.log(`📋 Cache MISS: ${type}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache get error for ${type}:`, error);
      return null;
    }
  }

  /**
   * Store data in cache (both memory and AsyncStorage)
   */
  async set(type, data, userId = 'anonymous', additionalParams = '') {
    const key = this.getCacheKey(type, userId, additionalParams);
    const cacheItem = {
      data,
      timestamp: Date.now(),
      type
    };

    try {
      // Store in AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      
      // Store in memory cache
      this.addToMemoryCache(key, cacheItem);
      
      console.log(`📋 Cache SET: ${type} (${JSON.stringify(data).length} bytes)`);
    } catch (error) {
      console.error(`❌ Cache set error for ${type}:`, error);
    }
  }

  /**
   * Add item to memory cache with size management
   */
  addToMemoryCache(key, item) {
    // If cache is full, remove oldest item
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, item);
  }

  /**
   * Clear specific cache type
   */
  async clear(type, userId = 'anonymous') {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const typeKeys = keys.filter(key => 
        key.startsWith(`cache_${type}_${userId}`)
      );
      
      if (typeKeys.length > 0) {
        await AsyncStorage.multiRemove(typeKeys);
        
        // Clear from memory cache too
        for (const key of typeKeys) {
          this.memoryCache.delete(key);
        }
        
        console.log(`📋 Cache CLEARED: ${type} (${typeKeys.length} items)`);
      }
    } catch (error) {
      console.error(`❌ Cache clear error for ${type}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      this.memoryCache.clear();
      
      console.log(`📋 Cache CLEARED ALL: ${cacheKeys.length} items`);
    } catch (error) {
      console.error(`❌ Cache clear all error:`, error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let removedCount = 0;
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const cachedItem = JSON.parse(data);
          const type = cachedItem.type || 'default';
          
          if (!this.isValid(cachedItem, type)) {
            await AsyncStorage.removeItem(key);
            this.memoryCache.delete(key);
            removedCount++;
          }
        }
      }
      
      console.log(`📋 Cache cleanup: removed ${removedCount} expired items`);
    } catch (error) {
      console.error(`❌ Cache cleanup error:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      const stats = {
        totalItems: cacheKeys.length,
        memoryItems: this.memoryCache.size,
        types: {}
      };
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const cachedItem = JSON.parse(data);
          const type = cachedItem.type || 'unknown';
          
          if (!stats.types[type]) {
            stats.types[type] = {
              count: 0,
              valid: 0,
              stale: 0
            };
          }
          
          stats.types[type].count++;
          
          if (this.isValid(cachedItem, type)) {
            stats.types[type].valid++;
            if (this.isStale(cachedItem, type)) {
              stats.types[type].stale++;
            }
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error(`❌ Cache stats error:`, error);
      return { totalItems: 0, memoryItems: 0, types: {} };
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;