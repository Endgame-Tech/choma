import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseTrackingService from "./firebaseTrackingService";
import googleRoutesService from "./googleRoutesService";

class DriverTrackingService {
  constructor() {
    this.isConnected = false;
    this.listeners = new Map();
    this.currentRoute = null;
    this.trackingInterval = null;
    this.driverInfo = null;
    this.customerLocation = null;
  }

  async connect() {
    try {
      // Skip Firebase in development mode - use WebSocket instead
      if (__DEV__) {
        console.log(
          "🔄 Skipping Firebase in development mode - using WebSocket only"
        );
        this.isConnected = true;
        return true;
      }

      console.log("🔥 Connecting to Firebase tracking...");
      const connected = await firebaseTrackingService.initialize();
      if (connected) {
        this.isConnected = true;
        console.log("✅ Connected to Firebase tracking");
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Failed to connect to Firebase tracking:", error);
      return false;
    }
  }

  // Firebase handles events automatically through listeners

  async trackOrder(orderId, orderDetails = null) {
    if (!this.isConnected) {
      console.error("❌ Not connected - cannot track order");
      return false;
    }

    console.log(
      "🔍 Starting to track order with route-based tracking:",
      orderId
    );

    // Store order details for route calculation
    if (orderDetails) {
      this.driverInfo = orderDetails.driver;
      this.customerLocation = orderDetails.deliveryLocation;
    }

    // Set up Firebase listeners for real-time updates
    if (!__DEV__) {
      firebaseTrackingService.subscribeToDriverLocation(
        orderId,
        (locationData) => {
          this.handleDriverLocationUpdate(locationData, orderId);
        }
      );

      firebaseTrackingService.subscribeToOrderStatus(orderId, (statusData) => {
        this.notifyListeners("tracking_status", statusData);
      });

      firebaseTrackingService.startTrackingOrder(orderId);
    }

    // Start route-based tracking with real-time updates
    this.startRouteTracking(orderId);

    return true;
  }

  async startRouteTracking(orderId) {
    // Clear any existing tracking interval
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    console.log("🗺️ Starting route-based tracking for order:", orderId);

    // Set up interval for route updates every 30 seconds
    this.trackingInterval = setInterval(async () => {
      await this.updateRouteAndETA(orderId);
    }, 30000); // 30 seconds

    // Initial route calculation
    await this.updateRouteAndETA(orderId);
  }

  async updateRouteAndETA(orderId) {
    try {
      // Get latest driver location (this will be from real-time updates)
      const driverLocation = await this.getCurrentDriverLocation(orderId);

      if (!driverLocation || !this.customerLocation) {
        console.warn(
          "⚠️ Missing driver or customer location for route calculation"
        );
        return;
      }

      console.log("🚗 Updating route with current traffic conditions...");

      // Get updated route with traffic consideration
      const updatedRoute = await googleRoutesService.getUpdatedRouteWithTraffic(
        driverLocation,
        this.customerLocation,
        this.currentRoute
      );

      this.currentRoute = updatedRoute;

      // Calculate current progress and ETA
      const routeProgress = googleRoutesService.calculateRouteProgress(
        driverLocation,
        updatedRoute,
        this.customerLocation
      );

      // Notify listeners with comprehensive tracking data
      this.notifyListeners("route_update", {
        orderId,
        route: updatedRoute,
        progress: routeProgress,
        driverLocation,
        destinationLocation: this.customerLocation,
        polyline: updatedRoute.encodedPolyline,
        steps: updatedRoute.steps,
        isRecalculated:
          updatedRoute.calculatedAt > (this.currentRoute?.calculatedAt || 0),
      });

      // Notify ETA updates
      if (routeProgress) {
        this.notifyListeners("eta_update", {
          orderId,
          estimatedArrival: routeProgress.estimatedArrival,
          remainingTime: routeProgress.remainingTime,
          remainingDistance: routeProgress.remainingDistance,
          currentInstruction: routeProgress.currentInstruction,
          nextTurn: routeProgress.nextTurn,
          progress: routeProgress.progress,
          status: routeProgress.status,
        });
      }

      console.log("✅ Route and ETA updated successfully");
    } catch (error) {
      console.error("❌ Error updating route and ETA:", error);
    }
  }

  async handleDriverLocationUpdate(locationData, orderId) {
    console.log("📍 Processing driver location update for route tracking");

    // Notify listeners of location update
    this.notifyListeners("driver_location", locationData);

    // Trigger immediate route update if driver has moved significantly
    if (this.currentRoute) {
      const shouldUpdate = googleRoutesService.shouldRecalculateRoute(
        {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        this.currentRoute,
        { minDistance: 50 } // 50m threshold for immediate updates
      );

      if (shouldUpdate) {
        console.log(
          "🔄 Driver moved significantly, updating route immediately..."
        );
        await this.updateRouteAndETA(orderId);
      }
    }
  }

  async getCurrentDriverLocation(orderId) {
    try {
      // Import API service dynamically to avoid circular dependency
      const apiService = require("./api").default;

      // Use the API service which has the correct base URL
      const response = await apiService.getDriverLocation(orderId);

      if (response?.success && response?.data?.location) {
        return {
          latitude: response.data.location.latitude,
          longitude: response.data.location.longitude,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting current driver location:", error);
      return null;
    }
  }

  stopTrackingOrder(orderId) {
    if (!this.isConnected) {
      return false;
    }

    console.log("⏹️ Stopping route-based order tracking:", orderId);

    // Clear route tracking interval
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    // Clear route data
    this.currentRoute = null;
    this.driverInfo = null;
    this.customerLocation = null;

    // Unsubscribe from Firebase if not in dev mode
    if (!__DEV__) {
      firebaseTrackingService.unsubscribeFromOrder(orderId);
    }

    return true;
  }

  onLocationUpdate(orderId, callback) {
    const key = `${orderId}_driver_location`;
    this.listeners.set(key, callback);
  }

  onDriverInfo(orderId, callback) {
    const key = `${orderId}_driver_info`;
    this.listeners.set(key, callback);
  }

  onTrackingStatus(orderId, callback) {
    const key = `${orderId}_tracking_status`;
    this.listeners.set(key, callback);
  }

  onEtaUpdate(orderId, callback) {
    const key = `${orderId}_eta_update`;
    this.listeners.set(key, callback);
  }

  onRouteUpdate(orderId, callback) {
    const key = `${orderId}_route_update`;
    this.listeners.set(key, callback);
  }

  notifyListeners(eventType, data) {
    // Notify all listeners for this event type
    for (const [key, callback] of this.listeners.entries()) {
      if (key.includes(eventType)) {
        callback(data);
      }
    }
  }

  removeListener(orderId, eventType) {
    const key = `${orderId}_${eventType}`;
    this.listeners.delete(key);
  }

  disconnect() {
    firebaseTrackingService.disconnect();
    this.isConnected = false;
    this.listeners.clear();
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default new DriverTrackingService();
