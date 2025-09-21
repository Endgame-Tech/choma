// src/screens/settings/LocationSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import { useLocation } from '../../contexts/LocationContext';
import CustomText from '../../components/ui/CustomText';
import CustomIcon from '../../components/ui/CustomIcon';
import LocationStatusIndicator from '../../components/location/LocationStatusIndicator';
import LocationPermissionModal from '../../components/location/LocationPermissionModal';
import locationService from '../../services/locationService';

const LocationSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    isTracking,
    currentLocation,
    locationPermission,
    trackingSettings,
    updateTrackingSettings,
    startTracking,
    stopTracking,
    getCurrentLocation,
  } = useLocation();

  const [refreshing, setRefreshing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(null);

  useEffect(() => {
    loadTrackingStatus();
  }, []);

  const loadTrackingStatus = async () => {
    try {
      const status = await locationService.getTrackingStatus();
      setTrackingStatus(status);
    } catch (error) {
      console.error('Failed to load tracking status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      getCurrentLocation(),
      loadTrackingStatus(),
    ]);
    setRefreshing(false);
  };

  const handlePermissionRequest = () => {
    setShowPermissionModal(true);
  };

  const handlePermissionGranted = () => {
    setShowPermissionModal(false);
    loadTrackingStatus();
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await stopTracking();
      } else {
        await startTracking();
      }
      loadTrackingStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle location tracking');
    }
  };

  const updateAccuracy = (accuracy) => {
    updateTrackingSettings({ accuracy });
  };

  const updateTimeInterval = (timeInterval) => {
    updateTrackingSettings({ timeInterval });
  };

  const updateDistanceInterval = (distanceInterval) => {
    updateTrackingSettings({ distanceInterval });
  };

  const toggleBackgroundTracking = (enabled) => {
    updateTrackingSettings({ enableBackground: enabled });
  };

  const openLocationSettings = () => {
    Alert.alert(
      'Location Settings',
      'Open device location settings to change permissions?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Location.enableNetworkProviderAsync() },
      ]
    );
  };

  const renderPermissionStatus = () => (
    <View style={styles(colors).section}>
      <CustomText style={styles(colors).sectionTitle}>
        Location Permissions
      </CustomText>
      
      <View style={styles(colors).permissionCard}>
        <View style={styles(colors).permissionItem}>
          <View style={styles(colors).permissionInfo}>
            <CustomIcon 
              name={locationPermission?.foreground ? "checkmark-circle" : "close-circle"}
              size={24}
              color={locationPermission?.foreground ? colors.success : colors.error}
            />
            <View style={styles(colors).permissionText}>
              <CustomText style={styles(colors).permissionTitle}>
                Foreground Location
              </CustomText>
              <CustomText style={styles(colors).permissionSubtitle}>
                Required for basic location tracking
              </CustomText>
            </View>
          </View>
          <CustomText style={[
            styles(colors).permissionStatus,
            { color: locationPermission?.foreground ? colors.success : colors.error }
          ]}>
            {locationPermission?.foreground ? 'Granted' : 'Denied'}
          </CustomText>
        </View>

        <View style={styles(colors).permissionItem}>
          <View style={styles(colors).permissionInfo}>
            <CustomIcon 
              name={locationPermission?.background ? "checkmark-circle" : "close-circle"}
              size={24}
              color={locationPermission?.background ? colors.success : colors.warning}
            />
            <View style={styles(colors).permissionText}>
              <CustomText style={styles(colors).permissionTitle}>
                Background Location
              </CustomText>
              <CustomText style={styles(colors).permissionSubtitle}>
                Enables tracking when app is not active
              </CustomText>
            </View>
          </View>
          <CustomText style={[
            styles(colors).permissionStatus,
            { color: locationPermission?.background ? colors.success : colors.warning }
          ]}>
            {locationPermission?.background ? 'Granted' : 'Not Granted'}
          </CustomText>
        </View>

        {(!locationPermission?.foreground || !locationPermission?.background) && (
          <TouchableOpacity
            style={styles(colors).permissionButton}
            onPress={handlePermissionRequest}
          >
            <CustomText style={styles(colors).permissionButtonText}>
              Request Permissions
            </CustomText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTrackingStatus = () => (
    <View style={styles(colors).section}>
      <CustomText style={styles(colors).sectionTitle}>
        Current Status
      </CustomText>
      
      <LocationStatusIndicator style={styles(colors).statusIndicator} />
      
      <View style={styles(colors).statusDetails}>
        {currentLocation && (
          <>
            <View style={styles(colors).statusItem}>
              <CustomText style={styles(colors).statusLabel}>Coordinates:</CustomText>
              <CustomText style={styles(colors).statusValue}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </CustomText>
            </View>
            
            <View style={styles(colors).statusItem}>
              <CustomText style={styles(colors).statusLabel}>Accuracy:</CustomText>
              <CustomText style={styles(colors).statusValue}>
                ±{Math.round(currentLocation.accuracy)} meters
              </CustomText>
            </View>
            
            {currentLocation.speed && (
              <View style={styles(colors).statusItem}>
                <CustomText style={styles(colors).statusLabel}>Speed:</CustomText>
                <CustomText style={styles(colors).statusValue}>
                  {Math.round(currentLocation.speed * 3.6)} km/h
                </CustomText>
              </View>
            )}
          </>
        )}
        
        {trackingStatus && (
          <>
            <View style={styles(colors).statusItem}>
              <CustomText style={styles(colors).statusLabel}>Foreground:</CustomText>
              <CustomText style={[
                styles(colors).statusValue,
                { color: trackingStatus.foregroundActive ? colors.success : colors.error }
              ]}>
                {trackingStatus.foregroundActive ? 'Active' : 'Inactive'}
              </CustomText>
            </View>
            
            <View style={styles(colors).statusItem}>
              <CustomText style={styles(colors).statusLabel}>Background:</CustomText>
              <CustomText style={[
                styles(colors).statusValue,
                { color: trackingStatus.backgroundActive ? colors.success : colors.warning }
              ]}>
                {trackingStatus.backgroundActive ? 'Active' : 'Inactive'}
              </CustomText>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderTrackingControls = () => (
    <View style={styles(colors).section}>
      <CustomText style={styles(colors).sectionTitle}>
        Tracking Controls
      </CustomText>
      
      <View style={styles(colors).controlCard}>
        <View style={styles(colors).controlItem}>
          <View style={styles(colors).controlInfo}>
            <CustomText style={styles(colors).controlTitle}>
              Location Tracking
            </CustomText>
            <CustomText style={styles(colors).controlSubtitle}>
              Enable real-time location tracking
            </CustomText>
          </View>
          <Switch
            value={isTracking}
            onValueChange={toggleTracking}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={isTracking ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles(colors).controlItem}>
          <View style={styles(colors).controlInfo}>
            <CustomText style={styles(colors).controlTitle}>
              Background Tracking
            </CustomText>
            <CustomText style={styles(colors).controlSubtitle}>
              Continue tracking when app is minimized
            </CustomText>
          </View>
          <Switch
            value={trackingSettings.enableBackground}
            onValueChange={toggleBackgroundTracking}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={trackingSettings.enableBackground ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  const renderAdvancedSettings = () => (
    <View style={styles(colors).section}>
      <CustomText style={styles(colors).sectionTitle}>
        Advanced Settings
      </CustomText>
      
      <View style={styles(colors).settingsCard}>
        <TouchableOpacity style={styles(colors).settingItem}>
          <View style={styles(colors).settingInfo}>
            <CustomText style={styles(colors).settingTitle}>
              Location Accuracy
            </CustomText>
            <CustomText style={styles(colors).settingValue}>
              {trackingSettings.accuracy === Location.Accuracy.High ? 'High' : 
               trackingSettings.accuracy === Location.Accuracy.Balanced ? 'Balanced' : 'Low'}
            </CustomText>
          </View>
          <CustomIcon name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).settingItem}>
          <View style={styles(colors).settingInfo}>
            <CustomText style={styles(colors).settingTitle}>
              Update Interval
            </CustomText>
            <CustomText style={styles(colors).settingValue}>
              {trackingSettings.timeInterval / 1000}s
            </CustomText>
          </View>
          <CustomIcon name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).settingItem}>
          <View style={styles(colors).settingInfo}>
            <CustomText style={styles(colors).settingTitle}>
              Distance Threshold
            </CustomText>
            <CustomText style={styles(colors).settingValue}>
              {trackingSettings.distanceInterval}m
            </CustomText>
          </View>
          <CustomIcon name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles(colors).settingItem}
          onPress={openLocationSettings}
        >
          <View style={styles(colors).settingInfo}>
            <CustomText style={styles(colors).settingTitle}>
              Device Location Settings
            </CustomText>
            <CustomText style={styles(colors).settingValue}>
              Open system settings
            </CustomText>
          </View>
          <CustomIcon name="open" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <CustomIcon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <CustomText style={styles(colors).headerTitle}>
          Location Settings
        </CustomText>
        <View style={styles(colors).headerSpacer} />
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPermissionStatus()}
        {renderTrackingStatus()}
        {renderTrackingControls()}
        {renderAdvancedSettings()}
        
        <View style={styles(colors).bottomSpacing} />
      </ScrollView>

      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={handlePermissionGranted}
      />
    </SafeAreaView>
  );
};

const styles = (colors) => createStylesWithDMSans({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  
  // Permission Status
  permissionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionText: {
    marginLeft: 12,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  permissionButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Status Indicator
  statusIndicator: {
    marginBottom: 16,
  },
  statusDetails: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  
  // Controls
  controlCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  controlSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // Settings
  settingsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  bottomSpacing: {
    height: 40,
  },
});

export default LocationSettingsScreen;