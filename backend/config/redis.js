const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    // Redis configuration for production scaling
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 60000, // 60 seconds
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          console.log(`Redis reconnect attempt ${retries}`);
          return Math.min(retries * 50, 500); // Max 500ms delay
        }
      },
      // Connection pool settings
      pool: {
        min: 2,
        max: 20
      }
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔄 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected and ready');
    });

    redisClient.on('end', () => {
      console.log('⚠️ Redis connection ended');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();
    
    return redisClient;
    
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    // Don't throw error - app should work without Redis
    return null;
  }
};

// Cache helper functions
const cacheService = {
  // Get cached data
  async get(key) {
    try {
      if (!redisClient || !redisClient.isReady) return null;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  // Set cached data with TTL
  async set(key, data, ttlSeconds = 300) {
    try {
      if (!redisClient || !redisClient.isReady) return false;
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },

  // Delete cached data
  async del(key) {
    try {
      if (!redisClient || !redisClient.isReady) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  },

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      if (!redisClient || !redisClient.isReady) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis clear pattern error:', error);
      return false;
    }
  },

  // Get Redis client for custom operations
  getClient() {
    return redisClient;
  }
};

module.exports = { connectRedis, cacheService };