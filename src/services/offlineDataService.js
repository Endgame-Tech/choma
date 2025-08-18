import apiService from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineDataService {
  constructor() {
    this.cachePrefix = 'offline_cache_';
    this.defaultTTL = 3600000; // 1 hour
    this.cacheTTLs = {
      mealPlans: 3600000, // 1 hour
      userProfile: 1800000, // 30 minutes
      orders: 900000, // 15 minutes
      dashboard: 300000, // 5 minutes
      notifications: 300000, // 5 minutes
    };
  }

  async cacheData(key, data, customTTL = null) {
    try {
      const ttl = customTTL || this.cacheTTLs[key] || this.defaultTTL;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
        key,
      };
      
      await AsyncStorage.setItem(`${this.cachePrefix}${key}`, JSON.stringify(cacheItem));
      console.log(`📦 Cached ${key} data (TTL: ${ttl}ms)`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData(key) {
    try {
      const cachedItem = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      if (!cachedItem) return null;
      
      const { data, timestamp, ttl } = JSON.parse(cachedItem);
      const now = Date.now();
      
      if (now - timestamp > ttl) {
        await this.clearCache(key);
        console.log(`🗑️  Expired cache cleared for ${key}`);
        return null;
      }
      
      console.log(`📖 Retrieved cached ${key} data`);
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  async clearCache(key) {
    try {
      await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
      console.log(`🗑️  Cache cleared for ${key}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️  All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Meal Plans with offline support
  async getMealPlans(forceRefresh = false) {
    const cacheKey = 'mealPlans';
    
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true };
      }
    }
    
    try {
      const result = await apiService.getMealPlans();
      if (result.success) {
        await this.cacheData(cacheKey, result.data);
        return { ...result, fromCache: false };
      }
      
      // If API fails, return cached data as fallback
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      return { success: false, error: error.message };
    }
  }

  // User Profile with offline support
  async getUserProfile(forceRefresh = false) {
    const cacheKey = 'userProfile';
    
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true };
      }
    }
    
    try {
      const result = await apiService.getUserProfile();
      if (result.success) {
        await this.cacheData(cacheKey, result.data);
        return { ...result, fromCache: false };
      }
      
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      return { success: false, error: error.message };
    }
  }

  // User Orders with offline support
  async getUserOrders(forceRefresh = false) {
    const cacheKey = 'orders';
    
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true };
      }
    }
    
    try {
      const result = await apiService.getUserOrders();
      if (result.success) {
        await this.cacheData(cacheKey, result.data);
        return { ...result, fromCache: false };
      }
      
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      return { success: false, error: error.message };
    }
  }

  // Dashboard data with offline support
  async getDashboardData(forceRefresh = false) {
    const cacheKey = 'dashboard';
    
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true };
      }
    }
    
    try {
      const result = await apiService.getDashboardData();
      if (result.success) {
        await this.cacheData(cacheKey, result.data);
        return { ...result, fromCache: false };
      }
      
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      return { success: false, error: error.message };
    }
  }

  // Notifications with offline support
  async getNotifications(forceRefresh = false) {
    const cacheKey = 'notifications';
    
    if (!forceRefresh) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true };
      }
    }
    
    try {
      const result = await apiService.getUserNotifications();
      if (result.success) {
        await this.cacheData(cacheKey, result.data);
        return { ...result, fromCache: false };
      }
      
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData, fromCache: true, offline: true };
      }
      return { success: false, error: error.message };
    }
  }

  // Preload critical data
  async preloadCriticalData() {
    console.log('🔄 Preloading critical data...');
    
    const promises = [
      this.getMealPlans(),
      this.getUserProfile(),
      this.getUserOrders(),
      this.getDashboardData(),
      this.getNotifications(),
    ];
    
    try {
      await Promise.allSettled(promises);
      console.log('✅ Critical data preloaded');
    } catch (error) {
      console.error('Error preloading critical data:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.cachePrefix));
      
      const stats = {
        totalItems: cacheKeys.length,
        items: [],
        totalSize: 0,
      };
      
      for (const key of cacheKeys) {
        const cachedItem = await AsyncStorage.getItem(key);
        if (cachedItem) {
          const { timestamp, ttl, key: dataKey } = JSON.parse(cachedItem);
          const age = Date.now() - timestamp;
          const remaining = ttl - age;
          const size = new Blob([cachedItem]).size;
          
          stats.items.push({
            key: dataKey,
            age,
            remaining,
            expired: remaining <= 0,
            size,
          });
          
          stats.totalSize += size;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, items: [], totalSize: 0 };
    }
  }

  // Sync data when online
  async syncData() {
    console.log('🔄 Syncing data...');
    
    const syncPromises = [
      this.getMealPlans(true),
      this.getUserProfile(true),
      this.getUserOrders(true),
      this.getDashboardData(true),
      this.getNotifications(true),
    ];
    
    try {
      const results = await Promise.allSettled(syncPromises);
      console.log('✅ Data sync completed');
      return results;
    } catch (error) {
      console.error('Error syncing data:', error);
      throw error;
    }
  }
}

export default new OfflineDataService();