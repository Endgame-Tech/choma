const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'staff'],
    default: 'staff'
  },
  permissions: [{
    type: String,
    enum: [
      'users.read', 'users.write', 'users.delete',
      'orders.read', 'orders.write', 'orders.delete',
      'meals.read', 'meals.write', 'meals.delete',
      'chefs.read', 'chefs.write', 'chefs.delete',
      'payments.read', 'payments.write',
      'settings.read', 'settings.write',
      'analytics.read', 'reports.read'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Virtual for account locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('Account is temporarily locked');
  }
  
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    if (isMatch) {
      // Reset login attempts on successful login
      if (this.loginAttempts > 0) {
        this.loginAttempts = 0;
        this.lockUntil = undefined;
        await this.save();
      }
      return true;
    } else {
      // Increment login attempts
      this.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      
      await this.save();
      return false;
    }
  } catch (error) {
    throw error;
  }
};

// Method to check permissions
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Method to add audit log entry
adminSchema.methods.addAuditLog = function(action, details = null, ipAddress = null) {
  this.auditLog.push({
    action,
    details,
    ipAddress,
    timestamp: new Date()
  });
  
  // Keep only last 100 audit entries
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
};

// Static method to get role permissions
adminSchema.statics.getRolePermissions = function(role) {
  const rolePermissions = {
    super_admin: [
      'users.read', 'users.write', 'users.delete',
      'orders.read', 'orders.write', 'orders.delete',
      'meals.read', 'meals.write', 'meals.delete',
      'chefs.read', 'chefs.write', 'chefs.delete',
      'payments.read', 'payments.write',
      'settings.read', 'settings.write',
      'analytics.read', 'reports.read'
    ],
    admin: [
      'users.read', 'users.write',
      'orders.read', 'orders.write',
      'meals.read', 'meals.write',
      'chefs.read', 'chefs.write',
      'payments.read', 'payments.write',
      'analytics.read', 'reports.read'
    ],
    manager: [
      'users.read', 'users.write',
      'orders.read', 'orders.write',
      'meals.read', 'meals.write',
      'chefs.read',
      'payments.read',
      'analytics.read'
    ],
    staff: [
      'users.read',
      'orders.read', 'orders.write',
      'meals.read',
      'chefs.read'
    ]
  };
  
  return rolePermissions[role] || [];
};

// Pre-save middleware to set default permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    this.permissions = this.constructor.getRolePermissions(this.role);
  }
  next();
});

module.exports = mongoose.model('Admin', adminSchema);