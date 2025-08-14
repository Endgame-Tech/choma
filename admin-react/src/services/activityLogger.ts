import { 
  ActivityLog, 
  AdminSession, 
  SecurityAlert, 
  ActivityFilters,
  ACTIVITY_ACTIONS,
  getActivitySeverity 
} from '../types/activity';

class ActivityLogger {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  
  // Track admin activities
  async logActivity(params: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    action: string;
    module: string;
    details?: Record<string, unknown>;
    successful?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const severity = getActivitySeverity(params.module, params.action);
      
      const activityLog: Omit<ActivityLog, '_id' | 'timestamp' | 'ipAddress' | 'userAgent'> = {
        adminId: params.adminId,
        adminName: params.adminName,
        adminEmail: params.adminEmail,
        action: params.action,
        module: params.module,
        details: params.details || {},
        severity,
        successful: params.successful !== false, // Default to true unless explicitly false
        errorMessage: params.errorMessage,
      };

      // In production, this would send to backend API
      await this.sendToAPI('/admin/activity-logs', activityLog);
      
      // Log to console for development
      console.log('Activity Logged:', activityLog);
      
      // Check if we should create a security alert
      await this.checkForSecurityAlerts(activityLog);
      
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Log authentication events
  async logAuth(adminId: string, adminName: string, adminEmail: string, action: keyof typeof ACTIVITY_ACTIONS.AUTH, successful: boolean = true, errorMessage?: string): Promise<void> {
    await this.logActivity({
      adminId,
      adminName,
      adminEmail,
      action: ACTIVITY_ACTIONS.AUTH[action],
      module: 'auth',
      successful,
      errorMessage,
    });
  }

  // Log admin management actions
  async logAdminAction(
    currentAdminId: string,
    currentAdminName: string,
    currentAdminEmail: string,
    action: keyof typeof ACTIVITY_ACTIONS.ADMIN,
    targetAdminId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity({
      adminId: currentAdminId,
      adminName: currentAdminName,
      adminEmail: currentAdminEmail,
      action: ACTIVITY_ACTIONS.ADMIN[action],
      module: 'admin',
      details: {
        targetAdminId,
        ...details,
      },
    });
  }

  // Log meal-related actions
  async logMealAction(
    adminId: string,
    adminName: string,
    adminEmail: string,
    action: keyof typeof ACTIVITY_ACTIONS.MEALS,
    mealId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity({
      adminId,
      adminName,
      adminEmail,
      action: ACTIVITY_ACTIONS.MEALS[action],
      module: 'meals',
      details: {
        mealId,
        ...details,
      },
    });
  }

  // Log meal plan actions
  async logMealPlanAction(
    adminId: string,
    adminName: string,
    adminEmail: string,
    action: keyof typeof ACTIVITY_ACTIONS.MEAL_PLANS,
    mealPlanId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity({
      adminId,
      adminName,
      adminEmail,
      action: ACTIVITY_ACTIONS.MEAL_PLANS[action],
      module: 'meal_plans',
      details: {
        mealPlanId,
        ...details,
      },
    });
  }

  // Get activity logs with filtering
  async getActivityLogs(filters: ActivityFilters = {}): Promise<{
    activities: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}/admin/activity-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      // Return empty data when API fails
      return {
        activities: [],
        total: 0,
        page: filters.page || 1,
        totalPages: 0,
      };
    }
  }

  // Get admin sessions
  async getAdminSessions(adminId?: string): Promise<AdminSession[]> {
    try {
      const url = adminId 
        ? `${this.baseUrl}/admin/sessions?adminId=${adminId}`
        : `${this.baseUrl}/admin/sessions`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin sessions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching admin sessions:', error);
      return [];
    }
  }

  // Get security alerts
  async getSecurityAlerts(resolved: boolean = false): Promise<SecurityAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/security-alerts?resolved=${resolved}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch security alerts');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      return [];
    }
  }

  // Resolve security alert
  async resolveSecurityAlert(alertId: string, resolvedBy: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/admin/security-alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolvedBy }),
      });
    } catch (error) {
      console.error('Error resolving security alert:', error);
    }
  }

  // Check for security alerts based on activity
  private async checkForSecurityAlerts(activity: Omit<ActivityLog, '_id' | 'timestamp' | 'ipAddress' | 'userAgent'>): Promise<void> {
    try {
      // Check for multiple failed login attempts
      if (activity.action === ACTIVITY_ACTIONS.AUTH.FAILED_LOGIN && !activity.successful) {
        await this.createSecurityAlert({
          type: 'multiple_failures',
          adminId: activity.adminId,
          adminName: activity.adminName,
          description: `Multiple failed login attempts detected for admin: ${activity.adminName}`,
          severity: 'medium',
          metadata: { action: activity.action, module: activity.module },
        });
      }

      // Check for bulk actions
      if (activity.action.includes('bulk_')) {
        await this.createSecurityAlert({
          type: 'bulk_action',
          adminId: activity.adminId,
          adminName: activity.adminName,
          description: `Bulk action performed: ${activity.action} in ${activity.module}`,
          severity: activity.severity === 'critical' ? 'high' : 'medium',
          metadata: { action: activity.action, module: activity.module, details: activity.details },
        });
      }

      // Check for critical admin actions
      if (activity.severity === 'critical') {
        await this.createSecurityAlert({
          type: 'unusual_activity',
          adminId: activity.adminId,
          adminName: activity.adminName,
          description: `Critical action performed: ${activity.action} in ${activity.module}`,
          severity: 'critical',
          metadata: { action: activity.action, module: activity.module, details: activity.details },
        });
      }
    } catch (error) {
      console.error('Error checking for security alerts:', error);
    }
  }

  // Create security alert
  private async createSecurityAlert(params: {
    type: SecurityAlert['type'];
    adminId: string;
    adminName: string;
    description: string;
    severity: SecurityAlert['severity'];
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      const alert: Omit<SecurityAlert, '_id' | 'timestamp'> = {
        ...params,
        resolved: false,
      };

      await this.sendToAPI('/admin/security-alerts', alert);
      console.log('Security Alert Created:', alert);
    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  // Send data to API (generic method)
  private async sendToAPI(endpoint: string, data: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error sending to ${endpoint}:`, error);
      // In development, we'll just log to console
    }
  }

}

// Create singleton instance
export const activityLogger = new ActivityLogger();
export default activityLogger;