// Notification System Types and Interfaces

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  timestamp: string;
  read: boolean;
  adminId: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  persistent?: boolean;
}

export type NotificationType = 
  | 'security_alert'
  | 'system_update'
  | 'admin_action'
  | 'meal_update'
  | 'chef_action'
  | 'order_alert'
  | 'user_activity'
  | 'payment_alert'
  | 'general';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface NotificationPreferences {
  adminId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications: boolean;
  securityAlerts: boolean;
  systemUpdates: boolean;
  adminActions: boolean;
  mealUpdates: boolean;
  chefActions: boolean;
  orderAlerts: boolean;
  userActivity: boolean;
  paymentAlerts: boolean;
  general: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: string;
  };
}

export interface NotificationFilters {
  type?: NotificationType[];
  severity?: NotificationSeverity[];
  read?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  adminId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'severity' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  bySeverity: Record<NotificationSeverity, number>;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

// Real-time notification events
export interface NotificationEvent {
  type: 'new_notification' | 'notification_read' | 'notification_deleted' | 'bulk_operation';
  notification?: Notification;
  notificationIds?: string[];
  adminId: string;
  timestamp: string;
}

// Toast notification for UI display
export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  duration?: number; // milliseconds, 0 for persistent
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  timestamp: string;
}

// Notification templates for consistent messaging
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  severity: NotificationSeverity;
  titleTemplate: string;
  messageTemplate: string;
  actionLabel?: string;
  actionUrl?: string;
  variables: string[]; // Variables that can be replaced in templates
  enabled: boolean;
}

// Security-specific notification types
export interface SecurityNotification extends Notification {
  type: 'security_alert';
  securityEventType: SecurityEventType;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedResource?: string;
  sourceIP?: string;
  userAgent?: string;
  recommendations?: string[];
  autoResolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type SecurityEventType = 
  | 'failed_login_attempts'
  | 'suspicious_activity'
  | 'privilege_escalation'
  | 'data_access_violation'
  | 'bulk_operations'
  | 'after_hours_access'
  | 'location_anomaly'
  | 'multiple_sessions'
  | 'password_reset'
  | 'two_factor_disabled'
  | 'admin_created'
  | 'admin_deleted'
  | 'permission_changed'
  | 'critical_data_modified';

// API Response types
export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: {
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
    stats?: NotificationStats;
  };
}

export interface NotificationActionResponse {
  success: boolean;
  message: string;
  data?: {
    notification?: Notification;
    affectedCount?: number;
  };
}

// WebSocket/Real-time connection types
export interface NotificationConnection {
  connected: boolean;
  lastPing: string;
  adminId: string;
  sessionId: string;
  subscriptions: NotificationType[];
}

// Notification queue for offline/retry scenarios
export interface NotificationQueue {
  pending: Notification[];
  failed: Notification[];
  retryAttempts: Record<string, number>;
  maxRetries: number;
}

// Constants for notification configuration
export const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 5000, // 5 seconds
  PERSISTENT_DURATION: 0, // Never auto-dismiss
  MAX_NOTIFICATIONS: 1000, // Max notifications to store per admin
  CLEANUP_AFTER_DAYS: 30, // Clean up read notifications after 30 days
  BATCH_SIZE: 50, // Number of notifications to fetch at once
  RETRY_INTERVAL: 30000, // 30 seconds between retries
  MAX_RETRIES: 3,
  WEBSOCKET_RECONNECT_INTERVAL: 5000, // 5 seconds
} as const;

// Notification severity colors and icons
export const NOTIFICATION_UI_CONFIG = {
  info: {
    color: 'blue',
    icon: 'info-circle',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  success: {
    color: 'green',
    icon: 'check-circle',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300',
  },
  warning: {
    color: 'yellow',
    icon: 'exclamation-triangle',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  error: {
    color: 'red',
    icon: 'exclamation-circle',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
  },
} as const;

// Predefined notification templates
export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'security_login_failure',
    name: 'Multiple Failed Login Attempts',
    type: 'security_alert',
    severity: 'warning',
    titleTemplate: 'Security Alert: Multiple Failed Login Attempts',
    messageTemplate: 'There have been {attemptCount} failed login attempts for admin {adminName} from IP {ipAddress}.',
    actionLabel: 'View Details',
    actionUrl: '/admin-management?tab=activity',
    variables: ['attemptCount', 'adminName', 'ipAddress'],
    enabled: true,
  },
  {
    id: 'admin_created',
    name: 'New Admin Account Created',
    type: 'admin_action',
    severity: 'info',
    titleTemplate: 'New Admin Account Created',
    messageTemplate: 'A new admin account has been created for {newAdminName} by {createdBy}.',
    actionLabel: 'View Admin',
    actionUrl: '/admin-management',
    variables: ['newAdminName', 'createdBy'],
    enabled: true,
  },
  {
    id: 'meal_published',
    name: 'Meal Published',
    type: 'meal_update',
    severity: 'success',
    titleTemplate: 'Meal Published Successfully',
    messageTemplate: 'The meal "{mealName}" has been published and is now available to customers.',
    actionLabel: 'View Meal',
    actionUrl: '/meals',
    variables: ['mealName'],
    enabled: true,
  },
  {
    id: 'chef_approval_needed',
    name: 'Chef Approval Required',
    type: 'chef_action',
    severity: 'info',
    titleTemplate: 'Chef Approval Required',
    messageTemplate: 'Chef {chefName} is awaiting approval to join the platform.',
    actionLabel: 'Review Chef',
    actionUrl: '/chefs',
    variables: ['chefName'],
    enabled: true,
  },
  {
    id: 'system_maintenance',
    name: 'Scheduled Maintenance',
    type: 'system_update',
    severity: 'warning',
    titleTemplate: 'Scheduled System Maintenance',
    messageTemplate: 'System maintenance is scheduled for {maintenanceDate} from {startTime} to {endTime}.',
    variables: ['maintenanceDate', 'startTime', 'endTime'],
    enabled: true,
  },
] as const;

// Utility types
export type NotificationUIConfig = typeof NOTIFICATION_UI_CONFIG[keyof typeof NOTIFICATION_UI_CONFIG];
export type NotificationConfigKey = keyof typeof NOTIFICATION_CONFIG;