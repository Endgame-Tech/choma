import * as Notifications from "expo-notifications";

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
}

export default NotificationTestService;
