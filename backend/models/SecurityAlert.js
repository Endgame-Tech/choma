const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  type: {
    type: String,
    enum: ['permission_change', 'role_change', 'admin_created', 'admin_deleted', 'bulk_operation', 'security_breach', 'system_alert'],
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  adminName: String,
  adminEmail: String,
  targetAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  targetAdminName: String,
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: {
    type: Date
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes
securityAlertSchema.index({ severity: 1, resolved: 1, createdAt: -1 });
securityAlertSchema.index({ type: 1, resolved: 1, createdAt: -1 });
securityAlertSchema.index({ adminId: 1, createdAt: -1 });
securityAlertSchema.index({ resolved: 1, createdAt: -1 });

// Auto-delete resolved alerts older than 3 months
securityAlertSchema.index({ 
  resolvedAt: 1 
}, { 
  expireAfterSeconds: 7776000, // 3 months
  partialFilterExpression: { resolved: true }
});

// Method to resolve alert
securityAlertSchema.methods.resolve = function(adminId) {
  this.resolved = true;
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  return this.save();
};

// Static method to create security alert
securityAlertSchema.statics.createAlert = function(alertData) {
  const alert = new this({
    title: alertData.title,
    message: alertData.message,
    severity: alertData.severity,
    type: alertData.type,
    adminId: alertData.adminId,
    adminName: alertData.adminName,
    adminEmail: alertData.adminEmail,
    targetAdminId: alertData.targetAdminId,
    targetAdminName: alertData.targetAdminName,
    data: alertData.data || {},
    ipAddress: alertData.ipAddress,
    userAgent: alertData.userAgent
  });
  
  return alert.save();
};

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);