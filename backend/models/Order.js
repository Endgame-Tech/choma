const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  orderItems: mongoose.Schema.Types.Mixed, // JSON of ordered meals
  orderStatus: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'InProgress', 'Out for Delivery', 'Completed', 'Delivered', 'Cancelled'], default: 'Pending' },
  totalAmount: Number,
  paymentMethod: { type: String, enum: ['Card', 'Transfer', 'Cash on Delivery'] },
  paymentReference: String,
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed', 'Refunded'] },
  deliveryAddress: String,
  deliveryDate: Date,
  estimatedDelivery: Date,
  actualDelivery: Date,
  deliveryNotes: String,
  customerRating: { type: Number, min: 1, max: 5 },
  customerFeedback: String,
  
  // Chef-related fields
  assignedChef: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chef',
    default: null
  },
  delegationStatus: {
    type: String,
    enum: ['Not Assigned', 'Pending Assignment', 'Assigned', 'Accepted', 'In Progress', 'Ready', 'Completed'],
    default: 'Not Assigned'
  },
  chefAssignedDate: Date,
  chefAcceptedDate: Date,
  chefStartedDate: Date,
  chefCompletedDate: Date,
  chefNotes: String,
  chefRating: { type: Number, min: 1, max: 5 }, // Customer rating for chef
  chefFeedback: String, // Customer feedback about chef
  adminNotes: String, // Admin notes about the order
  specialInstructions: String, // Special cooking instructions
  
  // Priority and urgency
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  
  // Order delegation reference
  delegation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderDelegation'
  },
  
  // Recurring order management
  recurringOrder: {
    // Type of order
    orderType: {
      type: String,
      enum: ['one-time', 'subscription-first', 'subscription-recurring'],
      default: 'one-time'
    },
    
    // Subscription delivery reference
    subscriptionDeliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionDelivery'
    },
    
    // Meal progression info
    mealProgression: {
      weekNumber: Number,
      dayOfWeek: Number,
      mealTime: String,
      sequenceNumber: Number // 1st, 2nd, 3rd order in subscription
    },
    
    // Activation tracking (for first delivery)
    isActivationOrder: { type: Boolean, default: false },
    activationCompleted: { type: Boolean, default: false },
    activationCode: String, // Last 6 digits for first delivery
    
    // Parent subscription reference (already exists but adding for clarity)
    parentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    }
  },
  
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now }
});

// Update the updatedDate field and generate orderNumber before saving
OrderSchema.pre('save', function(next) {
  this.updatedDate = new Date();
  
  // Generate unique order number if not provided
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  next();
});

// Method to check if order can be assigned to chef
OrderSchema.methods.canBeAssigned = function() {
  return this.paymentStatus === 'Paid' && 
         ['Confirmed', 'Preparing'].includes(this.orderStatus) &&
         this.delegationStatus === 'Not Assigned';
};

// Method to assign chef
OrderSchema.methods.assignToChef = async function(chefId, adminId) {
  this.assignedChef = chefId;
  this.delegationStatus = 'Assigned';
  this.chefAssignedDate = new Date();
  this.adminNotes = `Assigned to chef by ${adminId}`;
  return this.save();
};

// Static method to get orders ready for assignment
OrderSchema.statics.getOrdersReadyForAssignment = function() {
  return this.find({
    paymentStatus: 'Paid',
    orderStatus: { $in: ['Confirmed', 'Preparing'] },
    delegationStatus: 'Not Assigned'
  }).populate('customer subscription');
};

// Static method to get chef's assigned orders
OrderSchema.statics.getChefOrders = function(chefId, status = null) {
  const query = { assignedChef: chefId };
  if (status) {
    query.delegationStatus = status;
  }
  return this.find(query)
    .populate('customer subscription')
    .sort({ chefAssignedDate: -1 });
};

// Static method to get subscription orders
OrderSchema.statics.getSubscriptionOrders = function(subscriptionId) {
  return this.find({
    $or: [
      { subscription: subscriptionId },
      { 'recurringOrder.parentSubscription': subscriptionId }
    ]
  }).sort({ createdDate: -1 });
};

// Method to mark activation as completed
OrderSchema.methods.completeActivation = async function() {
  if (!this.recurringOrder.isActivationOrder) {
    throw new Error('This is not an activation order');
  }
  
  this.recurringOrder.activationCompleted = true;
  
  // Activate the parent subscription
  const Subscription = require('./Subscription');
  const subscription = await Subscription.findById(this.recurringOrder.parentSubscription);
  if (subscription) {
    await subscription.activate();
  }
  
  return this.save();
};

// Method to generate activation code (last 6 digits of order number)
OrderSchema.methods.generateActivationCode = function() {
  if (this.recurringOrder.isActivationOrder && this.orderNumber) {
    const orderNumber = this.orderNumber.toString();
    this.recurringOrder.activationCode = orderNumber.slice(-6).toUpperCase();
    return this.recurringOrder.activationCode;
  }
  return null;
};

// Virtual to check if this is a recurring order
OrderSchema.virtual('isRecurringOrder').get(function() {
  return this.recurringOrder.orderType !== 'one-time';
});

module.exports = mongoose.model('Order', OrderSchema);
