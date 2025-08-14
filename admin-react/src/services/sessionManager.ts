import { AdminSession } from '../types/activity';
import { Admin } from '../types/admin';
import { activityLogger } from './activityLogger';

interface SessionChangeEvent {
  type: 'permission_change' | 'role_change' | 'deactivation' | 'deletion';
  adminId: string;
  adminName: string;
  changedBy: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

class SessionManager {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  private sessionCheckInterval: number | null = null;
  private listeners: Map<string, (event: SessionChangeEvent) => void> = new Map();

  // Start session monitoring
  startSessionMonitoring(adminId: string): void {
    if (this.sessionCheckInterval) {
      window.clearInterval(this.sessionCheckInterval);
    }

    // Check session validity every 5 minutes
    this.sessionCheckInterval = window.setInterval(async () => {
      await this.checkSessionValidity(adminId);
    }, 5 * 60 * 1000) as unknown as number;

    console.log(`Session monitoring started for admin: ${adminId}`);
  }

  // Stop session monitoring
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      window.clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    this.listeners.clear();
    console.log('Session monitoring stopped');
  }

  // Check if current session is still valid
  async checkSessionValidity(adminId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/session/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId }),
      });

      if (!response.ok) {
        throw new Error('Session validation failed');
      }

      const data = await response.json();
      
      if (!data.valid) {
        await this.handleSessionInvalidation(adminId, data.reason || 'Session expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      // In development, assume session is valid
      return true;
    }
  }

  // Handle session invalidation
  private async handleSessionInvalidation(adminId: string, reason: string): Promise<void> {
    console.log(`Session invalidated for admin ${adminId}: ${reason}`);
    
    // Clear local storage
    localStorage.removeItem('choma-admin-token');
    localStorage.removeItem('choma-admin-data');
    
    // Redirect to login
    window.location.href = '/login';
    
    // Notify listeners
    this.notifyListeners({
      type: 'permission_change',
      adminId,
      adminName: 'Current Admin',
      changedBy: 'System',
      reason,
    });
  }

  // Handle admin permission changes
  async handleAdminPermissionChange(
    targetAdmin: Admin,
    changedBy: Admin,
    changeType: 'role_change' | 'permission_change' | 'deactivation' | 'deletion',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const event: SessionChangeEvent = {
        type: changeType,
        adminId: targetAdmin._id,
        adminName: `${targetAdmin.firstName} ${targetAdmin.lastName}`,
        changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
        reason: this.getChangeReason(changeType),
        metadata,
      };

      // Log the session change
      await activityLogger.logActivity({
        adminId: changedBy._id,
        adminName: `${changedBy.firstName} ${changedBy.lastName}`,
        adminEmail: changedBy.email,
        action: `session_${changeType}`,
        module: 'admin_session',
        details: {
          targetAdminId: targetAdmin._id,
          targetAdminName: event.adminName,
          changeType,
          ...metadata,
        },
      });

      // Force logout affected admin if they're currently logged in
      if (changeType === 'deactivation' || changeType === 'deletion') {
        await this.forceLogoutAdmin(targetAdmin._id, changeType);
      } else if (changeType === 'role_change' || changeType === 'permission_change') {
        await this.invalidateAdminSessions(targetAdmin._id, event.reason);
      }

      // Create security alert for significant changes
      if (changeType === 'deletion' || changeType === 'deactivation') {
        await this.createSecurityAlert(event);
      }

      // Notify listeners
      this.notifyListeners(event);

    } catch (error) {
      console.error('Error handling admin permission change:', error);
    }
  }

  // Force logout specific admin
  private async forceLogoutAdmin(adminId: string, reason: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/admin/session/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
        },
        body: JSON.stringify({ adminId, reason }),
      });

      console.log(`Forced logout for admin: ${adminId}, reason: ${reason}`);
    } catch (error) {
      console.error('Error forcing admin logout:', error);
    }
  }

  // Invalidate all sessions for an admin
  private async invalidateAdminSessions(adminId: string, reason: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/admin/session/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
        },
        body: JSON.stringify({ adminId, reason }),
      });

      console.log(`Invalidated sessions for admin: ${adminId}, reason: ${reason}`);
    } catch (error) {
      console.error('Error invalidating admin sessions:', error);
    }
  }

  // Create security alert for significant admin changes
  private async createSecurityAlert(event: SessionChangeEvent): Promise<void> {
    try {
      const alert = {
        type: 'permission_change' as const,
        adminId: event.adminId,
        adminName: event.adminName,
        description: `Admin ${event.type.replace('_', ' ')} performed by ${event.changedBy}: ${event.reason}`,
        severity: event.type === 'deletion' ? 'critical' as const : 'high' as const,
        metadata: {
          changeType: event.type,
          changedBy: event.changedBy,
          ...event.metadata,
        },
      };

      await fetch(`${this.baseUrl}/admin/security-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
        },
        body: JSON.stringify(alert),
      });

      console.log('Security alert created for admin change:', alert);
    } catch (error) {
      console.error('Error creating security alert:', error);
    }
  }

  // Get active sessions for an admin
  async getAdminSessions(adminId?: string): Promise<AdminSession[]> {
    try {
      const url = adminId 
        ? `${this.baseUrl}/admin/sessions?adminId=${adminId}`
        : `${this.baseUrl}/admin/sessions`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin sessions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching admin sessions:', error);
      return [];
    }
  }

  // Terminate specific session
  async terminateSession(sessionId: string, reason: string = 'Manual termination'): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/admin/session/${sessionId}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`,
        },
        body: JSON.stringify({ reason }),
      });

      console.log(`Session ${sessionId} terminated: ${reason}`);
    } catch (error) {
      console.error('Error terminating session:', error);
    }
  }

  // Register listener for session events
  addSessionListener(id: string, callback: (event: SessionChangeEvent) => void): void {
    this.listeners.set(id, callback);
  }

  // Remove session listener
  removeSessionListener(id: string): void {
    this.listeners.delete(id);
  }

  // Notify all listeners of session events
  private notifyListeners(event: SessionChangeEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in session listener:', error);
      }
    });
  }

  // Get reason text for change type
  private getChangeReason(changeType: SessionChangeEvent['type']): string {
    switch (changeType) {
      case 'role_change':
        return 'Admin role was changed';
      case 'permission_change':
        return 'Admin permissions were modified';
      case 'deactivation':
        return 'Admin account was deactivated';
      case 'deletion':
        return 'Admin account was deleted';
      default:
        return 'Admin account was modified';
    }
  }


  // Initialize session manager with current admin
  async initialize(currentAdmin: Admin): Promise<void> {
    this.startSessionMonitoring(currentAdmin._id);
    
    // Log session start
    await activityLogger.logAuth(
      currentAdmin._id,
      `${currentAdmin.firstName} ${currentAdmin.lastName}`,
      currentAdmin.email,
      'LOGIN'
    );
  }

  // Cleanup when admin logs out
  async cleanup(currentAdmin: Admin | null): Promise<void> {
    if (currentAdmin) {
      // Log session end
      await activityLogger.logAuth(
        currentAdmin._id,
        `${currentAdmin.firstName} ${currentAdmin.lastName}`,
        currentAdmin.email,
        'LOGOUT'
      );
    }
    
    this.stopSessionMonitoring();
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;