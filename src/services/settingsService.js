import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

class SettingsService {
  // Keys for AsyncStorage
  static KEYS = {
    NOTIFICATIONS: 'settings_notifications',
    AUTO_DOWNLOAD: 'settings_autoDownload',
    DATA_COLLECTION: 'settings_dataCollection',
    THEME: 'settings_theme',
    LANGUAGE: 'settings_language',
  };

  // Get all settings from AsyncStorage
  static async getAllSettings() {
    try {
      const keys = Object.values(this.KEYS);
      const values = await AsyncStorage.multiGet(keys);
      
      const settings = {};
      values.forEach(([key, value]) => {
        const settingKey = Object.keys(this.KEYS).find(k => this.KEYS[k] === key);
        if (settingKey) {
          settings[settingKey.toLowerCase()] = this.parseValue(value);
        }
      });
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  }

  // Save individual setting to AsyncStorage
  static async setSetting(key, value) {
    try {
      const storageKey = this.KEYS[key.toUpperCase()];
      if (!storageKey) {
        throw new Error(`Unknown setting key: ${key}`);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      console.log(`✅ Setting saved: ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      return false;
    }
  }

  // Get individual setting from AsyncStorage
  static async getSetting(key, defaultValue = null) {
    try {
      const storageKey = this.KEYS[key.toUpperCase()];
      if (!storageKey) {
        throw new Error(`Unknown setting key: ${key}`);
      }
      
      const value = await AsyncStorage.getItem(storageKey);
      return value !== null ? this.parseValue(value) : defaultValue;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return defaultValue;
    }
  }

  // Parse stored value (handle JSON strings)
  static parseValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Sync settings with backend
  static async syncWithBackend(settings) {
    try {
      if (apiService.updateUserSettings) {
        const response = await apiService.updateUserSettings(settings);
        if (response.success) {
          console.log('✅ Settings synced with backend');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error syncing settings with backend:', error);
      return false;
    }
  }

  // Load settings from backend
  static async loadFromBackend() {
    try {
      if (apiService.getUserSettings) {
        const response = await apiService.getUserSettings();
        if (response.success) {
          console.log('✅ Settings loaded from backend');
          return response.data;
        }
      }
      return {};
    } catch (error) {
      console.error('Error loading settings from backend:', error);
      return {};
    }
  }

  // Clear all settings
  static async clearAllSettings() {
    try {
      const keys = Object.values(this.KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('✅ All settings cleared');
      return true;
    } catch (error) {
      console.error('Error clearing settings:', error);
      return false;
    }
  }

  // Export settings for backup/restore
  static async exportSettings() {
    try {
      const settings = await this.getAllSettings();
      const exportData = {
        settings,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      console.log('✅ Settings exported');
      return exportData;
    } catch (error) {
      console.error('Error exporting settings:', error);
      return null;
    }
  }

  // Import settings from backup
  static async importSettings(exportData) {
    try {
      if (!exportData || !exportData.settings) {
        throw new Error('Invalid export data');
      }

      const { settings } = exportData;
      
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await this.setSetting(key, value);
      }

      console.log('✅ Settings imported');
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }

  // Reset to default settings
  static async resetToDefaults() {
    try {
      await this.clearAllSettings();
      
      // Set default values
      const defaults = {
        notifications: true,
        autoDownload: true,
        dataCollection: false,
        theme: 'system', // light, dark, system
        language: 'en'
      };

      for (const [key, value] of Object.entries(defaults)) {
        await this.setSetting(key, value);
      }

      console.log('✅ Settings reset to defaults');
      return defaults;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return {};
    }
  }
}

export default SettingsService;