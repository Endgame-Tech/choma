const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'ROLE_CHANGE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE']
  },
  module: {
    type: String,
    enum: ['users', 'orders', 'chefs', 'meals', 'mealPlans', 'admins', 'auth', 'system']
  },
  targetId: {
    type: String // ID of the affected resource
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for additional details
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  successful: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
activityLogSchema.index({ adminId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 6 months
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 }); // 6 months

// Method to calculate severity based on action and module
activityLogSchema.pre('save', function(next) {
  if (!this.severity || this.severity === 'low') {
    this.severity = this.calculateSeverity();
  }
  next();
});

activityLogSchema.methods.calculateSeverity = function() {
  const { action, module, details } = this;
  
  // Critical actions
  if (action === 'DELETE' && ['admins', 'users'].includes(module)) return 'critical';
  if (action === 'ROLE_CHANGE' && module === 'admins') return 'critical';
  if (details?.actionType === 'bulk_delete_admins') return 'critical';
  
  // High severity actions
  if (action === 'CREATE' && module === 'admins') return 'high';
  if (action === 'PERMISSION_CHANGE') return 'high';
  if (details?.actionType?.includes('bulk_')) return 'high';
  if (action === 'DELETE') return 'high';
  
  // Medium severity actions
  if (action === 'UPDATE' && ['admins', 'users'].includes(module)) return 'medium';
  if (action === 'CREATE') return 'medium';
  
  // Default low severity
  return 'low';
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);