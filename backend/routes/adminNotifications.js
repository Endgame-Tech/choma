const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const AdminNotificationController = require('../controllers/adminNotificationController');

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// ============= ADMIN NOTIFICATION ROUTES =============

// GET /api/admin/notifications - Get admin notifications with filtering
router.get('/', AdminNotificationController.getNotifications);

// GET /api/admin/notifications/unread-count - Get unread notification count
router.get('/unread-count', AdminNotificationController.getUnreadCount);

// GET /api/admin/notifications/stats - Get notification statistics
router.get('/stats', AdminNotificationController.getStats);

// GET /api/admin/notifications/:id - Get specific notification
router.get('/:id', AdminNotificationController.getNotification);

// PUT /api/admin/notifications/:id/read - Mark notification as read
router.put('/:id/read', AdminNotificationController.markAsRead);

// PUT /api/admin/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', AdminNotificationController.markAllAsRead);

// DELETE /api/admin/notifications/:id - Delete notification
router.delete('/:id', AdminNotificationController.deleteNotification);

// DELETE /api/admin/notifications/bulk - Bulk delete notifications
router.delete('/bulk', AdminNotificationController.bulkDeleteNotifications);

// ============= NOTIFICATION PREFERENCES ROUTES =============

// GET /api/admin/notifications/preferences - Get notification preferences
router.get('/preferences/settings', AdminNotificationController.getPreferences);

// PUT /api/admin/notifications/preferences - Update notification preferences
router.put('/preferences/settings', AdminNotificationController.updatePreferences);

// ============= NOTIFICATION MANAGEMENT ROUTES =============

// POST /api/admin/notifications/send - Send notification to specific admin(s)
router.post('/send', AdminNotificationController.sendNotification);

// POST /api/admin/notifications/broadcast - Broadcast notification to all admins
router.post('/broadcast', AdminNotificationController.broadcastNotification);

// ============= SECURITY NOTIFICATION ROUTES =============

// GET /api/admin/notifications/security/alerts - Get security alerts
router.get('/security/alerts', AdminNotificationController.getSecurityAlerts);

// POST /api/admin/notifications/security/alert - Create security alert
router.post('/security/alert', AdminNotificationController.createSecurityAlert);

// PUT /api/admin/notifications/security/:id/resolve - Resolve security alert
router.put('/security/:id/resolve', AdminNotificationController.resolveSecurityAlert);

module.exports = router;