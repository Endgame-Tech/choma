const axios = require("axios");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const Customer = require("../models/Customer");
const NotificationService = require("../services/notificationService");

// Paystack Payment Controller
class PaymentController {
  // Initialize payment with Paystack
  static async initializePayment(req, res) {
    try {
      const { amount, email, subscriptionId, orderData } = req.body;

      // Validation
      if (!amount || !email) {
        return res.status(400).json({
          success: false,
          message: "Amount and email are required",
        });
      }

      // Store order data in subscription if provided (avoid sending large data to Paystack)
      if (orderData && subscriptionId) {
        await Subscription.findByIdAndUpdate(subscriptionId, {
          pendingOrderData: orderData,
          lastPaymentAttempt: new Date(),
        });
      }

      // Prepare Paystack payment data (keep metadata minimal)
      const paystackData = {
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        currency: "NGN",
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          customer_id: req.user.id,
          subscription_id: subscriptionId,
          // Only include essential identifiers, not large objects
          amount_ngn: amount,
          payment_type: orderData?.paymentType || "subscription",
        },
      };

      // Initialize payment with Paystack
      try {
        const response = await axios.post(
          "https://api.paystack.co/transaction/initialize",
          paystackData,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status) {
          res.json({
            success: true,
            data: {
              authorization_url: response.data.data.authorization_url,
              access_code: response.data.data.access_code,
              reference: response.data.data.reference,
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Payment initialization failed",
            error: response.data.message,
          });
        }
      } catch (error) {
        console.error(
          "Paystack API Error:",
          error.response?.data || error.message
        );

        // Handle common Paystack API errors
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            return res.status(500).json({
              success: false,
              message: "Payment service configuration error",
              error: "Invalid Paystack API key. Please contact support.",
              code: "INVALID_API_KEY",
            });
          } else if (status === 400) {
            return res.status(400).json({
              success: false,
              message: "Payment request validation failed",
              error: data.message || "Invalid payment data",
            });
          }
        }

        res.status(500).json({
          success: false,
          message: "Payment initialization failed",
          error: error.message,
        });
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({
        success: false,
        message: "Payment initialization failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Verify payment with Paystack
  static async verifyPayment(req, res) {
    try {
      const { reference } = req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: "Payment reference is required",
        });
      }

      // Verify payment with Paystack
      try {
        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        if (response.data.status && response.data.data.status === "success") {
          const paymentData = response.data.data;

          // Process the successful payment
          await PaymentController.processSuccessfulPayment(paymentData);

          // Send payment success notification
          try {
            const customerId = paymentData.metadata.customer_id;
            if (customerId) {
              await NotificationService.notifyPaymentSuccess(customerId, {
                amount: paymentData.amount / 100,
                reference: paymentData.reference,
                subscriptionId: paymentData.metadata.subscription_id,
              });
            }
          } catch (notificationError) {
            console.error(
              "Payment success notification failed:",
              notificationError
            );
          }

          res.json({
            success: true,
            message: "Payment verified successfully",
            data: {
              reference: paymentData.reference,
              amount: paymentData.amount / 100, // Convert back from kobo
              status: paymentData.status,
            },
          });
        } else {
          // Send payment failed notification
          try {
            const customerId = req.user?.id;
            if (customerId) {
              await NotificationService.notifyPaymentFailed(customerId, {
                reference,
                reason:
                  response.data.data?.gateway_response ||
                  "Payment not successful",
              });
            }
          } catch (notificationError) {
            console.error(
              "Payment failed notification failed:",
              notificationError
            );
          }

          res.status(400).json({
            success: false,
            message: "Payment verification failed",
            error:
              response.data.data?.gateway_response || "Payment not successful",
          });
        }
      } catch (error) {
        console.error(
          "Paystack API Error:",
          error.response?.data || error.message
        );

        // Handle common Paystack API errors
        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            return res.status(500).json({
              success: false,
              message: "Payment service configuration error",
              error: "Invalid Paystack API key. Please contact support.",
              code: "INVALID_API_KEY",
            });
          } else if (status === 404) {
            return res.status(404).json({
              success: false,
              message: "Payment reference not found",
              error: "The provided payment reference was not found",
            });
          }
        }

        res.status(500).json({
          success: false,
          message: "Payment verification failed",
          error: error.message,
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Process successful payment
  static async processSuccessfulPayment(paymentData) {
    try {
      const metadata = paymentData.metadata;
      const customerId = metadata.customer_id;
      const subscriptionId = metadata.subscription_id;

      // Update subscription payment status if subscription exists
      if (subscriptionId) {
        const subscription = await Subscription.findByIdAndUpdate(
          subscriptionId,
          {
            paymentStatus: "Paid",
            paymentReference: paymentData.reference,
            status: "Active",
            $unset: { pendingOrderData: 1, lastPaymentAttempt: 1 }, // Clean up temporary data
          },
          { new: true }
        );

        // Create order from subscription
        const fullSubscription = await Subscription.findById(subscriptionId)
          .populate("mealPlanId")
          .populate("userId");

        if (fullSubscription) {
          // Generate unique order number
          const orderNumber = `ORD-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)
            .toUpperCase()}`;

          const order = await Order.create({
            orderNumber,
            customer: customerId,
            subscription: subscriptionId,
            orderItems: {
              mealPlan: fullSubscription.mealPlanId._id,
              planName: fullSubscription.mealPlanId.planName,
              frequency: fullSubscription.frequency,
              duration: fullSubscription.duration,
            },
            totalAmount: paymentData.amount / 100,
            paymentMethod: "Card",
            paymentReference: paymentData.reference,
            paymentStatus: "Paid", // Customer has successfully paid
            orderStatus: "Confirmed",
            deliveryAddress: fullSubscription.deliveryAddress,
            deliveryDate: fullSubscription.nextDelivery,
          });

          console.log("Order created from subscription:", order._id);

          // Invalidate user orders cache
          const { cacheService } = require("../config/redis");
          if (cacheService && typeof cacheService.del === "function") {
            // Clear all variations of user orders cache
            const cacheKeys = [
              `user-orders:${customerId}:1:20:`,
              `user-orders:${customerId}:1:20:Confirmed`,
              `user-orders:${customerId}:1:20:Pending`,
              `user:${customerId}:/api/orders:{}`,
              `user:${customerId}:/api/orders/assigned:{}`,
            ];

            for (const key of cacheKeys) {
              await cacheService.del(key);
            }
            console.log("🗑️ Cleared order cache for user:", customerId);
          }

          // Send order confirmation notification
          try {
            await NotificationService.notifyOrderConfirmed(customerId, {
              orderNumber: order.orderNumber,
              planName: fullSubscription.mealPlanId.planName,
              deliveryDate: fullSubscription.nextDelivery,
              totalAmount: order.totalAmount,
            });
          } catch (notificationError) {
            console.error(
              "Order confirmation notification failed:",
              notificationError
            );
          }

          // Send subscription created notification
          try {
            await NotificationService.notifySubscriptionCreated(customerId, {
              planName: fullSubscription.mealPlanId.planName,
              startDate: fullSubscription.nextDelivery,
              frequency: fullSubscription.frequency,
              duration: fullSubscription.duration,
            });
          } catch (notificationError) {
            console.error(
              "Subscription created notification failed:",
              notificationError
            );
          }
        }
      }

      // Update customer spending
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          totalSpent: paymentData.amount / 100,
          totalOrders: 1,
        },
      });

      console.log("Payment processed successfully:", paymentData.reference);
    } catch (error) {
      console.error("Error processing successful payment:", error);
      throw error;
    }
  }

