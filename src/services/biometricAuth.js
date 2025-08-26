import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Optional import for expo-local-authentication
let LocalAuthentication = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  console.warn('expo-local-authentication not available:', error.message);
}

class BiometricAuthService {
  constructor() {
    this.isSupported = false;
    this.availableTypes = [];
    this.initialized = false;
    this.moduleAvailable = LocalAuthentication !== null;
  }

  async initialize() {
    try {
      if (!this.moduleAvailable) {
        console.warn('📱 Biometric auth module not available');
        this.initialized = true;
        return false;
      }

      this.isSupported = await LocalAuthentication.hasHardwareAsync();
      
      if (this.isSupported) {
        this.availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        console.log('📱 Biometric auth initialized');
        console.log('Available biometric types:', this.availableTypes);
      }
      
      this.initialized = true;
      return this.isSupported;
    } catch (error) {
      console.error('Error initializing biometric auth:', error);
      this.initialized = true;
      return false;
    }
  }

  async isAvailable() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.moduleAvailable || !this.isSupported) {
      return { available: false, reason: this.moduleAvailable ? 'Hardware not supported' : 'Module not available' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { available: false, reason: 'No biometric credentials enrolled' };
    }

    return { available: true, types: this.availableTypes };
  }

  async authenticate(options = {}) {
    const {
      promptMessage = 'Authenticate with biometrics',
      cancelLabel = 'Cancel',
      fallbackLabel = 'Use password',
      disableDeviceFallback = false,
    } = options;

    try {
      if (!this.moduleAvailable) {
        return {
          success: false,
          error: 'Biometric authentication module not available',
          errorCode: 'MODULE_NOT_AVAILABLE',
        };
      }

      const availability = await this.isAvailable();
      if (!availability.available) {
        return {
          success: false,
          error: availability.reason,
          errorCode: 'NOT_AVAILABLE',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        fallbackLabel,
        disableDeviceFallback,
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        return {
          success: true,
          error: null,
        };
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        return {
          success: false,
          error: result.error,
          errorCode: result.error,
        };
      }
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'AUTHENTICATION_ERROR',
      };
    }
  }

  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem('biometricEnabled', enabled.toString());
      console.log(`📱 Biometric auth ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error('Error setting biometric enabled status:', error);
      return false;
    }
  }

  async canUseBiometricLogin() {
    const enabled = await this.isBiometricEnabled();
    const availability = await this.isAvailable();
    
    return enabled && availability.available;
  }

  getBiometricTypeString() {
    if (!this.moduleAvailable || !this.availableTypes || this.availableTypes.length === 0) {
      return 'Biometric';
    }

    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    
    return 'Biometric';
  }

  async authenticateForLogin() {
    const biometricType = this.getBiometricTypeString();
    
    return await this.authenticate({
      promptMessage: `Log in with ${biometricType}`,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });
  }

  async authenticateForSettings() {
    const biometricType = this.getBiometricTypeString();
    
    return await this.authenticate({
      promptMessage: `Verify ${biometricType} to access settings`,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use password',
      disableDeviceFallback: true,
    });
  }

  async authenticateForPayment() {
    const biometricType = this.getBiometricTypeString();
    
    return await this.authenticate({
      promptMessage: `Verify ${biometricType} to confirm payment`,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use password',
      disableDeviceFallback: true,
    });
  }

  async getSecurityLevel() {
    if (!this.moduleAvailable) {
      return 'NONE';
    }

    const availability = await this.isAvailable();
    
    if (!availability.available) {
      return 'NONE';
    }

    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      switch (securityLevel) {
        case LocalAuthentication.SecurityLevel.NONE:
          return 'NONE';
        case LocalAuthentication.SecurityLevel.SECRET:
          return 'SECRET';
        case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
          return 'BIOMETRIC_WEAK';
        case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
          return 'BIOMETRIC_STRONG';
        default:
          return 'UNKNOWN';
      }
    } catch (error) {
      console.error('Error getting security level:', error);
      return 'UNKNOWN';
    }
  }

  async clearBiometricData() {
    try {
      await AsyncStorage.removeItem('biometricEnabled');
      console.log('🗑️ Biometric data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      return false;
    }
  }
}

export default new BiometricAuthService();