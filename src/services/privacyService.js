import apiService from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PrivacyService {
  static PRIVACY_KEYS = {
    DATA_COLLECTION: 'privacy_dataCollection',
    ANALYTICS: 'privacy_analytics',
    MARKETING: 'privacy_marketing',
    LOCATION: 'privacy_location',
  };

  // Update privacy settings on backend
  static async updatePrivacySettings(settings) {
    try {
      // Store locally first for immediate response
      await AsyncStorage.setItem('privacy_settings', JSON.stringify(settings));
      
      // Try to update backend (optional - fails gracefully if endpoint doesn't exist)
      try {
        const response = await apiService.updatePrivacySettings(settings);
        
        if (response.success) {
          console.log('✅ Privacy settings updated on backend');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend privacy settings update failed (endpoint may not exist):', backendError.message);
        // Continue without backend - local storage is sufficient for now
      }
      
      console.log('✅ Privacy settings updated locally');
      return { success: true, data: settings };
    } catch (error) {
      console.error('❌ Error updating privacy settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Get privacy settings from backend
  static async getPrivacySettings() {
    try {
      const response = await apiService.getPrivacySettings();
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        // Fallback to local storage
        const cached = await AsyncStorage.getItem('privacy_settings');
        if (cached) {
          return { success: true, data: JSON.parse(cached) };
        }
        throw new Error(response.message || 'Failed to get privacy settings');
      }
    } catch (error) {
      console.warn('⚠️ Could not load privacy settings from backend, using local cache');
      // Fallback to local storage
      try {
        const cached = await AsyncStorage.getItem('privacy_settings');
        if (cached) {
          return { success: true, data: JSON.parse(cached) };
        }
      } catch (cacheError) {
        console.error('❌ Error getting cached privacy settings:', cacheError);
      }
      
      return { success: false, error: error.message };
    }
  }

  // Request data export
  static async requestDataExport(email) {
    try {
      const response = await apiService.post('/user/data-export', { email });
      
      if (response.success) {
        console.log('✅ Data export requested');
        return { success: true, message: 'Data export request submitted' };
      } else {
        throw new Error(response.message || 'Failed to request data export');
      }
    } catch (error) {
      console.error('❌ Error requesting data export:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete all user data
  static async requestDataDeletion(reason) {
    try {
      const response = await apiService.post('/user/data-deletion', { reason });
      
      if (response.success) {
        console.log('✅ Data deletion requested');
        return { success: true, message: 'Data deletion request submitted' };
      } else {
        throw new Error(response.message || 'Failed to request data deletion');
      }
    } catch (error) {
      console.error('❌ Error requesting data deletion:', error);
      return { success: false, error: error.message };
    }
  }

  // Log privacy action
  static async logPrivacyAction(action, details) {
    try {
      await apiService.post('/user/privacy-log', {
        action,
        details,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Privacy action logged:', action);
    } catch (error) {
      console.error('❌ Error logging privacy action:', error);
    }
  }

  // Check if data collection is enabled
  static async isDataCollectionEnabled() {
    try {
      const settings = await this.getPrivacySettings();
      return settings.success ? settings.data?.allowDataCollection || false : false;
    } catch (error) {
      console.error('❌ Error checking data collection status:', error);
      return false;
    }
  }

  // Get privacy policy URL
  static getPrivacyPolicyUrl() {
    // For now, point to main landing page until specific policy pages are created
    return __DEV__ 
      ? 'https://choma.vercel.app'
      : 'https://choma.vercel.app';
  }

  // Get terms of service URL  
  static getTermsOfServiceUrl() {
    // For now, point to main landing page until specific terms pages are created
    return __DEV__
      ? 'https://choma.vercel.app' 
      : 'https://choma.vercel.app';
  }

  // Get main website URL
  static getWebsiteUrl() {
    return __DEV__
      ? 'https://choma.vercel.app'
      : 'https://choma.vercel.app';
  }
}

export default PrivacyService;