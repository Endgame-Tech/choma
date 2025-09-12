const express = require('express');
const router = express.Router();
const unifiedSubscriptionController = require('../controllers/unifiedSubscriptionController');
const { authenticateAdmin } = require('../middleware/adminAuth');
const chefAuthMiddleware = require('../middleware/chefAuth');
const driverAuthMiddleware = require('../middleware/driverAuth');

// ============ ADMIN ROUTES ============
// Admin authentication required for these routes
router.use('/admin', authenticateAdmin);

/**
 * @route GET /api/unified-subscriptions/admin/next-deliveries
 * @desc Get comprehensive next delivery overview for admin dashboard
 * @access Admin
 * @query startDate, endDate, status, area, chefId, driverId, riskLevel, page, limit
 */
router.get('/admin/next-deliveries', unifiedSubscriptionController.getAdminNextDeliveryOverview);

/**
 * @route PUT /api/unified-subscriptions/admin/reassign-chef/:subscriptionId
 * @desc Reassign chef for specific subscription
 * @access Admin
 * @body { newChefId, reason }
 */
router.put('/admin/reassign-chef/:subscriptionId', unifiedSubscriptionController.reassignSubscriptionChef);

/**
 * @route PUT /api/unified-subscriptions/admin/bulk-update-schedules
 * @desc Bulk update delivery schedules
 * @access Admin
 * @body { updates: [{ subscriptionId, newDate, reason }] }
 */
router.put('/admin/bulk-update-schedules', unifiedSubscriptionController.bulkUpdateDeliverySchedules);

/**
 * @route GET /api/unified-subscriptions/admin/available-chefs
 * @desc Get available chefs for reassignment
 * @access Admin
 * @query area, date, skillLevel
 */
router.get('/admin/available-chefs', unifiedSubscriptionController.getAvailableChefs);

// ============ CHEF ROUTES ============
// Chef authentication required for these routes
router.use('/chef', chefAuthMiddleware);

/**
 * @route GET /api/unified-subscriptions/chef/next-assignments
 * @desc Get chef's next cooking assignments
 * @access Chef
 * @query days (default: 7)
 */
router.get('/chef/next-assignments', unifiedSubscriptionController.getChefNextAssignments);

/**
 * @route PUT /api/unified-subscriptions/chef/cooking-status/:deliveryId
 * @desc Update cooking status for delivery
 * @access Chef
 * @body { status, notes, estimatedReadyTime }
 */
router.put('/chef/cooking-status/:deliveryId', unifiedSubscriptionController.updateCookingStatus);

/**
 * @route POST /api/unified-subscriptions/chef/request-reassignment/:subscriptionId
 * @desc Request reassignment from customer
 * @access Chef
 * @body { reason }
 */
router.post('/chef/request-reassignment/:subscriptionId', unifiedSubscriptionController.requestChefReassignment);

// ============ DRIVER ROUTES ============
// Driver authentication required for these routes
router.use('/driver', driverAuthMiddleware);

/**
 * @route GET /api/unified-subscriptions/driver/next-deliveries
 * @desc Get driver's next delivery assignments
 * @access Driver
 * @query days (default: 7)
 */
router.get('/driver/next-deliveries', unifiedSubscriptionController.getDriverNextDeliveries);

/**
 * @route PUT /api/unified-subscriptions/driver/delivery-status/:deliveryId
 * @desc Update delivery status (pickup, out_for_delivery, delivered)
 * @access Driver
 * @body { status, notes, location, deliveryPhoto }
 */
router.put('/driver/delivery-status/:deliveryId', unifiedSubscriptionController.updateDeliveryStatus);

/**
 * @route GET /api/unified-subscriptions/driver/optimized-route
 * @desc Get route optimization for driver's deliveries
 * @access Driver
 * @query date (default: today)
 */
router.get('/driver/optimized-route', unifiedSubscriptionController.getOptimizedRoute);

// ============ SHARED ROUTES ============
// These routes can be accessed by any authenticated user (admin, chef, or driver)

/**
 * @route GET /api/unified-subscriptions/timeline/:subscriptionId
 * @desc Get subscription timeline for any role
 * @access Admin, Chef, Driver
 * @query days (default: 30)
 */
router.get('/timeline/:subscriptionId', (req, res, next) => {
  // Check if user is authenticated as any role
  if (req.user || req.chef || req.driver) {
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
}, unifiedSubscriptionController.getSubscriptionTimeline);

/**
 * @route GET /api/unified-subscriptions/statistics
 * @desc Get subscription statistics
 * @access Admin, Chef, Driver
 * @query role (admin, chef, driver)
 */
router.get('/statistics', (req, res, next) => {
  // Check if user is authenticated as any role
  if (req.user || req.chef || req.driver) {
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
}, unifiedSubscriptionController.getSubscriptionStatistics);

module.exports = router;