const Notification = require("../models/Notification");
const Customer = require("../models/Customer");
const Driver = require("../models/Driver");
const PushNotificationService = require("./pushNotificationService");
const socketService = require("./socketService");

class NotificationService {
  // Create a new notification
  static async createNotification(notificationData) {
    try {
      const {
        userId,
        title,
        message,
        type,
        data = {},
        priority = "medium",
      } = notificationData;

      // Validate required fields
      if (!userId || !title || !message || !type) {
        throw new Error("Missing required notification fields");
      }

      // Check if user exists and get their preferences
      const user = await Customer.findById(userId).select(
        "notificationPreferences pushTokens"
      );

      if (!user) {
        throw new Error("User not found");
      }

      // Check if user wants this type of notification
      const preferences = user.notificationPreferences || {};
      if (!this.shouldSendNotification(type, preferences)) {
        console.log(
          `Notification blocked by user preferences: ${type} for user ${userId}`
        );
        return { success: false, reason: "User preferences" };
      }

      // Create notification in database
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        data,
        priority,
      });

      // Send push notification if user has push tokens and push notifications enabled
      if (user.pushTokens && user.pushTokens.length > 0 && preferences.pushNotifications !== false) {
        try {
          // Send to all active push tokens (user might have multiple devices)
          const pushPromises = user.pushTokens.map(tokenInfo => 
            PushNotificationService.sendPushNotification({
              to: tokenInfo.token,
              title,
              body: message,
              data: {
                notificationId: notification._id.toString(),
                type,
                ...data,
              },
              tokenType: tokenInfo.tokenType || 'expo' // Support both expo and fcm tokens
            })
          );

          await Promise.allSettled(pushPromises);
          await notification.markPushSent();
          
          console.log(`📱 Push notification sent to ${user.pushTokens.length} device(s) for user ${userId}`);
        } catch (pushError) {
          console.error("Push notification failed:", pushError);
          await notification.markPushSent(pushError.message);
        }
      } else {
        console.log(`⚠️ No push tokens found for user ${userId} or push notifications disabled`);
      }

      console.log(`✅ Notification created: ${type} for user ${userId}`);

