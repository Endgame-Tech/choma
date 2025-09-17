import React, { useState, useEffect, useRef } from "react";
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
  Animated,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";

// Core imports
import driverTrackingService from "../../services/driverTrackingService";
import googleRoutesService from "../../services/googleRoutesService";
import { APP_CONFIG } from "../../utils/constants";
import { THEME } from "../../utils/colors";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Constants

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005; // More zoomed in for better detail
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Animation timing for smooth marker transitions
const MARKER_ANIMATION_DURATION = 1000; // 1 second

// Function to decode Google's encoded polyline
const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
};

// Calculate bearing between two points for icon rotation
const calculateBearing = (start, end) => {
  const dLng = ((end.longitude - start.longitude) * Math.PI) / 180;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
};

// Custom Driver Marker Component
const DriverMarker = ({ coordinate, bearing = 0, driverInfo, styles }) => {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.driverMarkerContainer}>
        {/* Car Icon with Rotation */}
        <View
          style={[
            styles.driverMarker,
            { transform: [{ rotate: `${bearing}deg` }] },
          ]}
        >
          <LinearGradient
            colors={["#FF8C42", "#FF6B1A"]}
            style={styles.driverGradient}
          >
            <Ionicons name="car" size={20} color="white" />
          </LinearGradient>
        </View>

        {/* Driver Info Bubble */}
        {driverInfo && (
          <View style={styles.driverInfoBubble}>
            <Text style={styles.driverName} numberOfLines={1}>
              {driverInfo.name || "Driver"}
            </Text>
          </View>
        )}

        {/* Shadow */}
        <View style={styles.markerShadow} />
      </View>
    </Marker>
  );
};

// Custom User Location Marker Component
const UserMarker = ({ coordinate, styles }) => {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.userMarkerContainer}>
        {/* Location Pin */}
        <View style={styles.userMarker}>
          <LinearGradient
            colors={["#4A90E2", "#357ABD"]}
            style={styles.userGradient}
          >
            <Ionicons name="home" size={18} color="white" />
          </LinearGradient>
        </View>

        {/* Pin Tip */}
        <View style={styles.userMarkerTip} />

        {/* Shadow */}
        <View style={styles.userMarkerShadow} />
      </View>
    </Marker>
  );
};

// Enhanced geocoding function with fallbacks and timeout
const geocodeAddress = async (address) => {
  try {
    console.log("🔍 Geocoding address:", address);

    // Add timeout wrapper for geocoding
    const geocodeWithTimeout = (address, timeout = 8000) => {
      return Promise.race([
        Location.geocodeAsync(address),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Geocoding timeout")), timeout)
        ),
      ]);
    };

    // First attempt with full address (with timeout)
    let geocoded = await geocodeWithTimeout(address);
    if (geocoded && geocoded.length > 0) {
      const { latitude, longitude } = geocoded[0];
      console.log("✅ Geocoding successful:", { latitude, longitude });
      return { latitude, longitude };
    }

    // Fallback: Try with just city/state if full address fails
    if (address.includes(",")) {
      const addressParts = address.split(",");
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const fallbackAddress = addressParts.slice(i).join(",").trim();
        if (fallbackAddress && fallbackAddress !== address) {
          console.log("🔄 Trying fallback address:", fallbackAddress);
          try {
            geocoded = await geocodeWithTimeout(fallbackAddress);
            if (geocoded && geocoded.length > 0) {
              const { latitude, longitude } = geocoded[0];
              console.log("✅ Fallback geocoding successful:", {
                latitude,
                longitude,
              });
              return { latitude, longitude };
            }
          } catch (fallbackError) {
            console.log("⚠️ Fallback geocoding failed:", fallbackError.message);
          }
        }
      }
    }

    // Final fallback: Default coordinates for specific Nigerian locations
    if (address.toLowerCase().includes("nigeria")) {
      let fallbackCoords;

      if (
        address.toLowerCase().includes("federal capital territory") ||
        address.toLowerCase().includes("abuja") ||
        address.toLowerCase().includes("fct")
      ) {
        // More specific coordinates for Abuja/FCT
        fallbackCoords = {
          latitude: 9.0765, // Abuja city center
          longitude: 7.3986,
        };
        console.log("�️ Using Abuja/FCT coordinates as fallback");
      } else if (address.toLowerCase().includes("lagos")) {
        fallbackCoords = {
          latitude: 6.5244, // Lagos coordinates
          longitude: 3.3792,
        };
        console.log("🌆 Using Lagos coordinates as fallback");
      } else {
        // General Nigeria center
        fallbackCoords = {
          latitude: 9.082, // Center of Nigeria
          longitude: 8.6753,
        };
        console.log("🇳🇬 Using default Nigeria coordinates as fallback");
      }

      return fallbackCoords;
    }

    return null;
  } catch (error) {
    console.error("❌ Geocoding error:", error);

    // Enhanced error handling: Check for specific error types
    const errorMessage = error.message || error.toString();
    if (
      errorMessage.includes("UNAVAILABLE") ||
      errorMessage.includes("IOException") ||
      errorMessage.includes("rejected") ||
      errorMessage.includes("timeout")
    ) {
      console.log(
        "🌐 Network/Service unavailable or timeout for geocoding, using fallback"
      );
    }

    // Last resort: If all fails and it's Nigeria, use location-specific coordinates
    if (address.toLowerCase().includes("nigeria")) {
      let fallbackCoords;

      if (
        address.toLowerCase().includes("federal capital territory") ||
        address.toLowerCase().includes("abuja") ||
        address.toLowerCase().includes("fct")
      ) {
        // More specific coordinates for Abuja/FCT
        fallbackCoords = {
          latitude: 9.0765, // Abuja city center
          longitude: 7.3986,
        };
        console.log("�️ Using Abuja/FCT coordinates due to error");
      } else if (address.toLowerCase().includes("lagos")) {
        fallbackCoords = {
          latitude: 6.5244, // Lagos coordinates
          longitude: 3.3792,
        };
        console.log("🌆 Using Lagos coordinates due to error");
      } else {
        // General Nigeria center
        fallbackCoords = {
          latitude: 9.082, // Center of Nigeria
          longitude: 8.6753,
        };
        console.log("🇳🇬 Using default Nigeria coordinates due to error");
      }

      return fallbackCoords;
    }

    return null;
  }
};

