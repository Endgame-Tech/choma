import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import biometricAuth from '../../services/biometricAuth';
import { useAuth } from '../../context/AuthContext';

const BiometricLogin = ({ onSuccess, onError, style }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  
  const { loginWithBiometric } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      setLoading(true);
      
      const canUse = await biometricAuth.canUseBiometricLogin();
      setIsAvailable(canUse);
      
      if (canUse) {
        const enabled = await biometricAuth.isBiometricEnabled();
        setIsEnabled(enabled);
        
        const type = biometricAuth.getBiometricTypeString();
        setBiometricType(type);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (authenticating) return;
    
    try {
      setAuthenticating(true);
      
      const result = await biometricAuth.authenticateForLogin();
      
      if (result.success) {
        // Attempt to log in with biometric authentication
        if (loginWithBiometric) {
          const loginResult = await loginWithBiometric();
          if (loginResult.success) {
            onSuccess && onSuccess();
          } else {
            onError && onError(loginResult.error || 'Login failed');
            Alert.alert(
              'Login Failed',
              loginResult.error || 'Failed to log in with biometric authentication.',
              [{ text: 'OK' }]
            );
          }
        } else {
          // Fallback if loginWithBiometric is not available
          onSuccess && onSuccess();
        }
      } else {
        onError && onError(result.error);
        
        if (result.errorCode !== 'user_cancel') {
          Alert.alert(
            'Authentication Failed',
            result.error || 'Biometric authentication failed. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error during biometric login:', error);
      onError && onError(error.message);
      Alert.alert(
        'Error',
        'An error occurred during biometric authentication. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setAuthenticating(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType.includes('Face')) {
      return 'face-recognition';
    } else if (biometricType.includes('Touch') || biometricType.includes('Fingerprint')) {
      return 'finger-print';
    } else if (biometricType.includes('Iris')) {
      return 'eye';
    }
    return 'shield-checkmark';
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#4CAF50" size="small" />
        <Text style={styles.loadingText}>Checking biometric availability...</Text>
      </View>
    );
  }

  if (!isAvailable || !isEnabled) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.biometricButton, authenticating && styles.buttonDisabled]}
        onPress={handleBiometricLogin}
        disabled={authenticating}
        activeOpacity={0.7}
      >
        {authenticating ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name={getBiometricIcon()} size={24} color="#FFFFFF" />
        )}
        <Text style={styles.buttonText}>
          {authenticating ? 'Authenticating...' : `Log in with ${biometricType}`}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.orText}>or</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
});

export default BiometricLogin;