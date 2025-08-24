const express = require('express');
const router = express.Router();
const {
  getAllDiscountRules,
  createDiscountRule,
  updateDiscountRule,
  deleteDiscountRule,
} = require('../controllers/discountController');

// Assuming auth middleware is applied before this route
router.route('/').get(getAllDiscountRules).post(createDiscountRule);
router.route('/:id').put(updateDiscountRule).delete(deleteDiscountRule);

module.exports = router;