      return {
        success: true,
        notification: notification.toObject(),
      };
    } catch (error) {
      console.error("Create notification error:", error);
      throw error;
    }
  }

  // Create multiple notifications efficiently
  static async createBulkNotifications(notificationsData) {
    try {
      const results = await Promise.allSettled(
        notificationsData.map((data) => this.createNotification(data))
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `📊 Bulk notifications: ${successful} successful, ${failed} failed`
      );

      return {
        success: true,
        results: {
          successful,
          failed,
          details: results,
        },
      };
    } catch (error) {
      console.error("Bulk notification error:", error);
      throw error;
    }
  }

  // Payment-related notifications
  static async notifyPaymentSuccess(userId, paymentData) {
    return await this.createNotification({
      userId,
      title: "Payment Successful! 💳",
      message: `Your payment of ₦${paymentData.amount} has been processed successfully.`,
      type: "payment_success",
      data: {
        amount: paymentData.amount,
        reference: paymentData.reference,
        subscriptionId: paymentData.subscriptionId,
      },
      priority: "high",
    });
  }

  static async notifyPaymentFailed(userId, paymentData) {
    return await this.createNotification({
      userId,
      title: "Payment Failed ❌",
      message:
        "Your payment could not be processed. Please try again or use a different payment method.",
      type: "payment_failed",
      data: {
        reference: paymentData.reference,
        reason: paymentData.reason,
      },
      priority: "high",
    });
  }

  static async notifyRefundProcessed(userId, refundData) {
    return await this.createNotification({
      userId,
      title: "Refund Processed 💰",
      message: `Your refund of ₦${refundData.amount} has been processed and will reflect in your account within 3-5 business days.`,
      type: "refund_processed",
      data: refundData,
      priority: "medium",
    });
  }

  // User onboarding notifications
  static async notifyWelcome(userId, userName) {
    return await this.createNotification({
      userId,
      title: `Welcome to choma, ${userName}! 👋`,
      message:
        "Get started by exploring our delicious meal plans tailored just for you.",
      type: "welcome",
      data: { userName },
      priority: "medium",
    });
  }

  static async notifyProfileIncomplete(userId) {
    return await this.createNotification({
      userId,
      title: "Complete Your Profile 📝",
      message:
        "Complete your profile to get personalized meal recommendations and better service.",
      type: "profile_incomplete",
      data: {},
      priority: "low",
    });
  }

  // Subscription notifications
  static async notifySubscriptionCreated(userId, subscriptionData) {
    return await this.createNotification({
      userId,
      title: "Subscription Activated! ✅",
      message: `Your ${subscriptionData.planName} subscription is now active. Your meals start on ${subscriptionData.startDate}.`,
      type: "subscription_created",
      data: subscriptionData,
      priority: "high",
    });
  }

  static async notifySubscriptionExpiring(userId, subscriptionData) {
    return await this.createNotification({
      userId,
      title: "Subscription Expiring Soon ⏰",
      message: `Your subscription expires in ${subscriptionData.daysLeft} days. Renew now to continue enjoying your meals.`,
      type: "subscription_expiring",
      data: subscriptionData,
      priority: "medium",
    });
  }

  static async notifySubscriptionPaused(userId, subscriptionData) {
    return await this.createNotification({
      userId,
      title: "Subscription Paused ⏸️",
      message: `Your subscription has been paused. You can resume it anytime from your account.`,
      type: "subscription_paused",
      data: subscriptionData,
      priority: "medium",
    });
  }

  static async notifySubscriptionCancelled(userId, subscriptionData) {
    return await this.createNotification({
      userId,
      title: "Subscription Cancelled ❌",
      message:
        "Your subscription has been cancelled successfully. We hope to serve you again soon!",
      type: "subscription_cancelled",
      data: subscriptionData,
      priority: "medium",
    });
  }

  // Welcome notification for new users
  static async notifyWelcome(userId, fullName) {
    try {
      return await this.createNotification({
        userId,
        title: "Welcome to Choma! 🎉",
        message: `Hi ${fullName}! Welcome to our delicious food family. Browse our meal plans and start your healthy eating journey today!`,
        type: "welcome",
        data: {
          isWelcome: true,
          action: "explore_meal_plans"
        },
        priority: "high",
      });
    } catch (error) {
      console.error('Welcome notification failed:', error);
      // Don't throw error - welcome notification failure shouldn't break signup
      return { success: false, error: error.message };
    }
  }

  // Order notifications
  static async notifyOrderConfirmed(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "Order Confirmed! 📦",
      message: `Order #${orderData.orderNumber} has been confirmed and is being prepared by our chef.`,
      type: "order_confirmed",
      data: orderData,
      priority: "high",
    });
  }

  static async notifyOrderPreparing(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "Chef is Cooking! 👨‍🍳",
      message: `Your delicious meal is being prepared with love. Estimated completion: ${orderData.estimatedTime}.`,
      type: "order_preparing",
      data: orderData,
      priority: "medium",
    });
  }

  static async notifyOrderReady(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "Order Ready! ✅",
      message: `Your meal is ready for ${orderData.deliveryType}. ${orderData.instructions}`,
      type: "order_ready",
      data: orderData,
      priority: "high",
    });
  }

  static async notifyOrderOutForDelivery(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "On the Way! 🚚",
      message: `Your order is out for delivery. Estimated arrival: ${orderData.estimatedArrival}. Track your order for live updates.`,
      type: "order_out_for_delivery",
      data: orderData,
      priority: "high",
    });
  }

  static async notifyOrderDelivered(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "Order Delivered! ✅",
      message:
        "Your meal has been delivered. Enjoy your delicious food! Please rate your experience.",
      type: "order_delivered",
      data: orderData,
      priority: "medium",
    });
  }

  static async notifyOrderCancelled(userId, orderData) {
    return await this.createNotification({
      userId,
      title: "Order Cancelled ❌",
      message: `Order #${orderData.orderNumber} has been cancelled. ${
        orderData.reason ? `Reason: ${orderData.reason}` : ""
      }`,
      type: "order_cancelled",
      data: orderData,
      priority: "medium",
    });
  }

  // Chef notifications
  static async notifyChefAssigned(userId, chefData) {
    return await this.createNotification({
      userId,
      title: "Chef Assigned! 👨‍🍳",
      message: `${
        chefData.name
      } will be preparing your meal. They specialize in ${chefData.specialties.join(
        ", "
      )}.`,
      type: "chef_assigned",
      data: chefData,
      priority: "medium",
    });
  }

  // Promotional notifications
  static async notifyNewMealPlans(userId, mealPlanData) {
    return await this.createNotification({
      userId,
      title: "New Meal Plans Available! 🍽️",
      message: `Check out our latest meal plans: ${mealPlanData.planNames.join(
        ", "
      )}. Limited time offer!`,
      type: "new_meal_plans",
      data: mealPlanData,
      priority: "low",
    });
  }

  static async notifySpecialOffer(userId, offerData) {
    return await this.createNotification({
      userId,
      title: `Special Offer! ${offerData.discount} Off 🏷️`,
      message: `${offerData.description} Use code: ${offerData.code}. Valid until ${offerData.expiryDate}.`,
      type: "special_offer",
      data: offerData,
      priority: "medium",
    });
  }

  // Helper method to check if notification should be sent based on user preferences
  static shouldSendNotification(type, preferences) {
    const typeToPreferenceMap = {
      // Payment notifications (always send critical ones)
      payment_success: true,
      payment_failed: true,
      refund_processed: true,

      // User notifications (always send critical ones)
      welcome: true,
      profile_incomplete: preferences.achievements,

      // Subscription notifications
      subscription_created: preferences.orderUpdates,
      subscription_renewed: preferences.orderUpdates,
      subscription_expiring: preferences.orderUpdates,
      subscription_paused: preferences.orderUpdates,
      subscription_cancelled: preferences.orderUpdates,

      // Order notifications
      order_confirmed: preferences.orderUpdates,
      order_preparing: preferences.orderUpdates,
      order_ready: preferences.deliveryReminders,
      order_out_for_delivery: preferences.deliveryReminders,
      order_delivered: preferences.orderUpdates,
      order_cancelled: preferences.orderUpdates,

      // Chef notifications
      chef_assigned: preferences.orderUpdates,
      chef_changed: preferences.orderUpdates,

      // Promotional notifications
      new_meal_plans: preferences.newMealPlans,
      special_offer: preferences.promotions,
      seasonal_menu: preferences.newMealPlans,
    };

    return typeToPreferenceMap[type] !== false;
  }

  // Clean up old notifications
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteExpired();
      console.log(`🧹 Cleaned up ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      console.error("Cleanup error:", error);
      throw error;
    }
  }

  // Notify chef about new order assignment
  static async notifyChefNewOrder(chefId, orderData) {
    return await this.createNotification({
      userId: chefId,
      title: "New Order Assigned! 🍳",
      message: `You have been assigned a new order from ${orderData.customerName}. Total amount: ₦${orderData.totalAmount}. Please check your dashboard.`,
      type: "chef_assigned",
      data: orderData,
      priority: "high",
    });
  }

  // Chef account status notifications
  static async notifyChefAccountSuspended(chefId, reason) {
    return await this.createNotification({
      userId: chefId,
      title: "Account Suspended ⚠️",
      message: `Your chef account has been temporarily suspended. Reason: ${
        reason || "Violation of platform policies"
      }. Please contact support for assistance.`,
      type: "account_suspended",
      data: { reason, suspensionDate: new Date() },
      priority: "high",
    });
  }

  static async notifyChefAccountUnsuspended(chefId) {
    return await this.createNotification({
      userId: chefId,
      title: "Account Reactivated! 🎉",
      message:
        "Great news! Your chef account suspension has been lifted. You can now resume accepting orders and accessing all chef features.",
      type: "account_unsuspended",
      data: { reactivationDate: new Date() },
      priority: "high",
    });
  }

  static async notifyChefAccountDeactivated(chefId, reason) {
    return await this.createNotification({
      userId: chefId,
      title: "Account Deactivated",
      message: `Your chef account has been deactivated. Reason: ${
        reason || "Account deactivation requested"
      }. Contact support if you believe this is an error.`,
      type: "account_deactivated",
      data: { reason, deactivationDate: new Date() },
      priority: "high",
    });
  }

  static async notifyChefAccountReactivated(chefId) {
    return await this.createNotification({
      userId: chefId,
      title: "Welcome Back! 🎉",
      message:
        "Your chef account has been successfully reactivated! You can now start accepting orders and access all chef dashboard features. Welcome back to the Choma family!",
      type: "account_reactivated",
      data: { reactivationDate: new Date() },
      priority: "high",
    });
  }

  static async notifyChefAccountApproved(chefId) {
    return await this.createNotification({
      userId: chefId,
      title: "Application Approved! 🎉",
      message:
        "Congratulations! Your chef application has been approved. You can now start accepting orders and building your culinary reputation on Choma.",
      type: "account_approved",
      data: { approvalDate: new Date() },
      priority: "high",
    });
  }

  static async notifyChefAccountRejected(chefId, reason) {
    return await this.createNotification({
      userId: chefId,
      title: "Application Update",
      message: `Your chef application has been reviewed. Reason: ${
        reason || "Application does not meet current requirements"
      }. You can reapply after addressing the feedback.`,
      type: "account_rejected",
      data: { reason, rejectionDate: new Date() },
      priority: "high",
    });
  }

  // Get notification statistics
  static async getNotificationStats(userId = null) {
    try {
      const match = userId ? { userId } : {};

      const stats = await Notification.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return stats;
    } catch (error) {
      console.error("Get notification stats error:", error);
      throw error;
    }
  }

  // Driver-specific notifications
  static async sendDriverNotification(driverId, notificationData) {
    try {
      const { title, body, data = {}, priority = "normal" } = notificationData;

      // Find driver
      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error("Driver not found");
      }

      // Send real-time notification via WebSocket
      const socketSent = socketService.sendToDriver(driverId, 'notification', {
        title,
        body,
        data,
        priority,
        timestamp: new Date()
      });

      // Send push notification if driver has push token
      let pushSent = false;
      if (driver.pushToken) {
        try {
          await PushNotificationService.sendToDevice(driver.pushToken, {
            title,
            body,
            data
          });
          pushSent = true;
        } catch (error) {
          console.error(`Push notification failed for driver ${driverId}:`, error);
        }
      }

      console.log(`Driver notification sent to ${driver.driverId}: Socket=${socketSent}, Push=${pushSent}`);
      
      return {
        success: true,
        socketSent,
        pushSent,
        driverId: driver.driverId
      };

    } catch (error) {
      console.error('Send driver notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send assignment notification to driver
  static async notifyDriverAssignment(driverId, assignment) {
    return await this.sendDriverNotification(driverId, {
      title: 'New Delivery Assignment',
      body: `Pickup from ${assignment.pickupLocation.chefName} • ₦${assignment.totalEarning}`,
      data: {
        type: 'assignment',
        assignmentId: assignment._id,
        orderId: assignment.orderId,
        pickupLocation: assignment.pickupLocation.address,
        deliveryLocation: assignment.deliveryLocation.address,
        earning: assignment.totalEarning
      },
      priority: 'high'
    });
  }

  // Send assignment update to driver
  static async notifyDriverAssignmentUpdate(driverId, assignment, status, message) {
    return await this.sendDriverNotification(driverId, {
      title: 'Assignment Update',
      body: message,
      data: {
        type: 'assignment_update',
        assignmentId: assignment._id,
        status,
        orderId: assignment.orderId
      },
      priority: 'normal'
    });
  }

  // Send delivery reminder to driver
  static async notifyDriverDeliveryReminder(driverId, assignment) {
    return await this.sendDriverNotification(driverId, {
      title: 'Delivery Reminder',
      body: `Don't forget to deliver order to ${assignment.deliveryLocation.address}`,
      data: {
        type: 'delivery_reminder',
        assignmentId: assignment._id,
        orderId: assignment.orderId
      },
      priority: 'normal'
    });
  }

  // Broadcast to all drivers
  static async broadcastToDrivers(notificationData) {
    try {
      const { title, body, data = {}, priority = "normal" } = notificationData;

      // Get all approved drivers
      const drivers = await Driver.find({ 
        accountStatus: 'approved',
        status: { $in: ['online', 'busy'] }
      }).select('_id driverId pushToken');

      let sentCount = 0;
      let errors = [];

      for (const driver of drivers) {
        try {
          const result = await this.sendDriverNotification(driver._id, {
            title, body, data, priority
          });
          if (result.success) sentCount++;
        } catch (error) {
          errors.push({ driverId: driver.driverId, error: error.message });
        }
      }

      return {
        success: true,
        totalDrivers: drivers.length,
        sentCount,
        errors
      };

    } catch (error) {
      console.error('Broadcast to drivers error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============= COMPREHENSIVE ORDER STATUS NOTIFICATIONS =============

  // Notify customer about order status changes
  static async notifyCustomerOrderStatus(customerId, orderData, statusChange) {
    const statusMessages = {
      'Confirmed': `Your order #${orderData.orderNumber} has been confirmed and assigned to our chef! 🍳`,
      'In Progress': `Great news! Your chef has started preparing your order #${orderData.orderNumber} 👨‍🍳`,
      'Ready': `Your order #${orderData.orderNumber} is ready and will be delivered soon! 🚚`,
      'Out for Delivery': `Your order #${orderData.orderNumber} is on its way to you! Track your delivery in real-time 📍`,
      'Delivered': `Your order #${orderData.orderNumber} has been delivered! Enjoy your meal! 🍽️`,
      'Cancelled': `Your order #${orderData.orderNumber} has been cancelled. You will be refunded shortly. 💰`
    };

    const title = `Order Update - ${statusChange.newStatus}`;
    const message = statusMessages[statusChange.newStatus] || `Your order #${orderData.orderNumber} status has been updated to ${statusChange.newStatus}`;

    return await this.createNotification({
      userId: customerId,
      title,
      message,
      type: "order_status_update",
      data: {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        oldStatus: statusChange.oldStatus,
        newStatus: statusChange.newStatus,
        timestamp: new Date()
      },
      priority: "high"
    });
  }

  // Notify chef about order status changes
  static async notifyChefOrderStatus(chefId, orderData, statusChange) {
    const statusMessages = {
      'Confirmed': `New order #${orderData.orderNumber} has been assigned to you! Please check your dashboard for details. 🍳`,
      'In Progress': `Order #${orderData.orderNumber} status updated. Continue with preparation! 👨‍🍳`,
      'Ready': `Order #${orderData.orderNumber} marked as ready. Awaiting delivery pickup! 📦`,
      'Out for Delivery': `Order #${orderData.orderNumber} is now out for delivery! 🚚`,
      'Delivered': `Great job! Order #${orderData.orderNumber} has been successfully delivered! 🎉`,
      'Cancelled': `Order #${orderData.orderNumber} has been cancelled. Please stop preparation if in progress. ❌`
    };

    const title = `Order Update - ${statusChange.newStatus}`;
    const message = statusMessages[statusChange.newStatus] || `Order #${orderData.orderNumber} status changed to ${statusChange.newStatus}`;

    return await this.createNotification({
      userId: chefId,
      title,
      message,
      type: "chef_order_status",
      data: {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        oldStatus: statusChange.oldStatus,
        newStatus: statusChange.newStatus,
        customerName: orderData.customerName,
        timestamp: new Date()
      },
      priority: "high"
    });
  }

  // Notify admin about order status changes
  static async notifyAdminOrderStatus(orderData, statusChange, context = {}) {
    const AdminNotificationService = require('./adminNotificationService');
    
    const statusMessages = {
      'Confirmed': `Order #${orderData.orderNumber} has been confirmed and assigned to chef.`,
      'In Progress': `Chef has started preparing order #${orderData.orderNumber}.`,
      'Ready': `Order #${orderData.orderNumber} is ready for delivery pickup.`,
      'Out for Delivery': `Order #${orderData.orderNumber} is out for delivery.`,
      'Delivered': `Order #${orderData.orderNumber} has been successfully delivered.`,
      'Cancelled': `Order #${orderData.orderNumber} has been cancelled. ${context.reason || ''}`
    };

    const title = `Order Status Update - ${statusChange.newStatus}`;
    const message = statusMessages[statusChange.newStatus] || `Order #${orderData.orderNumber} status changed to ${statusChange.newStatus}`;

    return await AdminNotificationService.createNotification({
      adminId: 'system', // Can be updated to specific admin ID
      title,
      message,
      type: 'order_management',
      severity: statusChange.newStatus === 'Cancelled' ? 'warning' : 'info',
      actionUrl: `/orders/${orderData.orderId}`,
      actionLabel: 'View Order',
      metadata: {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        oldStatus: statusChange.oldStatus,
        newStatus: statusChange.newStatus,
        customerName: orderData.customerName,
        chefName: orderData.chefName,
        totalAmount: orderData.totalAmount,
        timestamp: new Date(),
        ...context
      }
    });
  }

  // Comprehensive function to notify all parties about order status changes
  static async notifyAllPartiesOrderStatus(orderData, statusChange, context = {}) {
    const results = {
      customer: null,
      chef: null,
      admin: null,
      errors: []
    };

    try {
      // Notify customer
      if (orderData.customerId) {
        results.customer = await this.notifyCustomerOrderStatus(
          orderData.customerId, 
          orderData, 
          statusChange
        );
      }
    } catch (error) {
      console.error('Failed to notify customer:', error);
      results.errors.push({ target: 'customer', error: error.message });
    }

    try {
      // Notify chef
      if (orderData.chefId) {
        results.chef = await this.notifyChefOrderStatus(
          orderData.chefId, 
          orderData, 
          statusChange
        );
      }
    } catch (error) {
      console.error('Failed to notify chef:', error);
      results.errors.push({ target: 'chef', error: error.message });
    }

    try {
      // Notify admin
      results.admin = await this.notifyAdminOrderStatus(
        orderData, 
        statusChange, 
        context
      );
    } catch (error) {
      console.error('Failed to notify admin:', error);
      results.errors.push({ target: 'admin', error: error.message });
    }

    return {
      success: results.errors.length === 0,
      results,
      totalNotificationsSent: [results.customer, results.chef, results.admin].filter(Boolean).length
    };
  }
}

module.exports = NotificationService;
