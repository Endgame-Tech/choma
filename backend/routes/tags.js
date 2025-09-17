const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');

// Public routes (for mobile app)
router.get('/', tagController.getAllTags);
router.get('/:id', tagController.getTagById);
router.get('/:id/mealplans', tagController.getMealPlansByTag);

module.exports = router;