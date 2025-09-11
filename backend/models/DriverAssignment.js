const mongoose = require("mongoose");

const driverAssignmentSchema = new mongoose.Schema(
  {
    // Driver information
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      // index defined below via driverAssignmentSchema.index({ driverId: 1, status: 1 })
    },

    // Order information (hidden from driver initially)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      // index defined below via driverAssignmentSchema.index({ orderId: 1 }, { unique: true })
    },

    // Delivery confirmation code (what user gives to driver)
    confirmationCode: {
      type: String,
      // unique/index defined below via driverAssignmentSchema.index({ confirmationCode: 1 }, { unique: true })
    },

    // Pickup location (Chef/Restaurant)
    pickupLocation: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        // 2dsphere index declared below via driverAssignmentSchema.index({ 'pickupLocation.coordinates': '2dsphere' })
      },
      chefId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chef",
        required: true,
      },
      chefName: {
        type: String,
        required: true,
      },
      chefPhone: {
        type: String,
        required: true,
      },
      instructions: {
        type: String,
        default: "",
      },
    },

    // Delivery location (Customer - limited info shown to driver)
    deliveryLocation: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        // 2dsphere index declared below via driverAssignmentSchema.index({ 'deliveryLocation.coordinates': '2dsphere' })
      },
      area: {
        type: String, // General area for driver to see
        required: true,
      },
      instructions: {
        type: String,
        default: "",
      },
      // Customer details are NOT stored here for privacy
    },

    // Assignment status
    status: {
      type: String,
      enum: ["available", "assigned", "picked_up", "delivered", "cancelled"],
      default: "available",
      index: true,
    },

    // Timing information
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    estimatedPickupTime: {
      type: Date,
      required: true,
    },
    estimatedDeliveryTime: {
      type: Date,
      required: true,
    },

    // Distance and earnings
    totalDistance: {
      type: Number, // in kilometers
      required: true,
    },
    estimatedDuration: {
      type: Number, // in minutes
      required: true,
    },
    baseFee: {
      type: Number,
      required: true,
      default: 500, // Base delivery fee in naira
    },
    distanceFee: {
      type: Number,
      required: true,
      default: 0,
    },
    totalEarning: {
      type: Number,
      required: true,
    },

    // Delivery confirmation
    deliveryConfirmation: {
      confirmedAt: Date,
      confirmationMethod: {
        type: String,
        enum: ["code", "photo", "signature"],
        default: "code",
      },
      deliveryPhoto: String,
      deliveryNotes: String,
      customerSignature: String,
    },

    // Pickup confirmation
    pickupConfirmation: {
      confirmedAt: Date,
      pickupNotes: String,
      pickupPhoto: String,
    },

    // Cancellation information
    cancellation: {
      cancelledAt: Date,
      cancelledBy: {
        type: String,
        enum: ["driver", "customer", "chef", "admin"],
      },
      reason: String,
      compensationAmount: {
        type: Number,
        default: 0,
      },
    },

    // Priority and special instructions
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    specialInstructions: {
      type: String,
      default: "",
    },
    isFirstDelivery: {
      type: Boolean,
      default: false, // True for subscription activation deliveries
    },

    // Subscription information (if applicable)
    subscriptionInfo: {
      subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
      },
      mealPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MealPlan",
      },
      deliveryDay: Number, // Day of the subscription
      isActivationDelivery: {
        type: Boolean,
        default: false,
      },
    },

    // Tracking and analytics
    driverLocation: [
      {
        coordinates: [Number],
        timestamp: {
          type: Date,
          default: Date.now,
        },
        speed: Number,
        heading: Number,
      },
    ],

    // Payment information
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      paidAt: Date,
      amount: Number,
      paymentMethod: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
driverAssignmentSchema.index({ driverId: 1, status: 1 });
driverAssignmentSchema.index({ assignedAt: -1 });
driverAssignmentSchema.index({ "pickupLocation.coordinates": "2dsphere" });
driverAssignmentSchema.index({ "deliveryLocation.coordinates": "2dsphere" });
driverAssignmentSchema.index({ confirmationCode: 1 }, { unique: true });
driverAssignmentSchema.index({ orderId: 1 }, { unique: true });

// Virtual for calculated fields
driverAssignmentSchema.virtual("timeToPickup").get(function () {
  if (!this.estimatedPickupTime) return null;
  return Math.max(
    0,
    Math.floor((this.estimatedPickupTime - Date.now()) / (1000 * 60))
  );
});

driverAssignmentSchema.virtual("timeToDelivery").get(function () {
  if (!this.estimatedDeliveryTime) return null;
  return Math.max(
    0,
    Math.floor((this.estimatedDeliveryTime - Date.now()) / (1000 * 60))
  );
});

driverAssignmentSchema.virtual("isOverdue").get(function () {
  if (!this.estimatedDeliveryTime) return false;
  return Date.now() > this.estimatedDeliveryTime;
});

