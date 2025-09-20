// src/services/notificationService.js - Push notifications for drivers
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import driverApiService from './driverApi';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialize notification service
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      // Configure notification categories
      await this.setupNotificationCategories();

      this.isInitialized = true;
      console.log('📱 Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  // Register for push notifications
  async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: true,
            provideAppNotificationSettings: true,
            allowProvisional: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Push notification permission not granted');
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Save token locally
      await AsyncStorage.setItem('@driver_push_token', token);

      // Send token to backend
      await this.sendTokenToBackend(token);

      console.log('📱 Push token registered:', token);
      return token;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      throw error;
    }
  }

  // Send push token to backend
  async sendTokenToBackend(token) {
    try {
      await driverApiService.request('/notifications/register-token', {
        method: 'POST',
        body: {
          pushToken: token,
          platform: Platform.OS,
          deviceInfo: {
            brand: Device.brand,
            model: Device.modelName,
            osVersion: Device.osVersion,
          },
        },
      });
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for notification responses (user interaction)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  // Set up notification categories and actions
  async setupNotificationCategories() {
    try {
      // Delivery assignment category
      await Notifications.setNotificationCategoryAsync('delivery_assignment', [
        {
          identifier: 'accept',
          buttonTitle: 'Accept',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'decline',
          buttonTitle: 'Decline',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);

      // Delivery update category
      await Notifications.setNotificationCategoryAsync('delivery_update', [
        {
          identifier: 'view',
          buttonTitle: 'View Details',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      // Earnings notification category
      await Notifications.setNotificationCategoryAsync('earnings', [
        {
          identifier: 'view_earnings',
          buttonTitle: 'View Earnings',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      console.log('📱 Notification categories configured');
    } catch (error) {
      console.error('Failed to setup notification categories:', error);
    }
  }

  // Handle received notifications
  handleNotificationReceived(notification) {
    console.log('📱 Notification received:', notification);
    
    const { data } = notification.request.content;
    
    // Handle different notification types
    switch (data?.type) {
      case 'delivery_assignment':
        this.handleDeliveryAssignment(data);
        break;
      case 'delivery_update':
        this.handleDeliveryUpdate(data);
        break;
      case 'earnings_update':
        this.handleEarningsUpdate(data);
        break;
      case 'system_message':
        this.handleSystemMessage(data);
        break;
      default:
        console.log('📱 Unknown notification type:', data?.type);
    }
  }

  // Handle notification responses (user interaction)
  handleNotificationResponse(response) {
    console.log('📱 Notification response:', response);
    
    const { notification, actionIdentifier } = response;
    const { data } = notification.request.content;

    // Handle different actions
    switch (actionIdentifier) {
      case 'accept':
        this.handleAcceptDelivery(data);
        break;
      case 'decline':
        this.handleDeclineDelivery(data);
        break;
      case 'view':
      case 'view_earnings':
        this.handleViewAction(data);
        break;
      default:
        // Default action (notification tap)
        this.handleDefaultAction(data);
    }
  }

  // Handle delivery assignment
  handleDeliveryAssignment(data) {
    console.log('📱 New delivery assignment:', data);
    // This would typically trigger navigation or state updates
  }

  // Handle delivery updates
  handleDeliveryUpdate(data) {
    console.log('📱 Delivery update:', data);
    // Update delivery status in app state
  }

  // Handle earnings updates
  handleEarningsUpdate(data) {
    console.log('📱 Earnings update:', data);
    // Update earnings in app state
  }

  // Handle system messages
  handleSystemMessage(data) {
    console.log('📱 System message:', data);
    // Handle system-wide announcements
  }

  // Handle accept delivery action
  async handleAcceptDelivery(data) {
    try {
      if (data.deliveryId) {
        await driverApiService.acceptDelivery(data.deliveryId);
        console.log('📱 Delivery accepted via notification');
      }
    } catch (error) {
      console.error('Failed to accept delivery via notification:', error);
    }
  }

  // Handle decline delivery action
  async handleDeclineDelivery(data) {
    try {
      if (data.deliveryId) {
        await driverApiService.cancelDelivery(data.deliveryId, 'Declined via notification');
        console.log('📱 Delivery declined via notification');
      }
    } catch (error) {
      console.error('Failed to decline delivery via notification:', error);
    }
  }

  // Handle view actions
  handleViewAction(data) {
    console.log('📱 View action triggered:', data);
    // This would typically trigger navigation
  }

  // Handle default notification tap
  handleDefaultAction(data) {
    console.log('📱 Default notification action:', data);
    // Navigate to relevant screen based on notification type
  }

  // Schedule local notification
  async scheduleLocalNotification(title, body, data = {}, options = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: options.sound || 'default',
          priority: options.priority || Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: options.categoryIdentifier,
        },
        trigger: options.trigger || null, // null means immediate
      });

      console.log('📱 Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      throw error;
    }
  }

  // Show delivery assignment notification
  async showDeliveryAssignmentNotification(delivery) {
    return this.scheduleLocalNotification(
      'New Delivery Assignment',
      `Pickup from ${delivery.restaurantName} • ₦${delivery.earnings}`,
      {
        type: 'delivery_assignment',
        deliveryId: delivery.id,
        ...delivery,
      },
      {
        categoryIdentifier: 'delivery_assignment',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: 'default',
      }
    );
  }

  // Show delivery update notification
  async showDeliveryUpdateNotification(delivery, message) {
    return this.scheduleLocalNotification(
      'Delivery Update',
      message,
      {
        type: 'delivery_update',
        deliveryId: delivery.id,
        ...delivery,
      },
      {
        categoryIdentifier: 'delivery_update',
      }
    );
  }

  // Show earnings notification
  async showEarningsNotification(amount, period = 'today') {
    return this.scheduleLocalNotification(
      'Earnings Update',
      `You earned ₦${amount} ${period}!`,
      {
        type: 'earnings_update',
        amount,
        period,
      },
      {
        categoryIdentifier: 'earnings',
      }
    );
  }

  // Cancel notification
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('📱 Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('📱 All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return null;
    }
  }

  // Set badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  // Clear badge
  async clearBadge() {
    return this.setBadgeCount(0);
  }

  // Cleanup
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;