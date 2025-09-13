require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

// Import security middleware
const {
  generalLimiter,
  authLimiter,
  adminLimiter,
  paymentLimiter,
  twoFactorLimiter,
  speedLimiter,
  helmet,
  cors,
  mongoSanitize,
  xss,
  hpp,
  sanitizeInput,
  enforceHTTPS,
  requestLogger: securityRequestLogger,
  errorHandler: securityErrorHandler,
} = require("./middleware/security");

// Import enhanced error handling
const {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  logger,
  handleUnhandledRejection,
  handleUncaughtException,
} = require("./middleware/errorHandler");

// Import error recovery utilities
const { retryDatabaseConnection } = require("./utils/errorRecovery");

const app = express();

// Trust proxy configuration for production deployments
// More secure than 'true' - only trust first proxy (Render's load balancer)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Trust first proxy only (more secure)
} else {
  app.set("trust proxy", false); // No proxy in development
}

// Setup error handlers for unhandled errors
handleUnhandledRejection();
handleUncaughtException();

// Connect Database with retry mechanism
retryDatabaseConnection(connectDB)
  .then(() => {
    logger.info("Database connected successfully");

    // Initialize Socket.IO service only after DB is connected
    const socketService = require("./services/socketService");
    socketService.initialize(server);

    // Initialize Driver Tracking WebSocket service
    const driverTrackingService = require("./services/driverTrackingWebSocketService");
    driverTrackingService.initialize(server);
    driverTrackingService.startHealthCheck();

    // Initialize Keep-Alive service only after DB is connected
    const keepAliveService = require("./services/keepAliveService");
    keepAliveService.start();

    server.listen(PORT, HOST, () => {
      // Get the local network IP address for easier mobile device connection
      const { networkInterfaces } = require("os");
      const nets = networkInterfaces();
      let localIp = "unknown";
      // Find the local IP address
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (loopback) addresses
          if (net.family === "IPv4" && !net.internal) {
            localIp = net.address;
            break; // Use the first non-internal IPv4 address we find
          }
        }
        if (localIp !== "unknown") break; // Stop once we've found an IP
      }

      console.log(`🚀 Server started on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔗 Network API URL: http://${localIp}:${PORT}/api`);
      console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/socket.io`);
      console.log(
        `🔌 Network WebSocket URL: ws://${localIp}:${PORT}/socket.io`
      );
      console.log(`✅ Server is listening on all interfaces (${HOST})`);
      console.log(`💻 For mobile devices, use: http://${localIp}:${PORT}/api`);
      console.log(
        `📱 Mobile connection test: http://${localIp}:${PORT}/health`
      );
    });
  })
  .catch((error) => {
    logger.error("Failed to connect to database after retries:", error);
    // Don't exit in production, let PM2 handle restart
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

// Connect Redis (non-blocking - app should work without Redis)
connectRedis()
  .then(() => logger.info("Redis connected successfully"))
  .catch((error) => {
    logger.warn(
      "Redis connection failed - app will continue without caching:",
      error.message
    );
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
app.use(
  express.json({
    limit: "100mb",
    parameterLimit: 100000,
    extended: true,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb",
    parameterLimit: 100000,
  })
);

// Set timeout for requests (10 minutes for very large uploads)
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  next();
});

// Enhanced logging middleware for large requests
app.use((req, res, next) => {
  const contentLength = req.get("content-length");
  if (contentLength && parseInt(contentLength) > 10000000) {
    // 10MB+
    console.log(
      `Large request detected: ${Math.round(
        contentLength / 1024 / 1024
      )}MB to ${req.path}`
    );
  }
  next();
});

// Legacy request logging is replaced by enhanced error handler logging

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "choma API is running",
    version: "1.0.1",
    status: "healthy",
  });
});

// Health check route
app.get("/health", (req, res) => {
  const keepAliveService = require("./services/keepAliveService");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    keepAlive: keepAliveService.getStatus(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: process.env.REDIS_URL ? "configured" : "not_configured",
  });
});

