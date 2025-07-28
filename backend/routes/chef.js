const express = require('express');
const router = express.Router();
const chefController = require('../controllers/chefController');
const chefAuth = require('../middleware/chefAuth');

// ============= AUTHENTICATION ROUTES =============
// POST /api/chef/register - Chef registration
router.post('/register', chefController.registerChef);

// POST /api/chef/login - Chef login
router.post('/login', chefController.loginChef);

// ============= PROTECTED ROUTES (require authentication) =============
// GET /api/chef/dashboard - Get chef dashboard data
router.get('/dashboard', chefAuth, chefController.getChefDashboard);

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