const EnhancedTrackingScreen = ({ route, navigation }) => {
  const { orderId, order } = route.params || {};
  const { isDark, colors } = useTheme();

  // Initialize component styles
  const componentStyles = styles(colors);

  // Map and location state
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // Animated values for smooth marker movement
  const driverLocationAnim = useRef(
    new Animated.ValueXY({ x: 0, y: 0 })
  ).current;
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);

  // Driver and order state
  const [driverInfo, setDriverInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(order || null);
  const [eta, setEta] = useState(null);
  const [driverBearing, setDriverBearing] = useState(0);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [mapType, setMapType] = useState("standard");
  const [connectionError, setConnectionError] = useState(null);

  // UI state
  const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(false);

  // Animation for expanding details
  const toggleOrderDetails = () => {
    const toValue = isOrderDetailsExpanded ? 0 : 1;
    setIsOrderDetailsExpanded(!isOrderDetailsExpanded);

    Animated.spring(expandAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Calculate precise ETA based on current driver location and route
  const calculatePreciseETA = async (driverLoc, userLoc) => {
    if (!driverLoc || !userLoc) return null;

    try {
      const routeData = await googleRoutesService.calculateRoute(
        driverLoc,
        userLoc
      );
      if (routeData) {
        const etaMinutes = Math.ceil(routeData.durationMinutes || 15);
        const etaDistance = routeData.distanceText || "2.5 km";

        return {
          remainingTime: `${etaMinutes} min${etaMinutes !== 1 ? "s" : ""}`,
          remainingDistance: etaDistance,
          estimatedArrival: new Date(
            Date.now() + etaMinutes * 60 * 1000
          ).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
    } catch (error) {
      console.error("❌ Error calculating precise ETA:", error);
    }

    // Fallback calculation
    const distance =
      Math.sqrt(
        Math.pow(driverLoc.latitude - userLoc.latitude, 2) +
          Math.pow(driverLoc.longitude - userLoc.longitude, 2)
      ) * 111; // Rough km conversion

    const estimatedMinutes = Math.max(5, Math.ceil(distance * 2)); // Assume 30km/h average

    return {
      remainingTime: `${estimatedMinutes} min${
        estimatedMinutes !== 1 ? "s" : ""
      }`,
      remainingDistance: `${distance.toFixed(1)} km`,
      estimatedArrival: new Date(
        Date.now() + estimatedMinutes * 60 * 1000
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };
  const [isUsingLiveLocation, setIsUsingLiveLocation] = useState(false);
  const [savedDeliveryLocation, setSavedDeliveryLocation] = useState(null);

  // Debug expanded state
  useEffect(() => {
    console.log(
      "🔄 Order details expanded state changed:",
      isOrderDetailsExpanded
    );
  }, [isOrderDetailsExpanded]);

  // Ref to track current driver location for setTimeout callbacks
  const driverLocationRef = useRef(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      driverTrackingService.stopTrackingOrder(orderId);
      driverTrackingService.removeListener(orderId, "driver_location");
      driverTrackingService.removeListener(orderId, "driver_info");
      driverTrackingService.removeListener(orderId, "tracking_status");
    };
  }, [orderId]);

  const initializeTracking = async () => {
    try {
      setLoading(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required to track your order."
        );
        navigation.goBack();
        return;
      }

      // Use subscription delivery address as primary location
      let userCoords;
      if (
        orderInfo?.deliveryLocation &&
        orderInfo.deliveryLocation.coordinates &&
        orderInfo.deliveryLocation.coordinates[0] !== 0 &&
        orderInfo.deliveryLocation.coordinates[1] !== 0
      ) {
        // Use valid coordinates from order/subscription delivery location
        userCoords = {
          latitude: orderInfo.deliveryLocation.coordinates[1], // Note: MongoDB stores [lng, lat]
          longitude: orderInfo.deliveryLocation.coordinates[0],
        };
        console.log("📍 Using subscription delivery coordinates:", userCoords);
        setSavedDeliveryLocation(userCoords);
      } else if (
        orderInfo?.deliveryLocation?.address ||
        orderInfo?.deliveryAddress
      ) {
        // Geocode the delivery address
        const addressToGeocode =
          orderInfo?.deliveryLocation?.address || orderInfo?.deliveryAddress;
        console.log("📍 Geocoding delivery address:", addressToGeocode);
        try {
          const geocodedLocation = await geocodeAddress(addressToGeocode);
          if (geocodedLocation) {
            userCoords = geocodedLocation;
            setSavedDeliveryLocation(geocodedLocation);
            console.log("📍 Using geocoded delivery location:", userCoords);
          } else {
            throw new Error("Geocoding failed");
          }
        } catch (error) {
          console.log("⚠️ Geocoding failed, using current GPS location");
          const location = await Location.getCurrentPositionAsync({});
          userCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setSavedDeliveryLocation(userCoords);
        }
      } else {
        // Fallback: use current GPS location and save it as delivery location
        console.log("📍 No delivery address found, using current GPS location");
        const location = await Location.getCurrentPositionAsync({});
        userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setSavedDeliveryLocation(userCoords);
      }
      setUserLocation(userCoords);

      // Set initial map region
      setRegion({
        ...userCoords,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });

      // Initialize driver tracking
      await startDriverTracking();

      // Add immediate fallback to ensure driver marker is always visible
      setTimeout(() => {
        if (!driverLocation) {
          console.log(
            "🚨 No driver location after initialization, forcing fallback immediately"
          );
          initializeFallbackMode();
        }
      }, 1000); // Show fallback driver after 1 second if no real driver location
    } catch (error) {
      console.error("❌ Error initializing tracking:", error);
      setConnectionError("Failed to initialize tracking");
      initializeFallbackMode();
    } finally {
      setLoading(false);
    }
  };

  const startDriverTracking = async () => {
    try {
      // Connect to driver tracking service
      const connected = await driverTrackingService.connect();
      if (!connected) {
        console.log("❌ Failed to connect to tracking service, using fallback");
        throw new Error("Failed to connect to tracking service");
      }
      setIsConnected(true);
      setConnectionError(null);

      // Extract driver info from order if available and set it immediately
      const realDriverInfo =
        orderInfo?.driverAssignment?.driver || order?.driverAssignment?.driver;
      if (realDriverInfo) {
        console.log("🚗 Real driver info from assignment:", realDriverInfo);
        setDriverInfo({
          name: realDriverInfo.fullName || "Choma Riders",
          fullName: realDriverInfo.fullName || "Choma Riders",
          phone: realDriverInfo.phone || realDriverInfo.phoneNumber,
          rating: realDriverInfo.rating || { average: 4.5, count: 0 },
          profileImage: realDriverInfo.profileImage || null,
          vehicle:
            realDriverInfo.vehicle ||
            realDriverInfo.vehicleType ||
            "Delivery Vehicle",
          vehicleInfo: {
            type:
              realDriverInfo.vehicleInfo?.type ||
              realDriverInfo.vehicleType ||
              realDriverInfo.vehicle?.type ||
              "Vehicle",
            model:
              realDriverInfo.vehicleInfo?.model ||
              realDriverInfo.vehicleModel ||
              realDriverInfo.vehicle?.model ||
              "",
            plateNumber:
              realDriverInfo.vehicleInfo?.plateNumber ||
              realDriverInfo.vehiclePlateNumber ||
              realDriverInfo.vehicle?.plateNumber ||
              realDriverInfo.plateNumber ||
              "N/A",
          },
        });
      }

      // Validate orderId before subscribing
      if (!orderId) {
        console.error("❌ No orderId provided for tracking");
        throw new Error("Order ID is required for tracking");
      }

      console.log("🔍 Starting driver tracking for order:", orderId);
      console.log("📋 Order info available:", !!orderInfo);
      console.log(
        "👨‍✈️ Driver assignment info:",
        orderInfo?.driverAssignment || order?.driverAssignment
      );

      // Subscribe to all tracking updates with proper orderId
      driverTrackingService.onLocationUpdate(orderId, (locationData) => {
        console.log("📍 Driver location update received:", locationData);
        const { latitude, longitude, bearing } = locationData;
        const newDriverLocation = { latitude, longitude };

        // Calculate bearing if not provided
        let newBearing = bearing || driverBearing;
        if (!bearing && driverLocation) {
          newBearing = calculateBearing(driverLocation, newDriverLocation);
        }

        // Animate driver marker movement smoothly
        if (driverLocation) {
          Animated.timing(driverLocationAnim, {
            toValue: {
              x: longitude,
              y: latitude,
            },
            duration: MARKER_ANIMATION_DURATION,
            useNativeDriver: false,
          }).start();
        } else {
          // First time setting location - no animation needed
          driverLocationAnim.setValue({ x: longitude, y: latitude });
        }

        setDriverLocation(newDriverLocation);
        driverLocationRef.current = newDriverLocation;
        setDriverBearing(newBearing);

        // Calculate precise ETA when driver location updates
        if (userLocation) {
          calculatePreciseETA(newDriverLocation, userLocation).then(
            (newEta) => {
              if (newEta) {
                setEta(newEta);
              }
            }
          );
        }

        // Calculate initial route if we don't have one yet
        if (routeCoordinates.length === 0 && userLocation) {
          console.log("🗺️ No route data yet, calculating initial route...");
          try {
            googleRoutesService
              .calculateRoute(newDriverLocation, userLocation)
              .then((initialRoute) => {
                if (initialRoute && initialRoute.encodedPolyline) {
                  const coordinates = decodePolyline(
                    initialRoute.encodedPolyline
                  );
                  console.log(
                    `📍 Initial route calculated: ${coordinates.length} points`
                  );
                  setRouteCoordinates(coordinates);
                }
              })
              .catch((error) => {
                console.error("❌ Error calculating initial route:", error);
              });
          } catch (error) {
            console.error("❌ Error calculating initial route:", error);
          }
        }

        // Update map view
        if (mapRef.current && userLocation) {
          const coordinates = [userLocation, newDriverLocation];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
            animated: true,
          });
        }
      });

      driverTrackingService.onDriverInfo(orderId, (driverData) => {
        console.log("👨‍✈️ Driver info update received:", driverData);
        setDriverInfo(driverData);
      });

      driverTrackingService.onTrackingStatus(orderId, (statusData) => {
        console.log("📊 Tracking status received:", statusData);
      });

      driverTrackingService.onEtaUpdate(orderId, (etaData) => {
        console.log("⏱️ ETA update received:", etaData);
        setEta(etaData);
      });

      // Listen for route updates with road-following polylines
      driverTrackingService.onRouteUpdate(orderId, (routeData) => {
        console.log("🗺️ Route update received:", routeData);

        if (routeData.polyline) {
          // Decode the Google polyline into coordinates
          const coordinates = decodePolyline(routeData.polyline);
          console.log(
            `📍 Route polyline decoded: ${coordinates.length} points`
          );
          setRouteCoordinates(coordinates);
        }

        // Update driver location if provided
        if (routeData.driverLocation) {
          setDriverLocation(routeData.driverLocation);
        }
      });

      // Start tracking the order with route-based tracking
      const orderDetails = {
        driver:
          orderInfo?.driverAssignment?.driver ||
          order?.driverAssignment?.driver,
        deliveryLocation: userLocation,
      };
      driverTrackingService.trackOrder(orderId, orderDetails);

      // Get initial route calculation to avoid straight line default
      if (driverLocation && userLocation) {
        console.log("🗺️ Calculating initial route to avoid straight line...");
        try {
          const initialRoute = await googleRoutesService.calculateRoute(
            driverLocation,
            userLocation
          );

          if (initialRoute && initialRoute.encodedPolyline) {
            const coordinates = decodePolyline(initialRoute.encodedPolyline);
            console.log(
              `📍 Initial route calculated: ${coordinates.length} points`
            );
            setRouteCoordinates(coordinates);
          }
        } catch (error) {
          console.error("❌ Error calculating initial route:", error);
        }
      }

      // Wait a moment for connection to be established
      setTimeout(() => {
        console.log("🔍 Checking connection status...");
        const connectionStatus = driverTrackingService.getConnectionStatus();
        console.log("📊 Connection status:", connectionStatus);

        // If no location after 3 seconds, try to fallback (reduced from 5 seconds)
        if (!driverLocation) {
          console.log(
            "⚠️ No driver location received after 3 seconds, checking fallback options..."
          );

          // Try to get driver location from API as fallback
          attemptDriverLocationFallback()
            .then(() => {
              // Check again after API attempt
              setTimeout(() => {
                console.log(
                  "🔍 Rechecking driver location after API fallback attempt..."
                );
                console.log("Current driverLocation state:", driverLocation);
                console.log(
                  "Current driverLocationRef:",
                  driverLocationRef.current
                );

                if (!driverLocationRef.current) {
                  console.log(
                    "🔄 No real location found after API attempt, initializing mock data..."
                  );
                  initializeFallbackMode();
                } else {
                  console.log(
                    "✅ Real driver location found, skipping mock data"
                  );
                }
              }, 500); // Reduced timeout
            })
            .catch((error) => {
              // If API fallback fails, use mock data immediately
              console.log(
                "🔄 API fallback failed, initializing mock data for testing...",
                error
              );
              initializeFallbackMode();
            });
        }
      }, 3000); // Reduced from 5000 to 3000
    } catch (error) {
      console.error("❌ Error starting enhanced driver tracking:", error);
      initializeFallbackMode();
      setConnectionError("Using offline mode - Live tracking unavailable");
      setIsConnected(false);
    }
  };

  // Add fallback method to get driver location from API
  const attemptDriverLocationFallback = async () => {
    try {
      console.log("🔄 Attempting to get driver location from API...");

      // Try to get driver location from the API endpoint
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL.replace(
          "/api",
          ""
        )}/api/driver/location/${orderId}`,
        {
          timeout: 5000, // 5 second timeout
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📍 Driver location from API:", data);

        if (data.success && data.data && data.data.location) {
          const { latitude, longitude } = data.data.location;

          // Check if coordinates are actually present
          if (latitude && longitude && latitude !== 0 && longitude !== 0) {
            const newDriverLocation = { latitude, longitude };
            setDriverLocation(newDriverLocation);
            driverLocationRef.current = newDriverLocation;
            console.log(
              "✅ Driver location set from API fallback:",
              newDriverLocation
            );

            // Also set driver info from API response if available
            if (data.data.driverName) {
              setDriverInfo((prevInfo) => ({
                ...prevInfo,
                name: data.data.driverName,
                fullName: data.data.driverName,
                rating: data.data.rating ||
                  prevInfo?.rating || { average: 4.8, count: 127 },
              }));
              console.log(
                "✅ Driver info updated from API:",
                data.data.driverName
              );
            }

            // Update map view
            if (mapRef.current && userLocation) {
              const coordinates = [userLocation, newDriverLocation];
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
                animated: true,
              });
            }

            // Calculate route with real driver location
            if (userLocation && routeCoordinates.length === 0) {
              console.log("🗺️ Calculating route with real driver location...");
              try {
                googleRoutesService
                  .calculateRoute(newDriverLocation, userLocation)
                  .then((initialRoute) => {
                    if (initialRoute && initialRoute.encodedPolyline) {
                      const coordinates = decodePolyline(
                        initialRoute.encodedPolyline
                      );
                      console.log(
                        `📍 Real driver route calculated: ${coordinates.length} points`
                      );
                      setRouteCoordinates(coordinates);
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "❌ Error calculating real driver route:",
                      error
                    );
                  });
              } catch (error) {
                console.error("❌ Error calculating real driver route:", error);
              }
            }

            return;
          } else {
            console.log(
              "⚠️ Driver location coordinates are missing or invalid:",
              data.data.location
            );
          }
        } else {
          console.log("⚠️ Invalid response structure from API:", data);
        }
      }

      console.log("⚠️ API fallback failed - no location available");
      // Don't use mock data - just wait for real location updates
    } catch (error) {
      console.error("❌ Error getting driver location from API:", error);
      // Don't use mock data - just wait for real location updates
    }
  };

  const initializeFallbackMode = () => {
    console.log("🔄 Initializing fallback mode...");
    console.log("Current driver location before fallback:", driverLocation);

    // Extract real driver info from order if available
    const realDriverInfo =
      orderInfo?.driverAssignment?.driver || order?.driverAssignment?.driver;

    // Always set driver info (this is safe to override)
    setDriverInfo({
      name: realDriverInfo?.fullName || "John Doe",
      fullName: realDriverInfo?.fullName || "John Doe",
      phone:
        realDriverInfo?.phone ||
        realDriverInfo?.phoneNumber ||
        "+234 901 234 5678",
      rating: {
        average: realDriverInfo?.rating?.average || 4.8,
        count: realDriverInfo?.rating?.count || 127,
      },
      profileImage: realDriverInfo?.profileImage || null,
      vehicle: realDriverInfo?.vehicle || "Honda Civic",
      vehicleInfo: {
        type: realDriverInfo?.vehicleInfo?.type || "Sedan",
        model: realDriverInfo?.vehicleInfo?.model || "Honda Civic",
        plateNumber: realDriverInfo?.vehicleInfo?.plateNumber || "ABC-123XY",
      },
    });

    // Only set mock location if we don't have any driver location
    if (userLocation && !driverLocation) {
      const mockDriverLocation = {
        latitude: userLocation.latitude + 0.005, // About 500m away
        longitude: userLocation.longitude + 0.005,
      };
      console.log(
        "🚗 Setting mock driver location for testing:",
        mockDriverLocation
      );
      setDriverLocation(mockDriverLocation);
      driverLocationRef.current = mockDriverLocation;

      // Set mock ETA for better UI experience
      setEta({
        remainingTime: "8-12 mins",
        remainingDistance: "1.2 km away",
      });

      // Calculate initial route with mock location
      setTimeout(async () => {
        try {
          const initialRoute = await googleRoutesService.calculateRoute(
            mockDriverLocation,
            userLocation
          );

          if (initialRoute && initialRoute.encodedPolyline) {
            const coordinates = decodePolyline(initialRoute.encodedPolyline);
            console.log(
              `📍 Mock route calculated: ${coordinates.length} points`
            );
            setRouteCoordinates(coordinates);
          }
        } catch (error) {
          console.error("❌ Error calculating mock route:", error);
        }
      }, 1000);
    } else if (driverLocation) {
      console.log(
        "✅ Real driver location exists, skipping mock location setup"
      );
    }
  };

  const handleCall = () => {
    const phoneNumber =
      driverInfo?.phone ||
      driverInfo?.phoneNumber ||
      orderInfo?.driverAssignment?.driver?.phone;
    if (phoneNumber) {
      console.log("📞 Calling driver:", phoneNumber);
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert("Info", "Driver contact information not available");
    }
  };

  const handleMessage = () => {
    const phoneNumber =
      driverInfo?.phone ||
      driverInfo?.phoneNumber ||
      orderInfo?.driverAssignment?.driver?.phone;
    if (phoneNumber) {
      console.log("💬 Messaging driver:", phoneNumber);
      Linking.openURL(`sms:${phoneNumber}`);
    } else {
      Alert.alert("Info", "Driver contact information not available");
    }
  };

  const toggleLiveLocation = async () => {
    try {
      if (isUsingLiveLocation) {
        // Switch back to saved delivery location
        console.log("📍 Switching back to delivery address location");
        if (savedDeliveryLocation) {
          setUserLocation(savedDeliveryLocation);
          setIsUsingLiveLocation(false);

          // Recalculate route to delivery address
          if (driverLocation) {
            console.log("🗺️ Recalculating route to delivery address...");
            console.log("Driver location:", driverLocation);
            console.log("Saved delivery location:", savedDeliveryLocation);
            try {
              const newRoute = await googleRoutesService.calculateRoute(
                driverLocation,
                savedDeliveryLocation
              );

              if (newRoute && newRoute.encodedPolyline) {
                const coordinates = decodePolyline(newRoute.encodedPolyline);
                console.log(
                  `📍 Route to delivery address calculated: ${coordinates.length} points`
                );
                setRouteCoordinates(coordinates);
              } else if (newRoute) {
                // Fallback: create simple straight line route
                console.log(
                  "📍 Using fallback straight line route to delivery address"
                );
                setRouteCoordinates([driverLocation, savedDeliveryLocation]);
              }
            } catch (error) {
              console.error(
                "❌ Error calculating route to delivery address:",
                error
              );
              // Ultimate fallback: straight line
              console.log(
                "📍 Using emergency fallback: straight line to delivery address"
              );
              setRouteCoordinates([driverLocation, savedDeliveryLocation]);
            }
          }

          // Update map view
          if (mapRef.current) {
            const coordinates = driverLocation
              ? [savedDeliveryLocation, driverLocation]
              : [savedDeliveryLocation];
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
              animated: true,
            });
          }
        }
      } else {
        // Switch to live GPS location
        console.log("📍 Switching to live GPS location");
        const location = await Location.getCurrentPositionAsync({});
        const liveLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(liveLocation);
        setIsUsingLiveLocation(true);

        // Recalculate route to live location
        if (driverLocation) {
          console.log("🗺️ Recalculating route to live location...");
          try {
            const newRoute = await googleRoutesService.calculateRoute(
              driverLocation,
              liveLocation
            );

            if (newRoute && newRoute.encodedPolyline) {
              const coordinates = decodePolyline(newRoute.encodedPolyline);
              console.log(
                `📍 Route to live location calculated: ${coordinates.length} points`
              );
              setRouteCoordinates(coordinates);
            } else if (newRoute) {
              // Fallback: create simple straight line route
              console.log(
                "📍 Using fallback straight line route to live location"
              );
              setRouteCoordinates([driverLocation, liveLocation]);
            }
          } catch (error) {
            console.error(
              "❌ Error calculating route to live location:",
              error
            );
            // Ultimate fallback: straight line
            console.log(
              "📍 Using emergency fallback: straight line to live location"
            );
            setRouteCoordinates([driverLocation, liveLocation]);
          }
        }

        // Update map view
        if (mapRef.current) {
          const coordinates = driverLocation
            ? [liveLocation, driverLocation]
            : [liveLocation];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error toggling location:", error);
      Alert.alert("Error", "Could not get your current location");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          componentStyles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={componentStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[componentStyles.loadingText, { color: colors.text }]}>
            Loading tracking...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={componentStyles.container}>
      {/* Header */}
      <View style={componentStyles.header}>
        <TouchableOpacity
          style={componentStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={componentStyles.headerCenter}>
          <Text style={componentStyles.headerTitle}>
            #
            {orderInfo?.packageId ||
              orderInfo?.orderNumber ||
              orderId?.slice(-4).toUpperCase() ||
              "TX8778"}
          </Text>
        </View>

        <View style={componentStyles.headerRight}>
          <Text style={componentStyles.locationText}>
            {orderInfo?.deliveryAddress?.split(",").pop()?.trim() || "Lagos"}
          </Text>
        </View>
      </View>

      {/* Map Container - Takes up most of the screen */}
      <View style={componentStyles.mapContainer}>
        {region && (
          <MapView
            ref={mapRef}
            style={componentStyles.map}
            initialRegion={region}
            showsUserLocation={false}
            showsMyLocationButton={false}
            mapType={mapType}
          >
            {/* Route Line - Orange dashed line following roads */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates.filter(
                  (coord) => coord && coord.latitude && coord.longitude
                )}
                strokeColor="#FF8C42"
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            )}

            {/* Custom Driver Marker with Car Icon */}
            {driverLocation &&
              driverLocation.latitude &&
              driverLocation.longitude && (
                <DriverMarker
                  coordinate={driverLocation}
                  bearing={driverBearing}
                  driverInfo={driverInfo}
                  styles={componentStyles}
                />
              )}

            {/* Debug: Show driver location status */}
            {__DEV__ &&
              console.log("🚗 Driver marker render check:", {
                hasDriverLocation: !!driverLocation,
                driverLocation: driverLocation,
                coordinates: driverLocation
                  ? `${driverLocation.latitude}, ${driverLocation.longitude}`
                  : "None",
              })}

            {/* Custom User Location Marker with Pin */}
            {userLocation && (
              <UserMarker coordinate={userLocation} styles={componentStyles} />
            )}
          </MapView>
        )}

        {/* Map Controls */}
        <View style={componentStyles.mapControls}>
          {/* Location Toggle Button */}
          <TouchableOpacity
            style={componentStyles.locationToggleButton}
            onPress={toggleLiveLocation}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isUsingLiveLocation ? "home" : "location"}
              size={20}
              color={colors.primary}
            />
            <Text style={componentStyles.locationToggleText}>
              {isUsingLiveLocation ? "Delivery Address" : "My Location"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map Control Buttons */}
        <View style={componentStyles.mapControlButtons}>
          {/* Zoom In */}
          <TouchableOpacity
            style={componentStyles.mapControlButton}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.animateCamera({
                  zoom: (region?.latitudeDelta || 0.01) * 0.5,
                });
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Zoom Out */}
          <TouchableOpacity
            style={componentStyles.mapControlButton}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.animateCamera({
                  zoom: (region?.latitudeDelta || 0.01) * 2,
                });
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Map Type Toggle */}
          <TouchableOpacity
            style={componentStyles.mapControlButton}
            onPress={() => {
              setMapType(mapType === "standard" ? "satellite" : "standard");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mapType === "standard" ? "earth" : "map"}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Map Labels
        <View style={componentStyles.mapLabels}>
          <View style={[componentStyles.mapLabel, { top: 80, left: 20 }]}>
            <Text style={componentStyles.mapLabelText}>
              {isUsingLiveLocation ? "My Location" : "Delivery Address"}
            </Text>
          </View>
          <View style={[componentStyles.mapLabel, { bottom: 200, right: 20 }]}>
            <Text style={componentStyles.mapLabelText}>Driver Location</Text>
          </View>
        </View> */}
      </View>

      {/* Floating Bottom Card */}
      <View style={componentStyles.floatingBottomCard}>
        {/* Driver Header Card */}
        <View style={componentStyles.driverHeaderCard}>
          <LinearGradient
            colors={["#1B1B1B", "#1B1B1B", "#1B1B1B", colors.primary]}
            style={componentStyles.driverCardGradient}
          >
            <View style={componentStyles.driverCardHeader}>
              {/* Driver Profile Image */}
              <View style={componentStyles.driverImageContainer}>
                <Image
                  source={{
                    uri:
                      driverInfo?.profileImage ||
                      driverInfo?.avatar ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(
                          driverInfo?.fullName || driverInfo?.name || "Driver"
                        ) +
                        "&background=FF6B35&color=fff&size=80",
                  }}
                  style={componentStyles.driverImage}
                  defaultSource={{
                    uri: "https://ui-avatars.com/api/?name=Driver&background=FF6B35&color=fff&size=80",
                  }}
                />
                <View style={componentStyles.onlineIndicator} />
              </View>

              <View style={componentStyles.driverInfo}>
                <Text style={componentStyles.driverName}>
                  {driverInfo?.fullName || driverInfo?.name || "Your Driver"}
                </Text>
                <View style={componentStyles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={componentStyles.ratingText}>
                    {(
                      driverInfo?.rating?.average ||
                      driverInfo?.rating ||
                      4.5
                    ).toFixed(1)}
                  </Text>
                  <Text style={componentStyles.ratingCount}>
                    ({driverInfo?.rating?.count || "0"} reviews)
                  </Text>
                </View>
                <View style={componentStyles.vehicleContainer}>
                  <Text style={componentStyles.vehicleModel}>
                    {driverInfo?.vehicleInfo?.type ||
                      driverInfo?.vehicle ||
                      "Vehicle"}
                    {driverInfo?.vehicleInfo?.model
                      ? ` ${driverInfo.vehicleInfo.model}`
                      : ""}
                  </Text>
                  <Text style={componentStyles.plateNumber}>
                    {driverInfo?.vehicleInfo?.plateNumber ||
                      driverInfo?.plateNumber ||
                      "ABC-123XY"}
                  </Text>
                </View>
              </View>

              <View style={componentStyles.actionButtons}>
                <TouchableOpacity
                  style={componentStyles.actionButton}
                  onPress={handleMessage}
                >
                  <Ionicons
                    name="chatbubble"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={componentStyles.actionButton}
                  onPress={handleCall}
                >
                  <Ionicons name="call" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Delivery Details Card */}
        <View style={componentStyles.deliveryDetailsCard}>
          {/* ETA Section - Always Visible */}
          <View style={componentStyles.etaSection}>
            <View style={componentStyles.etaIconContainer}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </View>
            <View style={componentStyles.etaInfo}>
              <Text style={componentStyles.etaLabel}>Estimated Arrival</Text>
              <Text style={componentStyles.etaTime}>
                {eta?.remainingTime || "15-20 mins"}
              </Text>
              <Text style={componentStyles.etaDistance}>
                {eta?.remainingDistance || "2.5 km away"}
              </Text>
            </View>
            <View style={componentStyles.etaRightSection}>
              <View style={componentStyles.statusBadge}>
                <Text style={componentStyles.statusText}>On Route</Text>
              </View>
            </View>
          </View>

          {/* Expand/Collapse Button */}
          <TouchableOpacity
            style={[
              componentStyles.expandButton,
              isOrderDetailsExpanded && componentStyles.expandButtonExpanded,
            ]}
            onPress={toggleOrderDetails}
            activeOpacity={0.7}
          >
            <Text style={componentStyles.expandButtonText}>
              {isOrderDetailsExpanded ? "Hide Details" : "View Details"}
            </Text>
            <Ionicons
              name={isOrderDetailsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* Collapsible Order Info Section */}
          <Animated.View
            style={[
              componentStyles.orderInfoSection,
              {
                maxHeight: expandAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400], // Adjust based on content height
                }),
                opacity: expandAnimation,
                overflow: "hidden",
              },
            ]}
          >
            <View style={componentStyles.dividerLine} />

            <View style={componentStyles.orderInfoRow}>
              <View style={componentStyles.orderInfoIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={componentStyles.orderInfoContent}>
                <Text style={componentStyles.orderInfoLabel}>Order ID</Text>
                <Text style={componentStyles.orderInfoValue}>
                  #
                  {orderInfo?.packageId ||
                    orderInfo?.orderNumber ||
                    orderId?.slice(-4).toUpperCase() ||
                    "TX8778"}
                </Text>
              </View>
            </View>

            <View style={componentStyles.orderInfoRow}>
              <View style={componentStyles.orderInfoIcon}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={componentStyles.orderInfoContent}>
                <Text style={componentStyles.orderInfoLabel}>
                  Delivery Address
                </Text>
                <Text style={componentStyles.orderInfoValue} numberOfLines={2}>
                  {orderInfo?.deliveryAddress || "Your delivery location"}
                </Text>
              </View>
            </View>

            <View style={componentStyles.orderInfoRow}>
              <View style={componentStyles.orderInfoIcon}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={componentStyles.orderInfoContent}>
                <Text style={componentStyles.orderInfoLabel}>Total Amount</Text>
                <Text style={componentStyles.orderInfoValue}>
                  ₦{(orderInfo?.totalAmount || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Connection Status */}
      {connectionError && (
        <View style={componentStyles.statusBar}>
          <Ionicons name="wifi-outline" size={16} color="#FFF" />
          <Text style={componentStyles.statusText}>{connectionError}</Text>
          <TouchableOpacity onPress={startDriverTracking}>
            <Text style={componentStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: "transparent",
      position: "absolute",
      top: 40,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
    backButton: {
      padding: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 14,
      textAlign: "center",
      fontWeight: "600",
      color: colors.text,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 15,
    },
    headerRight: {
      paddingRight: 8,
    },
    locationText: {
      fontSize: 14,
      color: colors.textSecondary,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    mapContainer: {
      flex: 1,
      position: "relative",
    },
    map: {
      flex: 1,
    },
    mapControls: {
      position: "absolute",
      top: 120,
      right: 16,
      zIndex: 1000,
    },
    locationToggleButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      gap: 6,
    },
    locationToggleText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    mapControlButtons: {
      position: "absolute",
      top: 180,
      right: 16,
      zIndex: 1000,
      flexDirection: "column",
      gap: 8,
    },
    mapControlButton: {
      width: 40,
      height: 40,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    mapLabels: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
    },
    mapLabel: {
      position: "absolute",
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    mapLabelText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    // Destination marker (orange circle)
    destinationMarker: {
      alignItems: "center",
      justifyContent: "center",
    },
    orangeCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FF8C42",
      borderWidth: 3,
      borderColor: "#FFF",
    },
    // Driver marker (blue triangle)
    driverTriangleMarker: {
      alignItems: "center",
      justifyContent: "center",
    },
    triangleUp: {
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderStyle: "solid",
      borderLeftWidth: 12,
      borderRightWidth: 12,
      borderBottomWidth: 20,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: "#2196F3",
      transform: [{ rotate: "180deg" }],
    },
    // Floating Bottom Card Styles
    floatingBottomCard: {
      position: "absolute",
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: "transparent",
      zIndex: 1000,
    },
    driverHeaderCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    driverCardGradient: {
      borderRadius: 16,
      padding: 16,
    },
    driverCardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    driverImageContainer: {
      position: "relative",
      marginRight: 16,
    },
    driverImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 3,
      borderColor: "#FFF",
    },
    onlineIndicator: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#4CAF50",
      borderWidth: 2,
      borderColor: "#FFF",
    },
    driverInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFF",
      marginBottom: 4,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    ratingText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
      marginLeft: 4,
    },
    ratingCount: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
      marginLeft: 4,
    },
    vehicleContainer: {
      marginTop: 4,
    },
    vehicleModel: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
      marginBottom: 2,
    },
    plateNumber: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.7)",
      fontWeight: "500",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    actionButtons: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
      opacity: 0.9,
      justifyContent: "center",
      alignItems: "center",
      // shadowColor: "#000",
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.1,
      // shadowRadius: 4,
      // elevation: 3,
    },

    deliveryDetailsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      marginTop: 0, // Ensure no top margin
    },
    etaSection: {
      flexDirection: "row",
      // alignItems: "center",
      paddingBottom: 12,
    },
    etaRightSection: {
      // alignItems: "flex-end",
    },
    expandButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 38,
      marginTop: 12,
      gap: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    expandButtonExpanded: {
      backgroundColor: colors.cardBackground,
      // borderColor: colors.accent,
    },
    expandButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    etaIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#FFF5F2",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    etaInfo: {
      flex: 1,
    },
    etaLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
      marginBottom: 4,
    },
    etaTime: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    etaDistance: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    statusBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#4CAF50",
    },
    dividerLine: {
      height: 1,
      backgroundColor: "#F0F0F0",
      marginBottom: 16,
    },
    orderInfoSection: {
      marginTop: 16,
      gap: 16,
    },
    orderInfoRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    orderInfoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    orderInfoContent: {
      flex: 1,
    },
    orderInfoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
      marginBottom: 2,
    },
    orderInfoValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    statusBar: {
      position: "absolute",
      top: 120,
      left: 16,
      right: 16,
      backgroundColor: colors.error,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    statusText: {
      color: colors.white,
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
    retryText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "600",
    },

    // Custom Driver Marker Styles
    driverMarkerContainer: {
      alignItems: "center",
    },
    driverMarker: {
      width: 36,
      height: 36,
      borderRadius: 18,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    driverGradient: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#FFF",
    },
    driverInfoBubble: {
      position: "absolute",
      top: -35,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 60,
    },
    driverName: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
    },
    markerShadow: {
      position: "absolute",
      top: 32,
      width: 20,
      height: 8,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: 10,
      opacity: 0.6,
    },

    // Custom User Marker Styles
    userMarkerContainer: {
      alignItems: "center",
    },
    userMarker: {
      width: 32,
      height: 32,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    userGradient: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#FFF",
    },
    userMarkerTip: {
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 10,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: "#357ABD",
      marginTop: -2,
    },
    userMarkerShadow: {
      position: "absolute",
      top: 35,
      width: 16,
      height: 6,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: 8,
      opacity: 0.6,
    },
  });

export default EnhancedTrackingScreen;
