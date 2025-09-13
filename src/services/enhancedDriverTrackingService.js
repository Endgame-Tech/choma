import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_CONFIG } from "../utils/constants";
import googleRoutesService from "./googleRoutesService";

class EnhancedDriverTrackingService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.heartbeatInterval = null;
    this.subscriptions = new Map();
    this.lastKnownData = new Map();
    this.routeUpdateInterval = null;

    // Event listeners
    this.locationListeners = new Map();
    this.driverInfoListeners = new Map();
    this.orderUpdateListeners = new Map();
    this.etaListeners = new Map();
    this.statusListeners = new Map();
    this.routeListeners = new Map();
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log("📡 Enhanced tracking already connected");
        return;
      }

      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const socketUrl = `${APP_CONFIG.WS_BASE_URL}/driver-tracking?token=${token}`;
      console.log("📡 Connecting to enhanced driver tracking:", socketUrl);

      return new Promise((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
          console.log("❌ Connection timeout - cleaning up...");
          if (this.ws) {
            this.ws.close();
            this.ws = null;
          }
          reject(new Error("Connection timeout"));
        }, 10000); // 10 second timeout

        this.ws = new WebSocket(socketUrl);

        this.ws.onopen = () => {
          console.log("✅ Enhanced driver tracking connected");
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.restoreSubscriptions();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ Enhanced tracking WebSocket error:", error);
          clearTimeout(connectionTimeout);
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(
            "📡 Enhanced tracking disconnected:",
            event.code,
            event.reason
          );
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.stopHeartbeat();
          this.stopRouteUpdates();

          if (!this.isConnected && this.reconnectAttempts === 0) {
            reject(
              new Error(`Connection failed: ${event.reason || "Unknown error"}`)
            );
          }

          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };
      });
    } catch (error) {
      console.error("❌ Error connecting to enhanced tracking:", error);
      throw error;
    }
  }

  async waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkConnection = () => {
        if (this.isConnected) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("Connection timeout"));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(
      `🔄 Scheduling enhanced reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          console.error("❌ Enhanced reconnection failed:", error);
        });
      }
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "ping" });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  startRouteUpdates(orderId, driverLocation, userLocation) {
    if (this.routeUpdateInterval) {
      clearInterval(this.routeUpdateInterval);
    }

    // Update route every 30 seconds
    this.routeUpdateInterval = setInterval(async () => {
      try {
        const currentDriverLocation = this.lastKnownData.get(
          `${orderId}_driver_location`
        );
        if (currentDriverLocation && userLocation) {
          await this.updateRouteWithGoogleAPI(
            orderId,
            currentDriverLocation,
            userLocation
          );
        }
      } catch (error) {
        console.error("❌ Error updating route:", error);
      }
    }, 30000);
  }

  stopRouteUpdates() {
    if (this.routeUpdateInterval) {
      clearInterval(this.routeUpdateInterval);
      this.routeUpdateInterval = null;
    }
  }

  async updateRouteWithGoogleAPI(orderId, driverLocation, userLocation) {
    try {
      console.log("🗺️ Updating route with Google Routes API...");

      const etaData = await googleRoutesService.getETAWithTraffic(
        driverLocation,
        userLocation
      );

      // Notify ETA listeners
      this.notifyETAListeners(orderId, etaData);

      // Notify route listeners if we have route data
      if (etaData.route && etaData.route.encodedPolyline) {
        const routeCoordinates = googleRoutesService.decodePolyline(
          etaData.route.encodedPolyline
        );
        this.notifyRouteListeners(orderId, {
          coordinates: routeCoordinates,
          distance: etaData.distance,
          duration: etaData.estimatedMinutes,
          traffic: etaData.status,
        });
      }

      // Store updated ETA data
      this.lastKnownData.set(`${orderId}_eta_update`, etaData);

      console.log("✅ Route updated successfully");
    } catch (error) {
      console.error("❌ Error updating route with Google API:", error);
    }
  }

  restoreSubscriptions() {
    for (const [orderId, subscription] of this.subscriptions) {
      this.send({
        type: "subscribe",
        orderId: orderId,
        events: subscription.events,
      });
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else {
      console.warn("⚠️ Cannot send message: Enhanced WebSocket not connected");
      return false;
    }
  }

  handleMessage(data) {
    const { type, orderId, payload, error, message } = data;

    console.log(`📨 Raw message received:`, data);

    if (error) {
      console.error(`❌ Server error for ${type}:`, error);
      return;
    }

    // Handle connection confirmation message
    if (type === "connected") {
      console.log("📨 Enhanced tracking service connected:", message);
      return;
    }

    // Log received messages with orderId (if available) - enhanced debugging
    console.log(
      `📨 Enhanced received ${type} for order ${orderId || "unknown"}:`,
      payload
    );

    // Check for missing orderId which is often the root cause
    if (!orderId) {
      console.warn(
        `⚠️ Message received without orderId for type: ${type}`,
        data
      );

      // Try to handle messages that might not need orderId (like pong/ping)
      if (type === "pong") {
        console.log("💓 Heartbeat pong received");
        return;
      }

      // For other messages, we need orderId to route properly
      console.error(`❌ Cannot process ${type} message without orderId`);
      return;
    }

    // Validate payload for data messages
    if (
      ["driver_location", "driver_info", "order_update", "eta_update"].includes(
        type
      ) &&
      !payload
    ) {
      console.warn(
        `⚠️ Message type ${type} received without payload for order ${orderId}`
      );
    }

    // Only store data with a valid orderId
    if (orderId && payload) {
      this.lastKnownData.set(`${orderId}_${type}`, payload);
      console.log(`💾 Stored data for ${orderId}_${type}:`, payload);
    }

    switch (type) {
      case "driver_location":
        if (orderId && payload) {
          console.log(
            `📍 Processing driver location for order ${orderId}:`,
            payload
          );
          this.handleDriverLocationUpdate(orderId, payload);
        } else {
          console.error(
            `❌ Cannot process driver_location: orderId=${orderId}, payload=`,
            payload
          );
        }
        break;

      case "driver_info":
        if (orderId && payload) {
          console.log(
            `👨‍✈️ Processing driver info for order ${orderId}:`,
            payload
          );
          this.notifyDriverInfoListeners(orderId, payload);
        }
        break;

      case "order_update":
        if (orderId && payload) {
          console.log(
            `📦 Processing order update for order ${orderId}:`,
            payload
          );
          this.notifyOrderUpdateListeners(orderId, payload);
        }
        break;

      case "eta_update":
        if (orderId && payload) {
          this.notifyETAListeners(orderId, payload);
        }
        break;

      case "tracking_status":
        if (orderId && payload) {
          console.log(
            `📊 Processing tracking status for order ${orderId}:`,
            payload
          );
          this.notifyStatusListeners(orderId, payload);

          // Special handling for location unavailable status
          if (payload.status === "location_unavailable") {
            console.log(
              `⚠️ Driver location unavailable for order ${orderId}:`,
              payload.message
            );
          }
        }
        break;

      case "subscribed":
        console.log(`✅ Successfully subscribed to order ${orderId}`);
        break;

      case "unsubscribed":
        console.log(`✅ Successfully unsubscribed from order ${orderId}`);
        break;

      case "pong":
        // Heartbeat response
        break;

      default:
        console.log("📨 Unknown enhanced message type:", type);
    }
  }

  async handleDriverLocationUpdate(orderId, locationData) {
    // Notify location listeners
    this.notifyLocationListeners(orderId, locationData);

    // Check if we have user location to calculate route
    const userLocation = this.lastKnownData.get(`${orderId}_user_location`);
    if (userLocation) {
      // Update route with new driver location
      await this.updateRouteWithGoogleAPI(orderId, locationData, userLocation);
    }
  }

  // Enhanced subscription methods
  subscribeToDriverLocation(orderId, callback, userLocation = null) {
    this.addSubscription(orderId, "driver_location");
    this.locationListeners.set(orderId, callback);

    // Store user location for route calculations
    if (userLocation) {
      this.lastKnownData.set(`${orderId}_user_location`, userLocation);

      // Start route updates
      const driverLocation = this.lastKnownData.get(
        `${orderId}_driver_location`
      );
      if (driverLocation) {
        this.startRouteUpdates(orderId, driverLocation, userLocation);
      }
    }

    // Send last known data if available
    const lastData = this.lastKnownData.get(`${orderId}_driver_location`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToRoute(orderId, callback) {
    this.routeListeners.set(orderId, callback);

    // Send last known route data if available
    const lastData = this.lastKnownData.get(`${orderId}_route_update`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToDriverInfo(orderId, callback) {
    this.addSubscription(orderId, "driver_info");
    this.driverInfoListeners.set(orderId, callback);

    const lastData = this.lastKnownData.get(`${orderId}_driver_info`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToOrderUpdates(orderId, callback) {
    this.addSubscription(orderId, "order_update");
    this.orderUpdateListeners.set(orderId, callback);

    const lastData = this.lastKnownData.get(`${orderId}_order_update`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToETA(orderId, callback, userLocation = null) {
    this.addSubscription(orderId, "eta_update");
    this.etaListeners.set(orderId, callback);

    // Store user location for enhanced ETA calculations
    if (userLocation) {
      this.lastKnownData.set(`${orderId}_user_location`, userLocation);
    }

    const lastData = this.lastKnownData.get(`${orderId}_eta_update`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToTrackingStatus(orderId, callback) {
    this.addSubscription(orderId, "tracking_status");
    this.statusListeners.set(orderId, callback);

    const lastData = this.lastKnownData.get(`${orderId}_tracking_status`);
    if (lastData) {
      callback(lastData);
    }
  }

  addSubscription(orderId, eventType) {
    console.log(
      `🔔 Adding subscription for order ${orderId}, event: ${eventType}`
    );

    if (!orderId) {
      console.error("❌ Cannot add subscription: orderId is required");
      return;
    }

    if (!this.subscriptions.has(orderId)) {
      this.subscriptions.set(orderId, { events: [] });
    }

    const subscription = this.subscriptions.get(orderId);
    if (!subscription.events.includes(eventType)) {
      subscription.events.push(eventType);
    }

    const subscriptionMessage = {
      type: "subscribe",
      orderId: orderId,
      events: subscription.events,
    };

    console.log(`📤 Sending subscription message:`, subscriptionMessage);
    this.send(subscriptionMessage);

    // Also immediately request current data for this order
    const requestMessage = {
      type: "getCurrentData",
      orderId: orderId,
      eventType: eventType,
    };

    console.log(`📤 Requesting current data:`, requestMessage);
    this.send(requestMessage);
  }

  // Enhanced notification methods
  notifyLocationListeners(orderId, data) {
    const callback = this.locationListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  notifyDriverInfoListeners(orderId, data) {
    const callback = this.driverInfoListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  notifyOrderUpdateListeners(orderId, data) {
    const callback = this.orderUpdateListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  notifyETAListeners(orderId, data) {
    const callback = this.etaListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  notifyStatusListeners(orderId, data) {
    const callback = this.statusListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  notifyRouteListeners(orderId, data) {
    const callback = this.routeListeners.get(orderId);
    if (callback) {
      callback(data);
    }
  }

  // Enhanced unsubscribe
  unsubscribeFromOrder(orderId) {
    this.subscriptions.delete(orderId);
    this.locationListeners.delete(orderId);
    this.driverInfoListeners.delete(orderId);
    this.orderUpdateListeners.delete(orderId);
    this.etaListeners.delete(orderId);
    this.statusListeners.delete(orderId);
    this.routeListeners.delete(orderId);

    // Clean up stored data
    const keys = Array.from(this.lastKnownData.keys()).filter((key) =>
      key.startsWith(orderId)
    );
    keys.forEach((key) => this.lastKnownData.delete(key));

    this.send({
      type: "unsubscribe",
      orderId: orderId,
    });
  }

  // Enhanced disconnect
  disconnect() {
    console.log("📡 Disconnecting enhanced driver tracking service");

    this.stopHeartbeat();
    this.stopRouteUpdates();
    this.subscriptions.clear();
    this.lastKnownData.clear();
    this.locationListeners.clear();
    this.driverInfoListeners.clear();
    this.orderUpdateListeners.clear();
    this.etaListeners.clear();
    this.statusListeners.clear();
    this.routeListeners.clear();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.isConnected = false;
  }

  // Get enhanced connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: this.subscriptions.size,
      routeUpdatesActive: !!this.routeUpdateInterval,
      googleRoutesCache: googleRoutesService.getCacheStats(),
    };
  }
}

// Export singleton instance
const enhancedDriverTrackingService = new EnhancedDriverTrackingService();
export default enhancedDriverTrackingService;
