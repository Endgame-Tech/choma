const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userSubscriptionController = require('../controllers/userSubscriptionController');
const emailVerificationController = require('../controllers/emailVerificationController');
const auth = require('../middleware/auth');
const { userValidations, notificationValidations } = require('../middleware/validation');

// POST /api/auth/signup
router.post('/signup', userValidations.register, authController.signup);

// POST /api/auth/login
router.post('/login', userValidations.login, authController.login);

// POST /api/auth/logout (protected route)
router.post('/logout', auth, authController.logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/activity/log (protected route) - Log user activity
router.post('/activity/log', auth, authController.logUserActivity);

// GET /api/auth/profile (protected route)
router.get('/profile', auth, authController.getProfile);

// GET /api/auth/profile/stats (protected route)
router.get('/profile/stats', auth, authController.getUserStats);

// GET /api/auth/profile/activity (protected route)
router.get('/profile/activity', auth, authController.getUserActivity);

// GET /api/auth/profile/achievements (protected route)
router.get('/profile/achievements', auth, authController.getUserAchievements);

// GET /api/auth/profile/notifications (protected route)
router.get('/profile/notifications', auth, authController.getNotificationPreferences);

// PUT /api/auth/profile/notifications (protected route)
router.put('/profile/notifications', auth, notificationValidations.preferences, authController.updateNotificationPreferences);

// PUT /api/auth/profile (protected route)
router.put('/profile', auth, userValidations.updateProfile, authController.updateProfile);

// DELETE /api/auth/account (protected route)
router.delete('/account', auth, authController.deleteAccount);

// GET /api/auth/dashboard (protected route) - Get personalized dashboard data
router.get('/dashboard', auth, userSubscriptionController.getUserDashboard);

// POST /api/auth/subscription/pause (protected route) - Pause subscription
router.post('/subscription/pause', auth, userSubscriptionController.pauseSubscription);

// POST /api/auth/subscription/resume (protected route) - Resume subscription
router.post('/subscription/resume', auth, userSubscriptionController.resumeSubscription);

// GET /api/auth/delivery/track/:orderId (protected route) - Track delivery
router.get('/delivery/track/:orderId', auth, userSubscriptionController.getDeliveryTracking);

// POST /api/auth/push-token (protected route) - Register push notification token
router.post('/push-token', auth, async (req, res) => {
  try {
    const { token, deviceId, platform } = req.body;
    
    if (!token || !deviceId || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Token, deviceId, and platform are required'
      });
    }
    
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(req.user.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await customer.addPushToken(token, deviceId, platform);
    
    res.json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
    console.error('Push token registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/auth/push-token (protected route) - Remove push notification token
router.delete('/push-token', auth, async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'DeviceId is required'
      });
    }
    
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(req.user.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await customer.removePushToken(deviceId);
    
    res.json({
      success: true,
      message: 'Push token removed successfully'
    });
  } catch (error) {
    console.error('Push token removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============= EMAIL VERIFICATION ROUTES =============

// POST /api/auth/send-verification - Send verification code to email
router.post('/send-verification', emailVerificationController.sendVerificationCode);

// POST /api/auth/verify-email - Verify email with code
router.post('/verify-email', emailVerificationController.verifyEmail);

// POST /api/auth/resend-verification - Resend verification code
router.post('/resend-verification', emailVerificationController.resendVerificationCode);

// GET /api/auth/verification-status/:email - Check verification status
router.get('/verification-status/:email', emailVerificationController.checkVerificationStatus);

// POST /api/auth/cleanup-verifications - Cleanup expired verifications (admin/cron)
router.post('/cleanup-verifications', emailVerificationController.cleanupExpiredVerifications);

// ============= BANK VERIFICATION ROUTES =============

// POST /api/auth/verify-bank-account - Verify bank account details
router.post('/verify-bank-account', authController.verifyBankAccount);

module.exports = router;
