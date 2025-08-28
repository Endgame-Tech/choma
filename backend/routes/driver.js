const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const {
  registerDriver,
  loginDriver,
  logoutDriver,
  verifyToken,
  getDriverProfile,
  updateDriverLocation,
  getAvailableAssignments,
  acceptAssignment,
  confirmPickup,
  confirmDelivery,
  getDeliveryHistory,
  getDailyStats,
  goOnline,
  goOffline
} = require('../controllers/driverController');

const driverAuth = require('../middleware/driverAuth');

// Validation middleware
const validateDriverRegistration = [
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .trim(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .isMobilePhone('en-NG')
    .withMessage('Please provide a valid Nigerian phone number'),
  body('licenseNumber')
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters')
    .trim(),
  body('vehicleInfo.type')
    .isIn(['motorcycle', 'bicycle', 'car', 'van'])
    .withMessage('Vehicle type must be motorcycle, bicycle, car, or van'),
  body('vehicleInfo.plateNumber')
    .isLength({ min: 3, max: 15 })
    .withMessage('Plate number must be between 3 and 15 characters')
    .trim()
];

const validateDriverLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateLocationUpdate = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

const validateConfirmationCode = [
  body('confirmationCode')
    .isLength({ min: 4, max: 10 })
    .withMessage('Confirmation code must be between 4 and 10 characters')
    .trim()
];

// @desc    Authentication Routes
// @access  Public
router.post('/auth/register', validateDriverRegistration, registerDriver);
router.post('/auth/login', validateDriverLogin, loginDriver);

// @desc    Protected Routes - Require Authentication
// @access  Private
router.use(driverAuth); // All routes below this line require authentication

// Auth management
router.post('/auth/logout', logoutDriver);
router.post('/auth/verify', verifyToken);

// Profile management
router.get('/profile', getDriverProfile);

// Location management
router.put('/location', validateLocationUpdate, updateDriverLocation);

// Status management
router.post('/status/online', goOnline);
router.post('/status/offline', goOffline);

// Assignment management
router.get('/assignments', getAvailableAssignments);
router.post('/assignments/:id/accept', 
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  acceptAssignment
);
router.put('/assignments/:id/pickup',
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  body('pickupNotes').optional().isLength({ max: 500 }).withMessage('Pickup notes too long'),
  confirmPickup
);
router.put('/assignments/:id/deliver',
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  validateConfirmationCode,
  body('deliveryNotes').optional().isLength({ max: 500 }).withMessage('Delivery notes too long'),
  confirmDelivery
);

// History and stats
router.get('/history',
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  getDeliveryHistory
);

router.get('/stats/daily',
  query('date').optional().isISO8601().withMessage('Date must be in ISO format'),
  getDailyStats
);

module.exports = router;