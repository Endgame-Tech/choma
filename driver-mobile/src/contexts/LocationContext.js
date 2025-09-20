import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert, AppState } from 'react-native';
import { useDriverAuth } from './DriverAuthContext';
import { DRIVER_STATUSES } from '../utils/constants';

// Initial state
const initialState = {
  currentLocation: null,
  isLocationEnabled: false,
  isTracking: false,
  locationPermission: null,
  accuracy: Location.Accuracy.High,
  lastLocationUpdate: null,
  error: null,
  isLoading: false,
  trackingSettings: {
    distanceInterval: 10, // meters
    timeInterval: 5000, // 5 seconds
    enableBackground: true,
  },
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_LOCATION: 'SET_LOCATION',
  SET_LOCATION_ENABLED: 'SET_LOCATION_ENABLED',
  SET_TRACKING: 'SET_TRACKING',
  SET_PERMISSION: 'SET_PERMISSION',
  SET_ERROR: 'SET_ERROR',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const locationReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ActionTypes.SET_LOCATION:
      return {
        ...state,
        currentLocation: action.payload,
        lastLocationUpdate: new Date().toISOString(),
        error: null,
      };

    case ActionTypes.SET_LOCATION_ENABLED:
      return {
        ...state,
        isLocationEnabled: action.payload,
      };

    case ActionTypes.SET_TRACKING:
      return {
        ...state,
        isTracking: action.payload,
      };

    case ActionTypes.SET_PERMISSION:
      return {
        ...state,
        locationPermission: action.payload,
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        trackingSettings: {
          ...state.trackingSettings,
          ...action.payload,
        },
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Context
const LocationContext = createContext();

// Provider component
export const LocationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const { isDriverOnline, driverStatus } = useDriverAuth();
  const locationSubscription = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      // Check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      dispatch({ type: ActionTypes.SET_LOCATION_ENABLED, payload: locationEnabled });

      if (!locationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() },
          ]
        );
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        return false;
      }

      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        dispatch({ 
          type: ActionTypes.SET_ERROR, 
          payload: 'Location permission not granted' 
        });
        return false;
      }

      // Request background permission for better tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      const permission = {
        foreground: foregroundStatus,
        background: backgroundStatus,
      };

      dispatch({ type: ActionTypes.SET_PERMISSION, payload: permission });
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });

      return foregroundStatus === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      dispatch({ 
        type: ActionTypes.SET_ERROR, 
        payload: 'Failed to request location permission' 
      });
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: state.accuracy,
        maximumAge: 10000, // Use cached location if less than 10 seconds old
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };

      dispatch({ type: ActionTypes.SET_LOCATION, payload: locationData });
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });

      return locationData;
    } catch (error) {
      console.error('Failed to get current location:', error);
      dispatch({ 
        type: ActionTypes.SET_ERROR, 
        payload: 'Failed to get current location' 
      });
      return null;
    }
  };

  // Start location tracking
  const startTracking = async () => {
    try {
      if (state.isTracking) return;

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      // Stop any existing subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: state.accuracy,
          timeInterval: state.trackingSettings.timeInterval,
          distanceInterval: state.trackingSettings.distanceInterval,
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          dispatch({ type: ActionTypes.SET_LOCATION, payload: locationData });

          // Send location to backend when driver is online
          if (isDriverOnline()) {
            sendLocationToBackend(locationData);
          }
        }
      );

      dispatch({ type: ActionTypes.SET_TRACKING, payload: true });
      console.log('📍 Location tracking started');
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      dispatch({ 
        type: ActionTypes.SET_ERROR, 
        payload: 'Failed to start location tracking' 
      });
    }
  };

  // Stop location tracking
  const stopTracking = async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      dispatch({ type: ActionTypes.SET_TRACKING, payload: false });
      console.log('📍 Location tracking stopped');
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }
  };

  // Send location to backend
  const sendLocationToBackend = async (locationData) => {
    try {
      // This would integrate with your driver API service
      // Example: await driverAPI.updateLocation(locationData);
      console.log('📍 Sending location to backend:', locationData);
    } catch (error) {
      console.error('Failed to send location to backend:', error);
    }
  };

  // Update tracking settings
  const updateTrackingSettings = (newSettings) => {
    dispatch({
      type: ActionTypes.UPDATE_SETTINGS,
      payload: newSettings,
    });

    // Restart tracking if active with new settings
    if (state.isTracking) {
      stopTracking();
      setTimeout(startTracking, 1000);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, restart tracking if driver is online
        if (isDriverOnline() && !state.isTracking) {
          startTracking();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isDriverOnline, state.isTracking]);

  // Auto-start/stop tracking based on driver status
  useEffect(() => {
    if (isDriverOnline() && !state.isTracking) {
      startTracking();
    } else if (!isDriverOnline() && state.isTracking) {
      stopTracking();
    }
  }, [driverStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const contextValue = {
    // State
    ...state,

    // Actions
    requestLocationPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
    updateTrackingSettings,
    clearError,
    calculateDistance,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

// Hook to use location context
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;