const Subscription = require("../models/Subscription");
const MealPlan = require("../models/MealPlan");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const OrderDelegation = require("../models/OrderDelegation");
const SubscriptionDelivery = require("../models/SubscriptionDelivery");
const SubscriptionChefAssignment = require("../models/SubscriptionChefAssignment");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Chef = require("../models/Chef");
const mealProgressionService = require("../services/mealProgressionService");
const mealAssignmentService = require("../services/mealAssignmentService");
const {
  compileMealPlanSnapshot,
} = require("../services/mealPlanSnapshotService");

/**
 * Generate ONE Order and OrderDelegation for entire subscription
 * Creates daily timeline linking meal schedule dates
 */
async function generateOrderForSubscription(subscription) {
  try {
    console.log(`📦 Generating order for subscription ${subscription._id}`);

    if (!subscription.mealPlanSnapshot?.mealSchedule) {
      console.log("⚠️ No meal schedule found, skipping order generation");
      return null;
    }

    // Check if order already exists for this subscription
    const existingOrder = await Order.findOne({
      "recurringOrder.parentSubscription": subscription._id,
    });

    if (existingOrder) {
      console.log(`✓ Order already exists for subscription`);
      return existingOrder;
    }

    // Group meal slots by delivery date to create daily timeline
    const mealsByDate = {};
    subscription.mealPlanSnapshot.mealSchedule.forEach((slot) => {
      if (!slot.scheduledDeliveryDate) return;

      const deliveryDate = new Date(slot.scheduledDeliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      const dateKey = deliveryDate.toISOString().split("T")[0];

      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }

      mealsByDate[dateKey].push(slot);
    });

    const uniqueDates = Object.keys(mealsByDate).sort();
    console.log(`📅 Found ${uniqueDates.length} unique delivery dates`);

    // Calculate total amount from all meals
    const totalAmount =
      subscription.mealPlanSnapshot.pricing?.totalPrice ||
      subscription.totalPrice ||
      0;

    // Build order items from first day's meals (representative)
    const firstDateMeals = mealsByDate[uniqueDates[0]] || [];
    const orderItems = {
      meals: firstDateMeals.map((slot) => ({
        mealTime: slot.mealTime,
        customTitle: slot.customTitle,
        mealId: slot.meals?.[0]?.mealId,
        name: slot.meals?.[0]?.name || slot.customTitle,
        image: slot.meals?.[0]?.image,
        quantity: 1,
        price: slot.meals?.[0]?.pricing?.totalPrice || 0,
        nutrition: slot.meals?.[0]?.nutrition,
      })),
    };

    // Get chef assignment if exists
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      assignmentStatus: "active",
    });

    // Create ONE order for entire subscription
    const order = await Order.create({
      orderNumber: subscription.subscriptionId, // Already has SUB- prefix
      customer: subscription.userId,
      subscription: subscription._id,

      // Order details
      orderItems: orderItems,
      orderStatus: "Pending",
      delegationStatus: chefAssignment ? "Assigned" : "Not Assigned",

      // Payment (already paid via subscription)
      totalAmount: totalAmount,
      paymentMethod: subscription.paymentInfo?.method || "Card",
      paymentStatus: "Paid",
      paymentReference: subscription.paymentInfo?.reference,

      // Delivery details (first delivery date)
      deliveryAddress: subscription.deliveryAddress || "No address provided",
      deliveryDate: new Date(uniqueDates[0]),
      estimatedDelivery: new Date(uniqueDates[0]),
      deliveryNotes: `Subscription order - ${uniqueDates.length} deliveries`,

      // Chef assignment (if exists)
      assignedChef: chefAssignment?.chefId || null,

      // Priority
      priority: "Medium",

      // Recurring order metadata
      recurringOrder: {
        orderType: "subscription-recurring",
        parentSubscription: subscription._id,
      },

      adminNotes: `Subscription order covering ${uniqueDates.length} delivery dates`,
      specialInstructions: subscription.specialInstructions || "",
    });

    console.log(`✅ Created order ${order.orderNumber}`);

    // Create OrderDelegation with daily timeline
    const dailyTimeline = uniqueDates.map((dateKey, index) => ({
      date: new Date(dateKey),
      timelineId: `TL-${subscription.subscriptionId}-${index + 1}`,
      status: "pending",
    }));

    const orderDelegation = await OrderDelegation.create({
      subscriptionId: subscription._id,
      orderId: order._id,
      chefId: chefAssignment?.chefId || null,
      driverId: null,
      dailyTimeline: dailyTimeline,
    });

    console.log(
      `✅ Created OrderDelegation with ${dailyTimeline.length} daily entries`
    );

    // Update meal schedule slots with timelineId
    const timelineIdsByDate = {};
    dailyTimeline.forEach((entry) => {
      const dateKey = new Date(entry.date).toISOString().split("T")[0];
      timelineIdsByDate[dateKey] = entry.timelineId;
    });

    subscription.mealPlanSnapshot.mealSchedule.forEach((slot) => {
      if (slot.scheduledDeliveryDate) {
        const slotDate = new Date(slot.scheduledDeliveryDate);
        slotDate.setHours(0, 0, 0, 0);
        const dateKey = slotDate.toISOString().split("T")[0];
        slot.timelineId = timelineIdsByDate[dateKey];
      }
    });

    await subscription.save();
    console.log(`✅ Updated meal schedule with timelineIds`);

    return { order, orderDelegation };
  } catch (error) {
    console.error("❌ Error generating order:", error);
    throw error;
  }
}

