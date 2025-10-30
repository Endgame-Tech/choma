const Chef = require("../models/Chef");
const EmailVerification = require("../models/EmailVerification");
const Order = require("../models/Order");
const OrderDelegation = require("../models/OrderDelegation");
const Subscription = require("../models/Subscription");
const SubscriptionChefAssignment = require("../models/SubscriptionChefAssignment");
const driverAssignmentService = require("../services/driverAssignmentService");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const paystackService = require("../services/paystackService");

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable not set");
  process.exit(1);
}

// ============= HELPER FUNCTIONS =============

/**
 * Create or update chef assignment for entire subscription when chef accepts first order
 */
async function createSubscriptionChefAssignment(order, chefId) {
  try {
    const subscription = order.subscription;

    console.log(
      `🍳 Creating subscription chef assignment for subscription ${subscription._id} and chef ${chefId}`
    );

    // Check if assignment already exists for this subscription
    const existingAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      chefId: chefId,
      assignmentStatus: "active",
    });

    if (existingAssignment) {
      console.log(
        `✅ Chef assignment already exists for subscription ${subscription._id}`
      );
      return existingAssignment;
    }

    // Check if there's another chef assigned to this subscription
    const otherChefAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      assignmentStatus: "active",
    });

    if (
      otherChefAssignment &&
      otherChefAssignment.chefId.toString() !== chefId.toString()
    ) {
      console.log(
        `⚠️ Another chef (${otherChefAssignment.chefId}) is already assigned to subscription ${subscription._id}. Reassigning...`
      );

      // Deactivate the other chef's assignment
      otherChefAssignment.assignmentStatus = "reassigned";
      otherChefAssignment.endDate = new Date();
      otherChefAssignment.reassignmentReason =
        "Chef changed due to order acceptance";
      await otherChefAssignment.save();
    }

    // Create new chef assignment for the entire subscription
    const chefAssignment = new SubscriptionChefAssignment({
      subscriptionId: subscription._id,
      chefId: chefId,
      customerId: subscription.userId,
      mealPlanId: subscription.mealPlanId,
      assignmentStatus: "active",
      assignedAt: new Date(),
      acceptedAt: new Date(),
      startDate: new Date(),
      endDate:
        subscription.endDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year if no end date
      assignmentDetails: {
        assignedBy: chefId, // Using chef ID as fallback for required admin field
        assignmentReason: "new_subscription",
        priority: "normal",
        adminNotes: "Auto-assigned when chef accepted subscription order",
      },
    });

    await chefAssignment.save();

    console.log(
      `✅ Created subscription chef assignment ${chefAssignment._id} for chef ${chefId} and subscription ${subscription._id}`
    );

    return chefAssignment;
  } catch (error) {
    console.error("❌ Error creating subscription chef assignment:", error);
    throw error;
  }
}

// ============= CHEF AUTHENTICATION =============

