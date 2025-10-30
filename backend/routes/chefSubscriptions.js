const express = require("express");
const chefSubscriptionController = require("../controllers/chefSubscriptionController");
const chefAuth = require("../middleware/chefAuth");
const { body, param, query } = require("express-validator");
const { handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// Apply chef authentication to all routes
router.use(chefAuth);

/**
 * @route   GET /api/chef/subscriptions
 * @desc    Get chef's active subscription assignments
 * @access  Private (Chef only)
 */
router.get("/", (req, res) => chefSubscriptionController.getMySubscriptionAssignments(req, res));

/**
 * @route   GET /api/chef/subscriptions/weekly-plan
 * @desc    Get weekly meal planning view with batch opportunities
 * @access  Private (Chef only)
 */
router.get(
  "/weekly-plan",
  [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid ISO date"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.getWeeklyMealPlan(req, res)
);

/**
 * @route   GET /api/chef/subscriptions/:subscriptionId/timeline
 * @desc    Get subscription timeline and progression
 * @access  Private (Chef only)
 */
router.get(
  "/:subscriptionId/timeline",
  [param("subscriptionId").isMongoId().withMessage("Invalid subscription ID")],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.getSubscriptionTimeline(req, res)
);

/**
 * @route   PUT /api/chef/subscriptions/meal-status
 * @desc    Update meal assignment status (supports batch updates)
 * @access  Private (Chef only)
 */
router.put(
  "/meal-status",
  [
    body("assignmentIds")
      .isArray({ min: 1 })
      .withMessage("Assignment IDs array is required"),
    body("assignmentIds.*")
      .isMongoId()
      .withMessage("Invalid assignment ID format"),
    body("status")
      .isIn([
        "chef_assigned",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be a string with max 500 characters"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.updateMealStatus(req, res)
);

/**
 * @route   PUT /api/chef/subscriptions/:subscriptionId/daily-meals/update
 * @desc    Update all meals for a specific day in subscription
 * @access  Private (Chef only)
 */
router.put(
  "/:subscriptionId/daily-meals/update",
  [
    param("subscriptionId").isMongoId().withMessage("Invalid subscription ID"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("status")
      .isIn([
        "pending",
        "scheduled",
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "skipped",
      ])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be a string with max 500 characters"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.updateDailyMealsStatus(req, res)
);

/**
 * @route   PUT /api/chef/subscriptions/:subscriptionId/meal-type/update
 * @desc    Update status for a SPECIFIC meal type (breakfast/lunch/dinner) on a specific day
 * @access  Private (Chef only)
 */
router.put(
  "/:subscriptionId/meal-type/update",
  [
    param("subscriptionId").isMongoId().withMessage("Invalid subscription ID"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("mealType")
      .isIn(["breakfast", "lunch", "dinner"])
      .withMessage("Invalid meal type. Must be breakfast, lunch, or dinner"),
    body("status")
      .isIn([
        "pending",
        "scheduled",
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "skipped",
      ])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be a string with max 500 characters"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.updateMealTypeStatus(req, res)
);

/**
 * @route   GET /api/chef/subscriptions/metrics
 * @desc    Get chef subscription performance metrics
 * @access  Private (Chef only)
 */
router.get(
  "/metrics",
  [
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Period must be one of: 7d, 30d, 90d, 1y"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.getSubscriptionMetrics(req, res)
);

/**
 * @route   GET /api/chef/subscriptions/batch-opportunities
 * @desc    Get available batch preparation opportunities
 * @access  Private (Chef only)
 */
router.get(
  "/batch-opportunities",
  (req, res) => chefSubscriptionController.getBatchOpportunities(req, res)
);

/**
 * @route   GET /api/chef/subscriptions/active-batches
 * @desc    Get currently active batch preparations
 * @access  Private (Chef only)
 */
router.get("/active-batches", (req, res) => chefSubscriptionController.getActiveBatches(req, res));

/**
 * @route   POST /api/chef/subscriptions/batch-preparation/:batchId/start
 * @desc    Start a batch preparation
 * @access  Private (Chef only)
 */
router.post(
  "/batch-preparation/:batchId/start",
  [param("batchId").isMongoId().withMessage("Invalid batch ID")],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.startBatchPreparation(req, res)
);

/**
 * @route   POST /api/chef/subscriptions/batch-preparation/:batchId/complete
 * @desc    Complete a batch preparation
 * @access  Private (Chef only)
 */
router.post(
  "/batch-preparation/:batchId/complete",
  [param("batchId").isMongoId().withMessage("Invalid batch ID")],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.completeBatchPreparation(req, res)
);

/**
 * @route   POST /api/chef/subscriptions/batch-preparation/:batchId/cancel
 * @desc    Cancel a batch preparation
 * @access  Private (Chef only)
 */
router.post(
  "/batch-preparation/:batchId/cancel",
  [param("batchId").isMongoId().withMessage("Invalid batch ID")],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.cancelBatchPreparation(req, res)
);

/**
 * @route   POST /api/chef/subscriptions/:subscriptionId/communicate
 * @desc    Send communication to customer about subscription
 * @access  Private (Chef only)
 */
router.post(
  "/:subscriptionId/communicate",
  [
    param("subscriptionId").isMongoId().withMessage("Invalid subscription ID"),
    body("messageType")
      .isIn([
        "meal_preparation_update",
        "schedule_adjustment",
        "quality_feedback_request",
      ])
      .withMessage("Invalid message type"),
    body("content").isObject().withMessage("Content object is required"),
  ],
  handleValidationErrors,
  (req, res) => chefSubscriptionController.sendCustomerCommunication(req, res)
);

module.exports = router;
