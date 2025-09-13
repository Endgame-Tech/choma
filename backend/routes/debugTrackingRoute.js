const express = require("express");
const router = express.Router();
const DriverAssignment = require("../models/DriverAssignment");
const Driver = require("../models/Driver");
const Order = require("../models/Order");

// Debug endpoint to check driver tracking data
router.get("/debug-tracking/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🔍 Debug tracking for order: ${orderId}`);

    // Find the order
    const order = await Order.findById(orderId).populate("driverAssignment");

    // Find driver assignment
    const assignment = await DriverAssignment.findOne({
      orderId: orderId,
      status: { $in: ["assigned", "picked_up", "in_transit"] },
    }).populate("driverId");

    // Find all drivers and their locations for debugging
    const allDrivers = await Driver.find({ status: "active" }).select(
      "fullName currentLocation status"
    );

    const debugInfo = {
      orderId,
      orderExists: !!order,
      orderStatus: order?.status,
      orderDriverAssignment: order?.driverAssignment,
      assignmentExists: !!assignment,
      assignmentStatus: assignment?.status,
      driverExists: !!assignment?.driverId,
      driverInfo: assignment?.driverId
        ? {
            id: assignment.driverId._id,
            name: assignment.driverId.fullName,
            currentLocation: assignment.driverId.currentLocation,
            status: assignment.driverId.status,
            hasCoordinates: !!(
              assignment.driverId.currentLocation &&
              assignment.driverId.currentLocation.coordinates
            ),
            coordinatesData: assignment.driverId.currentLocation?.coordinates,
          }
        : null,
      allActiveDrivers: allDrivers.map((driver) => ({
        id: driver._id,
        name: driver.fullName,
        status: driver.status,
        hasLocation: !!driver.currentLocation,
        location: driver.currentLocation,
      })),
    };

    console.log(
      "🔍 Debug tracking result:",
      JSON.stringify(debugInfo, null, 2)
    );

    res.json({
      success: true,
      data: debugInfo,
    });
  } catch (error) {
    console.error("❌ Error in debug tracking:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Debug tracking failed",
    });
  }
});

// Debug endpoint to set mock driver location for testing
router.post("/debug-set-driver-location/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required",
      });
    }

    // Find driver assignment
    const assignment = await DriverAssignment.findOne({
      orderId: orderId,
      status: { $in: ["assigned", "picked_up", "in_transit"] },
    });

    if (!assignment || !assignment.driverId) {
      return res.status(404).json({
        success: false,
        error: "No active driver found for this order",
      });
    }

    // Update driver location
    await Driver.findByIdAndUpdate(assignment.driverId, {
      currentLocation: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON format [lng, lat]
        lastUpdated: new Date(),
      },
    });

    console.log(
      `📍 Set mock location for driver ${assignment.driverId}: [${longitude}, ${latitude}]`
    );

    res.json({
      success: true,
      message: "Driver location updated successfully",
      data: {
        driverId: assignment.driverId,
        location: { latitude, longitude },
      },
    });
  } catch (error) {
    console.error("❌ Error setting driver location:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
