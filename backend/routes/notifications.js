const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NotificationController = require('../controllers/notificationController');
const { notificationValidations } = require('../middleware/validation');

// GET /api/notifications - Get user notifications
router.get('/', auth, NotificationController.getUserNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', auth, NotificationController.getUnreadCount);

// GET /api/notifications/preferences - Get notification preferences
router.get('/preferences', auth, NotificationController.getPreferences);

// PUT /api/notifications/preferences - Update notification preferences
router.put('/preferences', auth, notificationValidations.preferences, NotificationController.updatePreferences);

// GET /api/notifications/:id - Get notification by ID
router.get('/:id', auth, NotificationController.getNotificationById);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', auth, NotificationController.markAsRead);

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', auth, NotificationController.markAllAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', auth, NotificationController.deleteNotification);

// DELETE /api/notifications/read/all - Delete all read notifications
router.delete('/read/all', auth, NotificationController.deleteAllRead);

module.exports = router;