const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true,
    index: true
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },
  browserNotifications: {
    type: Boolean,
    default: true
  },
  // Notification type preferences
  securityAlerts: {
    type: Boolean,
    default: true
  },
  systemUpdates: {
    type: Boolean,
    default: true
  },
  adminActions: {
    type: Boolean,
    default: true
  },
  mealUpdates: {
    type: Boolean,
    default: true
  },
  chefActions: {
    type: Boolean,
    default: true
  },
  orderAlerts: {
    type: Boolean,
    default: true
  },
  userActivity: {
    type: Boolean,
    default: false
  },
  paymentAlerts: {
    type: Boolean,
    default: true
  },
  general: {
    type: Boolean,
    default: true
  },
  // Quiet hours configuration
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String, // HH:mm format
      default: '22:00'
    },
    endTime: {
      type: String, // HH:mm format
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  // Digest settings
  dailyDigest: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: String, // HH:mm format
      default: '09:00'
    }
  },
  weeklyDigest: {
    enabled: {
      type: Boolean,
      default: false
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: 'Monday'
    },
    time: {
      type: String, // HH:mm format
      default: '09:00'
    }
  },
  // Advanced settings
  minimumSeverity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  maxNotificationsPerHour: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  groupSimilarNotifications: {
    type: Boolean,
    default: true
  },
  autoMarkAsRead: {
    enabled: {
      type: Boolean,
      default: false
    },
    afterDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30
    }
  }
}, {
  timestamps: true
});

// Instance method to check if notifications should be sent
notificationPreferencesSchema.methods.shouldSendNotification = function(notificationType, severity, timestamp = new Date()) {
  // Check if notification type is enabled
  if (!this[notificationType]) {
    return false;
  }
  
  // Check minimum severity
  const severityOrder = { info: 0, success: 1, warning: 2, error: 3 };
  if (severityOrder[severity] < severityOrder[this.minimumSeverity]) {
    return false;
  }
  
  // Check quiet hours
  if (this.quietHours.enabled) {
    const time = new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: this.quietHours.timezone 
    }).slice(0, 5); // HH:mm format
    
    const { startTime, endTime } = this.quietHours;
    
    if (startTime <= endTime) {
      // Same day range
      if (time >= startTime && time <= endTime) {
        return false;
      }
    } else {
      // Overnight range
      if (time >= startTime || time <= endTime) {
        return false;
      }
    }
  }
  
  return true;
};

// Static method to get default preferences for a new admin
notificationPreferencesSchema.statics.getDefaultPreferences = function(adminId) {
  return {
    adminId,
    emailNotifications: true,
    pushNotifications: true,
    browserNotifications: true,
    securityAlerts: true,
    systemUpdates: true,
    adminActions: true,
    mealUpdates: true,
    chefActions: true,
    orderAlerts: true,
    userActivity: false,
    paymentAlerts: true,
    general: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC'
    },
    dailyDigest: {
      enabled: false,
      time: '09:00'
    },
    weeklyDigest: {
      enabled: false,
      day: 'Monday',
      time: '09:00'
    },
    minimumSeverity: 'info',
    maxNotificationsPerHour: 10,
    groupSimilarNotifications: true,
    autoMarkAsRead: {
      enabled: false,
      afterDays: 7
    }
  };
};

// Static method to create or update preferences
notificationPreferencesSchema.statics.upsertPreferences = function(adminId, preferences) {
  return this.findOneAndUpdate(
    { adminId },
    { ...preferences, adminId },
    { upsert: true, new: true, runValidators: true }
  );
};

module.exports = mongoose.model('NotificationPreferences', notificationPreferencesSchema);