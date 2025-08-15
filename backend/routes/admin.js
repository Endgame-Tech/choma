const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminOrderController = require('../controllers/adminOrderController');
const advancedAnalyticsController = require('../controllers/advancedAnalyticsController');
const assignmentController = require('../controllers/assignmentController');
const adminManagementController = require('../controllers/adminManagementController');

// Import auth middleware
const { authenticateAdmin } = require('../middleware/adminAuth');
const { validateApiKey } = require('../middleware/security');

// ============= HEALTH CHECK ROUTE (NO AUTH REQUIRED) =============
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'admin-api',
    version: '1.0.0'
  });
});

// Apply admin authentication to all routes except health check
router.use(authenticateAdmin);

// ============= DASHBOARD ROUTES =============
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============= USER ANALYTICS ROUTES =============
router.get('/analytics/users/:id', adminController.getUserAnalytics);
router.get('/analytics/engagement', adminController.getEngagementAnalytics);

// ============= ADVANCED ANALYTICS ROUTES =============
router.get('/analytics/kpis', advancedAnalyticsController.getKPIData);
router.get('/analytics/charts', advancedAnalyticsController.getChartsData);
router.get('/analytics/insights', advancedAnalyticsController.getInsightsData);
router.get('/analytics/chart/:chartId', advancedAnalyticsController.getChartData);
router.post('/analytics/export', advancedAnalyticsController.exportReport);
router.get('/analytics/user-engagement', advancedAnalyticsController.getUserEngagementMetrics);
router.get('/analytics/business-intelligence', advancedAnalyticsController.getBusinessIntelligence);

// ============= USER MANAGEMENT ROUTES =============
router.get('/users', adminController.getAllUsers);
router.get('/users/stats', adminController.getUserStats);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/export/users', adminController.exportUsers);

// ============= ORDER MANAGEMENT ROUTES =============
router.get('/orders', adminOrderController.getAllOrders);
router.get('/orders/:id', adminOrderController.getOrderDetails);
router.put('/orders/:id/status', adminOrderController.updateOrderStatus);
router.put('/orders/bulk/status', adminOrderController.bulkUpdateOrderStatus);
router.put('/orders/:id', adminOrderController.updateOrder);
router.put('/orders/bulk', adminOrderController.bulkUpdateOrders);
router.put('/orders/:id/cancel', adminOrderController.cancelOrder);
router.get('/orders/analytics', adminOrderController.getOrderAnalytics);

// ============= ORDER ASSIGNMENT ROUTES (NEW) =============
router.get('/delegation/available-chefs/:orderId', assignmentController.getAvailableChefsForOrder);
router.post('/delegation/assign/:orderId/:chefId', assignmentController.assignOrderToChef);
router.post('/delegation/auto-assign/:orderId', assignmentController.autoAssignOrder);
router.put('/delegation/reassign/:orderId/:newChefId', assignmentController.reassignOrder);
router.get('/delegation/history', assignmentController.getDelegationHistory);


// ============= PAYMENT MANAGEMENT ROUTES =============
router.get('/payments', adminController.getAllPayments);

// ============= SUBSCRIPTION MANAGEMENT ROUTES =============
router.get('/subscriptions', adminController.getAllSubscriptions);

// ============= CHEF MANAGEMENT ROUTES =============
router.get('/chefs', adminController.getAllChefs);
router.get('/chefs/stats', adminController.getChefStats);
router.get('/chefs/:id', adminController.getChefDetails);
router.put('/chefs/:id/status', adminController.updateChefStatus);
router.put('/chefs/:id/approve', adminController.approveChef);
router.put('/chefs/:id/reject', adminController.rejectChef);
router.get('/chefs/pending/count', adminController.getPendingChefsCount);
router.post('/chefs/:id/notify', adminController.notifyChef);



// ============= ENHANCED MEAL PLAN MANAGEMENT ROUTES =============
router.get('/mealplans', adminController.getAllMealPlans);
router.get('/mealplans/:id', adminController.getMealPlanDetails);
router.post('/mealplans', adminController.createMealPlan);
router.put('/mealplans/:id', adminController.updateMealPlan);
router.delete('/mealplans/:id', adminController.deleteMealPlan);

// ============= DAILY MEAL MANAGEMENT ROUTES =============
router.get('/dailymeals', adminController.getAllDailyMeals);
router.get('/mealplans/:id/dailymeals', adminController.getDailyMealsForPlan);
router.put('/dailymeals/:id', adminController.updateDailyMeal);
router.delete('/dailymeals/:id', adminController.deleteDailyMeal);

