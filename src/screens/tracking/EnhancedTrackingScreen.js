import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

// Core imports
import { useTheme } from '../../styles/theme';
import enhancedDriverTrackingService from '../../services/enhancedDriverTrackingService';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const EnhancedTrackingScreen = ({ route, navigation }) => {
  const { orderId, order } = route.params || {};
  const { colors } = useTheme();
  
  // Map and location state
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Driver and order state
  const [driverInfo, setDriverInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(order || null);
  const [eta, setEta] = useState(null);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      enhancedDriverTrackingService.unsubscribeFromOrder(orderId);
    };
  }, [orderId]);

  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to track your order.');
        navigation.goBack();
        return;
      }

      // Get user's current location
      const location = await Location.getCurrentPositionAsync({});
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userCoords);

      // Set initial map region
      setRegion({
        ...userCoords,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });

      // Initialize driver tracking
      await startDriverTracking();
    } catch (error) {
      console.error('❌ Error initializing tracking:', error);
      setConnectionError('Failed to initialize tracking');
      initializeFallbackMode();
    } finally {
      setLoading(false);
    }
  };

  const startDriverTracking = async () => {
    try {
      // Try to connect to enhanced driver tracking service
      await enhancedDriverTrackingService.connect();
      setIsConnected(true);
      setConnectionError(null);
      
      // Extract driver info from order if available and set it immediately
      const realDriverInfo = orderInfo?.driverAssignment?.driver || order?.driverAssignment?.driver;
      if (realDriverInfo) {
        setDriverInfo({
          name: realDriverInfo.fullName || 'Choma Riders',
          fullName: realDriverInfo.fullName || 'Choma Riders',
          phone: realDriverInfo.phone || realDriverInfo.phoneNumber,
          rating: realDriverInfo.rating || 4.5,
          profileImage: realDriverInfo.profileImage || null,
          vehicle: realDriverInfo.vehicle || 'Delivery Vehicle'
        });
      }

      // Subscribe to all tracking updates
      enhancedDriverTrackingService.subscribeToDriverLocation(orderId, (locationData) => {
        const { latitude, longitude } = locationData;
        const newDriverLocation = { latitude, longitude };
        setDriverLocation(newDriverLocation);
        
        // Update map view
        if (mapRef.current && userLocation) {
          const coordinates = [userLocation, newDriverLocation];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
            animated: true,
          });
        }
      }, userLocation);

      enhancedDriverTrackingService.subscribeToRoute(orderId, (routeData) => {
        if (routeData.coordinates && routeData.coordinates.length > 0) {
          setRouteCoordinates(routeData.coordinates);
        }
      });

      enhancedDriverTrackingService.subscribeToDriverInfo(orderId, (driverData) => {
        setDriverInfo(driverData);
      });

      enhancedDriverTrackingService.subscribeToETA(orderId, (etaData) => {
        setEta(etaData);
      }, userLocation);

      // Start mock updates for testing
      // if (__DEV__) {
      //   enhancedDriverTrackingService.startEnhancedMockUpdates(orderId, userLocation);
      // }

    } catch (error) {
      console.error('❌ Error starting enhanced driver tracking:', error);
      initializeFallbackMode();
      setConnectionError('Using offline mode - Live tracking unavailable');
      setIsConnected(false);
    }
  };

  const initializeFallbackMode = () => {
    console.log('🔄 Initializing fallback tracking mode...');
    
    // Extract real driver info from order if available
    const realDriverInfo = orderInfo?.driverAssignment?.driver;
    setDriverInfo({
      name: realDriverInfo?.fullName || 'Choma Riders',
      fullName: realDriverInfo?.fullName || 'Choma Riders',
      phone: realDriverInfo?.phone || realDriverInfo?.phoneNumber,
      rating: realDriverInfo?.rating || 4.5,
      profileImage: realDriverInfo?.profileImage || null,
      vehicle: realDriverInfo?.vehicle || 'Delivery Vehicle'
    });

    // Set mock driver location
    if (userLocation) {
      const mockDriverLocation = {
        latitude: userLocation.latitude + 0.005,
        longitude: userLocation.longitude + 0.005,
      };
      setDriverLocation(mockDriverLocation);
      
      // Set mock ETA
      setEta({
        estimatedMinutes: 12,
        distance: '2.5 km',
        arrivalTime: 'May 2022',
        status: 'On the way'
      });
    }
  };

  const handleCall = () => {
    const phoneNumber = driverInfo?.phone || driverInfo?.phoneNumber || orderInfo?.driverAssignment?.driver?.phone;
    if (phoneNumber) {
      console.log('📞 Calling driver:', phoneNumber);
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Info', 'Driver contact information not available');
    }
  };

  const handleMessage = () => {
    const phoneNumber = driverInfo?.phone || driverInfo?.phoneNumber || orderInfo?.driverAssignment?.driver?.phone;
    if (phoneNumber) {
      console.log('💬 Messaging driver:', phoneNumber);
      Linking.openURL(`sms:${phoneNumber}`);
    } else {
      Alert.alert('Info', 'Driver contact information not available');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading tracking...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Order #{orderInfo?.packageId || orderInfo?.orderNumber || orderId?.slice(-4).toUpperCase() || 'TX8778'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.locationText}>
            {orderInfo?.deliveryAddress?.split(',').pop()?.trim() || 'Lagos'}
          </Text>
        </View>
      </View>

      {/* Map Container - Takes up most of the screen */}
      <View style={styles.mapContainer}>
        {region && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            showsUserLocation={false}
            showsMyLocationButton={false}
            mapType="standard"
          >
            {/* Route Line - Orange dashed line from driver to destination */}
            {userLocation && driverLocation && (
              <Polyline
                coordinates={routeCoordinates.length > 0 ? routeCoordinates : [driverLocation, userLocation]}
                strokeColor="#FF8C42"
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            )}

            {/* Driver Location Marker (Triangle) */}
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                title="Driver Location"
                identifier="driver"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.driverTriangleMarker}>
                  <View style={styles.triangleUp} />
                </View>
              </Marker>
            )}

            {/* User Location Marker (Destination - Orange circle) */}
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="Delivery Location"
                identifier="destination"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.orangeCircle} />
                </View>
              </Marker>
            )}
          </MapView>
        )}

        {/* Map Labels */}
        <View style={styles.mapLabels}>
          <View style={[styles.mapLabel, { top: 80, left: 20 }]}>
            <Text style={styles.mapLabelText}>
              {orderInfo?.deliveryAddress?.split(',')[0]?.trim() || 'Pickup Location'}
            </Text>
          </View>
          <View style={[styles.mapLabel, { bottom: 200, right: 20 }]}>
            <Text style={styles.mapLabelText}>
              {orderInfo?.deliveryAddress?.split(',').slice(-2)[0]?.trim() || 'Delivery Location'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Card - Fixed at bottom */}
      <View style={styles.bottomCard}>
        <LinearGradient
          colors={['#2C2C54', '#40407A']}
          style={styles.driverCardGradient}
        >
          <View style={styles.driverCardHeader}>
            <View style={styles.driverLogo}>
              <View style={styles.logoCircle}>
                <View style={styles.logoInner}>
                  <View style={styles.logoPattern1} />
                  <View style={styles.logoPattern2} />
                  <View style={styles.logoPattern3} />
                </View>
              </View>
            </View>
            
            <View style={styles.driverNameSection}>
              <Text style={styles.driverName}>
                {driverInfo?.fullName || driverInfo?.name || 'Choma Riders'}
              </Text>
              <View style={styles.ratingSection}>
                {Array.from({ length: 5 }, (_, i) => {
                  const rating = driverInfo?.rating || 4.5;
                  const filled = i < Math.floor(rating);
                  const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5;
                  
                  return (
                    <Ionicons 
                      key={i} 
                      name={filled ? "star" : isHalf ? "star-half" : "star-outline"} 
                      size={12} 
                      color="#FFD700" 
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <Ionicons name="call" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Delivery Details */}
        <View style={styles.deliveryDetails}>
          <View style={styles.deliveryItem}>
            <View style={styles.timelineIcon}>
              <View style={styles.timelineDot} />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Estimated Delivery Date</Text>
              <Text style={styles.deliveryValue}>
                {orderInfo?.estimatedDelivery 
                  ? new Date(orderInfo.estimatedDelivery).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  : new Date().toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                }
              </Text>
              <Text style={styles.deliveryLocation}>
                {orderInfo?.deliveryAddress?.split(',')[0]?.trim() || 'Pickup Location'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.deliveryItem}>
            <View style={styles.timelineIcon}>
              <View style={[styles.timelineDot, { backgroundColor: '#333' }]} />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLocation}>
                {orderInfo?.deliveryAddress?.split(',').slice(-2).join(', ')?.trim() || 'Delivery Location'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.deliveryItem}>
            <View style={styles.companyIcon}>
              <Ionicons name="person-outline" size={20} color="#FF6B35" />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.companyName}>
                {driverInfo?.fullName || driverInfo?.name || orderInfo?.driverAssignment?.driver?.fullName || 'Driver'}
              </Text>
              <Text style={styles.companyValue}>
                ₦{(orderInfo?.totalAmount || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Connection Status */}
      {connectionError && (
        <View style={styles.statusBar}>
          <Ionicons name="wifi-outline" size={16} color="#FFF" />
          <Text style={styles.statusText}>{connectionError}</Text>
          <TouchableOpacity onPress={startDriverTracking}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
  },
  headerRight: {
    paddingRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLabels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  mapLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapLabelText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Destination marker (orange circle)
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF8C42',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  // Driver marker (blue triangle)
  driverTriangleMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  triangleUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2196F3',
    transform: [{ rotate: '180deg' }],
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  driverCardGradient: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverLogo: {
    marginRight: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoPattern1: {
    position: 'absolute',
    width: 20,
    height: 4,
    backgroundColor: '#FFF',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  logoPattern2: {
    position: 'absolute',
    width: 20,
    height: 4,
    backgroundColor: '#FFF',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  logoPattern3: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  driverNameSection: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryDetails: {
    padding: 20,
    paddingTop: 16,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineIcon: {
    width: 20,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF8C42',
  },
  timelineLine: {
    position: 'absolute',
    left: 26,
    top: 45,
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  companyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deliveryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  deliveryLocation: {
    fontSize: 14,
    color: '#666',
  },
  companyName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  companyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
    marginLeft: 56,
  },
  statusBar: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  retryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EnhancedTrackingScreen;