const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateAdmin } = require('../middleware/adminAuth');

// Admin authentication routes (public)
router.post('/login', adminAuthController.adminLoginLimiter, adminAuthController.adminLogin);
router.post('/refresh-token', adminAuthController.refreshToken);

// Protected admin routes
router.post('/logout', authenticateAdmin, adminAuthController.adminLogout);
router.get('/profile', authenticateAdmin, adminAuthController.getAdminProfile);
router.put('/profile', authenticateAdmin, adminAuthController.updateAdminProfile);
router.post('/change-password', authenticateAdmin, adminAuthController.changeAdminPassword);

module.exports = router;