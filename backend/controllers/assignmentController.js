const Order = require("../models/Order");
const Chef = require("../models/Chef");
const OrderDelegation = require("../models/OrderDelegation");
const NotificationService = require("../services/notificationService");
const mongoose = require("mongoose");

// ============= ORDER ASSIGNMENT UTILITIES =============

/**
 * Calculates a suitability score for a chef for a given order.
 * @param {object} chef - The chef object.
 * @param {object} order - The order object.
 * @returns {object} - The suitability score and the breakdown of the score.
 */
const calculateChefSuitability = (chef, order) => {
  let score = 100;
  const scoreBreakdown = {
    base: 100,
    workload: 0,
    specialization: 0,
    rating: 0,
    proximity: 0,
  };

  // Penalize for high workload
  const workloadPercentage = chef.currentCapacity / (chef.maxCapacity || 10); // Default maxCapacity to 10 if not set
  if (workloadPercentage > 0.5) {
    scoreBreakdown.workload = -((workloadPercentage - 0.5) * 50);
    score += scoreBreakdown.workload;
  }

  // Reward for specialization match
  if (
    order.dietaryRequirements &&
    order.dietaryRequirements.length > 0 &&
    chef.specializations &&
    chef.specializations.length > 0
  ) {
    const matchingSpecializations = chef.specializations.filter((s) =>
      order.dietaryRequirements.includes(s)
    );
    scoreBreakdown.specialization = matchingSpecializations.length * 15;
    score += scoreBreakdown.specialization;
  }

  // Adjust based on rating
  if (chef.rating) {
    if (chef.rating > 4.5) {
      scoreBreakdown.rating = 20;
    } else if (chef.rating > 4.0) {
      scoreBreakdown.rating = 15;
    } else if (chef.rating < 3.5) {
      scoreBreakdown.rating = -25;
    }
    score += scoreBreakdown.rating;
  }

  // Proximity (placeholder for future implementation)
  // if (chef.location && order.customer.address.location) {
  //     const distance = calculateDistance(chef.location, order.customer.address.location);
  //     if (distance < 5) score += 10;
  //     else if (distance > 20) score -= 15;
  // }

  return {
    score: Math.max(0, Math.round(score)), // Ensure score is not negative
    breakdown: scoreBreakdown,
  };
};

// ============= CORE ASSIGNMENT CONTROLLERS =============

/**
 * Get a list of available chefs for a specific order, ranked by suitability.
 */
