const Customer = require("../models/Customer");
const Order = require("../models/Order");
const MealPlan = require("../models/MealPlan");
const Subscription = require("../models/Subscription");

// Get user's current subscription status and dashboard data
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check for active subscription - with debugging
    console.log(`🔍 Looking for subscriptions for user: ${userId}`);

    // First, get all subscriptions for this user to debug
    const allUserSubscriptions = await Subscription.find({ userId: userId });
    console.log(
      `📋 Found ${allUserSubscriptions.length} total subscriptions for user:`,
      allUserSubscriptions.map((sub) => ({
        id: sub._id,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isEndDateValid: sub.endDate >= new Date(),
      }))
    );

    // Find active subscription - include both activated and pending activation
    // Use case-insensitive regex to match 'active', 'Active', 'ACTIVE', etc.
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: [/^active$/i, /^paid$/i, "Active", "Paid"] }, // Case-insensitive match for active/paid status
      $or: [
        // For activated subscriptions, check end date
        {
          "recurringDelivery.isActivated": true,
          endDate: { $gte: new Date() },
        },
        // For non-activated subscriptions, they're still "active" but pending first delivery
        { "recurringDelivery.isActivated": false },
        // Fallback for subscriptions without proper recurringDelivery structure
        {
          "recurringDelivery.isActivated": { $exists: false },
          endDate: { $gte: new Date() },
        },
      ],
    }).populate("mealPlanId");

    console.log(
      `🎯 Active subscription found:`,
      activeSubscription
        ? {
            id: activeSubscription._id,
            status: activeSubscription.status,
            planName:
              activeSubscription.mealPlanId?.name ||
              activeSubscription.mealPlanId?.planName,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
          }
        : "None"
    );

    // If no active subscription, return discovery mode
    if (!activeSubscription) {
      return res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          userType: "discovery",
        },
      });
    }

    // Get current meal plan details
    const mealPlan = activeSubscription.mealPlanId;

    // Calculate days remaining and progress based on activation status
    const today = new Date();
    const isActivated =
      activeSubscription.recurringDelivery?.isActivated || false;

    let daysRemaining, progressPercentage, actualEndDate;

    if (isActivated) {
      // Subscription is activated - calculate normally
      actualEndDate = new Date(activeSubscription.endDate);
      daysRemaining = Math.ceil(
        (actualEndDate - today) / (1000 * 60 * 60 * 24)
      );
      const totalDays = Math.ceil(
        (actualEndDate - new Date(activeSubscription.startDate)) /
          (1000 * 60 * 60 * 24)
      );
      const daysCompleted = totalDays - daysRemaining;
      progressPercentage = Math.round((daysCompleted / totalDays) * 100);
    } else {
      // Subscription not activated yet - show as "pending first delivery"
      const originalDuration = activeSubscription.durationWeeks || 1;
      daysRemaining = originalDuration * 7; // Full duration remaining
      progressPercentage = 0; // No progress until activated
      actualEndDate = null; // TBD until activation

      console.log(
        `📋 Subscription pending activation - ${originalDuration} weeks (${daysRemaining} days) pending first delivery`
      );
    }

    // Get recent orders and delivery info
    const recentOrders = await Order.find({
      userId: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("mealPlanId");

    // Get next delivery
    const nextDelivery = await Order.findOne({
      userId: userId,
      orderStatus: { $in: ["confirmed", "preparing", "ready"] },
      deliveryDate: { $gte: new Date() },
    }).sort({ deliveryDate: 1 });

    // Get user stats
    const totalOrders = await Order.countDocuments({
      userId: userId,
      orderStatus: { $in: ["completed", "delivered"] },
    });

    const currentStreak = await calculateUserStreak(userId);
    const monthlyMeals = await Order.countDocuments({
      userId: userId,
      orderStatus: { $in: ["completed", "delivered"] },
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    // Get today's/upcoming meals
    const upcomingMeals = await getUpcomingMeals(userId);

    // Get favorite meal categories
    const favoriteCategories = await getFavoriteCategories(userId);

    return res.json({
      success: true,
      data: {
        hasActiveSubscription: true,
        userType: "subscribed",
        user: {
          name: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
        },
        subscription: {
          id: activeSubscription._id,
          planName: mealPlan.planName || mealPlan.name,
          planImage: mealPlan.planImageUrl || mealPlan.coverImage,
          startDate: activeSubscription.startDate,
          endDate: actualEndDate || activeSubscription.endDate,
          daysRemaining: daysRemaining,
          progressPercentage: progressPercentage,
          status: activeSubscription.status,
          price: activeSubscription.price,
          isActivated: isActivated,
          activationStatus: isActivated ? "active" : "pending_first_delivery",
          activatedAt: activeSubscription.recurringDelivery?.activatedAt,
          durationWeeks: activeSubscription.durationWeeks,
        },
        nextDelivery: nextDelivery
          ? {
              orderId: nextDelivery._id,
              deliveryDate: nextDelivery.deliveryDate,
              status: nextDelivery.orderStatus,
              trackingId: nextDelivery.trackingId,
              estimatedTime: nextDelivery.estimatedDeliveryTime,
            }
          : null,
        upcomingMeals: upcomingMeals,
        userStats: {
          totalOrders: totalOrders,
          currentStreak: currentStreak,
          monthlyMeals: monthlyMeals,
          favoriteCategories: favoriteCategories,
        },
        recentOrders: recentOrders.map((order) => ({
          id: order._id,
          date: order.createdAt,
          status: order.orderStatus,
          planName: order.mealPlanId?.name || "Unknown Plan",
          rating: order.rating,
          deliveryDate: order.deliveryDate,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching user dashboard:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Helper function to calculate user streak
const calculateUserStreak = async (userId) => {
  try {
    const orders = await Order.find({
      userId: userId,
      orderStatus: { $in: ["completed", "delivered"] },
    }).sort({ deliveryDate: -1 });

    if (orders.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let order of orders) {
      const orderDate = new Date(order.deliveryDate);
      orderDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate - orderDate) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === streak) {
        streak++;
      } else if (dayDiff > streak) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating streak:", error);
    return 0;
  }
};

// Helper function to get upcoming meals
const getUpcomingMeals = async (userId) => {
  try {
    const upcomingOrders = await Order.find({
      userId: userId,
      orderStatus: { $in: ["confirmed", "preparing", "ready"] },
      deliveryDate: { $gte: new Date() },
    })
      .sort({ deliveryDate: 1 })
      .limit(5)
      .populate("mealPlanId");

    return upcomingOrders.map((order) => ({
      id: order._id,
      mealName: order.mealPlanId?.name || "Meal Plan",
      mealImage: order.mealPlanId?.planImageUrl,
      deliveryDate: order.deliveryDate,
      status: order.orderStatus,
      description: order.mealPlanId?.description || "",
      nutrition: {
        calories: order.mealPlanId?.nutrition?.calories || 0,
        protein: order.mealPlanId?.nutrition?.protein || 0,
        carbs: order.mealPlanId?.nutrition?.carbs || 0,
      },
    }));
  } catch (error) {
    console.error("Error getting upcoming meals:", error);
    return [];
  }
};

// Helper function to get favorite categories
const getFavoriteCategories = async (userId) => {
  try {
    const orderStats = await Order.aggregate([
      {
        $match: {
          userId: userId,
          orderStatus: { $in: ["completed", "delivered"] },
        },
      },
      {
        $lookup: {
          from: "mealplans",
          localField: "mealPlanId",
          foreignField: "_id",
          as: "mealPlan",
        },
      },
      {
        $unwind: "$mealPlan",
      },
      {
        $group: {
          _id: "$mealPlan.category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    return orderStats.map((stat) => ({
      category: stat._id,
      orderCount: stat.count,
    }));
  } catch (error) {
    console.error("Error getting favorite categories:", error);
    return [];
  }
};

// Pause user subscription
const pauseSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const subscription = await Subscription.findOneAndUpdate(
      { userId: userId, status: "active" },
      {
        status: "paused",
        pausedAt: new Date(),
        pauseReason: reason || "User requested",
      },
      { new: true }
    );

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, error: "No active subscription found" });
    }

    return res.json({
      success: true,
      message: "Subscription paused successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error pausing subscription:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// Resume user subscription
const resumeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOneAndUpdate(
      { userId: userId, status: "paused" },
      {
        status: "active",
        resumedAt: new Date(),
        $unset: { pausedAt: 1, pauseReason: 1 },
      },
      { new: true }
    );

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, error: "No paused subscription found" });
    }

    return res.json({
      success: true,
      message: "Subscription resumed successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error resuming subscription:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// Get delivery tracking info
const getDeliveryTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: userId,
    }).populate("mealPlanId");

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Get delivery tracking details
    const trackingInfo = {
      orderId: order._id,
      trackingId: order.trackingId,
      status: order.orderStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryDate: order.deliveryDate,
      deliveryAddress: order.deliveryAddress,
      mealPlan: {
        name: order.mealPlanId?.name,
        image: order.mealPlanId?.planImageUrl,
      },
      timeline: [
        {
          status: "confirmed",
          timestamp: order.confirmedAt,
          title: "Order Confirmed",
          description: "Your order has been confirmed and is being prepared",
        },
        {
          status: "preparing",
          timestamp: order.preparingAt,
          title: "Preparing Your Meal",
          description: "Our chefs are preparing your delicious meal",
        },
        {
          status: "ready",
          timestamp: order.readyAt,
          title: "Ready for Delivery",
          description: "Your meal is ready and will be delivered soon",
        },
        {
          status: "out_for_delivery",
          timestamp: order.outForDeliveryAt,
          title: "Out for Delivery",
          description: "Your meal is on its way to you",
        },
        {
          status: "delivered",
          timestamp: order.deliveredAt,
          title: "Delivered",
          description: "Your meal has been delivered successfully",
        },
      ].filter((item) => item.timestamp), // Only show completed stages
    };

    return res.json({
      success: true,
      data: trackingInfo,
    });
  } catch (error) {
    console.error("Error getting delivery tracking:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

module.exports = {
  getUserDashboard,
  pauseSubscription,
  resumeSubscription,
  getDeliveryTracking,
};
