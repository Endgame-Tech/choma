import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Conditionally import Firebase messaging
let messaging = null;
try {
  messaging = require("@react-native-firebase/messaging").default;
} catch (error) {
  console.warn("Firebase messaging not available:", error.message);
}

class FirebaseService {
  constructor() {
    this.messaging = messaging;
    this.isAvailable = !!messaging;
  }

  async initializeFirebase() {
    try {
      // Skip Firebase messaging only in Expo Go (expo client), but allow in dev builds
      if (__DEV__ && !Constants.appOwnership && Constants.executionEnvironment === 'storeClient') {
        console.log("🚫 Skipping Firebase messaging in Expo Go client");
        return null; // Only skip messaging in Expo Go, not in dev builds
      }

      if (!this.isAvailable) {
        console.warn("⚠️ Firebase messaging not available, skipping FCM initialization");
        return null;
      }

      console.log("🔥 Initializing Firebase messaging in development mode");
      console.log("📱 Environment:", {
        isDev: __DEV__,
        appOwnership: Constants.appOwnership,
        executionEnvironment: Constants.executionEnvironment,
        firebaseAvailable: this.isAvailable
      });

      // Request permission for iOS
      if (Platform.OS === "ios") {
        const authStatus = await this.messaging().requestPermission();
        const enabled =
          authStatus === this.messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === this.messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log("Firebase messaging permission denied");
          return;
        }
      }

      // Get FCM token
      const fcmToken = await this.messaging().getToken();
      if (fcmToken) {
        console.log("🔥 Firebase FCM Token obtained:", fcmToken.substring(0, 50) + "...");
        await AsyncStorage.setItem("fcmToken", fcmToken);
        return fcmToken;
      } else {
        console.warn("⚠️ Firebase FCM token is null/empty");
        return null;
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
      return null;
    }
  }

  // Listen for token refresh
  onTokenRefresh(callback) {
    if (!this.isAvailable) return () => {};
    return this.messaging().onTokenRefresh(callback);
  }

  // Handle foreground messages
  onMessage(callback) {
    if (!this.isAvailable) return () => {};
    return this.messaging().onMessage(callback);
  }

  // Handle background messages
  setBackgroundMessageHandler(handler) {
    if (!this.isAvailable) return;
    this.messaging().setBackgroundMessageHandler(handler);
  }

  // Get stored FCM token
  async getStoredToken() {
    try {
      return await AsyncStorage.getItem("fcmToken");
    } catch (error) {
      console.error("Error getting stored FCM token:", error);
      return null;
    }
  }

  // Subscribe to topic
  async subscribeToTopic(topic) {
    try {
      if (!this.isAvailable) {
        console.warn("Firebase messaging not available for topic subscription");
        return;
      }
      await this.messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error("Error subscribing to topic:", error);
    }
  }

  // Unsubscribe from topic
  async unsubscribeFromTopic(topic) {
    try {
      if (!this.isAvailable) {
        console.warn("Firebase messaging not available for topic unsubscription");
        return;
      }
      await this.messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error("Error unsubscribing from topic:", error);
    }
  }
}

export default new FirebaseService();
