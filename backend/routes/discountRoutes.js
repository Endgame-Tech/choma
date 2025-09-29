const express = require("express");
const router = express.Router();
const {
  getAllDiscountRules,
  createDiscountRule,
  updateDiscountRule,
  deleteDiscountRule,
  getMealPlansForDiscount,
} = require("../controllers/discountController");

// GET /api/admin/discount-rules/meal-plans - Get meal plans for ad discount creation
router.get("/meal-plans", getMealPlansForDiscount);

// Assuming auth middleware is applied before this route
router.route("/").get(getAllDiscountRules).post(createDiscountRule);
router.route("/:id").put(updateDiscountRule).delete(deleteDiscountRule);

module.exports = router;
