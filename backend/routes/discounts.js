const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

// GET /api/discount-rules/global - Get global discount rules
router.get('/global', discountController.getGlobalDiscountRules);

// POST /api/discounts/calculate - Calculate discount for user and meal plan
router.post('/calculate', discountController.calculateUserDiscount);

module.exports = router;
