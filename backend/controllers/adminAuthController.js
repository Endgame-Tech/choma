const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign(
    { 
      adminId, 
      type: 'admin',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' } // 8 hour expiry for admin sessions
  );
};

// Generate refresh token
const generateRefreshToken = (adminId) => {
  return jwt.sign(
    { 
      adminId, 
      type: 'admin_refresh',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days for refresh token
  );
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to multiple failed attempts'
      });
    }

    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      // Add failed login attempt to audit log
      admin.addAuditLog('failed_login', { email }, clientIP);
      await admin.save();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    admin.addAuditLog('successful_login', null, clientIP);
    await admin.save();

    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Remove sensitive data
    const adminData = {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
      department: admin.department,
      profileImage: admin.profileImage,
      lastLogin: admin.lastLogin
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminData,
        token,
        refreshToken,
        expiresIn: '8h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Admin logout
const adminLogout = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId);
    if (admin) {
      admin.addAuditLog('logout', null, req.ip);
      await admin.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'admin_refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Find admin
    const admin = await Admin.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found or inactive'
      });
    }

    // Generate new tokens
    const newToken = generateToken(admin._id);
    const newRefreshToken = generateRefreshToken(admin._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: '8h'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }
};

// Get current admin profile
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId).select('-password -twoFactorSecret');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, department } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (department) updateData.department = department.trim();

    const admin = await Admin.findByIdAndUpdate(
      req.admin.adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    admin.addAuditLog('profile_updated', updateData, req.ip);
    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: admin
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Change admin password
const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const admin = await Admin.findById(req.admin.adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Verify current password
    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    admin.addAuditLog('password_changed', null, req.ip);
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Create admin (super admin only)
const createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;

    // Check if current admin has permission
    const currentAdmin = await Admin.findById(req.admin.adminId);
    if (currentAdmin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can create new admin accounts'
      });
    }

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role || 'staff',
      department: department?.trim(),
      createdBy: req.admin.adminId
    });

    await newAdmin.save();

    // Add audit log
    currentAdmin.addAuditLog('admin_created', {
      createdAdminId: newAdmin._id,
      email: newAdmin.email,
      role: newAdmin.role
    }, req.ip);
    await currentAdmin.save();

    // Remove sensitive data
    const adminData = {
      id: newAdmin._id,
      email: newAdmin.email,
      firstName: newAdmin.firstName,
      lastName: newAdmin.lastName,
      role: newAdmin.role,
      department: newAdmin.department,
      isActive: newAdmin.isActive,
      createdAt: newAdmin.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminData
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  adminLoginLimiter,
  adminLogin,
  adminLogout,
  refreshToken,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  createAdmin
};