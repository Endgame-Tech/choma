const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");

// Admin routes for tag management
router.get("/", tagController.getAllTags);
router.get("/:id", tagController.getTagById);
router.post("/", tagController.createTag);
router.put("/:id", tagController.updateTag);
router.delete("/:id", tagController.deleteTag);
router.post(
  "/:id/remove-from-meal-plans",
  tagController.removeTagFromAllMealPlans
);

module.exports = router;
