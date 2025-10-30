const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminMealController = require("../controllers/adminMealController");
const adminMealPlanController = require("../controllers/adminMealPlanController");
const adminOrderController = require("../controllers/adminOrderController");
const advancedAnalyticsController = require("../controllers/advancedAnalyticsController");
const assignmentController = require("../controllers/assignmentController");
const adminManagementController = require("../controllers/adminManagementController");

// Import auth middleware
const { authenticateAdmin } = require("../middleware/adminAuth");
const { validateApiKey } = require("../middleware/security");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

// ============= HEALTH CHECK ROUTE (NO AUTH REQUIRED) =============
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "admin-api",
    version: "1.0.0",
  });
});

// Apply admin authentication to all routes except health check
router.use(authenticateAdmin);

// ============= DASHBOARD ROUTES =============
router.get(
  "/dashboard/stats",
  cacheMiddleware.dashboardStats,
  (req, res, next) => {
    console.log("🎯 Dashboard stats route hit!");
    next();
  },
  adminController.getDashboardStats
);

// ============= USER ANALYTICS ROUTES =============
router.get("/analytics/users/:id", adminController.getUserAnalytics);
router.get("/analytics/engagement", adminController.getEngagementAnalytics);

// ============= ADVANCED ANALYTICS ROUTES =============
router.get(
  "/analytics/kpis",
  cacheMiddleware.medium,
  advancedAnalyticsController.getKPIData
);
router.get(
  "/analytics/charts",
  cacheMiddleware.medium,
  advancedAnalyticsController.getChartsData
);
router.get(
  "/analytics/insights",
  cacheMiddleware.medium,
  advancedAnalyticsController.getInsightsData
);
router.get(
  "/analytics/chart/:chartId",
  cacheMiddleware.medium,
  advancedAnalyticsController.getChartData
);
router.post("/analytics/export", advancedAnalyticsController.exportReport);
router.get(
  "/analytics/user-engagement",
  advancedAnalyticsController.getUserEngagementMetrics
);
router.get(
  "/analytics/business-intelligence",
  advancedAnalyticsController.getBusinessIntelligence
);

// ============= USER MANAGEMENT ROUTES =============
router.get("/users", cacheMiddleware.medium, adminController.getAllUsers);
router.get(
  "/users/stats",
  cacheMiddleware.medium,
  adminController.getUserStats
);
router.put("/users/:id/status", adminController.updateUserStatus);

// ============= DRIVER MANAGEMENT ROUTES =============
const adminDriverController = require("../controllers/adminDriverController");

router.get(
  "/drivers",
  cacheMiddleware.medium,
  adminDriverController.getDrivers
);
router.get("/drivers/:id", adminDriverController.getDriver);
router.put("/drivers/:id/status", adminDriverController.updateDriverStatus);
router.delete("/drivers/:id", adminDriverController.deleteDriver);
router.get(
  "/drivers/:id/assignments",
  adminDriverController.getDriverAssignments
);
router.post("/assignments", adminDriverController.createDriverAssignment);
router.get(
  "/delivery-stats",
  cacheMiddleware.long,
  adminDriverController.getDeliveryStats
);
router.get("/export/users", adminController.exportUsers);

// ============= ORDER MANAGEMENT ROUTES =============
router.get("/orders", adminOrderController.getAllOrders);
router.get(
  "/orders/delivery-ready",
  adminOrderController.getDeliveryReadyOrders
); // NEW: Orders ready for driver assignment
router.get("/orders/:id", adminOrderController.getOrderDetails);
router.put("/orders/:id/status", adminOrderController.updateOrderStatus);
router.put("/orders/bulk/status", adminOrderController.bulkUpdateOrderStatus);
router.put("/orders/:id", adminOrderController.updateOrder);
router.put("/orders/bulk", adminOrderController.bulkUpdateOrders);
router.put("/orders/:id/cancel", adminOrderController.cancelOrder);
router.get("/orders/analytics", adminOrderController.getOrderAnalytics);

