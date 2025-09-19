const { cloudinary } = require('../config/cloudinary');

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64String - Base64 encoded image data
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Optional public ID for the image
 * @returns {Promise<Object>} - Upload result with URL and public ID
 */
const uploadBase64ToCloudinary = async (base64String, folder = 'choma', publicId = null) => {
  try {
    // Validate base64 string
    if (!base64String || !base64String.startsWith('data:image/')) {
      throw new Error('Invalid base64 image string');
    }

    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);
    
    console.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Error uploading base64 image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload meal plan main image to Cloudinary
 * @param {string} base64String - Base64 encoded image data
 * @param {string} planId - Meal plan ID for naming
 * @returns {Promise<Object>} - Upload result
 */
const uploadMealPlanMainImage = async (base64String, planId) => {
  if (!base64String) return null;
  
  const folder = 'choma/meal-plans/main-images';
  const publicId = `meal-plan-${planId}-main`;
  
  return await uploadBase64ToCloudinary(base64String, folder, publicId);
};

/**
 * Upload individual meal images to Cloudinary
 * @param {Object} mealImages - Object containing meal images with keys like 'week1_Monday_Breakfast'
 * @param {string} planId - Meal plan ID for naming
 * @returns {Promise<Object>} - Object with uploaded image URLs
 */
const uploadMealImages = async (mealImages, planId) => {
  if (!mealImages || Object.keys(mealImages).length === 0) {
    return {};
  }

  const uploadedImages = {};
  const folder = 'choma/meal-plans/meals';

  for (const [mealKey, base64String] of Object.entries(mealImages)) {
    if (base64String && base64String.startsWith('data:image/')) {
      try {
        const publicId = `meal-plan-${planId}-${mealKey}`;
        const result = await uploadBase64ToCloudinary(base64String, folder, publicId);
        uploadedImages[mealKey] = result.url;
      } catch (error) {
        console.error(`Failed to upload meal image ${mealKey}:`, error);
        // Continue with other images even if one fails
        uploadedImages[mealKey] = base64String; // Keep original as fallback
      }
    }
  }

  return uploadedImages;
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  // Extract public ID from URL
  // Example: https://res.cloudinary.com/cloud/image/upload/v1234567890/folder/image.jpg
  const parts = url.split('/');
  const uploadIndex = parts.findIndex(part => part === 'upload');
  
  if (uploadIndex === -1) return null;
  
  // Get everything after the version number
  const afterVersion = parts.slice(uploadIndex + 2).join('/');
  
  // Remove file extension
  return afterVersion.replace(/\.[^/.]+$/, '');
};

/**
 * Batch upload multiple images with error handling
 * @param {Array} imageData - Array of {base64, folder, publicId} objects
 * @returns {Promise<Array>} - Array of upload results
 */
const batchUploadImages = async (imageData) => {
  const results = [];
  
  for (const { base64, folder, publicId } of imageData) {
    try {
      const result = await uploadBase64ToCloudinary(base64, folder, publicId);
      results.push({ success: true, data: result });
    } catch (error) {
      results.push({ success: false, error: error.message, publicId });
    }
  }
  
  return results;
};

module.exports = {
  uploadBase64ToCloudinary,
  uploadMealPlanMainImage,
  uploadMealImages,
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
  batchUploadImages
};