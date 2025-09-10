const mongoose = require('mongoose');

const RecurringSubscriptionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true,
    index: true
  },
  mealPlanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MealPlan', 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ['active', 'paused', 'cancelled', 'expired'], 
    default: 'active',
    index: true
  },
  
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
    default: 'daily'
  },
  
  deliverySchedule: {
    timeSlot: {
      start: { type: String, required: true }, // "12:00"
      end: { type: String, required: true }    // "14:00"
    },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    area: String,
    specialInstructions: String
  },
  
  startDate: { 
    type: Date, 
    required: true,
    index: true
  },
  
  nextDeliveryDate: { 
    type: Date, 
    required: true,
    index: true
  },
  
  endDate: Date,
  
  // Pricing
  totalPrice: { type: Number, default: 0 },
  pricePerMeal: { type: Number, default: 0 },
  
  // Payment tracking
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'pending', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentReference: String,
  transactionId: String,
  
  // Pause/Resume tracking
  pausedAt: Date,
  resumedAt: Date,
  pauseReason: String,
  
  // Cancellation tracking
  cancelledAt: Date,
  cancellationReason: String,
  
  // Auto-renewal
  autoRenewal: { type: Boolean, default: true },
  
  // Meal preferences
  dietaryPreferences: [String],
  allergens: [String],
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot'],
    default: 'medium'
  },
  portionSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  
  // Delivery preferences
  deliveryPreferences: {
    preferredTime: String,
    deliveryInstructions: String,
    contactPreference: {
      type: String,
      enum: ['phone', 'whatsapp', 'sms'],
      default: 'phone'
    }
  },
  
  // Skip tracking
  skippedDeliveries: [{
    date: Date,
    reason: String,
    skippedBy: { 
      type: String, 
      enum: ['customer', 'chef', 'admin', 'system'] 
    },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Subscription metrics
  metrics: {
    totalMealsDelivered: { type: Number, default: 0 },
    totalMealsMissed: { type: Number, default: 0 },
    totalMealsSkipped: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    lateDeliveries: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    consecutiveDeliveryDays: { type: Number, default: 0 },
    lastDeliveryDate: Date,
    customerSatisfactionScore: { type: Number, default: 0 }
  },
  
  // Notifications
  notificationSettings: {
    smsReminders: { type: Boolean, default: true },
    whatsappReminders: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    deliveryUpdates: { type: Boolean, default: true },
    reminderMinutesBeforeDelivery: { type: Number, default: 60 }
  },
  
  // Customer feedback
  feedback: [{
    date: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    deliveryId: mongoose.Schema.Types.ObjectId,
    responseToFeedback: String,
    respondedAt: Date
  }],
  
  // Admin notes
  adminNotes: [{
    date: { type: Date, default: Date.now },
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    category: {
      type: String,
      enum: ['general', 'complaint', 'compliment', 'payment_issue', 'delivery_issue'],
      default: 'general'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
RecurringSubscriptionSchema.index({ userId: 1, status: 1 });
RecurringSubscriptionSchema.index({ status: 1, nextDeliveryDate: 1 });
RecurringSubscriptionSchema.index({ mealPlanId: 1, status: 1 });
RecurringSubscriptionSchema.index({ createdAt: -1 });
RecurringSubscriptionSchema.index({ 'deliverySchedule.area': 1 });

// Virtual for subscription duration
RecurringSubscriptionSchema.virtual('subscriptionDuration').get(function() {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days active
RecurringSubscriptionSchema.virtual('daysActive').get(function() {
  const endDate = this.endDate || new Date();
  return Math.ceil((endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for completion rate
RecurringSubscriptionSchema.virtual('completionRate').get(function() {
  const totalExpected = this.metrics.totalMealsDelivered + this.metrics.totalMealsMissed + this.metrics.totalMealsSkipped;
  if (totalExpected === 0) return 0;
  return Math.round((this.metrics.totalMealsDelivered / totalExpected) * 100);
});

// Method to check if subscription is active
RecurringSubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && (!this.endDate || this.endDate > new Date());
};

// Method to pause subscription
RecurringSubscriptionSchema.methods.pause = function(reason) {
  this.status = 'paused';
  this.pausedAt = new Date();
  this.pauseReason = reason || 'No reason provided';
  return this.save();
};

// Method to resume subscription
RecurringSubscriptionSchema.methods.resume = function() {
  this.status = 'active';
  this.resumedAt = new Date();
  // Don't clear pausedAt and pauseReason for historical tracking
  return this.save();
};

// Method to cancel subscription
RecurringSubscriptionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason || 'No reason provided';
  return this.save();
};

// Method to skip next delivery
RecurringSubscriptionSchema.methods.skipNextDelivery = function(reason, skippedBy = 'customer') {
  this.skippedDeliveries.push({
    date: this.nextDeliveryDate,
    reason: reason || 'No reason provided',
    skippedBy
  });
  
  // Update metrics
  this.metrics.totalMealsSkipped += 1;
  
  // Calculate next delivery date based on frequency
  this.calculateNextDeliveryDate();
  
  return this.save();
};

// Method to calculate next delivery date
RecurringSubscriptionSchema.methods.calculateNextDeliveryDate = function() {
  const current = this.nextDeliveryDate || new Date();
  let nextDate = new Date(current);
  
  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  this.nextDeliveryDate = nextDate;
};

// Method to add feedback
RecurringSubscriptionSchema.methods.addFeedback = function(rating, comment, deliveryId) {
  this.feedback.push({
    rating,
    comment,
    deliveryId
  });
  
  // Update metrics
  this.metrics.totalRatings += 1;
  this.metrics.averageRating = (
    (this.metrics.averageRating * (this.metrics.totalRatings - 1)) + rating
  ) / this.metrics.totalRatings;
  
  return this.save();
};

// Method to update delivery metrics
RecurringSubscriptionSchema.methods.updateDeliveryMetrics = function(delivered, onTime = true) {
  if (delivered) {
    this.metrics.totalMealsDelivered += 1;
    if (onTime) {
      this.metrics.onTimeDeliveries += 1;
    } else {
      this.metrics.lateDeliveries += 1;
    }
    this.metrics.lastDeliveryDate = new Date();
    
    // Update consecutive days if daily frequency
    if (this.frequency === 'daily') {
      this.metrics.consecutiveDeliveryDays += 1;
    }
  } else {
    this.metrics.totalMealsMissed += 1;
    // Reset consecutive days on missed delivery
    this.metrics.consecutiveDeliveryDays = 0;
  }
};

// Static method to find active subscriptions
RecurringSubscriptionSchema.statics.findActiveSubscriptions = function(filters = {}) {
  return this.find({
    status: 'active',
    ...filters
  }).populate('userId', 'name email phone')
    .populate('mealPlanId', 'title price chef');
};

// Static method to find subscriptions due for delivery
RecurringSubscriptionSchema.statics.findDueForDelivery = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    status: 'active',
    nextDeliveryDate: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).populate('userId mealPlanId');
};

// Static method to get subscriptions by area
RecurringSubscriptionSchema.statics.findByArea = function(area) {
  return this.find({
    'deliverySchedule.area': { $regex: area, $options: 'i' },
    status: 'active'
  });
};

// Pre-save middleware to calculate next delivery date
RecurringSubscriptionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('frequency') || this.isModified('nextDeliveryDate')) {
    if (!this.nextDeliveryDate) {
      this.nextDeliveryDate = this.startDate || new Date();
    }
  }
  next();
});

// Pre-save middleware to update area from address
RecurringSubscriptionSchema.pre('save', function(next) {
  if (this.isModified('deliverySchedule.address') && !this.deliverySchedule.area) {
    // Extract area from address (simple extraction)
    const address = this.deliverySchedule.address;
    const parts = address.split(',');
    if (parts.length >= 2) {
      this.deliverySchedule.area = parts[parts.length - 2].trim();
    }
  }
  next();
});

module.exports = mongoose.model('RecurringSubscription', RecurringSubscriptionSchema);