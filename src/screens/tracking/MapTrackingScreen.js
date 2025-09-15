import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Core imports
import { useTheme } from '../../styles/theme';
import { useAuth } from '../../hooks/useAuth';
import driverTrackingService from '../../services/driverTrackingService';
import { COLORS } from '../../utils/colors';

// Components
import DriverInfoCard from '../../components/tracking/DriverInfoCard';
import OrderSummaryCard from '../../components/tracking/OrderSummaryCard';
import ETACard from '../../components/tracking/ETACard';
import TrackingStatusBar from '../../components/tracking/TrackingStatusBar';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MapTrackingScreen = ({ route, navigation }) => {
  const { orderId, order } = route.params || {};
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  
  // Map and location state
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverRoute, setDriverRoute] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Driver and order state
  const [driverInfo, setDriverInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(order || null);
  const [trackingData, setTrackingData] = useState(null);
  const [eta, setEta] = useState(null);
  
  // UI state
  const [showDriverCard, setShowDriverCard] = useState(true);
  const [showOrderCard, setShowOrderCard] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      // Cleanup tracking when component unmounts
      driverTrackingService.stopTrackingOrder(orderId);
      driverTrackingService.removeListener(orderId, 'driver_location');
      driverTrackingService.removeListener(orderId, 'driver_info');
      driverTrackingService.removeListener(orderId, 'tracking_status');
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
      if (orderId) {
        await startDriverTracking(orderId);
      }
    } catch (error) {
      console.error('❌ Error initializing tracking:', error);
      setConnectionError('Failed to initialize tracking');
    } finally {
      setLoading(false);
    }
  };

  const startDriverTracking = async (orderId) => {
    try {
      // Extract driver info from order data if available
      const orderDriverInfo = order?.driverAssignment?.driver;
      if (orderDriverInfo) {
        setDriverInfo({
          _id: orderDriverInfo._id,
          fullName: orderDriverInfo.fullName,
          name: orderDriverInfo.fullName,
          phoneNumber: orderDriverInfo.phone,
          phone: orderDriverInfo.phone,
          rating: 4.8, // Default rating
          profileImage: null,
          vehicleInfo: {
            type: 'Motorcycle',
            plateNumber: 'ABC-123-XY',
            color: 'Black'
          }
        });
      }

      // Try to connect to enhanced driver tracking service
      const connected = await driverTrackingService.connect();
      if (!connected) {
        throw new Error('Failed to connect to tracking service');
      }
      setIsConnected(true);
      
      // Subscribe to driver location updates with user location for route calculations
      driverTrackingService.onLocationUpdate(orderId, (locationData) => {
        console.log('📍 Enhanced driver location update:', locationData);
        
        const { latitude, longitude, bearing, speed } = locationData;
        const newDriverLocation = { latitude, longitude };
        
        setDriverLocation(newDriverLocation);
        
        // Update driver route
        setDriverRoute(prev => [...prev, newDriverLocation].slice(-50)); // Keep last 50 points
        
        // Animate map to show both user and driver
        if (mapRef.current && userLocation) {
          const coordinates = [userLocation, newDriverLocation];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }
      }, userLocation);

      // Route updates are simplified in the new service

      // Subscribe to driver info updates
      driverTrackingService.onDriverInfo(orderId, (driverData) => {
        console.log('👤 Driver info update:', driverData);
        setDriverInfo(driverData);
      });

      // Subscribe to order updates
      driverTrackingService.onTrackingStatus(orderId, (statusData) => {
        console.log('📊 Status update:', statusData);
      });

      // Subscribe to enhanced ETA updates with traffic data
      driverTrackingService.onEtaUpdate(orderId, (etaData) => {
        console.log('⏰ ETA update:', etaData);
        setEta(etaData);
      });

      // Start tracking the order
      driverTrackingService.trackOrder(orderId);

    } catch (error) {
      console.error('❌ Error starting enhanced driver tracking:', error);
      
      // Fallback: Initialize with mock data and driver info from order
      initializeFallbackMode();
      setConnectionError('Using offline mode - Live tracking unavailable');
      setIsConnected(false);
    }
  };

  const initializeFallbackMode = () => {
    console.log('🔄 Initializing fallback tracking mode...');
    
    // Extract driver info from order if not already set
    const orderDriverInfo = order?.driverAssignment?.driver;
    if (orderDriverInfo && !driverInfo) {
      setDriverInfo({
        _id: orderDriverInfo._id,
        fullName: orderDriverInfo.fullName,
        name: orderDriverInfo.fullName,
        phoneNumber: orderDriverInfo.phone,
        phone: orderDriverInfo.phone,
        rating: 4.8,
        profileImage: null,
        vehicleInfo: {
          type: 'Motorcycle',
          plateNumber: 'ABC-123-XY',
          color: 'Black'
        }
      });
    }

    // Set mock driver location around Lagos
    if (userLocation) {
      const mockDriverLocation = {
        latitude: userLocation.latitude + 0.01, // Slightly offset from user
        longitude: userLocation.longitude + 0.01,
      };
      setDriverLocation(mockDriverLocation);
      
      // Set mock ETA
      setEta({
        estimatedMinutes: 15,
        distance: '2.1 km',
        status: 'on_time',
        arrivalTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString()
      });

      // Set mock tracking status
      setTrackingData({
        status: 'active',
        connectionStatus: 'offline_mode',
        lastUpdate: new Date().toISOString()
      });
    }
  };

  const handleMapReady = () => {
    setIsMapReady(true);
    if (region && mapRef.current) {
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }, 1000);
    }
  };

  const centerOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }, 1000);
    }
  };

  const fitToBoth = () => {
    if (userLocation && driverLocation && mapRef.current) {
      const coordinates = [userLocation, driverLocation];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
    }
  };

  const handleCallDriver = () => {
    if (driverInfo?.phoneNumber) {
      Linking.openURL(`tel:${driverInfo.phoneNumber}`);
    }
  };

  const handleMessageDriver = () => {
    if (driverInfo?.phoneNumber) {
      Linking.openURL(`sms:${driverInfo.phoneNumber}`);
    }
  };

  const toggleDriverCard = () => {
    const toValue = showDriverCard ? -200 : 0;
    setShowDriverCard(!showDriverCard);
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getMapStyle = () => {
    return isDark ? [
      {
        "elementType": "geometry",
        "stylers": [{"color": "#212121"}]
      },
      {
        "elementType": "labels.icon",
        "stylers": [{"visibility": "off"}]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#757575"}]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#212121"}]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{"color": "#757575"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#2c2c2c"}]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#8a8a8a"}]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#000000"}]
      }
    ] : [];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Initializing tracking...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (connectionError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Connection Error
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {connectionError}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: COLORS.primary }]}
            onPress={() => initializeTracking()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Track Order
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Order #{orderId?.slice(-6) || '------'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => startDriverTracking(orderId)}
        >
          <Ionicons name="refresh" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <TrackingStatusBar 
        isConnected={isConnected}
        trackingData={trackingData}
        colors={colors}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        {region && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            customMapStyle={getMapStyle()}
            onMapReady={handleMapReady}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="Your Location"
                identifier="user"
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerInner} />
                </View>
              </Marker>
            )}

            {/* Driver Location Marker */}
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                title={`${driverInfo?.name || 'Driver'}`}
                description="Your delivery driver"
                identifier="driver"
              >
                <View style={styles.driverMarker}>
                  <Ionicons name="car" size={20} color="#FFFFFF" />
                </View>
              </Marker>
            )}

            {/* Driver Route (historical path) */}
            {driverRoute.length > 1 && (
              <Polyline
                coordinates={driverRoute}
                strokeColor={COLORS.primary}
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}

            {/* Google Routes API route (enhanced route to user) */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={isDark ? '#4CAF50' : '#2196F3'}
                strokeWidth={4}
                lineDashPattern={[1]}
              />
            )}

            {/* Fallback route to user (if Google route not available) */}
            {userLocation && driverLocation && routeCoordinates.length === 0 && (
              <Polyline
                coordinates={[driverLocation, userLocation]}
                strokeColor={isDark ? '#FFEB3B' : '#FF9800'}
                strokeWidth={4}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>
        )}
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.cardBackground }]} onPress={centerOnUser}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.cardBackground }]} onPress={centerOnDriver}>
          <Ionicons name="car" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.cardBackground }]} onPress={fitToBoth}>
          <Ionicons name="resize" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ETA Card */}
      {eta && (
        <ETACard 
          eta={eta}
          colors={colors}
          onPress={() => setShowOrderCard(!showOrderCard)}
        />
      )}

      {/* Bottom Cards */}
      <View style={styles.bottomContainer}>
        {/* Order Summary Card */}
        {showOrderCard && orderInfo && (
          <OrderSummaryCard 
            order={orderInfo}
            colors={colors}
            onClose={() => setShowOrderCard(false)}
          />
        )}

        {/* Driver Info Card */}
        {driverInfo && (
          <Animated.View
            style={[
              styles.driverCardContainer,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <DriverInfoCard 
              driver={driverInfo}
              colors={colors}
              onCall={handleCallDriver}
              onMessage={handleMessageDriver}
              onToggle={toggleDriverCard}
              isExpanded={showDriverCard}
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 100,
    right: 16,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  driverCardContainer: {
    // Animated container for driver card
  },
});

export default MapTrackingScreen;