  // Handle Paystack webhook
  static async handleWebhook(req, res) {
    try {
      const hash = require("crypto")
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        return res.status(400).json({
          success: false,
          message: "Invalid signature",
        });
      }

      const event = req.body;

      switch (event.event) {
        case "charge.success":
          await PaymentController.processSuccessfulPayment(event.data);
          break;

        case "charge.failed":
          await PaymentController.processFailedPayment(event.data);
          break;

        default:
          console.log("Unhandled webhook event:", event.event);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({
        success: false,
        message: "Webhook processing failed",
      });
    }
  }

  // Process failed payment
  static async processFailedPayment(paymentData) {
    try {
      const metadata = paymentData.metadata;
      const subscriptionId = metadata.subscription_id;

      if (subscriptionId) {
        await Subscription.findByIdAndUpdate(subscriptionId, {
          paymentStatus: "Failed",
          status: "Paused",
        });
      }

      console.log("Failed payment processed:", paymentData.reference);
    } catch (error) {
      console.error("Error processing failed payment:", error);
    }
  }

  // Get payment history
  static async getPaymentHistory(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await Order.find({
        customer: req.user.id,
        paymentStatus: "Paid",
      })
        .populate("subscription")
        .sort({ createdDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments({
        customer: req.user.id,
        paymentStatus: "Paid",
      });

      res.json({
        success: true,
        data: {
          payments: orders,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPayments: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Refund payment
  static async refundPayment(req, res) {
    try {
      const { reference, amount, reason } = req.body;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: "Payment reference is required",
        });
      }

      const refundData = {
        transaction: reference,
        amount: amount ? amount * 100 : undefined, // Convert to kobo if specified
        currency: "NGN",
        customer_note: reason || "Refund requested by customer",
      };

      const response = await axios.post(
        "https://api.paystack.co/refund",
        refundData,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status) {
        // Update order status
        const order = await Order.findOneAndUpdate(
          { paymentReference: reference },
          {
            paymentStatus: "Refunded",
            orderStatus: "Cancelled",
          },
          { new: true }
        );

        // Send refund notification
        try {
          if (order && order.customer) {
            await NotificationService.notifyRefundProcessed(order.customer, {
              amount: amount || order.totalAmount,
              reference,
              orderNumber: order.orderNumber,
              reason: reason || "Refund requested by customer",
            });
          }
        } catch (notificationError) {
          console.error("Refund notification failed:", notificationError);
        }

        res.json({
          success: true,
          message: "Refund processed successfully",
          data: response.data.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Refund failed",
          error: response.data.message,
        });
      }
    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({
        success: false,
        message: "Refund processing failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = PaymentController;
