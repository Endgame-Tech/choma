import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, serverTimestamp, off } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXF-2ARo5xywX_g6x0gKiA7VOAMjCBHxM",
  authDomain: "getchoma-bca76.firebaseapp.com",
  databaseURL: "https://getchoma-bca76-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "getchoma-bca76",
  storageBucket: "getchoma-bca76.firebasestorage.app",
  messagingSenderId: "947042824831",
  appId: "1:947042824831:web:27a4e37a1d7800ebcd054a",
  measurementId: "G-MVSPB2WXNG"
};

class FirebaseTrackingService {
  constructor() {
    this.app = null;
    this.database = null;
    this.listeners = new Map();
    this.isInitialized = false;
  }

  async initialize(config = null) {
    try {
      // Use provided config or default
      const finalConfig = config || firebaseConfig;
      console.log('🔥 Initializing Firebase with config:', finalConfig.databaseURL);
      
      // Check if we're in a compatible environment
      if (typeof window === 'undefined') {
        console.warn('⚠️ Window object not available - Firebase Web SDK may not work');
        return false;
      }
      
      // Initialize Firebase
      this.app = initializeApp(finalConfig);
      console.log('✅ Firebase app initialized');
      
      // Get database reference
      this.database = getDatabase(this.app);
      console.log('✅ Firebase database reference created');
      
      // Test database connection with timeout
      console.log('🔥 Testing Firebase database connection...');
      const testRef = ref(this.database, '.info/connected');
      
      // Add a simple write test
      const testDataRef = ref(this.database, 'test/connection');
      await set(testDataRef, {
        timestamp: Date.now(),
        message: 'Connection test'
      });
      console.log('✅ Firebase write test successful');
      
      this.isInitialized = true;
      console.log('✅ Firebase Tracking Service fully initialized');
      console.log('🔗 Database URL:', finalConfig.databaseURL);
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      console.error('📋 Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        config: firebaseConfig.databaseURL
      });
      
      // Check for common issues
      if (error.message.includes('Service database is not available')) {
        console.error('🔥 This usually means:');
        console.error('   1. Realtime Database not enabled in Firebase Console');
        console.error('   2. Database rules are blocking access');
        console.error('   3. Network connectivity issues');
        console.error('   4. Firebase Web SDK not compatible with current environment');
      }
      
      return false;
    }
  }

  // Driver methods - for sending location updates
  async updateDriverLocation(driverId, locationData) {
    if (!this.isInitialized) {
      console.error('❌ Firebase not initialized');
      return false;
    }

    try {
      const locationRef = ref(this.database, `drivers/${driverId}/location`);
      await set(locationRef, {
        ...locationData,
        timestamp: serverTimestamp(),
        lastUpdated: new Date().toISOString()
      });

      console.log(`📍 Firebase: Updated location for driver ${driverId}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to update driver location:', error);
      return false;
    }
  }

  async updateOrderStatus(orderId, status, metadata = {}) {
    if (!this.isInitialized) return false;

    try {
      const orderRef = ref(this.database, `orders/${orderId}`);
      await set(orderRef, {
        status,
        lastUpdate: serverTimestamp(),
        timestamp: new Date().toISOString(),
        ...metadata
      });

      console.log(`📊 Firebase: Updated order ${orderId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to update order status:', error);
      return false;
    }
  }

  async linkDriverToOrder(driverId, orderId) {
    if (!this.isInitialized) return false;

    try {
      const updates = {};
      updates[`drivers/${driverId}/currentOrder`] = orderId;
      updates[`orders/${orderId}/driverId`] = driverId;
      updates[`tracking/${orderId}/driverId`] = driverId;

      await set(ref(this.database), updates);
      console.log(`🔗 Firebase: Linked driver ${driverId} to order ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to link driver to order:', error);
      return false;
    }
  }

  // Customer methods - for tracking orders
  subscribeToDriverLocation(orderId, callback) {
    if (!this.isInitialized) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      // Listen to the tracking path for this order
      const trackingRef = ref(this.database, `tracking/${orderId}/location`);
      
      const unsubscribe = onValue(trackingRef, (snapshot) => {
        const locationData = snapshot.val();
        if (locationData) {
          console.log(`📍 Firebase: Location update for order ${orderId}`, locationData);
          callback(locationData);
        }
      });

      // Store for cleanup
      this.listeners.set(`order_${orderId}_location`, unsubscribe);
      console.log(`🔍 Firebase: Subscribed to order ${orderId} location`);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Firebase: Failed to subscribe to location:', error);
      return null;
    }
  }

  subscribeToOrderStatus(orderId, callback) {
    if (!this.isInitialized) return null;

    try {
      const statusRef = ref(this.database, `orders/${orderId}/status`);
      
      const unsubscribe = onValue(statusRef, (snapshot) => {
        const status = snapshot.val();
        if (status) {
          console.log(`📊 Firebase: Order ${orderId} status: ${status}`);
          callback({
            status,
            message: this.getStatusMessage(status),
            timestamp: new Date().toISOString()
          });
        }
      });

      this.listeners.set(`order_${orderId}_status`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Firebase: Failed to subscribe to order status:', error);
      return null;
    }
  }

  // Real-time driver location for order tracking
  async startTrackingOrder(orderId) {
    if (!this.isInitialized) return false;

    try {
      // Get the driver ID for this order
      const orderRef = ref(this.database, `orders/${orderId}/driverId`);
      const snapshot = await get(orderRef);
      const driverId = snapshot.val();

      if (!driverId) {
        console.error(`❌ No driver assigned to order ${orderId}`);
        return false;
      }

      // Set up real-time sync from driver location to tracking location
      const driverLocationRef = ref(this.database, `drivers/${driverId}/location`);
      const trackingLocationRef = ref(this.database, `tracking/${orderId}/location`);

      const unsubscribe = onValue(driverLocationRef, (snapshot) => {
        const locationData = snapshot.val();
        if (locationData) {
          // Mirror driver location to tracking path
          set(trackingLocationRef, {
            ...locationData,
            orderId,
            driverId,
            syncedAt: serverTimestamp()
          });
        }
      });

      this.listeners.set(`sync_${orderId}_${driverId}`, unsubscribe);
      console.log(`🔄 Firebase: Started tracking sync for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to start order tracking:', error);
      return false;
    }
  }

  // Cleanup methods
  unsubscribeFromOrder(orderId) {
    try {
      for (const [key, unsubscribe] of this.listeners.entries()) {
        if (key.includes(orderId)) {
          unsubscribe();
          this.listeners.delete(key);
          console.log(`🔄 Firebase: Unsubscribed from ${key}`);
        }
      }
    } catch (error) {
      console.error('❌ Firebase: Error unsubscribing:', error);
    }
  }

  disconnect() {
    try {
      // Clean up all listeners
      for (const [key, unsubscribe] of this.listeners.entries()) {
        unsubscribe();
        console.log(`🔄 Firebase: Cleaned up ${key}`);
      }
      this.listeners.clear();
      console.log('🔌 Firebase: Disconnected all listeners');
    } catch (error) {
      console.error('❌ Firebase: Error disconnecting:', error);
    }
  }

  // Utility methods
  getStatusMessage(status) {
    const messages = {
      'assigned': 'Driver assigned to your order',
      'picked_up': 'Driver has picked up your order',
      'in_transit': 'Your order is on the way', 
      'delivered': 'Order delivered successfully'
    };
    return messages[status] || 'Order status updated';
  }

  async getDriverLocation(driverId) {
    if (!this.isInitialized) return null;

    try {
      const { get } = await import('firebase/database');
      const snapshot = await get(ref(this.database, `drivers/${driverId}/location`));
      return snapshot.val();
    } catch (error) {
      console.error('❌ Firebase: Failed to get driver location:', error);
      return null;
    }
  }

  async getOrderInfo(orderId) {
    if (!this.isInitialized) return null;

    try {
      const { get } = await import('firebase/database');
      const snapshot = await get(ref(this.database, `orders/${orderId}`));
      return snapshot.val();
    } catch (error) {
      console.error('❌ Firebase: Failed to get order info:', error);
      return null;
    }
  }
}

export default new FirebaseTrackingService();