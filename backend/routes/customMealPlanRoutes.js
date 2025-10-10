// backend/routes/customMealPlanRoutes.js
const express = require("express");
const router = express.Router();
const {
  generateMealPlan,
  getCustomMealPlan,
  getMyCustomPlans,
  purchaseCustomPlan,
  deleteCustomPlan,
  regenerateCustomPlan
} = require("../controllers/customMealPlanController");

// All routes require authentication (middleware applied in index.js)

// Generate custom meal plan (preview or save as draft)
router.post("/generate", generateMealPlan);

// Get user's custom meal plans
router.get("/my-plans", getMyCustomPlans);

// Get specific custom meal plan
router.get("/:id", getCustomMealPlan);

// Purchase custom meal plan
router.post("/:id/purchase", purchaseCustomPlan);

// Regenerate custom meal plan with same preferences
router.post("/:id/regenerate", regenerateCustomPlan);

// Delete custom meal plan (draft only)
router.delete("/:id", deleteCustomPlan);

module.exports = router;
