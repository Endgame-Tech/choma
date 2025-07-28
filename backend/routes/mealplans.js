const express = require('express');
const router = express.Router();
const mealplanController = require('../controllers/mealplanController');
const auth = require('../middleware/auth');

// GET /api/mealplans - Get all meal plans
router.get('/', mealplanController.getAllMealPlans);

// GET /api/mealplans/popular - Get popular meal plans
router.get('/popular', mealplanController.getPopularMealPlans);

// GET /api/mealplans/filtered - Get filtered meal plans (NEW)
router.get('/filtered', mealplanController.getFilteredMealPlans);

// GET /api/mealplans/search - Search meal plans with filters (NEW)
router.get('/search', mealplanController.searchMealPlans);

// GET /api/mealplans/audiences - Get available target audiences (NEW)
router.get('/audiences', mealplanController.getTargetAudiences);

// GET /api/mealplans/meals/available - Get available daily meals for customization
router.get('/meals/available', mealplanController.getAvailableMeals);

// GET /api/mealplans/:id - Get meal plan by ID
router.get('/:id', mealplanController.getMealPlanById);

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

module.exports = router;
