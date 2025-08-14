export interface ActivityLog {
  _id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  module: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  successful: boolean;
  errorMessage?: string;
}

export interface AdminSession {
  _id: string;
  adminId: string;
  sessionToken: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
  logoutTime?: string;
  logoutReason?: 'manual' | 'timeout' | 'permission_change' | 'security';
}

export interface SecurityAlert {
  _id: string;
  type: 'suspicious_login' | 'permission_change' | 'multiple_failures' | 'unusual_activity' | 'bulk_action';
  adminId: string;
  adminName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ActivityFilters {
  adminId?: string;
  module?: string;
  action?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  successful?: boolean;
  page?: number;
  limit?: number;
}

// Activity action types for different modules
export const ACTIVITY_ACTIONS = {
  AUTH: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    FAILED_LOGIN: 'failed_login',
    PASSWORD_CHANGE: 'password_change',
    SESSION_TIMEOUT: 'session_timeout',
  },
  ADMIN: {
    CREATE: 'create_admin',
    UPDATE: 'update_admin',
    DELETE: 'delete_admin',
    ACTIVATE: 'activate_admin',
    DEACTIVATE: 'deactivate_admin',
    ROLE_CHANGE: 'role_change',
  },
  MEALS: {
    CREATE: 'create_meal',
    UPDATE: 'update_meal',
    DELETE: 'delete_meal',
    BULK_UPLOAD: 'bulk_upload_meals',
    TOGGLE_AVAILABILITY: 'toggle_meal_availability',
    BULK_DELETE: 'bulk_delete_meals',
    BULK_AVAILABILITY: 'bulk_availability_update',
  },
  MEAL_PLANS: {
    CREATE: 'create_meal_plan',
    UPDATE: 'update_meal_plan',
    DELETE: 'delete_meal_plan',
    PUBLISH: 'publish_meal_plan',
    UNPUBLISH: 'unpublish_meal_plan',
    SCHEDULE: 'schedule_meal_plan',
  },
  ORDERS: {
    VIEW: 'view_order',
    UPDATE: 'update_order',
    APPROVE: 'approve_order',
    CANCEL: 'cancel_order',
  },
  CHEFS: {
    CREATE: 'create_chef',
    UPDATE: 'update_chef',
    DELETE: 'delete_chef',
    APPROVE: 'approve_chef',
    REJECT: 'reject_chef',
  },
  USERS: {
    VIEW: 'view_user',
    UPDATE: 'update_user',
    DELETE: 'delete_user',
    VIEW_SENSITIVE: 'view_sensitive_user_info',
  },
  CUSTOMERS: {
    VIEW: 'view_customer',
    UPDATE: 'update_customer',
    DELETE: 'delete_customer',
    VIEW_SENSITIVE: 'view_sensitive_customer_info',
  },
} as const;

// Helper function to determine activity severity
export const getActivitySeverity = (_module: string, action: string): 'low' | 'medium' | 'high' | 'critical' => {
  // Critical actions
  if (action.includes('delete') || action.includes('bulk_delete')) return 'critical';
  if (action === ACTIVITY_ACTIONS.ADMIN.DELETE || action === ACTIVITY_ACTIONS.ADMIN.ROLE_CHANGE) return 'critical';
  
  // High severity actions
  if (action.includes('bulk_') || action.includes('approve') || action.includes('reject')) return 'high';
  if (action === ACTIVITY_ACTIONS.ADMIN.CREATE || action === ACTIVITY_ACTIONS.ADMIN.DEACTIVATE) return 'high';
  if (action === ACTIVITY_ACTIONS.MEAL_PLANS.PUBLISH || action === ACTIVITY_ACTIONS.MEAL_PLANS.UNPUBLISH) return 'high';
  
  // Medium severity actions
  if (action.includes('create') || action.includes('update') || action.includes('toggle')) return 'medium';
  if (action === ACTIVITY_ACTIONS.AUTH.FAILED_LOGIN) return 'medium';
  
  // Low severity actions (view, login, etc.)
  return 'low';
};