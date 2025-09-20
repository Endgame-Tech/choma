// src/services/locationService.js - GPS tracking and location management
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import driverApiService from './driverApi';

const LOCATION_TASK_NAME = 'background-location-task';

class LocationService {
  constructor() {
    this.isTracking = false;
    this.locationSubscription = null;
    this.lastKnownLocation = null;
    this.trackingOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 seconds
      distanceInterval: 10, // 10 meters
    };
  }

  // Request location permissions
  async requestPermissions() {
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error('Location services are disabled');
      }

      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission not granted');
      }

      // Request background permission for continuous tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const permissions = await this.requestPermissions();
      if (!permissions.foreground) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.trackingOptions.accuracy,
        maximumAge: 10000, // Use cached location if less than 10 seconds old
      });

      const locationData = this.formatLocationData(location);
      this.lastKnownLocation = locationData;
      
      return locationData;
    } catch (error) {
      console.error('Failed to get current location:', error);
      throw error;
    }
  }

  // Start location tracking
  async startTracking() {
    try {
      if (this.isTracking) {
        console.log('Location tracking already active');
        return;
      }

      const permissions = await this.requestPermissions();
      if (!permissions.foreground) {
        throw new Error('Location permission required for tracking');
      }

      // Stop any existing subscription
      await this.stopTracking();

      // Start foreground tracking
      this.locationSubscription = await Location.watchPositionAsync(
        this.trackingOptions,
        this.handleLocationUpdate.bind(this)
      );

      // Start background tracking if permission granted
      if (permissions.background && Platform.OS !== 'web') {
        await this.startBackgroundTracking();
      }

      this.isTracking = true;
      console.log('📍 Location tracking started');
      
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      throw error;
    }
  }

  // Stop location tracking
  async stopTracking() {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background tracking
      if (Platform.OS !== 'web') {
        await this.stopBackgroundTracking();
      }

      this.isTracking = false;
      console.log('📍 Location tracking stopped');
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }
  }

  // Start background location tracking
  async startBackgroundTracking() {
    try {
      if (Platform.OS === 'web') return;

      // Define the background task if not already defined
      if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
        TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
          if (error) {
            console.error('Background location task error:', error);
            return;
          }

          if (data) {
            const { locations } = data;
            if (locations && locations.length > 0) {
              const location = locations[locations.length - 1];
              this.handleBackgroundLocationUpdate(location);
            }
          }
        });
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000, // 15 seconds for background
        distanceInterval: 50, // 50 meters for background
        foregroundService: {
          notificationTitle: 'Choma Driver',
          notificationBody: 'Tracking location for deliveries',
        },
      });

      console.log('📍 Background location tracking started');
    } catch (error) {
      console.error('Failed to start background tracking:', error);
    }
  }

  // Stop background location tracking
  async stopBackgroundTracking() {
    try {
      if (Platform.OS === 'web') return;

      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('📍 Background location tracking stopped');
      }
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
    }
  }

  // Handle location updates
  handleLocationUpdate(location) {
    const locationData = this.formatLocationData(location);
    this.lastKnownLocation = locationData;
    
    // Send to backend
    this.sendLocationToBackend(locationData);
    
    // Trigger location update callbacks
    this.notifyLocationUpdate(locationData);
  }

  // Handle background location updates
  handleBackgroundLocationUpdate(location) {
    const locationData = this.formatLocationData(location);
    this.lastKnownLocation = locationData;
    
    // Send to backend (background updates)
    this.sendLocationToBackend(locationData, true);
  }

  // Format location data
  formatLocationData(location) {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  }

  // Send location to backend
  async sendLocationToBackend(locationData, isBackground = false) {
    try {
      await driverApiService.updateLocation({
        ...locationData,
        isBackground,
        deviceTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send location to backend:', error);
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
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
  }

  // Calculate bearing between two points
  calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360°
  }

  // Get estimated time of arrival
  calculateETA(distanceMeters, averageSpeedKmh = 30) {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    
    return {
      minutes: timeMinutes,
      hours: Math.floor(timeMinutes / 60),
      remainingMinutes: timeMinutes % 60,
    };
  }

  // Location update listeners
  locationUpdateListeners = new Set();

  addLocationUpdateListener(callback) {
    this.locationUpdateListeners.add(callback);
  }

  removeLocationUpdateListener(callback) {
    this.locationUpdateListeners.delete(callback);
  }

  notifyLocationUpdate(locationData) {
    this.locationUpdateListeners.forEach(callback => {
      try {
        callback(locationData);
      } catch (error) {
        console.error('Location update listener error:', error);
      }
    });
  }

  // Update tracking options
  updateTrackingOptions(options) {
    this.trackingOptions = {
      ...this.trackingOptions,
      ...options,
    };

    // Restart tracking if active
    if (this.isTracking) {
      this.stopTracking().then(() => {
        setTimeout(() => this.startTracking(), 1000);
      });
    }
  }

  // Get last known location
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  // Check if tracking is active
  isLocationTracking() {
    return this.isTracking;
  }
}

// Create and export singleton instance
const locationService = new LocationService();
export default locationService;