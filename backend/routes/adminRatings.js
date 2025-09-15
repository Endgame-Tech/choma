const express = require('express');
const router = express.Router();
const ratingService = require('../services/ratingService');
const Rating = require('../models/Rating');
const RatingSummary = require('../models/RatingSummary');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Middleware for all admin rating routes
router.use(authenticateAdmin);

/**
 * @route GET /api/admin/ratings/overview
 * @desc Get rating system overview and statistics
 * @access Admin
 */
router.get('/overview', cacheMiddleware.adminMedium, asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const [
    totalRatings,
    recentRatings,
    weeklyRatings,
    averageRating,
    ratingsByType,
    ratingsByEntity,
    flaggedCount,
    pendingModerationCount
  ] = await Promise.all([
    // Total ratings
    Rating.countDocuments({ status: 'active' }),
    
    // Recent ratings (last 30 days)
    Rating.countDocuments({ 
      status: 'active',
      createdAt: { $gte: thirtyDaysAgo }
    }),
    
    // Weekly ratings
    Rating.countDocuments({ 
      status: 'active',
      createdAt: { $gte: sevenDaysAgo }
    }),
    
    // Average rating across all
    Rating.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, avgRating: { $avg: '$overallRating' } } }
    ]),
    
    // Ratings by type
    Rating.aggregate([
      { $match: { status: 'active' } },
      { 
        $group: { 
          _id: '$ratingType',
          count: { $sum: 1 },
          avgRating: { $avg: '$overallRating' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    
    // Ratings by entity type
    Rating.aggregate([
      { $match: { status: 'active' } },
      { 
        $group: { 
          _id: '$ratedEntityType',
          count: { $sum: 1 },
          avgRating: { $avg: '$overallRating' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    
    // Flagged ratings
    Rating.countDocuments({ 
      status: 'flagged',
      moderationFlags: { $exists: true, $ne: [] }
    }),
    
    // Pending moderation (flagged but not reviewed)
    Rating.countDocuments({ 
      status: 'flagged',
      moderatedBy: { $exists: false }
    })
  ]);

  const overview = {
    totalStats: {
      totalRatings,
      recentRatings,
      weeklyRatings,
      averageRating: averageRating[0]?.avgRating || 0,
      flaggedCount,
      pendingModerationCount
    },
    breakdown: {
      byRatingType: ratingsByType,
      byEntityType: ratingsByEntity
    },
    trends: {
      weeklyGrowth: weeklyRatings,
      monthlyGrowth: recentRatings
    }
  };

  res.json({
    success: true,
    data: overview
  });
}));

/**
 * @route GET /api/admin/ratings/flagged
 * @desc Get flagged ratings for moderation
 * @access Admin
 */
router.get('/flagged', cacheMiddleware.adminShort, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    flag,
    status = 'flagged'
  } = req.query;

  const query = { status };
  
  if (flag) {
    query['moderationFlags.flag'] = flag;
  }

  const skip = (page - 1) * limit;

  const [flaggedRatings, totalCount] = await Promise.all([
    Rating.find(query)
      .populate('ratedBy', 'name email')
      .populate('ratedEntity')
      .populate('moderatedBy', 'firstName lastName')
      .sort({ 'moderationFlags.flaggedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    
    Rating.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      flaggedRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  });
}));

/**
 * @route PUT /api/admin/ratings/:ratingId/moderate
 * @desc Moderate a flagged rating
 * @access Admin
 */
router.put('/:ratingId/moderate', asyncHandler(async (req, res) => {
  const { ratingId } = req.params;
  const { action, moderationNotes } = req.body; // action: 'approve', 'hide', 'delete'

  const rating = await Rating.findById(ratingId);
  
  if (!rating) {
    return res.status(404).json({
      success: false,
      message: 'Rating not found'
    });
  }

  // Update rating based on moderation action
  switch (action) {
    case 'approve':
      rating.status = 'active';
      rating.moderationFlags = []; // Clear flags
      break;
    case 'hide':
      rating.status = 'hidden';
      break;
    case 'delete':
      rating.status = 'deleted';
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid moderation action'
      });
  }

  rating.moderatedBy = req.admin.adminId;
  rating.moderatedAt = new Date();
  
  if (moderationNotes) {
    rating.moderationNotes = moderationNotes;
  }

  await rating.save();

  // Update rating summary if needed
  if (action === 'delete' || action === 'approve') {
    await RatingSummary.updateEntitySummary(rating.ratedEntity, rating.ratedEntityType);
  }

  res.json({
    success: true,
    message: `Rating ${action}d successfully`,
    data: rating
  });
}));

/**
 * @route GET /api/admin/ratings/analytics/:entityType
 * @desc Get detailed analytics for entity type
 * @access Admin
 */
router.get('/analytics/:entityType', cacheMiddleware.adminMedium, asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const { timeframe = '30d' } = req.query;

  let dateFilter = {};
  const now = new Date();
  
  switch (timeframe) {
    case '7d':
      dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
      break;
    case '30d':
      dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
      break;
    case '90d':
      dateFilter = { createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
      break;
    case '1y':
      dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
      break;
  }

  const baseQuery = {
    ratedEntityType: entityType,
    status: 'active',
    ...dateFilter
  };

  const [
    ratingDistribution,
    aspectAnalysis,
    timeSeriesData,
    topPerformers,
    bottomPerformers,
    summaryStats
  ] = await Promise.all([
    // Rating distribution
    Rating.aggregate([
      { $match: baseQuery },
      {
        $bucket: {
          groupBy: '$overallRating',
          boundaries: [1, 2, 3, 4, 5, 6],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgRating: { $avg: '$overallRating' }
          }
        }
      }
    ]),

    // Aspect analysis
    Rating.aggregate([
      { $match: baseQuery },
      {
        $project: {
          aspectEntries: { $objectToArray: '$aspectRatings' }
        }
      },
      { $unwind: '$aspectEntries' },
      { $match: { 'aspectEntries.v': { $ne: null } } },
      {
        $group: {
          _id: '$aspectEntries.k',
          avgRating: { $avg: '$aspectEntries.v' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgRating: -1 } }
    ]),

    // Time series data (daily for last 30 days)
    Rating.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$overallRating' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Top performers
    RatingSummary.getTopRated(entityType, { limit: 5, minRatings: 3 }),

    // Bottom performers
    RatingSummary.getNeedingImprovement(entityType, 4.0),

    // Overall summary stats
    Rating.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          avgRating: { $avg: '$overallRating' },
          minRating: { $min: '$overallRating' },
          maxRating: { $max: '$overallRating' },
          withComments: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$comment', null] }, { $ne: ['$comment', ''] }] },
                1,
                0
              ]
            }
          },
          verifiedRatings: {
            $sum: { $cond: ['$isVerifiedExperience', 1, 0] }
          }
        }
      }
    ])
  ]);

  const analytics = {
    summary: summaryStats[0] || {
      totalRatings: 0,
      avgRating: 0,
      minRating: 0,
      maxRating: 0,
      withComments: 0,
      verifiedRatings: 0
    },
    distribution: ratingDistribution,
    aspectAnalysis,
    timeSeriesData,
    topPerformers: topPerformers.slice(0, 5),
    bottomPerformers: bottomPerformers.slice(0, 5),
    entityType,
    timeframe
  };

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route POST /api/admin/ratings/recalculate
 * @desc Recalculate rating summaries
 * @access Admin
 */