// ============= ORDER ASSIGNMENT ROUTES (NEW) =============
router.get(
  "/delegation/available-chefs/:orderId",
  assignmentController.getAvailableChefsForOrder
);
router.post(
  "/delegation/assign/:orderId/:chefId",
  assignmentController.assignOrderToChef
);
router.post(
  "/delegation/auto-assign/:orderId",
  assignmentController.autoAssignOrder
);
router.put(
  "/delegation/reassign/:orderId/:newChefId",
  assignmentController.reassignOrder
);
router.get("/delegation/history", assignmentController.getDelegationHistory);

// ============= PAYMENT MANAGEMENT ROUTES =============
router.get("/payments", adminController.getAllPayments);

// ============= SUBSCRIPTION MANAGEMENT ROUTES =============
router.get("/subscriptions", adminController.getAllSubscriptions);

// ============= CHEF MANAGEMENT ROUTES =============
router.get("/chefs", adminController.getAllChefs);
router.get("/chefs/stats", adminController.getChefStats);

// ============= CHEF WORKLOAD MANAGEMENT ROUTES =============
// Chef workload and assignment management (must come before /chefs/:id)
router.get(
  "/chefs/workload",
  cacheMiddleware.chefWorkload,
  require("../controllers/chefWorkloadController").getChefWorkloads
);
router.get(
  "/chefs/reassignment-requests",
  cacheMiddleware.short,
  require("../controllers/chefWorkloadController").getReassignmentRequests
);
router.post(
  "/chefs/assign",
  require("../controllers/chefWorkloadController").assignChef
);
router.post(
  "/chefs/reassignment-requests/:requestId/:action",
  require("../controllers/chefWorkloadController").handleReassignmentRequest
);

router.get("/chefs/:id", adminController.getChefDetails);
router.put("/chefs/:id/status", adminController.updateChefStatus);
router.put("/chefs/:id/approve", adminController.approveChef);
router.put("/chefs/:id/reject", adminController.rejectChef);
router.get("/chefs/pending/count", adminController.getPendingChefsCount);
router.post("/chefs/:id/notify", adminController.notifyChef);

// ============= CHEF PAYOUT ROUTES =============
const adminChefController = require("../controllers/adminChefController");
router.post("/chefs/payouts/process", adminChefController.processWeeklyPayouts);
router.get("/chefs/payouts/summary", adminChefController.getPayoutSummary);
router.get("/chefs/:chefId/earnings", adminChefController.getChefEarningsAdmin);

// ============= ENHANCED MEAL PLAN MANAGEMENT ROUTES =============
router.get("/mealplans", adminMealController.getAllMealPlans);
router.get("/mealplans/:id", adminMealController.getMealPlanDetails);
router.post("/mealplans", adminMealController.createMealPlan);
router.put("/mealplans/:id", adminMealController.updateMealPlan);
router.delete("/mealplans/:id", adminMealController.deleteMealPlan);

// Discount management related routes
router.get("/meal-plans/list", adminMealController.getMealPlanListForAdmin);
router.get("/meal-plans/categories", adminMealController.getMealPlanCategories);

// ============= DAILY MEAL MANAGEMENT ROUTES =============
router.get("/dailymeals", adminMealController.getAllDailyMeals);
router.get(
  "/mealplans/:id/dailymeals",
  adminMealController.getDailyMealsForPlan
);
router.put("/dailymeals/:id", adminMealController.updateDailyMeal);
router.delete("/dailymeals/:id", adminMealController.deleteDailyMeal);

// Enhanced meal plan features
router.post(
  "/mealplans/:id/duplicate",
  adminMealPlanController.duplicateMealPlan
);
router.get(
  "/mealplans/analytics/overview",
  adminMealController.getMealPlanAnalytics
);
router.get("/mealplans/export/data", adminMealController.exportMealPlanData);
router.post(
  "/mealplans/bulk/template",
  adminMealController.createMealPlanFromTemplate
);

