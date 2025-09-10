const mongoose = require('mongoose');

const MealAssignmentSchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringSubscription',
    required: true,
    index: true
  },
  
  assignedChef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef',
    default: null,
    index: true
  },
  
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  
  status: {
    type: String,
    enum: [
      'scheduled',
      'chef_assigned', 
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'skipped'
    ],
    default: 'scheduled',
    index: true
  },
  
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  
  scheduledTimeSlot: {
    start: String, // "12:00"
    end: String    // "14:00"
  },
  
  // Meal details
  mealPlanAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealPlanAssignment',
    default: null
  },
  
  mealTitle: String,
  mealDescription: String,
  mealImageUrl: String,
  
  // Chef assignment details
  assignedAt: Date,
  assignedBy: String, // 'admin', 'system', 'auto'
  
  // Chef preparation tracking
  preparationStartedAt: Date,
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  
  // Delivery tracking
  pickupTime: Date,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  
  deliveryAddress: String,
  deliveryCoordinates: {
    lat: Number,
    lng: Number
  },
  
  // Priority system
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Status history for tracking
  statusHistory: [{
    status: {
      type: String,
      enum: [
        'scheduled',
        'chef_assigned', 
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled',
        'skipped'
      ]
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: String, // who made the update
    notes: String,
    location: {
      lat: Number,
      lng: Number
    }
  }],
  
  // Chef notes and instructions
  chefNotes: String,
  preparationNotes: String,
  specialInstructions: String,
  
  // Delivery notes
  deliveryNotes: String,
  deliveryProofImageUrl: String,
  recipientName: String,
  
  // Quality assurance
  qualityCheck: {
    passed: { type: Boolean, default: true },
    checkedBy: String,
    checkedAt: Date,
    issues: [String],
    notes: String
  },
  
  // Customer feedback
  customerFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date,
    wouldRecommend: Boolean
  },
  
  // Timing metrics
  timingMetrics: {
    preparationDuration: Number, // minutes
    deliveryDuration: Number,    // minutes
    totalDuration: Number,       // minutes
    wasOnTime: Boolean,
    delayReason: String
  },
  
  // Issue tracking
  issues: [{
    type: {
      type: String,
      enum: [
        'chef_late',
        'preparation_delay', 
        'quality_issue',
        'delivery_delay',
        'customer_unavailable',
        'wrong_address',
        'payment_issue',
        'other'
      ]
    },
    description: String,
    reportedBy: String,
    reportedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    resolution: String
  }],
  
  // Cancellation/Skip details
  cancellationReason: String,
  cancelledBy: String,
  cancelledAt: Date,
  
  skipReason: String,
  skippedBy: String,
  skippedAt: Date,
  
  // Payment tracking for individual assignments
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  
  // Commission tracking
  chefCommission: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  
  // Admin notes
  adminNotes: String,
  
  // Retry tracking for failed assignments
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  
  // External references
  externalOrderId: String,
  thirdPartyDeliveryId: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
MealAssignmentSchema.index({ subscriptionId: 1, scheduledDate: 1 });
MealAssignmentSchema.index({ assignedChef: 1, status: 1 });
MealAssignmentSchema.index({ assignedDriver: 1, status: 1 });
MealAssignmentSchema.index({ scheduledDate: 1, status: 1 });
MealAssignmentSchema.index({ status: 1, priority: 1 });
MealAssignmentSchema.index({ createdAt: -1 });

// Compound index for finding assignments by date and area
MealAssignmentSchema.index({ scheduledDate: 1, 'deliveryAddress': 'text' });

// Virtual to check if assignment is overdue
MealAssignmentSchema.virtual('isOverdue').get(function() {
  if (['delivered', 'cancelled', 'skipped'].includes(this.status)) {
    return false;
  }
  
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDate);
  
  // Add time slot if available
  if (this.scheduledTimeSlot && this.scheduledTimeSlot.end) {
    const [hours, minutes] = this.scheduledTimeSlot.end.split(':');
    scheduledTime.setHours(parseInt(hours), parseInt(minutes));
  }
  
  return now > scheduledTime;
});

// Virtual to calculate duration from start to delivery
MealAssignmentSchema.virtual('totalDurationMinutes').get(function() {
  if (!this.actualDeliveryTime || !this.preparationStartedAt) {
    return null;
  }
  return Math.round((this.actualDeliveryTime - this.preparationStartedAt) / (1000 * 60));
});

// Virtual to check if delivery was on time
MealAssignmentSchema.virtual('wasDeliveredOnTime').get(function() {
  if (!this.actualDeliveryTime || !this.scheduledDate) {
    return null;
  }
  
  let scheduledDeliveryTime = new Date(this.scheduledDate);
  if (this.scheduledTimeSlot && this.scheduledTimeSlot.end) {
    const [hours, minutes] = this.scheduledTimeSlot.end.split(':');
    scheduledDeliveryTime.setHours(parseInt(hours), parseInt(minutes));
  }
  
  return this.actualDeliveryTime <= scheduledDeliveryTime;
});