// Static methods
driverAssignmentSchema.statics.findAvailableAssignments = function (
  driverLocation,
  maxDistance = 10
) {
  return this.find({
    status: "available",
    "pickupLocation.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: driverLocation, // [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000, // Convert km to meters
      },
    },
  }).sort({ priority: -1, assignedAt: 1 });
};

driverAssignmentSchema.statics.findByConfirmationCode = function (code) {
  return this.findOne({
    confirmationCode: code.toUpperCase(),
    status: { $in: ["assigned", "picked_up"] },
  });
};

// Instance methods
driverAssignmentSchema.methods.generateConfirmationCode = async function () {
  console.log("🔑 Generating confirmation code for delivery:", this.orderId);

  try {
    const Order = require("./Order");
    const order = await Order.findById(this.orderId).select(
      "orderNumber subscriptionId createdAt"
    );

    if (!order) {
      console.error("❌ Order not found for confirmation code generation");
      return this.generateRandomCode();
    }

    // Check if this is a subscription order
    if (order.subscriptionId) {
      console.log("📋 Subscription order detected, checking if first delivery...");

      try {
        // Count previous orders for this subscription
        const previousOrdersCount = await Order.countDocuments({
          subscriptionId: order.subscriptionId,
          createdAt: { $lt: order.createdAt },
        });

        // FIRST DELIVERY: Use last 6 digits of order number (activation)
        if (previousOrdersCount === 0) {
          console.log("🎯 FIRST delivery - using order number last 6 digits");
          const orderNumber = order.orderNumber.toString();
          const code = orderNumber.slice(-6).toUpperCase();
          
          console.log("🔑 First delivery activation code:", {
            orderId: this.orderId,
            orderNumber: orderNumber,
            activationCode: code,
            previousOrdersCount,
          });

          this.confirmationCode = code;
          return code;
        } 
        // SUBSEQUENT DELIVERIES: Generate random 4-digit code
        else {
          console.log("🔄 SUBSEQUENT delivery - generating 4-digit code");
          const code = this.generateRandom4DigitCode();

          console.log("🔑 Recurring delivery code:", {
            orderId: this.orderId,
            recurringCode: code,
            previousOrdersCount,
          });

          this.confirmationCode = code;
          return code;
        }
      } catch (countError) {
        console.error("❌ Error counting previous orders:", countError);
        // Fallback to first delivery logic
        const orderNumber = order.orderNumber.toString();
        const code = orderNumber.slice(-6).toUpperCase();
        this.confirmationCode = code;
        return code;
      }
    }

    // ONE-TIME ORDERS: Use 6-digit random code
    console.log("🍽️ One-time order - using 6-digit random code");
    const code = this.generateRandomCode();
    this.confirmationCode = code;
    return code;
    
  } catch (error) {
    console.error("❌ Error generating confirmation code:", error);
    return this.generateRandomCode();
  }
};

