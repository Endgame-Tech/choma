const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  driverId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
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
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'On Delivery', 'Break'], 
    default: 'Active' 
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    }
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 5 
  },
  totalDeliveries: { 
    type: Number, 
    default: 0 
  },
  totalEarnings: { 
    type: Number, 
    default: 0 
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
    default: true 
  },
  joinDate: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Generate driver ID
DriverSchema.pre('save', async function(next) {
  if (!this.driverId) {
    const count = await this.constructor.countDocuments();
    this.driverId = `DR${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Driver', DriverSchema);
