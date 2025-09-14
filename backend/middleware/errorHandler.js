const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// Logger configuration
const createLogger = () => {
  // Create logs directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, '../logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'http',
    format: logFormat,
    defaultMeta: { service: 'choma-backend' },
    transports: [
      // Error logs
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error'
      }),
      
      // Combined logs
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d'
      }),
      
      // HTTP access logs
      new DailyRotateFile({
        filename: path.join(logDir, 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'http'
      })
    ]
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'http'
    }));
  }

  return logger;
};

const logger = createLogger();

// Sentry configuration
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  const Tracing = require('@sentry/tracing');
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express(),
    ],
    beforeSend(event) {
      // Filter out operational errors in production
      if (process.env.NODE_ENV === 'production' && event.tags?.isOperational) {
        return null;
      }
      return event;
    }
  });
}

// Error response formatter
const formatErrorResponse = (err, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseResponse = {
    success: false,
    status: err.status || 'error',
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional fields based on error type
  if (err instanceof ValidationError && err.errors.length > 0) {
    baseResponse.errors = err.errors;
  }

  if (err.service) {
    baseResponse.service = err.service;
  }

  // Add debug information in development
  if (isDevelopment) {
    baseResponse.stack = err.stack;
    baseResponse.debug = {
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      name: err.name
    };
  }

  // Add request ID if available
  if (req.id) {
    baseResponse.requestId = req.id;
  }

  return baseResponse;
};

// Error logging function
const logError = (err, req, res) => {
  const errorInfo = {
    message: err.message,
    statusCode: err.statusCode,
    status: err.status,
    code: err.code,
    isOperational: err.isOperational,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };

  // Log based on severity
  if (err.statusCode >= 500) {
    logger.error('Server Error', errorInfo);
    
    // Send to Sentry for server errors
    if (Sentry && !err.isOperational) {
      Sentry.captureException(err, {
        tags: {
          component: 'error-handler',
          isOperational: err.isOperational
        },
        user: req.user ? { id: req.user.id } : undefined,
        extra: {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        }
      });
    }
  } else if (err.statusCode >= 400) {
    logger.warn('Client Error', errorInfo);
  } else {
    logger.info('Error Info', errorInfo);
  }
};

// MongoDB error handler
const handleMongoError = (err) => {
  if (err.name === 'CastError') {
    return new ValidationError(`Invalid ${err.path}: ${err.value}`);
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new ConflictError(`${field} already exists`);
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    return new ValidationError('Validation failed', errors);
  }
  
  return new DatabaseError('Database operation failed');
};

// JWT error handler
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  return new AuthenticationError('Authentication failed');
};

// Multer error handler
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large');
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files');
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }
  
  return new ValidationError('File upload error');
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.name === 'CastError' || err.name === 'ValidationError' || err.code === 11000) {
    error = handleMongoError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    error = handleMulterError(err);
  } else if (err.type === 'entity.too.large') {
    error = new ValidationError('Request payload too large');
  } else if (err.code === 'ECONNABORTED') {
    error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
  } else if (!error.statusCode) {
    error = new AppError('Internal server error', 500, 'INTERNAL_ERROR', false);
  }

  // Log the error
  logError(error, req, res);

  // Send error response
  const response = formatErrorResponse(error, req);
  res.status(error.statusCode || 500).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Unhandled promise rejection handler
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason.toString(),
      stack: reason.stack,
      promise
    });
    
    if (Sentry) {
      Sentry.captureException(reason);
    }
    
    // Graceful shutdown
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    process.exit(1);
  });
};

// Uncaught exception handler
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      message: err.message,
      stack: err.stack
    });
    
    if (Sentry) {
      Sentry.captureException(err);
    }
    
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    process.exit(1);
  });
};

// Request ID middleware
const requestId = (req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Enhanced request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.http('Incoming Request', {
    id: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    logger.http('Request Completed', {
      id: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  
  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  
  // Utilities
  logger,
  Sentry,
  handleUnhandledRejection,
  handleUncaughtException,
  formatErrorResponse,
  logError
};