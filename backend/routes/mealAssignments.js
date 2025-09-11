const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const mealAssignmentController = require("../controllers/mealAssignmentController");

// Get meal assignments for a specific subscription
router.get(
  "/subscription/:subscriptionId",
  auth,
  mealAssignmentController.getMealAssignmentsBySubscription
);

// Get meal assignments for current user
router.get(
  "/my-assignments",
  auth,
  mealAssignmentController.getMyMealAssignments
);

// Update meal assignment status
router.put(
  "/:assignmentId/status",
  auth,
  mealAssignmentController.updateMealAssignmentStatus
);

module.exports = router;
