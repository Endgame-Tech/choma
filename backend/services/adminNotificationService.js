const AdminNotification = require('../models/AdminNotification');
const NotificationPreferences = require('../models/NotificationPreferences');
const socketService = require('./socketService');

class AdminNotificationService {
  
  // Create and send notification
  static async createNotification(notificationData) {
    try {
      const {
        adminId,
        title,
        message,
        type = 'general',
        severity = 'info',
        actionUrl,
        actionLabel,
        metadata = {},
        expiresAt,
        persistent = false,
        securityEventType,
        riskLevel,
        affectedResource,
        sourceIP,
        userAgent,
        recommendations = []
      } = notificationData;

      // Check preferences before creating
      const preferences = await NotificationPreferences.findOne({ adminId });
      if (preferences && !preferences.shouldSendNotification(type, severity)) {
        console.log(`Skipping notification for admin ${adminId} due to preferences`);
        return null;
      }

      // Create notification
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
        persistent,
        securityEventType,
        riskLevel,
        affectedResource,
        sourceIP,
        userAgent,
        recommendations
      });

      await notification.save();

      // Send real-time notification via WebSocket
      const sent = await socketService.sendNotification(notification);
      if (sent) {
        console.log(`Real-time notification sent to admin ${adminId}: ${title}`);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create multiple notifications
  static async createNotifications(notifications) {
    const results = [];
    for (const notificationData of notifications) {
      try {
        const notification = await this.createNotification(notificationData);
        if (notification) {
          results.push(notification);
        }
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
    return results;
  }

  // Broadcast notification to all active admins
  static async broadcastNotification(notificationData) {
    try {
      const Admin = require('../models/Admin');
      const activeAdmins = await Admin.find({ status: 'active' }).select('_id');
      
      const notifications = [];
      for (const admin of activeAdmins) {
        const notification = await this.createNotification({
          ...notificationData,
          adminId: admin._id
        });
        if (notification) {
          notifications.push(notification);
        }
      }

      // Also broadcast via WebSocket
      socketService.broadcast('new_notification', {
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        severity: notificationData.severity,
        broadcast: true
      });

      return notifications;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  // Send security alert
  static async sendSecurityAlert(alertData) {
    try {
      const notification = await this.createNotification({
        ...alertData,
        type: 'security_alert',
        severity: 'error',
        persistent: true
      });

      if (notification) {
        // Send special security alert via WebSocket
        await socketService.sendSecurityAlert(alertData.adminId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error sending security alert:', error);
      throw error;
    }
  }

  // Send system update notification
  static async sendSystemUpdate(updateData) {
    try {
      const notifications = await this.broadcastNotification({
        ...updateData,
        type: 'system_update',
        severity: updateData.severity || 'info'
      });

      // Send system update via WebSocket
      socketService.broadcastSystemUpdate(updateData);

      return notifications;
    } catch (error) {
      console.error('Error sending system update:', error);
      throw error;
    }
  }

  // Send admin action notification
  static async sendAdminActionNotification(actionData) {
    try {
      const {
        performedBy,
        targetAdminId,
        action,
        details = {},
        affectedResource
      } = actionData;

      const Admin = require('../models/Admin');
      const performedByAdmin = await Admin.findById(performedBy);
      
      let targetAdmins = [];
      if (targetAdminId) {
        targetAdmins = [targetAdminId];
      } else {
        // Notify all super admins if no specific target
        const superAdmins = await Admin.find({ 
          role: 'super_admin', 
          status: 'active',
          _id: { $ne: performedBy } // Don't notify the performer
        }).select('_id');
        targetAdmins = superAdmins.map(admin => admin._id);
      }

      const notifications = [];
      for (const adminId of targetAdmins) {
        const notification = await this.createNotification({
          adminId,
          title: `Admin Action: ${action}`,
          message: `${performedByAdmin?.firstName || 'Admin'} ${performedByAdmin?.lastName || ''} performed: ${action}`,
          type: 'admin_action',
          severity: 'info',
          metadata: {
            performedBy,
            performedByName: `${performedByAdmin?.firstName} ${performedByAdmin?.lastName}`,
            action,
            details,
            affectedResource
          }
        });

        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error sending admin action notification:', error);
      throw error;
    }
  }

  // Send 2FA event notification
  static async send2FAEventNotification(eventData) {
    try {
      const {
        adminId,
        action,
        success,
        riskLevel = 'low',
        details = {}
      } = eventData;

      let title, message, severity;

      switch (action) {
        case 'setup':
          title = '2FA Setup Completed';
          message = 'Two-factor authentication has been successfully enabled for your account.';
          severity = 'success';
          break;
        case 'disable':
          title = '2FA Disabled';
          message = 'Two-factor authentication has been disabled for your account.';
          severity = 'warning';
          break;
        case 'verify_failure':
          title = '2FA Verification Failed';
          message = 'Failed two-factor authentication attempt detected.';
          severity = 'error';
          break;
        case 'emergency_disable':
          title = '2FA Emergency Disable';
          message = 'Two-factor authentication was emergency disabled.';
          severity = 'error';
          break;
        case 'backup_code_used':
          title = '2FA Backup Code Used';
          message = 'A backup code was used for two-factor authentication.';
          severity = 'warning';
          break;
        default:
          title = '2FA Security Event';
          message = `Two-factor authentication ${action} event.`;
          severity = success ? 'info' : 'warning';
      }

      const notification = await this.createNotification({
        adminId,
        title,
        message,
        type: 'security_alert',
        severity,
        securityEventType: 'two_factor_event',
        riskLevel,
        metadata: {
          twoFactorAction: action,
          success,
          details
        },
        persistent: riskLevel === 'high' || riskLevel === 'critical'
      });

      if (notification) {
        // Send 2FA event via WebSocket
        socketService.send2FAEvent(adminId, {
          action,
          success,
          createdAt: notification.createdAt,
          riskLevel,
          details
        });
      }

      return notification;
    } catch (error) {
      console.error('Error sending 2FA event notification:', error);
      throw error;
    }
  }

  // Send meal plan notification
  static async sendMealPlanNotification(mealPlanData) {
    try {
      const {
        adminId,
        action, // 'created', 'updated', 'published', 'unpublished', 'deleted'
        mealPlanId,
        mealPlanName,
        details = {}
      } = mealPlanData;

      let title, message;

      switch (action) {
        case 'created':
          title = 'New Meal Plan Created';
          message = `Meal plan "${mealPlanName}" has been created.`;
          break;
        case 'updated':
          title = 'Meal Plan Updated';
          message = `Meal plan "${mealPlanName}" has been updated.`;
          break;
        case 'published':
          title = 'Meal Plan Published';
          message = `Meal plan "${mealPlanName}" has been published and is now available to customers.`;
          break;
        case 'unpublished':
          title = 'Meal Plan Unpublished';
          message = `Meal plan "${mealPlanName}" has been unpublished.`;
          break;
        case 'deleted':
          title = 'Meal Plan Deleted';
          message = `Meal plan "${mealPlanName}" has been deleted.`;
          break;
        default:
          title = 'Meal Plan Update';
          message = `Meal plan "${mealPlanName}" has been ${action}.`;
      }

      const notification = await this.createNotification({
        adminId,
        title,
        message,
        type: 'meal_update',
        severity: 'info',
        actionUrl: `/meal-plans/${mealPlanId}`,
        actionLabel: 'View Meal Plan',
        metadata: {
          mealPlanId,
          mealPlanName,
          action,
          details
        }
      });

      return notification;
    } catch (error) {
      console.error('Error sending meal plan notification:', error);
      throw error;
    }
  }

  // Send chef notification
  static async sendChefNotification(chefData) {
    try {
      const {
        adminId,
        action, // 'registered', 'approved', 'rejected', 'suspended'
        chefId,
        chefName,
        details = {}
      } = chefData;

      let title, message, severity;

      switch (action) {
        case 'registered':
          title = 'New Chef Registration';
          message = `Chef ${chefName} has registered and is awaiting approval.`;
          severity = 'info';
          break;
        case 'approved':
          title = 'Chef Approved';
          message = `Chef ${chefName} has been approved.`;
          severity = 'success';
          break;
        case 'rejected':
          title = 'Chef Rejected';
          message = `Chef ${chefName} has been rejected.`;
          severity = 'warning';
          break;
        case 'suspended':
          title = 'Chef Suspended';
          message = `Chef ${chefName} has been suspended.`;
          severity = 'error';
          break;
        default:
          title = 'Chef Update';
          message = `Chef ${chefName} status updated.`;
          severity = 'info';
      }

      const notification = await this.createNotification({
        adminId,
        title,
        message,
        type: 'chef_action',
        severity,
        actionUrl: `/chefs/${chefId}`,
        actionLabel: 'View Chef',
        metadata: {
          chefId,
          chefName,
          action,
          details
        }
      });

      return notification;
    } catch (error) {
      console.error('Error sending chef notification:', error);
      throw error;
    }
  }

  // Send order notification
  static async sendOrderNotification(orderData) {
    try {
      const {
        adminId,
        action, // 'placed', 'cancelled', 'payment_failed', 'high_value'
        orderId,
        customerName,
        amount,
        details = {}
      } = orderData;

      let title, message, severity;

      switch (action) {
        case 'placed':
          title = 'New Order Placed';
          message = `Order #${orderId} placed by ${customerName} for ₦${amount}`;
          severity = 'info';
          break;
        case 'cancelled':
          title = 'Order Cancelled';
          message = `Order #${orderId} has been cancelled.`;
          severity = 'warning';
          break;
        case 'payment_failed':
          title = 'Payment Failed';
          message = `Payment failed for order #${orderId}.`;
          severity = 'error';
          break;
        case 'high_value':
          title = 'High Value Order';
          message = `High value order #${orderId} for ₦${amount} requires attention.`;
          severity = 'warning';
          break;
        default:
          title = 'Order Update';
          message = `Order #${orderId} has been ${action}.`;
          severity = 'info';
      }

      const notification = await this.createNotification({
        adminId,
        title,
        message,
        type: 'order_alert',
        severity,
        actionUrl: `/orders/${orderId}`,
        actionLabel: 'View Order',
        metadata: {
          orderId,
          customerName,
          amount,
          action,
          details
        }
      });

      return notification;
    } catch (error) {
      console.error('Error sending order notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getSystemStats() {
    try {
      const stats = await AdminNotification.getStats();
      const socketStats = socketService.getStats();
      
      return {
        ...stats[0],
        realTime: {
          connectedAdmins: socketStats.connectedAdmins,
          connections: socketStats.connections
        }
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = AdminNotificationService;