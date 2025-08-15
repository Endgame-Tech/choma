const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      'security_alert',
      'system_update', 
      'admin_action',
      'meal_update',
      'chef_action',
      'order_alert',
      'user_activity',
      'payment_alert',
      'general'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  actionUrl: {
    type: String,
    maxlength: 500
  },
  actionLabel: {
    type: String,
    maxlength: 50
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for auto-deletion
  },
  persistent: {
    type: Boolean,
    default: false
  },
  // For security notifications
  securityEventType: {
    type: String,
    enum: [
      'failed_login_attempts',
      'suspicious_activity',
      'privilege_escalation', 
      'data_access_violation',
      'bulk_operations',
      'after_hours_access',
      'location_anomaly',
      'multiple_sessions',
      'password_reset',
      'two_factor_disabled',
      'admin_created',
      'admin_deleted',
      'permission_changed',
      'critical_data_modified'
    ]
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  affectedResource: String,
  sourceIP: String,
  userAgent: String,
  recommendations: [String],
  autoResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
adminNotificationSchema.index({ adminId: 1, createdAt: -1 });
adminNotificationSchema.index({ adminId: 1, read: 1 });
adminNotificationSchema.index({ adminId: 1, type: 1 });
adminNotificationSchema.index({ type: 1, severity: 1 });
adminNotificationSchema.index({ createdAt: -1 });

// Virtual for calculating time ago
adminNotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Method to mark as read
adminNotificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Static method to get unread count for admin
adminNotificationSchema.statics.getUnreadCount = function(adminId) {
  return this.countDocuments({ adminId, read: false });
};

// Static method to get notifications with filters
adminNotificationSchema.statics.getFiltered = function(filters = {}) {
  const {
    adminId,
    type,
    severity,
    read,
    dateRange,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const query = {};
  
  if (adminId) query.adminId = adminId;
  if (type) {
    if (Array.isArray(type)) {
      query.type = { $in: type };
    } else {
      query.type = type;
    }
  }
  if (severity) {
    if (Array.isArray(severity)) {
      query.severity = { $in: severity };
    } else {
      query.severity = severity;
    }
  }
  if (typeof read === 'boolean') query.read = read;
  if (dateRange) {
    query.createdAt = {};
    if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
  }

  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('adminId', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName')
    .sort(sortObj)
    .skip(skip)
    .limit(limit);
};

// Static method to get notification stats
adminNotificationSchema.statics.getStats = function(adminId) {
  const matchStage = adminId ? { adminId: new mongoose.Types.ObjectId(adminId) } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            read: '$read'
          }
        },
        bySeverity: {
          $push: {
            severity: '$severity',
            read: '$read'
          }
        },
        todayCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
              1,
              0
            ]
          }
        },
        weekCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        monthCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
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
        total: 1,
        unread: 1,
        todayCount: 1,
        weekCount: 1,
        monthCount: 1,
        byType: {
          $arrayToObject: {
            $map: {
              input: ['security_alert', 'system_update', 'admin_action', 'meal_update', 'chef_action', 'order_alert', 'user_activity', 'payment_alert', 'general'],
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', '$$type'] }
                    }
                  }
                }
              }
            }
          }
        },
        bySeverity: {
          $arrayToObject: {
            $map: {
              input: ['info', 'warning', 'error', 'success'],
              as: 'severity',
              in: {
                k: '$$severity',
                v: {
                  $size: {
                    $filter: {
                      input: '$bySeverity',
                      cond: { $eq: ['$$this.severity', '$$severity'] }
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

// Auto-delete old read notifications (30 days)
adminNotificationSchema.pre('save', function(next) {
  if (this.read && !this.persistent && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

// Ensure virtuals are included in JSON output
adminNotificationSchema.set('toJSON', { virtuals: true });
adminNotificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);