// Keep-alive ping endpoint (lightweight)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Auth routes (with stricter rate limiting)
app.use("/api/auth", authLimiter, require("./routes/auth"));

// Admin authentication routes (with admin-specific rate limiting)
app.use("/api/admin/auth", adminLimiter, require("./routes/adminAuth"));

// API routes (with general rate limiting)
app.use("/api/meal-plans", require("./routes/mealplans"));
app.use("/api/mealplans", require("./routes/mealplans"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/subscriptions", require("./routes/subscriptions"));

// Debug tracking routes (development/testing only)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/debug-tracking", require("./routes/debugTrackingRoute"));
}

// Unified subscription management routes (with general rate limiting)
app.use(
  "/api/unified-subscriptions",
  generalLimiter,
  require("./routes/unifiedSubscriptions")
);

// Payment routes (with payment-specific rate limiting)
app.use("/api/payments", paymentLimiter, require("./routes/payments"));

// Admin routes (with admin-specific rate limiting)
app.use("/api/admin", adminLimiter, require("./routes/admin"));

// Admin 2FA routes (with dedicated 2FA rate limiting)
app.use("/api/admin/2fa", twoFactorLimiter, require("./routes/twoFactor"));

// Admin notification routes (with admin-specific rate limiting)
app.use(
  "/api/admin/notifications",
  adminLimiter,
  require("./routes/adminNotifications")
);

// Admin delivery price routes (with admin-specific rate limiting)
app.use(
  "/api/admin/delivery-prices",
  adminLimiter,
  require("./routes/adminDeliveryPrice")
);

// Admin discount rule routes
app.use(
  "/api/admin/discount-rules",
  adminLimiter,
  require("./routes/discountRoutes")
);

// Public discount routes
app.use("/api/discount-rules", require("./routes/discounts"));
app.use("/api/discounts", require("./routes/discounts"));

// User routes
app.use("/api/users", require("./routes/users"));

// User delivery routes (with general rate limiting)
app.use("/api/delivery", require("./routes/delivery"));

// Chef routes (with general rate limiting)
app.use("/api/chef", require("./routes/chef"));

// Driver routes (with general rate limiting)
app.use("/api/driver", generalLimiter, require("./routes/driver"));

// Image upload routes (with general rate limiting)
app.use("/api/images", require("./routes/images"));

// Upload routes (with general rate limiting)
app.use("/api/upload", require("./routes/upload"));

// Notifications routes
app.use("/api/notifications", require("./routes/notifications"));

// Search routes
app.use("/api/search", require("./routes/search"));

// Banners routes
app.use("/api/banners", require("./routes/banners"));

// Maps routes (Google Maps proxy)
app.use("/api/maps", require("./routes/maps"));

// Error reporting routes
app.use("/api/errors", require("./routes/errors"));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    code: err.code,
    status: err.status,
    type: err.type,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  if (err.code === "ECONNABORTED" || err.type === "request.aborted") {
    return res.status(408).json({
      success: false,
      message:
        "Request timeout - please try again with smaller data or check your connection",
      error: "REQUEST_TIMEOUT",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message:
        "Request payload too large - please use the optimized dashboard for large meal plans",
      error: "PAYLOAD_TOO_LARGE",
      suggestion: "Try the admin-dashboard-optimized.html for chunked uploads",
    });
  }

  if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
    return res.status(408).json({
      success: false,
      message:
        "Request timeout - please try the optimized dashboard for large data",
      error: "REQUEST_TIMEOUT",
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File too large",
      error: "FILE_TOO_LARGE",
      maxSize: "100MB",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: err.message,
    });
  }

  // Use enhanced error handler
  errorHandler(err, req, res, next);
});

// Handle 404 routes
app.use(notFoundHandler);

// The 404 handler is now handled by notFoundHandler middleware above

const PORT = process.env.PORT || 5001;
const HOST = "0.0.0.0"; // Listen on all interfaces

// Create HTTP server for Socket.IO
const { createServer } = require("http");
const server = createServer(app);

// Socket.IO and Keep-Alive services are initialized after DB connection (see above)
