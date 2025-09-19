// backend/routes/search.js
const express = require('express');
const router = express.Router();


// GET /api/search/popular - Return latest meal plans (not individual meals)
const MealPlan = require('../models/MealPlan');
router.get('/popular', async (req, res) => {
  try {
    // Get latest meal plans, limit to 10
    const latestMealPlans = await MealPlan.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('planName description image price category createdAt');
    res.json({ success: true, data: latestMealPlans });
  } catch (error) {
    console.error('Error fetching popular meal plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch popular meal plans' });
  }
});

module.exports = router;
