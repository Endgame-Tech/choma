const express = require('express');
const router = express.Router();
const mealplanController = require('../controllers/mealplanController');
const discountController = require('../controllers/discountController');
const auth = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// GET /api/mealplans - Get all meal plans (cached for 10 minutes)
router.get('/', cacheMiddleware.mealPlans, mealplanController.getAllMealPlans);

// GET /api/mealplans/popular - Get popular meal plans (no cache for immediate updates)
router.get('/popular', mealplanController.getPopularMealPlans);

// GET /api/mealplans/filtered - Get filtered meal plans (cached for 10 minutes)
router.get('/filtered', cacheMiddleware.mealPlans, mealplanController.getFilteredMealPlans);

// GET /api/mealplans/search - Search meal plans with filters (cached for 5 minutes)
router.get('/search', cacheMiddleware.medium, mealplanController.searchMealPlans);

// GET /api/mealplans/audiences - Get available target audiences (cached for 1 hour)
router.get('/audiences', cacheMiddleware.long, mealplanController.getTargetAudiences);

// GET /api/mealplans/meals/available - Get available daily meals (cached for 10 minutes)
router.get('/meals/available', cacheMiddleware.medium, mealplanController.getAvailableMeals);

// GET /api/mealplans/:id - Get meal plan by ID (cached for 10 minutes)
router.get('/:id', cacheMiddleware.medium, mealplanController.getMealPlanById);

// GET /api/mealplans/:id/customization - Get meal customization preferences (protected route)
router.get('/:id/customization', auth, mealplanController.getMealCustomization);

// POST /api/mealplans - Create new meal plan (protected route)
router.post('/', auth, mealplanController.createMealPlan);

// POST /api/mealplans/customization - Save meal customization preferences (protected route)
router.post('/customization', auth, mealplanController.saveMealCustomization);

// PUT /api/mealplans/:id - Update meal plan (protected route)
router.put('/:id', auth, mealplanController.updateMealPlan);

// DELETE /api/mealplans/:id - Delete meal plan (protected route)
router.delete('/:id', auth, mealplanController.deleteMealPlan);

// GET /api/mealplans/:id/discount-rules - Get discount rules for a meal plan
router.get('/:id/discount-rules', discountController.getDiscountRulesForMealPlan);

module.exports = router;
