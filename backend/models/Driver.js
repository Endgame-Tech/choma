const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DriverSchema = new mongoose.Schema({
  driverId: { 
    type: String, 
    unique: true
  },
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phone: { 
    type: String, 
    required: true 
  },
  licenseNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  vehicleInfo: {
    type: { 
      type: String, 
      enum: ['motorcycle', 'bicycle', 'car', 'van'], 
      required: true 
    },
    model: String,
    plateNumber: { 
      type: String, 
      required: true 
    },
    capacity: { 
      type: Number, 
      default: 10 
    } // number of orders can carry
  },
  // Account status for approval workflow
  accountStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  // Online/Offline status for receiving assignments
  status: { 
    type: String, 
    enum: ['online', 'offline', 'on_delivery', 'break'], 
    default: 'offline' 
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    },
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    }
  },
  rating: { 
    average: {
      type: Number, 
      min: 1, 
      max: 5, 
      default: 5 
    },
    count: {
      type: Number,
      default: 0
    }
  },
  deliveryStats: {
    totalDeliveries: { 
      type: Number, 
      default: 0 
    },
    completedDeliveries: {
      type: Number,
      default: 0
    },
    cancelledDeliveries: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number, // in kilometers
      default: 0
    },
    averageDeliveryTime: {
      type: Number, // in minutes
      default: 0
    }
  },
  earnings: {
    totalEarnings: { 
      type: Number, 
      default: 0 
    },
    pendingEarnings: {
      type: Number,
      default: 0
    },
    weeklyEarnings: {
      type: Number,
      default: 0
    },
    monthlyEarnings: {
      type: Number,
      default: 0
    },
    lastPayout: Date
  },
  workingHours: {
    start: { 
      type: String, 
      default: '08:00' 
    },
    end: { 
      type: String, 
      default: '18:00' 
    }
  },
  profileImage: String,
  isAvailable: { 
    type: Boolean, 
    default: false 
  },
  // FCM token for push notifications
  deviceTokens: [{
    type: String
  }],
  // Bank account information for payments
  bankAccount: {
    accountNumber: String,
    bankName: String,
    accountName: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  // Verification documents
  documents: {
    license: {
      frontImage: String,
      backImage: String,
      isVerified: {
        type: Boolean,
        default: false
      }
    },
    vehicle: {
      registrationImage: String,
      insuranceImage: String,
      isVerified: {
        type: Boolean,
        default: false
      }
    }
  },
  // Activity tracking
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  joinDate: { 
    type: Date, 
    default: Date.now 
  },
  // Admin notes
  adminNotes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate driver ID
DriverSchema.pre('save', async function(next) {
  if (!this.driverId) {
    const count = await this.constructor.countDocuments();
    this.driverId = `DR${String(count + 1).padStart(4, '0')}`;
  }
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

DriverSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Driver', DriverSchema);