exports.getAvailableChefsForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId).populate(
      "customer",
      "address dietaryRequirements"
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Find active chefs who are not at full capacity
    const availableChefs = await Chef.find({
      status: "Active",
      currentCapacity: { $lt: 10 }, // Using a hardcoded max capacity for now
    }).lean();

    if (availableChefs.length === 0) {
      return res.json({
        success: true,
        message: "No chefs are currently available",
        data: {
          order,
          recommendedChefs: [],
          otherAvailableChefs: [],
        },
      });
    }

    // Calculate suitability score for each chef
    const chefsWithScores = availableChefs.map((chef) => {
      const suitability = calculateChefSuitability(chef, order);
      return {
        ...chef,
        suitabilityScore: suitability.score,
        suitabilityBreakdown: suitability.breakdown,
      };
    });

    // Sort chefs by suitability score in descending order
    chefsWithScores.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    // Separate into recommended and other available chefs
    const recommendedChefs = chefsWithScores.slice(0, 5); // Top 5 recommendations
    const otherAvailableChefs = chefsWithScores.slice(5);

    res.json({
      success: true,
      data: {
        order,
        recommendedChefs,
        otherAvailableChefs,
      },
    });
  } catch (err) {
    console.error("Get available chefs for order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available chefs",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Automatically assign an order to the best available chef.
 */
exports.autoAssignOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId).populate(
      "customer",
      "address dietaryRequirements"
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Find active chefs who are not at full capacity
    const availableChefs = await Chef.find({
      status: "Active",
      currentCapacity: { $lt: 10 }, // Using a hardcoded max capacity for now
    }).lean();

    if (availableChefs.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No chefs are available for auto-assignment.",
        });
    }

    // Calculate suitability score for each chef
    const chefsWithScores = availableChefs.map((chef) => {
      const suitability = calculateChefSuitability(chef, order);
      return {
        ...chef,
        suitabilityScore: suitability.score,
      };
    });

    // Sort chefs by suitability score
    chefsWithScores.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const bestChef = chefsWithScores[0];

    // Assign the order to the best chef
    // Create a new request object for the assignment call
    const assignmentReq = {
      ...req,
      params: { orderId, chefId: bestChef._id },
      body: { notes: "Auto-assigned by system" },
    };

    await exports.assignOrderToChef(assignmentReq, res);
  } catch (err) {
    console.error("Auto-assign order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to auto-assign order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Assign an order to a specific chef.
 */
exports.assignOrderToChef = async (req, res) => {
  try {
    const { orderId, chefId } = req.params;
    const { notes } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(chefId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order or chef ID" });
    }

    const order = await Order.findById(orderId).populate(
      "customer subscription"
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const chef = await Chef.findById(chefId);
    if (!chef || chef.status !== "Active") {
      return res
        .status(404)
        .json({ success: false, message: "Chef not found or is not active" });
    }

    // Check if this is a subscription order
    const isSubscriptionOrder =
      order.subscription || order.recurringOrder?.parentSubscription;

    if (isSubscriptionOrder) {
      // For subscription orders, find and update existing OrderDelegation
      const delegation = await OrderDelegation.findOne({
        subscriptionId:
          order.subscription || order.recurringOrder.parentSubscription,
      });

      if (!delegation) {
        return res.status(404).json({
          success: false,
          message:
            "OrderDelegation not found for this subscription. Please contact support.",
        });
      }

      // Update chef assignment in delegation
      delegation.chefId = chefId;
      await delegation.save();

      // Update order
      order.assignedChef = chefId;
      order.orderStatus = "Confirmed";
      order.delegationStatus = "Assigned";
      await order.save();

      console.log(
        `✅ Updated subscription OrderDelegation with chef ${chefId}`
      );

      res.json({
        success: true,
        message: `Subscription order successfully assigned to ${chef.fullName}`,
        data: {
          delegation,
          order,
        },
      });
    } else {
      // For regular orders, use old delegation system
      // Check if order is already assigned
      const existingDelegation = await OrderDelegation.findOne({
        order: orderId,
      });
      if (existingDelegation) {
        return res.status(400).json({
          success: false,
          message:
            "Order is already assigned. Please reassign if you want to change the chef.",
          data: {
            assignedChefId: existingDelegation.chef,
          },
        });
      }

      // Generate unique delegation ID
      const delegationCount = await OrderDelegation.countDocuments();
      const delegationId = `DEL${String(delegationCount + 1).padStart(6, "0")}`;

      // Get assignment details from request body or use defaults
      const {
        estimatedHours = 2,
        priority = "Medium",
        specialInstructions = "",
      } = req.body;

      // Calculate estimated completion time
      const estimatedCompletionTime = new Date();
      estimatedCompletionTime.setHours(
        estimatedCompletionTime.getHours() + estimatedHours
      );

      // Calculate payment details using the established 85% chef commission system
      const chefFee = Math.round(order.totalAmount * 0.85); // 85% goes to chef
      const platformFee = order.totalAmount - chefFee; // 15% platform fee
      const totalCost = order.totalAmount;

      // Create a new order delegation record (OLD SCHEMA for regular orders)
      const delegation = new OrderDelegation({
        delegationId,
        order: orderId,
        chef: chefId,
        delegatedBy: "Admin", // TODO: Get actual admin user ID from auth
        estimatedCompletionTime,
        payment: {
          chefFee,
          ingredientsCost: 0, // Will be updated by chef later
          totalCost,
        },
        status: "Assigned",
        priority,
        specialInstructions,
        adminNotes: notes || "",
      });
      await delegation.save();

      // Update chef's workload
      await Chef.findByIdAndUpdate(chefId, {
        $inc: { currentCapacity: 1 },
      });

      // Update order status and assign chef
      order.assignedChef = chefId;
      order.orderStatus = "Confirmed";
      order.delegationStatus = "Assigned";
      await order.save();

      // Send comprehensive notifications to all parties
      try {
        const notificationResult =
          await NotificationService.notifyAllPartiesOrderStatus(
            {
              orderId: order._id,
              orderNumber: order.orderNumber,
              customerId: order.customer?._id,
              customerName: order.customer?.fullName || "Customer",
              chefId: chefId,
              chefName: chef.fullName,
              totalAmount: order.totalAmount,
              deliveryDate: order.deliveryDate,
            },
            {
              oldStatus: "Pending",
              newStatus: "Confirmed",
            },
            {
              assignedBy: "Admin",
              estimatedHours: estimatedHours,
              priority: priority,
              chefFee: chefFee,
              platformFee: platformFee,
            }
          );

        console.log(`Comprehensive notifications sent for order ${orderId}:`, {
          totalSent: notificationResult.totalNotificationsSent,
          success: notificationResult.success,
          errors: notificationResult.results.errors,
        });
      } catch (notificationError) {
        console.error(
          "Failed to send comprehensive notifications:",
          notificationError.message
        );
        // Don't fail the assignment if notification fails
      }

      res.json({
        success: true,
        message: `Order successfully assigned to ${chef.fullName}`,
        data: {
          delegation,
          order,
        },
      });
    }
  } catch (err) {
    console.error("Assign order to chef error:", err);
    // If the response is already sent, just log the error
    if (res.headersSent) {
      return console.error("Error after response sent:", err);
    }
    res.status(500).json({
      success: false,
      message: "Failed to assign order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Reassign an order from one chef to another.
 */
exports.reassignOrder = async (req, res) => {
  try {
    const { orderId, newChefId } = req.params;
    const { notes } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(newChefId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order or chef ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const newChef = await Chef.findById(newChefId);
    if (!newChef || newChef.status !== "Active") {
      return res
        .status(404)
        .json({
          success: false,
          message: "New chef not found or is not active",
        });
    }

    const existingDelegation = await OrderDelegation.findOne({
      order: orderId,
    });
    if (!existingDelegation) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Order was not previously assigned.",
        });
    }

    const oldChefId = existingDelegation.chef;

    // Prevent reassigning to the same chef
    if (oldChefId.toString() === newChefId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot reassign to the same chef." });
    }

    // Update the existing delegation
    existingDelegation.status = "Reassigned";
    existingDelegation.reassignedDate = new Date();
    await existingDelegation.save();

    // Create a new delegation for the new chef
    const newDelegation = new OrderDelegation({
      order: orderId,
      chef: newChefId,
      assignedDate: new Date(),
      status: "Assigned",
      notes: `Reassigned from previous chef. ${notes || ""}`,
    });
    await newDelegation.save();

    // Update order assigned chef
    order.assignedChef = newChefId;
    await order.save();

    // Update workloads for both chefs
    await Chef.findByIdAndUpdate(oldChefId, { $inc: { currentCapacity: -1 } });
    await Chef.findByIdAndUpdate(newChefId, { $inc: { currentCapacity: 1 } });

    // Send notifications
    try {
      // Notify the new chef about the assigned order
      await NotificationService.notifyChefNewOrder(newChefId, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.fullName || "Customer",
        totalAmount: order.totalAmount,
        deliveryDate: order.deliveryDate,
        items: order.items || [],
        reassigned: true,
      });
      console.log(
        `Reassignment notification sent to chef ${newChefId} for order ${orderId}`
      );
    } catch (notificationError) {
      console.error(
        "Failed to send reassignment notification to chef:",
        notificationError.message
      );
      // Don't fail the reassignment if notification fails
    }

    res.json({
      success: true,
      message: `Order successfully reassigned to ${newChef.fullName}`,
      data: {
        newDelegation,
        oldDelegation: existingDelegation,
      },
    });
  } catch (err) {
    console.error("Reassign order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reassign order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get order delegation history.
 */
exports.getDelegationHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const delegations = await OrderDelegation.find()
      .populate("order", "orderNumber totalAmount createdDate")
      .populate("chef", "fullName chefId")
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await OrderDelegation.countDocuments();

    res.json({
      success: true,
      data: {
        delegations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDelegations: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    console.error("Get delegation history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delegation history",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
