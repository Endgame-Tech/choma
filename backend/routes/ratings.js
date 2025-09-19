const express = require('express');
const router = express.Router();
const ratingService = require('../services/ratingService');
const authenticateUser = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Middleware for all rating routes
router.use(authenticateUser);

/**
 * @route POST /api/ratings
 * @desc Create a new rating
 * @access Private
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    ratingType,
    ratedEntity,
    ratedEntityType,
    overallRating,
    aspectRatings,
    comment,
    tags,
    contextData
  } = req.body;

  // Add user info to rating data
  const ratingData = {
    ratingType,
    ratedBy: req.user.id,
    ratedByType: 'customer',
    ratedEntity,
    ratedEntityType,
    overallRating,
    aspectRatings,
    comment,
    tags,
    contextData: {
      ...contextData,
      platform: req.headers['x-platform'] || 'web',
      appVersion: req.headers['x-app-version']
    }
  };

  const rating = await ratingService.createRating(ratingData);

  res.status(201).json({
    success: true,
    message: 'Rating created successfully',
    data: rating
  });
}));

/**
 * @route PUT /api/ratings/:ratingId
 * @desc Update an existing rating
 * @access Private
 */
router.put('/:ratingId', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const updateData = req.body;

  const rating = await ratingService.updateRating(ratingId, updateData, req.user.id);

  res.json({
    success: true,
    message: 'Rating updated successfully',
    data: rating
  });
}));

/**
 * @route DELETE /api/ratings/:ratingId
 * @desc Delete a rating
 * @access Private
 */
router.delete('/:ratingId', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;

  await ratingService.deleteRating(ratingId, req.user.id);

  res.json({
    success: true,
    message: 'Rating deleted successfully'
  });
}));

/**
 * @route GET /api/ratings/my-ratings
 * @desc Get current user's ratings
 * @access Private
 */
router.get('/my-ratings', asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    entityType: req.query.entityType,
    ratingType: req.query.ratingType,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc'
  };

  const result = await ratingService.getUserRatings(req.user.id, options);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/ratings/entity/:entityType/:entityId
 * @desc Get ratings for a specific entity
 * @access Private
 */
router.get('/entity/:entityType/:entityId', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
    ratingType: req.query.ratingType,
    minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
    maxRating: req.query.maxRating ? parseFloat(req.query.maxRating) : undefined,
    withComments: req.query.withComments === 'true',
    verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined
  };

  const result = await ratingService.getEntityRatings(entityId, entityType, options);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route GET /api/ratings/entity/:entityType/:entityId/stats
 * @desc Get rating statistics for a specific entity
 * @access Private
 */
router.get('/entity/:entityType/:entityId/stats', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const stats = await ratingService.getEntityStats(entityId, entityType);

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route POST /api/ratings/:ratingId/helpful
 * @desc Vote on rating helpfulness
 * @access Private
 */
router.post('/:ratingId/helpful', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const { isHelpful } = req.body;

  const rating = await ratingService.voteHelpful(ratingId, req.user.id, isHelpful);

  res.json({
    success: true,
    message: 'Vote recorded successfully',
    data: {
      helpfulVotes: rating.helpfulVotes
    }
  });
}));

/**
 * @route POST /api/ratings/:ratingId/respond
 * @desc Respond to a rating (for chefs/drivers)
 * @access Private
 */
router.post('/:ratingId/respond', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const { responseText } = req.body;

  if (!responseText || responseText.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Response text is required'
    });
  }

  const rating = await ratingService.respondToRating(ratingId, responseText, req.user.id);

  res.json({
    success: true,
    message: 'Response added successfully',
    data: rating
  });
}));

/**
 * @route POST /api/ratings/:ratingId/flag
 * @desc Flag a rating for moderation
 * @access Private
 */
router.post('/:ratingId/flag', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const { flag, reason } = req.body;

  if (!flag || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Flag type and reason are required'
    });
  }

  const rating = await ratingService.flagRating(ratingId, flag, reason, req.user.id);

  res.json({
    success: true,
    message: 'Rating flagged successfully'
  });
}));

/**
 * @route GET /api/ratings/top-rated/:entityType
 * @desc Get top-rated entities
 * @access Private
 */
router.get('/top-rated/:entityType', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  
  const options = {
    limit: parseInt(req.query.limit) || 10,
    minRatings: parseInt(req.query.minRatings) || 5,
    timeframe: req.query.timeframe || 'all'
  };

  const topRated = await ratingService.getTopRated(entityType, options);

  res.json({
    success: true,
    data: topRated
  });
}));

/**
 * @route GET /api/ratings/trending/:entityType
 * @desc Get trending entities
 * @access Private
 */
router.get('/trending/:entityType', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const { trendType = 'improving' } = req.query;

  const trending = await ratingService.getTrending(entityType, trendType);

  res.json({
    success: true,
    data: trending
  });
}));

/**
 * @route GET /api/ratings/needs-improvement/:entityType
 * @desc Get entities needing improvement
 * @access Private
 */
router.get('/needs-improvement/:entityType', cacheMiddleware.medium, asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const threshold = parseFloat(req.query.threshold) || 3.0;

  const needingImprovement = await ratingService.getNeedingImprovement(entityType, threshold);

  res.json({
    success: true,
    data: needingImprovement
  });
}));

module.exports = router;