const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const { validateApiKey } = require('../middleware/security');
const { paymentValidations } = require('../middleware/validation');

// Middleware for webhook (no auth required)
const webhookMiddleware = express.raw({ type: 'application/json' });

// Payment initialization (requires authentication and API key in production)
router.post('/initialize', 
  process.env.NODE_ENV === 'production' ? validateApiKey : (req, res, next) => next(),
  auth, 
  paymentValidations.initialize, 
  PaymentController.initializePayment
);

// Payment verification (requires authentication)
router.get('/verify/:reference', 
  auth, 
  paymentValidations.verify, 
  PaymentController.verifyPayment
);

// Payment history (requires authentication)
router.get('/history', auth, PaymentController.getPaymentHistory);

// Refund payment (requires authentication and API key in production)
router.post('/refund', 
  process.env.NODE_ENV === 'production' ? validateApiKey : (req, res, next) => next(),
  auth, 
  PaymentController.refundPayment
);

// Paystack webhook (no authentication required)
router.post('/webhook', webhookMiddleware, PaymentController.handleWebhook);

module.exports = router;
