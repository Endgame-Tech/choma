import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiService from '../services/api';

// Conditionally import expo-device
let Device;
try {
  Device = require('expo-device');
} catch (error) {
  console.warn('expo-device not available, using fallback');
  Device = {
    isDevice: true,
    deviceName: 'Unknown Device',
    modelName: 'Unknown Model'
  };
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    deliveryReminders: true,
    promotions: false,
    newMealPlans: true,
    achievements: true,
    pushNotifications: true
  });

  const notificationListener = useRef();
  const responseListener = useRef();

  // Initialize notification system
  useEffect(() => {
    initializeNotifications();
    loadNotifications();
    loadNotificationPreferences();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      // Refresh notifications when a new one is received
      loadNotifications();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response:', response);
      // Handle notification tap
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Initialize push notifications
  const initializeNotifications = async () => {
    try {
      // Check if we're on a real device or can use notifications
      const isPhysicalDevice = Device?.isDevice !== false;
      if (!isPhysicalDevice && Platform.OS !== 'web') {
        console.warn('Push notifications may not work on simulator');
        // Continue anyway for development
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Get push token
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID || 'choma-project', // Use env variable or fallback
        });
        
        setExpoPushToken(token.data);
        
        // Register token with backend
        await registerPushToken(token.data);
      } catch (tokenError) {
        console.warn('Failed to get push token:', tokenError.message);
        // Continue without push notifications
      }
      
      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('✅ Push notifications initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      setError('Failed to initialize push notifications');
    }
  };

  // Register push token with backend
  const registerPushToken = async (token) => {
    try {
      const deviceId = Device?.deviceName || Device?.modelName || `${Platform.OS}-device-${Date.now()}`;
      const platform = Platform.OS;
      
      await apiService.post('/auth/push-token', {
        token,
        deviceId,
        platform
      });
      
      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register push token:', error);
    }
  };

  // Load notifications from backend
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading notifications from backend...');
      
      // Add timestamp to force fresh data and bypass cache
      const timestamp = new Date().getTime();
      const response = await apiService.get(`/notifications?_t=${timestamp}`);
      
      console.log('📱 Raw API response structure:', JSON.stringify(response, null, 2));
      // Handle double-nested response structure from ApiService
      const actualData = response.data?.data || response.data;
      
      console.log('📱 Notification API response:', {
        success: response.success,
        dataExists: !!response.data,
        actualDataExists: !!actualData,
        responseDataType: typeof response.data,
        notificationsExists: !!actualData?.notifications,
        notificationsCount: actualData?.notifications?.length || 0,
        unreadCount: actualData?.pagination?.unreadCount || 0
      });
      
      if (response.success) {
        const notifications = actualData?.notifications || [];
        const unreadCount = actualData?.pagination?.unreadCount || 0;
        
        console.log('📋 Processing notifications:', {
          notificationArray: Array.isArray(notifications),
          notificationCount: notifications.length,
          firstNotification: notifications[0] ? {
            title: notifications[0].title,
            type: notifications[0].type,
            isRead: notifications[0].isRead
          } : null
        });
        
        setNotifications(notifications);
        setUnreadCount(unreadCount);
        console.log('✅ Notifications loaded successfully:', notifications.length);
      } else {
        throw new Error(response.message || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setError(error.message);
      
      // Load cached notifications as fallback
      try {
        const cached = await AsyncStorage.getItem('cached_notifications');
        if (cached) {
          const parsedNotifications = JSON.parse(cached);
          setNotifications(parsedNotifications);
          console.log('📋 Loaded cached notifications:', parsedNotifications.length);
        }
      } catch (cacheError) {
        console.error('Failed to load cached notifications:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load notification preferences
  const loadNotificationPreferences = async () => {
    try {
      const response = await apiService.get('/notifications/preferences');
      
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('❌ Error loading notification preferences:', error);
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (newPreferences) => {
    try {
      const response = await apiService.put('/notifications/preferences', newPreferences);
      
      if (response.success) {
        setPreferences(newPreferences);
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      return { success: false, error: error.message };
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await apiService.put(`/notifications/${notificationId}/read`);
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to mark as read');
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await apiService.put('/notifications/mark-all-read');
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to mark all as read');
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const response = await apiService.delete(`/notifications/${notificationId}`);
      
      if (response.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
        
        // Update unread count if deleted notification was unread
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete all read notifications
  const deleteAllRead = async () => {
    try {
      const response = await apiService.delete('/notifications/read/all');
      
      if (response.success) {
        // Update local state
        setNotifications(prev => prev.filter(notif => !notif.isRead));
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to delete read notifications');
      }
    } catch (error) {
      console.error('❌ Error deleting read notifications:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;
    
    if (data.notificationId) {
      // Mark notification as read
      markAsRead(data.notificationId);
    }
    
    // Handle navigation based on notification type
    if (data.type) {
      handleNotificationNavigation(data);
    }
  };

  // Handle navigation based on notification type
  const handleNotificationNavigation = (data) => {
    // This would integrate with your navigation system
    // For now, just log the navigation intent
    console.log('📱 Navigate to:', data.type, data);
    
    // Example navigation logic:
    // switch (data.type) {
    //   case 'order_confirmed':
    //   case 'order_out_for_delivery':
    //   case 'order_delivered':
    //     navigation.navigate('OrderTracking', { orderId: data.orderId });
    //     break;
    //   case 'payment_success':
    //   case 'payment_failed':
    //     navigation.navigate('PaymentHistory');
    //     break;
    //   case 'subscription_created':
    //   case 'subscription_expiring':
    //     navigation.navigate('Subscription');
    //     break;
    //   default:
    //     navigation.navigate('Notifications');
    // }
  };

  // Get notification by ID
  const getNotificationById = async (notificationId) => {
    try {
      const response = await apiService.get(`/notifications/${notificationId}`);
      
      if (response.success) {
        return { success: true, notification: response.data };
      } else {
        throw new Error(response.message || 'Notification not found');
      }
    } catch (error) {
      console.error('❌ Error getting notification:', error);
      return { success: false, error: error.message };
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    await loadNotifications();
  };

  // Cache notifications for offline access
  useEffect(() => {
    if (notifications.length > 0) {
      AsyncStorage.setItem('cached_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const value = {
    // State
    expoPushToken,
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    
    // Actions
    loadNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getNotificationById,
    updateNotificationPreferences,
    initializeNotifications,
    
    // Utilities
    handleNotificationResponse,
    handleNotificationNavigation
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;