const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Payment notifications
      'payment_success',
      'payment_failed', 
      'refund_processed',
      
      // User notifications
      'welcome',
      'profile_incomplete',
      
      // Subscription notifications
      'subscription_created',
      'subscription_renewed',
      'subscription_expiring',
      'subscription_paused',
      'subscription_cancelled',
      
      // Order notifications
      'order_confirmed',
      'order_preparing',
      'order_ready',
      'order_out_for_delivery',
      'order_delivered',
      'order_cancelled',
      
      // Chef notifications
      'chef_assigned',
      'chef_changed',
      
      // Driver notifications
      'driver_assignment',
      
      // Chef notifications
      'chef_status_update',
      
      // Order status notifications
      'order_status_update',
      
      // Promotional notifications
      'new_meal_plans',
      'special_offer',
      'seasonal_menu'
    ]
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  pushSent: {
    type: Boolean,
    default: false
  },
  pushSentAt: {
    type: Date
  },
  pushError: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

notificationSchema.methods.markPushSent = function(error = null) {
  this.pushSent = !error;
  this.pushSentAt = new Date();
  if (error) {
    this.pushError = error.toString();
  }
  return this.save();
};

// Static methods
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, updatedAt: new Date() }
  );
};

notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null
  } = options;

  const query = { userId };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// Virtual for notification icon based on type
notificationSchema.virtual('icon').get(function() {
  const iconMap = {
    // Payment
    payment_success: '💳',
    payment_failed: '❌',
    refund_processed: '💰',
    
    // User
    welcome: '👋',
    profile_incomplete: '📝',
    
    // Subscription
    subscription_created: '✅',
    subscription_renewed: '🔄',
    subscription_expiring: '⏰',
    subscription_paused: '⏸️',
    subscription_cancelled: '❌',
    
    // Order
    order_confirmed: '📦',
    order_preparing: '👨‍🍳',
    order_ready: '✅',
    order_out_for_delivery: '🚚',
    order_delivered: '✅',
    order_cancelled: '❌',
    
    // Chef
    chef_assigned: '👨‍🍳',
    chef_changed: '🔄',
    
    // Promotional
    new_meal_plans: '🍽️',
    special_offer: '🏷️',
    seasonal_menu: '🌟'
  };
  
  return iconMap[this.type] || '📢';
});

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Ensure virtuals are included in JSON output
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);