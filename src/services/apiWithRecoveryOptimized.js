import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../utils/constants";

/**
 * Enhanced API service with error recovery mechanisms and optimized polling
 */
class APIService {
  constructor() {
    this.baseURL = API_CONFIG.API_BASE_URL;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    this.cache = new Map();
    this.offlineQueue = [];
    this.isOnline = true;

    // Circuit breaker state
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      threshold: 5,
      resetTimeout: 60000,
      state: "CLOSED", // CLOSED, OPEN, HALF_OPEN
    };

    this.setupNetworkMonitoring();
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    // This would be implemented with NetInfo in a real app
    // For now, we'll simulate it
    this.checkNetworkStatus();

    // Check network status periodically (OPTIMIZED: reduced frequency to reduce server load)
    setInterval(() => {
      this.checkNetworkStatus();
    }, 15000); // Check every 15 seconds instead of 5
  }

  /**
   * Check network connectivity
   */
  async checkNetworkStatus() {
    try {
      // Simple ping to check connectivity
      const response = await fetch(`${this.baseURL}/health`, {
        method: "GET",
        timeout: 5000,
      });

      this.isOnline = response.ok;

      if (this.isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    } catch (error) {
      this.isOnline = false;
    }
  }

  /**
   * Process queued requests when back online
   */
  async processOfflineQueue() {
    console.log(`Processing ${this.offlineQueue.length} queued requests`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const queuedRequest of queue) {
      try {
        const result = await this.executeRequest(queuedRequest.config);
        queuedRequest.resolve(result);
      } catch (error) {
        queuedRequest.reject(error);
      }
    }
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker() {
    const { state, failures, threshold, lastFailureTime, resetTimeout } =
      this.circuitBreaker;

    if (state === "OPEN") {
      if (Date.now() - lastFailureTime > resetTimeout) {
        this.circuitBreaker.state = "HALF_OPEN";
        console.log("Circuit breaker: OPEN -> HALF_OPEN");
      } else {
        throw new Error(
          "Circuit breaker is OPEN - service temporarily unavailable"
        );
      }
    }
  }

  /**
   * Record circuit breaker failure
   */
  recordFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = "OPEN";
      console.log("Circuit breaker: CLOSED -> OPEN");
    }
  }

  /**
   * Record circuit breaker success
   */
  recordSuccess() {
    if (this.circuitBreaker.state === "HALF_OPEN") {
      this.circuitBreaker.state = "CLOSED";
      console.log("Circuit breaker: HALF_OPEN -> CLOSED");
    }
    this.circuitBreaker.failures = 0;
  }

  /**
   * Generate cache key
   */
  getCacheKey(url, method, data) {
    return `${method}:${url}:${JSON.stringify(data || {})}`;
  }

  /**
   * Get cached response (OPTIMIZED: extended cache durations)
   */
  getCachedResponse(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Set cached response (OPTIMIZED: longer default TTL)
   */
  setCachedResponse(cacheKey, data, ttl = 600000) {
    // 10 minutes default instead of 5
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get authentication headers
   */
  async getAuthHeaders() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return {};
    }
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retry(fn, attempts = this.retryAttempts, delay = this.retryDelay) {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1 || !this.shouldRetry(error)) {
        throw error;
      }

      console.log(
        `Retrying request in ${delay}ms (${attempts - 1} attempts remaining)`
      );
      await this.delay(delay);
      return this.retry(fn, attempts - 1, delay * 2);
    }
  }

  /**
   * Determine if request should be retried
   */
  shouldRetry(error) {
    // Don't retry for client errors (except specific cases)
    if (error.status >= 400 && error.status < 500) {
      return [408, 429, 502, 503, 504].includes(error.status);
    }

    // Retry for network errors and server errors
    return (
      error.status >= 500 ||
      error.name === "TypeError" ||
      error.name === "NetworkError"
    );
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute HTTP request with all recovery mechanisms
   */
  async executeRequest({
    url,
    method = "GET",
    data = null,
    headers = {},
    cache = false,
    ttl,
  }) {
    // Check circuit breaker
    this.checkCircuitBreaker();

    // Check cache for GET requests
    if (method === "GET" && cache) {
      const cacheKey = this.getCacheKey(url, method, data);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log("Returning cached response for:", url);
        return cachedResponse;
      }
    }

    const authHeaders = await this.getAuthHeaders();
    const requestHeaders = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    };

    const config = {
      method,
      headers: requestHeaders,
      timeout: this.timeout,
    };

    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await this.retry(async () => {
        const res = await fetch(`${this.baseURL}${url}`, config);

        if (!res.ok) {
          const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
          error.status = res.status;
          error.response = res;
          throw error;
        }

        return res.json();
      });

      // Record success for circuit breaker
      this.recordSuccess();

      // Cache successful GET responses
      if (method === "GET" && cache) {
        const cacheKey = this.getCacheKey(url, method, data);
        this.setCachedResponse(cacheKey, response, ttl);
      }

      return response;
    } catch (error) {
      // Record failure for circuit breaker
      this.recordFailure();

      console.error("Request failed:", error);
      throw this.enhanceError(error, { url, method, data });
    }
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, context) {
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.context = context;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.isNetworkError = !this.isOnline;
    enhancedError.circuitBreakerState = this.circuitBreaker.state;
    return enhancedError;
  }

  /**
   * Main request method with offline support
   */
  async request(url, options = {}) {
    const config = {
      url,
      method: "GET",
      cache: false,
      ...options,
    };

    // If offline and it's a GET request, try cache first
    if (!this.isOnline && config.method === "GET") {
      const cacheKey = this.getCacheKey(config.url, config.method, config.data);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log("Returning cached response (offline):", url);
        return cachedResponse;
      }
    }

    // If offline and not cacheable, queue the request
    if (!this.isOnline) {
      return new Promise((resolve, reject) => {
        this.offlineQueue.push({ config, resolve, reject });
        console.log("Request queued for when online:", url);
      });
    }

    return this.executeRequest(config);
  }

  // Convenience methods
  async get(url, options = {}) {
    return this.request(url, { ...options, method: "GET" });
  }

  async post(url, data, options = {}) {
    return this.request(url, { ...options, method: "POST", data });
  }

  async put(url, data, options = {}) {
    return this.request(url, { ...options, method: "PUT", data });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: "DELETE" });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      circuitBreaker: this.circuitBreaker,
      cacheSize: this.cache.size,
      queueSize: this.offlineQueue.length,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      threshold: 5,
      resetTimeout: 60000,
      state: "CLOSED",
    };
  }
}

