const mongoose = require('mongoose');

const DeliveryTrackingSchema = new mongoose.Schema({
  trackingId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  driver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Driver' 
  },
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  deliveryStatus: { 
    type: String, 
    enum: [
      'Pending Assignment', 
      'Assigned', 
      'Driver En Route to Kitchen', 
      'Picked Up', 
      'En Route to Customer', 
      'Arrived at Location', 
      'Delivered', 
      'Failed Delivery', 
      'Cancelled'
    ], 
    default: 'Pending Assignment' 
  },
  pickupLocation: {
    address: String,
    latitude: Number,
    longitude: Number,
    instructions: String
  },
  deliveryLocation: {
    address: { 
      type: String, 
      required: true 
    },
    latitude: Number,
    longitude: Number,
    instructions: String
  },
  timeline: [{
    status: String,
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    location: {
      latitude: Number,
      longitude: Number
    },
    notes: String,
    updatedBy: { 
      type: String, 
      enum: ['system', 'driver', 'customer', 'admin'], 
      default: 'system' 
    }
  }],
  estimatedPickupTime: Date,
  actualPickupTime: Date,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryProof: {
    type: { 
      type: String, 
      enum: ['photo', 'signature', 'none'], 
      default: 'none' 
    },
    imageUrl: String,
    signatureData: String,
    customerName: String,
    notes: String
  },
  deliveryFee: { 
    type: Number, 
    default: 0 
  },
  distance: { 
    type: Number, 
    default: 0 
  }, // in kilometers
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  },
  customerRating: { 
    type: Number, 
    min: 1, 
    max: 5 
  },
  customerFeedback: String,
  driverNotes: String,
  adminNotes: String,
  attempts: { 
    type: Number, 
    default: 1 
  },
  maxAttempts: { 
    type: Number, 
    default: 3 
  }
}, {
  timestamps: true
});

// Generate tracking ID
DeliveryTrackingSchema.pre('save', async function(next) {
  if (!this.trackingId) {
    const count = await this.constructor.countDocuments();
    this.trackingId = `TRK${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Add timeline entry when status changes
DeliveryTrackingSchema.pre('save', function(next) {
  if (this.isModified('deliveryStatus')) {
    this.timeline.push({
      status: this.deliveryStatus,
      timestamp: new Date(),
      updatedBy: 'system'
    });
  }
  next();
});

module.exports = mongoose.model('DeliveryTracking', DeliveryTrackingSchema);
