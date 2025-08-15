// Two-Factor Authentication Types and Interfaces

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  verificationCode?: string;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  lastVerified?: string;
  backupCodesRemaining: number;
  setupDate?: string;
  backupCodes?: {
    total: number;
    used: number;
    remaining: number;
    lastGenerated?: string;
  };
}

export interface TwoFactorVerification {
  adminId: string;
  verificationCode: string;
  useBackupCode?: boolean;
  rememberDevice?: boolean;
}

export interface TwoFactorSettings {
  requireForLogin: boolean;
  requireForSensitiveActions: boolean;
  deviceRememberDuration: number; // in hours
  backupCodesCount: number;
}

export interface TwoFactorBackupCodes {
  total: number;
  used: number;
  remaining: number;
  lastGenerated: string;
  codes?: string[];
  usedCodes?: string[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  lastUsed: string;
  userAgent: string;
  ipAddress: string;
  isTrusted: boolean;
}

export interface TwoFactorAuditLog {
  id: string;
  adminId: string;
  action: 'setup' | 'disable' | 'verify_success' | 'verify_failure' | 'backup_code_used' | 'backup_codes_regenerated';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
}

// Response types for API calls
export interface TwoFactorSetupResponse {
  success: boolean;
  message: string;
  data?: TwoFactorSetup;
}

export interface TwoFactorVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    verified: boolean;
    deviceTrusted?: boolean;
    backupCodeUsed?: boolean;
    verificationToken?: string;
  };
}

export interface TwoFactorStatusResponse {
  success: boolean;
  message: string;
  data?: TwoFactorStatus;
}

// Constants for 2FA configuration
export const TWO_FACTOR_CONFIG = {
  ISSUER: 'Choma Admin',
  TOKEN_PERIOD: 30, // seconds
  TOKEN_DIGITS: 6,
  BACKUP_CODES_COUNT: 10,
  MAX_DEVICE_REMEMBER_HOURS: 168, // 7 days
  MAX_VERIFICATION_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

// Sensitive actions that may require 2FA
export const SENSITIVE_ACTIONS = {
  DELETE_ADMIN: 'delete_admin',
  CHANGE_ADMIN_ROLE: 'change_admin_role',
  BULK_ADMIN_OPERATIONS: 'bulk_admin_operations',
  VIEW_SECURITY_LOGS: 'view_security_logs',
  FORCE_LOGOUT_ADMIN: 'force_logout_admin',
  CHANGE_PERMISSIONS: 'change_permissions',
  EXPORT_DATA: 'export_data',
  DELETE_CRITICAL_DATA: 'delete_critical_data',
} as const;

export type SensitiveAction = typeof SENSITIVE_ACTIONS[keyof typeof SENSITIVE_ACTIONS];

// Utility types
export type TwoFactorAction = TwoFactorAuditLog['action'];
export type TwoFactorConfigKey = keyof typeof TWO_FACTOR_CONFIG;