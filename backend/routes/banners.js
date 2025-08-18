const express = require('express');
const router = express.Router();

// GET /api/banners/active - Get active banners
router.get('/active', async (req, res) => {
  try {
    // For now, return empty banners array
    // In a full implementation, you would fetch from a Banner model
    const banners = [];
    
    res.json({
      success: true,
      data: banners,
      count: banners.length
    });
  } catch (err) {
    console.error('Get active banners error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/banners - Get all banners (admin)
router.get('/', async (req, res) => {
  try {
    const banners = [];
    
    res.json({
      success: true,
      data: banners,
      count: banners.length
    });
  } catch (err) {
    console.error('Get banners error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;