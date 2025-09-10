const mongoose = require('mongoose');

const chefReassignmentRequestSchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringSubscription',
    required: true,
    index: true
  },
  currentChefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef',
    required: true
  },
  newChefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef',
    default: null // Set when request is approved
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  // Track the specific meal assignment this relates to (optional)
  mealAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealAssignment',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
chefReassignmentRequestSchema.index({ subscriptionId: 1, status: 1 });
chefReassignmentRequestSchema.index({ currentChefId: 1, status: 1 });
chefReassignmentRequestSchema.index({ createdAt: -1 });
chefReassignmentRequestSchema.index({ priority: 1, createdAt: 1 });

// Virtual for request age in hours
chefReassignmentRequestSchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual to check if request is urgent based on age and priority
chefReassignmentRequestSchema.virtual('isUrgent').get(function() {
  const ageInHours = this.ageInHours;
  return this.priority === 'urgent' || 
         (this.priority === 'high' && ageInHours > 24) ||
         (this.priority === 'normal' && ageInHours > 72);
});

// Static method to get pending requests count
chefReassignmentRequestSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

// Static method to get requests by chef
chefReassignmentRequestSchema.statics.getByChef = function(chefId, options = {}) {
  const query = { currentChefId: chefId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.since) {
    query.createdAt = { $gte: options.since };
  }
  
  return this.find(query)
    .populate('subscriptionId', 'userId mealPlanId status')
    .populate('requestedBy', 'name email phone')
    .sort({ createdAt: -1 });
};

// Method to auto-approve low priority requests after 7 days
chefReassignmentRequestSchema.statics.autoApproveOldRequests = async function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const result = await this.updateMany(
    {
      status: 'pending',
      priority: 'low',
      createdAt: { $lt: sevenDaysAgo }
    },
    {
      status: 'approved',
      resolvedAt: new Date(),
      adminNotes: 'Auto-approved due to age and low priority'
    }
  );
  
  return result;
};

// Pre-save middleware to set resolvedAt when status changes
chefReassignmentRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      this.status !== 'pending' && 
      !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Post-save middleware for notifications (can be extended)
chefReassignmentRequestSchema.post('save', function(doc) {
  if (doc.isModified('status') && doc.status !== 'pending') {
    // Could trigger notification to customer here
    console.log(`Chef reassignment request ${doc._id} has been ${doc.status}`);
  }
});

module.exports = mongoose.model('ChefReassignmentRequest', chefReassignmentRequestSchema);