// Generate 4-digit code for recurring deliveries
driverAssignmentSchema.methods.generateRandom4DigitCode = function () {
  const chars = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate 6-digit code for one-time orders
driverAssignmentSchema.methods.generateRandomCode = function () {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

driverAssignmentSchema.methods.calculateEarning = function () {
  const baseFee = 500; // Base fee in naira
  const perKmRate = 100; // Per km rate in naira
  const distanceFee = Math.floor(this.totalDistance * perKmRate);

  // Priority multiplier
  const priorityMultipliers = { low: 1, normal: 1, high: 1.2, urgent: 1.5 };
  const multiplier = priorityMultipliers[this.priority] || 1;

  this.baseFee = baseFee;
  this.distanceFee = distanceFee;
  this.totalEarning = Math.floor((baseFee + distanceFee) * multiplier);

  return this.totalEarning;
};

driverAssignmentSchema.methods.updateDriverLocation = function (
  coordinates,
  additionalData = {}
) {
  this.driverLocation.push({
    coordinates,
    timestamp: new Date(),
    ...additionalData,
  });

  // Keep only last 50 location points
  if (this.driverLocation.length > 50) {
    this.driverLocation = this.driverLocation.slice(-50);
  }

  return this.save();
};

driverAssignmentSchema.methods.confirmPickup = async function (
  pickupData = {}
) {
  this.status = "picked_up";
  this.pickedUpAt = new Date();
  this.pickupConfirmation = {
    confirmedAt: new Date(),
    pickupNotes: pickupData.notes || "",
    pickupPhoto: pickupData.photo || "",
  };

  // Update the main Order status to "Out for Delivery" when driver confirms pickup
  const Order = require("./Order");
  const Notification = require("./Notification");
  const { cacheService } = require("../config/redis");

  try {
    console.log(
      `📦 Updating order ${this.orderId} status to "Out for Delivery" after pickup confirmation`
    );

    // Update order status to "Out for Delivery"
    const order = await Order.findById(this.orderId);
    if (order) {
      order.orderStatus = "Out for Delivery";
      order.statusUpdatedAt = new Date();
      await order.save();

      console.log(`✅ Order ${this.orderId} updated to "Out for Delivery"`);

      // Clear any cached order data to force refresh in mobile app
      if (cacheService && typeof cacheService.del === "function") {
        await cacheService.del(`order_${this.orderId}`);
        await cacheService.del(`user_orders_${order.userId}`);
        console.log(`🗑️ Cleared cache for order ${this.orderId}`);
      }

      // Send notification to customer with confirmation code for recurring deliveries
      if (Notification && order.userId) {
        // Check if this is a recurring delivery (subscription with multiple deliveries)
        const isRecurringDelivery = this.subscriptionInfo && this.subscriptionInfo.subscriptionId && !this.isFirstDelivery;
        
        console.log(`📊 Pickup notification logic check:`, {
          hasSubscriptionInfo: !!this.subscriptionInfo,
          subscriptionId: this.subscriptionInfo?.subscriptionId,
          isFirstDelivery: this.isFirstDelivery,
          isRecurringDelivery,
          hasConfirmationCode: !!this.confirmationCode,
          confirmationCode: this.confirmationCode
        });
        
        if (isRecurringDelivery && this.confirmationCode) {
          // For recurring deliveries, send notification with 4-digit confirmation code
          await Notification.create({
            userId: order.userId,
            title: "Order Out for Delivery! 🚚",
            message: `Your meal is on the way! Your delivery confirmation code is: ${this.confirmationCode}. Please have this code ready for the driver.`,
            type: "order_out_for_delivery",
            data: {
              orderId: this.orderId,
              assignmentId: this._id,
              status: "Out for Delivery",
              confirmationCode: this.confirmationCode,
              estimatedDeliveryTime: this.estimatedDeliveryTime,
              isRecurringDelivery: true,
            },
          });
          console.log(
            `📱 Sent pickup notification with 4-digit code ${this.confirmationCode} to user ${order.userId} for recurring delivery`
          );
        } else {
          // For first deliveries or one-time orders, send standard notification
          await Notification.create({
            userId: order.userId,
            title: "Order Out for Delivery! 🚚",
            message: `Your order is now out for delivery and on its way to you. Track your delivery in the app.`,
            type: "delivery_update",
            data: {
              orderId: this.orderId,
              assignmentId: this._id,
              status: "Out for Delivery",
              estimatedDeliveryTime: this.estimatedDeliveryTime,
            },
          });
          console.log(
            `📱 Sent "Out for Delivery" notification to user ${order.userId}`
          );
        }
      }
    } else {
      console.error(
        `❌ Order ${this.orderId} not found when confirming pickup`
      );
    }
  } catch (error) {
    console.error(
      `❌ Error updating order status after pickup confirmation:`,
      error
    );
    // Don't throw error to avoid breaking the pickup confirmation
  }

  return this.save();
};

driverAssignmentSchema.methods.confirmDelivery = async function (
  confirmationCode,
  deliveryData = {},
  skipValidation = false
) {
  // Skip validation if already validated in controller
  if (!skipValidation && this.confirmationCode.toUpperCase() !== confirmationCode.toUpperCase()) {
    throw new Error("Invalid confirmation code");
  }

  this.status = "delivered";
  this.deliveredAt = new Date();
  this.deliveryConfirmation = {
    confirmedAt: new Date(),
    confirmationMethod: "code",
    deliveryPhoto: deliveryData.photo || "",
    deliveryNotes: deliveryData.notes || "",
  };

  // Update the main Order status to notify mobile app users
  const Order = require("./Order");
  const Notification = require("./Notification");
  const { cacheService } = require("../config/redis");

  try {
    // Update order status
    const order = await Order.findById(this.orderId);
    if (order) {
      order.orderStatus = "Delivered";
      order.actualDelivery = new Date();
      await order.save();

      // Invalidate mobile app cache
      await cacheService.del(`orders:${order.customer}`);
      await cacheService.del(`order:${order._id}`);
      await cacheService.del(`orders`); // Mobile app cache key
      await cacheService.del(`user-orders:${order.customer}`);

      // Send notification to customer
      await Notification.create({
        userId: order.customer,
        type: "order_delivered",
        title: "Order delivered successfully! 🎉",
        message: `Your order has been delivered successfully. We hope you enjoy your meal!`,
        data: {
          orderId: order._id,
          status: "Delivered",
          deliveredAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Error updating order status in confirmDelivery:", error);
    // Continue with saving the assignment even if order update fails
  }

  return this.save();
};

driverAssignmentSchema.methods.cancel = function (cancelData) {
  this.status = "cancelled";
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy: cancelData.cancelledBy,
    reason: cancelData.reason || "",
    compensationAmount: cancelData.compensation || 0,
  };
  return this.save();
};

// Pre-save middleware
driverAssignmentSchema.pre("save", async function (next) {
  try {
    // Generate confirmation code if not exists
    if (!this.confirmationCode) {
      await this.generateConfirmationCode();
    }

    // Calculate earning if not set
    if (!this.totalEarning && this.totalDistance) {
      this.calculateEarning();
    }

    next();
  } catch (error) {
    console.error("Error in DriverAssignment pre-save middleware:", error);
    next(error);
  }
});

module.exports = mongoose.model("DriverAssignment", driverAssignmentSchema);
