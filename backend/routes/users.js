const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const discountController = require('../controllers/discountController');
const auth = require('../middleware/auth');

// GET /api/users/:id/activity - Get user activity for discount calculation
router.get('/:userId/activity', discountController.getUserActivity);

// PUT /api/users/privacy-settings
router.put('/privacy-settings', auth, authController.updatePrivacySettings);

// POST /api/users/privacy-log
router.post('/privacy-log', auth, authController.logPrivacyAction);

module.exports = router;
