const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided or invalid format.",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's an admin token
      if (decoded.type !== "admin") {
        return res.status(401).json({
          success: false,
          error: "Invalid token type",
        });
      }

      // Find admin and check if active
      const admin = await Admin.findById(decoded.adminId).select(
        "-password -twoFactorSecret"
      );

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: "Admin not found",
        });
      }

      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          error: "Admin account is deactivated",
        });
      }

      // Check if account is locked
      if (admin.isLocked) {
        return res.status(423).json({
          success: false,
          error: "Admin account is temporarily locked",
        });
      }

      // Add admin info to request
      req.admin = {
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        firstName: admin.firstName,
        lastName: admin.lastName,
      };

      next();
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      } else if (tokenError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Invalid token",
        });
      } else {
        throw tokenError;
      }
    }
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Permission check middleware factory
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Super admins have all permissions
    if (req.admin.role === "super_admin") {
      return next();
    }

    // Check specific permission
    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${permission}`,
      });
    }

    next();
  };
};

// Role check middleware factory
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!roleArray.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient role. Required: ${roleArray.join(
          " or "
        )}, Current: ${req.admin.role}`,
      });
    }

    next();
  };
};

// Super admin only middleware
const requireSuperAdmin = requireRole("super_admin");

// Admin or higher middleware
const requireAdminOrHigher = requireRole(["super_admin", "admin"]);

// Manager or higher middleware
const requireManagerOrHigher = requireRole(["super_admin", "admin", "manager"]);

// Audit logging middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;

    // Override res.json to capture response
    res.json = function (data) {
      // Log the action after successful response
      if (req.admin && data.success !== false) {
        // Don't await this - log asynchronously
        setImmediate(async () => {
          try {
            const admin = await Admin.findById(req.admin.adminId);
            if (admin) {
              const auditData = {
                endpoint: req.originalUrl,
                method: req.method,
                params: req.params,
                query: req.query,
                // Don't log sensitive data like passwords
                body: req.body
                  ? Object.keys(req.body).reduce((acc, key) => {
                      if (
                        ![
                          "password",
                          "currentPassword",
                          "newPassword",
                        ].includes(key)
                      ) {
                        acc[key] = req.body[key];
                      }
                      return acc;
                    }, {})
                  : undefined,
              };

              admin.addAuditLog(action, auditData, req.ip);
              await admin.save();
            }
          } catch (error) {
            console.error("Audit logging error:", error);
          }
        });
      }

      // Call original res.json
      return originalJson.call(this, data);
    };

    next();
  };
};

// API key middleware for production
const requireApiKey = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const apiKey = req.header("X-API-Key");
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || !validApiKey) {
    return res.status(401).json({
      success: false,
      error: "API key required",
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: "Invalid API key",
    });
  }

  next();
};

// Rate limiting middleware for sensitive operations
const rateLimit = require("express-rate-limit");
const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each admin to 10 sensitive operations per windowMs
  message: {
    success: false,
    error: "Too many sensitive operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default IP handling
  // skip: (req) => req.admin?.adminId !== undefined
});

module.exports = {
  authenticateAdmin,
  requirePermission,
  requireRole,
  requireSuperAdmin,
  requireAdminOrHigher,
  requireManagerOrHigher,
  auditLog,
  requireApiKey,
  sensitiveOperationLimiter,
};
