const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  subscriptionId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  mealPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', required: true },
  frequency: { type: String, enum: ['Daily', 'Twice Daily', 'Thrice Daily'] },
  duration: { type: String, enum: ['Weekly', 'Monthly'] },
  status: { type: String, enum: ['active', 'paused', 'cancelled', 'expired'], default: 'active' },
  startDate: { type: Date, required: true },
  nextDelivery: Date,
  endDate: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  price: { type: Number, required: true }, // Monthly/weekly price
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed'] },
  deliveryAddress: String,
  specialInstructions: String,
  
  // Additional fields for dashboard functionality
  renewalType: {
    type: String,
    enum: ['weekly', 'monthly', 'one-time'],
    default: 'monthly'
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'transfer', 'cash'],
    default: 'paystack'
  },
  transactionId: {
    type: String,
    required: true
  },
  
  // Pause/Resume tracking
  pausedAt: Date,
  resumedAt: Date,
  pauseReason: String,
  
  // Cancellation tracking
  cancelledAt: Date,
  cancellationReason: String,
  
  // Renewal tracking
  autoRenewal: { type: Boolean, default: false },
  renewalNotificationSent: { type: Boolean, default: false },
  
  // Delivery preferences
  deliveryPreferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly'],
      default: 'weekly'
    },
    preferredTime: {
      type: String,
      default: 'morning' // morning, afternoon, evening
    },
    deliveryInstructions: String
  },
  
  // Customization options
  customization: {
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
    }
  },
  
  // Feedback and ratings
  feedback: [{
    date: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    mealPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPlan'
    }
  }],
  
  // Subscription metrics
  metrics: {
    totalMealsDelivered: { type: Number, default: 0 },
    totalMealsMissed: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    consecutiveDays: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  
  createdDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ status: 1 });

// Virtual for calculating days remaining
SubscriptionSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const endDate = new Date(this.endDate);
  return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
});

// Virtual for calculating progress percentage
SubscriptionSchema.virtual('progressPercentage').get(function() {
  const totalDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  const daysCompleted = totalDays - this.daysRemaining;
  return Math.round((daysCompleted / totalDays) * 100);
});

// Method to check if subscription is active
SubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

// Method to pause subscription
SubscriptionSchema.methods.pause = function(reason) {
  this.status = 'paused';
  this.pausedAt = new Date();
  this.pauseReason = reason;
  return this.save();
};

// Method to resume subscription
SubscriptionSchema.methods.resume = function() {
  this.status = 'active';
  this.resumedAt = new Date();
  this.pausedAt = undefined;
  this.pauseReason = undefined;
  return this.save();
};

// Static method to find active subscriptions
SubscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({
    status: 'active',
    endDate: { $gte: new Date() }
  });
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
