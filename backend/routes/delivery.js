const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const auth = require('../middleware/auth');

// Middleware to check if user is driver (you can enhance this)
const isDriver = (req, res, next) => {
  // For now, we'll assume any authenticated user can access driver routes
  // In production, you should check user roles/permissions
  next();
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  // For now, we'll assume any authenticated user can access admin routes
  // In production, you should check user roles/permissions
  next();
};

// Public route - Get delivery tracking (no auth required for customer convenience)
router.get('/tracking/:trackingId', deliveryController.getDeliveryTracking);

// Protected customer routes
router.get('/my-deliveries', auth, deliveryController.getCustomerDeliveries);

// Protected driver routes
router.put('/driver/:driverId/location', auth, isDriver, deliveryController.updateDriverLocation);
router.put('/tracking/:trackingId/status', auth, isDriver, deliveryController.updateDeliveryStatus);

// Protected admin routes
router.post('/tracking', auth, isAdmin, deliveryController.createDeliveryTracking);
router.put('/tracking/:trackingId/assign', auth, isAdmin, deliveryController.assignDriver);
router.get('/drivers/available', auth, isAdmin, deliveryController.getAvailableDrivers);
router.get('/analytics', auth, isAdmin, deliveryController.getDeliveryAnalytics);

module.exports = router;
