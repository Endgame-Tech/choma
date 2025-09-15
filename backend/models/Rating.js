const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  // Universal rating fields
  ratingType: {
    type: String,
    enum: [
      'meal_plan',           // Rating a meal plan
      'chef_performance',    // Customer rating chef
      'driver_service',      // Customer rating driver
      'delivery_experience', // Overall delivery rating
      'order_satisfaction',  // Overall order rating
      'subscription_service', // Subscription experience
      'app_experience',      // Mobile app rating
      'customer_service'     // Support interaction rating
    ],
    required: true,
    index: true
  },
  
  // Who is giving the rating
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  ratedByType: {
    type: String,
    enum: ['customer', 'chef', 'driver', 'admin'],
    required: true,
    index: true
  },
  
  // What/who is being rated
  ratedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  ratedEntityType: {
    type: String,
    enum: ['meal_plan', 'chef', 'driver', 'order', 'subscription', 'delivery', 'app', 'support_ticket'],
    required: true,
    index: true
  },
  
  // Core rating data
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(v) {
        return v >= 1 && v <= 5 && (v * 2) % 1 === 0; // Allow 0.5 increments
      },
      message: 'Rating must be between 1-5 in 0.5 increments'
    }
  },
  
  // Aspect-specific ratings (flexible structure)
  aspectRatings: {
    // Meal Plan aspects
    taste: { type: Number, min: 1, max: 5 },
    presentation: { type: Number, min: 1, max: 5 },
    portionSize: { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
    healthiness: { type: Number, min: 1, max: 5 },
    
    // Chef aspects
    cookingQuality: { type: Number, min: 1, max: 5 },
    consistency: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    punctuality: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 },
    
    // Driver aspects
    timeliness: { type: Number, min: 1, max: 5 },
    courteous: { type: Number, min: 1, max: 5 },
    packaging: { type: Number, min: 1, max: 5 },
    tracking: { type: Number, min: 1, max: 5 },
    
    // Delivery aspects
    temperature: { type: Number, min: 1, max: 5 },
    condition: { type: Number, min: 1, max: 5 },
    accuracy: { type: Number, min: 1, max: 5 },
    
    // App aspects
    easeOfUse: { type: Number, min: 1, max: 5 },
    performance: { type: Number, min: 1, max: 5 },
    design: { type: Number, min: 1, max: 5 },
    features: { type: Number, min: 1, max: 5 }
  },
  
  // Textual feedback
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Context information
  contextData: {
    // Order/delivery specific
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringSubscription' },
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionDelivery' },
    mealAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealAssignment' },
    
    // Meal plan specific
    mealPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan' },
    
    // Support specific
    supportTicketId: { type: mongoose.Schema.Types.ObjectId },
    
    // Device/platform context
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    appVersion: { type: String },
    
    // Timing context
    timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'] },
    dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }
  },
  
  // Rating metadata
  isVerifiedExperience: {
    type: Boolean,
    default: false // True if we can verify the user actually experienced what they're rating
  },
  
  isPublic: {
    type: Boolean,
    default: true // Whether this rating should be shown publicly
  },
  
  status: {
    type: String,
    enum: ['active', 'hidden', 'flagged', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Moderation
  moderationFlags: [{
    flag: { type: String, enum: ['inappropriate', 'spam', 'fake', 'offensive'] },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId },
    flaggedAt: { type: Date, default: Date.now },
    reason: { type: String }
  }],
  
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  moderatedAt: {
    type: Date
  },
  
  // Response from rated entity (e.g., chef response to rating)
  response: {
    text: { type: String, maxlength: 500 },
    respondedBy: { type: mongoose.Schema.Types.ObjectId },
    respondedAt: { type: Date }
  },
  
  // Analytics tracking
  helpfulVotes: {
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 }
  },
  
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Calculate aspect average if aspects exist
      if (ret.aspectRatings) {
        const validAspects = Object.values(ret.aspectRatings).filter(rating => rating != null);
        if (validAspects.length > 0) {
          ret.aspectAverage = validAspects.reduce((sum, rating) => sum + rating, 0) / validAspects.length;
        }
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
ratingSchema.index({ ratedEntity: 1, ratedEntityType: 1, status: 1 });
ratingSchema.index({ ratedBy: 1, ratedByType: 1, createdAt: -1 });
ratingSchema.index({ ratingType: 1, overallRating: -1, createdAt: -1 });
ratingSchema.index({ ratedEntity: 1, ratingType: 1, status: 1, createdAt: -1 });
ratingSchema.index({ isVerifiedExperience: 1, status: 1, overallRating: -1 });

// Ensure one rating per user per specific context
ratingSchema.index(
  { 
    ratedBy: 1, 
    ratedEntity: 1, 
    ratingType: 1,
    'contextData.orderId': 1,
    'contextData.deliveryId': 1
  }, 
  { 
    unique: true,
    partialFilterExpression: { 
      status: 'active',
      $or: [
        { 'contextData.orderId': { $exists: true } },
        { 'contextData.deliveryId': { $exists: true } }
      ]
    }
  }
);

// Virtual for helpfulness score
ratingSchema.virtual('helpfulnessScore').get(function() {
  const total = this.helpfulVotes.positive + this.helpfulVotes.negative;
  if (total === 0) return 0;
  return this.helpfulVotes.positive / total;
});

// Virtual for rating age
ratingSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to get rating statistics for an entity
ratingSchema.statics.getEntityStats = async function(entityId, entityType, options = {}) {
  const matchStage = {
    ratedEntity: new mongoose.Types.ObjectId(entityId),
    ratedEntityType: entityType,
    status: 'active'
  };
  
  if (options.ratingType) {
    matchStage.ratingType = options.ratingType;
  }
  
  if (options.since) {
    matchStage.createdAt = { $gte: options.since };
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        averageRating: { $avg: '$overallRating' },
        ratingDistribution: {
          $push: '$overallRating'
        },
        // Aspect averages
        avgTaste: { $avg: '$aspectRatings.taste' },
        avgPresentation: { $avg: '$aspectRatings.presentation' },
        avgPortionSize: { $avg: '$aspectRatings.portionSize' },
        avgValueForMoney: { $avg: '$aspectRatings.valueForMoney' },
        avgHealthiness: { $avg: '$aspectRatings.healthiness' },
        avgCookingQuality: { $avg: '$aspectRatings.cookingQuality' },
        avgConsistency: { $avg: '$aspectRatings.consistency' },
        avgCommunication: { $avg: '$aspectRatings.communication' },
        avgPunctuality: { $avg: '$aspectRatings.punctuality' },
        avgProfessionalism: { $avg: '$aspectRatings.professionalism' },
        avgTimeliness: { $avg: '$aspectRatings.timeliness' },
        avgCourteous: { $avg: '$aspectRatings.courteous' },
        avgPackaging: { $avg: '$aspectRatings.packaging' },
        avgTracking: { $avg: '$aspectRatings.tracking' },
        avgTemperature: { $avg: '$aspectRatings.temperature' },
        avgCondition: { $avg: '$aspectRatings.condition' },
        avgAccuracy: { $avg: '$aspectRatings.accuracy' },
        
        // Recent ratings
        recentRatings: {
          $push: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              '$overallRating',
              '$$REMOVE'
            ]
          }
        }
      }
    },
    {
      $addFields: {
        // Calculate rating distribution
        ratingCounts: {
          '5': {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $gte: ['$$this', 4.5] }
              }
            }
          },
          '4': {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $and: [{ $gte: ['$$this', 3.5] }, { $lt: ['$$this', 4.5] }] }
              }
            }
          },
          '3': {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $and: [{ $gte: ['$$this', 2.5] }, { $lt: ['$$this', 3.5] }] }
              }
            }
          },
          '2': {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $and: [{ $gte: ['$$this', 1.5] }, { $lt: ['$$this', 2.5] }] }
              }
            }
          },
          '1': {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $lt: ['$$this', 1.5] }
              }
            }
          }
        },
        recentAverageRating: { $avg: '$recentRatings' },
        recentRatingCount: { $size: '$recentRatings' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalRatings: 0,
    averageRating: 0,
    ratingCounts: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    recentAverageRating: 0,
    recentRatingCount: 0
  };
};

