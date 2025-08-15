const mongoose = require('mongoose');
const crypto = require('crypto');

const twoFactorAuthSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true,
    index: true
  },
  secret: {
    type: String,
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  setupDate: {
    type: Date
  },
  lastVerified: {
    type: Date
  },
  backupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  backupCodesGenerated: {
    type: Date,
    default: Date.now
  },
  settings: {
    requireForLogin: {
      type: Boolean,
      default: true
    },
    requireForSensitiveActions: {
      type: Boolean,
      default: true
    },
    deviceRememberDuration: {
      type: Number, // in hours
      default: 168, // 7 days
      min: 1,
      max: 720 // 30 days
    }
  },
  // Trusted devices
  trustedDevices: [{
    deviceId: {
      type: String,
      required: true
    },
    name: String,
    lastUsed: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    isTrusted: {
      type: Boolean,
      default: true
    },
    expiresAt: Date
  }],
  // Recovery information
  recoveryInfo: {
    emergencyContact: String,
    lastRecoveryAttempt: Date,
    recoveryAttempts: {
      type: Number,
      default: 0
    }
  },
  // Security settings
  security: {
    maxVerificationAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number, // in minutes
      default: 15
    },
    currentFailedAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: Date,
    lastFailedAttempt: Date
  }
}, {
  timestamps: true
});

// Virtual for backup codes remaining
twoFactorAuthSchema.virtual('backupCodesRemaining').get(function() {
  return this.backupCodes.filter(code => !code.used).length;
});

// Method to generate backup codes
twoFactorAuthSchema.methods.generateBackupCodes = function(count = 10) {
  this.backupCodes = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.backupCodes.push({ code, used: false });
  }
  
  this.backupCodesGenerated = new Date();
  return this.backupCodes.map(bc => bc.code);
};

// Method to use a backup code
twoFactorAuthSchema.methods.useBackupCode = function(code) {
  const backupCode = this.backupCodes.find(bc => 
    bc.code === code.toUpperCase() && !bc.used
  );
  
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  
  return false;
};

// Method to add trusted device
twoFactorAuthSchema.methods.addTrustedDevice = function(deviceInfo) {
  const deviceId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (this.settings.deviceRememberDuration * 60 * 60 * 1000));
  
  // Remove old device with same fingerprint if exists
  this.trustedDevices = this.trustedDevices.filter(device => 
    device.userAgent !== deviceInfo.userAgent || device.ipAddress !== deviceInfo.ipAddress
  );
  
  this.trustedDevices.push({
    deviceId,
    name: deviceInfo.name || `Device-${Date.now()}`,
    lastUsed: new Date(),
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
    isTrusted: true,
    expiresAt
  });
  
  return deviceId;
};

// Method to check if device is trusted
twoFactorAuthSchema.methods.isDeviceTrusted = function(deviceInfo) {
  const device = this.trustedDevices.find(device => 
    device.isTrusted && 
    device.expiresAt > new Date() &&
    (device.userAgent === deviceInfo.userAgent || device.ipAddress === deviceInfo.ipAddress)
  );
  
  if (device) {
    device.lastUsed = new Date();
    return { trusted: true, deviceId: device.deviceId };
  }
  
  return { trusted: false };
};

// Method to remove trusted device
twoFactorAuthSchema.methods.removeTrustedDevice = function(deviceId) {
  this.trustedDevices = this.trustedDevices.filter(device => device.deviceId !== deviceId);
  return true;
};

// Method to clean expired trusted devices
twoFactorAuthSchema.methods.cleanExpiredDevices = function() {
  const now = new Date();
  this.trustedDevices = this.trustedDevices.filter(device => device.expiresAt > now);
};

// Method to handle failed verification attempt
twoFactorAuthSchema.methods.recordFailedAttempt = function() {
  this.security.currentFailedAttempts += 1;
  this.security.lastFailedAttempt = new Date();
  
  if (this.security.currentFailedAttempts >= this.security.maxVerificationAttempts) {
    this.security.lockedUntil = new Date(Date.now() + (this.security.lockoutDuration * 60 * 1000));
  }
};

// Method to reset failed attempts
twoFactorAuthSchema.methods.resetFailedAttempts = function() {
  this.security.currentFailedAttempts = 0;
  this.security.lockedUntil = undefined;
};

// Method to check if account is locked
twoFactorAuthSchema.methods.isLocked = function() {
  return this.security.lockedUntil && this.security.lockedUntil > new Date();
};

// Method to enable 2FA
twoFactorAuthSchema.methods.enable = function() {
  this.isEnabled = true;
  this.setupDate = new Date();
  this.lastVerified = new Date();
};

// Method to disable 2FA
twoFactorAuthSchema.methods.disable = function() {
  this.isEnabled = false;
  this.trustedDevices = [];
  this.resetFailedAttempts();
};

// Static method to find by admin ID
twoFactorAuthSchema.statics.findByAdminId = function(adminId) {
  return this.findOne({ adminId }).populate('adminId', 'firstName lastName email');
};

// Static method to get 2FA statistics
twoFactorAuthSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalAdmins: { $sum: 1 },
        enabledCount: { $sum: { $cond: ['$isEnabled', 1, 0] } },
        recentSetups: {
          $sum: {
            $cond: [
              { $gte: ['$setupDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        recentDisables: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$isEnabled', false] },
                  { $gte: ['$updatedAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalAdmins: 1,
        totalEnabled: '$enabledCount',
        enabledPercentage: {
          $multiply: [
            { $divide: ['$enabledCount', '$totalAdmins'] },
            100
          ]
        },
        recentSetups: 1,
        recentDisables: 1
      }
    }
  ]);
};

// Pre-save middleware to clean expired devices
twoFactorAuthSchema.pre('save', function(next) {
  this.cleanExpiredDevices();
  next();
});

// Ensure virtuals are included in JSON output
twoFactorAuthSchema.set('toJSON', { virtuals: true });
twoFactorAuthSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);