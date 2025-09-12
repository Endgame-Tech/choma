const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  fullName: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  dateOfBirth: { type: Date },
  email: { type: String, required: true, unique: true },
  phone: String,
  address: String,
  city: { type: String, enum: ['Lagos', 'Abuja'] },
  dietaryPreferences: [String],
  allergies: String,
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended', 'Deleted'], default: 'Active' },
  deletedAt: Date,
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  pushToken: String,
  notes: String,
  achievements: [{
    achievementId: String,
    title: String,
    description: String,
    icon: String,
    earned: { type: Boolean, default: false },
    earnedDate: Date,
    progress: { type: Number, default: 0 },
    target: { type: Number, default: 1 }
  }],
  notificationPreferences: {
    orderUpdates: { type: Boolean, default: true },
    deliveryReminders: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    newMealPlans: { type: Boolean, default: true },
    achievements: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },
  pushTokens: [{
    token: String,
    deviceId: String,
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    isActive: { type: Boolean, default: true },
    lastUsed: { type: Date, default: Date.now }
  }],
  password: { type: String, required: true, select: false },
  profileImage: { type: String }, // URL to profile image
  resetPasswordCode: String,
  resetPasswordExpires: Date
});

// Auto-generate customerId before saving
CustomerSchema.pre('save', async function(next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CU-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Instance methods for push token management
CustomerSchema.methods.addPushToken = function(token, deviceId, platform) {
  // Remove existing token for this device
  this.pushTokens = this.pushTokens.filter(pt => pt.deviceId !== deviceId);
  
  // Add new token
  this.pushTokens.push({
    token,
    deviceId,
    platform,
    isActive: true,
    lastUsed: new Date()
  });
  
  // Keep only the most recent 5 tokens
  if (this.pushTokens.length > 5) {
    this.pushTokens = this.pushTokens.slice(-5);
  }
  
  return this.save();
};

CustomerSchema.methods.removePushToken = function(deviceId) {
  this.pushTokens = this.pushTokens.filter(pt => pt.deviceId !== deviceId);
  return this.save();
};

CustomerSchema.methods.getActivePushTokens = function() {
  return this.pushTokens
    .filter(pt => pt.isActive)
    .map(pt => pt.token);
};

CustomerSchema.methods.updatePushTokenActivity = function(token, isActive = true) {
  const tokenObj = this.pushTokens.find(pt => pt.token === token);
  if (tokenObj) {
    tokenObj.isActive = isActive;
    tokenObj.lastUsed = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Customer', CustomerSchema);
