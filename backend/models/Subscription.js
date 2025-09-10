const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  subscriptionId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  mealPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', required: true },
  
  // Meal selection details
  selectedMealTypes: {
    type: [String],
    enum: ['breakfast', 'lunch', 'dinner', 'all'],
    default: ['lunch']
  },
  frequency: { 
    type: String, 
    // Allow for flexible frequency options
    default: 'lunch'
  },
  duration: { 
    type: String, 
    // Allow for flexible duration options
  },
  durationWeeks: {
    type: Number,
    min: 1,
    max: 8,
    default: 1
  },
  
  // Pricing details
  basePlanPrice: { type: Number, default: 0 },
  frequencyMultiplier: { type: Number, default: 1 },
  durationMultiplier: { type: Number, default: 1 },
  
  status: { type: String, enum: ['active', 'paused', 'cancelled', 'expired'], default: 'active' },
  startDate: { type: Date, required: true },
  nextDelivery: Date,
  endDate: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  price: { type: Number, required: true }, // Monthly/weekly price
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed'] },
  paymentReference: String,
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
  
  // Recurring delivery management
  recurringDelivery: {
    // Current meal progression in the plan
    currentMealProgression: {
      weekNumber: { type: Number, default: 1 },
      dayOfWeek: { type: Number, default: 1 },
      mealTime: { type: String, enum: ['breakfast', 'lunch', 'dinner'], default: 'lunch' }
    },
    
    // Last delivered meal tracking
    lastDeliveredMeal: {
      assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlanAssignment' },
      deliveredAt: Date,
      weekNumber: Number,
      dayOfWeek: Number
    },
    
    // Next scheduled delivery
    nextScheduledDelivery: {
      date: Date,
      assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlanAssignment' },
      estimatedTime: String // "12:00-13:00"
    },
    
    // Delivery schedule configuration
    deliverySchedule: {
      daysOfWeek: [{ 
        type: Number, 
        min: 1, 
        max: 7 
      }], // Which days to deliver (1=Monday, 7=Sunday)
      timeSlot: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'custom'],
        default: 'afternoon'
      },
      customTimeRange: {
        start: String, // "12:00"
        end: String    // "14:00"
      }
    },
    
    // Skip management
    skippedDays: [{
      date: Date,
      reason: String,
      skippedBy: { type: String, enum: ['customer', 'chef', 'admin'] }
    }],
    
    // Activation status
    isActivated: { type: Boolean, default: false },
    activatedAt: Date,
    activationDeliveryCompleted: { type: Boolean, default: false }
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

// Static method to find subscriptions ready for next delivery
SubscriptionSchema.statics.findReadyForDelivery = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    status: 'active',
    'recurringDelivery.isActivated': true,
    'recurringDelivery.nextScheduledDelivery.date': { 
      $gte: today, 
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
    }
  }).populate('mealPlanId');
};

// Method to get current meal assignment
SubscriptionSchema.methods.getCurrentMealAssignment = async function() {
  const MealPlanAssignment = require('./MealPlanAssignment');
  const { weekNumber, dayOfWeek, mealTime } = this.recurringDelivery.currentMealProgression;
  
  return await MealPlanAssignment.findOne({
    mealPlanId: this.mealPlanId,
    weekNumber,
    dayOfWeek,
    mealTime
  }).populate('mealIds');
};

// Method to advance to next meal
SubscriptionSchema.methods.advanceToNextMeal = async function() {
  const MealPlan = require('./MealPlan');
  const plan = await MealPlan.findById(this.mealPlanId);
  
  if (!plan) throw new Error('Meal plan not found');
  
  let { weekNumber, dayOfWeek, mealTime } = this.recurringDelivery.currentMealProgression;
  const mealTypes = this.selectedMealTypes || ['lunch'];
  
  // Find next meal time for the day
  const currentMealIndex = mealTypes.indexOf(mealTime);
  if (currentMealIndex < mealTypes.length - 1) {
    // Move to next meal time same day
    mealTime = mealTypes[currentMealIndex + 1];
  } else {
    // Move to first meal of next day
    mealTime = mealTypes[0];
    dayOfWeek += 1;
    
    if (dayOfWeek > 7) {
      // Move to next week
      dayOfWeek = 1;
      weekNumber += 1;
      
      if (weekNumber > plan.durationWeeks) {
        // Restart meal plan cycle
        weekNumber = 1;
      }
    }
  }
  
  this.recurringDelivery.currentMealProgression = { weekNumber, dayOfWeek, mealTime };
  return this.save();
};

// Method to activate subscription after first delivery
SubscriptionSchema.methods.activate = function() {
  this.recurringDelivery.isActivated = true;
  this.recurringDelivery.activatedAt = new Date();
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