exports.getRegistrationStatus = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if chef exists
    const chef = await Chef.findOne({ email: email.toLowerCase() }).select(
      "-password"
    );

    if (!chef) {
      return res.json({
        success: true,
        data: {
          chefExists: false,
          registrationComplete: false,
        },
      });
    }

    // Check if registration is complete by verifying required fields
    const isRegistrationComplete = !!(
      chef.fullName &&
      chef.email &&
      chef.phone &&
      chef.dateOfBirth &&
      chef.specialties &&
      chef.specialties.length > 0 &&
      chef.location &&
      chef.location.streetAddress &&
      chef.location.city &&
      chef.location.state &&
      chef.emergencyContact &&
      chef.emergencyContact.name &&
      chef.emergencyContact.phone &&
      chef.bankDetails &&
      chef.bankDetails.accountName &&
      chef.bankDetails.accountNumber
    );

    res.json({
      success: true,
      data: {
        chefExists: true,
        registrationComplete: isRegistrationComplete,
        approvalStatus: chef.approvalStatus,
        isActive: chef.isActive,
        chefData: isRegistrationComplete
          ? {
              fullName: chef.fullName,
              email: chef.email,
              phone: chef.phone,
              approvalStatus: chef.approvalStatus,
              isActive: chef.isActive,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get registration status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check registration status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
exports.registerChef = async (req, res) => {
  try {
    const {
      // Personal Information
      fullName,
      email,
      phone,
      alternatePhone,
      dateOfBirth,
      gender,
      password,

      // Identity Verification
      identityVerification,

      // Professional Details
      specialties,
      experience,
      culinaryEducation,
      previousWorkExperience,
      certifications,
      languagesSpoken,

      // Location & Service Area
      location,

      // Kitchen & Equipment
      kitchenDetails,

      // Availability
      availability,

      // Emergency Contact
      emergencyContact,

      // References
      references,

      // Bank Details
      bankDetails,

      // Profile & Portfolio
      profilePhoto,
      portfolioImages,
      bio,

      // Health & Safety
      healthCertificates,
      foodSafetyCertification,

      // Legal Agreements
      agreedToTerms,
      agreedToPrivacyPolicy,
      agreedToBackgroundCheck,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !password || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "Missing required personal information",
      });
    }

    // Check if email has been verified
    const emailVerification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      purpose: "chef_registration",
      verified: true,
    }).sort({ createdAt: -1 });

    if (!emailVerification) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your email first.",
        requiresVerification: true,
      });
    }

    // Check if verification is recent (within 24 hours)
    const verificationAge = Date.now() - emailVerification.verifiedAt.getTime();
    if (verificationAge > 24 * 60 * 60 * 1000) {
      // 24 hours
      return res.status(400).json({
        success: false,
        message:
          "Email verification has expired. Please verify your email again.",
        requiresVerification: true,
      });
    }

    if (!identityVerification?.idType || !identityVerification?.idNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing required identity verification information",
      });
    }

    if (!specialties?.length || !languagesSpoken?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required professional details",
      });
    }

    if (!location?.streetAddress || !location?.city || !location?.state) {
      return res.status(400).json({
        success: false,
        message: "Missing required location information",
      });
    }

    if (
      !kitchenDetails?.kitchenEquipment?.length ||
      !availability?.daysAvailable?.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required kitchen and availability information",
      });
    }

    if (
      !emergencyContact?.name ||
      !emergencyContact?.phone ||
      !bankDetails?.accountName ||
      !bankDetails?.accountNumber ||
      !bankDetails?.bankName
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required emergency contact or bank details",
      });
    }

    if (!agreedToTerms || !agreedToPrivacyPolicy || !agreedToBackgroundCheck) {
      return res.status(400).json({
        success: false,
        message: "You must agree to all terms and conditions",
      });
    }

    // Check if chef already exists
    const existingChef = await Chef.findOne({ email });
    if (existingChef) {
      return res.status(400).json({
        success: false,
        message: "Chef with this email already exists",
      });
    }

    // Create new chef with comprehensive data
    const chef = new Chef({
      // Personal Information
      fullName,
      email,
      phone,
      alternatePhone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      password,

      // Identity Verification
      identityVerification,

      // Professional Details
      specialties: specialties || [],
      experience: experience || 0,
      culinaryEducation,
      previousWorkExperience,
      certifications: certifications || [],
      languagesSpoken: languagesSpoken || ["English"],
      bio,

      // Location & Service Area
      location: {
        streetAddress: location.streetAddress,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country || "Nigeria",
        serviceRadius: location.serviceRadius || 5,
      },

      // Kitchen & Equipment
      kitchenDetails: {
        hasOwnKitchen: kitchenDetails.hasOwnKitchen || true,
        kitchenEquipment: kitchenDetails.kitchenEquipment || [],
        canCookAtCustomerLocation:
          kitchenDetails.canCookAtCustomerLocation || false,
        transportationMethod:
          kitchenDetails.transportationMethod || "Own Vehicle",
      },

      // Availability
      workingHours: {
        start: availability.hoursPerDay?.start || "08:00",
        end: availability.hoursPerDay?.end || "18:00",
      },
      maxCapacity: availability.maxOrdersPerDay || 5,
      preferences: {
        workDays: availability.daysAvailable || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
      },

      // Emergency Contact
      emergencyContact,

      // References
      references: references || [],

      // Bank Details (with verification info)
      bankDetails: {
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        bankCode: bankDetails.bankCode,
        bvn:
          bankDetails.bvn && bankDetails.bvn.length === 11
            ? bankDetails.bvn
            : undefined,
        isVerified: bankDetails.isVerified || false,
        verifiedAt: bankDetails.isVerified ? new Date() : undefined,
        verificationProvider: "paystack",
        recipientCode: bankDetails.recipientCode || undefined,
      },

      // Profile & Portfolio
      profileImage: profilePhoto || "",
      portfolioImages: portfolioImages || [],

      // Health & Safety
      healthCertificates: healthCertificates || [],
      foodSafetyCertification,

      // Legal Agreements
      legalAgreements: {
        agreedToTerms,
        agreedToPrivacyPolicy,
        agreedToBackgroundCheck,
        agreementDate: new Date(),
      },

      // Set status to Pending for admin review
      status: "Pending",
    });

    await chef.save();

    // Generate JWT token
    const token = jwt.sign(
      { chefId: chef._id, email: chef.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Clean up used verification record
    await EmailVerification.deleteOne({
      _id: emailVerification._id,
    });

    res.status(201).json({
      success: true,
      message:
        "Chef application submitted successfully. Your application is now under review by our admin team.",
      data: {
        chef: {
          id: chef._id,
          chefId: chef.chefId,
          fullName: chef.fullName,
          email: chef.email,
          specialties: chef.specialties,
          status: chef.status,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Chef registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register chef",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.loginChef = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find chef by email
    const chef = await Chef.findOne({ email });
    if (!chef) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await chef.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if chef account is active
    if (chef.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${chef.status.toLowerCase()}. Please contact admin.`,
      });
    }

    // Update last login without triggering validation on other fields
    await Chef.findByIdAndUpdate(
      chef._id,
      { lastLogin: new Date() },
      { validateBeforeSave: false }
    );

    // Generate JWT token
    const token = jwt.sign(
      { chefId: chef._id, email: chef.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        chef: {
          id: chef._id,
          chefId: chef.chefId,
          fullName: chef.fullName,
          email: chef.email,
          specialties: chef.specialties,
          availability: chef.availability,
          currentCapacity: chef.currentCapacity,
          maxCapacity: chef.maxCapacity,
          rating: chef.rating,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Chef login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF DASHBOARD =============
exports.getChefDashboard = async (req, res) => {
  try {
    const chefId = req.chef.chefId;

    // Get chef's basic stats
    const chef = await Chef.findById(chefId);

    // Get orders assigned to chef
    const assignedOrders = await Order.find({ assignedChef: chefId })
      .populate("customer", "fullName email phone")
      .populate("subscription", "mealPlanId")
      .sort({ chefAssignedDate: -1 });

    // Get order statistics
    const stats = {
      totalOrders: assignedOrders.length,
      pendingOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "Assigned"
      ).length,
      inProgressOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "In Progress"
      ).length,
      completedOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "Completed"
      ).length,
      currentCapacity: chef.currentCapacity,
      maxCapacity: chef.maxCapacity,
      rating: chef.rating,
      totalEarnings: chef.earnings.total,
      thisMonthEarnings: chef.earnings.thisMonth,
    };

    // Get recent orders (last 10)
    const recentOrders = assignedOrders.slice(0, 10);

    res.json({
      success: true,
      data: {
        chef: {
          id: chef._id,
          chefId: chef.chefId,
          fullName: chef.fullName,
          specialties: chef.specialties,
          availability: chef.availability,
          rating: chef.rating,
        },
        stats,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get chef dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF DASHBOARD STATS =============
exports.getChefDashboardStats = async (req, res) => {
  try {
    const chefId = req.chef.chefId;

    // Get chef's basic stats
    const chef = await Chef.findById(chefId);

    // Get orders assigned to chef
    const assignedOrders = await Order.find({ assignedChef: chefId });

    // Get order statistics
    const stats = {
      totalOrders: assignedOrders.length,
      pendingOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "Assigned"
      ).length,
      inProgressOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "In Progress"
      ).length,
      completedOrders: assignedOrders.filter(
        (o) => o.delegationStatus === "Completed"
      ).length,
      currentCapacity: chef.currentCapacity,
      maxCapacity: chef.maxCapacity,
      rating: chef.rating,
      totalEarnings: chef.earnings.total,
      thisMonthEarnings: chef.earnings.thisMonth,
    };

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Get chef dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= ORDER MANAGEMENT =============
exports.getChefOrders = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { status, page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Build query - ensure chefId is treated as ObjectId
    const query = { assignedChef: new mongoose.Types.ObjectId(chefId) };
    if (status) {
      query.delegationStatus = status;
    }

    const orders = await Order.find(query)
      .populate("customer", "fullName email phone deliveryAddress city state")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          model: "MealPlan",
          select:
            "planName description price duration mealTypes servingSize ingredients nutritionInfo",
        },
      })
      .populate("assignedChef", "fullName email chefId")
      .sort({ chefAssignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Enhance orders with delegation pricing information for chef transparency
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        const delegation = await OrderDelegation.findOne({
          order: order._id,
          chef: new mongoose.Types.ObjectId(chefId),
        });

        if (delegation) {
          // Always include delegation status for debugging
          const orderObj = order.toObject();
          orderObj.actualDelegationStatus = delegation.status; // Current delegation status
          orderObj.delegationStatusMismatch =
            orderObj.delegationStatus !== delegation.status;

          if (delegation.payment) {
            // Calculate detailed breakdown for chef transparency
            const chefFee = delegation.payment.chefFee || 0;
            const ingredientsCost = delegation.payment.ingredientsCost || 0;
            const totalCost = delegation.payment.totalCost || 0;

            // Calculate cooking cost (chefFee - ingredientsCost - profit share)
            // Based on your formula: chefEarnings = ingredients + cookingCosts + (profit * 0.5)
            // We need to reverse-engineer this for transparency
            const totalMealCosts =
              ingredientsCost + (totalCost - ingredientsCost); // ingredients + cooking + packaging
            const totalProfit = totalMealCosts * 0.4; // 40% profit
            const chefProfitShare = totalProfit * 0.5; // Chef gets 50% of profit
            const cookingCost = chefFee - ingredientsCost - chefProfitShare; // Remaining is cooking cost

            orderObj.chefEarning = chefFee;
            orderObj.pricingBreakdown = {
              ingredientsCost,
              cookingCost: Math.max(0, cookingCost), // Ensure non-negative
              chefProfitShare,
              totalChefEarning: chefFee,
            };
          }

          return orderObj;
        }

        return order.toObject();
      })
    );

    const total = await Order.countDocuments(query);

    // Additional debugging - check if there are ANY orders assigned to this chef
    const debugOrders = await Order.find({
      assignedChef: new mongoose.Types.ObjectId(chefId),
    }).select("_id orderNumber delegationStatus assignedChef");

    res.json({
      success: true,
      data: {
        orders: enhancedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get chef orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const chefId = req.chef.chefId;

    const order = await Order.findOne({
      _id: orderId,
      assignedChef: chefId,
    }).populate("subscription");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    if (order.delegationStatus !== "Assigned") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be accepted in its current state",
      });
    }

    // Update order status
    order.delegationStatus = "Accepted";
    order.chefAcceptedDate = new Date();
    await order.save();

    // If this order is part of a subscription, create/update chef assignment for entire subscription
    if (order.subscription) {
      await createSubscriptionChefAssignment(order, chefId);
    }

    // Invalidate mobile app cache for immediate status update
    try {
      const { cacheService } = require("../config/redis");
      const customerId = order.customer;

      if (customerId && cacheService) {
        const cacheKeys = [
          `user:${customerId}:/api/orders/assigned:{}`,
          `user-orders:${customerId}:1:20:`,
          `user:${customerId}:/api/orders:{}`,
        ];

        for (const key of cacheKeys) {
          await cacheService.del(key);
        }
      }
    } catch (cacheError) {
      console.warn(
        "⚠️ Failed to invalidate cache after chef acceptOrder:",
        cacheError.message
      );
    }

    // Update chef's current capacity without triggering validation
    await Chef.findByIdAndUpdate(
      chefId,
      { $inc: { currentCapacity: 1 } },
      { validateBeforeSave: false }
    );

    res.json({
      success: true,
      message: "Order accepted successfully",
      data: order,
    });
  } catch (error) {
    console.error("Accept order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.startOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const chefId = req.chef.chefId;

    const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    if (order.delegationStatus !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: "Order must be accepted before starting",
      });
    }

    // Update order status
    order.delegationStatus = "In Progress";
    order.chefStartedDate = new Date();
    order.orderStatus = "Preparing";
    await order.save();

    // Invalidate mobile app cache for immediate status update
    try {
      const { cacheService } = require("../config/redis");
      const customerId = order.customer;

      if (customerId && cacheService) {
        const cacheKeys = [
          `user:${customerId}:/api/orders/assigned:{}`,
          `user-orders:${customerId}:1:20:`,
          `user:${customerId}:/api/orders:{}`,
        ];

        for (const key of cacheKeys) {
          await cacheService.del(key);
        }
      }
    } catch (cacheError) {
      console.warn(
        "⚠️ Failed to invalidate cache after chef startOrder:",
        cacheError.message
      );
    }

    res.json({
      success: true,
      message: "Order started successfully",
      data: order,
    });
  } catch (error) {
    console.error("Start order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const chefId = req.chef.chefId;

    const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    if (order.delegationStatus !== "In Progress") {
      return res.status(400).json({
        success: false,
        message: "Order must be in progress to complete",
      });
    }

    // Update order status
    order.delegationStatus = "Completed";
    order.chefCompletedDate = new Date();
    order.orderStatus = "Quality Check";
    order.chefNotes = notes || "";
    await order.save();

    // Invalidate mobile app cache for immediate status update
    try {
      const { cacheService } = require("../config/redis");
      const customerId = order.customer;

      if (customerId && cacheService) {
        const cacheKeys = [
          `user:${customerId}:/api/orders/assigned:{}`,
          `user-orders:${customerId}:1:20:`,
          `user:${customerId}:/api/orders:{}`,
        ];

        for (const key of cacheKeys) {
          await cacheService.del(key);
        }
      }
    } catch (cacheError) {
      console.warn(
        "⚠️ Failed to invalidate cache after chef completeOrder:",
        cacheError.message
      );
    }

    // Auto-assign driver for delivery
    let driverAssignmentResult = null;
    try {
      driverAssignmentResult =
        await driverAssignmentService.autoAssignDriverForCompletedOrder(
          order,
          chefId
        );

      if (
        driverAssignmentResult.success &&
        driverAssignmentResult.isNewAssignment
      ) {
        console.log(
          `🚚 Driver ${driverAssignmentResult.driver.fullName} automatically assigned to order ${orderId}`
        );
      } else if (!driverAssignmentResult.success) {
        console.warn(
          `⚠️ Could not auto-assign driver to order ${orderId}: ${driverAssignmentResult.message}`
        );
      }
    } catch (driverError) {
      console.error("❌ Error in driver auto-assignment:", driverError);
      // Don't fail the order completion if driver assignment fails
    }

    // Update chef stats without triggering validation
    const chef = await Chef.findById(chefId);
    const newCapacity = Math.max(0, chef.currentCapacity - 1);
    await Chef.findByIdAndUpdate(
      chefId,
      {
        currentCapacity: newCapacity,
        $inc: { totalOrdersCompleted: 1 },
      },
      { validateBeforeSave: false }
    );

    res.json({
      success: true,
      message: "Order completed successfully",
      data: {
        order,
        driverAssignment: driverAssignmentResult?.success
          ? {
              assigned: true,
              driverName: driverAssignmentResult.driver?.fullName,
              confirmationCode:
                driverAssignmentResult.assignment?.confirmationCode,
              estimatedPickupTime:
                driverAssignmentResult.assignment?.estimatedPickupTime,
            }
          : {
              assigned: false,
              reason:
                driverAssignmentResult?.message || "Driver assignment failed",
            },
      },
    });
  } catch (error) {
    console.error("Complete order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const chefId = req.chef.chefId;

    const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    if (order.delegationStatus !== "Assigned") {
      return res.status(400).json({
        success: false,
        message: "Only assigned orders can be rejected",
      });
    }

    // Reset order for reassignment
    order.assignedChef = null;
    order.delegationStatus = "Not Assigned";
    order.chefNotes = `Rejected by chef: ${reason || "No reason provided"}`;
    await order.save();

    res.json({
      success: true,
      message: "Order rejected successfully",
      data: order,
    });
  } catch (error) {
    console.error("Reject order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update order status (generic status update for orders)
 * Maps to specific order states and handles transitions
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, chefNotes } = req.body;
    const chefId = req.chef.chefId;

    const order = await Order.findOne({ _id: orderId, assignedChef: chefId }).populate("subscription");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    // Map frontend status to backend status
    // Frontend sends: 'Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'
    // Backend uses: delegationStatus for chef workflow
    let newDelegationStatus;

    switch (status) {
      case "Accepted":
        newDelegationStatus = "Accepted";
        if (order.delegationStatus !== "Assigned") {
          return res.status(400).json({
            success: false,
            message: "Order can only be accepted when in 'Assigned' state",
          });
        }
        order.chefAcceptedDate = new Date();
        break;

      case "Preparing":
      case "In Progress":
        newDelegationStatus = "In Progress";
        break;

      case "Ready":
        newDelegationStatus = "Ready";
        break;

      case "Completed":
        newDelegationStatus = "Completed";
        order.orderStatus = "Completed";
        order.deliveredDate = new Date();
        break;

      case "Cancelled":
        newDelegationStatus = "Cancelled";
        order.orderStatus = "Cancelled";
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${status}`,
        });
    }

    // Update the order
    order.delegationStatus = newDelegationStatus;
    if (chefNotes) {
      order.chefNotes = chefNotes;
    }
    await order.save();

    // If this is an "Accepted" status and order is part of a subscription,
    // create/update chef assignment for entire subscription
    if (status === "Accepted" && order.subscription) {
      console.log(`✅ Order ${orderId} accepted - Creating subscription chef assignment`);
      await createSubscriptionChefAssignment(order, chefId);
    } else if (status === "Accepted" && !order.subscription) {
      console.log(`ℹ️ Order ${orderId} accepted but not linked to subscription - skipping chef assignment creation`);
    }

    // Invalidate mobile app cache
    try {
      const { cacheService } = require("../config/redis");
      const customerId = order.customer;

      if (customerId && cacheService) {
        const cacheKeys = [
          `user:${customerId}:/api/orders/assigned:{}`,
          `user-orders:${customerId}:1:20:`,
          `user:${customerId}:/api/orders:{}`,
        ];

        for (const key of cacheKeys) {
          await cacheService.del(key);
        }
      }
    } catch (cacheError) {
      console.warn(
        "⚠️ Failed to invalidate cache after order status update:",
        cacheError.message
      );
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF PROFILE MANAGEMENT =============
exports.getChefProfile = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const chef = await Chef.findById(chefId).select("-password");

    res.json({
      success: true,
      data: chef,
    });
  } catch (error) {
    console.error("Get chef profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateChefProfile = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.chefId;
    delete updates.status;
    delete updates.earnings;

    const chef = await Chef.findByIdAndUpdate(
      chefId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: chef,
    });
  } catch (error) {
    console.error("Update chef profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { availability } = req.body;

    if (!["Available", "Busy", "Offline"].includes(availability)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability status",
      });
    }

    const chef = await Chef.findByIdAndUpdate(
      chefId,
      { availability, updatedAt: new Date() },
      { new: true }
    ).select("fullName availability currentCapacity maxCapacity");

    res.json({
      success: true,
      message: "Availability updated successfully",
      data: chef,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF ANALYTICS =============
exports.getChefAnalytics = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { period = "month" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get orders for the period
    const orders = await Order.find({
      assignedChef: chefId,
      chefAssignedDate: { $gte: startDate, $lte: now },
    });

    // Calculate analytics
    const analytics = {
      totalOrders: orders.length,
      completedOrders: orders.filter((o) => o.delegationStatus === "Completed")
        .length,
      rejectedOrders: orders.filter(
        (o) => o.chefNotes && o.chefNotes.includes("Rejected")
      ).length,
      averageRating:
        orders
          .filter((o) => o.chefRating)
          .reduce((sum, o) => sum + o.chefRating, 0) /
          orders.filter((o) => o.chefRating).length || 0,
      totalEarnings:
        orders.filter((o) => o.delegationStatus === "Completed").length *
        (process.env.PER_ORDER_EARNING || 500), // Use env variable or default
      completionRate:
        orders.length > 0
          ? (
              (orders.filter((o) => o.delegationStatus === "Completed").length /
                orders.length) *
              100
            ).toFixed(1)
          : 0,
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get chef analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= NOTIFICATION MANAGEMENT =============
exports.getChefNotifications = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId: chefId };

    if (unreadOnly === "true") {
      query.read = false;
    }

    const Notification = require("../models/Notification");

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: chefId,
      read: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          unreadCount,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get chef notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { notificationId } = req.params;

    const Notification = require("../models/Notification");

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: chefId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("❌ Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF STATUS UPDATE =============
exports.updateChefStatus = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { orderId } = req.params;
    const { chefStatus } = req.body;

    // Validate chef status (must match OrderDelegation enum)
    const validStatuses = [
      "Assigned",
      "Accepted",
      "In Progress",
      "Ready",
      "Completed",
    ];
    if (!validStatuses.includes(chefStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid chef status. Must be one of: " + validStatuses.join(", "),
      });
    }

    // Find the order delegation
    const delegation = await OrderDelegation.findOne({
      order: orderId,
      chef: chefId,
    });

    if (!delegation) {
      return res.status(404).json({
        success: false,
        message: "Order delegation not found for this chef",
      });
    }

    // Update the delegation status
    delegation.status = chefStatus;
    delegation.updatedAt = new Date();
    await delegation.save();

    // IMPORTANT: Also update the Order.delegationStatus field so it syncs properly
    const orderUpdate = {
      delegationStatus: chefStatus,
      updatedAt: new Date(),
    };

    // When chef marks as completed, set status to Quality Check before delivery
    if (chefStatus === "Completed") {
      orderUpdate.orderStatus = "Quality Check";
    }

    await Order.findByIdAndUpdate(orderId, orderUpdate);

    // Track chef earnings when order is completed
    if (chefStatus === "Completed") {
      try {
        const ChefEarning = require("../models/ChefEarning");

        // Check if earnings already recorded for this order
        const existingEarning = await ChefEarning.findOne({
          chef: chefId,
          order: orderId,
        });

        if (!existingEarning) {
          // Get the order to calculate earnings
          const orderDoc = await Order.findById(orderId);

          // Calculate chef earnings (85% of order total, 15% platform fee)
          const orderTotal = orderDoc?.totalAmount || delegation.chefFee || 0;
          const chefPercentage = delegation.chefFeePercentage || 85;
          const cookingFee = (orderTotal * chefPercentage) / 100;

          const currentDate = new Date();
          const weekStart = ChefEarning.getWeekStart(currentDate);
          const weekEnd = ChefEarning.getWeekEnd(currentDate);

          await ChefEarning.create({
            chef: chefId,
            order: orderId,
            cookingFee,
            orderTotal,
            chefPercentage,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            completedDate: currentDate,
            status: "pending", // Will be paid on Friday
          });
        }
      } catch (earningError) {
        console.warn("⚠️ Failed to record chef earning:", earningError.message);
      }
    }

    // Get the updated order with delegation info
    const order = await Order.findById(orderId)
      .populate("customer", "fullName email phone")
      .populate("subscription.mealPlanId", "planName planType duration")
      .populate({
        path: "assignedChef",
        select: "fullName email rating totalOrdersCompleted",
      });

    if (order) {
      // Add delegation status to order object for response
      order.delegationStatus = chefStatus;
    }

    // Send notification to admin and customer about status change
    try {
      const NotificationService = require("../services/notificationService");

      // Send notification to admin
      const Notification = require("../models/Notification");
      await Notification.create({
        userId: new require("mongoose").Types.ObjectId(), // Valid ObjectId for admin notifications
        type: "chef_status_update",
        title: "Chef Status Updated",
        message: `Chef has updated status to "${chefStatus}" for order #${order?.orderNumber}`,
        data: {
          orderId,
          chefId,
          newStatus: chefStatus,
          orderNumber: order?.orderNumber,
        },
      });

      // Send real-time notification to customer
      if (order && order.customer) {
        const statusMessages = {
          Assigned:
            "Your order has been assigned to a chef and will begin preparation soon!",
          Accepted:
            "Great news! Your chef has accepted your order and will start cooking shortly.",
          "In Progress": "🍳 Your chef is now preparing your delicious meal!",
          Ready: "🍽️ Your meal is ready! It will be delivered to you soon.",
          Completed:
            "✅ Your order has been completed successfully! Enjoy your meal!",
        };

        await NotificationService.createNotification({
          userId: order.customer._id,
          title: "Order Status Update",
          message:
            statusMessages[chefStatus] ||
            `Your order status has been updated to ${chefStatus}`,
          type: "order_status_update",
          data: {
            orderId,
            chefStatus,
            // Don't include orderNumber for customer privacy
          },
          priority: chefStatus === "Ready" ? "high" : "medium",
        });
      }
    } catch (notificationError) {
      console.warn(
        "⚠️ Failed to send notification:",
        notificationError.message
      );
    }

    // CRITICAL: Invalidate mobile app order caches so status updates are immediate
    try {
      const { cacheService } = require("../config/redis");
      const customerId = order?.customer?._id;

      if (customerId && cacheService) {
        // Invalidate the specific cache keys that mobile app uses
        const cacheKeys = [
          `user:${customerId}:/api/orders/assigned:{}`, // User's assigned orders
          `user-orders:${customerId}:1:20:`, // User's general orders
          `user:${customerId}:/api/orders:{}`, // User's orders endpoint
        ];

        for (const key of cacheKeys) {
          await cacheService.del(key);
        }
        console.log(
          `🔄 Cache invalidated for customer ${customerId} after chef status update to "${chefStatus}"`
        );
      }
    } catch (cacheError) {
      console.warn("⚠️ Failed to invalidate cache:", cacheError.message);
      // Don't fail the request if cache invalidation fails
    }

    // Send real-time update to customer via WebSocket
    try {
      const socketService = require("../services/socketService");
      if (order && order.customer) {
        socketService.sendToCustomer(
          order.customer._id,
          "order:status_update",
          {
            orderId: order._id,
            delegationStatus: order.delegationStatus,
            orderStatus: order.orderStatus,
            chefNotes: order.chefNotes,
          }
        );
      }
    } catch (socketError) {
      console.warn("⚠️ Failed to send socket update:", socketError.message);
    }

    res.json({
      success: true,
      message: `Chef status updated to ${chefStatus}`,
      data: order,
    });
  } catch (error) {
    console.error("❌ Update chef status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update chef status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= PASSWORD RESET =============

// Forgot password - Send reset link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find chef by email
    const chef = await Chef.findOne({ email: email.toLowerCase() });
    if (!chef) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Generate reset token
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    chef.resetPasswordToken = resetToken;
    chef.resetPasswordExpires = resetTokenExpires;
    await chef.save();

    // Send reset email
    const EmailService = require("../services/emailService");
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}&email=${encodeURIComponent(
      chef.email
    )}`;

    try {
      await EmailService.sendPasswordResetEmail({
        email: chef.email,
        name: chef.fullName,
        resetUrl: resetUrl,
      });

      res.json({
        success: true,
        message: "Password reset link sent to your email address.",
      });
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);

      // Clear the reset token if email failed
      chef.resetPasswordToken = undefined;
      chef.resetPasswordExpires = undefined;
      await chef.save();

      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required",
      });
    }

    // Find chef with valid reset token
    const chef = await Chef.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!chef) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    res.json({
      success: true,
      message: "Reset token is valid",
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify reset token",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, email, and password are required",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Find chef with valid reset token
    const chef = await Chef.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!chef) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const bcrypt = require("bcryptjs");
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    chef.password = hashedPassword;
    chef.resetPasswordToken = undefined;
    chef.resetPasswordExpires = undefined;
    chef.passwordChangedAt = new Date();

    await chef.save();

    // Send confirmation email
    const EmailService = require("../services/emailService");
    try {
      await EmailService.sendPasswordResetConfirmation({
        email: chef.email,
        name: chef.fullName,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= CHEF EARNINGS =============

// Get chef earnings summary
exports.getChefEarnings = async (req, res) => {
  try {
    const chefId = req.chef.chefId;
    const { period = "current_week" } = req.query;

    const ChefEarning = require("../models/ChefEarning");
    const currentDate = new Date();

    let startDate, endDate;

    switch (period) {
      case "current_week":
        startDate = ChefEarning.getWeekStart(currentDate);
        endDate = ChefEarning.getWeekEnd(currentDate);
        break;
      case "last_week":
        const lastWeek = new Date(currentDate);
        lastWeek.setDate(currentDate.getDate() - 7);
        startDate = ChefEarning.getWeekStart(lastWeek);
        endDate = ChefEarning.getWeekEnd(lastWeek);
        break;
      case "current_month":
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );
        break;
      default:
        startDate = ChefEarning.getWeekStart(currentDate);
        endDate = ChefEarning.getWeekEnd(currentDate);
    }

    // Get earnings for the period
    const earnings = await ChefEarning.find({
      chef: chefId,
      completedDate: { $gte: startDate, $lte: endDate },
    }).populate("order", "totalAmount deliveryDate"); // Removed orderNumber for privacy

    // Calculate totals
    const totalPending = earnings
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.cookingFee, 0);

    const totalPaid = earnings
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.cookingFee, 0);

    const totalEarnings = totalPending + totalPaid;

    // Get next payout date (next Friday)
    const nextPayoutDate = ChefEarning.getNextFridayPayout(currentDate);

    // Group earnings by day for weekly view
    const dailyEarnings = {};
    earnings.forEach((earning) => {
      const day = earning.completedDate.toISOString().split("T")[0];
      if (!dailyEarnings[day]) {
        dailyEarnings[day] = {
          date: day,
          totalEarnings: 0,
          completedOrders: 0,
          orders: [],
        };
      }
      dailyEarnings[day].totalEarnings += earning.cookingFee;
      dailyEarnings[day].completedOrders += 1;
      dailyEarnings[day].orders.push({
        orderId: earning.order._id,
        cookingFee: earning.cookingFee,
        status: earning.status,
      });
    });

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        summary: {
          totalEarnings,
          totalPending,
          totalPaid,
          completedOrders: earnings.length,
          nextPayoutDate,
        },
        dailyEarnings: Object.values(dailyEarnings).sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        ),
        earnings: earnings.map((e) => ({
          id: e._id,
          cookingFee: e.cookingFee,
          orderTotal: e.orderTotal,
          status: e.status,
          completedDate: e.completedDate,
          payoutDate: e.payoutDate,
          chefPercentage: e.chefPercentage,
        })),
      },
    });
  } catch (error) {
    console.error("Get chef earnings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get earnings data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get detailed meal plan for an order
exports.getMealPlan = async (req, res) => {
  try {
    const { orderId } = req.params;
    const chefId = req.chef.chefId;

    // Verify the order belongs to this chef
    const order = await Order.findOne({
      _id: orderId,
      assignedChef: new mongoose.Types.ObjectId(chefId),
    }).populate({
      path: "subscription",
      populate: {
        path: "mealPlanId",
        model: "MealPlan",
        select: "planName description durationWeeks nutritionInfo",
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    // Get the delegation to access special notes
    const delegation = await OrderDelegation.findOne({
      order: orderId,
      chef: new mongoose.Types.ObjectId(chefId),
    });

    // Get meal plan assignments (daily meals)
    const MealPlanAssignment = require("../models/MealPlanAssignment");
    const DailyMeal = require("../models/DailyMeal");

    const mealPlan = order.subscription?.mealPlanId;

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found for this order",
      });
    }

    // Get meal assignments for this meal plan
    const assignments = await MealPlanAssignment.find({
      mealPlanId: mealPlan._id,
    })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    console.log("🔍 Found assignments:", assignments.length);

    // Group meals by day (combine week and day into single day number)
    const dailyMeals = {};
    let totalCalories = 0;
    let totalMeals = 0;

    assignments.forEach((assignment) => {
      // Calculate day number: week 1 day 1 = day 1, week 2 day 1 = day 8, etc.
      const dayNumber = (assignment.weekNumber - 1) * 7 + assignment.dayOfWeek;
      const mealType = assignment.mealTime; // breakfast, lunch, dinner

      if (!dailyMeals[dayNumber]) {
        dailyMeals[dayNumber] = { day: dayNumber, meals: {} };
      }

      if (!dailyMeals[dayNumber].meals[mealType]) {
        dailyMeals[dayNumber].meals[mealType] = [];
      }

      // Process each meal in the assignment (mealIds is an array)
      if (assignment.mealIds && assignment.mealIds.length > 0) {
        assignment.mealIds.forEach((meal) => {
          if (meal) {
            dailyMeals[dayNumber].meals[mealType].push({
              _id: meal._id,
              name: meal.name,
              ingredients: meal.ingredients,
              instructions:
                meal.adminNotes ||
                meal.chefNotes ||
                assignment.notes ||
                "No specific instructions provided.",
              preparationTime: meal.preparationTime || 30,
              complexityLevel: meal.complexityLevel || "medium",
              nutrition: meal.nutrition || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                weight: 0,
              },
              allergens: meal.allergens || [],
              category: meal.category || "main",
            });

            // Add to totals
            if (meal.nutrition && meal.nutrition.calories) {
              totalCalories += meal.nutrition.calories;
              totalMeals += 1;
            }
          }
        });
      }
    });

    // Convert dailyMeals object to array
    const dailyMealsArray = Object.values(dailyMeals).sort(
      (a, b) => a.day - b.day
    );

    // Calculate nutrition info
    const totalNutrition = {
      totalCalories,
      avgCaloriesPerDay:
        dailyMealsArray.length > 0
          ? Math.round(totalCalories / dailyMealsArray.length)
          : 0,
      avgCaloriesPerMeal:
        totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0,
    };

    // Prepare special notes
    const specialNotes = {
      customerRequests: order.specialInstructions || null,
      adminInstructions:
        delegation?.adminNotes || delegation?.specialInstructions || null,
      dietaryRestrictions: [],
    };

    // Extract dietary restrictions from customer requests
    if (order.specialInstructions) {
      const restrictions = order.specialInstructions
        .toLowerCase()
        .split(/[,;]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
        .map((r) => r.charAt(0).toUpperCase() + r.slice(1));

      specialNotes.dietaryRestrictions = restrictions;
    }

    const mealPlanData = {
      planName: mealPlan.planName || "Meal Preparation Service",
      duration: mealPlan.durationWeeks || dailyMealsArray.length,
      dailyMeals: dailyMealsArray,
      specialNotes,
      totalNutrition,
    };

    console.log("✅ Meal plan data prepared:", {
      planName: mealPlanData.planName,
      daysCount: dailyMealsArray.length,
      totalMeals: totalMeals,
      hasSpecialNotes: !!(
        specialNotes.customerRequests || specialNotes.adminInstructions
      ),
    });

    res.json({
      success: true,
      data: mealPlanData,
    });
  } catch (error) {
    console.error("❌ Get meal plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get earnings breakdown for a specific order by summing actual meal plan assignment data
exports.getOrderEarningsBreakdown = async (req, res) => {
  try {
    const { orderId } = req.params;
    const chefId = req.chef.chefId;

    console.log(
      "🧮 Getting earnings breakdown for order:",
      orderId,
      "chef:",
      chefId
    );

    // Verify the order belongs to this chef
    const order = await Order.findOne({
      _id: orderId,
      assignedChef: new mongoose.Types.ObjectId(chefId),
    }).populate({
      path: "subscription",
      populate: {
        path: "mealPlanId",
        model: "MealPlan",
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    const mealPlan = order.subscription?.mealPlanId;
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found for this order",
      });
    }

    // Get meal assignments for this meal plan
    const MealPlanAssignment = require("../models/MealPlanAssignment");
    const assignments = await MealPlanAssignment.find({
      mealPlanId: mealPlan._id,
    })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    console.log(
      "📊 Found assignments for earnings calculation:",
      assignments.length
    );

    // Calculate totals from actual meal data
    let totalIngredientsCost = 0;
    let totalCookingCost = 0;
    let totalChefProfitShare = 0;
    let totalMealsCount = 0;

    assignments.forEach((assignment) => {
      if (assignment.mealIds && assignment.mealIds.length > 0) {
        assignment.mealIds.forEach((meal) => {
          if (meal && meal.pricing) {
            // Sum up the individual components that the chef gets
            const mealIngredients = meal.pricing.ingredients || 0;
            const mealCooking = meal.pricing.cookingCosts || 0;
            const mealProfit = meal.pricing.profit || 0;
            const chefProfitShare = mealProfit * 0.5; // Chef gets 50% of profit

            totalIngredientsCost += mealIngredients;
            totalCookingCost += mealCooking;
            totalChefProfitShare += chefProfitShare;
            totalMealsCount += 1;

            console.log(
              `💰 Meal ${meal.mealId}: ingredients=${mealIngredients}, cooking=${mealCooking}, profit_share=${chefProfitShare}`
            );
          }
        });
      }
    });

    // Total chef earnings is the sum of all three components
    const totalChefEarnings =
      totalIngredientsCost + totalCookingCost + totalChefProfitShare;

    const earningsBreakdown = {
      totalChefEarnings,
      totalIngredientsCost,
      totalCookingCost,
      totalChefProfitShare,
      totalMealsCount,
      planName: mealPlan.planName,
      planDuration: mealPlan.durationWeeks,
    };

    console.log("✅ Earnings breakdown calculated:", earningsBreakdown);

    res.json({
      success: true,
      data: earningsBreakdown,
    });
  } catch (error) {
    console.error("❌ Get earnings breakdown error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings breakdown",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
