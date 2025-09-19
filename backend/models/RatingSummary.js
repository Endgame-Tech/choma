const mongoose = require('mongoose');

const ratingSummarySchema = new mongoose.Schema({
  // Entity being summarized
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['meal_plan', 'chef', 'driver', 'order', 'subscription', 'delivery', 'app', 'support_ticket'],
    required: true,
    index: true
  },
  
  // Overall rating statistics
  overallStats: {
    totalRatings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    
    // Rating distribution
    ratingCounts: {
      '5': { type: Number, default: 0 },
      '4': { type: Number, default: 0 },
      '3': { type: Number, default: 0 },
      '2': { type: Number, default: 0 },
      '1': { type: Number, default: 0 }
    },
    
    // Recent performance (last 30 days)
    recent30Days: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    
    // Verified vs unverified ratings
    verifiedRatings: { type: Number, default: 0 },
    unverifiedRatings: { type: Number, default: 0 }
  },
  
  // Aspect-specific statistics
  aspectStats: {
    // Meal Plan aspects
    taste: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    presentation: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    portionSize: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    valueForMoney: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    healthiness: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    
    // Chef aspects
    cookingQuality: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    consistency: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    communication: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    punctuality: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    professionalism: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    
    // Driver aspects
    timeliness: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    courteous: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    packaging: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    tracking: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    
    // Delivery aspects
    temperature: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    condition: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    accuracy: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    
    // App aspects
    easeOfUse: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    performance: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    design: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    },
    features: {
      average: { type: Number },
      count: { type: Number, default: 0 }
    }
  },
  
  // Rating type breakdown
  ratingTypeBreakdown: {
    meal_plan: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    chef_performance: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    driver_service: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    delivery_experience: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    order_satisfaction: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    subscription_service: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    app_experience: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    },
    customer_service: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 }
    }
  },
  
  // Trending data
  trendingMetrics: {
    weeklyTrend: { type: Number, default: 0 }, // % change from previous week
    monthlyTrend: { type: Number, default: 0 }, // % change from previous month
    momentum: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' }
  },
  
  // Quality indicators
  qualityMetrics: {
    averageCommentLength: { type: Number, default: 0 },
    ratingsWithComments: { type: Number, default: 0 },
    helpfulnessScore: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 }, // For chefs/drivers responding to ratings
    flaggedRatings: { type: Number, default: 0 }
  },
  
  // Peak/valley analysis
  performanceInsights: {
    bestAspect: {
      name: { type: String },
      score: { type: Number }
    },
    worstAspect: {
      name: { type: String },
      score: { type: Number }
    },
    improvementAreas: [{
      aspect: { type: String },
      score: { type: Number },
      trend: { type: String }
    }],
    strengths: [{
      aspect: { type: String },
      score: { type: Number },
      trend: { type: String }
    }]
  },
  
  // Last calculation timestamp
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  calculationVersion: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient entity lookups
ratingSummarySchema.index({ entityId: 1, entityType: 1 }, { unique: true });
ratingSummarySchema.index({ entityType: 1, 'overallStats.averageRating': -1 });
ratingSummarySchema.index({ entityType: 1, 'overallStats.totalRatings': -1 });
ratingSummarySchema.index({ 'trendingMetrics.momentum': 1, 'overallStats.averageRating': -1 });

// Virtual for overall rating quality
ratingSummarySchema.virtual('ratingQuality').get(function() {
  const totalRatings = this.overallStats.totalRatings;
  const verifiedPercentage = totalRatings > 0 ? (this.overallStats.verifiedRatings / totalRatings) * 100 : 0;
  const commentPercentage = totalRatings > 0 ? (this.qualityMetrics.ratingsWithComments / totalRatings) * 100 : 0;
  
  if (totalRatings < 5) return 'insufficient';
  if (verifiedPercentage > 80 && commentPercentage > 50) return 'excellent';
  if (verifiedPercentage > 60 && commentPercentage > 30) return 'good';
  if (verifiedPercentage > 40 && commentPercentage > 20) return 'fair';
  return 'poor';
});

