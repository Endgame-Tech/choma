// Development utilities to handle dev-specific issues
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Development configuration
 */
export const DEV_CONFIG = {
  // Firebase is enabled in all environments
  SKIP_FIREBASE: false,
  
  // API calls work in all environments
  SKIP_AUTH_APIS: false,
  
  // Enable verbose logging in development
  ENABLE_VERBOSE_LOGGING: __DEV__,
  
};

/**
 * Safe API call wrapper that handles authentication gracefully
 */
export const safeApiCall = async (apiFunction, requiresAuth = true) => {
  try {
    // Check if user is authenticated when auth is required
    if (requiresAuth) {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        
        return { success: false, error: 'Not authenticated', skipRetry: true };
      }
    }
    
    return await apiFunction();
  } catch (error) {
    console.error('❌ Safe API call error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Development logger that only logs in development mode
 */
export const devLog = {
  info: (message, data) => {
    if (DEV_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },
  
  warn: (message, data) => {
    if (DEV_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  },
  
  error: (message, error) => {
    if (DEV_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.error(`❌ ${message}`, error || '');
    }
  },
  
  success: (message, data) => {
    if (DEV_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ ${message}`, data || '');
    }
  }
};

/**
 * Check if running in development with specific conditions
 */
export const isDevelopment = () => {
  return __DEV__;
};

/**
 * Check if Firebase should be skipped
 */
export const shouldSkipFirebase = () => {
  return DEV_CONFIG.SKIP_FIREBASE;
};

/**
 * Check if auth-required APIs should be skipped
 */
export const shouldSkipAuthAPIs = () => {
  return DEV_CONFIG.SKIP_AUTH_APIS;
};

export default {
  DEV_CONFIG,
  safeApiCall,
  devLog,
  isDevelopment,
  shouldSkipFirebase,
  shouldSkipAuthAPIs
};