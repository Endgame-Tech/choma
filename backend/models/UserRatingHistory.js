const mongoose = require('mongoose');

const userRatingHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  // Rating behavior tracking
  totalRatingsGiven: {
    type: Number,
    default: 0
  },
  
  lastRatingDate: {
    type: Date
  },
  
  // Prompt behavior tracking
  totalPromptsShown: {
    type: Number,
    default: 0
  },
  
  totalPromptsAccepted: {
    type: Number,
    default: 0
  },
  
  totalPromptsDismissed: {
    type: Number,
    default: 0
  },
  
  lastPromptDate: {
    type: Date
  },
  
  // User preferences
  promptFrequency: {
    type: String,
    enum: ['never', 'minimal', 'normal', 'frequent'],
    default: 'normal'
  },
  
  // Opt-out tracking
  hasOptedOut: {
    type: Boolean,
    default: false
  },
  
  optOutDate: {
    type: Date
  },
  
  // Contextual behavior
  ratingByContext: {
    order_completion: {
      prompted: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      dismissed: { type: Number, default: 0 },
      lastPrompt: { type: Date }
    },
    delivery_completion: {
      prompted: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      dismissed: { type: Number, default: 0 },
      lastPrompt: { type: Date }
    },
    subscription_milestone: {
      prompted: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      dismissed: { type: Number, default: 0 },
      lastPrompt: { type: Date }
    },
    app_session: {
      prompted: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      dismissed: { type: Number, default: 0 },
      lastPrompt: { type: Date }
    }
  },
  
  // User engagement indicators
  avgSessionDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  totalOrders: {
    type: Number,
    default: 0
  },
  
  customerSince: {
    type: Date
  },
  
  // Consecutive dismissals (for backing off)
  consecutiveDismissals: {
    type: Number,
    default: 0
  },
  
  // Ratings quality indicators
  avgRatingGiven: {
    type: Number,
    default: 0
  },
  
  hasGivenDetailedRatings: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
userRatingHistorySchema.index({ userId: 1 }, { unique: true });
userRatingHistorySchema.index({ promptFrequency: 1, hasOptedOut: 1 });
userRatingHistorySchema.index({ lastPromptDate: 1 });
userRatingHistorySchema.index({ consecutiveDismissals: 1 });

// Virtual for response rate
userRatingHistorySchema.virtual('responseRate').get(function() {
  if (this.totalPromptsShown === 0) return 0;
  return (this.totalPromptsAccepted / this.totalPromptsShown) * 100;
});

// Virtual for engagement level
userRatingHistorySchema.virtual('engagementLevel').get(function() {
  const factors = {
    responseRate: this.responseRate,
    avgSessionDuration: Math.min(this.avgSessionDuration / 30, 1) * 100, // normalize to 30 min max
    totalOrders: Math.min(this.totalOrders / 10, 1) * 100, // normalize to 10 orders max
    hasDetailedRatings: this.hasGivenDetailedRatings ? 100 : 0
  };
  
  const avgScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length;
  
  if (avgScore >= 75) return 'high';
  if (avgScore >= 50) return 'medium';
  if (avgScore >= 25) return 'low';
  return 'very_low';
});

// Static method to get or create user rating history
userRatingHistorySchema.statics.getOrCreate = async function(userId) {
  let history = await this.findOne({ userId });
  
  if (!history) {
    // Get user data to initialize
    const Customer = mongoose.model('Customer');
    const user = await Customer.findById(userId);
    
    history = new this({
      userId,
      customerSince: user?.createdAt || new Date(),
      totalOrders: 0 // This would be calculated from actual orders
    });
    
    await history.save();
  }
  
  return history;
};

// Method to record prompt shown
userRatingHistorySchema.methods.recordPromptShown = function(context) {
  this.totalPromptsShown += 1;
  this.lastPromptDate = new Date();
  
  if (this.ratingByContext[context]) {
    this.ratingByContext[context].prompted += 1;
    this.ratingByContext[context].lastPrompt = new Date();
  }
  
  return this.save();
};

// Method to record prompt response
userRatingHistorySchema.methods.recordPromptResponse = function(context, action) {
  if (action === 'completed') {
    this.totalPromptsAccepted += 1;
    this.consecutiveDismissals = 0; // Reset dismissal counter
    
    if (this.ratingByContext[context]) {
      this.ratingByContext[context].completed += 1;
    }
  } else if (action === 'dismissed') {
    this.totalPromptsDismissed += 1;
    this.consecutiveDismissals += 1;
    
    if (this.ratingByContext[context]) {
      this.ratingByContext[context].dismissed += 1;
    }
  }
  
  return this.save();
};

// Method to record rating given
userRatingHistorySchema.methods.recordRatingGiven = function(rating) {
  this.totalRatingsGiven += 1;
  this.lastRatingDate = new Date();
  
  // Update average rating
  this.avgRatingGiven = ((this.avgRatingGiven * (this.totalRatingsGiven - 1)) + rating.overallRating) / this.totalRatingsGiven;
  
  // Check if detailed rating
  if (rating.comment || (rating.aspectRatings && Object.keys(rating.aspectRatings).length > 0)) {
    this.hasGivenDetailedRatings = true;
  }
  
  return this.save();
};

// Method to update user preferences
userRatingHistorySchema.methods.updatePreferences = function(preferences) {
  if (preferences.promptFrequency) {
    this.promptFrequency = preferences.promptFrequency;
  }
  
  if (preferences.hasOptedOut !== undefined) {
    this.hasOptedOut = preferences.hasOptedOut;
    if (preferences.hasOptedOut) {
      this.optOutDate = new Date();
    }
  }
  
  return this.save();
};

// Method to check if user should be prompted
userRatingHistorySchema.methods.shouldPrompt = function(context) {
  // Check if opted out
  if (this.hasOptedOut) {
    return { shouldPrompt: false, reason: 'opted_out' };
  }
  
  // Check consecutive dismissals (back off after 3 dismissals)
  if (this.consecutiveDismissals >= 3) {
    return { shouldPrompt: false, reason: 'too_many_dismissals' };
  }
  
  // Check frequency preferences
  const now = new Date();
  const daysSinceLastPrompt = this.lastPromptDate 
    ? Math.floor((now - this.lastPromptDate) / (1000 * 60 * 60 * 24))
    : 999;
  
  const minDaysBetweenPrompts = {
    never: 999,
    minimal: 14,
    normal: 7,
    frequent: 3
  };
  
  const minDays = minDaysBetweenPrompts[this.promptFrequency];
  if (daysSinceLastPrompt < minDays) {
    return { shouldPrompt: false, reason: 'too_recent', daysSince: daysSinceLastPrompt, minDays };
  }
  
  // Context-specific checks
  const contextData = this.ratingByContext[context];
  if (contextData) {
    const contextDaysSince = contextData.lastPrompt 
      ? Math.floor((now - contextData.lastPrompt) / (1000 * 60 * 60 * 24))
      : 999;
    
    // Context-specific minimums
    const contextMinDays = {
      order_completion: 1,
      delivery_completion: 2,
      subscription_milestone: 7,
      app_session: 3
    };
    
    if (contextDaysSince < contextMinDays[context]) {
      return { shouldPrompt: false, reason: 'context_too_recent', contextDaysSince, contextMinDays: contextMinDays[context] };
    }
  }
  
  return { shouldPrompt: true, reason: 'eligible' };
};

module.exports = mongoose.model('UserRatingHistory', userRatingHistorySchema);