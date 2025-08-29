const AdminNotification = require('../models/AdminNotification');
const NotificationPreferences = require('../models/NotificationPreferences');
const Admin = require('../models/Admin');

class AdminNotificationController {
  
  // Get admin notifications with filtering and pagination
  static async getNotifications(req, res) {
    try {
      const adminId = req.admin.adminId;
      const {
        page = 1,
        limit = 50,
        type,
        severity,
        read,
        dateRange,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Disable caching for real-time data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const filters = {
        adminId,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      if (type) {
        filters.type = Array.isArray(type) ? type : [type];
      }
      if (severity) {
        filters.severity = Array.isArray(severity) ? severity : [severity];
      }
      if (read !== undefined) {
        filters.read = read === 'true';
      }
      if (dateRange) {
        try {
          filters.dateRange = JSON.parse(dateRange);
        } catch (err) {
          // Ignore invalid dateRange
        }
      }

      const notifications = await AdminNotification.getFiltered(filters);
      
      // Get total count
      const query = { adminId };
      if (filters.type) query.type = { $in: filters.type };
      if (filters.severity) query.severity = { $in: filters.severity };
      if (typeof filters.read === 'boolean') query.read = filters.read;
      if (filters.dateRange) {
        query.createdAt = {};
        if (filters.dateRange.start) query.createdAt.$gte = new Date(filters.dateRange.start);
        if (filters.dateRange.end) query.createdAt.$lte = new Date(filters.dateRange.end);
      }

      const total = await AdminNotification.countDocuments(query);
      const unreadCount = await AdminNotification.getUnreadCount(adminId);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalNotifications: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
            unreadCount
          }
        }
      });
    } catch (error) {
      console.error('Get admin notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get unread notification count
  static async getUnreadCount(req, res) {
    try {
      const adminId = req.admin.adminId;
      const unreadCount = await AdminNotification.getUnreadCount(adminId);
      
      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get notification statistics
  static async getStats(req, res) {
    try {
      const adminId = req.admin.adminId;
      const stats = await AdminNotification.getStats(adminId);
      
      res.json({
        success: true,
        data: stats[0] || {
          total: 0,
          unread: 0,
          todayCount: 0,
          weekCount: 0,
          monthCount: 0,
          byType: {},
          bySeverity: {}
        }
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get specific notification
  static async getNotification(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.adminId;
      
      const notification = await AdminNotification.findOne({ _id: id, adminId })
        .populate('adminId', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName');
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Get notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.adminId;
      
      const notification = await AdminNotification.findOne({ _id: id, adminId });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      await notification.markAsRead();
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const adminId = req.admin.adminId;
      
      const result = await AdminNotification.updateMany(
        { adminId, read: false },
        { read: true, updatedAt: new Date() }
      );
      
      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.adminId;
      
      const result = await AdminNotification.findOneAndDelete({ _id: id, adminId });
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Bulk delete notifications
  static async bulkDeleteNotifications(req, res) {
    try {
      const adminId = req.admin.adminId;
      const { ids, filters } = req.body;
      
      let query = { adminId };
      
      if (ids && Array.isArray(ids)) {
        query._id = { $in: ids };
      } else if (filters) {
        if (filters.read !== undefined) query.read = filters.read;
        if (filters.type) query.type = { $in: Array.isArray(filters.type) ? filters.type : [filters.type] };
        if (filters.severity) query.severity = { $in: Array.isArray(filters.severity) ? filters.severity : [filters.severity] };
        if (filters.dateRange) {
          query.createdAt = {};
          if (filters.dateRange.start) query.createdAt.$gte = new Date(filters.dateRange.start);
          if (filters.dateRange.end) query.createdAt.$lte = new Date(filters.dateRange.end);
        }
      }
      
      const result = await AdminNotification.deleteMany(query);
      
      res.json({
        success: true,
        message: 'Notifications deleted successfully',
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Bulk delete notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get notification preferences
  static async getPreferences(req, res) {
    try {
      const adminId = req.admin.adminId;
      
      let preferences = await NotificationPreferences.findOne({ adminId });
      
      if (!preferences) {
        // Create default preferences
        const defaultPrefs = NotificationPreferences.getDefaultPreferences(adminId);
        preferences = await NotificationPreferences.create(defaultPrefs);
      }
      
      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update notification preferences
  static async updatePreferences(req, res) {
    try {
      const adminId = req.admin.adminId;
      const preferences = req.body;
      
      const updatedPreferences = await NotificationPreferences.upsertPreferences(adminId, preferences);
      
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: updatedPreferences
      });
    } catch (error) {
      console.error('Update notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Send notification to specific admin(s)
  static async sendNotification(req, res) {
    try {
      const {
        targetAdminIds,
        title,
        message,
        type = 'general',
        severity = 'info',
        actionUrl,
        actionLabel,
        metadata = {},
        expiresAt,
        persistent = false
      } = req.body;

      if (!targetAdminIds || !Array.isArray(targetAdminIds) || targetAdminIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Target admin IDs are required'
        });
      }

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
      }

      const notifications = [];
      
      for (const adminId of targetAdminIds) {
        // Check if admin exists
        const admin = await Admin.findById(adminId);
        if (!admin) {
          console.warn(`Admin ${adminId} not found, skipping notification`);
          continue;
        }

        // Check preferences before sending
        const preferences = await NotificationPreferences.findOne({ adminId });
        if (preferences && !preferences.shouldSendNotification(type, severity)) {
          continue;
        }

        const notification = new AdminNotification({
          adminId,
          title,
          message,
          type,
          severity,
          actionUrl,
          actionLabel,
          metadata,
          expiresAt,
          persistent
        });

        await notification.save();
        notifications.push(notification);
      }

      res.json({
        success: true,
        message: `Notification sent to ${notifications.length} admin(s)`,
        data: { sentCount: notifications.length, notifications }
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Broadcast notification to all admins
  static async broadcastNotification(req, res) {
    try {
      const {
        title,
        message,
        type = 'general',
        severity = 'info',
        actionUrl,
        actionLabel,
        metadata = {},
        expiresAt,
        persistent = false,
        excludeAdminIds = []
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
      }

      // Get all active admins
      const admins = await Admin.find({ 
        status: 'active',
        _id: { $nin: excludeAdminIds }
      }).select('_id');

      const notifications = [];
      
      for (const admin of admins) {
        // Check preferences before sending
        const preferences = await NotificationPreferences.findOne({ adminId: admin._id });
        if (preferences && !preferences.shouldSendNotification(type, severity)) {
          continue;
        }

        const notification = new AdminNotification({
          adminId: admin._id,
          title,
          message,
          type,
          severity,
          actionUrl,
          actionLabel,
          metadata,
          expiresAt,
          persistent
        });

        await notification.save();
        notifications.push(notification);
      }

      res.json({
        success: true,
        message: `Notification broadcasted to ${notifications.length} admin(s)`,
        data: { sentCount: notifications.length }
      });
    } catch (error) {
      console.error('Broadcast notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to broadcast notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get security alerts
  static async getSecurityAlerts(req, res) {
    try {
      const adminId = req.admin.adminId;
      const {
        page = 1,
        limit = 20,
        riskLevel,
        resolved = false
      } = req.query;

      const query = {
        adminId,
        type: 'security_alert'
      };

      if (riskLevel) {
        query.riskLevel = riskLevel;
      }

      if (resolved === 'true') {
        query.resolvedAt = { $exists: true };
      } else if (resolved === 'false') {
        query.resolvedAt = { $exists: false };
      }

      const alerts = await AdminNotification.find(query)
        .populate('adminId', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await AdminNotification.countDocuments(query);

      res.json({
        success: true,
        data: {
          alerts,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalAlerts: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get security alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch security alerts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create security alert
  static async createSecurityAlert(req, res) {
    try {
      const {
        targetAdminId,
        title,
        message,
        securityEventType,
        riskLevel = 'medium',
        affectedResource,
        sourceIP,
        userAgent,
        recommendations = [],
        metadata = {}
      } = req.body;

      if (!targetAdminId || !title || !message || !securityEventType) {
        return res.status(400).json({
          success: false,
          message: 'Target admin ID, title, message, and security event type are required'
        });
      }

      const alert = new AdminNotification({
        adminId: targetAdminId,
        title,
        message,
        type: 'security_alert',
        severity: 'error',
        securityEventType,
        riskLevel,
        affectedResource,
        sourceIP,
        userAgent,
        recommendations,
        metadata,
        persistent: true
      });

      await alert.save();

      res.json({
        success: true,
        message: 'Security alert created successfully',
        data: alert
      });
    } catch (error) {
      console.error('Create security alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create security alert',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Resolve security alert
  static async resolveSecurityAlert(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.adminId;
      const { resolution } = req.body;

      const alert = await AdminNotification.findOne({
        _id: id,
        type: 'security_alert'
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Security alert not found'
        });
      }

      alert.autoResolved = false;
      alert.resolvedBy = adminId;
      alert.resolvedAt = new Date();
      alert.read = true;
      
      if (resolution) {
        alert.metadata.resolution = resolution;
      }

      await alert.save();

      res.json({
        success: true,
        message: 'Security alert resolved successfully',
        data: alert
      });
    } catch (error) {
      console.error('Resolve security alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve security alert',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = AdminNotificationController;