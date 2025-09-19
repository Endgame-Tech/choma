const express = require('express');
const router = express.Router();
const { upload, uploadToFolder, deleteImage } = require('../config/cloudinary');

// General upload endpoint for flexibility (used by admin dashboard)
router.post('/upload', uploadToFolder('meal-plans').single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { folder, imageType, mealPlanId, day, mealType } = req.body;
    
    // Organize images into appropriate folders based on type
    let cloudinaryFolder = 'meal-plans/general';
    if (imageType === 'main-image') {
      cloudinaryFolder = 'meal-plans/main-images';
    } else if (imageType === 'meal-image') {
      cloudinaryFolder = 'meal-plans/meals';
    } else if (folder) {
      cloudinaryFolder = `meal-plans/${folder}`;
    }

    const response = {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: req.file.path,
        secure_url: req.file.path, // For compatibility with admin dashboard
        publicId: req.file.filename,
        originalName: req.file.originalname,
        folder: cloudinaryFolder,
        imageType: imageType || 'general'
      }
    };

    // Add additional metadata for meal images
    if (day && mealType) {
      response.data.day = day;
      response.data.mealType = mealType;
    }

    if (mealPlanId) {
      response.data.mealPlanId = mealPlanId;
    }

    console.log(`✅ Image uploaded to Cloudinary: ${req.file.path}`);
    res.json(response);
  } catch (error) {
    console.error('General upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload meal plan main image
router.post('/meal-plans/main-image', uploadToFolder('meal-plans/main-images').single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload meal image (for individual meals in weekly schedule)
router.post('/meal-plans/meal-image', uploadToFolder('meal-plans/meals').single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { day, mealType } = req.body;

    res.json({
      success: true,
      message: 'Meal image uploaded successfully',
      data: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        day: day,
        mealType: mealType
      }
    });
  } catch (error) {
    console.error('Meal image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload meal image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete image from Cloudinary
router.delete('/images/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Decode the public ID (replace underscores with slashes for folder structure)
    const decodedPublicId = publicId.replace(/_/g, '/');
    
    const result = await deleteImage(decodedPublicId);
    
    if (result.result === 'ok' || result.result === 'not found') {
      res.json({
        success: true,
        message: 'Image deleted successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
        error: result
      });
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload multiple images (for gallery)
router.post('/meal-plans/gallery', uploadToFolder('meal-plans/gallery').array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname
    }));

    res.json({
      success: true,
      message: `${req.files.length} image(s) uploaded successfully`,
      data: uploadedImages
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload gallery images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
