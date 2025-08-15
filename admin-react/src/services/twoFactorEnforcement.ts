import { twoFactorApi } from './twoFactorApi';

// Define sensitive operations that require 2FA
export enum SensitiveOperation {
  ADMIN_DELETE = 'admin_delete',
  ADMIN_ROLE_CHANGE = 'admin_role_change',
  BULK_ADMIN_DELETE = 'bulk_admin_delete',
  BULK_ADMIN_ROLE_CHANGE = 'bulk_admin_role_change',
  CUSTOM_ROLE_CREATE = 'custom_role_create',
  ADMIN_DEACTIVATE = 'admin_deactivate',
  SYSTEM_SETTINGS_CHANGE = 'system_settings_change'
}

// Risk levels for operations
export enum RiskLevel {
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Operation metadata for 2FA enforcement
interface OperationMetadata {
  riskLevel: RiskLevel;
  description: string;
  requiresRecentAuth?: boolean; // Requires authentication within the last 5 minutes
}

// Configuration for sensitive operations
const SENSITIVE_OPERATIONS: Record<SensitiveOperation, OperationMetadata> = {
  [SensitiveOperation.ADMIN_DELETE]: {
    riskLevel: RiskLevel.CRITICAL,
    description: 'Permanently delete admin account',
    requiresRecentAuth: true
  },
  [SensitiveOperation.ADMIN_ROLE_CHANGE]: {
    riskLevel: RiskLevel.HIGH,
    description: 'Change admin permissions and role',
    requiresRecentAuth: true
  },
  [SensitiveOperation.BULK_ADMIN_DELETE]: {
    riskLevel: RiskLevel.CRITICAL,
    description: 'Bulk delete multiple admin accounts',
    requiresRecentAuth: true
  },
  [SensitiveOperation.BULK_ADMIN_ROLE_CHANGE]: {
    riskLevel: RiskLevel.CRITICAL,
    description: 'Bulk change admin roles and permissions',
    requiresRecentAuth: true
  },
  [SensitiveOperation.CUSTOM_ROLE_CREATE]: {
    riskLevel: RiskLevel.HIGH,
    description: 'Create new custom admin role',
    requiresRecentAuth: false
  },
  [SensitiveOperation.ADMIN_DEACTIVATE]: {
    riskLevel: RiskLevel.HIGH,
    description: 'Deactivate admin account',
    requiresRecentAuth: false
  },
  [SensitiveOperation.SYSTEM_SETTINGS_CHANGE]: {
    riskLevel: RiskLevel.CRITICAL,
    description: 'Modify system security settings',
    requiresRecentAuth: true
  }
};

// Store for recent 2FA verifications (in memory, expires on page refresh)
const recentVerifications = new Map<string, number>();

// Duration for which a 2FA verification is valid (5 minutes)
const VERIFICATION_VALIDITY_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export class TwoFactorEnforcementService {
  
  /**
   * Check if an operation requires 2FA verification
   */
  static async requiresTwoFactorAuth(operation: SensitiveOperation): Promise<boolean> {
    try {
      // Get current 2FA status
      const twoFactorStatus = await twoFactorApi.getTwoFactorStatus();
      
      // If 2FA is not enabled, don't require it
      if (!twoFactorStatus.isEnabled) {
        return false;
      }

      // Get 2FA settings to check enforcement
      const settings = await twoFactorApi.getSettings();
      
      // Check if 2FA is required for sensitive actions
      return settings.requireForSensitiveActions;
    } catch (error) {
      console.error('Error checking 2FA requirements:', error);
      // Fail safe - require 2FA if we can't determine status
      return true;
    }
  }

  /**
   * Check if user has recently verified 2FA for this operation type
   */
  static hasRecentVerification(operation: SensitiveOperation): boolean {
    const operationConfig = SENSITIVE_OPERATIONS[operation];
    if (!operationConfig.requiresRecentAuth) {
      return false;
    }

    const lastVerification = recentVerifications.get(operation);
    if (!lastVerification) {
      return false;
    }

    const timeSinceVerification = Date.now() - lastVerification;
    return timeSinceVerification < VERIFICATION_VALIDITY_DURATION;
  }

  /**
   * Mark that 2FA was recently verified for this operation
   */
  static markVerificationComplete(operation: SensitiveOperation): void {
    recentVerifications.set(operation, Date.now());
  }

  /**
   * Get operation metadata for display in 2FA modal
   */
  static getOperationMetadata(operation: SensitiveOperation): OperationMetadata {
    return SENSITIVE_OPERATIONS[operation];
  }

  /**
   * Determine if 2FA verification should be bypassed for this operation
   * This checks recent verification status and operation requirements
   */
  static async shouldEnforce2FA(operation: SensitiveOperation): Promise<{
    required: boolean;
    reason?: string;
    metadata: OperationMetadata;
  }> {
    const metadata = this.getOperationMetadata(operation);
    
    // Check if 2FA is globally required for sensitive operations
    const requires2FA = await this.requiresTwoFactorAuth(operation);
    if (!requires2FA) {
      return {
        required: false,
        reason: '2FA not enabled or not required for sensitive operations',
        metadata
      };
    }

    // Check if user has recent verification for operations that support it
    if (metadata.requiresRecentAuth && this.hasRecentVerification(operation)) {
      return {
        required: false,
        reason: 'Recent 2FA verification still valid',
        metadata
      };
    }

    return {
      required: true,
      metadata
    };
  }

  /**
   * Clear all recent verifications (useful on logout)
   */
  static clearVerifications(): void {
    recentVerifications.clear();
  }

  /**
   * Get time remaining for a recent verification
   */
  static getVerificationTimeRemaining(operation: SensitiveOperation): number {
    const lastVerification = recentVerifications.get(operation);
    if (!lastVerification) {
      return 0;
    }

    const elapsed = Date.now() - lastVerification;
    const remaining = VERIFICATION_VALIDITY_DURATION - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Format remaining time as human readable string
   */
  static formatTimeRemaining(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

export default TwoFactorEnforcementService;