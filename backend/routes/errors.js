const express = require('express');
const router = express.Router();
const { logger, asyncHandler } = require('../middleware/errorHandler');
const auth = require('../middleware/auth');

// Error reporting endpoint for mobile app
router.post('/report', asyncHandler(async (req, res) => {
  const {
    id,
    message,
    stack,
    componentStack,
    timestamp,
    deviceInfo,
    appInfo,
    userInfo,
    retryCount,
    context,
    type
  } = req.body;

  // Log the error report
  logger.error('Mobile App Error Report', {
    errorId: id,
    message,
    stack,
    componentStack,
    timestamp,
    deviceInfo,
    appInfo,
    userInfo,
    retryCount,
    context,
    type,
    reportedAt: new Date().toISOString(),
    source: 'mobile_app'
  });


  res.json({
    success: true,
    message: 'Error report received',
    errorId: id
  });
}));

// Get error statistics (protected route)
router.get('/stats', auth, asyncHandler(async (req, res) => {
  // This would typically query a database
  // For now, return mock data
  res.json({
    success: true,
    data: {
      totalErrors: 0,
      criticalErrors: 0,
      recentErrors: [],
      errorTrends: [],
      topErrors: []
    }
  });
}));

module.exports = router;