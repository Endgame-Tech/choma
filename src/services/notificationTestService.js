import * as Notifications from "expo-notifications";
import { api } from "./api";

class NotificationTestService {
  // Test sending a local notification to simulate push notification
  static async sendTestNotification() {
    try {
      // Schedule a local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Test Notification",
          body: "This is a test notification to check the in-app display!",
          data: {
            type: "test",
            timestamp: new Date().toISOString(),
          },
        },
        trigger: { seconds: 2 }, // Show after 2 seconds
      });

      console.log("✅ Test notification scheduled");
    } catch (error) {
      console.error("❌ Test notification failed:", error);
    }
  }

  // Test order notification
  static async sendOrderNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Order Confirmed",
          body: "Your meal order has been confirmed and is being prepared by our chef!",
          data: {
            type: "order_confirmed",
            orderId: "test-order-123",
          },
        },
        trigger: { seconds: 1 },
      });

      console.log("✅ Order notification scheduled");
    } catch (error) {
      console.error("❌ Order notification failed:", error);
    }
  }

  // Test delivery notification
  static async sendDeliveryNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚗 Order Delivered",
          body: "Your delicious meal has been delivered! Enjoy your food!",
          data: {
            type: "order_delivered",
            orderId: "test-order-123",
          },
        },
        trigger: { seconds: 3 },
      });

      console.log("✅ Delivery notification scheduled");
    } catch (error) {
      console.error("❌ Delivery notification failed:", error);
    }
  }

  // Test real push notification via backend (development only)
  static async sendTestPushNotification() {
    try {
      console.log("🧪 Sending test push notification via backend...");
      
      const response = await api.post("/notifications/test-push");
      
      if (response.success) {
        console.log("✅ Test push notification sent successfully:", response.data);
        return {
          success: true,
          message: "Test push notification sent",
          data: response.data
        };
      } else {
        throw new Error(response.message || "Failed to send test push notification");
      }
    } catch (error) {
      console.error("❌ Test push notification failed:", error);
      return {
        success: false,
        error: error.message || "Failed to send test push notification"
      };
    }
  }

  // Force re-register push tokens (development only)
  static async forceRegisterPushTokens() {
    try {
      console.log("🔄 Force re-registering push tokens...");
      
      // First request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("🔐 Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        throw new Error("Push notification permission denied");
      }

      console.log("✅ Notification permissions granted");

      // Configure notification channel for Android
      if (require("react-native").Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
        console.log("📱 Android notification channel configured");
      }
      
      // Get Expo push token using legacy method (no Firebase dependency)
      let expoPushToken;
      try {
        // Try the classic Expo approach first (no Firebase required)
        console.log("📱 Attempting to get Expo token using classic method...");
        expoPushToken = await Notifications.getExpoPushTokenAsync();
        console.log("📱 Successfully got Expo token using classic method");
      } catch (error) {
        console.error("❌ Failed to get Expo push token:", error);
        throw new Error(`Failed to get Expo push token: ${error.message}`);
      }

      if (expoPushToken?.data) {
        console.log("📱 Got Expo token:", expoPushToken.data.substring(0, 50) + "...");
        
        const deviceId = `dev-device-${Date.now()}`;
        const platform = require("react-native").Platform.OS;
        
        const response = await api.post("/auth/push-token", {
          token: expoPushToken.data,
          deviceId,
          platform,
          tokenType: "expo"
        });

        if (response.success) {
          console.log("✅ Expo push token registered successfully");
          return {
            success: true,
            message: "Push tokens registered successfully",
            tokenType: "expo",
            token: expoPushToken.data.substring(0, 50) + "...",
            deviceId
          };
        } else {
          throw new Error(response.message || "Failed to register push token");
        }
      } else {
        throw new Error("Failed to get Expo push token");
      }
    } catch (error) {
      console.error("❌ Force register push tokens failed:", error);
      return {
        success: false,
        error: error.message || "Failed to register push tokens"
      };
    }
  }
}

export default NotificationTestService;
