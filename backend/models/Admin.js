const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Admin Role Schema
const adminRoleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  permissions: {
    dashboard: {
      view: { type: Boolean, default: false }
    },
    analytics: {
      view: { type: Boolean, default: false }
    },
    orders: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    chefs: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      manageApplications: { type: Boolean, default: false }
    },
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      viewSensitiveInfo: { type: Boolean, default: false }
    },
    customers: {
      view: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      viewSensitiveInfo: { type: Boolean, default: false }
    },
    meals: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      bulkUpload: { type: Boolean, default: false },
      manageAvailability: { type: Boolean, default: false }
    },
    mealPlans: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      publish: { type: Boolean, default: false },
      schedule: { type: Boolean, default: false }
    },
    adminManagement: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      managePermissions: { type: Boolean, default: false },
      view_activity_logs: { type: Boolean, default: false },
      manage_sessions: { type: Boolean, default: false }
    }
  },
  isDefault: { type: Boolean, default: false }
});

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
    type: adminRoleSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAlphaAdmin: {
    type: Boolean,
    default: false
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
  sessions: [{
    sessionId: String,
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
      ip: String
    },
    loginTime: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

// Indexes
// Note: email index is automatically created by 'unique: true' field property
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
adminSchema.methods.hasPermission = function(module, action) {
  // Alpha admin has all permissions
  if (this.isAlphaAdmin) return true;
  
  // Check if the role has the specific permission
  if (this.role && this.role.permissions && this.role.permissions[module]) {
    return this.role.permissions[module][action] || false;
  }
  
  return false;
};

// Method to add session
adminSchema.methods.addSession = function(sessionData) {
  // Remove old inactive sessions (keep last 5)
  this.sessions = this.sessions.filter(s => s.isActive).slice(-4);
  
  this.sessions.push({
    sessionId: sessionData.sessionId,
    deviceInfo: sessionData.deviceInfo,
    loginTime: new Date(),
    lastActivity: new Date(),
    isActive: true
  });
};

// Method to update session activity
adminSchema.methods.updateSessionActivity = function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
};

// Method to deactivate session
adminSchema.methods.deactivateSession = function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.isActive = false;
  }
};

// Static method to get predefined roles
adminSchema.statics.getPredefinedRoles = function() {
  return [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      permissions: {
        dashboard: { view: true },
        analytics: { view: true },
        orders: { view: true, create: true, edit: true, delete: true, approve: true },
        chefs: { view: true, create: true, edit: true, delete: true, approve: true, manageApplications: true },
        users: { view: true, create: true, edit: true, delete: true, viewSensitiveInfo: true },
        customers: { view: true, edit: true, delete: true, viewSensitiveInfo: true },
        meals: { view: true, create: true, edit: true, delete: true, bulkUpload: true, manageAvailability: true },
        mealPlans: { view: true, create: true, edit: true, delete: true, publish: true, schedule: true },
        adminManagement: { view: true, create: true, edit: true, delete: true, managePermissions: true, view_activity_logs: true, manage_sessions: true }
      },
      isDefault: true
    },
    {
      id: 'content_manager',
      name: 'Content Manager',
      description: 'Manage meals, meal plans, and content creation',
      permissions: {
        dashboard: { view: true },
        analytics: { view: false },
        orders: { view: true, create: false, edit: false, delete: false, approve: false },
        chefs: { view: true, create: false, edit: false, delete: false, approve: false, manageApplications: false },
        users: { view: true, create: false, edit: false, delete: false, viewSensitiveInfo: false },
        customers: { view: true, edit: false, delete: false, viewSensitiveInfo: false },
        meals: { view: true, create: true, edit: true, delete: true, bulkUpload: true, manageAvailability: true },
        mealPlans: { view: true, create: true, edit: true, delete: true, publish: true, schedule: true },
        adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false }
      },
      isDefault: true
    },
    {
      id: 'operations_staff',
      name: 'Operations Staff',
      description: 'Handle orders, chefs, and daily operations',
      permissions: {
        dashboard: { view: true },
        analytics: { view: false },
        orders: { view: true, create: true, edit: true, delete: false, approve: true },
        chefs: { view: true, create: false, edit: true, delete: false, approve: true, manageApplications: true },
        users: { view: true, create: false, edit: true, delete: false, viewSensitiveInfo: false },
        customers: { view: true, edit: true, delete: false, viewSensitiveInfo: false },
        meals: { view: true, create: false, edit: false, delete: false, bulkUpload: false, manageAvailability: true },
        mealPlans: { view: true, create: false, edit: false, delete: false, publish: false, schedule: false },
        adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false }
      },
      isDefault: true
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to basic information',
      permissions: {
        dashboard: { view: true },
        analytics: { view: false },
        orders: { view: true, create: false, edit: false, delete: false, approve: false },
        chefs: { view: true, create: false, edit: false, delete: false, approve: false, manageApplications: false },
        users: { view: true, create: false, edit: false, delete: false, viewSensitiveInfo: false },
        customers: { view: true, edit: false, delete: false, viewSensitiveInfo: false },
        meals: { view: true, create: false, edit: false, delete: false, bulkUpload: false, manageAvailability: false },
        mealPlans: { view: true, create: false, edit: false, delete: false, publish: false, schedule: false },
        adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false }
      },
      isDefault: true
    }
  ];
};

module.exports = mongoose.model('Admin', adminSchema);