const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const TwoFactorController = require('../controllers/twoFactorController');

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// ============= 2FA SETUP ROUTES =============

// GET /api/admin/2fa/status - Get 2FA status for current admin
router.get('/status', TwoFactorController.getStatus);

// POST /api/admin/2fa/setup - Initialize 2FA setup (generate secret & QR code)
router.post('/setup', TwoFactorController.initializeSetup);

// POST /api/admin/2fa/verify-setup - Verify setup and enable 2FA
router.post('/verify-setup', TwoFactorController.verifySetup);

// POST /api/admin/2fa/disable - Disable 2FA
router.post('/disable', TwoFactorController.disable);

// ============= 2FA VERIFICATION ROUTES =============

// POST /api/admin/2fa/verify - Verify 2FA code
router.post('/verify', TwoFactorController.verify);

// POST /api/admin/2fa/verify-backup - Verify backup code
router.post('/verify-backup', TwoFactorController.verifyBackupCode);

// ============= BACKUP CODES ROUTES =============

// GET /api/admin/2fa/backup-codes - Get remaining backup codes count
router.get('/backup-codes', TwoFactorController.getBackupCodesInfo);

// POST /api/admin/2fa/backup-codes/regenerate - Regenerate backup codes
router.post('/backup-codes/regenerate', TwoFactorController.regenerateBackupCodes);

// ============= TRUSTED DEVICES ROUTES =============

// GET /api/admin/2fa/devices - Get trusted devices
router.get('/devices', TwoFactorController.getTrustedDevices);

// POST /api/admin/2fa/devices/trust - Add current device as trusted
router.post('/devices/trust', TwoFactorController.trustDevice);

// DELETE /api/admin/2fa/devices/:deviceId - Remove trusted device
router.delete('/devices/:deviceId', TwoFactorController.removeTrustedDevice);

// ============= 2FA SETTINGS ROUTES =============

// GET /api/admin/2fa/settings - Get 2FA settings
router.get('/settings', TwoFactorController.getSettings);

// PUT /api/admin/2fa/settings - Update 2FA settings
router.put('/settings', TwoFactorController.updateSettings);

// ============= 2FA AUDIT ROUTES =============

// GET /api/admin/2fa/audit - Get 2FA audit logs
router.get('/audit', TwoFactorController.getAuditLogs);

// GET /api/admin/2fa/audit/summary - Get 2FA activity summary
router.get('/audit/summary', TwoFactorController.getAuditSummary);

// GET /api/admin/2fa/audit/suspicious - Get suspicious 2FA activity
router.get('/audit/suspicious', TwoFactorController.getSuspiciousActivity);

// ============= EMERGENCY ROUTES =============

// POST /api/admin/2fa/emergency-disable - Emergency disable 2FA (requires special verification)
router.post('/emergency-disable', TwoFactorController.emergencyDisable);

// POST /api/admin/2fa/recovery - Request 2FA recovery
router.post('/recovery', TwoFactorController.requestRecovery);

module.exports = router;