// ============= NEW MODULAR MEAL MANAGEMENT SYSTEM =============
// Individual Meals Management
router.get("/meals", adminMealController.getAllMeals);
// Specific routes must come before parameterized routes
router.delete("/meals/duplicates", adminMealController.deleteDuplicateMeals);
router.get("/meals/:id", adminMealController.getMealDetails);
router.post("/meals", adminMealController.createMeal);
router.put("/meals/:id", adminMealController.updateMeal);
router.delete("/meals/:id", adminMealController.deleteMeal);
router.put(
  "/meals/:id/availability",
  adminMealController.toggleMealAvailability
);

// New Meal Plans Management (with publishing system)
router.get("/meal-plans", adminMealPlanController.getAllMealPlans);
router.get("/meal-plans/:id", adminMealPlanController.getMealPlanDetails);
router.post("/meal-plans", adminMealPlanController.createMealPlan);
router.put("/meal-plans/:id", adminMealPlanController.updateMealPlan);
router.delete("/meal-plans/:id", adminMealPlanController.deleteMealPlan);
router.put("/meal-plans/:id/publish", adminMealPlanController.publishMealPlan);
router.put(
  "/meal-plans/:id/unpublish",
  adminMealPlanController.unpublishMealPlan
);
router.post(
  "/meal-plans/:id/duplicate",
  adminMealPlanController.duplicateMealPlan
);

// Meal Assignment System
router.get(
  "/meal-plans/:id/assignments",
  adminMealController.getMealPlanAssignments
);
router.post(
  "/meal-plans/:id/assign-meal",
  adminMealController.assignMealToPlan
);
router.put(
  "/meal-plans/:id/assignments/:assignmentId",
  adminMealController.updateMealAssignment
);
router.delete(
  "/meal-plans/:id/assignments/:assignmentId",
  adminMealController.removeMealAssignment
);
router.get("/meal-plans/:id/schedule", adminMealController.getMealPlanSchedule);

// Bulk operations
router.post("/meals/bulk", adminMealController.bulkCreateMeals);
router.put(
  "/meals/bulk/availability",
  adminMealController.bulkUpdateMealAvailability
);

// ============= UTILITY ROUTES =============
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Enhanced Admin API is healthy",
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "GET /dashboard/stats",
      "GET /analytics/users/:id",
      "GET /analytics/engagement",
      "GET /users",
      "PUT /users/:id/status",
      "GET /export/users",
      "GET /orders",
      "PUT /orders/:id/status",
      "GET /payments",
      "GET /subscriptions",
      "GET /mealplans",
      "GET /mealplans/:id",
      "POST /mealplans",
      "PUT /mealplans/:id",
      "DELETE /mealplans/:id",
      "POST /mealplans/:id/duplicate",
      "GET /mealplans/analytics/overview",
      "GET /mealplans/export/data",
      "POST /mealplans/bulk/template",
      "GET /dailymeals",
      "POST /dailymeals",
    ],
  });
});

