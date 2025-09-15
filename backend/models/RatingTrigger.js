const mongoose = require('mongoose');

const ratingTriggerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  // Trigger information
  triggerType: {
    type: String,
    enum: [
      'order_completion',
      'delivery_completion', 
      'subscription_milestone',
      'app_session_end',
      'chef_interaction',
      'driver_interaction',
      'subscription_pause',
      'subscription_resume',
      'subscription_cancel',
      'support_interaction',
      'payment_completion'
    ],
    required: true,
    index: true
  },
  
  // Related entities
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  relatedSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringSubscription'  
  },
  
  relatedChefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef'
  },
  
  relatedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  
  // Trigger context
  triggerContext: {
    // Order completion context
    orderValue: { type: Number },
    orderRating: { type: Number }, // If order was rated previously
    isFirstOrder: { type: Boolean },
    isRecurringOrder: { type: Boolean },
    
    // Delivery context  
    deliveryDate: { type: Date },
    deliveryRating: { type: Number },
    wasOnTime: { type: Boolean },
    deliveryIssues: [{ type: String }],
    
    // Subscription context
    subscriptionDay: { type: Number },
    subscriptionWeek: { type: Number },
    isMilestone: { type: Boolean }, // Day 1, 7, 14, 30, etc.
    totalMealsReceived: { type: Number },
    
    // Session context
    sessionDuration: { type: Number }, // in minutes
    actionsPerformed: [{ type: String }],
    screenViews: [{ type: String }],
    
    // Interaction context
    interactionRating: { type: Number },
    interactionType: { type: String },
    issueResolved: { type: Boolean }
  },
  
  // Trigger evaluation
  triggerScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  triggerReason: {
    type: String
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'evaluated', 'prompted', 'dismissed', 'completed', 'skipped'],
    default: 'pending',
    index: true
  },
  
  evaluatedAt: {
    type: Date
  },
  
  promptedAt: {
    type: Date
  },
  
  respondedAt: {
    type: Date
  },
  
  // Prompt decision
  shouldPrompt: {
    type: Boolean,
    default: false
  },
  
  promptDecisionReason: {
    type: String
  },
  
  // Delay logic
  scheduledPromptTime: {
    type: Date
  },
  
  actualPromptTime: {
    type: Date
  },
  
  promptDelay: {
    type: Number // in minutes
  },
  
  // Results
  promptResponse: {
    type: String,
    enum: ['completed', 'dismissed', 'postponed']
  },
  
  ratingCreated: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating'
  },
  
  // Analytics
  promptEffectiveness: {
    type: Number, // 0-100 score
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
ratingTriggerSchema.index({ userId: 1, triggerType: 1, createdAt: -1 });
ratingTriggerSchema.index({ status: 1, scheduledPromptTime: 1 });
ratingTriggerSchema.index({ triggerType: 1, shouldPrompt: 1, createdAt: -1 });
ratingTriggerSchema.index({ userId: 1, status: 1 });

// Virtual for time since trigger
ratingTriggerSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60));
});

// Virtual for prompt delay actual vs scheduled
ratingTriggerSchema.virtual('promptDelayAccuracy').get(function() {
  if (!this.actualPromptTime || !this.scheduledPromptTime) return null;
  
  const scheduledDelay = this.scheduledPromptTime - this.createdAt;
  const actualDelay = this.actualPromptTime - this.createdAt;
  
  return Math.abs(scheduledDelay - actualDelay) / (1000 * 60); // in minutes
});

// Static method to create trigger from event
ratingTriggerSchema.statics.createFromEvent = async function(eventData) {
  const {
    userId,
    triggerType,
    relatedOrderId,
    relatedSubscriptionId,
    relatedChefId,
    relatedDriverId,
    triggerContext = {}
  } = eventData;
  
  // Calculate trigger score based on context
  const triggerScore = this.calculateTriggerScore(triggerType, triggerContext);
  
  const trigger = new this({
    userId,
    triggerType,
    relatedOrderId,
    relatedSubscriptionId,
    relatedChefId,
    relatedDriverId,
    triggerContext,
    triggerScore,
    triggerReason: this.generateTriggerReason(triggerType, triggerContext, triggerScore)
  });
  
  await trigger.save();
  return trigger;
};

