// src/components/location/LocationPermissionModal.js
import React, { useState } from 'react';
import {
  View,
  Modal,
  Alert,
  Linking,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import CustomText from '../ui/CustomText';
import CustomIcon from '../ui/CustomIcon';

const LocationPermissionModal = ({ 
  visible, 
  onClose, 
  onPermissionGranted,
  showBackgroundPermission = true 
}) => {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState('foreground'); // 'foreground', 'background', 'complete'
  const [permissions, setPermissions] = useState({
    foreground: null,
    background: null,
  });

  const handleForegroundPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      const granted = status === 'granted';
      setPermissions(prev => ({ ...prev, foreground: granted }));
      
      if (granted) {
        if (showBackgroundPermission) {
          setCurrentStep('background');
        } else {
          setCurrentStep('complete');
          onPermissionGranted({ foreground: true, background: false });
        }
      } else {
        Alert.alert(
          'Location Permission Required',
          'Location access is required for delivery tracking. Please grant permission in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request foreground permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  const handleBackgroundPermission = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      const granted = status === 'granted';
      setPermissions(prev => ({ ...prev, background: granted }));
      
      setCurrentStep('complete');
      onPermissionGranted({
        foreground: permissions.foreground,
        background: granted,
      });
      
      if (!granted) {
        Alert.alert(
          'Background Location',
          'Background location access is recommended for better delivery tracking when the app is not active.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to request background permission:', error);
      setCurrentStep('complete');
      onPermissionGranted({
        foreground: permissions.foreground,
        background: false,
      });
    }
  };

  const handleSkipBackground = () => {
    setPermissions(prev => ({ ...prev, background: false }));
    setCurrentStep('complete');
    onPermissionGranted({
      foreground: permissions.foreground,
      background: false,
    });
  };

  const renderForegroundStep = () => (
    <View style={styles(colors).content}>
      <View style={styles(colors).iconContainer}>
        <CustomIcon name="location" size={64} color={colors.primary} />
      </View>
      
      <CustomText style={styles(colors).title}>
        Location Permission Required
      </CustomText>
      
      <CustomText style={styles(colors).description}>
        We need access to your location to:
      </CustomText>
      
      <View style={styles(colors).featureList}>
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Track delivery routes and optimize navigation
          </CustomText>
        </View>
        
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Update customers on your delivery progress
          </CustomText>
        </View>
        
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Find nearby delivery opportunities
          </CustomText>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles(colors).primaryButton}
        onPress={handleForegroundPermission}
      >
        <CustomText style={styles(colors).primaryButtonText}>
          Grant Location Access
        </CustomText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles(colors).secondaryButton}
        onPress={onClose}
      >
        <CustomText style={styles(colors).secondaryButtonText}>
          Not Now
        </CustomText>
      </TouchableOpacity>
    </View>
  );

  const renderBackgroundStep = () => (
    <View style={styles(colors).content}>
      <View style={styles(colors).iconContainer}>
        <CustomIcon name="location-filled" size={64} color={colors.primary} />
      </View>
      
      <CustomText style={styles(colors).title}>
        Background Location Access
      </CustomText>
      
      <CustomText style={styles(colors).description}>
        For the best experience, allow location access even when the app is not active:
      </CustomText>
      
      <View style={styles(colors).featureList}>
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Continue tracking during deliveries
          </CustomText>
        </View>
        
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Receive delivery notifications anywhere
          </CustomText>
        </View>
        
        <View style={styles(colors).featureItem}>
          <CustomIcon name="checkmark-circle" size={20} color={colors.success} />
          <CustomText style={styles(colors).featureText}>
            Better battery optimization
          </CustomText>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles(colors).primaryButton}
        onPress={handleBackgroundPermission}
      >
        <CustomText style={styles(colors).primaryButtonText}>
          Allow Background Access
        </CustomText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles(colors).secondaryButton}
        onPress={handleSkipBackground}
      >
        <CustomText style={styles(colors).secondaryButtonText}>
          Skip for Now
        </CustomText>
      </TouchableOpacity>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles(colors).content}>
      <View style={styles(colors).iconContainer}>
        <CustomIcon name="checkmark-circle-filled" size={64} color={colors.success} />
      </View>
      
      <CustomText style={styles(colors).title}>
        All Set!
      </CustomText>
      
      <CustomText style={styles(colors).description}>
        Location permissions have been configured. You can now start receiving delivery assignments.
      </CustomText>
      
      <View style={styles(colors).permissionStatus}>
        <View style={styles(colors).statusItem}>
          <CustomIcon 
            name={permissions.foreground ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={permissions.foreground ? colors.success : colors.error} 
          />
          <CustomText style={styles(colors).statusText}>
            Foreground Location: {permissions.foreground ? 'Granted' : 'Denied'}
          </CustomText>
        </View>
        
        {showBackgroundPermission && (
          <View style={styles(colors).statusItem}>
            <CustomIcon 
              name={permissions.background ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={permissions.background ? colors.success : colors.warning} 
            />
            <CustomText style={styles(colors).statusText}>
              Background Location: {permissions.background ? 'Granted' : 'Not Granted'}
            </CustomText>
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles(colors).primaryButton}
        onPress={onClose}
      >
        <CustomText style={styles(colors).primaryButtonText}>
          Continue
        </CustomText>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'foreground':
        return renderForegroundStep();
      case 'background':
        return renderBackgroundStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderForegroundStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles(colors).container}>
        {renderCurrentStep()}
      </View>
    </Modal>
  );
};

const styles = (colors) => createStylesWithDMSans({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionStatus: {
    width: '100%',
    marginBottom: 32,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
});

export default LocationPermissionModal;