// Virtual for rating confidence
ratingSummarySchema.virtual('confidenceLevel').get(function() {
  const totalRatings = this.overallStats.totalRatings;
  const recentRatings = this.overallStats.recent30Days.totalRatings;
  
  if (totalRatings >= 50 && recentRatings >= 10) return 'high';
  if (totalRatings >= 20 && recentRatings >= 5) return 'medium';
  if (totalRatings >= 5) return 'low';
  return 'very_low';
});

// Static method to update or create entity summary
ratingSummarySchema.statics.updateEntitySummary = async function(entityId, entityType) {
  const Rating = mongoose.model('Rating');
  
  // Get all active ratings for this entity
  const ratings = await Rating.find({
    ratedEntity: entityId,
    ratedEntityType: entityType,
    status: 'active'
  }).sort({ createdAt: -1 });
  
  if (ratings.length === 0) {
    // Remove summary if no ratings exist
    await this.deleteOne({ entityId, entityType });
    return null;
  }
  
  // Calculate overall statistics
  const totalRatings = ratings.length;
  const averageRating = ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalRatings;
  
  // Rating distribution
  const ratingCounts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  ratings.forEach(rating => {
    if (rating.overallRating >= 4.5) ratingCounts['5']++;
    else if (rating.overallRating >= 3.5) ratingCounts['4']++;
    else if (rating.overallRating >= 2.5) ratingCounts['3']++;
    else if (rating.overallRating >= 1.5) ratingCounts['2']++;
    else ratingCounts['1']++;
  });
  
  // Recent ratings (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRatings = ratings.filter(r => r.createdAt >= thirtyDaysAgo);
  const recentAverage = recentRatings.length > 0 
    ? recentRatings.reduce((sum, r) => sum + r.overallRating, 0) / recentRatings.length 
    : 0;
  
  // Verified ratings
  const verifiedCount = ratings.filter(r => r.isVerifiedExperience).length;
  
  // Calculate aspect statistics
  const aspectStats = {};
  const aspectNames = [
    'taste', 'presentation', 'portionSize', 'valueForMoney', 'healthiness',
    'cookingQuality', 'consistency', 'communication', 'punctuality', 'professionalism',
    'timeliness', 'courteous', 'packaging', 'tracking',
    'temperature', 'condition', 'accuracy',
    'easeOfUse', 'performance', 'design', 'features'
  ];
  
  aspectNames.forEach(aspect => {
    const aspectRatings = ratings
      .map(r => r.aspectRatings?.[aspect])
      .filter(rating => rating != null);
    
    if (aspectRatings.length > 0) {
      aspectStats[aspect] = {
        average: aspectRatings.reduce((sum, rating) => sum + rating, 0) / aspectRatings.length,
        count: aspectRatings.length
      };
    }
  });
  
  // Calculate rating type breakdown
  const ratingTypeBreakdown = {};
  const ratingTypes = [
    'meal_plan', 'chef_performance', 'driver_service', 'delivery_experience',
    'order_satisfaction', 'subscription_service', 'app_experience', 'customer_service'
  ];
  
  ratingTypes.forEach(type => {
    const typeRatings = ratings.filter(r => r.ratingType === type);
    ratingTypeBreakdown[type] = {
      totalRatings: typeRatings.length,
      averageRating: typeRatings.length > 0 
        ? typeRatings.reduce((sum, r) => sum + r.overallRating, 0) / typeRatings.length 
        : 0
    };
  });
  
  // Calculate quality metrics
  const ratingsWithComments = ratings.filter(r => r.comment && r.comment.trim().length > 0).length;
  const averageCommentLength = ratingsWithComments > 0
    ? ratings
        .filter(r => r.comment && r.comment.trim().length > 0)
        .reduce((sum, r) => sum + r.comment.trim().length, 0) / ratingsWithComments
    : 0;
  
  const totalHelpfulVotes = ratings.reduce((sum, r) => sum + r.helpfulVotes.positive + r.helpfulVotes.negative, 0);
  const positiveVotes = ratings.reduce((sum, r) => sum + r.helpfulVotes.positive, 0);
  const helpfulnessScore = totalHelpfulVotes > 0 ? positiveVotes / totalHelpfulVotes : 0;
  
  const flaggedRatings = ratings.filter(r => r.moderationFlags && r.moderationFlags.length > 0).length;
  
  // Calculate trends
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  
  const thisWeekRatings = ratings.filter(r => r.createdAt >= sevenDaysAgo);
  const lastWeekRatings = ratings.filter(r => r.createdAt >= fourteenDaysAgo && r.createdAt < sevenDaysAgo);
  const thisMonthRatings = ratings.filter(r => r.createdAt >= thirtyDaysAgo);
  const lastMonthRatings = ratings.filter(r => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo);
  
  const thisWeekAvg = thisWeekRatings.length > 0 
    ? thisWeekRatings.reduce((sum, r) => sum + r.overallRating, 0) / thisWeekRatings.length 
    : 0;
  const lastWeekAvg = lastWeekRatings.length > 0 
    ? lastWeekRatings.reduce((sum, r) => sum + r.overallRating, 0) / lastWeekRatings.length 
    : 0;
  const thisMonthAvg = thisMonthRatings.length > 0 
    ? thisMonthRatings.reduce((sum, r) => sum + r.overallRating, 0) / thisMonthRatings.length 
    : 0;
  const lastMonthAvg = lastMonthRatings.length > 0 
    ? lastMonthRatings.reduce((sum, r) => sum + r.overallRating, 0) / lastMonthRatings.length 
    : 0;
  
  const weeklyTrend = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0;
  const monthlyTrend = lastMonthAvg > 0 ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100 : 0;
  
  let momentum = 'stable';
  if (weeklyTrend > 5 && monthlyTrend > 2) momentum = 'improving';
  else if (weeklyTrend < -5 && monthlyTrend < -2) momentum = 'declining';
  
  // Find best and worst aspects
  const aspectScores = Object.entries(aspectStats)
    .filter(([_, data]) => data.count >= 5) // Only consider aspects with enough data
    .map(([name, data]) => ({ name, score: data.average }));
  
  aspectScores.sort((a, b) => b.score - a.score);
  const bestAspect = aspectScores[0] || { name: null, score: null };
  const worstAspect = aspectScores[aspectScores.length - 1] || { name: null, score: null };
  
  // Identify improvement areas (aspects with scores < 3.5)
  const improvementAreas = aspectScores
    .filter(aspect => aspect.score < 3.5)
    .slice(0, 3)
    .map(aspect => ({ ...aspect, trend: 'stable' })); // TODO: Calculate actual trends
  
  // Identify strengths (aspects with scores >= 4.0)
  const strengths = aspectScores
    .filter(aspect => aspect.score >= 4.0)
    .slice(0, 3)
    .map(aspect => ({ ...aspect, trend: 'stable' })); // TODO: Calculate actual trends
  
  // Update or create summary
  const summary = await this.findOneAndUpdate(
    { entityId, entityType },
    {
      $set: {
        overallStats: {
          totalRatings,
          averageRating,
          ratingCounts,
          recent30Days: {
            totalRatings: recentRatings.length,
            averageRating: recentAverage
          },
          verifiedRatings: verifiedCount,
          unverifiedRatings: totalRatings - verifiedCount
        },
        aspectStats,
        ratingTypeBreakdown,
        trendingMetrics: {
          weeklyTrend,
          monthlyTrend,
          momentum
        },
        qualityMetrics: {
          averageCommentLength,
          ratingsWithComments,
          helpfulnessScore,
          responseRate: 0, // TODO: Calculate actual response rate
          flaggedRatings
        },
        performanceInsights: {
          bestAspect,
          worstAspect,
          improvementAreas,
          strengths
        },
        lastCalculated: new Date(),
        calculationVersion: '1.0'
      }
    },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
  
  // Update the source entity's rating fields
  try {
    await this.updateSourceEntityRating(entityId, entityType, averageRating, totalRatings);
  } catch (error) {
    console.error('Error updating source entity rating:', error);
    // Don't throw - summary update succeeded even if source update failed
  }
  
  return summary;
};

// Static method to update source entity rating fields
ratingSummarySchema.statics.updateSourceEntityRating = async function(entityId, entityType, averageRating, totalRatings) {
  try {
    switch (entityType) {
      case 'meal_plan':
        const MealPlan = mongoose.model('MealPlan');
        await MealPlan.findByIdAndUpdate(entityId, {
          avgRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          totalReviews: totalRatings,
          lastModified: new Date()
        });
        console.log(`✅ Updated meal plan ${entityId} rating: ${averageRating.toFixed(1)} (${totalRatings} reviews)`);
        break;
        
      case 'chef':
        // Add chef rating update logic here when chef model is available
        try {
          const Chef = mongoose.model('Chef');
          await Chef.findByIdAndUpdate(entityId, {
            avgRating: Math.round(averageRating * 10) / 10,
            totalReviews: totalRatings,
            lastModified: new Date()
          });
          console.log(`✅ Updated chef ${entityId} rating: ${averageRating.toFixed(1)} (${totalRatings} reviews)`);
        } catch (error) {
          console.log(`⚠️  Chef model not found or update failed for ${entityId}`);
        }
        break;
        
      case 'driver':
        // Add driver rating update logic here when driver model is available
        try {
          const Driver = mongoose.model('Driver');
          await Driver.findByIdAndUpdate(entityId, {
            avgRating: Math.round(averageRating * 10) / 10,
            totalReviews: totalRatings,
            lastModified: new Date()
          });
          console.log(`✅ Updated driver ${entityId} rating: ${averageRating.toFixed(1)} (${totalRatings} reviews)`);
        } catch (error) {
          console.log(`⚠️  Driver model not found or update failed for ${entityId}`);
        }
        break;
        
      default:
        console.log(`⚠️  No rating update handler for entity type: ${entityType}`);
        break;
    }
  } catch (error) {
    console.error(`❌ Error updating ${entityType} rating for ${entityId}:`, error);
    throw error;
  }
};

// Static method to get top rated entities
ratingSummarySchema.statics.getTopRated = function(entityType, options = {}) {
  const query = { entityType };
  
  if (options.minRatings) {
    query['overallStats.totalRatings'] = { $gte: options.minRatings };
  }
  
  const sort = {};
  sort[options.sortBy || 'overallStats.averageRating'] = -1;
  
  return this.find(query)
    .sort(sort)
    .limit(options.limit || 10)
    .populate('entityId');
};

// Static method to get entities needing improvement
ratingSummarySchema.statics.getNeedingImprovement = function(entityType, threshold = 3.0) {
  return this.find({
    entityType,
    'overallStats.averageRating': { $lt: threshold },
    'overallStats.totalRatings': { $gte: 5 }
  })
  .sort({ 'overallStats.averageRating': 1 })
  .populate('entityId');
};

// Static method to get trending entities
ratingSummarySchema.statics.getTrending = function(entityType, trendType = 'improving') {
  return this.find({
    entityType,
    'trendingMetrics.momentum': trendType,
    'overallStats.recent30Days.totalRatings': { $gte: 3 }
  })
  .sort({ 'trendingMetrics.weeklyTrend': -1 })
  .populate('entityId');
};

module.exports = mongoose.model('RatingSummary', ratingSummarySchema);