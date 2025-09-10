const mongoose = require('mongoose');

/**
 * SubscriptionDelivery Model
 * Tracks individual daily deliveries for subscriptions
 * Provides granular tracking of each delivery in a recurring subscription
 */
const SubscriptionDeliverySchema = new mongoose.Schema({
  deliveryId: { 
    type: String, 
    unique: true 
  },
  
  // References
  subscriptionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subscription', 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order' 
  },
  
  // Meal assignment for this delivery
  mealAssignment: {
    assignmentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'MealPlanAssignment', 
      required: true 
    },
    weekNumber: { type: Number, required: true },
    dayOfWeek: { type: Number, required: true },
    mealTime: { 
      type: String, 
      enum: ['breakfast', 'lunch', 'dinner'], 
      required: true 
    },
    customTitle: String,
    meals: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Meal' 
    }]
  },
  
  // Delivery scheduling
  scheduledDate: { type: Date, required: true },
  scheduledTimeSlot: {
    start: String, // "12:00"
    end: String    // "14:00"
  },
  
  // Status tracking
  status: {
    type: String,
    enum: [
      'scheduled',    // Initial state
      'chef_assigned', // Chef assigned to prepare
      'preparing',    // Chef started cooking
      'ready',        // Food ready for pickup
      'out_for_delivery', // Driver picked up
      'delivered',    // Successfully delivered
      'failed',       // Delivery failed
      'cancelled',    // Cancelled by customer/admin
      'skipped'       // Skipped by customer
    ],
    default: 'scheduled'
  },
  
  // Chef assignment
  chefAssignment: {
    chefId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chef' },
    assignedAt: Date,
    acceptedAt: Date,
    startedCookingAt: Date,
    completedAt: Date,
    notes: String
  },
  
  // Driver assignment
  driverAssignment: {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverAssignment' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    confirmationCode: String,
    deliveryNotes: String
  },
  
  // Delivery tracking
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
    updatedBy: String, // 'chef', 'driver', 'admin', 'system'
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Customer interaction
  customer: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedAt: Date,
    specialInstructions: String
  },
  
  // Delivery details
  deliveryInfo: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    actualDeliveryTime: Date,
    estimatedDeliveryTime: Date,
    deliveryPhoto: String,
    recipientName: String
  },
  
  // Payment tracking for individual delivery
  payment: {
    amount: { type: Number, default: 0 },
    method: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'paid' // Usually pre-paid with subscription
    },
    transactionId: String
  },
  
  // Analytics and metrics
  metrics: {
    preparationTime: Number, // minutes from chef assignment to ready
    deliveryTime: Number,    // minutes from pickup to delivery
    totalTime: Number,       // minutes from scheduled to delivered
    onTimeDelivery: Boolean, // delivered within time slot
    customerSatisfaction: Number // rating 1-5
  },
  
  // Failure/cancellation tracking
  failure: {
    reason: String,
    failedAt: Date,
    failedBy: String,
    retryCount: { type: Number, default: 0 },
    compensationOffered: Number
  },
  
  // System flags
  isFirstDelivery: { type: Boolean, default: false }, // First delivery of subscription
  isLastDelivery: { type: Boolean, default: false },  // Last delivery of subscription
  deliverySequenceNumber: Number, // 1st, 2nd, 3rd delivery, etc.
  
  // Admin notes
  adminNotes: String,
  internalNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SubscriptionDeliverySchema.index({ subscriptionId: 1, scheduledDate: -1 });
SubscriptionDeliverySchema.index({ customerId: 1, status: 1 });
SubscriptionDeliverySchema.index({ scheduledDate: 1, status: 1 });
SubscriptionDeliverySchema.index({ 'chefAssignment.chefId': 1, scheduledDate: 1 });
SubscriptionDeliverySchema.index({ 'driverAssignment.driverId': 1, status: 1 });

// Generate delivery ID before saving
SubscriptionDeliverySchema.pre('save', async function(next) {
  if (!this.deliveryId) {
    const count = await this.constructor.countDocuments();
    this.deliveryId = `SDL${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Virtual for checking if delivery is overdue
SubscriptionDeliverySchema.virtual('isOverdue').get(function() {
  if (!this.scheduledTimeSlot?.end || this.status === 'delivered') return false;
  
  const now = new Date();
  const scheduledEnd = new Date(this.scheduledDate);
  const [hours, minutes] = this.scheduledTimeSlot.end.split(':');
  scheduledEnd.setHours(parseInt(hours), parseInt(minutes));
  
  return now > scheduledEnd;
});

// Virtual for delivery window
SubscriptionDeliverySchema.virtual('deliveryWindow').get(function() {
  if (!this.scheduledTimeSlot) return null;
  return `${this.scheduledTimeSlot.start} - ${this.scheduledTimeSlot.end}`;
});

// Static method to get today's deliveries
SubscriptionDeliverySchema.statics.getTodaysDeliveries = function(status = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const query = {
    scheduledDate: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }
  };
  
  if (status) query.status = status;
  
  return this.find(query)
    .populate('subscriptionId', 'subscriptionId customerId')
    .populate('customerId', 'fullName phone email')
    .populate('chefAssignment.chefId', 'fullName phone')
    .populate('driverAssignment.driverId', 'fullName phone')
    .sort({ scheduledDate: 1 });
};

// Static method to get chef's deliveries
SubscriptionDeliverySchema.statics.getChefDeliveries = function(chefId, date = null) {
  const query = { 'chefAssignment.chefId': chefId };
  
  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    query.scheduledDate = {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    };
  }
  
  return this.find(query)
    .populate('subscriptionId', 'subscriptionId')
    .populate('customerId', 'fullName phone address')
    .populate('mealAssignment.assignmentId')
    .sort({ scheduledDate: 1 });
};

// Instance method to update status with timeline
SubscriptionDeliverySchema.methods.updateStatus = function(newStatus, notes = '', updatedBy = 'system', metadata = {}) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
    updatedBy,
    metadata
  });
  return this.save();
};

// Instance method to assign chef
SubscriptionDeliverySchema.methods.assignChef = function(chefId) {
  this.chefAssignment.chefId = chefId;
  this.chefAssignment.assignedAt = new Date();
  this.status = 'chef_assigned';
  
  return this.updateStatus('chef_assigned', `Chef assigned: ${chefId}`, 'admin', { chefId });
};

// Instance method to mark as ready for pickup
SubscriptionDeliverySchema.methods.markReadyForPickup = function(chefNotes = '') {
  this.chefAssignment.completedAt = new Date();
  this.chefAssignment.notes = chefNotes;
  this.status = 'ready';
  
  return this.updateStatus('ready', 'Food ready for pickup', 'chef', { chefNotes });
};

module.exports = mongoose.model('SubscriptionDelivery', SubscriptionDeliverySchema);