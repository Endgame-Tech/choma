import axios from 'axios';
import { 
  TwoFactorStatus,
  TwoFactorBackupCodes,
  DeviceInfo,
  TwoFactorAuditLog,
  TwoFactorSetupResponse,
  TwoFactorVerificationResponse,
  TwoFactorStatusResponse
} from '../types/twoFactor';

// Define a type for pagination data
interface Pagination {
  total: number;
  limit: number;
  page: number;
  pages: number;
}

// Define a type for audit summary data
interface AuditSummaryData {
  action: string;
  count: number;
}

// Create axios instance for 2FA API
const api = axios.create({
  baseURL: import.meta.env.PROD
    ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/2fa`
    : '/api/admin/2fa',
  timeout: 60000, // Increased to 60 seconds to handle slow database operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  console.log(`🔐 2FA API Request: ${config.method?.toUpperCase()} ${config.url}`);
  
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
    // console.log(`✅ 2FA API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ 2FA API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 2FA API authentication failed - clearing stored credentials');
      localStorage.removeItem('choma-admin-token');
      localStorage.removeItem('choma-admin-data');
      if (window.location.pathname !== '/login') {
        window.location.reload();
      }
    }
    
    return Promise.reject(error);
  }
);

// Two-Factor Authentication API Service
export const twoFactorApi = {
  // Get current 2FA status for current admin
  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    try {
      const response = await api.get<TwoFactorStatusResponse>(`/status`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to get 2FA status');
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw error;
    }
  },

  // Initiate 2FA setup - generates QR code and secret
  async initiateTwoFactorSetup(): Promise<TwoFactorSetupResponse> {
    try {
      const response = await api.post<TwoFactorSetupResponse>(`/setup`);
      return response.data;
    } catch (error) {
      console.error('Error initiating 2FA setup:', error);
      throw error;
    }
  },

  // Verify 2FA setup with code from authenticator app
  async verifyTwoFactorSetup(token: string): Promise<TwoFactorVerificationResponse> {
    try {
      const response = await api.post<TwoFactorVerificationResponse>(`/verify-setup`, {
        token
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      throw error;
    }
  },

  // Verify 2FA code during login or sensitive operations
  async verifyTwoFactorCode(token: string, trustDevice: boolean = false): Promise<TwoFactorVerificationResponse> {
    try {
      const response = await api.post<TwoFactorVerificationResponse>(`/verify`, {
        token,
        trustDevice
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      throw error;
    }
  },

  // Verify backup code
  async verifyBackupCode(backupCode: string, trustDevice: boolean = false): Promise<TwoFactorVerificationResponse> {
    try {
      const response = await api.post<TwoFactorVerificationResponse>(`/verify-backup`, {
        backupCode,
        trustDevice
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      throw error;
    }
  },

  // Disable 2FA for current admin
  async disableTwoFactor(password: string, currentToken: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string }>(`/disable`, { 
        password, 
        currentToken 
      });
      return response.data;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  },

  // Get backup codes info
  async getBackupCodesInfo(): Promise<TwoFactorBackupCodes> {
    try {
      const response = await api.get<{ success: boolean; data?: TwoFactorBackupCodes }>(`/backup-codes`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Failed to get backup codes info');
    } catch (error) {
      console.error('Error getting backup codes info:', error);
      throw error;
    }
  },

  // Regenerate backup codes
  async regenerateBackupCodes(currentToken: string): Promise<{ success: boolean; message: string; data?: { backupCodes: string[]; total: number } }> {
    try {
      const response = await api.post<{ success: boolean; message: string; data?: { backupCodes: string[]; total: number } }>(`/backup-codes/regenerate`, { 
        currentToken 
      });
      return response.data;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  },

  // Get trusted devices
  async getTrustedDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await api.get<{ success: boolean; data?: { devices: DeviceInfo[] } }>(`/devices`);
      if (response.data.success && response.data.data) {
        return response.data.data.devices;
      }
      return [];
    } catch (error) {
      console.error('Error getting trusted devices:', error);
      return [];
    }
  },

  // Trust current device
  async trustCurrentDevice(deviceName: string, currentToken: string): Promise<{ success: boolean; message: string; data?: { deviceId: string } }> {
    try {
      const response = await api.post<{ success: boolean; message: string; data?: { deviceId: string } }>(`/devices/trust`, {
        deviceName,
        currentToken
      });
      return response.data;
    } catch (error) {
      console.error('Error trusting device:', error);
      throw error;
    }
  },

  // Remove a trusted device
  async removeTrustedDevice(deviceId: string, currentToken: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.request({
        method: 'DELETE',
        url: `/devices/${deviceId}`,
        data: { currentToken },
        headers: { 'Content-Type': 'application/json' }
      });
      return (response.data as unknown) as { success: boolean; message: string };
    } catch (error) {
      console.error('Error removing trusted device:', error);
      throw error;
    }
  },

  // Get 2FA settings
  async getSettings(): Promise<{ requireForLogin: boolean; requireForSensitiveActions: boolean; deviceRememberDuration: number }> {
    try {
      const response = await api.get<{ success: boolean; data?: { requireForLogin: boolean; requireForSensitiveActions: boolean; deviceRememberDuration: number } }>(`/settings`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return {
        requireForLogin: true,
        requireForSensitiveActions: true,
        deviceRememberDuration: 168
      };
    } catch (error) {
      console.error('Error getting 2FA settings:', error);
      return {
        requireForLogin: true,
        requireForSensitiveActions: true,
        deviceRememberDuration: 168
      };
    }
  },

  // Update 2FA settings
  async updateSettings(currentToken: string, settings: Partial<{ requireForLogin: boolean; requireForSensitiveActions: boolean; deviceRememberDuration: number; }>): Promise<{ success: boolean; message: string; data?: { requireForLogin: boolean; requireForSensitiveActions: boolean; deviceRememberDuration: number } }> {
    try {
      const response = await api.put<{ success: boolean; message: string; data?: { requireForLogin: boolean; requireForSensitiveActions: boolean; deviceRememberDuration: number } }>(`/settings`, {
        currentToken,
        settings
      });
      return response.data;
    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      throw error;
    }
  },

  // Get 2FA audit logs
  async getTwoFactorAuditLogs(page: number = 1, limit: number = 50, action?: string): Promise<{ logs: TwoFactorAuditLog[]; pagination: Pagination | Record<string, never> }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (action) params.append('action', action);

      const response = await api.get<{ success: boolean; data?: { logs: TwoFactorAuditLog[]; pagination: Pagination } }>(`/audit?${params.toString()}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { logs: [], pagination: {} };
    } catch (error) {
      console.error('Error getting 2FA audit logs:', error);
      return { logs: [], pagination: {} };
    }
  },

  // Get 2FA audit summary
  async getAuditSummary(days: number = 30): Promise<AuditSummaryData[]> {
    try {
      const response = await api.get<{ success: boolean; data?: AuditSummaryData[] }>(`/audit/summary?days=${days}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting 2FA audit summary:', error);
      return [];
    }
  },

  // Get suspicious activity
  async getSuspiciousActivity(hours: number = 24): Promise<TwoFactorAuditLog[]> {
    try {
      const response = await api.get<{ success: boolean; data?: TwoFactorAuditLog[] }>(`/audit/suspicious?hours=${hours}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting suspicious 2FA activity:', error);
      return [];
    }
  },

  // Emergency disable 2FA (requires additional verification)
  async emergencyDisableTwoFactor(reason: string, adminPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string }>(`/emergency-disable`, {
        reason,
        adminPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error emergency disabling 2FA:', error);
      throw error;
    }
  },

  // Request 2FA recovery
  async requestRecovery(contactInfo: string, reason: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const response = await api.post<{ success: boolean; message: string; data?: unknown }>(`/recovery`, {
        contactInfo,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting 2FA recovery:', error);
      throw error;
    }
  }
};

export default twoFactorApi;