const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');

// All subscription routes require authentication
router.use(auth);

// GET /api/subscriptions - Get user's subscriptions
router.get('/', subscriptionController.getUserSubscriptions);

// GET /api/subscriptions/:id - Get subscription by ID
router.get('/:id', subscriptionController.getSubscriptionById);

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

module.exports = router;
