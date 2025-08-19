const { Expo } = require("expo-server-sdk");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // You'll need to add your Firebase service account key
    const serviceAccount = require("../config/firebase-service-account.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin SDK initialized");
  } catch (error) {
    console.warn("⚠️ Firebase Admin SDK not initialized:", error.message);
  }
}

class PushNotificationService {
  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true,
    });
  }

  // Send a single push notification (handles both Expo and FCM)
  async sendPushNotification(notificationData) {
    try {
      const {
        to,
        title,
        body,
        data = {},
        sound = "default",
        badge = null,
        tokenType = "expo",
      } = notificationData;

      if (tokenType === "fcm") {
        return await this.sendFirebaseNotification({
          to,
          title,
          body,
          data,
          sound,
          badge,
        });
      } else {
        return await this.sendExpoNotification({
          to,
          title,
          body,
          data,
          sound,
          badge,
        });
      }
    } catch (error) {
      console.error("❌ Push notification failed:", error);
      throw error;
    }
  }

  // Send Firebase FCM notification
  async sendFirebaseNotification(notificationData) {
    try {
      const {
        to,
        title,
        body,
        data = {},
        sound = "default",
        badge = null,
      } = notificationData;

      if (!admin.apps.length) {
        throw new Error("Firebase Admin SDK not initialized");
      }

      const message = {
        token: to,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          // Convert all data values to strings (FCM requirement)
          ...Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
          }, {}),
        },
        android: {
          priority: "high",
          notification: {
            sound: sound || "default",
            channel_id: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: sound || "default",
              badge: badge || 0,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log("✅ Firebase push notification sent successfully:", response);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      console.error("❌ Firebase push notification failed:", error);
      throw error;
    }
  }

  // Send Expo push notification
  async sendExpoNotification(notificationData) {
    try {
      const {
        to,
        title,
        body,
        data = {},
        sound = "default",
        badge = null,
      } = notificationData;

      // Check if the push token is valid
      if (!Expo.isExpoPushToken(to)) {
        throw new Error(`Push token ${to} is not a valid Expo push token`);
      }

      // Construct the message
      const message = {
        to,
        title,
        body,
        data,
        sound,
        badge,
        channelId: "default",
        priority: "high",
      };

      // Send the notification
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error("Error sending push notification chunk:", error);
          throw error;
        }
      }

      // Check for errors in tickets
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          console.error("Push notification error:", ticket.message);
          if (ticket.details && ticket.details.error) {
            console.error("Error details:", ticket.details.error);
          }
          throw new Error(ticket.message);
        }
      }

      console.log("✅ Push notification sent successfully:", title);

      return {
        success: true,
        tickets,
      };
    } catch (error) {
      console.error("❌ Push notification failed:", error);
      throw error;
    }
  }

  // Send multiple push notifications efficiently
  async sendBulkPushNotifications(notifications) {
    try {
      const messages = [];

      for (const notification of notifications) {
        const {
          to,
          title,
          body,
          data = {},
          sound = "default",
          badge = null,
        } = notification;

        // Validate push token
        if (!Expo.isExpoPushToken(to)) {
          console.warn(`Invalid push token skipped: ${to}`);
          continue;
        }

        messages.push({
          to,
          title,
          body,
          data,
          sound,
          badge,
          channelId: "default",
          priority: "high",
        });
      }

      if (messages.length === 0) {
        return { success: true, message: "No valid push tokens to send to" };
      }

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error("Error sending bulk push notification chunk:", error);
        }
      }

      // Analyze results
      const successful = tickets.filter(
        (ticket) => ticket.status === "ok"
      ).length;
      const failed = tickets.filter(
        (ticket) => ticket.status === "error"
      ).length;

      console.log(
        `📊 Bulk push notifications: ${successful} successful, ${failed} failed`
      );

      return {
        success: true,
        results: {
          total: tickets.length,
          successful,
          failed,
          tickets,
        },
      };
    } catch (error) {
      console.error("Bulk push notification error:", error);
      throw error;
    }
  }

  // Validate push token
  isValidPushToken(token) {
    return Expo.isExpoPushToken(token);
  }

  // Handle push notification receipts (for tracking delivery)
  async handlePushReceipts(receiptIds) {
    try {
      const receiptIdChunks =
        this.expo.chunkPushNotificationReceiptIds(receiptIds);
      const receipts = [];

      for (const chunk of receiptIdChunks) {
        try {
          const receiptChunk = await this.expo.getPushNotificationReceiptsAsync(
            chunk
          );
          receipts.push(receiptChunk);
        } catch (error) {
          console.error("Error fetching push notification receipts:", error);
        }
      }

      // Process receipts
      const results = {
        delivered: 0,
        failed: 0,
        errors: [],
      };

      for (const receiptChunk of receipts) {
        for (const receiptId in receiptChunk) {
          const receipt = receiptChunk[receiptId];

          if (receipt.status === "ok") {
            results.delivered++;
          } else if (receipt.status === "error") {
            results.failed++;
            results.errors.push({
              receiptId,
              message: receipt.message,
              details: receipt.details,
            });

            // Handle specific errors
            if (receipt.details && receipt.details.error) {
              const errorCode = receipt.details.error;

              if (errorCode === "DeviceNotRegistered") {
                console.warn(`Device not registered for receipt ${receiptId}`);
                // TODO: Remove this push token from user's account
              } else if (errorCode === "MessageTooBig") {
                console.warn(`Message too big for receipt ${receiptId}`);
              } else if (errorCode === "MessageRateExceeded") {
                console.warn(`Message rate exceeded for receipt ${receiptId}`);
              }
            }
          }
        }
      }

      console.log(
        `📬 Push receipt results: ${results.delivered} delivered, ${results.failed} failed`
      );

      return results;
    } catch (error) {
      console.error("Handle push receipts error:", error);
      throw error;
    }
  }

  // Create notification payload for different types
  createNotificationPayload(type, data) {
    const payloads = {
      payment_success: {
        title: "💳 Payment Successful!",
        body: `Your payment of ₦${data.amount} has been processed.`,
        data: { type, ...data },
      },

      payment_failed: {
        title: "❌ Payment Failed",
        body: "Your payment could not be processed. Please try again.",
        data: { type, ...data },
      },

      order_confirmed: {
        title: "📦 Order Confirmed!",
        body: `Order #${data.orderNumber} is being prepared.`,
        data: { type, ...data },
      },

      order_out_for_delivery: {
        title: "🚚 On the Way!",
        body: `Your order is out for delivery. ETA: ${data.estimatedArrival}`,
        data: { type, ...data },
      },

      order_delivered: {
        title: "✅ Order Delivered!",
        body: "Your meal has been delivered. Enjoy!",
        data: { type, ...data },
      },

      subscription_created: {
        title: "🎉 Subscription Active!",
        body: `Your ${data.planName} subscription is now active.`,
        data: { type, ...data },
      },

      welcome: {
        title: "👋 Welcome to choma!",
        body: "Start exploring our delicious meal plans.",
        data: { type, ...data },
      },

      special_offer: {
        title: `🏷️ Special Offer! ${data.discount} Off`,
        body: `${data.description} Use code: ${data.code}`,
        data: { type, ...data },
      },
    };

    return (
      payloads[type] || {
        title: "choma Notification",
        body: data.message || "You have a new notification.",
        data: { type, ...data },
      }
    );
  }

  // Test push notification (for development)
  async sendTestNotification(pushToken) {
    try {
      const testPayload = {
        to: pushToken,
        title: "🧪 Test Notification",
        body: "This is a test notification from choma!",
        data: {
          type: "test",
          timestamp: new Date().toISOString(),
        },
      };

      return await this.sendPushNotification(testPayload);
    } catch (error) {
      console.error("Test notification failed:", error);
      throw error;
    }
  }

  // Schedule a push notification (basic implementation)
  async schedulePushNotification(notificationData, scheduleTime) {
    try {
      const delay = scheduleTime.getTime() - Date.now();

      if (delay <= 0) {
        throw new Error("Schedule time must be in the future");
      }

      // For basic scheduling, use setTimeout
      // In production, you'd want to use a proper job queue like Bull or Agenda
      setTimeout(async () => {
        try {
          await this.sendPushNotification(notificationData);
        } catch (error) {
          console.error("Scheduled push notification failed:", error);
        }
      }, delay);

      console.log(
        `📅 Push notification scheduled for ${scheduleTime.toISOString()}`
      );

      return {
        success: true,
        scheduledFor: scheduleTime.toISOString(),
        delay: `${Math.round(delay / 1000)}s`,
      };
    } catch (error) {
      console.error("Schedule push notification error:", error);
      throw error;
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = pushNotificationService;
