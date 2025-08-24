const express = require('express');
console.log('Loading adminDeliveryPrice.js');
const router = express.Router();
const adminDeliveryPriceController = require('../controllers/adminDeliveryPriceController');
const { authenticateAdmin } = require('../middleware/adminAuth');

// Apply admin authentication to all routes in this file
router.use(authenticateAdmin);

// Routes for delivery prices
router.post('/', adminDeliveryPriceController.createDeliveryPrice);
router.get('/', adminDeliveryPriceController.getDeliveryPrices);
router.put('/:id', adminDeliveryPriceController.updateDeliveryPrice);
router.delete('/:id', adminDeliveryPriceController.deleteDeliveryPrice);

module.exports = router;
