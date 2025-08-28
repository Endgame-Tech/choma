const mongoose = require('mongoose');

const driverAssignmentSchema = new mongoose.Schema({
  // Driver information
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },

  // Order information (hidden from driver initially)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  // Delivery confirmation code (what user gives to driver)
  confirmationCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Pickup location (Chef/Restaurant)
  pickupLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    chefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chef',
      required: true
    },
    chefName: {
      type: String,
      required: true
    },
    chefPhone: {
      type: String,
      required: true
    },
    instructions: {
      type: String,
      default: ''
    }
  },

  // Delivery location (Customer - limited info shown to driver)
  deliveryLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    area: {
      type: String, // General area for driver to see
      required: true
    },
    instructions: {
      type: String,
      default: ''
    }
    // Customer details are NOT stored here for privacy
  },

  // Assignment status
  status: {
    type: String,
    enum: ['available', 'assigned', 'picked_up', 'delivered', 'cancelled'],
    default: 'available',
    index: true
  },

  // Timing information
  assignedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  acceptedAt: {
    type: Date
  },
  pickedUpAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  estimatedPickupTime: {
    type: Date,
    required: true
  },
  estimatedDeliveryTime: {
    type: Date,
    required: true
  },

  // Distance and earnings
  totalDistance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  baseFee: {
    type: Number,
    required: true,
    default: 500 // Base delivery fee in naira
  },
  distanceFee: {
    type: Number,
    required: true,
    default: 0
  },
  totalEarning: {
    type: Number,
    required: true
  },

  // Delivery confirmation
  deliveryConfirmation: {
    confirmedAt: Date,
    confirmationMethod: {
      type: String,
      enum: ['code', 'photo', 'signature'],
      default: 'code'
    },
    deliveryPhoto: String,
    deliveryNotes: String,
    customerSignature: String
  },

  // Pickup confirmation
  pickupConfirmation: {
    confirmedAt: Date,
    pickupNotes: String,
    pickupPhoto: String
  },

  // Cancellation information
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['driver', 'customer', 'chef', 'admin']
    },
    reason: String,
    compensationAmount: {
      type: Number,
      default: 0
    }
  },

  // Priority and special instructions
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  isFirstDelivery: {
    type: Boolean,
    default: false // True for subscription activation deliveries
  },

  // Subscription information (if applicable)
  subscriptionInfo: {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    },
    mealPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPlan'
    },
    deliveryDay: Number, // Day of the subscription
    isActivationDelivery: {
      type: Boolean,
      default: false
    }
  },

  // Tracking and analytics
  driverLocation: [{
    coordinates: [Number],
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number,
    heading: Number
  }],

  // Payment information
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    amount: Number,
    paymentMethod: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
driverAssignmentSchema.index({ driverId: 1, status: 1 });
driverAssignmentSchema.index({ assignedAt: -1 });
driverAssignmentSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
driverAssignmentSchema.index({ 'deliveryLocation.coordinates': '2dsphere' });
driverAssignmentSchema.index({ confirmationCode: 1 }, { unique: true });
driverAssignmentSchema.index({ orderId: 1 }, { unique: true });

// Virtual for calculated fields
driverAssignmentSchema.virtual('timeToPickup').get(function() {
  if (!this.estimatedPickupTime) return null;
  return Math.max(0, Math.floor((this.estimatedPickupTime - Date.now()) / (1000 * 60)));
});

driverAssignmentSchema.virtual('timeToDelivery').get(function() {
  if (!this.estimatedDeliveryTime) return null;
  return Math.max(0, Math.floor((this.estimatedDeliveryTime - Date.now()) / (1000 * 60)));
});

driverAssignmentSchema.virtual('isOverdue').get(function() {
  if (!this.estimatedDeliveryTime) return false;
  return Date.now() > this.estimatedDeliveryTime;
});

// Static methods
driverAssignmentSchema.statics.findAvailableAssignments = function(driverLocation, maxDistance = 10) {
  return this.find({
    status: 'available',
    'pickupLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: driverLocation // [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  }).sort({ priority: -1, assignedAt: 1 });
};

driverAssignmentSchema.statics.findByConfirmationCode = function(code) {
  return this.findOne({ 
    confirmationCode: code.toUpperCase(),
    status: { $in: ['assigned', 'picked_up'] }
  });
};

// Instance methods
driverAssignmentSchema.methods.generateConfirmationCode = function() {
  // Generate 6-digit alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.confirmationCode = code;
  return code;
};

driverAssignmentSchema.methods.calculateEarning = function() {
  const baseFee = 500; // Base fee in naira
  const perKmRate = 100; // Per km rate in naira
  const distanceFee = Math.floor(this.totalDistance * perKmRate);
  
  // Priority multiplier
  const priorityMultipliers = { low: 1, normal: 1, high: 1.2, urgent: 1.5 };
  const multiplier = priorityMultipliers[this.priority] || 1;
  
  this.baseFee = baseFee;
  this.distanceFee = distanceFee;
  this.totalEarning = Math.floor((baseFee + distanceFee) * multiplier);
  
  return this.totalEarning;
};

driverAssignmentSchema.methods.updateDriverLocation = function(coordinates, additionalData = {}) {
  this.driverLocation.push({
    coordinates,
    timestamp: new Date(),
    ...additionalData
  });
  
  // Keep only last 50 location points
  if (this.driverLocation.length > 50) {
    this.driverLocation = this.driverLocation.slice(-50);
  }
  
  return this.save();
};

driverAssignmentSchema.methods.confirmPickup = function(pickupData = {}) {
  this.status = 'picked_up';
  this.pickedUpAt = new Date();
  this.pickupConfirmation = {
    confirmedAt: new Date(),
    pickupNotes: pickupData.notes || '',
    pickupPhoto: pickupData.photo || ''
  };
  return this.save();
};

driverAssignmentSchema.methods.confirmDelivery = function(confirmationCode, deliveryData = {}) {
  if (this.confirmationCode.toUpperCase() !== confirmationCode.toUpperCase()) {
    throw new Error('Invalid confirmation code');
  }
  
  this.status = 'delivered';
  this.deliveredAt = new Date();
  this.deliveryConfirmation = {
    confirmedAt: new Date(),
    confirmationMethod: 'code',
    deliveryPhoto: deliveryData.photo || '',
    deliveryNotes: deliveryData.notes || ''
  };
  
  return this.save();
};

driverAssignmentSchema.methods.cancel = function(cancelData) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy: cancelData.cancelledBy,
    reason: cancelData.reason || '',
    compensationAmount: cancelData.compensation || 0
  };
  return this.save();
};

// Pre-save middleware
driverAssignmentSchema.pre('save', function(next) {
  // Generate confirmation code if not exists
  if (!this.confirmationCode) {
    this.generateConfirmationCode();
  }
  
  // Calculate earning if not set
  if (!this.totalEarning && this.totalDistance) {
    this.calculateEarning();
  }
  
  next();
});

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema);