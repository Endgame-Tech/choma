require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

// Import security middleware
const {
  generalLimiter,
  authLimiter,
  adminLimiter,
  paymentLimiter,
  speedLimiter,
  helmet,
  cors,
  mongoSanitize,
  xss,
  hpp,
  sanitizeInput,
  enforceHTTPS,
  requestLogger: securityRequestLogger,
  errorHandler: securityErrorHandler
} = require('./middleware/security');

// Import enhanced error handling
const {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  logger,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/errorHandler');

// Import error recovery utilities
const { retryDatabaseConnection } = require('./utils/errorRecovery');

const app = express();

// Trust proxy configuration for production deployments
// More secure than 'true' - only trust first proxy (Render's load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy only (more secure)
} else {
  app.set('trust proxy', false); // No proxy in development
}

// Setup error handlers for unhandled errors
handleUnhandledRejection();
handleUncaughtException();

// Connect Database with retry mechanism
retryDatabaseConnection(connectDB)
  .then(() => logger.info('Database connected successfully'))
  .catch((error) => {
    logger.error('Failed to connect to database after retries:', error);
    process.exit(1);
  });

// Apply security middleware first
app.use(helmet); // Security headers
app.use(enforceHTTPS); // HTTPS enforcement in production
app.use(requestId); // Add request ID to all requests
app.use(requestLogger); // Enhanced request logging
app.use(generalLimiter); // General rate limiting
app.use(speedLimiter); // Slow down repeated requests
app.use(cors); // CORS with whitelist

// Apply input sanitization middleware
app.use(mongoSanitize); // Prevent NoSQL injection
app.use(xss); // Clean user input from malicious HTML
app.use(hpp); // Prevent HTTP Parameter Pollution
app.use(sanitizeInput); // Custom input sanitization

// Increase payload limits and timeout for meal plan creation with images
app.use(express.json({ 
  limit: '100mb',
  parameterLimit: 100000,
  extended: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb',
  parameterLimit: 100000
}));

// Set timeout for requests (10 minutes for very large uploads)
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  next();
});

// Enhanced logging middleware for large requests
app.use((req, res, next) => {
  const contentLength = req.get('content-length');
  if (contentLength && parseInt(contentLength) > 10000000) { // 10MB+
    console.log(`Large request detected: ${Math.round(contentLength / 1024 / 1024)}MB to ${req.path}`);
  }
  next();
});

// Legacy request logging is replaced by enhanced error handler logging

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'choma API is running',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes (with stricter rate limiting)
app.use('/api/auth', authLimiter, require('./routes/auth'));

// API routes (with general rate limiting)
app.use('/api/mealplans', require('./routes/mealplans'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

// Payment routes (with payment-specific rate limiting)
app.use('/api/payments', paymentLimiter, require('./routes/payments'));

// Admin routes (with admin-specific rate limiting)
app.use('/api/admin', adminLimiter, require('./routes/admin'));

// Chef routes (with general rate limiting)
app.use('/api/chef', require('./routes/chef'));

// Image upload routes (with general rate limiting)
app.use('/api/images', require('./routes/images'));

// Notifications routes
app.use('/api/notifications', require('./routes/notifications'));

// Search routes
app.use('/api/search', require('./routes/search'));

// Banners routes
app.use('/api/banners', require('./routes/banners'));

// Error reporting routes
app.use('/api/errors', require('./routes/errors'));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    code: err.code,
    status: err.status,
    type: err.type,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.code === 'ECONNABORTED' || err.type === 'request.aborted') {
    return res.status(408).json({
      success: false,
      message: 'Request timeout - please try again with smaller data or check your connection',
      error: 'REQUEST_TIMEOUT'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large - please use the optimized dashboard for large meal plans',
      error: 'PAYLOAD_TOO_LARGE',
      suggestion: 'Try the admin-dashboard-optimized.html for chunked uploads'
    });
  }

  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    return res.status(408).json({
      success: false,
      message: 'Request timeout - please try the optimized dashboard for large data',
      error: 'REQUEST_TIMEOUT'
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large',
      error: 'FILE_TOO_LARGE',
      maxSize: '100MB'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.message
    });
  }

  // Use enhanced error handler
  errorHandler(err, req, res, next);
});

// Handle 404 routes
app.use(notFoundHandler);

// The 404 handler is now handled by notFoundHandler middleware above

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0'; // Listen on all interfaces

app.listen(PORT, HOST, () => {
  // Get the local network IP address for easier mobile device connection
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = 'unknown';
    // Find the local IP address
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break; // Use the first non-internal IPv4 address we find
      }
    }
    if (localIp !== 'unknown') break; // Stop once we've found an IP
  }
  
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔗 Network API URL: http://${localIp}:${PORT}/api`);
  console.log(`✅ Server is listening on all interfaces (${HOST})`);
  console.log(`💻 For mobile devices, use: http://${localIp}:${PORT}/api`);
  console.log(`📱 Mobile connection test: http://${localIp}:${PORT}/health`);
});
