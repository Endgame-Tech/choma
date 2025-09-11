const monitoringService = require('../services/monitoringService');

/**
 * Enhanced Error Handling Middleware for Subscription Management
 * Provides comprehensive error logging, monitoring, and recovery
 */

/**
 * Async wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Subscription-specific error handler
 */
const subscriptionErrorHandler = (error, req, res, next) => {
  // Extract context information
  const context = {
    operation: getOperationFromRoute(req.route?.path, req.method),
    subscriptionId: req.params.subscriptionId,
    deliveryId: req.params.deliveryId,
    userId: req.user?.id || req.chef?.chefId || req.driver?.id,
    userRole: getUserRole(req),
    requestId: req.id || req.headers['x-request-id'],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
  };

  // Log error to monitoring service
  const errorId = monitoringService.logError(error, context);

  // Determine appropriate response based on error type
  const errorResponse = createErrorResponse(error, context, errorId);

  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Subscription Error Details:', {
      errorId,
      message: error.message,
      stack: error.stack,
      context
    });
  }

  res.status(errorResponse.statusCode).json(errorResponse.body);
};

/**
 * Determine operation type from route
 */
function getOperationFromRoute(path, method) {
  if (!path) return 'unknown';

  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('next-deliveries')) return 'next_delivery_overview';
  if (pathLower.includes('reassign-chef')) return 'chef_reassignment';
  if (pathLower.includes('bulk-update')) return 'bulk_schedule_update';
  if (pathLower.includes('cooking-status')) return 'cooking_status_update';
  if (pathLower.includes('delivery-status')) return 'delivery_status_update';
  if (pathLower.includes('next-assignments')) return 'chef_assignments';
  if (pathLower.includes('optimized-route')) return 'route_optimization';
  if (pathLower.includes('timeline')) return 'subscription_timeline';
  if (pathLower.includes('statistics')) return 'subscription_statistics';

  if (method === 'POST' && pathLower.includes('subscription')) return 'subscription_creation';
  if (method === 'PUT' && pathLower.includes('subscription')) return 'subscription_update';
  if (method === 'DELETE' && pathLower.includes('subscription')) return 'subscription_deletion';
  if (method === 'GET' && pathLower.includes('subscription')) return 'subscription_retrieval';

  return `${method.toLowerCase()}_${pathLower.replace(/[^a-z]/g, '_')}`;
}

/**
 * Determine user role from request
 */
function getUserRole(req) {
  if (req.admin || req.user?.role === 'admin') return 'admin';
  if (req.chef || req.user?.role === 'chef') return 'chef';
  if (req.driver || req.user?.role === 'driver') return 'driver';
  if (req.user) return 'user';
  return 'anonymous';
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credit_card', 'ssn'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Limit size to prevent huge logs
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > 1000) {
    return '[BODY_TOO_LARGE]';
  }

  return sanitized;
}

/**
 * Create appropriate error response
 */
function createErrorResponse(error, context, errorId) {
  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  // Parse known error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'MongoNetworkError' || error.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    code = 'SERVICE_UNAVAILABLE';
  } else if (error.message?.includes('not found')) {
    statusCode = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
    statusCode = 401;
    message = 'Authentication required';
    code = 'UNAUTHORIZED';
  } else if (error.message?.includes('forbidden') || error.message?.includes('permission')) {
    statusCode = 403;
    message = 'Insufficient permissions';
    code = 'FORBIDDEN';
  } else if (error.message?.includes('capacity') || error.message?.includes('limit')) {
    statusCode = 429;
    message = 'Service capacity exceeded';
    code = 'CAPACITY_EXCEEDED';
  }

  // Operation-specific error handling
  const operationSpecificResponse = getOperationSpecificResponse(error, context);
  if (operationSpecificResponse) {
    statusCode = operationSpecificResponse.statusCode;
    message = operationSpecificResponse.message;
    code = operationSpecificResponse.code;
  }

  // Build response body
  const responseBody = {
    success: false,
    error: {
      code,
      message,
      errorId,
      timestamp: new Date().toISOString()
    }
  };

  // Add additional context for certain errors
  if (context.operation && ['chef_reassignment', 'delivery_status_update'].includes(context.operation)) {
    responseBody.error.context = {
      operation: context.operation,
      subscriptionId: context.subscriptionId,
      deliveryId: context.deliveryId
    };
  }

  // Add retry information for recoverable errors
  if (isRecoverableError(error, context)) {
    responseBody.error.recoverable = true;
    responseBody.error.retryAfter = getRetryDelay(context);
  }

  // Include development details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseBody.error.details = error.message;
    responseBody.error.stack = error.stack;
  }

  return { statusCode, body: responseBody };
}

