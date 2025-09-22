const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Driver = require("../models/Driver");
const DriverAssignment = require("../models/DriverAssignment");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const MealPlan = require("../models/MealPlan");
const { validationResult } = require("express-validator");

// Generate JWT token
const generateToken = (driverId) => {
  return jwt.sign({ driverId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Generate confirmation code
const generateConfirmationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @desc    Register new driver
// @route   POST /api/driver/auth/register
// @access  Public
const registerDriver = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { fullName, email, password, phone, licenseNumber, vehicleInfo } =
      req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { licenseNumber }],
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: "Driver already exists with this email or license number",
      });
    }

    // Create new driver
    const driver = new Driver({
      fullName,
      email,
      password,
      phone,
      licenseNumber,
      vehicleInfo,
      accountStatus: "pending", // Requires admin approval
    });

    await driver.save();

    // Remove password from response
    const driverResponse = driver.toObject();
    delete driverResponse.password;

    res.status(201).json({
      success: true,
      message: "Registration successful! Your account is pending approval.",
      data: { driver: driverResponse },
    });
  } catch (error) {
    console.error("Driver registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// @desc    Login driver
// @route   POST /api/driver/auth/login
// @access  Public
const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find driver by email
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await driver.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (driver.accountStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: `Account is ${driver.accountStatus}. Please contact admin.`,
      });
    }

    // Update last active
    driver.lastActiveAt = new Date();
    await driver.save();

    // Generate token
    const token = generateToken(driver._id);

    // Remove password from response
    const driverResponse = driver.toObject();
    delete driverResponse.password;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        driver: driverResponse,
        token,
      },
    });
  } catch (error) {
    console.error("Driver login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get driver profile
// @route   GET /api/driver/profile
// @access  Private
const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error("Get driver profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update driver location
// @route   PUT /api/driver/location
// @access  Private
const updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Update driver location in database
    await driver.updateLocation([longitude, latitude]);

    // TODO: Implement WebSocket broadcasting for real-time tracking
    // Currently disabled until driverTrackingWebSocketService is implemented
    console.log('📍 Location updated successfully for driver:', driver._id);

    res.json({
      success: true,
      message: "Location updated successfully",
      activeDeliveries: 0 // TODO: Count active deliveries when WebSocket service is implemented
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get available assignments
// @route   GET /api/driver/assignments
// @access  Private
const getAvailableAssignments = async (req, res) => {
  try {
    console.log("Getting assignments for driver:", req.driver.id);

    const driver = await Driver.findById(req.driver.id);
    if (!driver || driver.accountStatus !== "approved") {
      console.log("Driver not found or not approved:", {
        driverFound: !!driver,
        accountStatus: driver?.accountStatus,
      });
      return res.status(403).json({
        success: false,
        message: "Driver not approved",
      });
    }

    console.log("Driver found:", {
      id: driver._id,
      status: driver.accountStatus,
    });

    // Get driver's current assignments (assigned/picked_up)
    const currentAssignments = await DriverAssignment.find({
      driverId: driver._id,
      status: { $in: ["assigned", "picked_up"] },
    });

    console.log("Current assignments found:", currentAssignments.length);

    // If driver has active assignment, return only that
    if (currentAssignments.length > 0) {
      return res.json({
        success: true,
        data: currentAssignments,
      });
    }

    // Get available assignments near driver
    let availableAssignments = [];

    try {
      if (
        driver.currentLocation &&
        driver.currentLocation.coordinates &&
        driver.currentLocation.coordinates.length === 2 &&
        driver.currentLocation.coordinates.every(
          (coord) => typeof coord === "number" && !isNaN(coord)
        )
      ) {
        console.log(
          "Finding assignments near driver location:",
          driver.currentLocation.coordinates
        );
        availableAssignments = await DriverAssignment.findAvailableAssignments(
          driver.currentLocation.coordinates,
          10 // 10km radius
        );
      } else {
        console.log(
          "Driver has no location, getting all available assignments"
        );
        // If no location, get all available assignments
        availableAssignments = await DriverAssignment.find({
          status: "available",
        }).sort({ priority: -1, assignedAt: 1 });
      }

      console.log("Available assignments found:", availableAssignments.length);
    } catch (assignmentError) {
      console.error("Error fetching assignments:", assignmentError);
      availableAssignments = [];
    }

    res.json({
      success: true,
      data: availableAssignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Accept assignment
// @route   POST /api/driver/assignments/:id/accept
// @access  Private
const acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(req.driver.id);

    if (!driver || driver.accountStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Driver not approved",
      });
    }

    // Check if driver already has active assignments
    const activeAssignments = await DriverAssignment.find({
      driverId: driver._id,
      status: { $in: ["assigned", "picked_up"] },
    });

    if (activeAssignments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You already have an active assignment",
      });
    }

    // Find and update assignment
    const assignment = await DriverAssignment.findOne({
      _id: id,
      status: "available",
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or already taken",
      });
    }

    // Accept assignment
    assignment.driverId = driver._id;
    assignment.status = "assigned";
    assignment.acceptedAt = new Date();
    await assignment.save();

    // Update driver status
    await driver.startDelivery();

    res.json({
      success: true,
      message: "Assignment accepted successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Accept assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Confirm pickup
// @route   PUT /api/driver/assignments/:id/pickup
// @access  Private
const confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickupNotes = "", pickupPhoto = "" } = req.body;

    const assignment = await DriverAssignment.findOne({
      _id: id,
      driverId: req.driver.id,
      status: "assigned",
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or not in correct status",
      });
    }

    // Confirm pickup
    await assignment.confirmPickup({ notes: pickupNotes, photo: pickupPhoto });

    res.json({
      success: true,
      message: "Pickup confirmed successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Confirm pickup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Confirm delivery
// @route   PUT /api/driver/assignments/:id/deliver
// @access  Private
const confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      confirmationCode,
      deliveryNotes = "",
      deliveryPhoto = "",
    } = req.body;

    console.log(
      `🚚 Driver ${req.driver.id} confirming delivery for assignment ${id}`
    );
    console.log(`📝 Request body:`, {
      confirmationCode,
      deliveryNotes,
      deliveryPhoto,
    });

    if (!confirmationCode) {
      console.log("❌ Missing confirmation code");
      return res.status(400).json({
        success: false,
        message: "Confirmation code is required",
      });
    }

    const assignment = await DriverAssignment.findOne({
      _id: id,
      driverId: req.driver.id,
      status: "picked_up",
    }).populate("orderId");

    console.log(
      `🔍 Assignment query result:`,
      assignment ? "Found" : "Not found"
    );

    if (!assignment) {
      // Debug: Let's see what assignments exist for this driver
      const allAssignments = await DriverAssignment.find({ _id: id }).populate(
        "orderId"
      );
      console.log(
        `🔍 Assignment with ID ${id} exists:`,
        allAssignments.length > 0
      );
      if (allAssignments.length > 0) {
        console.log(`📊 Assignment details:`, {
          id: allAssignments[0]._id,
          driverId: allAssignments[0].driverId,
          status: allAssignments[0].status,
          confirmationCode: allAssignments[0].confirmationCode,
        });
        console.log(
          `❌ Driver ID mismatch: ${allAssignments[0].driverId} vs ${req.driver.id}`
        );
      }

      return res.status(404).json({
        success: false,
        message: "Assignment not found or not in correct status",
      });
    }

    // Validate confirmation code
    console.log(`🔑 Confirmation code validation:`, {
      expected: assignment.confirmationCode,
      received: confirmationCode,
      match:
        assignment.confirmationCode.toUpperCase() ===
        confirmationCode.toUpperCase(),
    });

    if (
      assignment.confirmationCode.toUpperCase() !==
      confirmationCode.toUpperCase()
    ) {
      console.log("❌ Confirmation code mismatch");
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation code",
      });
    }

    // Confirm delivery - this will also update the Order status and send notifications
    await assignment.confirmDelivery(confirmationCode, {
      notes: deliveryNotes,
      photo: deliveryPhoto,
    });

    // Handle subscription and meal plan updates
    if (assignment.isFirstDelivery && assignment.subscriptionInfo) {
      const subscription = await Subscription.findById(
        assignment.subscriptionInfo.subscriptionId
      );
      if (subscription) {
        // Update subscription status and activation flags
        if (subscription.status === "pending") {
          subscription.status = "active";
        }

        // Mark first delivery as completed and activate subscription
        subscription.recurringDelivery.activationDeliveryCompleted = true;
        subscription.recurringDelivery.isActivated = true;
        subscription.recurringDelivery.activatedAt = new Date();

        await subscription.save();

        console.log(
          `Subscription ${subscription._id} activated by delivery confirmation - first delivery completed`
        );
      }
    }

    // Update meal plan daily delivery status
    if (assignment.subscriptionInfo && assignment.subscriptionInfo.mealPlanId) {
      const mealPlan = await MealPlan.findById(
        assignment.subscriptionInfo.mealPlanId
      );
      if (mealPlan && mealPlan.dailyDeliveryStatus) {
        const today = new Date().toISOString().split("T")[0];
        const deliveryIndex = mealPlan.dailyDeliveryStatus.findIndex(
          (delivery) => delivery.date.toISOString().split("T")[0] === today
        );

        if (deliveryIndex > -1) {
          mealPlan.dailyDeliveryStatus[deliveryIndex].status = "delivered";
          mealPlan.dailyDeliveryStatus[deliveryIndex].deliveredAt = new Date();
          mealPlan.dailyDeliveryStatus[deliveryIndex].driverId = req.driver.id;
          await mealPlan.save();
        }
      }
    }

    // Update driver stats and go back online
    const driver = await Driver.findById(req.driver.id);
    if (driver) {
      // Update delivery stats
      driver.deliveryStats.completedDeliveries += 1;
      driver.deliveryStats.totalDistance += assignment.totalDistance;
      driver.deliveryStats.totalEarnings += assignment.totalEarning;

      // Update daily stats
      const today = new Date().toDateString();
      if (!driver.dailyStats || driver.dailyStats.date !== today) {
        driver.dailyStats = {
          date: today,
          deliveries: 1,
          distance: assignment.totalDistance,
          earnings: assignment.totalEarning,
        };
      } else {
        driver.dailyStats.deliveries += 1;
        driver.dailyStats.distance += assignment.totalDistance;
        driver.dailyStats.earnings += assignment.totalEarning;
      }

      // Set driver back to online after delivery
      driver.status = "online";
      await driver.save();
    }

    res.json({
      success: true,
      message: "Delivery confirmed successfully! Order has been delivered.",
      data: assignment,
    });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get delivery history
// @route   GET /api/driver/history
// @access  Private
const getDeliveryHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const deliveries = await DriverAssignment.find({
      driverId: req.driver.id,
      status: { $in: ["delivered", "cancelled"] },
    })
      .populate("orderId", "orderNumber totalAmount")
      .sort({ deliveredAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DriverAssignment.countDocuments({
      driverId: req.driver.id,
      status: { $in: ["delivered", "cancelled"] },
    });

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get delivery history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get daily stats
// @route   GET /api/driver/stats/daily
// @access  Private
const getDailyStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const deliveries = await DriverAssignment.find({
      driverId: req.driver.id,
      deliveredAt: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(
      (d) => d.status === "delivered"
    ).length;
    const earnings = deliveries.reduce(
      (sum, d) => sum + (d.totalEarning || 0),
      0
    );
    const distance = deliveries.reduce(
      (sum, d) => sum + (d.totalDistance || 0),
      0
    );

    res.json({
      success: true,
      data: {
        totalDeliveries,
        completedDeliveries,
        earnings,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      },
    });
  } catch (error) {
    console.error("Get daily stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Go online
// @route   POST /api/driver/status/online
// @access  Private
const goOnline = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (driver.accountStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Driver account not approved",
      });
    }

    // Update driver status to online
    driver.status = "online";
    driver.isAvailable = true;
    await driver.save();

    res.json({
      success: true,
      message: "You are now online and ready to receive assignments",
      data: {
        status: driver.status,
        isAvailable: driver.isAvailable,
      },
    });
  } catch (error) {
    console.error("Go online error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Go offline
// @route   POST /api/driver/status/offline
// @access  Private
const goOffline = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Update driver status to offline
    driver.status = "offline";
    driver.isAvailable = false;
    await driver.save();

    res.json({
      success: true,
      message: "You are now offline",
      data: {
        status: driver.status,
        isAvailable: driver.isAvailable,
      },
    });
  } catch (error) {
    console.error("Go offline error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Logout driver
// @route   POST /api/driver/auth/logout
// @access  Private
const logoutDriver = async (req, res) => {
  try {
    // Update driver status to offline
    const driver = await Driver.findById(req.driver.id);
    if (driver) {
      await driver.goOffline();
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout driver error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Verify token
// @route   POST /api/driver/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// @desc    Update driver profile
// @route   PUT /api/driver/profile
// @access  Private
const updateDriverProfile = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const updates = req.body;

    // Fields that the driver is allowed to update
    const allowedUpdates = ["fullName", "phone", "vehicleInfo", "isAvailable"];

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Filter out any updates that are not allowed
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === "vehicleInfo" && typeof updates[key] === "object") {
          driver[key] = { ...driver[key], ...updates[key] };
        } else {
          driver[key] = updates[key];
        }
      }
    });

    const updatedDriver = await driver.save();

    const driverResponse = updatedDriver.toObject();
    delete driverResponse.password;

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: driverResponse,
    });
  } catch (error) {
    console.error("Update driver profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
      error: error.message,
    });
  }
};

// @desc    Get driver location for an order
// @route   GET /api/driver/location/:orderId
// @access  Public (for customer tracking)
const getDriverLocationForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the driver assignment for this order
    const DriverAssignment = require('../models/DriverAssignment');
    const assignment = await DriverAssignment.findOne({ 
      orderId: orderId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    }).populate('driverId', 'fullName currentLocation rating');

    if (!assignment || !assignment.driverId) {
      return res.status(404).json({
        success: false,
        message: "No active driver found for this order"
      });
    }

    const driver = assignment.driverId;
    const currentLocation = driver.currentLocation;

    console.log(`🔍 Driver location debug for ${driver.fullName}:`);
    console.log(`   - currentLocation exists:`, !!currentLocation);
    console.log(`   - currentLocation:`, currentLocation);
    console.log(`   - coordinates exists:`, !!currentLocation?.coordinates);
    console.log(`   - coordinates:`, currentLocation?.coordinates);

    if (!currentLocation || !currentLocation.coordinates) {
      console.log(`❌ Location unavailable - missing coordinates`);
      return res.status(404).json({
        success: false,
        message: "Driver location not available"
      });
    }

    res.json({
      success: true,
      data: {
        driverId: driver._id,
        driverName: driver.fullName,
        rating: driver.rating,
        location: {
          latitude: currentLocation.coordinates[1], // GeoJSON format is [lng, lat]
          longitude: currentLocation.coordinates[0],
          lastUpdated: currentLocation.lastUpdated
        },
        assignmentStatus: assignment.status
      }
    });
  } catch (error) {
    console.error("Get driver location error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = {
  registerDriver,
  loginDriver,
  logoutDriver,
  verifyToken,
  getDriverProfile,
  updateDriverLocation,
  getAvailableAssignments,
  acceptAssignment,
  confirmPickup,
  confirmDelivery,
  getDeliveryHistory,
  getDailyStats,
  goOnline,
  goOffline,
  updateDriverProfile,
  getDriverLocationForOrder,
};
