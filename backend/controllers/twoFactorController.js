const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const TwoFactorAuditLog = require('../models/TwoFactorAuditLog');
const Admin = require('../models/Admin');
const AdminNotificationService = require('../services/adminNotificationService');

class TwoFactorController {

  // Get 2FA status for current admin
  static async getStatus(req, res) {
    try {
      const adminId = req.admin.id;
      
      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      
      if (!twoFactor) {
        return res.json({
          success: true,
          data: {
            enabled: false,
            setupDate: null,
            lastVerified: null,
            backupCodesRemaining: 0,
            trustedDevicesCount: 0,
            isLocked: false
          }
        });
      }

      res.json({
        success: true,
        data: {
          enabled: twoFactor.isEnabled,
          setupDate: twoFactor.setupDate,
          lastVerified: twoFactor.lastVerified,
          backupCodesRemaining: twoFactor.backupCodesRemaining,
          trustedDevicesCount: twoFactor.trustedDevices.length,
          isLocked: twoFactor.isLocked(),
          settings: twoFactor.settings
        }
      });
    } catch (error) {
      console.error('Get 2FA status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get 2FA status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Initialize 2FA setup
  static async initializeSetup(req, res) {
    try {
      const adminId = req.admin.id;
      const admin = await Admin.findById(adminId);
      
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Check if 2FA is already enabled
      const existingTwoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (existingTwoFactor && existingTwoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled for this account'
        });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Choma Admin (${admin.email})`,
        issuer: 'Choma'
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Create or update 2FA record (but don't enable yet)
      let twoFactor = existingTwoFactor;
      if (!twoFactor) {
        twoFactor = new TwoFactorAuth({
          adminId,
          secret: secret.base32,
          isEnabled: false
        });
      } else {
        twoFactor.secret = secret.base32;
      }

      await twoFactor.save();

      // Log setup initiation
      await TwoFactorAuditLog.create({
        adminId,
        action: 'setup',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { step: 'initiated' }
      });

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32,
          issuer: 'Choma',
          accountName: `Choma Admin (${admin.email})`
        }
      });
    } catch (error) {
      console.error('Initialize 2FA setup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize 2FA setup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Verify setup and enable 2FA
  static async verifySetup(req, res) {
    try {
      const adminId = req.admin.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor) {
        return res.status(404).json({
          success: false,
          message: '2FA setup not found. Please start setup again.'
        });
      }

      if (twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled'
        });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: token.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        // Log failed verification
        await TwoFactorAuditLog.create({
          adminId,
          action: 'verify_failure',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid setup verification token',
          details: { step: 'setup_verification' }
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Enable 2FA and generate backup codes
      twoFactor.enable();
      const backupCodes = twoFactor.generateBackupCodes();
      await twoFactor.save();

      // Log successful setup
      await TwoFactorAuditLog.create({
        adminId,
        action: 'setup',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { 
          step: 'completed',
          backupCodesGenerated: backupCodes.length
        }
      });

      // Send notification
      await AdminNotificationService.send2FAEventNotification({
        adminId,
        action: 'setup',
        success: true,
        riskLevel: 'low',
        details: { backupCodesGenerated: backupCodes.length }
      });

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          enabled: true,
          backupCodes,
          setupDate: twoFactor.setupDate
        }
      });
    } catch (error) {
      console.error('Verify 2FA setup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA setup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Disable 2FA
  static async disable(req, res) {
    try {
      const adminId = req.admin.id;
      const { password, currentToken } = req.body;

      if (!password || !currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Password and current 2FA token are required'
        });
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        await TwoFactorAuditLog.create({
          adminId,
          action: 'disable',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid password for 2FA disable'
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify current 2FA token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: currentToken.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        await TwoFactorAuditLog.create({
          adminId,
          action: 'disable',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid 2FA token for disable'
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Disable 2FA
      twoFactor.disable();
      await twoFactor.save();

      // Log successful disable
      await TwoFactorAuditLog.create({
        adminId,
        action: 'disable',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: 'user_requested' }
      });

      // Send notification
      await AdminNotificationService.send2FAEventNotification({
        adminId,
        action: 'disable',
        success: true,
        riskLevel: 'medium',
        details: { reason: 'user_requested' }
      });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Verify 2FA code
  static async verify(req, res) {
    try {
      const adminId = req.admin.id;
      const { token, trustDevice = false } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Check if account is locked
      if (twoFactor.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked due to failed attempts',
          lockedUntil: twoFactor.security.lockedUntil
        });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: token.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        twoFactor.recordFailedAttempt();
        await twoFactor.save();

        await TwoFactorAuditLog.create({
          adminId,
          action: 'verify_failure',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid TOTP token',
          verificationMethod: 'totp'
        });

        // Send notification for failed attempts
        await AdminNotificationService.send2FAEventNotification({
          adminId,
          action: 'verify_failure',
          success: false,
          riskLevel: twoFactor.security.currentFailedAttempts >= 3 ? 'high' : 'medium',
          details: { 
            failureReason: 'Invalid TOTP token',
            attemptsRemaining: twoFactor.security.maxVerificationAttempts - twoFactor.security.currentFailedAttempts
          }
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: twoFactor.security.maxVerificationAttempts - twoFactor.security.currentFailedAttempts
        });
      }

      // Successful verification
      twoFactor.resetFailedAttempts();
      twoFactor.lastVerified = new Date();

      let deviceId = null;
      if (trustDevice) {
        deviceId = twoFactor.addTrustedDevice({
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      await twoFactor.save();

      // Log successful verification
      await TwoFactorAuditLog.create({
        adminId,
        action: 'verify_success',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        verificationMethod: 'totp',
        details: { 
          deviceTrusted: trustDevice,
          deviceId
        }
      });

      res.json({
        success: true,
        message: 'Verification successful',
        data: {
          verified: true,
          deviceTrusted: trustDevice,
          deviceId
        }
      });
    } catch (error) {
      console.error('Verify 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Verify backup code
  static async verifyBackupCode(req, res) {
    try {
      const adminId = req.admin.id;
      const { backupCode, trustDevice = false } = req.body;

      if (!backupCode) {
        return res.status(400).json({
          success: false,
          message: 'Backup code is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Check if account is locked
      if (twoFactor.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked due to failed attempts',
          lockedUntil: twoFactor.security.lockedUntil
        });
      }

      // Use backup code
      const used = twoFactor.useBackupCode(backupCode);
      if (!used) {
        twoFactor.recordFailedAttempt();
        await twoFactor.save();

        await TwoFactorAuditLog.create({
          adminId,
          action: 'verify_failure',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid backup code',
          verificationMethod: 'backup_code'
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid or already used backup code'
        });
      }

      // Successful verification
      twoFactor.resetFailedAttempts();
      twoFactor.lastVerified = new Date();

      let deviceId = null;
      if (trustDevice) {
        deviceId = twoFactor.addTrustedDevice({
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      await twoFactor.save();

      // Log successful backup code use
      await TwoFactorAuditLog.create({
        adminId,
        action: 'backup_code_used',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        verificationMethod: 'backup_code',
        backupCodeUsed: backupCode,
        details: { 
          codesRemaining: twoFactor.backupCodesRemaining,
          deviceTrusted: trustDevice,
          deviceId
        }
      });

      res.json({
        success: true,
        message: 'Backup code verification successful',
        data: {
          verified: true,
          backupCodesRemaining: twoFactor.backupCodesRemaining,
          deviceTrusted: trustDevice,
          deviceId
        }
      });
    } catch (error) {
      console.error('Verify backup code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify backup code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get backup codes info
  static async getBackupCodesInfo(req, res) {
    try {
      const adminId = req.admin.id;
      
      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      res.json({
        success: true,
        data: {
          total: twoFactor.backupCodes.length,
          remaining: twoFactor.backupCodesRemaining,
          used: twoFactor.backupCodes.filter(code => code.used).length,
          lastGenerated: twoFactor.backupCodesGenerated
        }
      });
    } catch (error) {
      console.error('Get backup codes info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get backup codes info',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Regenerate backup codes
  static async regenerateBackupCodes(req, res) {
    try {
      const adminId = req.admin.id;
      const { currentToken } = req.body;

      if (!currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Current 2FA token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify current token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: currentToken.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        await TwoFactorAuditLog.create({
          adminId,
          action: 'backup_codes_regenerated',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid 2FA token for backup codes regeneration'
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Generate new backup codes
      const backupCodes = twoFactor.generateBackupCodes();
      await twoFactor.save();

      // Log backup codes regeneration
      await TwoFactorAuditLog.create({
        adminId,
        action: 'backup_codes_regenerated',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { 
          newCodesCount: backupCodes.length,
          reason: 'user_requested'
        }
      });

      res.json({
        success: true,
        message: 'Backup codes regenerated successfully',
        data: {
          backupCodes,
          total: backupCodes.length
        }
      });
    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate backup codes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get trusted devices
  static async getTrustedDevices(req, res) {
    try {
      const adminId = req.admin.id;
      
      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor) {
        return res.json({
          success: true,
          data: { devices: [] }
        });
      }

      // Filter out expired devices
      const activeDevices = twoFactor.trustedDevices.filter(device => 
        device.isTrusted && device.expiresAt > new Date()
      );

      res.json({
        success: true,
        data: {
          devices: activeDevices.map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            lastUsed: device.lastUsed,
            ipAddress: device.ipAddress,
            userAgent: device.userAgent,
            expiresAt: device.expiresAt
          }))
        }
      });
    } catch (error) {
      console.error('Get trusted devices error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trusted devices',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Trust current device
  static async trustDevice(req, res) {
    try {
      const adminId = req.admin.id;
      const { deviceName, currentToken } = req.body;

      if (!currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Current 2FA token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify current token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: currentToken.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Add trusted device
      const deviceId = twoFactor.addTrustedDevice({
        name: deviceName || `Device-${Date.now()}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await twoFactor.save();

      // Log device trust
      await TwoFactorAuditLog.create({
        adminId,
        action: 'device_trusted',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: {
          deviceId,
          deviceName: deviceName || `Device-${Date.now()}`,
          trusted: true
        }
      });

      res.json({
        success: true,
        message: 'Device trusted successfully',
        data: { deviceId }
      });
    } catch (error) {
      console.error('Trust device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trust device',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove trusted device
  static async removeTrustedDevice(req, res) {
    try {
      const adminId = req.admin.id;
      const { deviceId } = req.params;
      const { currentToken } = req.body;

      if (!currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Current 2FA token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify current token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: currentToken.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Remove trusted device
      const removed = twoFactor.removeTrustedDevice(deviceId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Trusted device not found'
        });
      }

      await twoFactor.save();

      // Log device removal
      await TwoFactorAuditLog.create({
        adminId,
        action: 'device_removed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: {
          deviceId,
          trusted: false
        }
      });

      res.json({
        success: true,
        message: 'Trusted device removed successfully'
      });
    } catch (error) {
      console.error('Remove trusted device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove trusted device',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get 2FA settings
  static async getSettings(req, res) {
    try {
      const adminId = req.admin.id;
      
      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.json({
          success: true,
          data: {
            requireForLogin: true,
            requireForSensitiveActions: true,
            deviceRememberDuration: 168
          }
        });
      }

      res.json({
        success: true,
        data: twoFactor.settings
      });
    } catch (error) {
      console.error('Get 2FA settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get 2FA settings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update 2FA settings
  static async updateSettings(req, res) {
    try {
      const adminId = req.admin.id;
      const { currentToken, settings } = req.body;

      if (!currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Current 2FA token is required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Verify current token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: currentToken.replace(/\s/g, ''),
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Update settings
      const oldSettings = { ...twoFactor.settings };
      twoFactor.settings = { ...twoFactor.settings, ...settings };
      await twoFactor.save();

      // Log settings change
      await TwoFactorAuditLog.create({
        adminId,
        action: 'settings_changed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        settingsChanged: {
          field: 'multiple',
          oldValue: oldSettings,
          newValue: twoFactor.settings
        }
      });

      res.json({
        success: true,
        message: '2FA settings updated successfully',
        data: twoFactor.settings
      });
    } catch (error) {
      console.error('Update 2FA settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update 2FA settings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get audit logs
  static async getAuditLogs(req, res) {
    try {
      const adminId = req.admin.id;
      const { page = 1, limit = 50, action, dateRange } = req.query;

      const query = { adminId };
      if (action) query.action = action;
      if (dateRange) {
        try {
          const range = JSON.parse(dateRange);
          query.createdAt = {};
          if (range.start) query.createdAt.$gte = new Date(range.start);
          if (range.end) query.createdAt.$lte = new Date(range.end);
        } catch (err) {
          // Ignore invalid dateRange
        }
      }

      const logs = await TwoFactorAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await TwoFactorAuditLog.countDocuments(query);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalLogs: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get audit summary
  static async getAuditSummary(req, res) {
    try {
      const adminId = req.admin.id;
      const { days = 30 } = req.query;

      const summary = await TwoFactorAuditLog.getAdminSummary(adminId, parseInt(days));

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get audit summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get suspicious activity
  static async getSuspiciousActivity(req, res) {
    try {
      const adminId = req.admin.id;
      const { hours = 24 } = req.query;

      const activity = await TwoFactorAuditLog.getSuspiciousActivity(adminId, parseInt(hours));

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('Get suspicious activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suspicious activity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Emergency disable 2FA
  static async emergencyDisable(req, res) {
    try {
      const adminId = req.admin.id;
      const { reason, adminPassword } = req.body;

      if (!reason || !adminPassword) {
        return res.status(400).json({
          success: false,
          message: 'Reason and admin password are required'
        });
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Verify admin password
      const isPasswordValid = await admin.comparePassword(adminPassword);
      if (!isPasswordValid) {
        await TwoFactorAuditLog.create({
          adminId,
          action: 'emergency_disable',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          failureReason: 'Invalid admin password',
          riskLevel: 'critical'
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid admin password'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Emergency disable
      twoFactor.disable();
      await twoFactor.save();

      // Log emergency disable
      await TwoFactorAuditLog.create({
        adminId,
        action: 'emergency_disable',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskLevel: 'critical',
        details: { 
          reason,
          emergency: true
        }
      });

      // Send critical notification
      await AdminNotificationService.send2FAEventNotification({
        adminId,
        action: 'emergency_disable',
        success: true,
        riskLevel: 'critical',
        details: { reason, emergency: true }
      });

      res.json({
        success: true,
        message: '2FA emergency disable successful'
      });
    } catch (error) {
      console.error('Emergency disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to emergency disable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Request 2FA recovery
  static async requestRecovery(req, res) {
    try {
      const adminId = req.admin.id;
      const { contactInfo, reason } = req.body;

      if (!contactInfo || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Contact information and reason are required'
        });
      }

      const twoFactor = await TwoFactorAuth.findByAdminId(adminId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      // Update recovery info
      twoFactor.recoveryInfo.emergencyContact = contactInfo;
      twoFactor.recoveryInfo.lastRecoveryAttempt = new Date();
      twoFactor.recoveryInfo.recoveryAttempts += 1;
      await twoFactor.save();

      // Log recovery attempt
      await TwoFactorAuditLog.create({
        adminId,
        action: 'recovery_attempt',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskLevel: 'high',
        details: { 
          reason,
          contactInfo,
          attemptNumber: twoFactor.recoveryInfo.recoveryAttempts
        }
      });

      res.json({
        success: true,
        message: 'Recovery request submitted successfully',
        data: {
          requestId: `2FA-REC-${Date.now()}`,
          contactInfo,
          nextSteps: 'Your recovery request has been submitted. Please contact system administrator.'
        }
      });
    } catch (error) {
      console.error('Request 2FA recovery error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request 2FA recovery',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = TwoFactorController;