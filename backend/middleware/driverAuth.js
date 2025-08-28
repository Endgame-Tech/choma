const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

const driverAuth = async (req, res, next) => {
  try {
    console.log('Driver auth middleware - checking authentication');
    
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    console.log('Token found, verifying...');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded, driver ID:', decoded.driverId);
    
    // Find driver by ID from token
    const driver = await Driver.findById(decoded.driverId).select('-password');
    
    if (!driver) {
      console.log('Driver not found in database for ID:', decoded.driverId);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - driver not found'
      });
    }

    console.log('Driver found:', { id: driver._id, accountStatus: driver.accountStatus });

    // Check if driver account is still approved
    if (driver.accountStatus !== 'approved') {
      console.log('Driver account not approved:', driver.accountStatus);
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

    console.log('Driver authentication successful');
    next();

  } catch (error) {
    console.error('Driver auth middleware error:', error);
    
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