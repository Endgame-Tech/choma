const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

const driverAuth = async (req, res, next) => {
  try {
    
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find driver by ID from token
    const driver = await Driver.findById(decoded.driverId).select('-password');
    
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - driver not found'
      });
    }

    // Check if driver account is still approved
    if (driver.accountStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Account is ${driver.accountStatus}. Access denied.`
      });
    }

    // Update last active timestamp
    driver.lastActiveAt = new Date();
    await driver.save();

    // Add driver to request object
    req.driver = {
      id: driver._id,
      email: driver.email,
      driverId: driver.driverId,
      accountStatus: driver.accountStatus
    };

    next();

  } catch (error) {
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

module.exports = driverAuth;