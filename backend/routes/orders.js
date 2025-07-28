const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All order routes require authentication
router.use(auth);

// GET /api/orders - Get user's orders
router.get('/', orderController.getUserOrders);

// GET /api/orders/assigned - Get user's orders assigned to chefs
router.get('/assigned', orderController.getUserAssignedOrders);

// GET /api/orders/:id - Get order by ID
router.get('/:id', orderController.getOrderById);

// POST /api/orders - Create new order
router.post('/', orderController.createOrder);

// PUT /api/orders/:id - Update order
router.put('/:id', orderController.updateOrder);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', orderController.updateOrderStatus);

// POST /api/orders/:id/rating - Rate an order
router.post('/:id/rating', orderController.rateOrder);

module.exports = router;