// Static method to calculate trigger score
ratingTriggerSchema.statics.calculateTriggerScore = function(triggerType, context) {
  let score = 50; // base score
  
  switch (triggerType) {
    case 'order_completion':
      if (context.isFirstOrder) score += 20;
      if (context.orderValue > 50) score += 10;
      if (context.orderRating && context.orderRating >= 4) score += 15;
      break;
      
    case 'delivery_completion':
      if (context.wasOnTime) score += 15;
      if (context.deliveryIssues && context.deliveryIssues.length === 0) score += 10;
      if (context.deliveryRating && context.deliveryRating >= 4) score += 15;
      break;
      
    case 'subscription_milestone':
      if (context.isMilestone) score += 25;
      if (context.subscriptionDay === 1) score += 30; // First delivery
      if (context.subscriptionDay === 7) score += 20; // First week
      if (context.subscriptionDay === 30) score += 15; // First month
      break;
      
    case 'app_session_end':
      if (context.sessionDuration > 5) score += 10;
      if (context.actionsPerformed && context.actionsPerformed.length > 3) score += 10;
      break;
      
    case 'chef_interaction':
    case 'driver_interaction':
      if (context.interactionRating && context.interactionRating >= 4) score += 20;
      if (context.issueResolved) score += 15;
      break;
  }
  
  return Math.min(100, Math.max(0, score));
};

// Static method to generate trigger reason
ratingTriggerSchema.statics.generateTriggerReason = function(triggerType, context, score) {
  const reasons = [];
  
  switch (triggerType) {
    case 'order_completion':
      reasons.push('Order completed successfully');
      if (context.isFirstOrder) reasons.push('First order experience');
      if (context.orderValue > 50) reasons.push('High-value order');
      break;
      
    case 'delivery_completion':
      reasons.push('Delivery completed');
      if (context.wasOnTime) reasons.push('On-time delivery');
      if (context.deliveryIssues && context.deliveryIssues.length === 0) reasons.push('No delivery issues');
      break;
      
    case 'subscription_milestone':
      if (context.subscriptionDay === 1) reasons.push('First meal delivery');
      else if (context.subscriptionDay === 7) reasons.push('First week milestone');
      else if (context.subscriptionDay === 30) reasons.push('First month milestone');
      else if (context.isMilestone) reasons.push('Subscription milestone reached');
      break;
      
    case 'app_session_end':
      reasons.push('Active app session ended');
      if (context.sessionDuration > 10) reasons.push('Extended session');
      break;
  }
  
  return reasons.join(', ') + ` (Score: ${score})`;
};

// Method to evaluate if should prompt
ratingTriggerSchema.methods.evaluate = async function() {
  const UserRatingHistory = mongoose.model('UserRatingHistory');
  const userHistory = await UserRatingHistory.getOrCreate(this.userId);
  
  // Get prompt eligibility
  const eligibility = userHistory.shouldPrompt(this.triggerType);
  
  this.shouldPrompt = eligibility.shouldPrompt;
  this.promptDecisionReason = eligibility.reason;
  this.evaluatedAt = new Date();
  this.status = 'evaluated';
  
  // Calculate scheduled prompt time based on trigger type and score
  if (this.shouldPrompt) {
    this.scheduledPromptTime = this.calculateOptimalPromptTime();
  }
  
  await this.save();
  return this;
};