/**
 * Get operation-specific error responses
 */
function getOperationSpecificResponse(error, context) {
  const { operation } = context;

  switch (operation) {
    case 'chef_reassignment':
      if (error.message?.includes('capacity')) {
        return {
          statusCode: 409,
          message: 'Chef at capacity. Please select another chef or try again later.',
          code: 'CHEF_CAPACITY_EXCEEDED'
        };
      }
      if (error.message?.includes('not found')) {
        return {
          statusCode: 404,
          message: 'Chef or subscription not found',
          code: 'CHEF_OR_SUBSCRIPTION_NOT_FOUND'
        };
      }
      break;

    case 'delivery_status_update':
      if (error.message?.includes('invalid status')) {
        return {
          statusCode: 400,
          message: 'Invalid delivery status transition',
          code: 'INVALID_STATUS_TRANSITION'
        };
      }
      break;

    case 'route_optimization':
      if (error.message?.includes('no deliveries')) {
        return {
          statusCode: 404,
          message: 'No deliveries found for route optimization',
          code: 'NO_DELIVERIES_FOR_ROUTE'
        };
      }
      break;

    case 'next_delivery_overview':
      if (error.message?.includes('too many')) {
        return {
          statusCode: 429,
          message: 'Too many deliveries requested. Please reduce the date range.',
          code: 'TOO_MANY_DELIVERIES'
        };
      }
      break;
  }

  return null;
}

/**
 * Determine if an error is recoverable
 */
function isRecoverableError(error, context) {
  // Network errors are usually recoverable
  if (error.name === 'MongoNetworkError' || error.message?.includes('ECONNREFUSED')) {
    return true;
  }

  // Capacity errors are recoverable
  if (error.message?.includes('capacity') || error.message?.includes('limit')) {
    return true;
  }

  // Temporary service issues
  if (error.message?.includes('timeout') || error.message?.includes('temporarily')) {
    return true;
  }

  // Operation-specific recoverable errors
  if (context.operation === 'chef_reassignment' && error.message?.includes('capacity')) {
    return true;
  }

  return false;
}

/**
 * Get retry delay in seconds
 */
function getRetryDelay(context) {
  const { operation } = context;

  switch (operation) {
    case 'chef_reassignment':
    case 'delivery_status_update':
      return 30; // 30 seconds

    case 'route_optimization':
      return 60; // 1 minute

    case 'next_delivery_overview':
      return 10; // 10 seconds

    default:
      return 60; // Default 1 minute
  }
}

/**
 * Rate limiting error handler
 */
const rateLimitErrorHandler = (req, res, next) => {
  const error = new Error('Too many requests');
  error.statusCode = 429;
  
  const context = {
    operation: 'rate_limit_exceeded',
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  const errorId = monitoringService.logError(error, context);

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      errorId,
      retryAfter: 60,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Validation error handler specifically for subscription data
 */
const validationErrorHandler = (errors) => {
  const context = {
    operation: 'validation_error',
    validationErrors: errors
  };

  const error = new Error('Validation failed');
  const errorId = monitoringService.logError(error, context);

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errorId,
      details: errors,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Success response wrapper with monitoring
 */
const successResponse = (data, operation, context = {}) => {
  // Log successful operations for monitoring
  if (operation && ['chef_reassignment', 'delivery_creation', 'status_update'].includes(operation)) {
    console.log(`✅ Successful ${operation}:`, {
      operation,
      timestamp: new Date().toISOString(),
      context
    });
  }

  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Not found handler for subscription routes
 */
const notFoundHandler = (req, res) => {
  const context = {
    operation: 'route_not_found',
    url: req.originalUrl,
    method: req.method
  };

  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  const errorId = monitoringService.logError(error, context);

  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found',
      errorId,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  asyncHandler,
  subscriptionErrorHandler,
  rateLimitErrorHandler,
  validationErrorHandler,
  successResponse,
  notFoundHandler
};