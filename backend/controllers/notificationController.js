const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const pushNotificationService = require('../services/pushNotificationService');

class NotificationController {
  
  // Get user notifications with pagination and filters
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const type = req.query.type || null;
      
      // Disable caching for notifications to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': false
      });
      
      console.log(`📱 Getting notifications for user ${userId}, page ${page}, limit ${limit}`);
      
      // Debug: Check what notifications exist in database
      const allNotifications = await Notification.find({}).select('userId title type createdAt').sort({ createdAt: -1 }).limit(10);
      console.log('🔍 All recent notifications in DB:', allNotifications.map(n => ({ 
        userId: n.userId, 
        title: n.title, 
        type: n.type,
        userIdMatch: n.userId.toString() === userId.toString()
      })));
      
      // Get notifications
      const notifications = await Notification.getUserNotifications(userId, {
        page,
        limit,
        unreadOnly,
        type
      });
      
      // Get total count for pagination
      const query = { userId };
      if (unreadOnly) query.isRead = false;
      if (type) query.type = type;
      
      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.getUnreadCount(userId);
      
      console.log(`📊 Found ${notifications.length} notifications, ${unreadCount} unread for user ${userId}`);
      
      const responseData = {
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalNotifications: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
            unreadCount
          }
        }
      };
      
      console.log('📤 Sending notification response:', JSON.stringify({
        success: responseData.success,
        notificationCount: responseData.data.notifications.length,
        unreadCount: responseData.data.pagination.unreadCount,
        firstNotification: responseData.data.notifications[0] ? {
          title: responseData.data.notifications[0].title,
          type: responseData.data.notifications[0].type
        } : null
      }, null, 2));
      
      res.json(responseData);
    } catch (error) {
      console.error('Get notifications error:', error);
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
      const userId = req.user.id;
      const unreadCount = await Notification.getUnreadCount(userId);
      
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
  
  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({ _id: id, userId });
      
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
      const userId = req.user.id;
      
      const result = await Notification.markAllAsRead(userId);
      
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
      const userId = req.user.id;
      
      const result = await Notification.findOneAndDelete({ _id: id, userId });
      
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
  
  // Delete all read notifications
  static async deleteAllRead(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await Notification.deleteMany({ 
        userId, 
        isRead: true 
      });
      
      res.json({
        success: true,
        message: 'All read notifications deleted',
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Delete all read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete read notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get notification by ID
  static async getNotificationById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({ _id: id, userId });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      // Mark as read if not already read
      if (!notification.isRead) {
        await notification.markAsRead();
      }
      
      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Get notification by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Update notification preferences
  static async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const {
        orderUpdates = true,
        deliveryReminders = true,
        promotions = true,
        newMealPlans = true,
        achievements = true,
        pushNotifications = true
      } = req.body;
      
      const preferences = {
        orderUpdates,
        deliveryReminders,
        promotions,
        newMealPlans,
        achievements,
        pushNotifications
      };
      
      await Customer.findByIdAndUpdate(userId, {
        notificationPreferences: preferences
      });
      
      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: preferences
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get notification preferences
  static async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      const customer = await Customer.findById(userId).select('notificationPreferences');
      
      const defaultPreferences = {
        orderUpdates: true,
        deliveryReminders: true,
        promotions: true,
        newMealPlans: true,
        achievements: true,
        pushNotifications: true
      };
      
      const preferences = customer?.notificationPreferences || defaultPreferences;
      
      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get notification statistics
  static async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;
      
      const totalNotifications = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });
      const readCount = totalNotifications - unreadCount;
      
      // Get stats by type
      const typeStats = await Notification.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentNotifications = await Notification.countDocuments({
        userId,
        createdAt: { $gte: sevenDaysAgo }
      });
      
      res.json({
        success: true,
        data: {
          total: totalNotifications,
          unread: unreadCount,
          read: readCount,
          recent: recentNotifications,
          byType: typeStats
        }
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Admin: Get all notifications with filters
  static async getAllNotifications(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const type = req.query.type || null;
      const userId = req.query.userId || null;
      const isRead = req.query.isRead;
      
      const query = {};
      if (type) query.type = type;
      if (userId) query.userId = userId;
      if (isRead !== undefined) query.isRead = isRead === 'true';
      
      const notifications = await Notification.find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Notification.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalNotifications: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get all notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Clean up expired notifications (cron job endpoint)
  static async cleanupExpired(req, res) {
    try {
      const result = await Notification.deleteExpired();
      
      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      
      res.json({
        success: true,
        message: 'Expired notifications cleaned up',
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Cleanup expired error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Test push notification (development only)
  static async sendTestPushNotification(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Test push notifications are only available in development'
        });
      }

      const userId = req.user.id;
      
      // Get user's push tokens
      const customer = await Customer.findById(userId).select('pushTokens');
      
      console.log(`🔍 Debug - User ${userId} push tokens:`, {
        customerExists: !!customer,
        pushTokensExists: !!customer?.pushTokens,
        pushTokensLength: customer?.pushTokens?.length || 0,
        pushTokens: customer?.pushTokens
      });
      
      if (!customer || !customer.pushTokens || customer.pushTokens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No push tokens found for user. Please ensure push notifications are properly initialized.',
          debug: {
            userId,
            customerFound: !!customer,
            pushTokensCount: customer?.pushTokens?.length || 0
          }
        });
      }

      const results = [];
      
      // Send test notification to all user's devices
      for (const tokenData of customer.pushTokens) {
        try {
          const result = await pushNotificationService.sendPushNotification({
            to: tokenData.token,
            title: "🧪 Test Push Notification",
            body: "This is a test push notification from development mode!",
            data: {
              type: "test",
              timestamp: new Date().toISOString(),
              environment: "development"
            },
            tokenType: tokenData.tokenType || 'expo'
          });

          results.push({
            device: tokenData.deviceId,
            success: true,
            result: result
          });

          console.log(`✅ Test push sent to ${tokenData.deviceId}:`, result);
        } catch (error) {
          console.error(`❌ Test push failed for ${tokenData.deviceId}:`, error);
          results.push({
            device: tokenData.deviceId,
            success: false,
            error: error.message
          });
        }
      }

      // Also create a notification in database
      const notification = new Notification({
        userId,
        title: "🧪 Test Push Notification",
        message: "This is a test push notification from development mode!",
        type: "test",
        data: {
          environment: "development",
          timestamp: new Date().toISOString()
        },
        isRead: false,
        createdAt: new Date()
      });

      await notification.save();

      res.json({
        success: true,
        message: 'Test push notifications sent',
        data: {
          deviceCount: customer.pushTokens.length,
          results: results,
          notificationId: notification._id
        }
      });
    } catch (error) {
      console.error('Send test push error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test push notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = NotificationController;