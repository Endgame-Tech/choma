const express = require('express');
const router = express.Router();
const ratingPromptService = require('../services/ratingPromptService');
const RatingTrigger = require('../models/RatingTrigger');
const UserRatingHistory = require('../models/UserRatingHistory');
const authenticateUser = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Middleware for all rating prompt routes
router.use(authenticateUser);

/**
 * @route POST /api/rating-prompts/trigger
 * @desc Trigger a rating prompt for an event
 * @access Private
 */
router.post('/trigger', asyncHandler(async (req, res) => {
  const eventData = {
    ...req.body,
    userId: req.user.id // Ensure userId comes from authenticated user
  };

  const result = await ratingPromptService.triggerRatingPrompt(eventData);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/rating-prompts/pending
 * @desc Get pending rating prompts for current user
 * @access Private
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const pendingTriggers = await RatingTrigger.find({
    userId: req.user.id,
    status: 'evaluated',
    shouldPrompt: true,
    scheduledPromptTime: { $lte: new Date() }
  })
  .populate('relatedOrderId')
  .populate('relatedSubscriptionId')
  .populate('relatedChefId')
  .populate('relatedDriverId')
  .sort({ scheduledPromptTime: 1 });

  const promptsData = [];

  for (const trigger of pendingTriggers) {
    try {
      const promptData = await ratingPromptService.processPrompt(trigger._id);
      if (promptData) {
        promptsData.push(promptData);
      }
    } catch (error) {
      console.error('Error processing pending prompt:', trigger._id, error);
    }
  }

  res.json({
    success: true,
    data: promptsData
  });
}));

/**
 * @route POST /api/rating-prompts/response
 * @desc Record user response to a rating prompt
 * @access Private
 */
router.post('/response', asyncHandler(async (req, res) => {
  const { triggerId, response, ratingId } = req.body;

  if (!triggerId || !response) {
    return res.status(400).json({
      success: false,
      message: 'triggerId and response are required'
    });
  }

  const trigger = await ratingPromptService.recordPromptResponse(triggerId, response, ratingId);

  res.json({
    success: true,
    message: 'Response recorded successfully',
    data: trigger
  });
}));

/**
 * @route PUT /api/rating-prompts/preferences
 * @desc Update user rating prompt preferences
 * @access Private
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const preferences = req.body;

  const userHistory = await ratingPromptService.updateUserPreferences(req.user.id, preferences);

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: userHistory
  });
}));

/**
 * @route GET /api/rating-prompts/history
 * @desc Get user rating history and preferences
 * @access Private
 */
router.get('/history', cacheMiddleware.userShort, asyncHandler(async (req, res) => {
  const userHistory = await ratingPromptService.getUserRatingHistory(req.user.id);

  res.json({
    success: true,
    data: userHistory
  });
}));

/**
 * @route GET /api/rating-prompts/eligibility
 * @desc Check if user is eligible for rating prompt in specific context
 * @access Private
 */
router.get('/eligibility', asyncHandler(async (req, res) => {
  const { context } = req.query;

  if (!context) {
    return res.status(400).json({
      success: false,
      message: 'context parameter is required'
    });
  }

  const eligibility = await ratingPromptService.checkPromptEligibility(req.user.id, context);

  res.json({
    success: true,
    data: eligibility
  });
}));

/**
 * @route GET /api/rating-prompts/my-triggers
 * @desc Get user's rating triggers history
 * @access Private
 */
router.get('/my-triggers', cacheMiddleware.userShort, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    triggerType,
    status
  } = req.query;

  const query = { userId: req.user.id };
  
  if (triggerType) query.triggerType = triggerType;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [triggers, totalCount] = await Promise.all([
    RatingTrigger.find(query)
      .populate('relatedOrderId', 'orderNumber total status')
      .populate('relatedSubscriptionId', 'status')
      .populate('ratingCreated', 'overallRating comment')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    
    RatingTrigger.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      triggers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    }
  });
}));

/**
 * @route POST /api/rating-prompts/bulk-trigger
 * @desc Trigger multiple rating prompts (useful for testing)
 * @access Private
 */
router.post('/bulk-trigger', asyncHandler(async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events)) {
    return res.status(400).json({
      success: false,
      message: 'events must be an array'
    });
  }

  const results = [];

  for (const eventData of events) {
    try {
      const result = await ratingPromptService.triggerRatingPrompt({
        ...eventData,
        userId: req.user.id
      });
      results.push({ success: true, eventData, result });
    } catch (error) {
      results.push({ success: false, eventData, error: error.message });
    }
  }

  res.json({
    success: true,
    data: results
  });
}));

/**
 * @route GET /api/rating-prompts/stats
 * @desc Get user's rating prompt statistics
 * @access Private
 */
router.get('/stats', cacheMiddleware.userMedium, asyncHandler(async (req, res) => {
  const userHistory = await UserRatingHistory.getOrCreate(req.user.id);
  
  // Get recent triggers
  const recentTriggers = await RatingTrigger.find({
    userId: req.user.id,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  });

  // Calculate statistics
  const stats = {
    userPreferences: {
      promptFrequency: userHistory.promptFrequency,
      hasOptedOut: userHistory.hasOptedOut,
      engagementLevel: userHistory.engagementLevel
    },
    allTime: {
      totalPromptsShown: userHistory.totalPromptsShown,
      totalPromptsAccepted: userHistory.totalPromptsAccepted,
      totalPromptsDismissed: userHistory.totalPromptsDismissed,
      totalRatingsGiven: userHistory.totalRatingsGiven,
      responseRate: userHistory.responseRate,
      avgRatingGiven: userHistory.avgRatingGiven,
      consecutiveDismissals: userHistory.consecutiveDismissals
    },
    recent30Days: {
      totalTriggers: recentTriggers.length,
      totalPrompted: recentTriggers.filter(t => t.status === 'prompted' || t.status === 'completed' || t.status === 'dismissed').length,
      totalCompleted: recentTriggers.filter(t => t.status === 'completed').length,
      totalDismissed: recentTriggers.filter(t => t.status === 'dismissed').length,
      avgTriggerScore: recentTriggers.length > 0 
        ? recentTriggers.reduce((sum, t) => sum + t.triggerScore, 0) / recentTriggers.length 
        : 0
    },
    byTriggerType: {}
  };

  // Calculate stats by trigger type
  const triggerTypes = ['order_completion', 'delivery_completion', 'subscription_milestone', 'app_session_end'];
  
  for (const type of triggerTypes) {
    const typeData = userHistory.ratingByContext[type] || {};
    stats.byTriggerType[type] = {
      prompted: typeData.prompted || 0,
      completed: typeData.completed || 0,
      dismissed: typeData.dismissed || 0,
      lastPrompt: typeData.lastPrompt,
      responseRate: typeData.prompted > 0 ? (typeData.completed / typeData.prompted) * 100 : 0
    };
  }

  res.json({
    success: true,
    data: stats
  });
}));

module.exports = router;