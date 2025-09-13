import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, WS_BASE_URL } from '../config/api';

class DriverTrackingService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.heartbeatInterval = null;
    this.subscriptions = new Map();
    this.lastKnownData = new Map();
    
    // Event listeners
    this.locationListeners = new Map();
    this.driverInfoListeners = new Map();
    this.orderUpdateListeners = new Map();
    this.etaListeners = new Map();
    this.statusListeners = new Map();
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('📡 Driver tracking already connected');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Use WebSocket base URL
      const socketUrl = `${WS_BASE_URL}/driver-tracking?token=${token}`;

      console.log('📡 Connecting to driver tracking:', socketUrl);

      this.ws = new WebSocket(socketUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Driver tracking connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Restore subscriptions
        this.restoreSubscriptions();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Driver tracking WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('📡 Driver tracking disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      // Wait for connection to establish
      await this.waitForConnection();
      
    } catch (error) {
      console.error('❌ Error connecting to driver tracking:', error);
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
          reject(new Error('Connection timeout'));
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
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  restoreSubscriptions() {
    // Restore all active subscriptions after reconnection
    for (const [orderId, subscription] of this.subscriptions) {
      this.send({
        type: 'subscribe',
        orderId: orderId,
        events: subscription.events
      });
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return false;
    }
  }

  handleMessage(data) {
    const { type, orderId, payload, error } = data;

    if (error) {
      console.error(`❌ Server error for ${type}:`, error);
      return;
    }

    console.log(`📨 Received ${type} for order ${orderId}:`, payload);

    // Store latest data
    this.lastKnownData.set(`${orderId}_${type}`, payload);

    switch (type) {
      case 'driver_location':
        this.notifyLocationListeners(orderId, payload);
        break;
      
      case 'driver_info':
        this.notifyDriverInfoListeners(orderId, payload);
        break;
      
      case 'order_update':
        this.notifyOrderUpdateListeners(orderId, payload);
        break;
      
      case 'eta_update':
        this.notifyETAListeners(orderId, payload);
        break;
      
      case 'tracking_status':
        this.notifyStatusListeners(orderId, payload);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.log('📨 Unknown message type:', type);
    }
  }

  // Subscription methods
  subscribeToDriverLocation(orderId, callback) {
    this.addSubscription(orderId, 'driver_location');
    this.locationListeners.set(orderId, callback);
    
    // Send last known data if available
    const lastData = this.lastKnownData.get(`${orderId}_driver_location`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToDriverInfo(orderId, callback) {
    this.addSubscription(orderId, 'driver_info');
    this.driverInfoListeners.set(orderId, callback);
    
    const lastData = this.lastKnownData.get(`${orderId}_driver_info`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToOrderUpdates(orderId, callback) {
    this.addSubscription(orderId, 'order_update');
    this.orderUpdateListeners.set(orderId, callback);
    
    const lastData = this.lastKnownData.get(`${orderId}_order_update`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToETA(orderId, callback) {
    this.addSubscription(orderId, 'eta_update');
    this.etaListeners.set(orderId, callback);
    
    const lastData = this.lastKnownData.get(`${orderId}_eta_update`);
    if (lastData) {
      callback(lastData);
    }
  }

  subscribeToTrackingStatus(orderId, callback) {
    this.addSubscription(orderId, 'tracking_status');
    this.statusListeners.set(orderId, callback);
    
    const lastData = this.lastKnownData.get(`${orderId}_tracking_status`);
    if (lastData) {
      callback(lastData);
    }
  }

  addSubscription(orderId, eventType) {
    if (!this.subscriptions.has(orderId)) {
      this.subscriptions.set(orderId, { events: [] });
    }
    
    const subscription = this.subscriptions.get(orderId);
    if (!subscription.events.includes(eventType)) {
      subscription.events.push(eventType);
    }

    // Send subscription request to server
    this.send({
      type: 'subscribe',
      orderId: orderId,
      events: subscription.events
    });
  }

  // Notification methods
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

  // Unsubscribe methods
  unsubscribeFromOrder(orderId) {
    this.subscriptions.delete(orderId);
    this.locationListeners.delete(orderId);
    this.driverInfoListeners.delete(orderId);
    this.orderUpdateListeners.delete(orderId);
    this.etaListeners.delete(orderId);
    this.statusListeners.delete(orderId);

    // Send unsubscribe request to server
    this.send({
      type: 'unsubscribe',
      orderId: orderId
    });
  }

  // Connection management
  disconnect() {
    console.log('📡 Disconnecting driver tracking service');
    
    this.stopHeartbeat();
    this.subscriptions.clear();
    this.lastKnownData.clear();
    this.locationListeners.clear();
    this.driverInfoListeners.clear();
    this.orderUpdateListeners.clear();
    this.etaListeners.clear();
    this.statusListeners.clear();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  // Fallback REST API methods for when WebSocket is not available
  async getDriverLocationREST(orderId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/driver-tracking/${orderId}/location`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching driver location via REST:', error);
      throw error;
    }
  }

  async getDriverInfoREST(orderId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/driver-tracking/${orderId}/driver`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching driver info via REST:', error);
      throw error;
    }
  }

  async getETAREST(orderId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/driver-tracking/${orderId}/eta`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching ETA via REST:', error);
      throw error;
    }
  }

  // Utility methods
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: this.subscriptions.size,
    };
  }

  // Mock data for development/testing
  generateMockLocationUpdate(orderId) {
    if (!this.isConnected) return;

    // Generate random location around a base point
    const baseLat = 6.5244; // Lagos coordinates
    const baseLng = 3.3792;
    
    const mockData = {
      latitude: baseLat + (Math.random() - 0.5) * 0.01,
      longitude: baseLng + (Math.random() - 0.5) * 0.01,
      bearing: Math.random() * 360,
      speed: Math.random() * 60,
      timestamp: new Date().toISOString(),
    };

    this.notifyLocationListeners(orderId, mockData);
  }

  startMockUpdates(orderId, interval = 5000) {
    console.log(`🧪 Starting mock updates for order ${orderId}`);
    
    const mockInterval = setInterval(() => {
      if (this.locationListeners.has(orderId)) {
        this.generateMockLocationUpdate(orderId);
      } else {
        clearInterval(mockInterval);
      }
    }, interval);
  }
}

// Export singleton instance
const driverTrackingService = new DriverTrackingService();
export default driverTrackingService;