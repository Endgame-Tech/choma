const mongoose = require('mongoose');

/**
 * SubscriptionChefAssignment Model
 * Manages long-term chef assignments to subscriptions
 * Tracks chef performance and workload for recurring deliveries
 */
const SubscriptionChefAssignmentSchema = new mongoose.Schema({
  assignmentId: { 
    type: String, 
    unique: true 
  },
  
  // Core references
  subscriptionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subscription', 
    required: true 
  },
  chefId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chef', 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  mealPlanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MealPlan', 
    required: true 
  },
  
  // Assignment details
  assignmentStatus: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled', 'reassigned'],
    default: 'active'
  },
  
  // Assignment timeline
  assignedAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  completedAt: Date,
  
  // Assignment details
  assignmentDetails: {
    assignedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin',
      required: true
    },
    assignmentReason: {
      type: String,
      enum: ['new_subscription', 'chef_reassignment', 'workload_balancing', 'chef_request', 'admin_decision'],
      default: 'new_subscription'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    specialInstructions: String,
    adminNotes: String
  },
  
  // Chef workload tracking
  workload: {
    totalMealsAssigned: { type: Number, default: 0 },
    totalMealsCompleted: { type: Number, default: 0 },
    totalMealsPending: { type: Number, default: 0 },
    currentWeekMeals: { type: Number, default: 0 },
    maxDailyCapacity: { type: Number, default: 10 }, // Chef's daily meal limit
    estimatedWeeklyHours: { type: Number, default: 0 }
  },
  
  // Performance metrics
  performance: {
    totalDeliveries: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    lateDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    averagePreparationTime: { type: Number, default: 0 }, // minutes
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    lastDeliveryDate: Date,
    consistencyScore: { type: Number, default: 100 } // 0-100 score
  },
  
  // Customer-Chef relationship
  relationship: {
    customerSatisfaction: { type: Number, default: 0 }, // 1-5 rating
    totalFeedbacks: { type: Number, default: 0 },
    positiveFeedbacks: { type: Number, default: 0 },
    negativeFeedbacks: { type: Number, default: 0 },
    lastFeedbackDate: Date,
    preferredCommunicationMethod: {
      type: String,
      enum: ['app', 'sms', 'call', 'none'],
      default: 'app'
    }
  },
  
  // Financial tracking
  earnings: {
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    paidEarnings: { type: Number, default: 0 },
    averageEarningsPerMeal: { type: Number, default: 0 },
    lastPaymentDate: Date,
    paymentMethod: String
  },
  
  // Delivery schedule management
  deliverySchedule: {
    daysOfWeek: [{ 
      type: Number, 
      min: 1, 
      max: 7 
    }], // Which days chef works for this subscription
    preferredTimeSlots: [{
      start: String, // "09:00"
      end: String,   // "11:00"
      mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner'] }
    }],
    blackoutDates: [Date], // Dates chef is unavailable
    holidaySchedule: mongoose.Schema.Types.Mixed
  },
  
  // Communication log
  communications: [{
    date: { type: Date, default: Date.now },
    type: { 
      type: String, 
      enum: ['message', 'call', 'feedback', 'complaint', 'compliment', 'instruction'] 
    },
    from: { type: String, enum: ['customer', 'chef', 'admin'] },
    to: { type: String, enum: ['customer', 'chef', 'admin'] },
    subject: String,
    message: String,
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    resolved: { type: Boolean, default: false }
  }],
  
  // Quality assurance
  qualityChecks: [{
    date: { type: Date, default: Date.now },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    checklist: {
      foodQuality: { type: Number, min: 1, max: 5 },
      presentation: { type: Number, min: 1, max: 5 },
      portionSize: { type: Number, min: 1, max: 5 },
      packaging: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 }
    },
    overallScore: { type: Number, min: 1, max: 5 },
    notes: String,
    actionItems: [String],
    followUpRequired: { type: Boolean, default: false }
  }],
  
  // Replacement/Reassignment tracking
  reassignment: {
    isReassignmentRequested: { type: Boolean, default: false },
    requestedBy: { type: String, enum: ['customer', 'chef', 'admin'] },
    requestDate: Date,
    requestReason: String,
    newChefId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chef' },
    reassignmentDate: Date,
    transitionNotes: String
  },
  
  // System flags
  isActive: { type: Boolean, default: true },
  isPrimary: { type: Boolean, default: true }, // Primary chef for this subscription
  isBackup: { type: Boolean, default: false },  // Backup chef available
  
  // Driver assignment coordination (for package labeling)
  driverAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverAssignment',
    description: 'Links to the current driver pickup/delivery assignment'
  },
  packageLabelId: {
    type: String,
    description: 'Short ID (last 8 chars of driver assignment) for package labeling'
  },
  
  // Admin controls
  adminControls: {
    canReassign: { type: Boolean, default: true },
    canPause: { type: Boolean, default: true },
    canCancel: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: false },
    monitoringLevel: { 
      type: String, 
      enum: ['low', 'normal', 'high'], 
      default: 'normal' 
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SubscriptionChefAssignmentSchema.index({ subscriptionId: 1, chefId: 1 }, { unique: true });
SubscriptionChefAssignmentSchema.index({ chefId: 1, assignmentStatus: 1 });
SubscriptionChefAssignmentSchema.index({ assignedAt: -1 });
SubscriptionChefAssignmentSchema.index({ endDate: 1, assignmentStatus: 1 });

// Generate assignment ID before saving
SubscriptionChefAssignmentSchema.pre('save', async function(next) {
  if (!this.assignmentId) {
    const count = await this.constructor.countDocuments();
    this.assignmentId = `SCA${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Virtual for assignment duration
SubscriptionChefAssignmentSchema.virtual('durationDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for completion percentage
SubscriptionChefAssignmentSchema.virtual('completionPercentage').get(function() {
  if (this.workload.totalMealsAssigned === 0) return 0;
  return Math.round((this.workload.totalMealsCompleted / this.workload.totalMealsAssigned) * 100);
});

// Virtual for on-time delivery rate
SubscriptionChefAssignmentSchema.virtual('onTimeDeliveryRate').get(function() {
  if (this.performance.totalDeliveries === 0) return 0;
  return Math.round((this.performance.onTimeDeliveries / this.performance.totalDeliveries) * 100);
});

// Static method to get chef's active assignments
SubscriptionChefAssignmentSchema.statics.getChefActiveAssignments = function(chefId) {
  return this.find({
    chefId,
    assignmentStatus: 'active',
    endDate: { $gte: new Date() }
  })
  .populate('subscriptionId', 'subscriptionId status')
  .populate('customerId', 'fullName phone email')
  .populate('mealPlanId', 'planName durationWeeks')
  .sort({ assignedAt: -1 });
};

// Static method to find assignments needing attention
SubscriptionChefAssignmentSchema.statics.getAssignmentsNeedingAttention = function() {
  const today = new Date();
  
  return this.find({
    $or: [
      // Assignments ending soon
      { 
        assignmentStatus: 'active',
        endDate: { $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }
      },
      // Poor performance
      { 
        assignmentStatus: 'active',
        'performance.consistencyScore': { $lt: 70 }
      },
      // Reassignment requested
      { 
        assignmentStatus: 'active',
        'reassignment.isReassignmentRequested': true
      }
    ]
  })
  .populate('chefId', 'fullName email')
  .populate('customerId', 'fullName email')
  .populate('subscriptionId', 'subscriptionId status');
};

// Instance method to calculate workload score (0-100)
SubscriptionChefAssignmentSchema.methods.calculateWorkloadScore = function() {
  const { totalMealsAssigned, currentWeekMeals, maxDailyCapacity } = this.workload;
  const dailyAverage = currentWeekMeals / 7;
  const utilizationRate = (dailyAverage / maxDailyCapacity) * 100;
  
  return Math.min(100, Math.round(utilizationRate));
};

// Instance method to update performance metrics
SubscriptionChefAssignmentSchema.methods.updatePerformanceMetrics = function(deliveryData) {
  this.performance.totalDeliveries += 1;
  
  if (deliveryData.onTime) {
    this.performance.onTimeDeliveries += 1;
  } else {
    this.performance.lateDeliveries += 1;
  }
  
  if (deliveryData.rating) {
    const totalRatingPoints = this.performance.averageRating * this.performance.totalRatings;
    this.performance.totalRatings += 1;
    this.performance.averageRating = (totalRatingPoints + deliveryData.rating) / this.performance.totalRatings;
  }
  
  if (deliveryData.preparationTime) {
    const totalPrepTime = this.performance.averagePreparationTime * (this.performance.totalDeliveries - 1);
    this.performance.averagePreparationTime = (totalPrepTime + deliveryData.preparationTime) / this.performance.totalDeliveries;
  }
  
  this.performance.lastDeliveryDate = new Date();
  
  // Update consistency score based on recent performance
  const onTimeRate = (this.performance.onTimeDeliveries / this.performance.totalDeliveries) * 100;
  const ratingScore = (this.performance.averageRating / 5) * 100;
  this.performance.consistencyScore = Math.round((onTimeRate * 0.6) + (ratingScore * 0.4));
  
  return this.save();
};

// Instance method to request reassignment
SubscriptionChefAssignmentSchema.methods.requestReassignment = function(requestedBy, reason) {
  this.reassignment.isReassignmentRequested = true;
  this.reassignment.requestedBy = requestedBy;
  this.reassignment.requestDate = new Date();
  this.reassignment.requestReason = reason;
  
  return this.save();
};

module.exports = mongoose.model('SubscriptionChefAssignment', SubscriptionChefAssignmentSchema);