// Create singleton instance
const apiService = new APIService();

// Enhanced API methods with specific configurations (OPTIMIZED: longer cache TTLs)
export const api = {
  // Authentication
  auth: {
    login: (credentials) => apiService.post("/auth/login", credentials),
    signup: (userData) => apiService.post("/auth/signup", userData),
    logout: () => apiService.post("/auth/logout"),
    getProfile: () =>
      apiService.get("/auth/profile", { cache: true, ttl: 600000 }), // 10 min cache
    updateProfile: (data) => apiService.put("/auth/profile", data),
  },

  // Meal plans (OPTIMIZED: longer cache for static content)
  mealPlans: {
    getAll: () => apiService.get("/mealplans", { cache: true, ttl: 1800000 }), // 30 min cache
    getById: (id) =>
      apiService.get(`/mealplans/${id}`, { cache: true, ttl: 900000 }), // 15 min cache
    getPopular: () =>
      apiService.get("/mealplans/popular", { cache: true, ttl: 1800000 }), // 30 min cache
  },

  // Orders
  orders: {
    getAll: () => apiService.get("/orders"),
    getById: (id) => apiService.get(`/orders/${id}`),
    create: (orderData) => apiService.post("/orders", orderData),
    cancel: (id) => apiService.put(`/orders/${id}/cancel`),
  },

  // Subscriptions
  subscriptions: {
    getAll: () => apiService.get("/subscriptions"),
    getById: (id) => apiService.get(`/subscriptions/${id}`),
    create: (subscriptionData) =>
      apiService.post("/subscriptions", subscriptionData),
    update: (id, data) => apiService.put(`/subscriptions/${id}`, data),
  },

  // Payments
  payments: {
    initialize: (paymentData) =>
      apiService.post("/payments/initialize", paymentData),
    verify: (reference) => apiService.get(`/payments/verify/${reference}`),
    getHistory: () =>
      apiService.get("/payments/history", { cache: true, ttl: 600000 }), // 10 min cache
  },

  // Notifications
  notifications: {
    getAll: () => apiService.get("/notifications"),
    markAsRead: (id) => apiService.put(`/notifications/${id}/read`),
  },
};

// Export service instance for advanced usage
export { apiService };

// Export error types for error handling
export const API_ERRORS = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  CIRCUIT_BREAKER_OPEN: "CIRCUIT_BREAKER_OPEN",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
};

export default api;