router.get("/test-connection", async (req, res) => {
  try {
    const mongoose = require("mongoose");

    if (mongoose.connection.readyState === 1) {
      res.json({
        success: true,
        message: "Database connection is healthy",
        status: "connected",
        database: mongoose.connection.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Database not connected",
        status: "disconnected",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection test failed",
      error: error.message,
    });
  }
});

// Utility endpoint to fix chef capacity issues
router.post(
  "/chefs/recalculate-capacity",
  adminOrderController.recalculateChefCapacities
);

// ============= ADMIN MANAGEMENT ROUTES =============
router.get("/admins", adminManagementController.getAllAdmins);
router.get("/admins/:id", adminManagementController.getAdmin);
router.post("/admins", adminManagementController.createAdmin);
router.put("/admins/:id", adminManagementController.updateAdmin);
router.delete("/admins/:id", adminManagementController.deleteAdmin);
router.put(
  "/admins/:id/toggle-status",
  adminManagementController.toggleAdminStatus
);
router.get("/roles/predefined", adminManagementController.getPredefinedRoles);

// ============= ACTIVITY LOGGING ROUTES =============
router.get("/activity-logs", adminManagementController.getActivityLogs);

// Get user activity for dashboard
router.get("/activity", adminController.getUserActivityForDashboard);

// ============= SECURITY ALERTS ROUTES =============
router.get("/security-alerts", adminManagementController.getSecurityAlerts);
router.put(
  "/security-alerts/:id/resolve",
  adminManagementController.resolveSecurityAlert
);

// ============= ADMIN NOTIFICATION ROUTES =============
// Import admin notification routes
router.use("/notifications", require("./adminNotifications"));

// ============= TWO-FACTOR AUTHENTICATION ROUTES =============
// Import 2FA routes
router.use("/2fa", require("./twoFactor"));

// ============= PROMO BANNERS ROUTES =============
// Import banner routes (admin endpoints)
router.use("/banners", require("./banners"));

// ============= RECURRING DELIVERY ANALYTICS ROUTES =============
// Analytics endpoints for the admin dashboard components
router.get(
  "/analytics/subscription-metrics",
  cacheMiddleware.medium,
  require("../controllers/recurringDeliveryAnalyticsController")
    .getSubscriptionMetrics
);
router.get(
  "/analytics/meal-plan-popularity",
  cacheMiddleware.medium,
  require("../controllers/recurringDeliveryAnalyticsController")
    .getMealPlanPopularity
);
router.get(
  "/analytics/chef-performance",
  cacheMiddleware.medium,
  require("../controllers/recurringDeliveryAnalyticsController")
    .getChefPerformance
);
router.get(
  "/analytics/subscription-trends",
  cacheMiddleware.medium,
  require("../controllers/recurringDeliveryAnalyticsController")
    .getSubscriptionTrends
);

// ============= RECURRING DELIVERY MONITORING ROUTES =============
// Live delivery monitoring endpoints
router.get(
  "/deliveries/monitor",
  cacheMiddleware.short,
  require("../controllers/recurringDeliveryMonitoringController")
    .getLiveDeliveries
);
router.get(
  "/deliveries/stats",
  cacheMiddleware.short,
  require("../controllers/recurringDeliveryMonitoringController")
    .getDeliveryStats
);

// ============= EMAIL SERVICE TESTING ROUTES =============
// Test email service connectivity and functionality
router.post("/email/test", async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: "Test email address is required",
      });
    }

    // Import email service
    const emailService = require("../services/emailService");

    // Test email service functionality
    const testResults = await emailService.testEmailService(testEmail);

    res.json({
      success: true,
      message: "Email service test completed",
      results: testResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Email service test failed:", error);
    res.status(500).json({
      success: false,
      message: "Email service test failed",
      error: error.message,
    });
  }
});

// Test specific email template
router.post("/email/test-template", async (req, res) => {
  try {
    const {
      testEmail,
      templateType = "verification",
      testData = {},
    } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: "Test email address is required",
      });
    }

    const emailService = require("../services/emailService");
    let result = false;

    // Test different email templates
    switch (templateType) {
      case "verification":
        result = await emailService.sendVerificationEmail({
          email: testEmail,
          verificationCode: "123456",
          purpose: "chef_registration",
        });
        break;
      case "acceptance":
        result = await emailService.sendChefAcceptanceEmail({
          chefName: testData.chefName || "Test Chef",
          chefEmail: testEmail,
        });
        break;
      case "test":
      default:
        result = await emailService.sendTestEmail(testEmail);
        break;
    }

    res.json({
      success: result,
      message: result
        ? `${templateType} email sent successfully`
        : `Failed to send ${templateType} email`,
      templateType,
      testEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Email template test failed:`, error);
    res.status(500).json({
      success: false,
      message: "Email template test failed",
      error: error.message,
    });
  }
});

module.exports = router;
