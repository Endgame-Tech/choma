const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { cacheService } = require('../config/redis');

// Rate limiting configuration with Redis store for production scaling
const createRateLimiter = (windowMs, max, message, keyPrefix = 'rl') => {
  const config = {
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis store for distributed rate limiting in production
    store: process.env.NODE_ENV === 'production' && cacheService.getClient() ? 
      new RedisStore({
        client: cacheService.getClient(),
        prefix: keyPrefix + ':',
        resetExpiryOnChange: false,
      }) : undefined
  };
  
  return rateLimit(config);
};

// General rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 1000 : 10000, // Increased from 100 to 1000 for dashboard apps
  'Too many requests from this IP, please try again later.',
  'general'
);

// Auth rate limiting (stricter)
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 5 : 500, // Much higher limit for development
  'Too many authentication attempts, please try again later.',
  'auth'
);

// Admin rate limiting (more permissive in development)
const adminLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 500 : 10000, // Increased from 20 to 500 for admin dashboard
  'Too many admin requests, please try again later.',
  'admin'
);

// Payment rate limiting
const paymentLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // limit each IP to 10 payment requests per windowMs
  'Too many payment requests, please try again later.',
  'payment'
);

// Dashboard/Analytics rate limiting (very permissive for frequent polling)
const dashboardLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 2000 : 10000, // High limit for dashboard polling
  'Too many dashboard requests, please try again later.'
);

// File upload rate limiting
const uploadLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 50 : 1000, // Moderate limit for uploads
  'Too many upload requests, please try again later.'
);

// 2FA rate limiting (very permissive for setup/verification process)
const twoFactorLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 100 : 1000, // High limit for 2FA operations
  'Too many 2FA requests, please try again later.',
  '2fa'
);

// Slow down middleware for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: () => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // max delay of 5 seconds
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3004',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ];
    
    // In production, add your production domains from environment variables
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = [
        process.env.ADMIN_URL,
        process.env.CHEF_URL,
        process.env.DRIVER_URL,
        process.env.API_URL,
      ].filter(Boolean); // Remove any undefined values
      
      allowedOrigins.push(...productionOrigins);
      
      // Log for debugging
      console.log('CORS - Origin:', origin);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS - Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

// Security headers configuration
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "cloudinary.com", "*.cloudinary.com"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        sanitized[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  return sanitized;
};

// HTTPS enforcement middleware
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }
  
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    };
    
    // Log failed requests
    if (res.statusCode >= 400) {
      console.error('Request failed:', logData);
    }
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request:', logData);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Security middleware error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  adminLimiter,
  paymentLimiter,
  dashboardLimiter,
  uploadLimiter,
  twoFactorLimiter,
  speedLimiter,
  
  // Security middleware
  helmet: helmet(helmetOptions),
  cors: cors(corsOptions),
  mongoSanitize: mongoSanitize(),
  xss: xss(),
  hpp: hpp(),
  
  // Custom middleware
  sanitizeInput,
  enforceHTTPS,
  validateApiKey,
  requestLogger,
  errorHandler
};