// backend/routes/adminCustomMealPlanRoutes.js
// Admin routes for viewing/managing user-generated custom meal plans

const express = require("express");
const router = express.Router();
const {
  getAllCustomPlans,
  getCustomPlanByIdAdmin,
} = require("../controllers/customMealPlanController");
const { authenticateAdmin } = require("../middleware/adminAuth");

// Apply admin authentication to all routes in this file
router.use(authenticateAdmin);

// Get all custom meal plans (admin view)
router.get("/", getAllCustomPlans);

// Get specific custom meal plan (admin view - no ownership check)
router.get("/:id", getCustomPlanByIdAdmin);

module.exports = router;
