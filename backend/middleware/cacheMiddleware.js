const { cacheService } = require('../config/redis');

// Cache middleware factory
const cache = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `${req.originalUrl}_${JSON.stringify(req.query)}_${req.user?.id || 'anonymous'}`;
      
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        return res.json(cachedResponse);
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (data && data.success !== false && res.statusCode < 400) {
          cacheService.set(cacheKey, data, ttlSeconds);
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

// Cache key generators for specific endpoints
const keyGenerators = {
  // User-specific data
  userSpecific: (req) => `user:${req.user?.id}:${req.originalUrl}:${JSON.stringify(req.query)}`,
  
  // Public data (same for all users)
  public: (req) => `public:${req.originalUrl}:${JSON.stringify(req.query)}`,
  
  // Meal plans with filters
  mealPlans: (req) => {
    const { page = 1, limit = 20, search = '', status = '', targetAudience = '' } = req.query;
    return `meal-plans:${page}:${limit}:${search}:${status}:${targetAudience}`;
  },
  
  // Orders for specific user
  userOrders: (req) => {
    const { page = 1, limit = 20, status = '' } = req.query;
    return `user-orders:${req.user?.id}:${page}:${limit}:${status}`;
  },
  
  // Dashboard stats
  dashboardStats: (req) => `dashboard-stats:${req.user?.id}:${new Date().toDateString()}`
};

// Pre-configured cache middleware for common use cases
const cacheMiddleware = {
  // Short cache for frequently changing data
  short: cache(60), // 1 minute
  
  // Medium cache for moderately changing data  
  medium: cache(300, keyGenerators.public), // 5 minutes
  
  // Long cache for rarely changing data
  long: cache(3600, keyGenerators.public), // 1 hour
  
  // User-specific short cache
  userShort: cache(120, keyGenerators.userSpecific), // 2 minutes
  
  // User-specific medium cache
  userMedium: cache(600, keyGenerators.userSpecific), // 10 minutes
  
  // Meal plans cache
  mealPlans: cache(600, keyGenerators.mealPlans), // 10 minutes
  
  // User orders cache
  userOrders: cache(300, keyGenerators.userOrders), // 5 minutes
  
  // Dashboard stats cache
  dashboardStats: cache(300, keyGenerators.dashboardStats), // 5 minutes
  
  // Custom cache
  custom: cache
};

module.exports = { cacheMiddleware, cacheService };