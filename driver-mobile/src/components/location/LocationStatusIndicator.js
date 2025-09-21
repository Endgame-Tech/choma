// src/components/location/LocationStatusIndicator.js
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import { useLocation } from '../../contexts/LocationContext';
import CustomText from '../ui/CustomText';
import CustomIcon from '../ui/CustomIcon';
import LocationPermissionModal from './LocationPermissionModal';

const LocationStatusIndicator = ({ style, compact = false, onPress }) => {
  const { colors } = useTheme();
  const {
    isTracking,
    currentLocation,
    locationPermission,
    error,
    lastLocationUpdate,
    requestLocationPermission,
  } = useLocation();
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for active tracking
  useEffect(() => {
    if (isTracking && !error) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isTracking, error, pulseAnim]);

  const getLocationStatus = () => {
    if (error) {
      return {
        status: 'error',
        color: colors.error,
        icon: 'warning',
        title: 'Location Error',
        subtitle: 'Tap to retry',
      };
    }

    if (!locationPermission?.foreground) {
      return {
        status: 'no_permission',
        color: colors.warning,
        icon: 'location',
        title: 'Permission Required',
        subtitle: 'Tap to grant access',
      };
    }

    if (isTracking && currentLocation) {
      const timeSinceUpdate = lastLocationUpdate 
        ? Math.floor((Date.now() - new Date(lastLocationUpdate).getTime()) / 1000)
        : 0;

      return {
        status: 'active',
        color: colors.success,
        icon: 'location-filled',
        title: 'Location Active',
        subtitle: `Updated ${timeSinceUpdate}s ago`,
      };
    }

    if (isTracking && !currentLocation) {
      return {
        status: 'searching',
        color: colors.info,
        icon: 'location',
        title: 'Searching...',
        subtitle: 'Getting your location',
      };
    }

    return {
      status: 'inactive',
      color: colors.textSecondary,
      icon: 'location',
      title: 'Location Off',
      subtitle: 'Tap to start tracking',
    };
  };

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    const status = getLocationStatus();
    
    if (status.status === 'no_permission') {
      setShowPermissionModal(true);
    } else if (status.status === 'error') {
      await requestLocationPermission();
    }
  };

  const handlePermissionGranted = () => {
    setShowPermissionModal(false);
  };

  const locationStatus = getLocationStatus();

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles(colors).compactContainer, style]}
        onPress={handlePress}
      >
        <Animated.View
          style={[
            styles(colors).compactIconContainer,
            { backgroundColor: locationStatus.color + '20' },
            isTracking && !error && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <CustomIcon
            name={locationStatus.icon}
            size={16}
            color={locationStatus.color}
          />
        </Animated.View>
        <CustomText style={[styles(colors).compactText, { color: locationStatus.color }]}>
          {locationStatus.status === 'active' ? 'GPS' : 'GPS'}
        </CustomText>
        
        <LocationPermissionModal
          visible={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          onPermissionGranted={handlePermissionGranted}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles(colors).container, style]}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles(colors).iconContainer,
          { backgroundColor: locationStatus.color + '20' },
          isTracking && !error && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <CustomIcon
          name={locationStatus.icon}
          size={24}
          color={locationStatus.color}
        />
      </Animated.View>
      
      <View style={styles(colors).textContainer}>
        <CustomText style={[styles(colors).title, { color: locationStatus.color }]}>
          {locationStatus.title}
        </CustomText>
        <CustomText style={styles(colors).subtitle}>
          {locationStatus.subtitle}
        </CustomText>
      </View>

      {currentLocation && (
        <View style={styles(colors).accuracyContainer}>
          <CustomText style={styles(colors).accuracyText}>
            ±{Math.round(currentLocation.accuracy)}m
          </CustomText>
        </View>
      )}
      
      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={handlePermissionGranted}
      />
    </TouchableOpacity>
  );
};

const styles = (colors) => createStylesWithDMSans({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  accuracyContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accuracyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compactIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LocationStatusIndicator;