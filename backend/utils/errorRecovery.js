const { logger } = require('../middleware/errorHandler');

/**
 * Retry mechanism for API calls and database operations
 */
class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.exponentialBase = options.exponentialBase || 2;
    this.jitter = options.jitter !== false;
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Log successful retry
        if (attempt > 1) {
          logger.info('Retry successful', {
            attempt,
            context,
            totalAttempts: attempt
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (this.shouldNotRetry(error)) {
          logger.warn('Non-retryable error encountered', {
            error: error.message,
            context,
            attempt
          });
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === this.maxRetries) {
          logger.error('All retry attempts failed', {
            error: error.message,
            context,
            totalAttempts: attempt
          });
          break;
        }
        
        // Calculate delay
        const delay = this.calculateDelay(attempt);
        
        logger.warn('Retrying operation', {
          error: error.message,
          context,
          attempt,
          nextRetryIn: delay,
          maxRetries: this.maxRetries
        });
        
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Determine if error should not be retried
   */
  shouldNotRetry(error) {
    // Don't retry client errors (4xx) except for specific cases
    if (error.statusCode >= 400 && error.statusCode < 500) {
      // Retry these client errors
      const retryableClientErrors = [408, 429];
      return !retryableClientErrors.includes(error.statusCode);
    }
    
    // Don't retry authentication/authorization errors
    if (error.code === 'AUTHENTICATION_ERROR' || error.code === 'AUTHORIZATION_ERROR') {
      return true;
    }
    
    // Don't retry validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return true;
    }
    
    // Don't retry MongoDB duplicate key errors
    if (error.code === 11000) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.exponentialBase, attempt - 1);
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay += Math.random() * delay * 0.1;
    }
    
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Promise-based delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker for external service calls
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 30000;
    this.monitoringPeriod = options.monitoringPeriod || 60000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.requestCount = 0;
    
    // Reset counters periodically
    setInterval(() => {
      this.requestCount = 0;
      this.successCount = 0;
    }, this.monitoringPeriod);
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, context = {}) {
    this.requestCount++;
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        const error = new Error('Circuit breaker is OPEN');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        error.statusCode = 503;
        throw error;
      } else {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN', { context });
      }
    }
    
    try {
      const result = await fn();
      
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(error, context);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess(context) {
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.info('Circuit breaker reset to CLOSED', { context });
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error, context) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened', {
        context,
        failureCount: this.failureCount,
        error: error.message
      });
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Fallback mechanism for failed operations
 */
class FallbackManager {
  constructor() {
    this.fallbacks = new Map();
  }

  /**
   * Register a fallback function for a specific operation
   */
  register(operationName, fallbackFn) {
    this.fallbacks.set(operationName, fallbackFn);
  }

  /**
   * Execute operation with fallback
   */
  async executeWithFallback(operationName, primaryFn, context = {}) {
    try {
      return await primaryFn();
    } catch (error) {
      logger.warn('Primary operation failed, attempting fallback', {
        operation: operationName,
        error: error.message,
        context
      });
      
      const fallbackFn = this.fallbacks.get(operationName);
      
      if (!fallbackFn) {
        logger.error('No fallback registered for operation', {
          operation: operationName,
          context
        });
        throw error;
      }
      
      try {
        const result = await fallbackFn(error, context);
        
        logger.info('Fallback executed successfully', {
          operation: operationName,
          context
        });
        
        return result;
      } catch (fallbackError) {
        logger.error('Fallback also failed', {
          operation: operationName,
          primaryError: error.message,
          fallbackError: fallbackError.message,
          context
        });
        
        throw error; // Throw original error
      }
    }
  }
}

/**
 * Timeout wrapper for operations
 */
const withTimeout = (fn, timeoutMs = 30000) => {
  return async (...args) => {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`Operation timed out after ${timeoutMs}ms`);
        error.code = 'OPERATION_TIMEOUT';
        error.statusCode = 408;
        reject(error);
      }, timeoutMs);

      try {
        const result = await fn(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  };
};

/**
 * Database connection retry mechanism
 */
const retryDatabaseConnection = async (connectFn, options = {}) => {
  const retryManager = new RetryManager({
    maxRetries: options.maxRetries || 5,
    baseDelay: options.baseDelay || 2000,
    maxDelay: options.maxDelay || 30000
  });

  return retryManager.execute(connectFn, { operation: 'database_connection' });
};

/**
 * External API call with retry and circuit breaker
 */
const createResilientApiCall = (apiName, options = {}) => {
  const retryManager = new RetryManager(options.retry);
  const circuitBreaker = new CircuitBreaker(options.circuitBreaker);
  const fallbackManager = new FallbackManager();

  // Register fallbacks if provided
  if (options.fallbacks) {
    Object.entries(options.fallbacks).forEach(([operation, fallbackFn]) => {
      fallbackManager.register(operation, fallbackFn);
    });
  }

  return {
    async execute(operation, fn, context = {}) {
      const enrichedContext = { ...context, api: apiName, operation };
      
      return circuitBreaker.execute(async () => {
        return retryManager.execute(fn, enrichedContext);
      }, enrichedContext);
    },

    async executeWithFallback(operation, fn, context = {}) {
      const enrichedContext = { ...context, api: apiName, operation };
      
      return fallbackManager.executeWithFallback(
        `${apiName}.${operation}`,
        async () => {
          return circuitBreaker.execute(async () => {
            return retryManager.execute(fn, enrichedContext);
          }, enrichedContext);
        },
        enrichedContext
      );
    },

    getStatus() {
      return {
        api: apiName,
        circuitBreaker: circuitBreaker.getStatus()
      };
    },

    registerFallback(operation, fallbackFn) {
      fallbackManager.register(`${apiName}.${operation}`, fallbackFn);
    }
  };
};

// Pre-configured API clients
const paymentApiClient = createResilientApiCall('paystack', {
  retry: { maxRetries: 3, baseDelay: 1000 },
  circuitBreaker: { failureThreshold: 5, recoveryTimeout: 60000 },
  fallbacks: {
    'initialize': async (error, context) => {
      // Return cached payment data or default response
      return {
        success: false,
        message: 'Payment service temporarily unavailable',
        code: 'PAYMENT_SERVICE_DOWN',
        fallback: true
      };
    }
  }
});

const cloudinaryApiClient = createResilientApiCall('cloudinary', {
  retry: { maxRetries: 2, baseDelay: 2000 },
  circuitBreaker: { failureThreshold: 3, recoveryTimeout: 30000 },
  fallbacks: {
    'upload': async (error, context) => {
      // Return placeholder image URL
      return {
        url: '/api/images/placeholder.jpg',
        public_id: 'placeholder',
        fallback: true
      };
    }
  }
});

module.exports = {
  RetryManager,
  CircuitBreaker,
  FallbackManager,
  withTimeout,
  retryDatabaseConnection,
  createResilientApiCall,
  paymentApiClient,
  cloudinaryApiClient
};