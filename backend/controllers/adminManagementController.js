const Admin = require('../models/Admin');
const ActivityLog = require('../models/ActivityLog');
const SecurityAlert = require('../models/SecurityAlert');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ============= ADMIN CRUD OPERATIONS =============

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter['role.id'] = role;
    }
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [admins, total] = await Promise.all([
      Admin.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password -twoFactorSecret'),
      Admin.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalAdmins: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: error.message
    });
  }
};

// Get single admin
exports.getAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    const admin = await Admin.findById(id).select('-password -twoFactorSecret');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: { admin }
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin',
      error: error.message
    });
  }
};

// Create admin
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (email, password, firstName, lastName, roleId)'
      });
    }

    // Check if admin with email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Get role from predefined roles
    const predefinedRoles = Admin.getPredefinedRoles();
    const selectedRole = predefinedRoles.find(role => role.id === roleId);
    
    if (!selectedRole) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: selectedRole,
      isActive: true,
      isAlphaAdmin: false,
      createdBy: req.admin?.adminId
    });

    await newAdmin.save();

    // Log activity
    if (req.admin?.adminId) {
      await ActivityLog.create({
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        action: 'CREATE',
        module: 'admins',
        targetId: newAdmin._id.toString(),
        details: {
          newAdminEmail: newAdmin.email,
          newAdminName: `${newAdmin.firstName} ${newAdmin.lastName}`,
          assignedRole: selectedRole.name
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Create security alert
      await SecurityAlert.createAlert({
        title: 'New Admin Created',
        message: `New admin account created for ${newAdmin.firstName} ${newAdmin.lastName} (${newAdmin.email}) with role ${selectedRole.name}`,
        severity: 'high',
        type: 'admin_created',
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        targetAdminId: newAdmin._id,
        targetAdminName: `${newAdmin.firstName} ${newAdmin.lastName}`,
        data: { assignedRole: selectedRole.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Return admin without password
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;
    delete adminResponse.twoFactorSecret;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: adminResponse }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, roleId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent modification of Alpha Admin
    if (admin.isAlphaAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify Alpha Admin account'
      });
    }

    const oldData = {
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role.name,
      isActive: admin.isActive
    };

    // Update fields if provided
    if (firstName !== undefined) admin.firstName = firstName.trim();
    if (lastName !== undefined) admin.lastName = lastName.trim();
    if (isActive !== undefined) admin.isActive = isActive;

    // Update role if provided
    if (roleId && roleId !== admin.role.id) {
      const predefinedRoles = Admin.getPredefinedRoles();
      const newRole = predefinedRoles.find(role => role.id === roleId);
      
      if (!newRole) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      admin.role = newRole;
    }

    await admin.save();

    // Log activity
    if (req.admin?.adminId) {
      await ActivityLog.create({
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        action: 'UPDATE',
        module: 'admins',
        targetId: admin._id.toString(),
        details: {
          oldData,
          newData: {
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role.name,
            isActive: admin.isActive
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Create security alert if role changed
      if (roleId && oldData.role !== admin.role.name) {
        await SecurityAlert.createAlert({
          title: 'Admin Role Changed',
          message: `Admin ${admin.firstName} ${admin.lastName} (${admin.email}) role changed from ${oldData.role} to ${admin.role.name}`,
          severity: 'critical',
          type: 'role_change',
          adminId: req.user.id,
          adminName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
          adminEmail: req.user.email,
          targetAdminId: admin._id,
          targetAdminName: `${admin.firstName} ${admin.lastName}`,
          data: { oldRole: oldData.role, newRole: admin.role.name },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    }

    // Return updated admin without sensitive fields
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.twoFactorSecret;

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin: adminResponse }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: error.message
    });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent deletion of Alpha Admin
    if (admin.isAlphaAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete Alpha Admin account'
      });
    }

    const adminData = {
      email: admin.email,
      name: `${admin.firstName} ${admin.lastName}`,
      role: admin.role.name
    };

    await Admin.findByIdAndDelete(id);

    // Log activity
    if (req.admin?.adminId) {
      await ActivityLog.create({
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        action: 'DELETE',
        module: 'admins',
        targetId: id,
        details: {
          deletedAdmin: adminData
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Create security alert
      await SecurityAlert.createAlert({
        title: 'Admin Account Deleted',
        message: `Admin account for ${adminData.name} (${adminData.email}) with role ${adminData.role} has been permanently deleted`,
        severity: 'critical',
        type: 'admin_deleted',
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        targetAdminName: adminData.name,
        data: { deletedAdmin: adminData },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: error.message
    });
  }
};

// Toggle admin status
exports.toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent modification of Alpha Admin
    if (admin.isAlphaAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify Alpha Admin status'
      });
    }

    const oldStatus = admin.isActive;
    admin.isActive = !admin.isActive;
    await admin.save();

    // Log activity
    if (req.admin?.adminId) {
      await ActivityLog.create({
        adminId: req.admin.adminId,
        adminName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim(),
        adminEmail: req.admin.email,
        action: 'UPDATE',
        module: 'admins',
        targetId: admin._id.toString(),
        details: {
          statusChange: {
            from: oldStatus ? 'active' : 'inactive',
            to: admin.isActive ? 'active' : 'inactive'
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({
      success: true,
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { admin: { isActive: admin.isActive } }
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin status',
      error: error.message
    });
  }
};

// Get predefined roles
exports.getPredefinedRoles = async (req, res) => {
  try {
    const roles = Admin.getPredefinedRoles();
    res.json({
      success: true,
      data: { roles }
    });
  } catch (error) {
    console.error('Get predefined roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
};

// ============= ACTIVITY LOGS =============

// Get activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      adminId,
      action,
      module,
      severity,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter
    const filter = {};
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.adminId = adminId;
    }
    if (action) filter.action = action;
    if (module) filter.module = module;
    if (severity) filter.severity = severity;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (search) {
      filter.$or = [
        { adminName: { $regex: search, $options: 'i' } },
        { adminEmail: { $regex: search, $options: 'i' } },
        { 'details.actionType': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('adminId', 'firstName lastName email'),
      ActivityLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalLogs: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

// ============= SECURITY ALERTS =============

// Get security alerts
exports.getSecurityAlerts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity,
      type,
      resolved = 'false'
    } = req.query;

    // Build filter
    const filter = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (resolved === 'true') {
      filter.resolved = true;
    } else if (resolved === 'false') {
      filter.resolved = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [alerts, total] = await Promise.all([
      SecurityAlert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('adminId', 'firstName lastName email')
        .populate('targetAdminId', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName email'),
      SecurityAlert.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalAlerts: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get security alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security alerts',
      error: error.message
    });
  }
};

// Resolve security alert
exports.resolveSecurityAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert ID'
      });
    }

    const alert = await SecurityAlert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Security alert not found'
      });
    }

    if (alert.resolved) {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }

    await alert.resolve(req.admin?.adminId);

    res.json({
      success: true,
      message: 'Security alert resolved successfully'
    });
  } catch (error) {
    console.error('Resolve security alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve security alert',
      error: error.message
    });
  }
};

module.exports = exports;