const express = require('express');
const router = express.Router();
const chefController = require('../controllers/chefController');
const chefAuth = require('../middleware/chefAuth');

// Import Paystack service for bank verification
const paystackService = require('../services/paystackService');

// ============= AUTHENTICATION ROUTES =============
// GET /api/chef/registration-status/:email - Check chef registration status
router.get('/registration-status/:email', chefController.getRegistrationStatus);

// POST /api/chef/register - Chef registration
router.post('/register', chefController.registerChef);

// POST /api/chef/login - Chef login
router.post('/login', chefController.loginChef);

// ============= PASSWORD RESET ROUTES =============
// POST /api/chef/forgot-password - Send password reset link
router.post('/forgot-password', chefController.forgotPassword);

// POST /api/chef/verify-reset-token - Verify password reset token
router.post('/verify-reset-token', chefController.verifyResetToken);

// POST /api/chef/reset-password - Reset password
router.post('/reset-password', chefController.resetPassword);

// ============= BANK VERIFICATION ROUTES =============
// GET /api/chef/banks - Get list of Nigerian banks
router.get('/banks', (req, res) => {
  try {
    const banks = paystackService.getBanksList();
    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks list'
    });
  }
});

// POST /api/chef/verify-bank-account - Verify bank account details
router.post('/verify-bank-account', async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    // Validate input
    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code are required'
      });
    }

    // Validate bank code
    if (!paystackService.isValidBankCode(bankCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bank code'
      });
    }

    // Verify account with Paystack
    const verification = await paystackService.verifyBankAccount(accountNumber, bankCode);

    if (verification.success) {
      res.json({
        success: true,
        message: 'Account verified successfully',
        data: verification.data
      });
    } else {
      res.status(422).json({
        success: false,
        message: verification.message || 'Account verification failed'
      });
    }
  } catch (error) {
    console.error('Bank verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Bank verification service temporarily unavailable'
    });
  }
});

// ============= PROTECTED ROUTES (require authentication) =============
// GET /api/chef/dashboard - Get chef dashboard data
router.get('/dashboard', chefAuth, chefController.getChefDashboard);

// GET /api/chef/dashboard/stats - Get chef dashboard stats
router.get('/dashboard/stats', chefAuth, chefController.getChefDashboardStats);

// GET /api/chef/profile - Get chef profile
router.get('/profile', chefAuth, chefController.getChefProfile);

// PUT /api/chef/profile - Update chef profile
router.put('/profile', chefAuth, chefController.updateChefProfile);

// PUT /api/chef/availability - Update chef availability
router.put('/availability', chefAuth, chefController.updateAvailability);

// GET /api/chef/analytics - Get chef analytics
router.get('/analytics', chefAuth, chefController.getChefAnalytics);

// ============= ORDER MANAGEMENT ROUTES =============
// GET /api/chef/orders - Get chef's orders
router.get('/orders', chefAuth, chefController.getChefOrders);

// PUT /api/chef/orders/:orderId/accept - Accept an order
router.put('/orders/:orderId/accept', chefAuth, chefController.acceptOrder);

// PUT /api/chef/orders/:orderId/start - Start working on an order
router.put('/orders/:orderId/start', chefAuth, chefController.startOrder);

// PUT /api/chef/orders/:orderId/complete - Complete an order
router.put('/orders/:orderId/complete', chefAuth, chefController.completeOrder);

// PUT /api/chef/orders/:orderId/reject - Reject an order
router.put('/orders/:orderId/reject', chefAuth, chefController.rejectOrder);

// PUT /api/chef/orders/:orderId/chef-status - Update chef cooking status
router.put('/orders/:orderId/chef-status', chefAuth, chefController.updateChefStatus);

// ============= NOTIFICATION ROUTES =============
// GET /api/chef/notifications - Get chef notifications
router.get('/notifications', chefAuth, chefController.getChefNotifications);

// PUT /api/chef/notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read', chefAuth, chefController.markNotificationAsRead);

module.exports = router;