/**
 * Auto-assign an available chef to a new subscription
 * This ensures subscriptions appear in chef dashboards immediately
 */
async function autoAssignChefToSubscription(subscription) {
  try {
    console.log(`🍳 Auto-assigning chef to subscription ${subscription._id}`);

    // Check if already assigned
    const existingAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      assignmentStatus: "active",
    });

    if (existingAssignment) {
      console.log(
        `✅ Subscription ${subscription._id} already has chef assignment`
      );
      return existingAssignment;
    }

    // Find available chefs (active, verified, with capacity)
    const availableChefs = await Chef.find({
      isActive: true,
      isVerified: true,
      status: { $in: ["Active", "Available"] },
      // You can add more criteria here like location, specialty, capacity
    }).limit(10); // Limit for performance

    if (availableChefs.length === 0) {
      console.log("⚠️ No available chefs found for auto-assignment");
      return null;
    }

    // Simple round-robin assignment (pick first available chef)
    // In production, you might want more sophisticated logic like:
    // - Workload balancing
    // - Location-based assignment
    // - Specialty matching
    const selectedChef = availableChefs[0];

    // Create chef assignment
    const chefAssignment = new SubscriptionChefAssignment({
      subscriptionId: subscription._id,
      chefId: selectedChef._id,
      customerId: subscription.userId,
      mealPlanId: subscription.mealPlanId,
      assignmentStatus: "active",
      assignedAt: new Date(),
      startDate: subscription.startDate || new Date(),
      endDate:
        subscription.endDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      assignmentDetails: {
        assignedBy: "system", // Indicate this was auto-assigned
        assignmentReason: "auto_assignment_on_subscription_creation",
        priority: "normal",
        adminNotes: "Auto-assigned during subscription creation",
      },
    });

    await chefAssignment.save();

    console.log(
      `✅ Auto-assigned chef ${selectedChef._id} (${selectedChef.fullName}) to subscription ${subscription._id}`
    );

    return chefAssignment;
  } catch (error) {
    console.error("❌ Error in auto-assignment:", error);
    throw error;
  }
}

