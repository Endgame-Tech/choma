const mongoose = require('mongoose');

const twoFactorAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'setup',
      'disable', 
      'verify_success',
      'verify_failure',
      'backup_code_used',
      'backup_codes_regenerated',
      'device_trusted',
      'device_removed',
      'emergency_disable',
      'settings_changed',
      'recovery_attempt'
    ],
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  failureReason: String,
  // Security context
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  deviceFingerprint: String,
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Additional context based on action
  verificationMethod: {
    type: String,
    enum: ['totp', 'backup_code', 'trusted_device'],
  },
  backupCodeUsed: String,
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    trusted: Boolean
  },
  settingsChanged: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance and queries
twoFactorAuditLogSchema.index({ adminId: 1, createdAt: -1 });
twoFactorAuditLogSchema.index({ action: 1, createdAt: -1 });
twoFactorAuditLogSchema.index({ success: 1, createdAt: -1 });
twoFactorAuditLogSchema.index({ riskLevel: 1, createdAt: -1 });
twoFactorAuditLogSchema.index({ ipAddress: 1 });

// TTL index to auto-delete old logs (keep for 1 year)
twoFactorAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Virtual for risk score calculation
twoFactorAuditLogSchema.virtual('riskScore').get(function() {
  let score = 0;
  
  // Base score by action
  const actionScores = {
    'setup': 0,
    'disable': 80,
    'verify_success': 0,
    'verify_failure': 20,
    'backup_code_used': 30,
    'backup_codes_regenerated': 10,
    'device_trusted': 10,
    'device_removed': 5,
    'emergency_disable': 100,
    'settings_changed': 15,
    'recovery_attempt': 60
  };
  
  score += actionScores[this.action] || 0;
  
  // Add score for failure
  if (!this.success) {
    score += 40;
  }
  
  // Add score for unusual location (if available)
  if (this.location && this.details.unusualLocation) {
    score += 30;
  }
  
  // Add score for new device
  if (this.details.newDevice) {
    score += 20;
  }
  
  return Math.min(score, 100); // Cap at 100
});

// Method to determine risk level based on score
twoFactorAuditLogSchema.methods.calculateRiskLevel = function() {
  const score = this.riskScore;
  
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

// Static method to get recent suspicious activity
twoFactorAuditLogSchema.statics.getSuspiciousActivity = function(adminId, hours = 24) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.find({
    adminId,
    createdAt: { $gte: since },
    $or: [
      { success: false },
      { riskLevel: { $in: ['high', 'critical'] } },
      { action: { $in: ['emergency_disable', 'recovery_attempt', 'disable'] } }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to get admin 2FA activity summary
twoFactorAuditLogSchema.statics.getAdminSummary = function(adminId, days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        adminId: new mongoose.Types.ObjectId(adminId),
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        failureCount: { $sum: { $cond: ['$success', 0, 1] } },
        lastOccurrence: { $max: '$createdAt' },
        riskLevels: { $push: '$riskLevel' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        successCount: 1,
        failureCount: 1,
        successRate: {
          $multiply: [
            { $divide: ['$successCount', '$count'] },
            100
          ]
        },
        lastOccurrence: 1,
        highRiskCount: {
          $size: {
            $filter: {
              input: '$riskLevels',
              cond: { $in: ['$$this', ['high', 'critical']] }
            }
          }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get system-wide 2FA metrics
twoFactorAuditLogSchema.statics.getSystemMetrics = function(days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        successfulEvents: { $sum: { $cond: ['$success', 1, 0] } },
        failedEvents: { $sum: { $cond: ['$success', 0, 1] } },
        uniqueAdmins: { $addToSet: '$adminId' },
        actionBreakdown: { $push: '$action' },
        riskBreakdown: { $push: '$riskLevel' },
        verificationMethods: { $push: '$verificationMethod' }
      }
    },
    {
      $project: {
        _id: 0,
        totalEvents: 1,
        successfulEvents: 1,
        failedEvents: 1,
        uniqueAdminsCount: { $size: '$uniqueAdmins' },
        successRate: {
          $multiply: [
            { $divide: ['$successfulEvents', '$totalEvents'] },
            100
          ]
        },
        actionBreakdown: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$actionBreakdown'] },
              as: 'action',
              in: {
                k: '$$action',
                v: {
                  $size: {
                    $filter: {
                      input: '$actionBreakdown',
                      cond: { $eq: ['$$this', '$$action'] }
                    }
                  }
                }
              }
            }
          }
        },
        riskBreakdown: {
          $arrayToObject: {
            $map: {
              input: ['low', 'medium', 'high', 'critical'],
              as: 'risk',
              in: {
                k: '$$risk',
                v: {
                  $size: {
                    $filter: {
                      input: '$riskBreakdown',
                      cond: { $eq: ['$$this', '$$risk'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
};

// Pre-save middleware to calculate risk level
twoFactorAuditLogSchema.pre('save', function(next) {
  if (!this.riskLevel) {
    this.riskLevel = this.calculateRiskLevel();
  }
  next();
});

// Ensure virtuals are included in JSON output
twoFactorAuditLogSchema.set('toJSON', { virtuals: true });
twoFactorAuditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TwoFactorAuditLog', twoFactorAuditLogSchema);