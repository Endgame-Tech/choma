// backend/routes/customMealRoutes.js
// Routes for Custom Meal management (admin only)

const express = require("express");
const router = express.Router();
const {
  getAllCustomMeals,
  getCustomMealById,
  createCustomMeal,
  updateCustomMeal,
  deleteCustomMeal,
  recalculateCustomMeal,
  getCustomMealStats,
} = require("../controllers/customMealController");
const { authenticateAdmin } = require("../middleware/adminAuth");

// Apply admin authentication to all routes in this file
router.use(authenticateAdmin);

// Statistics
router.get("/stats/overview", getCustomMealStats);

// CRUD operations
router.get("/", getAllCustomMeals);
router.get("/:id", getCustomMealById);
router.post("/", createCustomMeal);
router.put("/:id", updateCustomMeal);
router.delete("/:id", deleteCustomMeal);

// Utility
router.post("/:id/recalculate", recalculateCustomMeal);

module.exports = router;