router.post('/recalculate', asyncHandler(async (req, res) => {
  const { entityType } = req.body;

  const count = await ratingService.recalculateSummaries(entityType);

  res.json({
    success: true,
    message: `Recalculated ${count} rating summaries`,
    data: { recalculatedCount: count }
  });
}));

/**
 * @route GET /api/admin/ratings/entity/:entityType/:entityId/details
 * @desc Get detailed rating information for a specific entity (admin view)
 * @access Admin
 */
router.get('/entity/:entityType/:entityId/details', cacheMiddleware.adminShort, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const [summary, recentRatings, flaggedRatings] = await Promise.all([
    RatingSummary.findOne({ entityId, entityType }),
    
    Rating.find({
      ratedEntity: entityId,
      ratedEntityType: entityType,
      status: 'active'
    })
    .populate('ratedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(10),
    
    Rating.find({
      ratedEntity: entityId,
      ratedEntityType: entityType,
      status: 'flagged'
    })
    .populate('ratedBy', 'name email')
    .populate('moderatedBy', 'firstName lastName')
  ]);

  res.json({
    success: true,
    data: {
      summary,
      recentRatings,
      flaggedRatings,
      entityId,
      entityType
    }
  });
}));

/**
 * @route GET /api/admin/ratings/search
 * @desc Search ratings by various criteria
 * @access Admin
 */
router.get('/search', cacheMiddleware.adminShort, asyncHandler(async (req, res) => {
  const {
    query,
    ratingType,
    entityType,
    ratedBy,
    minRating,
    maxRating,
    status = 'active',
    page = 1,
    limit = 20
  } = req.query;

  const searchQuery = { status };

  if (ratingType) searchQuery.ratingType = ratingType;
  if (entityType) searchQuery.ratedEntityType = entityType;
  if (ratedBy) searchQuery.ratedBy = ratedBy;
  if (minRating) searchQuery.overallRating = { ...searchQuery.overallRating, $gte: parseFloat(minRating) };
  if (maxRating) searchQuery.overallRating = { ...searchQuery.overallRating, $lte: parseFloat(maxRating) };

  // Text search in comments if query provided
  if (query) {
    searchQuery.comment = { $regex: query, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [ratings, totalCount] = await Promise.all([
    Rating.find(searchQuery)
      .populate('ratedBy', 'name email')
      .populate('ratedEntity')
      .populate('moderatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    
    Rating.countDocuments(searchQuery)
  ]);

  res.json({
    success: true,
    data: {
      ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      searchCriteria: req.query
    }
  });
}));

/**
 * @route GET /api/admin/ratings/export/:entityType
 * @desc Export ratings data for analysis
 * @access Admin
 */
router.get('/export/:entityType', asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const { startDate, endDate, format = 'json' } = req.query;

  const query = { 
    ratedEntityType: entityType,
    status: 'active'
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const ratings = await Rating.find(query)
    .populate('ratedBy', 'name email')
    .populate('ratedEntity')
    .lean();

  if (format === 'csv') {
    // Convert to CSV format
    const csv = ratings.map(rating => ({
      id: rating._id,
      ratingType: rating.ratingType,
      ratedEntity: rating.ratedEntity?.name || rating.ratedEntity?._id,
      ratedBy: rating.ratedBy?.name || rating.ratedBy?.email,
      overallRating: rating.overallRating,
      comment: rating.comment || '',
      isVerified: rating.isVerifiedExperience,
      createdAt: rating.createdAt
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ratings-${entityType}-${Date.now()}.csv`);
    
    // Simple CSV conversion (in production, use a proper CSV library)
    const headers = Object.keys(csv[0] || {}).join(',');
    const rows = csv.map(row => Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(','));
    
    res.send([headers, ...rows].join('\n'));
  } else {
    res.json({
      success: true,
      data: ratings,
      exportInfo: {
        entityType,
        count: ratings.length,
        exportedAt: new Date().toISOString()
      }
    });
  }
}));

module.exports = router;