// Method to update status with history tracking
MealAssignmentSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '', location = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    notes,
    location
  });
  
  // Update timing fields based on status
  const now = new Date();
  switch (newStatus) {
    case 'chef_assigned':
      this.assignedAt = now;
      break;
    case 'preparing':
      this.preparationStartedAt = now;
      break;
    case 'ready':
      this.actualReadyTime = now;
      if (this.preparationStartedAt) {
        this.timingMetrics.preparationDuration = Math.round(
          (now - this.preparationStartedAt) / (1000 * 60)
        );
      }
      break;
    case 'out_for_delivery':
      this.pickupTime = now;
      break;
    case 'delivered':
      this.actualDeliveryTime = now;
      this.timingMetrics.wasOnTime = this.wasDeliveredOnTime;
      if (this.preparationStartedAt) {
        this.timingMetrics.totalDuration = Math.round(
          (now - this.preparationStartedAt) / (1000 * 60)
        );
      }
      if (this.pickupTime) {
        this.timingMetrics.deliveryDuration = Math.round(
          (now - this.pickupTime) / (1000 * 60)
        );
      }
      break;
    case 'failed':
    case 'cancelled':
      if (newStatus === 'cancelled') {
        this.cancelledAt = now;
        this.cancelledBy = updatedBy;
      }
      break;
  }
  
  return this.save();
};

// Method to assign chef
MealAssignmentSchema.methods.assignChef = function(chefId, assignedBy = 'admin') {
  this.assignedChef = chefId;
  this.assignedBy = assignedBy;
  return this.updateStatus('chef_assigned', assignedBy, `Chef assigned: ${chefId}`);
};

// Method to assign driver
MealAssignmentSchema.methods.assignDriver = function(driverId, assignedBy = 'admin') {
  this.assignedDriver = driverId;
  return this.updateStatus('out_for_delivery', assignedBy, `Driver assigned: ${driverId}`);
};

// Method to mark as delivered
MealAssignmentSchema.methods.markDelivered = function(deliveredBy, notes = '', proofImageUrl = null, recipientName = null) {
  if (proofImageUrl) {
    this.deliveryProofImageUrl = proofImageUrl;
  }
  if (recipientName) {
    this.recipientName = recipientName;
  }
  if (notes) {
    this.deliveryNotes = notes;
  }
  
  return this.updateStatus('delivered', deliveredBy, notes);
};

// Method to add customer feedback
MealAssignmentSchema.methods.addFeedback = function(rating, comment, wouldRecommend = null) {
  this.customerFeedback = {
    rating,
    comment,
    wouldRecommend,
    submittedAt: new Date()
  };
  
  return this.save();
};

// Method to report issue
MealAssignmentSchema.methods.reportIssue = function(issueType, description, reportedBy) {
  this.issues.push({
    type: issueType,
    description,
    reportedBy
  });
  
  return this.save();
};

// Method to resolve issue
MealAssignmentSchema.methods.resolveIssue = function(issueId, resolution) {
  const issue = this.issues.id(issueId);
  if (issue) {
    issue.resolved = true;
    issue.resolvedAt = new Date();
    issue.resolution = resolution;
  }
  
  return this.save();
};

// Static method to find assignments by date range
MealAssignmentSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    scheduledDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  };
  
  return this.find(query)
    .populate('subscriptionId', 'userId mealPlanId deliverySchedule')
    .populate('assignedChef', 'fullName phone email')
    .populate('assignedDriver', 'fullName phone email')
    .sort({ scheduledDate: 1, priority: -1 });
};

// Static method to find overdue assignments
MealAssignmentSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({
    status: { $nin: ['delivered', 'cancelled', 'skipped'] },
    scheduledDate: { $lt: now }
  }).populate('subscriptionId assignedChef assignedDriver');
};

// Static method to get chef workload
MealAssignmentSchema.statics.getChefWorkload = function(chefId, dateRange = {}) {
  const query = { assignedChef: chefId };
  
  if (dateRange.start && dateRange.end) {
    query.scheduledDate = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  return this.find(query).sort({ scheduledDate: 1 });
};

// Static method to get assignment statistics
MealAssignmentSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        onTime: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', 'delivered'] },
                  { $eq: ['$timingMetrics.wasOnTime', true] }
                ]
              }, 
              1, 
              0
            ] 
          } 
        },
        avgPreparationTime: { $avg: '$timingMetrics.preparationDuration' },
        avgDeliveryTime: { $avg: '$timingMetrics.deliveryDuration' },
        avgTotalTime: { $avg: '$timingMetrics.totalDuration' },
        avgRating: { $avg: '$customerFeedback.rating' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
    onTime: 0,
    avgPreparationTime: 0,
    avgDeliveryTime: 0,
    avgTotalTime: 0,
    avgRating: 0
  };
};

// Pre-save middleware to populate meal details from meal plan assignment
MealAssignmentSchema.pre('save', async function(next) {
  if (this.isNew && this.mealPlanAssignmentId && !this.mealTitle) {
    try {
      const MealPlanAssignment = mongoose.model('MealPlanAssignment');
      const assignment = await MealPlanAssignment.findById(this.mealPlanAssignmentId);
      
      if (assignment) {
        this.mealTitle = assignment.customTitle;
        this.mealDescription = assignment.customDescription;
        this.mealImageUrl = assignment.imageUrl;
      }
    } catch (error) {
      console.error('Error populating meal details:', error);
    }
  }
  
  next();
});

// Post-save middleware to update subscription metrics
MealAssignmentSchema.post('save', async function(doc) {
  if (doc.isModified('status') && doc.status === 'delivered') {
    try {
      const RecurringSubscription = mongoose.model('RecurringSubscription');
      const subscription = await RecurringSubscription.findById(doc.subscriptionId);
      
      if (subscription) {
        const wasOnTime = doc.timingMetrics.wasOnTime || false;
        subscription.updateDeliveryMetrics(true, wasOnTime);
        await subscription.save();
      }
    } catch (error) {
      console.error('Error updating subscription metrics:', error);
    }
  }
});

module.exports = mongoose.model('MealAssignment', MealAssignmentSchema);