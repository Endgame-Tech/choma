// src/services/rateLimitService.js - Global rate limiting service
class RateLimitService {
  constructor() {
    this.requestCounts = new Map(); // Track requests per endpoint
    this.backoffDelays = new Map(); // Track backoff delays per endpoint
    this.lastRequests = new Map(); // Track last request times

    // Configuration
    this.maxRequestsPerMinute = 60;
    this.baseBackoffDelay = 1000; // 1 second
    this.maxBackoffDelay = 30000; // 30 seconds
    this.backoffMultiplier = 2;
    this.cooldownPeriod = 60000; // 1 minute
  }

  // Get a unique key for the endpoint and user
  getEndpointKey(endpoint, userId = "anonymous") {
    return `${userId}:${endpoint}`;
  }

  // Check if a request should be rate limited
  shouldRateLimit(endpoint, userId) {
    const key = this.getEndpointKey(endpoint, userId);
    const now = Date.now();

    // Clean up old entries
    this.cleanup();

    // Check if we're in a backoff period
    const backoffDelay = this.backoffDelays.get(key) || 0;
    const lastRequest = this.lastRequests.get(key) || 0;

    if (backoffDelay > 0 && now - lastRequest < backoffDelay) {
      const remainingDelay = backoffDelay - (now - lastRequest);
      return {
        shouldLimit: true,
        remainingDelay: remainingDelay,
        reason: "backoff",
      };
    }

    // Check request count in the current minute
    const requestCount = this.requestCounts.get(key) || 0;
    if (requestCount >= this.maxRequestsPerMinute) {
      return {
        shouldLimit: true,
        remainingDelay: this.cooldownPeriod,
        reason: "quota_exceeded",
      };
    }

    return { shouldLimit: false };
  }

  // Record a successful request
  recordRequest(endpoint, userId) {
    const key = this.getEndpointKey(endpoint, userId);
    const now = Date.now();

    // Update request count
    const currentCount = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, currentCount + 1);

    // Update last request time
    this.lastRequests.set(key, now);

    // Reset backoff delay on successful request
    this.backoffDelays.delete(key);

  }

  // Record a failed request (increases backoff)
  recordFailure(endpoint, userId, is429Error = false) {
    const key = this.getEndpointKey(endpoint, userId);
    const now = Date.now();

    // Calculate new backoff delay
    const currentBackoff = this.backoffDelays.get(key) || this.baseBackoffDelay;
    let newBackoff;

    if (is429Error) {
      // For 429 errors, use aggressive backoff
      newBackoff = Math.min(
        currentBackoff * this.backoffMultiplier,
        this.maxBackoffDelay
      );
    } else {
      // For other errors, use moderate backoff
      newBackoff = Math.min(currentBackoff * 1.5, this.maxBackoffDelay / 2);
    }

    this.backoffDelays.set(key, newBackoff);
    this.lastRequests.set(key, now);

    return {
      backoffDelay: newBackoff,
      nextAllowedTime: now + newBackoff,
    };
  }

  // Get the current delay for an endpoint
  getCurrentDelay(endpoint, userId) {
    const key = this.getEndpointKey(endpoint, userId);
    const backoffDelay = this.backoffDelays.get(key) || 0;
    const lastRequest = this.lastRequests.get(key) || 0;
    const now = Date.now();

    if (backoffDelay > 0 && now - lastRequest < backoffDelay) {
      return backoffDelay - (now - lastRequest);
    }

    return 0;
  }

  // Clean up old entries to prevent memory leaks
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.cooldownPeriod;

    for (const [key, timestamp] of this.lastRequests.entries()) {
      if (timestamp < cutoffTime) {
        this.requestCounts.delete(key);
        this.backoffDelays.delete(key);
        this.lastRequests.delete(key);
      }
    }
  }

  // Reset rate limiting for an endpoint
  reset(endpoint, userId) {
    const key = this.getEndpointKey(endpoint, userId);
    this.requestCounts.delete(key);
    this.backoffDelays.delete(key);
    this.lastRequests.delete(key);
  }

  // Get status for debugging
  getStatus() {
    return {
      totalEndpoints: this.requestCounts.size,
      activeBackoffs: Array.from(this.backoffDelays.entries()).map(
        ([key, delay]) => ({
          endpoint: key,
          delay: delay,
          remaining: Math.max(
            0,
            delay - (Date.now() - (this.lastRequests.get(key) || 0))
          ),
        })
      ),
      requestCounts: Array.from(this.requestCounts.entries()).map(
        ([key, count]) => ({
          endpoint: key,
          count: count,
        })
      ),
    };
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

export default rateLimitService;
