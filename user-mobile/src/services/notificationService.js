// Notification Service for Subscription Management
import apiService from './api';

class NotificationService {
  
  // Send notifications for subscription pause
  static async notifySubscriptionPause(subscriptionId, reason, duration, userInfo) {
    const notifications = [
      // User notification
      {
        userId: userInfo.id,
        title: 'Subscription Paused',
        message: `Your subscription has been paused for ${duration.replace('_', ' ')}. Reason: ${reason}`,
        type: 'subscription_pause',
        data: { subscriptionId, reason, duration }
      },
      
      // Admin notification
      {
        isAdminNotification: true,
        title: 'Subscription Paused',
        message: `${userInfo.name} paused their subscription. Reason: ${reason}, Duration: ${duration.replace('_', ' ')}`,
        type: 'admin_subscription_pause',
        data: { subscriptionId, userId: userInfo.id, reason, duration, userName: userInfo.name }
      },
      
      // Chef notification
      {
        isChefNotification: true,
        title: 'Meal Preparation Paused',
        message: `Meal preparation paused for ${userInfo.name}. No meals needed for ${duration.replace('_', ' ')}.`,
        type: 'chef_subscription_pause',
        data: { subscriptionId, userId: userInfo.id, reason, duration, userName: userInfo.name }
      }
    ];

    return await this.sendBulkNotifications(notifications);
  }

  // Send notifications for subscription modification
  static async notifySubscriptionModification(subscriptionId, changes, userInfo) {
    const changesList = Object.keys(changes).join(', ');
    
    const notifications = [
      // User notification
      {
        userId: userInfo.id,
        title: 'Subscription Modified',
        message: `Your subscription has been updated. Changes: ${changesList}`,
        type: 'subscription_modification',
        data: { subscriptionId, changes }
      },
      
      // Admin notification
      {
        isAdminNotification: true,
        title: 'Subscription Modified',
        message: `${userInfo.name} modified their subscription. Changes: ${changesList}`,
        type: 'admin_subscription_modification',
        data: { subscriptionId, userId: userInfo.id, changes, userName: userInfo.name }
      },
      
      // Chef notification (if meal-related changes)
      {
        isChefNotification: true,
        title: 'Meal Plan Updated',
        message: `Meal requirements updated for ${userInfo.name}. Changes: ${changesList}`,
        type: 'chef_subscription_modification',
        data: { subscriptionId, userId: userInfo.id, changes, userName: userInfo.name }
      }
    ];

    return await this.sendBulkNotifications(notifications);
  }

  // Send notifications for schedule changes
  static async notifyScheduleChange(subscriptionId, scheduleChanges, userInfo) {
    const notifications = [
      // User notification
      {
        userId: userInfo.id,
        title: 'Delivery Schedule Updated',
        message: 'Your meal delivery schedule has been updated successfully.',
        type: 'schedule_change',
        data: { subscriptionId, scheduleChanges }
      },
      
      // Admin notification
      {
        isAdminNotification: true,
        title: 'Delivery Schedule Changed',
        message: `${userInfo.name} updated their delivery schedule.`,
        type: 'admin_schedule_change',
        data: { subscriptionId, userId: userInfo.id, scheduleChanges, userName: userInfo.name }
      },
      
      // Chef notification
      {
        isChefNotification: true,
        title: 'Delivery Schedule Updated',
        message: `Delivery schedule updated for ${userInfo.name}. Please check new meal preparation dates.`,
        type: 'chef_schedule_change',
        data: { subscriptionId, userId: userInfo.id, scheduleChanges, userName: userInfo.name }
      }
    ];

    return await this.sendBulkNotifications(notifications);
  }

  // Send notifications for subscription cancellation
  static async notifySubscriptionCancellation(subscriptionId, reason, userInfo) {
    const notifications = [
      // User notification
      {
        userId: userInfo.id,
        title: 'Subscription Cancelled',
        message: `Your subscription has been cancelled. We're sorry to see you go! Reason: ${reason}`,
        type: 'subscription_cancellation',
        data: { subscriptionId, reason }
      },
      
      // Admin notification
      {
        isAdminNotification: true,
        title: 'Subscription Cancelled',
        message: `${userInfo.name} cancelled their subscription. Reason: ${reason}`,
        type: 'admin_subscription_cancellation',
        data: { subscriptionId, userId: userInfo.id, reason, userName: userInfo.name }
      },
      
      // Chef notification
      {
        isChefNotification: true,
        title: 'Subscription Cancelled',
        message: `${userInfo.name} cancelled their subscription. Stop meal preparation immediately.`,
        type: 'chef_subscription_cancellation',
        data: { subscriptionId, userId: userInfo.id, reason, userName: userInfo.name }
      }
    ];

    return await this.sendBulkNotifications(notifications);
  }

  // Helper function to send multiple notifications
  static async sendBulkNotifications(notifications) {
    try {
      const results = await Promise.allSettled(
        notifications.map(notification => this.sendSingleNotification(notification))
      );
      
      console.log('📨 Bulk notifications sent:', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send individual notification
  static async sendSingleNotification(notification) {
    try {
      if (notification.isAdminNotification) {
        return await this.sendAdminNotification(notification);
      } else if (notification.isChefNotification) {
        return await this.sendChefNotification(notification);
      } else {
        return await this.sendUserNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  // Send user notification
  static async sendUserNotification(notification) {
    return await apiService.createNotification({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      data: notification.data
    });
  }

  // Send admin notification
  static async sendAdminNotification(notification) {
    return await apiService.createAdminNotification({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: 'high',
      data: notification.data
    });
  }

  // Send chef notification
  static async sendChefNotification(notification) {
    return await apiService.createChefNotification({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: 'medium',
      data: notification.data
    });
  }
}

export default NotificationService;