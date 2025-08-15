import axios from 'axios';
import { 
  Notification,
  NotificationFilters,
  NotificationStats,
  NotificationPreferences,
  SecurityNotification,
  NotificationResponse,
  NotificationActionResponse,
  NotificationTemplate,
  NotificationType,
  NotificationSeverity
} from '../types/notifications';

// Additional interfaces for API operations
interface CreateNotificationRequest {
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  adminIds?: string[];
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  persistent?: boolean;
}

interface SecurityAlertResponse {
  success: boolean;
  message: string;
  data: {
    alerts: SecurityNotification[];
    total: number;
    page: number;
    totalPages: number;
  };
}

// Create axios instance for notification API
const api = axios.create({
  baseURL: import.meta.env.PROD
    ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/notifications`
    : '/api/admin/notifications',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  console.log(`🔔 Notification API Request: ${config.method?.toUpperCase()} ${config.url}`);
  
  // Add authentication token if available
  const token = localStorage.getItem('choma-admin-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Notification API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Notification API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 Notification API authentication failed - clearing stored credentials');
      localStorage.removeItem('choma-admin-token');
      localStorage.removeItem('choma-admin-data');
      if (window.location.pathname !== '/login') {
        window.location.reload();
      }
    }
    
    return Promise.reject(error);
  }
);

// Notification API Service
export const notificationApi = {
  // Get notifications with filtering and pagination
  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await api.get<NotificationResponse>(`/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread notification count
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    try {
      const response = await api.get<{ success: boolean; data: { unreadCount: number } }>('/unread-count');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return { unreadCount: 0 };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { unreadCount: 0 };
    }
  },

  // Get notification statistics
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const response = await api.get<{ success: boolean; data: NotificationStats }>('/stats');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch notification stats');
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  },

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/', notification);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Create a security notification
  async createSecurityNotification(notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'read'>): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/security', notification);
      return response.data;
    } catch (error) {
      console.error('Error creating security notification:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<NotificationActionResponse> {
    try {
      const response = await api.put<NotificationActionResponse>(`/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<NotificationActionResponse> {
    try {
      const response = await api.put<NotificationActionResponse>('/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<NotificationActionResponse> {
    try {
      const response = await api.delete<NotificationActionResponse>(`/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Delete all read notifications for an admin
  async deleteAllRead(adminId: string): Promise<NotificationActionResponse> {
    try {
      const response = await api.delete<NotificationActionResponse>(`/admin/${adminId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  },

  // Bulk operations on notifications
  async bulkOperation(operation: 'read' | 'delete', notificationIds: string[]): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/bulk', {
        operation,
        notificationIds,
      });
      return response.data;
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw error;
    }
  },

  // Get notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await api.get<{ success: boolean; data: NotificationPreferences }>('/preferences/settings');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch notification preferences');
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      
      // Return default preferences if API fails
      return {
        adminId: '',
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
      };
    }
  },

  // Update notification preferences
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<NotificationActionResponse> {
    try {
      const response = await api.put<NotificationActionResponse>('/preferences/settings', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  // Bulk delete notifications
  async bulkDeleteNotifications(ids?: string[], filters?: NotificationFilters): Promise<NotificationActionResponse> {
    try {
      const response = await api.request({
        method: 'DELETE',
        url: '/bulk',
        data: { ids, filters },
        headers: { 'Content-Type': 'application/json' }
      });
      return (response.data as unknown) as NotificationActionResponse;
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      throw error;
    }
  },

  // Send notification to specific admins
  async sendNotification(notification: CreateNotificationRequest): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/send', notification);
      return response.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  },

  // Broadcast notification to all admins
  async broadcastNotification(notification: CreateNotificationRequest): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/broadcast', notification);
      return response.data;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  },

  // Get security alerts
  async getSecurityAlerts(page: number = 1, limit: number = 20, riskLevel?: string): Promise<SecurityAlertResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (riskLevel) params.append('riskLevel', riskLevel);

      const response = await api.get<SecurityAlertResponse>(`/security/alerts?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      throw error;
    }
  },

  // Create security alert
  async createSecurityAlert(alert: Omit<SecurityNotification, 'id' | 'timestamp' | 'read' | 'adminId'>): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/security/alert', alert);
      return response.data;
    } catch (error) {
      console.error('Error creating security alert:', error);
      throw error;
    }
  },

  // Resolve security alert
  async resolveSecurityAlert(alertId: string, resolution?: string): Promise<NotificationActionResponse> {
    try {
      const response = await api.put<NotificationActionResponse>(`/security/${alertId}/resolve`, {
        resolution
      });
      return response.data;
    } catch (error) {
      console.error('Error resolving security alert:', error);
      throw error;
    }
  },

  // Get notification templates
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      const response = await api.get<{ success: boolean; data: NotificationTemplate[] }>('/templates');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      return [];
    }
  },

  // Create or update notification template
  async saveNotificationTemplate(template: Omit<NotificationTemplate, 'id'> | NotificationTemplate): Promise<NotificationActionResponse> {
    try {
      const response = 'id' in template
        ? await api.put<NotificationActionResponse>(`/templates/${template.id}`, template)
        : await api.post<NotificationActionResponse>('/templates', template);
      
      return response.data;
    } catch (error) {
      console.error('Error saving notification template:', error);
      throw error;
    }
  },

  // Delete notification template
  async deleteNotificationTemplate(templateId: string): Promise<NotificationActionResponse> {
    try {
      const response = await api.delete<NotificationActionResponse>(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification template:', error);
      throw error;
    }
  },

  // Send test notification
  async sendTestNotification(adminId: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'adminId'>): Promise<NotificationActionResponse> {
    try {
      const response = await api.post<NotificationActionResponse>('/test', {
        ...notification,
        adminId,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  },

  // Get notification by ID
  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      const response = await api.get<{ success: boolean; data: Notification }>(`/${notificationId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching notification:', error);
      return null;
    }
  },

  // Search notifications
  async searchNotifications(query: string, adminId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const response = await api.get<{ success: boolean; data: Notification[] }>('/search', {
        params: { q: query, adminId, limit },
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error searching notifications:', error);
      return [];
    }
  },

  // Export notifications
  async exportNotifications(adminId: string, filters: NotificationFilters = {}, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.append('adminId', adminId);
      params.append('format', format);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await api.get(`/export?${params}`, {
        responseType: 'blob',
      });
      
      return response.data as Blob;
    } catch (error) {
      console.error('Error exporting notifications:', error);
      throw error;
    }
  },

  // Get admin notification summary
  async getAdminNotificationSummary(adminId: string, days: number = 7): Promise<{
    totalReceived: number;
    totalRead: number;
    averageResponseTime: number; // in minutes
    topTypes: Array<{ type: string; count: number }>;
    dailyBreakdown: Array<{ date: string; count: number; read: number }>;
  }> {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          totalReceived: number;
          totalRead: number;
          averageResponseTime: number;
          topTypes: Array<{ type: string; count: number }>;
          dailyBreakdown: Array<{ date: string; count: number; read: number }>;
        };
      }>(`/admin/${adminId}/summary`, {
        params: { days },
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch notification summary');
    } catch (error) {
      console.error('Error fetching notification summary:', error);
      throw error;
    }
  },

  // Get system notification metrics (for analytics)
  async getSystemNotificationMetrics(): Promise<{
    totalNotifications: number;
    notificationsByType: Record<string, number>;
    averageDeliveryTime: number;
    failureRate: number;
    mostActiveAdmins: Array<{ adminId: string; adminName: string; count: number }>;
  }> {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          totalNotifications: number;
          notificationsByType: Record<string, number>;
          averageDeliveryTime: number;
          failureRate: number;
          mostActiveAdmins: Array<{ adminId: string; adminName: string; count: number }>;
        };
      }>('/metrics');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch system notification metrics');
    } catch (error) {
      console.error('Error fetching system notification metrics:', error);
      throw error;
    }
  },
};

export default notificationApi;