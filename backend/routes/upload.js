const express = require('express');
const router = express.Router();
const { cloudinary, upload, uploadToFolder } = require('../config/cloudinary');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Upload logo endpoint (admin only)
router.post('/logo', adminAuth.authenticateAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      });
    }

    // The file is already uploaded to Cloudinary by multer
    const logoUrl = req.file.path;
    
    console.log('✅ Logo uploaded successfully to:', logoUrl);
    
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: logoUrl,
      publicId: req.file.filename
    });
    
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current logo URL
router.get('/logo', (req, res) => {
  const logoUrl = process.env.CHOMA_LOGO_URL || 'https://via.placeholder.com/200x100/F7AE1A/FFFFFF?text=CHOMA';
  
  res.json({
    success: true,
    logoUrl: logoUrl
  });
});

// Upload profile image endpoint (authenticated users)
router.post('/profile-image', auth, uploadToFolder('profiles').single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // The file is already uploaded to Cloudinary by multer
    const imageUrl = req.file.path;
    const publicId = req.file.filename;
    
    console.log('✅ Profile image uploaded successfully to:', imageUrl);
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl,
      publicId: publicId
    });
    
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;