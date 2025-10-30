const DeliveryTracking = require("../models/DeliveryTracking");
const Driver = require("../models/Driver");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const DeliveryPrice = require("../models/DeliveryPrice");
const Subscription = require("../models/Subscription");
const {
  updateMealSlotDeliveryStatus,
} = require("../services/mealPlanSnapshotService");
const { Client } = require("@googlemaps/google-maps-services-js");

const googleMapsClient = new Client({});

// Helper function to calculate distance between two coordinates (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Get delivery price by location - Deprecated: Users must now select a zone manually.
exports.getDeliveryPriceByLocation = async (req, res) => {
  try {
    // This endpoint is deprecated. Users should select a delivery zone from the list.
    // Returning a 400 error to indicate that the client should use the /zones endpoint instead.
    return res.status(400).json({
      success: false,
      message:
        "Please select a delivery zone to calculate the delivery price. Address-based lookup is no longer supported.",
    });
  } catch (err) {
    console.error("Get delivery price error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process delivery price request.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Create delivery tracking for new order
exports.createDeliveryTracking = async (req, res) => {
  try {
    const {
      orderId,
      deliveryAddress,
      estimatedDeliveryTime,
      priority = "normal",
    } = req.body;

    // Verify order exists
    const order = await Order.findById(orderId).populate("customer");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Create delivery tracking
    const deliveryTracking = await DeliveryTracking.create({
      order: orderId,
      customer: order.customer._id,
      deliveryLocation: {
        address: deliveryAddress || order.deliveryAddress,
      },
      estimatedDeliveryTime:
        estimatedDeliveryTime || new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours default
      priority,
      pickupLocation: {
        address: "choma Kitchen, Victoria Island, Lagos",
        latitude: 6.4281,
        longitude: 3.4219,
        instructions: "Main kitchen location",
      },
    });

    res.status(201).json({
      success: true,
      message: "Delivery tracking created successfully",
      data: deliveryTracking,
    });
  } catch (err) {
    console.error("Create delivery tracking error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create delivery tracking",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get delivery tracking by tracking ID
exports.getDeliveryTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;

    const tracking = await DeliveryTracking.findOne({ trackingId })
      .populate("order")
      .populate("driver")
      .populate("customer", "fullName phone email");

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: "Delivery tracking not found",
      });
    }

    res.json({
      success: true,
      data: tracking,
    });
  } catch (err) {
    console.error("Get delivery tracking error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery tracking",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get customer's delivery trackings
exports.getCustomerDeliveries = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status, limit = 20 } = req.query;

    let query = { customer: customerId };
    if (status) {
      query.deliveryStatus = status;
    }

    const deliveries = await DeliveryTracking.find(query)
      .populate("order")
      .populate("driver", "fullName phone rating vehicleInfo")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: deliveries,
      count: deliveries.length,
    });
  } catch (err) {
    console.error("Get customer deliveries error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deliveries",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Assign driver to delivery
exports.assignDriver = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { driverId } = req.body;

    // Verify driver exists and is available
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (!driver.isAvailable || driver.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Driver is not available for assignment",
      });
    }

    // Update delivery tracking
    const tracking = await DeliveryTracking.findOneAndUpdate(
      { trackingId },
      {
        driver: driverId,
        deliveryStatus: "Assigned",
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      },
      { new: true }
    )
      .populate("driver")
      .populate("order")
      .populate("customer");

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: "Delivery tracking not found",
      });
    }

    // Update driver status
    await Driver.findByIdAndUpdate(driverId, {
      status: "On Delivery",
      isAvailable: false,
    });

    res.json({
      success: true,
      message: "Driver assigned successfully",
      data: tracking,
    });
  } catch (err) {
    console.error("Assign driver error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to assign driver",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const {
      status,
      location,
      notes,
      deliveryProof,
      customerRating,
      customerFeedback,
    } = req.body;

    const tracking = await DeliveryTracking.findOne({ trackingId });
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: "Delivery tracking not found",
      });
    }

    // Update status and add timeline entry
    const updates = { deliveryStatus: status };

    // Add specific timestamp fields based on status
    if (status === "Picked Up") {
      updates.actualPickupTime = new Date();
    } else if (status === "Delivered") {
      updates.actualDeliveryTime = new Date();
      if (deliveryProof) {
        updates.deliveryProof = deliveryProof;
      }
      if (customerRating) {
        updates.customerRating = customerRating;
      }
      if (customerFeedback) {
        updates.customerFeedback = customerFeedback;
      }
    }

    // Add timeline entry
    const timelineEntry = {
      status,
      timestamp: new Date(),
      notes,
      updatedBy: req.user?.role || "driver",
    };

    if (location) {
      timelineEntry.location = location;
    }

    const updatedTracking = await DeliveryTracking.findOneAndUpdate(
      { trackingId },
      {
        ...updates,
        $push: { timeline: timelineEntry },
      },
      { new: true }
    )
      .populate("driver")
      .populate("order")
      .populate("customer");

    // Update driver availability if delivery is completed
    if (status === "Delivered" || status === "Failed Delivery") {
      await Driver.findByIdAndUpdate(tracking.driver, {
        status: "Active",
        isAvailable: true,
        $inc: {
          totalDeliveries: status === "Delivered" ? 1 : 0,
          totalEarnings: status === "Delivered" ? tracking.deliveryFee : 0,
        },
      });

      // Update order status
      const updatedOrder = await Order.findByIdAndUpdate(
        tracking.order,
        {
          orderStatus: status === "Delivered" ? "Delivered" : "Failed",
        },
        { new: true }
      );

      // Update subscription mealPlanSnapshot if this is a subscription order and delivered
      if (
        status === "Delivered" &&
        updatedOrder &&
        updatedOrder.subscriptionId
      ) {
        try {
          console.log(
            `🔄 Updating subscription snapshot for delivery completion:`,
            {
              subscriptionId: updatedOrder.subscriptionId,
              orderId: updatedOrder._id,
              trackingId: tracking.trackingId,
            }
          );

          // Get the subscription with mealPlanSnapshot
          const subscription = await Subscription.findById(
            updatedOrder.subscriptionId
          );
          if (subscription && subscription.mealPlanSnapshot) {
            // Extract meal timing information from the order
            // This assumes the order has mealScheduleInfo or we can derive it
            const deliveredAt = new Date();
            let mealSlotUpdated = false;

            // Try to find the matching meal slot in the snapshot
            // Method 1: Use order metadata if available
            if (updatedOrder.mealScheduleInfo) {
              const { weekNumber, dayOfWeek, mealTime } =
                updatedOrder.mealScheduleInfo;
              updateMealSlotDeliveryStatus(
                subscription.mealPlanSnapshot,
                weekNumber,
                dayOfWeek,
                mealTime,
                "delivered",
                deliveredAt
              );
              mealSlotUpdated = true;
              console.log(`✅ Updated meal slot via order metadata:`, {
                weekNumber,
                dayOfWeek,
                mealTime,
              });
            }
            // Method 2: Find by scheduled delivery date (fallback)
            else if (updatedOrder.scheduledDelivery) {
              const scheduledDate = new Date(updatedOrder.scheduledDelivery);
              const mealSlot = subscription.mealPlanSnapshot.mealSchedule.find(
                (slot) => {
                  const slotDate = new Date(slot.scheduledDeliveryDate);
                  // Match by same date (within 24 hours)
                  return (
                    Math.abs(slotDate.getTime() - scheduledDate.getTime()) <
                    24 * 60 * 60 * 1000
                  );
                }
              );

              if (mealSlot) {
                mealSlot.deliveryStatus = "delivered";
                mealSlot.deliveredAt = deliveredAt;
                mealSlotUpdated = true;
                console.log(`✅ Updated meal slot via scheduled date:`, {
                  slotId: mealSlot._id,
                  weekNumber: mealSlot.weekNumber,
                  dayOfWeek: mealSlot.dayOfWeek,
                  mealTime: mealSlot.mealTime,
                });
              }
            }

            // Save the updated subscription if we found and updated a meal slot
            if (mealSlotUpdated) {
              subscription.mealPlanSnapshot.lastSyncedAt = new Date();
              await subscription.save();

              // Update firstDeliveryCompleted if this was the first delivery
              if (!subscription.firstDeliveryCompleted) {
                subscription.firstDeliveryCompleted = true;
                subscription.firstDeliveryDate = deliveredAt;
                await subscription.save();
                console.log(
                  `🎉 First delivery completed for subscription ${subscription._id}`
                );
              }

              console.log(
                `✅ Subscription snapshot updated successfully for ${subscription._id}`
              );
            } else {
              console.log(
                `⚠️ Could not find matching meal slot to update for order ${updatedOrder._id}`
              );
            }
          } else {
            console.log(
              `⚠️ Subscription not found or missing mealPlanSnapshot: ${updatedOrder.subscriptionId}`
            );
          }
        } catch (snapshotError) {
          console.error("Error updating subscription snapshot:", snapshotError);
          // Don't fail the main delivery update if snapshot update fails
        }
      }
    }

    res.json({
      success: true,
      message: "Delivery status updated successfully",
      data: updatedTracking,
    });
  } catch (err) {
    console.error("Update delivery status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update delivery status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get available drivers
exports.getAvailableDrivers = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km

    let query = {
      isAvailable: true,
      status: "Active",
    };

    // If location provided, find drivers within radius (simplified)
    const drivers = await Driver.find(query)
      .select("-email -licenseNumber")
      .sort({ rating: -1, totalDeliveries: -1 });

    res.json({
      success: true,
      data: drivers,
      count: drivers.length,
    });
  } catch (err) {
    console.error("Get available drivers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available drivers",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update driver location
exports.updateDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        "currentLocation.latitude": latitude,
        "currentLocation.longitude": longitude,
        "currentLocation.lastUpdated": new Date(),
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      message: "Driver location updated successfully",
      data: {
        driverId: driver._id,
        location: driver.currentLocation,
      },
    });
  } catch (err) {
    console.error("Update driver location error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update driver location",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get delivery analytics (Admin)
exports.getDeliveryAnalytics = async (req, res) => {
  try {
    const { period = "today" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "today":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        };
        break;
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        dateFilter = { createdAt: { $gte: weekStart } };
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: monthStart } };
        break;
    }

    // Get delivery status breakdown
    const statusBreakdown = await DeliveryTracking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$deliveryStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get average delivery time
    const avgDeliveryTime = await DeliveryTracking.aggregate([
      {
        $match: {
          ...dateFilter,
          deliveryStatus: "Delivered",
          actualPickupTime: { $exists: true },
          actualDeliveryTime: { $exists: true },
        },
      },
      {
        $addFields: {
          deliveryDuration: {
            $subtract: ["$actualDeliveryTime", "$actualPickupTime"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$deliveryDuration" },
        },
      },
    ]);

    // Get driver performance
    const driverPerformance = await DeliveryTracking.aggregate([
      { $match: { ...dateFilter, driver: { $exists: true } } },
      {
        $group: {
          _id: "$driver",
          totalDeliveries: { $sum: 1 },
          successfulDeliveries: {
            $sum: { $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0] },
          },
          avgRating: { $avg: "$customerRating" },
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "_id",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: "$driver" },
      {
        $project: {
          driverName: "$driver.fullName",
          totalDeliveries: 1,
          successfulDeliveries: 1,
          successRate: {
            $multiply: [
              { $divide: ["$successfulDeliveries", "$totalDeliveries"] },
              100,
            ],
          },
          avgRating: 1,
        },
      },
      { $sort: { successRate: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        period,
        statusBreakdown,
        avgDeliveryTime: avgDeliveryTime[0]?.avgTime || 0,
        driverPerformance,
      },
    });
  } catch (err) {
    console.error("Get delivery analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get all active delivery zones for user selection
exports.getDeliveryZones = async (req, res) => {
  try {
    console.log("🔍 Fetching delivery zones for mobile app...");

    const deliveryZones = await DeliveryPrice.find({
      isActive: true,
    })
      .select("_id locationName area state country price")
      .sort({
        country: 1,
        state: 1,
        area: 1,
      });

    console.log(
      `📍 Found ${deliveryZones.length} active delivery zones:`,
      deliveryZones.map((z) => ({
        area: z.area,
        state: z.state,
        price: z.price,
      }))
    );

    // Disable caching for this endpoint to ensure fresh data
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({
      success: true,
      data: deliveryZones,
      count: deliveryZones.length,
    });
  } catch (err) {
    console.error("Get delivery zones error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery zones",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  getDeliveryPriceByLocation: exports.getDeliveryPriceByLocation,
  getDeliveryZones: exports.getDeliveryZones,
  createDeliveryTracking: exports.createDeliveryTracking,
  getDeliveryTracking: exports.getDeliveryTracking,
  getCustomerDeliveries: exports.getCustomerDeliveries,
  assignDriver: exports.assignDriver,
  updateDeliveryStatus: exports.updateDeliveryStatus,
  getAvailableDrivers: exports.getAvailableDrivers,
  updateDriverLocation: exports.updateDriverLocation,
  getDeliveryAnalytics: exports.getDeliveryAnalytics,
};
