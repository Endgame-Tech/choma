import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Notification,
  NotificationFilters,
  NotificationStats,
  ToastNotification,
  NotificationPreferences,
  SecurityNotification,
  NOTIFICATION_CONFIG,
  NotificationType
} from '../types/notifications';
import { usePermissions } from './PermissionContext';
import { notificationApi } from '../services/notificationApi';
import { socketService } from '../services/socketService';

interface NotificationContextType {
  // Notifications state
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;

  // Toast notifications
  toasts: ToastNotification[];

  // Real-time connection
  connected: boolean;

  // Preferences
  preferences: NotificationPreferences | null;

  // Actions
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;

  // Toast actions
  showToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;

  // Real-time
  subscribe: (types: NotificationType[]) => void;
  unsubscribe: (types: NotificationType[]) => void;

  // Security notifications
  createSecurityNotification: (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
}

interface TwoFactorAuthEvent {
  success: boolean;
  action: string;
}

interface SystemUpdatePayload {
  message: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { currentAdmin } = usePermissions();

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Refs for real-time connection and subscriptions
  const subscriptionsRef = useRef<NotificationType[]>([]);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Initialize when admin is available
  useEffect(() => {
    if (currentAdmin) {
      initializeNotifications();
      // connectWebSocket();
      loadPreferences();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentAdmin]);

  // Auto-refresh notifications periodically
  useEffect(() => {
    if (!currentAdmin) return;

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [currentAdmin]);

  const initializeNotifications = async () => {
    if (!currentAdmin) return;

    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchNotifications(),
        fetchStats(),
        fetchUnreadCount()
      ]);

      console.log('✅ Notifications initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      setError('Failed to load notifications');

      // Set default empty state on error
      setNotifications([]);
      setUnreadCount(0);
      setStats({
        total: 0,
        unread: 0,
        byType: {
          security_alert: 0,
          system_update: 0,
          admin_action: 0,
          meal_update: 0,
          chef_action: 0,
          order_alert: 0,
          user_activity: 0,
          payment_alert: 0,
          general: 0,
        },
        bySeverity: {
          info: 0,
          warning: 0,
          error: 0,
          success: 0,
        },
        todayCount: 0,
        weekCount: 0,
        monthCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = useCallback(async (filters?: NotificationFilters) => {
    if (!currentAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const response = await notificationApi.getNotifications({
        limit: 50,
        ...filters,
      });

      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        if (response.data.total !== undefined) {
          // Calculate unread count from the notifications
          const unread = response.data.notifications.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAdmin]);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentAdmin) return;

    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [currentAdmin]);

  const fetchStats = async () => {
    if (!currentAdmin) return;

    try {
      const statsData = await notificationApi.getNotificationStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!currentAdmin) return;

    try {
      await notificationApi.markAsRead(notificationId);

      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentAdmin) return;

    try {
      await notificationApi.markAllAsRead();

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!currentAdmin) return;

    try {
      await notificationApi.deleteNotification(notificationId);

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!currentAdmin) return;

    try {
      await notificationApi.deleteAllRead(currentAdmin._id);

      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const showToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date().toISOString(),
      duration: toast.duration ?? NOTIFICATION_CONFIG.DEFAULT_DURATION,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss if duration is set
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const dismissToast = (id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast?.onDismiss) {
        toast.onDismiss();
      }
      return prev.filter(t => t.id !== id);
    });
  };

  const dismissAllToasts = () => {
    setToasts(prev => {
      prev.forEach(toast => {
        if (toast.onDismiss) {
          toast.onDismiss();
        }
      });
      return [];
    });
  };

  const loadPreferences = async () => {
    if (!currentAdmin) return;

    try {
      const prefs = await notificationApi.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);

      // Set default preferences on error
      setPreferences({
        adminId: currentAdmin._id,
        emailNotifications: true,
        pushNotifications: true,
        browserNotifications: true,
        securityAlerts: true,
        systemUpdates: true,
        adminActions: true,
        mealUpdates: true,
        chefActions: true,
        orderAlerts: true,
        userActivity: false,
        paymentAlerts: true,
        general: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!currentAdmin || !preferences) return;

    try {
      const updatedPrefs = { ...preferences, ...newPreferences };
      await notificationApi.updateNotificationPreferences(updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  };

  const connectWebSocket = () => {
    if (!currentAdmin) return;

    try {
      console.log('🔌 Connecting to notification WebSocket service');

      // Connect to socket service
      socketService.connect();

      // Set up event handlers
      const onNewNotification = (data: Notification | SecurityNotification | SystemUpdatePayload | TwoFactorAuthEvent) => {
        if ('severity' in data && 'id' in data) { // Type guard for Notification
          const notification = data as Notification;
          console.log('🔔 New notification from WebSocket:', notification);

          setNotifications(prev => [notification, ...prev]);

          if (!notification.read) {
            setUnreadCount(prev => prev + 1);
          }

          // Show toast if preferences allow
          if (preferences?.browserNotifications && shouldShowToast(notification)) {
            showToast({
              title: notification.title,
              message: notification.message,
              type: notification.type,
              severity: notification.severity,
              actionLabel: notification.actionLabel,
              onAction: notification.actionUrl ? () => {
                window.location.href = notification.actionUrl!;
              } : undefined,
            });
          }
        }
      };

      const onSecurityAlert = (data: Notification | SecurityNotification | SystemUpdatePayload | TwoFactorAuthEvent) => {
        if ('riskLevel' in data) { // Type guard for SecurityNotification
          const alert = data as SecurityNotification;
          console.log('🚨 Security alert from WebSocket:', alert);

          // Create a notification from the security alert
          const notification: Notification = {
            id: alert.id,
            adminId: currentAdmin!._id,
            title: alert.title,
            message: alert.message,
            type: 'security_alert',
            severity: alert.riskLevel === 'critical' ? 'error' : 'warning',
            read: false,
            timestamp: alert.timestamp || new Date().toISOString(),
            actionUrl: alert.actionUrl,
            actionLabel: alert.actionLabel,
            metadata: alert.metadata
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Always show security alerts as toasts
          showToast({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            severity: notification.severity,
          });
        }
      };

      const onSystemUpdate = (data: Notification | SecurityNotification | SystemUpdatePayload | TwoFactorAuthEvent) => {
        if ('message' in data && !('severity' in data) && !('riskLevel' in data) && !('success' in data)) { // More specific guard for SystemUpdatePayload
          const update = data as SystemUpdatePayload;
          console.log('📢 System update from WebSocket:', update);
          // This is a placeholder. Implement system update handling as needed.
          showToast({
            title: 'System Update',
            message: update.message || 'A system update has occurred.',
            type: 'system_update',
            severity: 'info',
          });
        }
      };

      const on2FAEvent = (data: Notification | SecurityNotification | SystemUpdatePayload | TwoFactorAuthEvent) => {
        if ('success' in data) { // Type guard for TwoFactorAuthEvent
          const event = data as TwoFactorAuthEvent;
          console.log('🔐 2FA event from WebSocket:', event);

          // Show 2FA related notifications
          if (!event.success && event.action === 'verify_failure') {
            showToast({
              title: '2FA Verification Failed',
              message: 'Failed verification attempt detected on your account',
              type: 'security_alert',
              severity: 'warning',
            });
          }
        }
      };

      // Register event handlers
      socketService.onNewNotification(onNewNotification);
      socketService.onSecurityAlert(onSecurityAlert);
      socketService.onSystemUpdate(onSystemUpdate);
      socketService.on2FAEvent(on2FAEvent);

      // Store cleanup functions
      cleanupFunctionsRef.current = [
        () => socketService.removeCallback('new_notification', onNewNotification),
        () => socketService.removeCallback('security_alert', onSecurityAlert),
        () => socketService.removeCallback('system_update', onSystemUpdate),
        () => socketService.removeCallback('2fa_event', on2FAEvent),
      ];

      // Update connection status based on socket service
      const checkConnection = () => {
        setConnected(socketService.getConnectionStatus());
      };

      // Check connection status periodically
      const connectionInterval = setInterval(checkConnection, 5000);
      cleanupFunctionsRef.current.push(() => clearInterval(connectionInterval));

      setConnected(socketService.getConnectionStatus());
    } catch (error) {
      console.error('❌ Failed to connect to notification WebSocket:', error);
      setError('Failed to establish real-time connection');
    }
  };

  const disconnectWebSocket = () => {
    try {
      console.log('🔌 Disconnecting from notification WebSocket service');

      // Clean up event handlers
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];

      // Disconnect socket service
      socketService.disconnect();

      setConnected(false);
    } catch (error) {
      console.error('❌ Error disconnecting WebSocket:', error);
    }
  };

  // Helper function to determine if a toast should be shown based on preferences

  const shouldShowToast = (notification: Notification): boolean => {
    if (!preferences) return true;

    // Check if notification type is enabled
    const typeEnabled = preferences[notification.type as keyof NotificationPreferences];
    if (typeof typeEnabled === 'boolean' && !typeEnabled) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { startTime, endTime } = preferences.quietHours;

      if (startTime <= endTime) {
        // Same day range
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      } else {
        // Overnight range
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      }
    }

    return true;
  };

  const subscribe = (types: NotificationType[]) => {
    subscriptionsRef.current = [...new Set([...subscriptionsRef.current, ...types])];
    console.log('📬 Subscribed to notification types:', types);
  };

  const unsubscribe = (types: NotificationType[]) => {
    subscriptionsRef.current = subscriptionsRef.current.filter(t => !types.includes(t));
    console.log('📭 Unsubscribed from notification types:', types);
  };

  const createSecurityNotification = async (notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'read'>) => {
    if (!currentAdmin) return;

    try {
      await notificationApi.createSecurityNotification({
        ...notification,
        adminId: currentAdmin._id,
      });

      // The notification will be received via WebSocket
    } catch (error) {
      console.error('Error creating security notification:', error);
      throw error;
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    stats,
    loading,
    error,
    toasts,
    connected,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    showToast,
    dismissToast,
    dismissAllToasts,
    updatePreferences,
    subscribe,
    unsubscribe,
    createSecurityNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;