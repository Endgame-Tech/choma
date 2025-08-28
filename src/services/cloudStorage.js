// src/services/cloudStorage.js - Cloud Storage Service
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../utils/constants';

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
      
      // Get the API base URL from constants - now points to production server
      const API_BASE_URL = APP_CONFIG.API_BASE_URL.replace('/api', ''); // Remove /api suffix
      
      // Get auth token for authenticated request
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/upload/profile-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }
      
      return data.imageUrl;
      
    } catch (error) {
      console.error('Error uploading to backend:', error);
      throw error;
    }
  }
}

export default new CloudStorageService();