// src/services/cloudStorage.js - Cloud Storage Service
import { Alert } from 'react-native';

class CloudStorageService {
  constructor() {
    this.baseUrl = 'https://api.cloudinary.com/v1_1/your-cloud-name/image/upload';
    this.uploadPreset = 'choma_profiles'; // Configure this in your Cloudinary settings
  }

  /**
   * Upload image to cloud storage
   * @param {string} imageUri - Local image URI
   * @param {string} userId - User ID for filename
   * @returns {Promise<string>} - Cloud image URL
   */
  async uploadImage(imageUri, userId) {
    try {
      const formData = new FormData();
      
      // Create a unique filename
      const filename = `profile_${userId}_${Date.now()}.jpg`;
      
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      });
      
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', 'choma/profiles');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.secure_url;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Delete image from cloud storage
   * @param {string} imageUrl - Cloud image URL
   * @returns {Promise<boolean>} - Success status
   */
  async deleteImage(imageUrl) {
    try {
      // Extract public ID from URL for deletion
      const publicId = this.extractPublicId(imageUrl);
      
      const response = await fetch(`${this.baseUrl}/destroy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          upload_preset: this.uploadPreset,
        }),
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string} - Public ID
   */
  extractPublicId(url) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }

  /**
   * Compress and resize image for upload
   * @param {string} imageUri - Local image URI
   * @returns {Promise<string>} - Compressed image URI
   */
  async compressImage(imageUri) {
    try {
      // For now, return original URI
      // In production, you might want to use expo-image-manipulator
      return imageUri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageUri;
    }
  }

  /**
   * Alternative: Simple backend upload
   * Upload to your own backend server
   */
  async uploadToBackend(imageUri, userId) {
    try {
      const formData = new FormData();
      
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${userId}_${Date.now()}.jpg`,
      });
      
      formData.append('userId', userId);
      
      const response = await fetch('http://192.168.0.118:5001/api/upload/profile-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.imageUrl;
      
    } catch (error) {
      console.error('Error uploading to backend:', error);
      throw error;
    }
  }

  /**
   * Mock upload function for development
   * Returns a mock URL after a delay
   */
  async mockUpload(imageUri, userId) {
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return mock URL (in production, this would be a real cloud URL)
      return `https://mock-storage.com/profiles/${userId}_${Date.now()}.jpg`;
      
    } catch (error) {
      console.error('Mock upload error:', error);
      throw error;
    }
  }
}

export default new CloudStorageService();

// Usage example:
/*
import CloudStorageService from './cloudStorage';

// Upload image
const uploadImage = async (imageUri, userId) => {
  try {
    const cloudUrl = await CloudStorageService.uploadImage(imageUri, userId);
    console.log('Image uploaded:', cloudUrl);
    return cloudUrl;
  } catch (error) {
    Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    throw error;
  }
};

// For development, use mock upload
const mockUpload = async (imageUri, userId) => {
  try {
    const cloudUrl = await CloudStorageService.mockUpload(imageUri, userId);
    console.log('Mock upload successful:', cloudUrl);
    return cloudUrl;
  } catch (error) {
    Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    throw error;
  }
};
*/