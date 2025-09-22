// src/screens/deliveries/DeliveryDetailScreen.js - Individual delivery details with map
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Services
import driverApiService from "../../services/driverApi";

// Constants for map
const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Custom Driver Marker Component
const DriverMarker = ({ coordinate, styles }) => {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.driverMarkerContainer}>
        <View style={styles.driverMarker}>
          <Ionicons name="car" size={16} color="white" />
        </View>
      </View>
    </Marker>
  );
};

// Custom Location Marker Component
const LocationMarker = ({ coordinate, type, styles }) => {
  const isPickup = type === 'pickup';
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.locationMarkerContainer}>
        <View style={[styles.locationMarker, { backgroundColor: isPickup ? '#4CAF50' : '#FF8C42' }]}>
          <Ionicons name={isPickup ? 'restaurant' : 'home'} size={14} color="white" />
        </View>
        <View style={[styles.locationMarkerTip, { borderTopColor: isPickup ? '#4CAF50' : '#FF8C42' }]} />
      </View>
    </Marker>
  );
};

const DeliveryDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { delivery, deliveryId, assignmentId, assignment } = route.params || {};
  const { driver } = useDriverAuth();
  
  // State
  const [deliveryDetails, setDeliveryDetails] = useState(delivery || assignment || null);
  const [loading, setLoading] = useState(!(delivery || assignment));
  const [refreshing, setRefreshing] = useState(false);
  
  // Map state
  const mapRef = useRef(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ distance: null, duration: null });
  
  // UI state
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    if (!deliveryDetails && (deliveryId || assignmentId)) {
      loadDeliveryDetails();
    }
    if (deliveryDetails) {
      initializeMapData();
    }
  }, [deliveryId, assignmentId, deliveryDetails]);

  // Periodic location updates for active deliveries
  useEffect(() => {
    if (!deliveryDetails || deliveryDetails?.status === 'delivered') return;
    
    const updateLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setDriverLocation(newLocation);
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Update location every 30 seconds for active deliveries
    const interval = setInterval(updateLocation, 30000);
    
    return () => clearInterval(interval);
  }, [deliveryDetails?.status]);
  
  const initializeMapData = async () => {
    try {
      // Get current driver location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setDriverLocation(currentLocation);
        console.log('📍 Driver location:', currentLocation);
      }
      
      // Set pickup location (chef/kitchen location) - support multiple data structures
      let pickup = null;
      if (deliveryDetails?.pickupLocation?.coordinates) {
        pickup = {
          latitude: deliveryDetails.pickupLocation.coordinates[1],
          longitude: deliveryDetails.pickupLocation.coordinates[0],
        };
      } else if (deliveryDetails?.chef?.location?.coordinates) {
        pickup = {
          latitude: deliveryDetails.chef.location.coordinates[1],
          longitude: deliveryDetails.chef.location.coordinates[0],
        };
      } else if (deliveryDetails?.chef?.latitude && deliveryDetails?.chef?.longitude) {
        pickup = {
          latitude: deliveryDetails.chef.latitude,
          longitude: deliveryDetails.chef.longitude,
        };
      }
      
      if (pickup) {
        setPickupLocation(pickup);
        console.log('🏪 Pickup location:', pickup);
      }
      
      // Set delivery location - support multiple data structures
      let delivery = null;
      if (deliveryDetails?.deliveryLocation?.coordinates) {
        delivery = {
          latitude: deliveryDetails.deliveryLocation.coordinates[1],
          longitude: deliveryDetails.deliveryLocation.coordinates[0],
        };
      } else if (deliveryDetails?.customer?.location?.coordinates) {
        delivery = {
          latitude: deliveryDetails.customer.location.coordinates[1],
          longitude: deliveryDetails.customer.location.coordinates[0],
        };
      } else if (deliveryDetails?.customer?.latitude && deliveryDetails?.customer?.longitude) {
        delivery = {
          latitude: deliveryDetails.customer.latitude,
          longitude: deliveryDetails.customer.longitude,
        };
      }
      
      if (delivery) {
        setDeliveryLocation(delivery);
        console.log('🏠 Delivery location:', delivery);
      }
      
      // Set initial map region based on current status and available locations
      const deliveryStatus = deliveryDetails?.status?.toLowerCase();
      let initialRegion = null;
      
      if (deliveryStatus === 'assigned' || deliveryStatus === 'pending') {
        // Focus on pickup location when starting
        initialRegion = pickup || delivery;
      } else if (deliveryStatus === 'picked_up' || deliveryStatus === 'en_route') {
        // Focus on delivery location when picked up
        initialRegion = delivery || pickup;
      } else {
        // Default to delivery location
        initialRegion = delivery || pickup;
      }
      
      if (initialRegion) {
        setRegion({
          ...initialRegion,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
      
      // Fetch route if we have both locations
      if (pickup && delivery) {
        await fetchRoute(pickup, delivery);
      }
      
    } catch (error) {
      console.error('Error initializing map data:', error);
    }
  };
  
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  const fetchRoute = async (origin, destination) => {
    try {
      // Calculate basic distance and estimated time
      const distance = calculateDistance(origin, destination);
      const estimatedTime = Math.ceil(distance * 3); // Rough estimate: 3 min per km in city
      
      setRouteInfo({
        distance: distance.toFixed(1),
        duration: estimatedTime
      });
      
      // For now, create a simple straight line route
      // In production, you'd want to use the Google Directions API
      const routeCoords = [origin, destination];
      setRouteCoordinates(routeCoords);
      
      console.log('🛣️ Route info:', { distance: distance.toFixed(1), duration: estimatedTime });
      
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteCoordinates([origin, destination]);
    }
  };

  const getCurrentRouteInfo = () => {
    const currentStep = getCurrentStep();
    const status = deliveryDetails?.status?.toLowerCase();
    
    if (!driverLocation) return { distance: '---', duration: '---' };
    
    if (currentStep === 'pickup' && pickupLocation) {
      const distance = calculateDistance(driverLocation, pickupLocation);
      const duration = Math.ceil(distance * 3);
      return { distance: distance.toFixed(1), duration: duration };
    } else if (currentStep === 'delivery' && deliveryLocation) {
      const distance = calculateDistance(driverLocation, deliveryLocation);
      const duration = Math.ceil(distance * 3);
      return { distance: distance.toFixed(1), duration: duration };
    }
    
    return routeInfo;
  };
  
  const fitMapToMarkers = () => {
    if (mapRef.current && mapReady) {
      const coordinates = [driverLocation, pickupLocation, deliveryLocation].filter(Boolean);
      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }
    }
  };

  const centerOnDriver = () => {
    if (mapRef.current && driverLocation) {
      setRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  const showCurrentRoute = () => {
    const currentStep = getCurrentStep();
    if (driverLocation && currentStep === 'pickup' && pickupLocation) {
      navigateToLocation(pickupLocation);
    } else if (driverLocation && currentStep === 'delivery' && deliveryLocation) {
      navigateToLocation(deliveryLocation);
    } else {
      fitMapToMarkers();
    }
  };
  
  useEffect(() => {
    if (mapReady) {
      fitMapToMarkers();
    }
  }, [mapReady, driverLocation, pickupLocation, deliveryLocation]);

  const loadDeliveryDetails = async () => {
    try {
      const id = assignmentId || deliveryId || deliveryDetails?._id;
      console.log('🔍 Loading delivery details for ID:', id);
      
      const response = await driverApiService.getDeliveryDetails(id);
      
      console.log('📦 Delivery details response:', response);
      
      if (response.success) {
        setDeliveryDetails(response.data);
      } else {
        console.error('❌ Failed to load delivery details:', response);
        showError('Failed to load delivery details');
      }
    } catch (error) {
      console.error('❌ Error loading delivery details:', error);
      showError('Failed to load delivery details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveryDetails();
  };

  const navigateToLocation = (location, address) => {
    if (!location) {
      showError('Location not available');
      return;
    }

    // Show full map for navigation focused on current destination
    setShowFullMap(true);

    // Set region to focus on the destination based on current step
    const currentStep = getCurrentStep();
    const targetLocation = currentStep === 'pickup' ? pickupLocation : deliveryLocation;
    
    if (targetLocation) {
      setRegion({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });

      // Fit map to show both driver and current destination
      setTimeout(() => {
        if (mapRef.current && driverLocation) {
          const coordinates = [driverLocation, targetLocation];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 150, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }, 500);
    }
  };

  const openExternalNavigation = (destination) => {
    if (!destination) {
      showError('Address not available');
      return;
    }

    const encodedAddress = encodeURIComponent(destination);
    const mapsUrl = `https://maps.google.com/?daddr=${encodedAddress}`;
    
    Alert.alert(
      'External Navigation',
      'Open in external maps app?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open External', 
          onPress: () => Linking.openURL(mapsUrl) 
        }
      ]
    );
  };

  const callContact = (phone, name) => {
    if (phone) {
      Alert.alert(
        `Call ${name}`,
        `Do you want to call ${name} at ${phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => Linking.openURL(`tel:${phone}`) 
          }
        ]
      );
    } else {
      showError(`${name} contact not available`);
    }
  };

  const getMealPlanImage = () => {
    if (deliveryDetails?.image) return { uri: deliveryDetails.image };
    if (deliveryDetails?.mealPlan?.image) return { uri: deliveryDetails.mealPlan.image };
    if (deliveryDetails?.orderItems?.image) return { uri: deliveryDetails.orderItems.image };

    const planName = (
      deliveryDetails?.orderItems?.planName ||
      deliveryDetails?.mealPlan?.name ||
      ""
    ).toLowerCase();

    if (planName.includes("fitfuel") || planName.includes("fit fuel")) {
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    } else if (planName.includes("wellness") || planName.includes("healthy")) {
      return require("../../assets/images/meal-plans/wellness-hub.jpg");
    } else if (planName.includes("recharge") || planName.includes("energy")) {
      return require("../../assets/images/meal-plans/recharge.jpg");
    } else if (planName.includes("family") || planName.includes("healthyfam")) {
      return require("../../assets/images/meal-plans/healthyfam.jpg");
    }

    return require("../../assets/images/meal-plans/fitfuel.jpg");
  };

  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'assigned': return colors.info;
      case 'picked_up': return colors.primary;
      case 'en_route': return colors.primary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };
  
  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending Pickup';
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'en_route': return 'En Route';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };
  
  const handleStatusUpdate = async (newStatus) => {
    try {
      // API call to update delivery status
      const response = await driverApiService.updateDeliveryStatus(
        deliveryDetails._id || assignmentId,
        newStatus
      );
      
      if (response.success) {
        setDeliveryDetails(prev => ({ ...prev, status: newStatus }));
        showSuccess(`Status updated to ${getStatusText(newStatus)}`);
      } else {
        showError('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to update status');
    }
  };
  
  const getNextAction = () => {
    const status = deliveryDetails?.status?.toLowerCase();
    switch (status) {
      case 'assigned':
      case 'pending':
        return { 
          text: 'Confirm Pickup', 
          action: () => handleStatusUpdate('picked_up'),
          color: colors.success,
          icon: 'checkmark-circle',
          description: 'Mark order as picked up from kitchen'
        };
      case 'picked_up':
      case 'en_route':
        return { 
          text: 'Confirm Delivery', 
          action: () => handleStatusUpdate('delivered'),
          color: colors.primary,
          icon: 'checkmark-done',
          description: 'Mark order as delivered to customer'
        };
      default:
        return null;
    }
  };

  const getCurrentStep = () => {
    const status = deliveryDetails?.status?.toLowerCase();
    switch (status) {
      case 'assigned':
      case 'pending':
        return 'pickup';
      case 'picked_up':
      case 'en_route':
        return 'delivery';
      case 'delivered':
        return 'completed';
      default:
        return 'pickup';
    }
  };

  const getStepStatus = (step) => {
    const current = getCurrentStep();
    const status = deliveryDetails?.status?.toLowerCase();
    
    if (step === 'pickup') {
      return ['picked_up', 'en_route', 'delivered'].includes(status) ? 'completed' : 
             ['assigned', 'pending'].includes(status) ? 'active' : 'pending';
    } else if (step === 'delivery') {
      return status === 'delivered' ? 'completed' :
             ['picked_up', 'en_route'].includes(status) ? 'active' : 'pending';
    }
    return 'pending';
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading delivery details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deliveryDetails) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Delivery Not Found</Text>
          <Text style={styles(colors).errorSubtitle}>
            The delivery details could not be loaded
          </Text>
          <TouchableOpacity
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completedDateTime = formatDateTime(deliveryDetails.completedAt || deliveryDetails.updatedAt);
  
  const renderCompactMap = () => (
    <TouchableOpacity 
      style={styles(colors).compactMapContainer}
      onPress={() => setShowFullMap(true)}
    >
      {region ? (
        <MapView
          style={styles(colors).compactMap}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {driverLocation && (
            <DriverMarker coordinate={driverLocation} styles={styles(colors)} />
          )}
          {pickupLocation && (
            <LocationMarker coordinate={pickupLocation} type="pickup" styles={styles(colors)} />
          )}
          {deliveryLocation && (
            <LocationMarker coordinate={deliveryLocation} type="delivery" styles={styles(colors)} />
          )}
        </MapView>
      ) : (
        <View style={styles(colors).mapPlaceholder}>
          <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles(colors).mapOverlay}>
        <Text style={styles(colors).mapOverlayText}>Tap to view full map</Text>
        <Ionicons name="expand-outline" size={16} color={colors.primary} />
      </View>
      
      {/* Live Route Info */}
      <View style={styles(colors).liveRouteInfo}>
        <View style={styles(colors).routeInfoItem}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={styles(colors).routeInfoText}>{getCurrentRouteInfo().distance} km</Text>
        </View>
        <View style={styles(colors).routeInfoItem}>
          <Ionicons name="time" size={14} color={colors.primary} />
          <Text style={styles(colors).routeInfoText}>{getCurrentRouteInfo().duration} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFullMap = () => (
    <View style={styles(colors).fullMapContainer}>
      <View style={styles(colors).fullMapHeader}>
        <TouchableOpacity
          style={styles(colors).closeMapButton}
          onPress={() => setShowFullMap(false)}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles(colors).mapHeaderCenter}>
          <Text style={styles(colors).fullMapTitle}>Navigation</Text>
          <Text style={styles(colors).currentStep}>
            {getCurrentStep() === 'pickup' ? 'To Kitchen' : 
             getCurrentStep() === 'delivery' ? 'To Customer' : 'Complete'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles(colors).fitMapButton}
          onPress={fitMapToMarkers}
        >
          <Ionicons name="expand-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {region ? (
        <MapView
          ref={mapRef}
          style={styles(colors).fullMap}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Route Line */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#FF8C42"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* Driver Marker */}
          {driverLocation && (
            <DriverMarker coordinate={driverLocation} styles={styles(colors)} />
          )}
          
          {/* Current Destination Marker */}
          {getCurrentStep() === 'pickup' && pickupLocation && (
            <LocationMarker coordinate={pickupLocation} type="pickup" styles={styles(colors)} />
          )}
          {getCurrentStep() === 'delivery' && deliveryLocation && (
            <LocationMarker coordinate={deliveryLocation} type="delivery" styles={styles(colors)} />
          )}
        </MapView>
      ) : (
        <View style={styles(colors).mapPlaceholder}>
          <Ionicons name="map-outline" size={80} color={colors.textSecondary} />
          <Text style={styles(colors).mapPlaceholderTitle}>Loading Map...</Text>
        </View>
      )}

      {/* Map Control Buttons */}
      <View style={styles(colors).mapControlButtons}>
        <TouchableOpacity
          style={styles(colors).mapControlButton}
          onPress={centerOnDriver}
        >
          <Ionicons name="locate" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles(colors).mapControlButton}
          onPress={fitMapToMarkers}
        >
          <Ionicons name="expand-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Floating Bottom Details Card */}
      <View style={styles(colors).floatingBottomCard}>
        {/* Delivery Status Card */}
        <View style={styles(colors).deliveryStatusCard}>
          <View style={styles(colors).statusHeader}>
            <View style={styles(colors).statusIconContainer}>
              <Ionicons 
                name={getCurrentStep() === 'pickup' ? 'restaurant' : 'home'} 
                size={24} 
                color={colors.primary} 
              />
            </View>
            <View style={styles(colors).statusInfo}>
              <Text style={styles(colors).statusLabel}>
                {getCurrentStep() === 'pickup' ? 'Picking up from Kitchen' : 'Delivering to Customer'}
              </Text>
              <Text style={styles(colors).statusETA}>
                {getCurrentRouteInfo().distance} km • {getCurrentRouteInfo().duration} min
              </Text>
            </View>
            <View style={styles(colors).statusBadge}>
              <Text style={styles(colors).statusText}>
                {getStatusText(deliveryDetails?.status)}
              </Text>
            </View>
          </View>

          {/* Current Destination Details */}
          <View style={styles(colors).destinationDetails}>
            <View style={styles(colors).destinationHeader}>
              <Ionicons 
                name={getCurrentStep() === 'pickup' ? 'location' : 'home'} 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles(colors).destinationLabel}>
                {getCurrentStep() === 'pickup' ? 'Pickup Location' : 'Delivery Location'}
              </Text>
            </View>
            <Text style={styles(colors).destinationAddress} numberOfLines={2}>
              {getCurrentStep() === 'pickup' 
                ? (deliveryDetails?.pickupLocation?.address || 
                   deliveryDetails?.chef?.kitchenAddress || 
                   deliveryDetails?.chef?.address || 'Kitchen Address')
                : (deliveryDetails?.deliveryLocation?.address || 
                   deliveryDetails?.deliveryAddress || 
                   deliveryDetails?.customer?.address || 'Delivery Address')
              }
            </Text>

            {/* Contact Actions */}
            <View style={styles(colors).contactActions}>
              {getCurrentStep() === 'pickup' && deliveryDetails?.chef?.phone && (
                <TouchableOpacity 
                  style={styles(colors).contactActionButton}
                  onPress={() => callContact(deliveryDetails.chef.phone, 'Chef')}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text style={styles(colors).contactActionText}>Call Kitchen</Text>
                </TouchableOpacity>
              )}
              {getCurrentStep() === 'delivery' && deliveryDetails?.customer?.phone && (
                <TouchableOpacity 
                  style={styles(colors).contactActionButton}
                  onPress={() => callContact(deliveryDetails.customer.phone, 'Customer')}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text style={styles(colors).contactActionText}>Call Customer</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles(colors).externalNavButton}
                onPress={() => openExternalNavigation(
                  getCurrentStep() === 'pickup' 
                    ? deliveryDetails?.pickupLocation?.address 
                    : deliveryDetails?.deliveryLocation?.address
                )}
              >
                <Ionicons name="navigate" size={16} color={colors.surface} />
                <Text style={styles(colors).externalNavText}>External Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      
    </View>
  );
  
  if (showFullMap) {
    return (
      <SafeAreaView style={styles(colors).container}>
        {renderFullMap()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles(colors).backButton}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Delivery Details</Text>
          <Text style={styles(colors).deliveryId}>
            #{deliveryDetails?.orderNumber || deliveryDetails?._id?.slice(-6) || 'Loading...'}
          </Text>
        </View>

        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: getStatusColor(deliveryDetails?.status) }
          ]}
        >
          <Text style={styles(colors).statusBadgeText}>
            {getStatusText(deliveryDetails?.status)}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles(colors).content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Highlight */}
        <View style={styles(colors).earningsHighlight}>
          <View style={styles(colors).earningsContent}>
            <Ionicons name="wallet" size={24} color={colors.primary} />
            <View style={styles(colors).earningsInfo}>
              <Text style={styles(colors).earningsLabel}>You'll earn</Text>
              <Text style={styles(colors).earningsAmount}>
                {formatCurrency(deliveryDetails?.totalEarnings || 2500)}
              </Text>
            </View>
          </View>
        </View>

        {/* Compact Map */}
        {renderCompactMap()}

        {/* Route Summary */}
        <View style={styles(colors).routeCard}>
          {/* Step 1: Pickup */}
          <View style={styles(colors).routeStep}>
            <View style={[
              styles(colors).stepIcon, 
              { 
                backgroundColor: getStepStatus('pickup') === 'completed' ? colors.success : 
                                getStepStatus('pickup') === 'active' ? colors.primary + '20' : colors.background,
                borderColor: getStepStatus('pickup') === 'completed' ? colors.success : 
                            getStepStatus('pickup') === 'active' ? colors.primary : colors.border
              }
            ]}>
              {getStepStatus('pickup') === 'completed' ? (
                <Ionicons name="checkmark" size={18} color="white" />
              ) : (
                <Ionicons name="restaurant" size={18} color={
                  getStepStatus('pickup') === 'active' ? colors.primary : colors.textSecondary
                } />
              )}
            </View>
            <View style={styles(colors).stepContent}>
              <View style={styles(colors).stepHeader}>
                <Text style={[
                  styles(colors).stepTitle,
                  { color: getStepStatus('pickup') === 'active' ? colors.primary : colors.text }
                ]}>
                  1. Pickup from Kitchen
                </Text>
                {getStepStatus('pickup') === 'completed' && (
                  <View style={styles(colors).completedBadge}>
                    <Text style={styles(colors).completedText}>Completed</Text>
                  </View>
                )}
                {getStepStatus('pickup') === 'active' && (
                  <View style={styles(colors).activeBadge}>
                    <Text style={styles(colors).activeText}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={styles(colors).stepAddress} numberOfLines={2}>
                {deliveryDetails?.pickupLocation?.address || 
                 deliveryDetails?.chef?.kitchenAddress || 
                 deliveryDetails?.chef?.address || 
                 'Kitchen Address'}
              </Text>
              <View style={styles(colors).stepActions}>
                {deliveryDetails?.chef?.phone && (
                  <TouchableOpacity 
                    style={styles(colors).contactButton}
                    onPress={() => callContact(deliveryDetails.chef.phone, 'Chef')}
                  >
                    <Ionicons name="call" size={14} color={colors.primary} />
                    <Text style={styles(colors).contactText}>Call Kitchen</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles(colors).navigateButton}
                  onPress={() => navigateToLocation(
                    pickupLocation,
                    deliveryDetails?.pickupLocation?.address || 
                    deliveryDetails?.chef?.kitchenAddress ||
                    deliveryDetails?.chef?.address
                  )}
                >
                  <Ionicons name="navigate" size={14} color={colors.primary} />
                  <Text style={styles(colors).navigateText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[
            styles(colors).routeConnector,
            { backgroundColor: getStepStatus('pickup') === 'completed' ? colors.success : colors.border }
          ]} />

          {/* Step 2: Delivery */}
          <View style={styles(colors).routeStep}>
            <View style={[
              styles(colors).stepIcon,
              { 
                backgroundColor: getStepStatus('delivery') === 'completed' ? colors.success : 
                                getStepStatus('delivery') === 'active' ? colors.primary + '20' : colors.background,
                borderColor: getStepStatus('delivery') === 'completed' ? colors.success : 
                            getStepStatus('delivery') === 'active' ? colors.primary : colors.border
              }
            ]}>
              {getStepStatus('delivery') === 'completed' ? (
                <Ionicons name="checkmark" size={18} color="white" />
              ) : (
                <Ionicons name="home" size={18} color={
                  getStepStatus('delivery') === 'active' ? colors.primary : colors.textSecondary
                } />
              )}
            </View>
            <View style={styles(colors).stepContent}>
              <View style={styles(colors).stepHeader}>
                <Text style={[
                  styles(colors).stepTitle,
                  { color: getStepStatus('delivery') === 'active' ? colors.primary : colors.text }
                ]}>
                  2. Deliver to Customer
                </Text>
                {getStepStatus('delivery') === 'completed' && (
                  <View style={styles(colors).completedBadge}>
                    <Text style={styles(colors).completedText}>Completed</Text>
                  </View>
                )}
                {getStepStatus('delivery') === 'active' && (
                  <View style={styles(colors).activeBadge}>
                    <Text style={styles(colors).activeText}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={styles(colors).stepAddress} numberOfLines={2}>
                {deliveryDetails?.deliveryLocation?.address || 
                 deliveryDetails?.deliveryAddress || 
                 deliveryDetails?.customer?.address ||
                 'Delivery Address'}
              </Text>
              <View style={styles(colors).stepActions}>
                {deliveryDetails?.customer?.phone && (
                  <TouchableOpacity 
                    style={styles(colors).contactButton}
                    onPress={() => callContact(deliveryDetails.customer.phone, 'Customer')}
                  >
                    <Ionicons name="call" size={14} color={colors.primary} />
                    <Text style={styles(colors).contactText}>Call Customer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles(colors).navigateButton}
                  onPress={() => navigateToLocation(
                    deliveryLocation,
                    deliveryDetails?.deliveryLocation?.address || 
                    deliveryDetails?.deliveryAddress ||
                    deliveryDetails?.customer?.address
                  )}
                >
                  <Ionicons name="navigate" size={14} color={colors.primary} />
                  <Text style={styles(colors).navigateText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles(colors).orderCard}>
          <View style={styles(colors).cardHeader}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={styles(colors).cardTitle}>Order Summary</Text>
          </View>
          
          <View style={styles(colors).orderRow}>
            <Text style={styles(colors).orderLabel}>Order ID</Text>
            <Text style={styles(colors).orderValue}>
              #{deliveryDetails?.orderNumber || deliveryDetails?._id?.slice(-6) || 'N/A'}
            </Text>
          </View>
          
          <View style={styles(colors).orderRow}>
            <Text style={styles(colors).orderLabel}>Customer</Text>
            <Text style={styles(colors).orderValue}>
              {deliveryDetails?.customer?.name || 'Customer'}
            </Text>
          </View>
          
          <View style={styles(colors).orderRow}>
            <Text style={styles(colors).orderLabel}>Total Amount</Text>
            <Text style={styles(colors).orderValue}>
              {formatCurrency(deliveryDetails?.totalAmount || 0)}
            </Text>
          </View>
        </View>

        {/* Special Instructions */}
        {deliveryDetails?.instructions && (
          <View style={styles(colors).instructionsCard}>
            <View style={styles(colors).cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.warning} />
              <Text style={styles(colors).cardTitle}>Special Instructions</Text>
            </View>
            <Text style={styles(colors).instructionsText}>
              {deliveryDetails.instructions}
            </Text>
          </View>
        )}

        {/* Quick Navigation */}
        <View style={styles(colors).quickNavSection}>
          <TouchableOpacity
            style={styles(colors).quickNavButton}
            onPress={showCurrentRoute}
          >
            <Ionicons name="navigate" size={20} color={colors.primary} />
            <View style={styles(colors).quickNavContent}>
              <Text style={styles(colors).quickNavTitle}>Navigate to {getCurrentStep() === 'pickup' ? 'Kitchen' : 'Customer'}</Text>
              <Text style={styles(colors).quickNavSubtitle}>
                {getCurrentRouteInfo().distance} km • {getCurrentRouteInfo().duration} min away
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        {getNextAction() && (
          <View style={styles(colors).actionSection}>
            <TouchableOpacity
              style={[styles(colors).primaryActionButton, { backgroundColor: getNextAction().color }]}
              onPress={getNextAction().action}
            >
              <Ionicons name={getNextAction().icon} size={24} color="white" />
              <Text style={styles(colors).primaryActionText}>{getNextAction().text}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textMuted,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      color: colors.text,
    },
    errorSubtitle: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    deliveryId: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },

    // Earnings Highlight
    earningsHighlight: {
      backgroundColor: colors.primary + '10',
      borderRadius: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    earningsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
    },
    earningsInfo: {
      marginLeft: 12,
    },
    earningsLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    earningsAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
    },

    // Compact Map
    compactMapContainer: {
      height: 200,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      position: 'relative',
    },
    compactMap: {
      flex: 1,
    },
    mapOverlay: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: colors.surface + 'E6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    mapOverlayText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
    },
    liveRouteInfo: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      gap: 12,
    },
    routeInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface + 'E6',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    routeInfoText: {
      fontSize: 11,
      color: colors.text,
      fontWeight: '600',
    },

    // Full Map
    fullMapContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    fullMapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: 'transparent',
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
    closeMapButton: {
      padding: 8,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    mapHeaderCenter: {
      flex: 1,
      alignItems: 'center',
    },
    fullMapTitle: {
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '600',
      color: colors.text,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 15,
    },
    currentStep: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 2,
    },
    fitMapButton: {
      padding: 8,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    fullMap: {
      flex: 1,
    },
    mapControlButtons: {
      position: 'absolute',
      top: 120,
      right: 16,
      zIndex: 1000,
      flexDirection: 'column',
      gap: 8,
    },
    mapControlButton: {
      width: 40,
      height: 40,
      backgroundColor: colors.surface,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },

    // Route Card
    routeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    routeStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    stepIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    stepContent: {
      flex: 1,
      marginRight: 12,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    stepAddress: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    stepActions: {
      flexDirection: 'row',
      gap: 16,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    contactText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    navigateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    navigateText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    completedBadge: {
      backgroundColor: colors.success + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    completedText: {
      fontSize: 10,
      color: colors.success,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    activeBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    activeText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    navigationIcon: {
      padding: 8,
    },
    routeConnector: {
      width: 2,
      height: 24,
      backgroundColor: colors.border,
      marginLeft: 17,
      marginVertical: 12,
    },

    // Order Card
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    orderLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    orderValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },

    // Instructions Card
    instructionsCard: {
      backgroundColor: colors.warning + '10',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.warning + '20',
    },
    instructionsText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginTop: 8,
    },

    // Quick Navigation Section
    quickNavSection: {
      marginVertical: 16,
    },
    quickNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    quickNavContent: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    quickNavTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    quickNavSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    // Action Section
    actionSection: {
      marginVertical: 16,
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    primaryActionText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },

    // Card Header Styles
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
    },

    // Map Components
    mapPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    mapPlaceholderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },

    // Custom Map Marker Styles
    driverMarkerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    driverMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
    },
    locationMarkerContainer: {
      alignItems: 'center',
    },
    locationMarker: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    locationMarkerTip: {
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      marginTop: -1,
    },

    // Floating Bottom Card for Map Screen
    floatingBottomCard: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: 'transparent',
      zIndex: 1000,
    },
    deliveryStatusCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    statusInfo: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    statusETA: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    statusBadge: {
      backgroundColor: colors.success + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
      textTransform: 'uppercase',
    },
    destinationDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    destinationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    destinationLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginLeft: 6,
    },
    destinationAddress: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 12,
    },
    contactActions: {
      flexDirection: 'row',
      gap: 12,
    },
    contactActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    contactActionText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    externalNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      marginLeft: 'auto',
    },
    externalNavText: {
      fontSize: 12,
      color: colors.surface,
      fontWeight: '500',
    },

    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default DeliveryDetailScreen;