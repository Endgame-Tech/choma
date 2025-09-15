import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

class FirebaseService {
  constructor() {
    this.initializeFirebase();
  }

  async initializeFirebase() {
    try {
      // Only skip Firebase messaging in Expo Go, not Firebase Realtime Database
      if (__DEV__ && !Constants.appOwnership) {
        console.log("🚫 Skipping Firebase messaging in development mode (Expo Go)");
        console.log("✅ Firebase Realtime Database is still available in development");
        return null; // Only skip messaging, not entire Firebase
      }

      // Request permission for iOS
      if (Platform.OS === "ios") {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log("Firebase messaging permission denied");
          return;
        }
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log("🔥 Firebase FCM Token:", fcmToken);
        await AsyncStorage.setItem("fcmToken", fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  }

  // Listen for token refresh
  onTokenRefresh(callback) {
    return messaging().onTokenRefresh(callback);
  }

  // Handle foreground messages
  onMessage(callback) {
    return messaging().onMessage(callback);
  }

  // Handle background messages
  setBackgroundMessageHandler(handler) {
    messaging().setBackgroundMessageHandler(handler);
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
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error("Error subscribing to topic:", error);
    }
  }

  // Unsubscribe from topic
  async unsubscribeFromTopic(topic) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error("Error unsubscribing from topic:", error);
    }
  }
}

export default new FirebaseService();
