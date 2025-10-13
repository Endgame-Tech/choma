const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const userDashboardController = require('../controllers/userDashboardController');

/**
 * @route GET /api/user/meal-dashboard
 * @desc Get unified meal dashboard data (subscription + current meal + timeline)
 * @access Private
 * @cache 5 minutes (short cache since meal data changes daily)
 *
 * Returns complete dashboard data in a single optimized API call:
 * - Active subscription details
 * - Current meal (today's meal)
 * - 7-day meal timeline (3 days past, today, 3 days future)
 * - Progress stats (days completed, meals remaining, etc.)
 *
 * This replaces 3 separate API calls:
 * - GET /auth/dashboard
 * - GET /subscriptions/:id/current-meal
 * - GET /subscriptions/:id/meal-timeline
 */
router.get('/meal-dashboard', auth, cacheMiddleware.userShort, userDashboardController.getMealDashboard);

module.exports = router;
