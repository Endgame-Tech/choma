const mongoose = require("mongoose");

/**
 * OrderDelegation - Simplified tracking schema
 * Links subscription, order, chef, and driver assignments
 * Tracks daily delivery timeline status
 */
const orderDelegationSchema = new mongoose.Schema({
  // Core References
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    index: true,
  },

  // Assignment References
  chefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chef",
    default: null,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },

  // Daily Timeline - One entry per unique delivery date
  dailyTimeline: [
    {
      date: {
        type: Date,
        required: true,
      },
      timelineId: {
        type: String,
        required: true,
        unique: true,
      },
      subDayId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      status: {
        type: String,
        enum: ["pending", "ready", "out_for_delivery", "delivered"],
        default: "pending",
      },
      chefCompletedAt: Date,
      deliveryCompletedAt: Date,
      confirmationCode: String,
    },
  ],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
orderDelegationSchema.index({ subscriptionId: 1, orderId: 1 });
orderDelegationSchema.index({ "dailyTimeline.timelineId": 1 });
orderDelegationSchema.index({ "dailyTimeline.subDayId": 1 });
orderDelegationSchema.index({ "dailyTimeline.date": 1 });

// Update timestamp before saving
orderDelegationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to update daily status by date
orderDelegationSchema.methods.updateDailyStatus = async function (
  date,
  status,
  completionField = null
) {
  const dateStr = new Date(date).toISOString().split("T")[0];
  const dayEntry = this.dailyTimeline.find((entry) => {
    const entryDateStr = new Date(entry.date).toISOString().split("T")[0];
    return entryDateStr === dateStr;
  });

  if (dayEntry) {
    const oldStatus = dayEntry.status;
    dayEntry.status = status;

    if (completionField === "chef") {
      dayEntry.chefCompletedAt = new Date();
    } else if (completionField === "delivery") {
      dayEntry.deliveryCompletedAt = new Date();
    }

    // CRITICAL: When chef marks day as ready, create DriverAssignment for that day
    if (status === "ready" && oldStatus !== "ready" && this.driverId) {
      try {
        const DriverAssignment = require("./DriverAssignment");
        const Order = require("./Order");
        const Chef = require("./Chef");

        console.log(`🚗 Creating driver assignment for day: ${dateStr}`);
        console.log(`   - Driver ID: ${this.driverId}`);
        console.log(`   - SubDayId: ${dayEntry.subDayId}`);

        // Check if assignment already exists for this day
        const existingAssignment = await DriverAssignment.findOne({
          orderId: this.orderId,
          "subscriptionInfo.subDayId": dayEntry.subDayId,
        });

        if (existingAssignment) {
          console.log(
            `   ℹ️ Assignment already exists for ${dayEntry.subDayId}`
          );
          return true;
        }

        // Get order details with customer populated
        const order = await Order.findById(this.orderId).populate(
          "customer subscription"
        );
        if (!order) {
          console.error(`   ❌ Order not found: ${this.orderId}`);
          return true;
        }

        // Get chef details
        const chef = await Chef.findById(this.chefId);
        if (!chef) {
          console.error(`   ❌ Chef not found: ${this.chefId}`);
          return true;
        }

        console.log(`   📍 Chef Info:`, {
          id: chef._id,
          fullName: chef.fullName,
          businessName: chef.businessName,
          businessAddress: chef.businessAddress,
          address: chef.address,
          phone: chef.phone,
          businessPhone: chef.businessPhone,
          location: chef.location,
        });

        console.log(`   📍 Order Delivery Address:`, {
          formatted: order.deliveryAddress?.formatted,
          street: order.deliveryAddress?.street,
          city: order.deliveryAddress?.city,
          state: order.deliveryAddress?.state,
          area: order.deliveryAddress?.area,
          coordinates: order.deliveryAddress?.coordinates,
        });

        // Convert coordinates from {lat, lng} to [longitude, latitude]
        const deliveryCoords = order.deliveryAddress?.coordinates
          ? [
              order.deliveryAddress.coordinates.lng || 0,
              order.deliveryAddress.coordinates.lat || 0,
            ]
          : [0, 0];

        const chefCoords = chef.location?.coordinates
          ? [
              chef.location.coordinates.lng || 0,
              chef.location.coordinates.lat || 0,
            ]
          : [0, 0];

        // Extract area from delivery address
        const deliveryArea =
          order.deliveryAddress?.city ||
          order.deliveryAddress?.state ||
          order.deliveryAddress?.area ||
          "Unknown";

        // Calculate estimated pickup time (e.g., 2 hours before delivery)
        const estimatedPickupTime = new Date(dayEntry.date);
        estimatedPickupTime.setHours(estimatedPickupTime.getHours() - 2);

        // Create new driver assignment for this specific day
        const assignment = new DriverAssignment({
          driverId: this.driverId,
          orderId: this.orderId,
          assignedAt: new Date(),
          status: "assigned",

          // Pickup location (Chef)
          pickupLocation: {
            address: chef.businessAddress || chef.address || "Chef Location",
            coordinates: chefCoords,
            chefId: this.chefId,
            chefName: chef.fullName || chef.businessName || "Chef",
            chefPhone: chef.phone || chef.businessPhone || "",
            instructions: order.chefInstructions || "",
          },

          // Delivery location (Customer)
          deliveryLocation: {
            address:
              order.deliveryAddress?.formatted ||
              order.deliveryAddress?.street ||
              "Customer Location",
            coordinates: deliveryCoords,
            area: deliveryArea,
            instructions:
              order.deliveryInstructions || order.instructions || "",
          },

          // Subscription info
          subscriptionInfo: {
            subscriptionId: this.subscriptionId,
            isSubscriptionOrder: true,
            deliveryDay: dayEntry.dayNumber || 1,
            subDayId: dayEntry.subDayId,
            timelineId: dayEntry.timelineId,
          },

          // Timing and logistics
          estimatedPickupTime: estimatedPickupTime,
          estimatedDeliveryTime: new Date(dayEntry.date),
          estimatedDuration: 60, // Default 60 minutes
          totalDistance: 10, // Default 10 km, can be calculated later
          totalEarning: 0, // Will be calculated by pre-save hook
          priority: "normal",
        });

        await assignment.save();

        console.log(`   ✅ Created driver assignment for ${dayEntry.subDayId}`);
        console.log(`      - Assignment ID: ${assignment._id}`);
        console.log(`      - Driver: ${this.driverId}`);
        console.log(`      - Day: ${dayEntry.dayNumber}`);

        // Send notification to driver about new assignment
        try {
          const Notification = require("./Notification");
          const Driver = require("./Driver");

          const driver = await Driver.findById(this.driverId);
          if (driver) {
            await Notification.create({
              userId: this.driverId,
              userType: "driver",
              type: "new_assignment",
              title: "New Delivery Assignment",
              message: `Day ${dayEntry.dayNumber} meals are ready for pickup and delivery`,
              data: {
                assignmentId: assignment._id,
                orderId: this.orderId,
                subscriptionId: this.subscriptionId,
                subDayId: dayEntry.subDayId,
                dayNumber: dayEntry.dayNumber,
              },
              priority: "high",
            });
            console.log(`   📱 Notification sent to driver ${this.driverId}`);
          }
        } catch (notifError) {
          console.error(`   ⚠️ Error sending driver notification:`, notifError);
          // Don't fail the whole operation if notification fails
        }
      } catch (error) {
        console.error(`   ❌ Error creating driver assignment:`, error);
        // Don't fail the status update if assignment creation fails
      }
    }

    return true;
  }
  return false;
};

// Method to get status for a specific date
orderDelegationSchema.methods.getStatusForDate = function (date) {
  const dateStr = new Date(date).toISOString().split("T")[0];
  const dayEntry = this.dailyTimeline.find((entry) => {
    const entryDateStr = new Date(entry.date).toISOString().split("T")[0];
    return entryDateStr === dateStr;
  });
  return dayEntry ? dayEntry.status : null;
};

// Static method to find by timelineId
orderDelegationSchema.statics.findByTimelineId = function (timelineId) {
  return this.findOne({ "dailyTimeline.timelineId": timelineId });
};

// Static method to find by subDayId
orderDelegationSchema.statics.findBySubDayId = function (subDayId) {
  return this.findOne({ "dailyTimeline.subDayId": subDayId });
};

module.exports = mongoose.model("OrderDelegation", orderDelegationSchema);