// Static method to get trending ratings (high engagement)
ratingSchema.statics.getTrendingRatings = function(entityType, limit = 10) {
  return this.find({
    ratedEntityType: entityType,
    status: 'active',
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  })
  .sort({
    helpfulnessScore: -1,
    viewCount: -1,
    createdAt: -1
  })
  .limit(limit)
  .populate('ratedEntity')
  .populate('ratedBy', 'name email');
};

// Instance method to verify the experience
ratingSchema.methods.verifyExperience = async function() {
  // Logic to verify if the rater actually had the experience they're rating
  // This would check against orders, deliveries, etc.
  
  if (this.contextData.orderId) {
    const Order = mongoose.model('Order');
    const order = await Order.findOne({
      _id: this.contextData.orderId,
      userId: this.ratedBy
    });
    
    if (order && order.status === 'completed') {
      this.isVerifiedExperience = true;
      return true;
    }
  }
  
  if (this.contextData.subscriptionId) {
    const RecurringSubscription = mongoose.model('RecurringSubscription');
    const subscription = await RecurringSubscription.findOne({
      _id: this.contextData.subscriptionId,
      userId: this.ratedBy
    });
    
    if (subscription) {
      this.isVerifiedExperience = true;
      return true;
    }
  }
  
  return false;
};

// Pre-save middleware
ratingSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Auto-verify experience for new ratings
    await this.verifyExperience();
  }
  next();
});

// Post-save middleware to trigger rating summary updates
ratingSchema.post('save', async function(doc) {
  // Trigger rating summary recalculation
  const RatingSummary = mongoose.model('RatingSummary');
  await RatingSummary.updateEntitySummary(doc.ratedEntity, doc.ratedEntityType);
});

module.exports = mongoose.model('Rating', ratingSchema);