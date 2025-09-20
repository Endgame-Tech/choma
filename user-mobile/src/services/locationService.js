import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.isTracking = false;
    this.watchId = null;
    this.deliveryZones = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.requestLocationPermission();
      await this.loadDeliveryZones();
      this.initialized = true;
      console.log('📍 Location service initialized');
    } catch (error) {
      console.error('Error initializing location service:', error);
    }
  }

  async requestLocationPermission() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to get accurate delivery estimates and track your orders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return false;
      }

      // For background location (optional for order tracking)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission not granted');
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        await this.requestLocationPermission();
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      await this.saveCurrentLocation();
      
      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Try to get last known location
      const lastKnownLocation = await this.getLastKnownLocation();
      if (lastKnownLocation) {
        this.currentLocation = lastKnownLocation;
        return lastKnownLocation;
      }

      throw error;
    }
  }

  async hasLocationPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getLastKnownLocation() {
    try {
      const location = await Location.getLastKnownPositionAsync();
      if (location) {
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(location.timestamp).toISOString(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting last known location:', error);
      return null;
    }
  }

  async startLocationTracking(callback) {
    try {
      if (this.isTracking) {
        return;
      }

      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 100, // 100 meters
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
          };
          
          this.saveCurrentLocation();
          if (callback) {
            callback(this.currentLocation);
          }
        }
      );

      this.isTracking = true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopLocationTracking() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
      this.isTracking = false;
      console.log('📍 Location tracking stopped');
    }
  }

  async saveCurrentLocation() {
    try {
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(this.currentLocation));
    } catch (error) {
      console.error('Error saving current location:', error);
    }
  }

  async loadStoredLocation() {
    try {
      const storedLocation = await AsyncStorage.getItem('lastKnownLocation');
      if (storedLocation) {
        this.currentLocation = JSON.parse(storedLocation);
        return this.currentLocation;
      }
      return null;
    } catch (error) {
      console.error('Error loading stored location:', error);
      return null;
    }
  }

  async loadDeliveryZones() {
    // In a real app, this would be loaded from the backend
    this.deliveryZones = [
      {
        id: '1',
        name: 'Lagos Island',
        coordinates: [
          { latitude: 6.4550, longitude: 3.3841 },
          { latitude: 6.4550, longitude: 3.4299 },
          { latitude: 6.4281, longitude: 3.4299 },
          { latitude: 6.4281, longitude: 3.3841 },
        ],
        deliveryFee: 500,
        estimatedTime: '30-45 minutes',
      },
      {
        id: '2',
        name: 'Victoria Island',
        coordinates: [
          { latitude: 6.4281, longitude: 3.4299 },
          { latitude: 6.4281, longitude: 3.4757 },
          { latitude: 6.4012, longitude: 3.4757 },
          { latitude: 6.4012, longitude: 3.4299 },
        ],
        deliveryFee: 600,
        estimatedTime: '35-50 minutes',
      },
      {
        id: '3',
        name: 'Ikoyi',
        coordinates: [
          { latitude: 6.4612, longitude: 3.4299 },
          { latitude: 6.4612, longitude: 3.4757 },
          { latitude: 6.4343, longitude: 3.4757 },
          { latitude: 6.4343, longitude: 3.4299 },
        ],
        deliveryFee: 550,
        estimatedTime: '30-45 minutes',
      },
    ];
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(value) {
    return value * Math.PI / 180;
  }

  isPointInPolygon(point, polygon) {
    const x = point.latitude;
    const y = point.longitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  async getDeliveryZone(location = null) {
    try {
      const targetLocation = location || this.currentLocation || await this.getCurrentLocation();
      
      for (const zone of this.deliveryZones) {
        if (this.isPointInPolygon(targetLocation, zone.coordinates)) {
          return zone;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting delivery zone:', error);
      return null;
    }
  }

  async getDeliveryEstimate(location = null) {
    try {
      const zone = await this.getDeliveryZone(location);
      
      if (!zone) {
        return {
          available: false,
          message: 'Delivery not available in your area',
        };
      }

      return {
        available: true,
        zone: zone.name,
        fee: zone.deliveryFee,
        estimatedTime: zone.estimatedTime,
      };
    } catch (error) {
      console.error('Error getting delivery estimate:', error);
      return {
        available: false,
        message: 'Unable to calculate delivery estimate',
      };
    }
  }

  async trackDelivery(orderId, deliveryPersonLocation) {
    try {
      const userLocation = this.currentLocation || await this.getCurrentLocation();
      
      if (!userLocation) {
        throw new Error('User location not available');
      }

      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        deliveryPersonLocation.latitude,
        deliveryPersonLocation.longitude
      );

      const estimatedTime = Math.round(distance * 2); // Rough estimate: 2 minutes per km
      
      return {
        orderId,
        distance: distance.toFixed(2),
        estimatedTime,
        deliveryPersonLocation,
        userLocation,
      };
    } catch (error) {
      console.error('Error tracking delivery:', error);
      throw error;
    }
  }

  async reverseGeocode(location = null) {
    try {
      const targetLocation = location || this.currentLocation || await this.getCurrentLocation();
      
      const address = await Location.reverseGeocodeAsync({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        return {
          street: addr.street,
          city: addr.city,
          region: addr.region,
          postalCode: addr.postalCode,
          country: addr.country,
          formattedAddress: `${addr.street}, ${addr.city}, ${addr.region}`,
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  async geocode(address) {
    try {
      const locations = await Location.geocodeAsync(address);
      
      if (locations.length > 0) {
        const location = locations[0];
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }

  async getLocationSummary() {
    try {
      await this.getCurrentLocation();
      const address = await this.reverseGeocode();
      const deliveryZone = await this.getDeliveryZone();
      const estimate = await this.getDeliveryEstimate();

      return {
        location: this.currentLocation,
        address,
        deliveryZone,
        estimate,
      };
    } catch (error) {
      console.error('Error getting location summary:', error);
      return null;
    }
  }
}

export default new LocationService();