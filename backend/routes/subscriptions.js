const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// All subscription routes require authentication
router.use(auth);

// GET /api/subscriptions - Get user's subscriptions (cached for 10 minutes)
router.get('/', cacheMiddleware.userMedium, subscriptionController.getUserSubscriptions);

// GET /api/subscriptions/:id - Get subscription by ID (cached for 10 minutes)
router.get('/:id', cacheMiddleware.userMedium, subscriptionController.getSubscriptionById);

// POST /api/subscriptions - Create new subscription
router.post('/', subscriptionController.createSubscription);

// PUT /api/subscriptions/:id - Update subscription
router.put('/:id', subscriptionController.updateSubscription);

// PUT /api/subscriptions/:id/pause - Pause subscription
router.put('/:id/pause', subscriptionController.pauseSubscription);

// PUT /api/subscriptions/:id/resume - Resume subscription
router.put('/:id/resume', subscriptionController.resumeSubscription);

// DELETE /api/subscriptions/:id - Cancel subscription
router.delete('/:id', subscriptionController.cancelSubscription);

// ==========================================
// RECURRING DELIVERY ROUTES
// ==========================================

// GET /api/subscriptions/:id/current-meal - Get current meal for subscription
router.get('/:id/current-meal', cacheMiddleware.userShort, subscriptionController.getSubscriptionCurrentMeal);

// GET /api/subscriptions/:id/chef-status - Get chef preparation status
router.get('/:id/chef-status', cacheMiddleware.userShort, subscriptionController.getSubscriptionChefStatus);

// GET /api/subscriptions/:id/next-delivery - Get next delivery information
router.get('/:id/next-delivery', cacheMiddleware.userShort, subscriptionController.getSubscriptionNextDelivery);

// GET /api/subscriptions/:id/meal-timeline - Get meal progression timeline
router.get('/:id/meal-timeline', cacheMiddleware.userMedium, subscriptionController.getSubscriptionMealTimeline);

// GET /api/subscriptions/:id/deliveries - Get subscription delivery history
router.get('/:id/deliveries', cacheMiddleware.userMedium, subscriptionController.getSubscriptionDeliveryHistory);

// POST /api/subscriptions/:id/skip-meal - Skip a meal delivery
router.post('/:id/skip-meal', subscriptionController.skipMealDelivery);

// PUT /api/subscriptions/:id/delivery-preferences - Update delivery preferences
router.put('/:id/delivery-preferences', subscriptionController.updateDeliveryPreferences);

// POST /api/subscriptions/:id/reassign-chef - Request chef reassignment
router.post('/:id/reassign-chef', subscriptionController.requestChefReassignment);

// POST /api/deliveries/:deliveryId/rate - Rate a completed delivery
router.post('/deliveries/:deliveryId/rate', subscriptionController.rateDelivery);

module.exports = router;