// Enhanced meal plan features
router.post('/mealplans/:id/duplicate', adminController.duplicateMealPlan);
router.get('/mealplans/analytics/overview', adminController.getMealPlanAnalytics);
router.get('/mealplans/export/data', adminController.exportMealPlanData);
router.post('/mealplans/bulk/template', adminController.createMealPlanFromTemplate);

// Enhanced meal plan routes for optimized processing (commented out until implemented)
// router.post('/mealplans/:mealPlanId/week', adminController.addWeeklyDataToMealPlan);
// router.post('/mealplans/chunked', adminController.createMealPlanChunked);

// ============= NEW MODULAR MEAL MANAGEMENT SYSTEM =============
// Individual Meals Management
router.get('/meals', adminController.getAllMeals);
router.get('/meals/:id', adminController.getMealDetails);
router.post('/meals', adminController.createMeal);
router.put('/meals/:id', adminController.updateMeal);
router.delete('/meals/:id', adminController.deleteMeal);
router.put('/meals/:id/availability', adminController.toggleMealAvailability);

// New Meal Plans Management (with publishing system)
router.get('/meal-plans', adminController.getAllMealPlansV2);
router.get('/meal-plans/:id', adminController.getMealPlanDetailsV2);
router.post('/meal-plans', adminController.createMealPlanV2);
router.put('/meal-plans/:id', adminController.updateMealPlanV2);
router.delete('/meal-plans/:id', adminController.deleteMealPlanV2);
router.put('/meal-plans/:id/publish', adminController.publishMealPlan);
router.put('/meal-plans/:id/unpublish', adminController.unpublishMealPlan);

// Meal Assignment System
router.get('/meal-plans/:id/assignments', adminController.getMealPlanAssignments);
router.post('/meal-plans/:id/assign-meal', adminController.assignMealToPlan);
router.put('/meal-plans/:id/assignments/:assignmentId', adminController.updateMealAssignment);
router.delete('/meal-plans/:id/assignments/:assignmentId', adminController.removeMealAssignment);
router.get('/meal-plans/:id/schedule', adminController.getMealPlanSchedule);

// Bulk operations
router.post('/meals/bulk', adminController.bulkCreateMeals);
router.put('/meals/bulk/availability', adminController.bulkUpdateMealAvailability);

// ============= UTILITY ROUTES =============
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Admin API is healthy',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /dashboard/stats',
      'GET /analytics/users/:id',
      'GET /analytics/engagement',
      'GET /users',
      'PUT /users/:id/status',
      'GET /export/users',
      'GET /orders',
      'PUT /orders/:id/status',
      'GET /payments',
      'GET /subscriptions',
      'GET /mealplans',
      'GET /mealplans/:id',
      'POST /mealplans',
      'PUT /mealplans/:id',
      'DELETE /mealplans/:id',
      'POST /mealplans/:id/duplicate',
      'GET /mealplans/analytics/overview',
      'GET /mealplans/export/data',
      'POST /mealplans/bulk/template',
      'GET /dailymeals',
      'POST /dailymeals'
    ]
  });
});

router.get('/test-connection', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState === 1) {
      res.json({
        success: true,
        message: 'Database connection is healthy',
        status: 'connected',
        database: mongoose.connection.name
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database not connected',
        status: 'disconnected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error.message
    });
  }
});

// Utility endpoint to fix chef capacity issues
router.post('/chefs/recalculate-capacity', adminOrderController.recalculateChefCapacities);

// ============= ADMIN MANAGEMENT ROUTES =============
router.get('/admins', adminManagementController.getAllAdmins);
router.get('/admins/:id', adminManagementController.getAdmin);
router.post('/admins', adminManagementController.createAdmin);
router.put('/admins/:id', adminManagementController.updateAdmin);
router.delete('/admins/:id', adminManagementController.deleteAdmin);
router.put('/admins/:id/toggle-status', adminManagementController.toggleAdminStatus);
router.get('/roles/predefined', adminManagementController.getPredefinedRoles);

// ============= ACTIVITY LOGGING ROUTES =============
router.get('/activity-logs', adminManagementController.getActivityLogs);

// ============= SECURITY ALERTS ROUTES =============
router.get('/security-alerts', adminManagementController.getSecurityAlerts);
router.put('/security-alerts/:id/resolve', adminManagementController.resolveSecurityAlert);

// ============= ADMIN NOTIFICATION ROUTES =============
// Import admin notification routes
router.use('/notifications', require('./adminNotifications'));

// ============= TWO-FACTOR AUTHENTICATION ROUTES =============
// Import 2FA routes
router.use('/2fa', require('./twoFactor'));

module.exports = router;