// Method to calculate optimal prompt time
ratingTriggerSchema.methods.calculateOptimalPromptTime = function() {
  const now = new Date();
  let delayMinutes = 0;
  
  switch (this.triggerType) {
    case 'order_completion':
      // Immediate to 5 minutes based on score
      delayMinutes = Math.max(0, 5 - (this.triggerScore / 20));
      break;
      
    case 'delivery_completion':  
      // 5-30 minutes based on score
      delayMinutes = Math.max(5, 30 - (this.triggerScore / 4));
      break;
      
    case 'subscription_milestone':
      // 1-60 minutes based on milestone importance
      if (this.triggerContext.subscriptionDay === 1) delayMinutes = 1;
      else if (this.triggerContext.subscriptionDay === 7) delayMinutes = 5;
      else delayMinutes = Math.max(10, 60 - this.triggerScore);
      break;
      
    case 'app_session_end':
      // Immediate for high engagement
      delayMinutes = this.triggerScore > 80 ? 0 : 5;
      break;
      
    default:
      delayMinutes = 5;
  }
  
  this.promptDelay = delayMinutes;
  return new Date(now.getTime() + delayMinutes * 60 * 1000);
};

// Method to record prompt shown
ratingTriggerSchema.methods.recordPromptShown = async function() {
  this.status = 'prompted';
  this.promptedAt = new Date();
  this.actualPromptTime = new Date();
  
  // Update user history
  const UserRatingHistory = mongoose.model('UserRatingHistory');
  const userHistory = await UserRatingHistory.getOrCreate(this.userId);
  await userHistory.recordPromptShown(this.triggerType);
  
  await this.save();
  return this;
};

// Method to record prompt response
ratingTriggerSchema.methods.recordResponse = async function(response, ratingId = null) {
  this.promptResponse = response;
  this.respondedAt = new Date();
  this.status = response === 'completed' ? 'completed' : 'dismissed';
  
  if (ratingId) {
    this.ratingCreated = ratingId;
  }
  
  // Calculate effectiveness
  this.promptEffectiveness = this.calculateEffectiveness(response);
  
  // Update user history
  const UserRatingHistory = mongoose.model('UserRatingHistory');
  const userHistory = await UserRatingHistory.getOrCreate(this.userId);
  await userHistory.recordPromptResponse(this.triggerType, response);
  
  await this.save();
  return this;
};

// Method to calculate prompt effectiveness
ratingTriggerSchema.methods.calculateEffectiveness = function(response) {
  let effectiveness = this.triggerScore;
  
  if (response === 'completed') {
    effectiveness = Math.min(100, effectiveness + 20);
  } else if (response === 'dismissed') {
    effectiveness = Math.max(0, effectiveness - 30);
  } else if (response === 'postponed') {
    effectiveness = Math.max(0, effectiveness - 10);
  }
  
  // Adjust based on timing
  const promptDelayAccuracy = this.promptDelayAccuracy;
  if (promptDelayAccuracy !== null && promptDelayAccuracy < 5) {
    effectiveness += 5; // Bonus for good timing
  }
  
  return effectiveness;
};

// Static method to get pending prompts
ratingTriggerSchema.statics.getPendingPrompts = function() {
  return this.find({
    status: 'evaluated',
    shouldPrompt: true,
    scheduledPromptTime: { $lte: new Date() }
  }).sort({ scheduledPromptTime: 1 });
};

// Static method to get analytics
ratingTriggerSchema.statics.getAnalytics = async function(timeframe = '30d') {
  const daysAgo = parseInt(timeframe.replace('d', ''));
  const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  const analytics = await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$triggerType',
        totalTriggers: { $sum: 1 },
        totalPrompted: { $sum: { $cond: ['$shouldPrompt', 1, 0] } },
        totalCompleted: { $sum: { $cond: [{ $eq: ['$promptResponse', 'completed'] }, 1, 0] } },
        totalDismissed: { $sum: { $cond: [{ $eq: ['$promptResponse', 'dismissed'] }, 1, 0] } },
        avgTriggerScore: { $avg: '$triggerScore' },
        avgEffectiveness: { $avg: '$promptEffectiveness' }
      }
    },
    {
      $addFields: {
        promptRate: { $divide: ['$totalPrompted', '$totalTriggers'] },
        completionRate: { $divide: ['$totalCompleted', '$totalPrompted'] },
        dismissalRate: { $divide: ['$totalDismissed', '$totalPrompted'] }
      }
    }
  ]);
  
  return analytics;
};

module.exports = mongoose.model('RatingTrigger', ratingTriggerSchema);