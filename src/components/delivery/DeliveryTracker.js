import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import locationService from '../../services/locationService';

const DeliveryTracker = ({ orderId, onLocationUpdate, style }) => {
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      if (tracking) {
        locationService.stopLocationTracking();
      }
    };
  }, []);

  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      // Initialize location service
      await locationService.initialize();
      
      // Get user's current location
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      
      // Get delivery estimate
      const estimate = await locationService.getDeliveryEstimate(location);
      setDeliveryEstimate(estimate);
      
      console.log('🚚 Delivery tracking initialized');
    } catch (error) {
      console.error('Error initializing delivery tracking:', error);
      Alert.alert(
        'Location Error',
        'Unable to access your location. Please enable location services for accurate delivery tracking.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const startTracking = async () => {
    try {
      setTracking(true);
      
      await locationService.startLocationTracking((location) => {
        setUserLocation(location);
        onLocationUpdate && onLocationUpdate(location);
      });
      
      console.log('🚚 Delivery tracking started');
    } catch (error) {
      console.error('Error starting delivery tracking:', error);
      setTracking(false);
      Alert.alert(
        'Tracking Error',
        'Unable to start location tracking. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopTracking = async () => {
    try {
      await locationService.stopLocationTracking();
      setTracking(false);
      console.log('🚚 Delivery tracking stopped');
    } catch (error) {
      console.error('Error stopping delivery tracking:', error);
    }
  };

  const updateDeliveryPersonLocation = async (deliveryPersonLocation) => {
    try {
      if (!userLocation) {
        console.warn('User location not available');
        return;
      }

      const trackingInfo = await locationService.trackDelivery(
        orderId,
        deliveryPersonLocation
      );
      
      setDeliveryInfo(trackingInfo);
      console.log('🚚 Delivery person location updated:', trackingInfo);
    } catch (error) {
      console.error('Error updating delivery person location:', error);
    }
  };

  const getDeliveryStatusIcon = () => {
    if (!deliveryInfo) return 'location-outline';
    
    const distance = parseFloat(deliveryInfo.distance);
    if (distance <= 0.5) return 'checkmark-circle';
    if (distance <= 2) return 'bicycle';
    return 'car';
  };

  const getDeliveryStatusText = () => {
    if (!deliveryInfo) return 'Preparing your order';
    
    const distance = parseFloat(deliveryInfo.distance);
    if (distance <= 0.5) return 'Almost there!';
    if (distance <= 2) return 'On the way';
    return 'Order confirmed';
  };

  const getStatusColor = () => {
    if (!deliveryInfo) return '#FF9800';
    
    const distance = parseFloat(deliveryInfo.distance);
    if (distance <= 0.5) return '#4CAF50';
    if (distance <= 2) return '#2196F3';
    return '#FF9800';
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#4CAF50" size="small" />
        <Text style={styles.loadingText}>Initializing delivery tracking...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getDeliveryStatusIcon()} 
            size={24} 
            color={getStatusColor()} 
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getDeliveryStatusText()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.trackingButton, tracking && styles.trackingButtonActive]}
          onPress={tracking ? stopTracking : startTracking}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={tracking ? 'pause' : 'play'} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.trackingButtonText}>
            {tracking ? 'Stop' : 'Track'}
          </Text>
        </TouchableOpacity>
      </View>

      {deliveryEstimate && (
        <View style={styles.estimateContainer}>
          <View style={styles.estimateItem}>
            <Ionicons name="location" size={16} color="#666666" />
            <Text style={styles.estimateText}>
              {deliveryEstimate.zone || 'Unknown area'}
            </Text>
          </View>
          
          <View style={styles.estimateItem}>
            <Ionicons name="time" size={16} color="#666666" />
            <Text style={styles.estimateText}>
              {deliveryEstimate.estimatedTime || 'Calculating...'}
            </Text>
          </View>
          
          <View style={styles.estimateItem}>
            <Ionicons name="card" size={16} color="#666666" />
            <Text style={styles.estimateText}>
              ₦{deliveryEstimate.fee || 0} delivery fee
            </Text>
          </View>
        </View>
      )}

      {deliveryInfo && (
        <View style={styles.deliveryInfoContainer}>
          <View style={styles.deliveryInfoItem}>
            <Text style={styles.infoLabel}>Distance:</Text>
            <Text style={styles.infoValue}>{deliveryInfo.distance} km</Text>
          </View>
          
          <View style={styles.deliveryInfoItem}>
            <Text style={styles.infoLabel}>ETA:</Text>
            <Text style={styles.infoValue}>{deliveryInfo.estimatedTime} min</Text>
          </View>
        </View>
      )}

      {userLocation && (
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={14} color="#999999" />
          <Text style={styles.locationText}>
            Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trackingButtonActive: {
    backgroundColor: '#F44336',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  estimateContainer: {
    marginBottom: 16,
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  estimateText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  deliveryInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  deliveryInfoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
});

export default DeliveryTracker;