// Get user's subscriptions
exports.getUserSubscriptions = async (req, res) => {
  try {
    console.log("🔍 getUserSubscriptions - User ID from token:", req.user.id);

    const subscriptions = await Subscription.find({ userId: req.user.id })
      .populate("mealPlanId")
      .sort({ createdDate: -1 });

    console.log(
      `📦 Found ${subscriptions.length} subscriptions for user ${req.user.id}`
    );

    if (subscriptions.length > 0) {
      console.log("📋 First subscription:", {
        id: subscriptions[0]._id,
        userId: subscriptions[0].userId,
        status: subscriptions[0].status,
        startDate: subscriptions[0].startDate,
      });
    }

    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    });
  } catch (err) {
    console.error("Get user subscriptions error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    })
      .populate("mealPlanId")
      .populate("userId", "fullName email phone");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (err) {
    console.error("Get subscription by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Create new subscription
exports.createSubscription = async (req, res) => {
  try {
    console.log(
      "📋 Subscription creation request body:",
      JSON.stringify(req.body, null, 2)
    );

    const {
      mealPlan,
      selectedMealTypes,
      frequency,
      duration,
      durationWeeks,
      fullPlanDuration,
      startDate,
      deliveryAddress,
      specialInstructions,
      totalPrice,
      basePlanPrice,
      frequencyMultiplier,
      durationMultiplier,
      subscriptionId,
      paymentStatus,
      paymentReference,
      transactionId,
    } = req.body;

    // Validation
    if (!mealPlan) {
      return res.status(400).json({
        success: false,
        message: "Meal plan is required",
      });
    }

    if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid total price is required",
      });
    }

    // Verify meal plan exists
    const mealPlanDoc = await MealPlan.findById(mealPlan);
    if (!mealPlanDoc) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    console.log("📊 Meal plan found:", {
      planName: mealPlanDoc.planName,
      totalPrice: mealPlanDoc.totalPrice,
      durationWeeks: mealPlanDoc.durationWeeks,
      mealTypes: mealPlanDoc.mealTypes,
    });

    // Use the calculated price from frontend, but validate it's reasonable
    const finalPrice = Math.round(totalPrice);

    // Validate price is reasonable (not negative, not excessively high)
    if (finalPrice < 100 || finalPrice > 10000000) {
      return res.status(400).json({
        success: false,
        message: "Invalid price calculation detected",
      });
    }

    // Calculate next delivery date
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const nextDelivery = new Date(subscriptionStartDate);
    nextDelivery.setDate(nextDelivery.getDate() + 1); // Next day delivery

    // Calculate tentative end date, but don't start countdown until first delivery
    // This will be recalculated when subscription is activated after first delivery
    const weeksToAdd = durationWeeks || (duration === "Monthly" ? 4 : 1);
    const tentativeEndDate = new Date(subscriptionStartDate);
    tentativeEndDate.setDate(tentativeEndDate.getDate() + weeksToAdd * 7);

    console.log("📅 Date calculations:", {
      startDate: subscriptionStartDate,
      nextDelivery,
      tentativeEndDate,
      weeksToAdd,
      note: "End date will be recalculated after first delivery",
    });

    const subscriptionData = {
      subscriptionId:
        subscriptionId ||
        `SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: req.user.id,
      mealPlanId: mealPlan,
      selectedMealTypes: selectedMealTypes ||
        mealPlanDoc.mealTypes || ["lunch"],
      frequency,
      duration,
      durationWeeks: weeksToAdd,
      startDate: subscriptionStartDate,
      nextDelivery,
      endDate: tentativeEndDate, // Placeholder - will be updated after first delivery
      totalPrice: finalPrice,
      price: finalPrice, // Required field for compatibility
      basePlanPrice: basePlanPrice || mealPlanDoc.totalPrice || 0,
      frequencyMultiplier: frequencyMultiplier || 1,
      durationMultiplier: durationMultiplier || 1,
      deliveryAddress,
      specialInstructions,
      paymentStatus: paymentStatus || "Pending",
      paymentReference,
      transactionId:
        transactionId ||
        `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,

      // Initialize recurring delivery settings - subscription NOT activated yet
      recurringDelivery: {
        isActivated: false, // Key: subscription not active until first delivery
        activationDeliveryCompleted: false,
        currentMealProgression: {
          weekNumber: 1,
          dayOfWeek: 1,
          mealTime: selectedMealTypes?.[0] || "lunch",
        },
        deliverySchedule: {
          daysOfWeek: [1, 2, 3, 4, 5], // Weekdays by default
          timeSlot: "afternoon",
        },
      },
    };

    console.log(
      "💾 Creating subscription with data:",
      JSON.stringify(subscriptionData, null, 2)
    );

    // ========================================
    // COMPILE MEAL PLAN SNAPSHOT
    // ========================================
    // Before creating the subscription, compile a complete snapshot of the meal plan
    // This ensures data consistency even if the meal plan is modified later
    console.log("📸 Compiling meal plan snapshot...");

    try {
      // Extract discount information from request if available
      const discountInfo = req.body.discountInfo || null;

      const mealPlanSnapshot = await compileMealPlanSnapshot(
        mealPlan,
        req.user.id,
        subscriptionStartDate,
        tentativeEndDate,
        selectedMealTypes || mealPlanDoc.mealTypes || ["lunch"],
        discountInfo,
        {
          basePlanPrice: basePlanPrice || mealPlanDoc.totalPrice || 0,
          frequencyMultiplier: frequencyMultiplier || 1,
          durationMultiplier: durationMultiplier || 1,
        },
        weeksToAdd // Pass the user-selected duration weeks
      );

      // Add the snapshot to subscription data
      subscriptionData.mealPlanSnapshot = mealPlanSnapshot;

      console.log("✅ Meal plan snapshot compiled successfully:", {
        totalMeals: mealPlanSnapshot.stats.totalMeals,
        totalMealSlots: mealPlanSnapshot.stats.totalMealSlots,
        snapshotPrice: mealPlanSnapshot.pricing.totalPrice,
      });
    } catch (snapshotError) {
      console.error(
        "⚠️ Warning: Failed to compile meal plan snapshot:",
        snapshotError
      );
      // Don't fail subscription creation if snapshot compilation fails
      // The snapshot can be generated later via migration script
    }

    const subscription = await Subscription.create(subscriptionData);

    // Generate the meal assignments for the new subscription (fire and forget)
    mealAssignmentService.generateAssignmentsForSubscription(subscription);

    // Auto-assign an available chef to the new subscription
    try {
      await autoAssignChefToSubscription(subscription);
    } catch (chefAssignmentError) {
      console.error(
        "⚠️ Warning: Failed to auto-assign chef to subscription:",
        chefAssignmentError
      );
      // Don't fail subscription creation if chef assignment fails
    }

    // Generate ONE order and delegation for entire subscription
    try {
      await generateOrderForSubscription(subscription);
    } catch (orderGenerationError) {
      console.error(
        "⚠️ Warning: Failed to generate order:",
        orderGenerationError
      );
      // Don't fail subscription creation if order generation fails
    }

    // Update user's address if deliveryAddress is provided and different from current
    if (deliveryAddress && deliveryAddress.trim()) {
      try {
        const customer = await Customer.findById(req.user.id);
        if (customer && customer.address !== deliveryAddress.trim()) {
          await Customer.findByIdAndUpdate(req.user.id, {
            address: deliveryAddress.trim(),
          });
          console.log(
            "📍 Updated customer address to:",
            deliveryAddress.trim()
          );
        }
      } catch (addressUpdateError) {
        console.error("Failed to update customer address:", addressUpdateError);
        // Don't fail the subscription creation for this
      }
    }

    await subscription.populate("mealPlanId");

    console.log("✅ Subscription created successfully:", {
      id: subscription._id,
      subscriptionId: subscription.subscriptionId,
      totalPrice: subscription.totalPrice,
      price: subscription.price,
    });

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (err) {
    console.error("Create subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      "frequency",
      "duration",
      "deliveryAddress",
      "specialInstructions",
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // If frequency or duration changed, recalculate price
    if (filteredUpdates.frequency || filteredUpdates.duration) {
      const subscription = await Subscription.findOne({
        _id: id,
        userId: req.user.id,
      }).populate("mealPlanId");

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const frequencyMultiplier = {
        Daily: 1,
        "Twice Daily": 2,
        "Thrice Daily": 3,
      };

      const durationMultiplier = {
        Weekly: 1,
        Monthly: 4,
      };

      const newFrequency = filteredUpdates.frequency || subscription.frequency;
      const newDuration = filteredUpdates.duration || subscription.duration;

      filteredUpdates.totalPrice =
        subscription.mealPlanId.basePrice *
        frequencyMultiplier[newFrequency] *
        durationMultiplier[newDuration];
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      filteredUpdates,
      { new: true, runValidators: true }
    ).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.json({
      success: true,
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (err) {
    console.error("Update subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Pause subscription
exports.pauseSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.id,
        status: "Active",
      },
      { status: "Paused" },
      { new: true, runValidators: true }
    ).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or cannot be paused",
      });
    }

    res.json({
      success: true,
      message: "Subscription paused successfully",
      data: subscription,
    });
  } catch (err) {
    console.error("Pause subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to pause subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Resume subscription
exports.resumeSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.id,
        status: "Paused",
      },
      { status: "Active" },
      { new: true, runValidators: true }
    ).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or cannot be resumed",
      });
    }

    res.json({
      success: true,
      message: "Subscription resumed successfully",
      data: subscription,
    });
  } catch (err) {
    console.error("Resume subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to resume subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status: "Cancelled" },
      { new: true, runValidators: true }
    ).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      data: subscription,
    });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ==========================================
// RECURRING DELIVERY ENDPOINTS
// ==========================================

// Get current meal for subscription
exports.getSubscriptionCurrentMeal = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    }).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get current meal using meal progression service
    const currentMeal = await mealProgressionService.getCurrentMeal(id);

    res.json({
      success: true,
      data: currentMeal,
    });
  } catch (err) {
    console.error("❌ Get current meal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get current meal",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get chef preparation status for subscription
exports.getSubscriptionChefStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get today's delivery for this subscription
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysDelivery = await SubscriptionDelivery.findOne({
      subscriptionId: id,
      scheduledDate: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate("chefAssignment.chefId", "fullName");

    if (!todaysDelivery) {
      return res.json({
        success: true,
        data: {
          status: "scheduled",
          message: "No delivery scheduled for today",
          chefAssigned: false,
        },
      });
    }

    // Calculate estimated ready time based on preparation time
    let estimatedReadyTime = null;
    if (todaysDelivery.chefAssignment.startedCookingAt) {
      const avgPrepTime = 45; // 45 minutes average prep time
      estimatedReadyTime = new Date(
        todaysDelivery.chefAssignment.startedCookingAt.getTime() +
          avgPrepTime * 60 * 1000
      );
    }

    const chefStatus = {
      status: todaysDelivery.status,
      chefName: todaysDelivery.chefAssignment.chefId?.fullName,
      chefAssigned: !!todaysDelivery.chefAssignment.chefId,
      assignedAt: todaysDelivery.chefAssignment.assignedAt,
      startedCookingAt: todaysDelivery.chefAssignment.startedCookingAt,
      estimatedReadyTime,
      notes: todaysDelivery.chefAssignment.notes,
    };

    res.json({
      success: true,
      data: chefStatus,
    });
  } catch (err) {
    console.error("❌ Get chef status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get chef status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get next delivery information
exports.getSubscriptionNextDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    }).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get next delivery from subscription record
    const nextDelivery = subscription.recurringDelivery?.nextScheduledDelivery;

    if (!nextDelivery || !nextDelivery.date) {
      return res.json({
        success: true,
        data: null,
        message: "No next delivery scheduled",
      });
    }

    // Get next meal assignment if available
    let nextMealAssignment = null;
    if (nextDelivery.assignmentId) {
      nextMealAssignment = await MealPlanAssignment.findById(
        nextDelivery.assignmentId
      ).populate("mealIds");
    }

    // Check for active order for this delivery to get real status
    let actualStatus = "scheduled";
    let activeOrder = null;

    try {
      const Order = require("../models/Order");
      activeOrder = await Order.findOne({
        userId: req.user.id,
        subscriptionId: id,
        deliveryDate: {
          $gte: new Date(new Date(nextDelivery.date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(nextDelivery.date).setHours(23, 59, 59, 999)),
        },
      }).sort({ createdAt: -1 });

      if (activeOrder && activeOrder.orderStatus) {
        actualStatus = activeOrder.orderStatus;
        console.log(
          `📦 Found active order ${activeOrder._id} with status: ${actualStatus}`
        );
      }
    } catch (error) {
      console.error("Error checking for active order:", error);
    }

    const deliveryInfo = {
      date: nextDelivery.date,
      estimatedTime: nextDelivery.estimatedTime,
      mealAssignment: nextMealAssignment,
      status: actualStatus,
      orderId: activeOrder?._id,
      trackingId: activeOrder?.trackingId,
    };

    res.json({
      success: true,
      data: deliveryInfo,
    });
  } catch (err) {
    console.error("❌ Get next delivery error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get next delivery info",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get meal timeline for subscription
exports.getSubscriptionMealTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const daysAhead = parseInt(req.query.days) || 7;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    }).populate("mealPlanId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get meal progression timeline
    const timeline = await mealProgressionService.getMealProgressionTimeline(
      id,
      daysAhead
    );

    res.json({
      success: true,
      data: timeline,
    });
  } catch (err) {
    console.error("❌ Get meal timeline error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get meal timeline",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Skip a meal delivery
exports.skipMealDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { skipDate, reason } = req.body;

    // Validation
    if (!skipDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Skip date and reason are required",
      });
    }

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Skip the meal using meal progression service
    const skipResult = await mealProgressionService.skipMeal(
      id,
      skipDate,
      reason
    );

    if (!skipResult) {
      return res.status(400).json({
        success: false,
        message: "Unable to skip meal for specified date",
      });
    }

    res.json({
      success: true,
      message: "Meal delivery skipped successfully",
      data: { skipDate, reason },
    });
  } catch (err) {
    console.error("❌ Skip meal delivery error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to skip meal delivery",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update delivery preferences
exports.updateDeliveryPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { frequency, timeSlot, daysOfWeek, specialInstructions } = req.body;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Update delivery preferences
    const updateData = {};
    if (frequency) updateData["deliveryPreferences.frequency"] = frequency;
    if (timeSlot)
      updateData["recurringDelivery.deliverySchedule.timeSlot"] = timeSlot;
    if (daysOfWeek)
      updateData["recurringDelivery.deliverySchedule.daysOfWeek"] = daysOfWeek;
    if (specialInstructions)
      updateData["specialInstructions"] = specialInstructions;

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("mealPlanId");

    res.json({
      success: true,
      message: "Delivery preferences updated successfully",
      data: updatedSubscription,
    });
  } catch (err) {
    console.error("❌ Update delivery preferences error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update delivery preferences",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get subscription delivery history
exports.getSubscriptionDeliveryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get delivery history
    const deliveries = await SubscriptionDelivery.find({
      subscriptionId: id,
    })
      .populate("mealAssignment.assignmentId")
      .populate("chefAssignment.chefId", "fullName")
      .populate("driverAssignment.driverId", "fullName")
      .sort({ scheduledDate: -1 })
      .limit(limit)
      .skip(skip);

    const totalCount = await SubscriptionDelivery.countDocuments({
      subscriptionId: id,
    });

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + deliveries.length < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ Get delivery history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get delivery history",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Request chef reassignment
exports.requestChefReassignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validation
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed reason (minimum 10 characters)",
      });
    }

    // Verify subscription belongs to user
    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Find current chef assignment
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: id,
      assignmentStatus: "active",
    });

    if (!chefAssignment) {
      return res.status(404).json({
        success: false,
        message: "No active chef assignment found",
      });
    }

    // Request reassignment using the model method
    await chefAssignment.requestReassignment("customer", reason.trim());

    res.json({
      success: true,
      message:
        "Chef reassignment request submitted successfully. Our team will review and respond within 24 hours.",
      data: {
        requestId: chefAssignment.assignmentId,
        reason: reason.trim(),
        requestedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("❌ Request chef reassignment error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit chef reassignment request",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Rate a completed delivery
exports.rateDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { rating, feedback } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Find the delivery and verify it belongs to user's subscription
    const delivery = await SubscriptionDelivery.findOne({
      _id: deliveryId,
      status: "delivered",
    }).populate("subscriptionId");

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivered subscription not found",
      });
    }

    // Verify the subscription belongs to the user
    if (delivery.subscriptionId.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only rate your own deliveries",
      });
    }

    // Update delivery rating
    delivery.customer.rating = rating;
    delivery.customer.feedback = feedback?.trim() || "";
    delivery.customer.ratedAt = new Date();
    delivery.metrics.customerSatisfaction = rating;

    await delivery.save();

    // Update chef performance metrics if chef was assigned
    if (delivery.chefAssignment.chefId) {
      const chefAssignment = await SubscriptionChefAssignment.findOne({
        subscriptionId: delivery.subscriptionId._id,
        chefId: delivery.chefAssignment.chefId,
        assignmentStatus: "active",
      });

      if (chefAssignment) {
        await chefAssignment.updatePerformanceMetrics({
          rating,
          onTime: delivery.metrics.onTimeDelivery,
          preparationTime: delivery.metrics.preparationTime,
        });
      }
    }

    res.json({
      success: true,
      message: "Thank you for your feedback! Your rating helps us improve.",
      data: {
        deliveryId,
        rating,
        feedback: feedback?.trim() || "",
        ratedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("❌ Rate delivery error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit rating",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
