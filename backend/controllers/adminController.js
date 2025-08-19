const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const MealPlan = require("../models/MealPlan");
const DailyMeal = require("../models/DailyMeal");
const Meal = require("../models/DailyMeal"); // Updated model (DailyMeal is now Meal)
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Chef = require("../models/Chef");
const OrderDelegation = require("../models/OrderDelegation");
const NotificationService = require("../services/notificationService");
const {
  uploadMealPlanMainImage,
  uploadMealImages,
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
} = require("../utils/imageUpload");

// ============= DASHBOARD ANALYTICS =============
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Dashboard Stats: Starting to fetch data...');
    
    // Get total counts with status breakdown
    console.log('👥 Fetching user counts...');
    const totalUsers = await Customer.countDocuments();
    const activeUsers = await Customer.countDocuments({ status: "Active" });
    const deletedUsers = await Customer.countDocuments({ status: "Deleted" });
    
    console.log('📦 Fetching order counts...');
    const totalOrders = await Order.countDocuments();
    
    console.log('📋 Fetching subscription counts...');
    const totalSubscriptions = await Subscription.countDocuments();
    
    console.log('🍽️ Fetching meal plan counts...');
    const totalMealPlans = await MealPlan.countDocuments({ isActive: true });
    
    console.log('📊 User stats:', { totalUsers, activeUsers, deletedUsers });
    console.log('📦 Order stats:', { totalOrders });
    console.log('📋 Subscription stats:', { totalSubscriptions });
    console.log('🍽️ Meal plan stats:', { totalMealPlans });

    // Get revenue data
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Get payment status breakdown
    const paidOrders = await Order.countDocuments({ paymentStatus: "Paid" });
    const pendingPayments = await Order.countDocuments({
      paymentStatus: "Pending",
    });
    const failedPayments = await Order.countDocuments({
      paymentStatus: "Failed",
    });
    const refundedOrders = await Order.countDocuments({
      paymentStatus: "Refunded",
    });

    // Get order status breakdown for chart
    const orderStatusBreakdown = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate("customer", "fullName email")
      .populate({
        path: "subscription",
        populate: { path: "mealPlanId", select: "planName" },
      })
      .sort({ createdDate: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          deletedUsers,
          totalOrders,
          totalSubscriptions,
          totalMealPlans,
          totalRevenue: totalRevenue[0]?.total || 0,
          paidOrders,
          pendingPayments,
          failedPayments,
          refundedOrders,
        },
        orderStatusBreakdown,
        recentOrders,
      },
    });
  } catch (err) {
    console.error("Get dashboard stats error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: err.message, // Show error in production too for debugging
      errorDetails: {
        name: err.name,
        message: err.message
      }
    });
  }
};

// ============= USER ANALYTICS =============
exports.getUserAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate user stats (reuse existing logic from authController)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Get orders this month
    const ordersThisMonth = await Order.countDocuments({
      customer: id,
      createdDate: { $gte: startOfMonth, $lte: endOfMonth },
      orderStatus: { $ne: "Cancelled" },
    });

    // Get total completed orders
    const totalOrdersCompleted = await Order.countDocuments({
      customer: id,
      orderStatus: "Delivered",
    });

    // Calculate streak days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      customer: id,
      orderStatus: "Delivered",
      actualDelivery: { $gte: thirtyDaysAgo },
    }).sort({ actualDelivery: -1 });

    let streakDays = 0;
    if (recentOrders.length > 0) {
      const orderDates = recentOrders.map((order) =>
        new Date(order.actualDelivery).toDateString()
      );
      const uniqueDates = [...new Set(orderDates)].sort().reverse();

      let currentDate = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const orderDate = new Date(uniqueDates[i]);
        orderDate.setHours(0, 0, 0, 0);

        if (checkDate.getTime() === orderDate.getTime()) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Get active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      customer: id,
      status: "Active",
    });

    // Calculate total saved
    const totalOrders = await Order.find({
      customer: id,
      orderStatus: "Delivered",
    });

    const totalSaved = totalOrders.reduce((sum, order) => {
      const orderSavings = order.totalAmount ? order.totalAmount * 0.15 : 0;
      return sum + orderSavings;
    }, 0);

    // Calculate nutrition score
    let nutritionScore = 50;
    if (customer.dietaryPreferences && customer.dietaryPreferences.length > 0) {
      nutritionScore += customer.dietaryPreferences.length * 5;
    }
    if (streakDays > 0) {
      nutritionScore += Math.min(streakDays * 2, 30);
    }
    if (ordersThisMonth > 0) {
      nutritionScore += Math.min(ordersThisMonth * 3, 20);
    }
    nutritionScore = Math.min(nutritionScore, 100);

    // Get favorite category from order patterns
    const ordersWithSubscriptions = await Order.find({
      customer: id,
      orderStatus: "Delivered",
      subscription: { $exists: true, $ne: null },
    }).populate({
      path: "subscription",
      populate: { path: "mealPlanId", select: "targetAudience" },
    });

    const categoryCount = {};
    ordersWithSubscriptions.forEach((order) => {
      if (order.subscription && order.subscription.mealPlanId) {
        const category = order.subscription.mealPlanId.targetAudience;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    const favoriteCategory =
      Object.keys(categoryCount).length > 0
        ? Object.keys(categoryCount).reduce((a, b) =>
            categoryCount[a] > categoryCount[b] ? a : b
          )
        : "None";

    // Get next delivery
    const nextSubscription = await Subscription.findOne({
      customer: id,
      status: "Active",
      nextDelivery: { $gte: now },
    }).sort({ nextDelivery: 1 });

    const analytics = {
      basicStats: {
        ordersThisMonth,
        totalOrdersCompleted,
        streakDays,
        activeSubscriptions,
        totalSaved: Math.round(totalSaved),
        nutritionScore,
        favoriteCategory,
        nextDelivery: nextSubscription ? nextSubscription.nextDelivery : null,
      },
      achievements: customer.achievements || [],
      notificationPreferences: customer.notificationPreferences || {},
      categoryBreakdown: categoryCount,
      recentOrderDates: recentOrders.slice(0, 10).map((order) => ({
        date: order.actualDelivery,
        amount: order.totalAmount,
        status: order.orderStatus,
      })),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    console.error("Get user analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get engagement analytics for all users
exports.getEngagementAnalytics = async (req, res) => {
  try {
    // Overall user engagement stats
    const totalUsers = await Customer.countDocuments({
      status: { $ne: "Deleted" },
    });
    const activeUsers = await Customer.countDocuments({ status: "Active" });

    // Users with recent activity (orders in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyActiveUsers = await Order.distinct("customer", {
      createdDate: { $gte: thirtyDaysAgo },
      orderStatus: { $ne: "Cancelled" },
    });

    // Achievement completion rates
    const usersWithAchievements = await Customer.aggregate([
      { $match: { status: { $ne: "Deleted" } } },
      {
        $project: {
          earnedAchievements: {
            $size: {
              $filter: {
                input: { $ifNull: ["$achievements", []] },
                cond: { $eq: ["$$this.earned", true] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          avgAchievements: { $avg: "$earnedAchievements" },
          maxAchievements: { $max: "$earnedAchievements" },
          usersWithAchievements: {
            $sum: { $cond: [{ $gt: ["$earnedAchievements", 0] }, 1, 0] },
          },
        },
      },
    ]);

    // Subscription engagement
    const subscriptionStats = await Subscription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Order frequency analysis
    const orderFrequency = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: thirtyDaysAgo },
          orderStatus: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: "$customer",
          orderCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avgOrdersPerUser: { $avg: "$orderCount" },
          maxOrdersPerUser: { $max: "$orderCount" },
          totalActiveCustomers: { $sum: 1 },
        },
      },
    ]);

    // Top performing meal plan categories
    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          orderStatus: "Delivered",
          subscription: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "subscriptionData",
        },
      },
      { $unwind: "$subscriptionData" },
      {
        $lookup: {
          from: "mealplans",
          localField: "subscriptionData.mealPlanId",
          foreignField: "_id",
          as: "mealPlanData",
        },
      },
      { $unwind: "$mealPlanData" },
      {
        $group: {
          _id: "$mealPlanData.targetAudience",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          avgRating: { $avg: "$customerRating" },
        },
      },
      { $sort: { totalOrders: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          recentlyActiveUsers: recentlyActiveUsers.length,
          engagementRate:
            totalUsers > 0
              ? Math.round((recentlyActiveUsers.length / totalUsers) * 100)
              : 0,
        },
        achievementStats: usersWithAchievements[0] || {
          avgAchievements: 0,
          maxAchievements: 0,
          usersWithAchievements: 0,
        },
        subscriptionStats,
        orderFrequency: orderFrequency[0] || {
          avgOrdersPerUser: 0,
          maxOrdersPerUser: 0,
          totalActiveCustomers: 0,
        },
        categoryPerformance,
      },
    });
  } catch (err) {
    console.error("Get engagement analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch engagement analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= USER MANAGEMENT =============
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { customerId: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const users = await Customer.find(query)
      .select("-password")
      .sort({ registrationDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: users,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive", "Suspended", "Deleted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be Active, Inactive, Suspended, or Deleted",
      });
    }

    const existingUser = await Customer.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent reactivation of deleted accounts
    if (existingUser.status === "Deleted" && status !== "Deleted") {
      return res.status(400).json({
        success: false,
        message: "Deleted accounts cannot be reactivated",
      });
    }

    const updateData = { status };
    if (status === "Deleted" && !existingUser.deletedAt) {
      updateData.deletedAt = new Date();
    }

    const user = await Customer.findByIdAndUpdate(id, updateData, {
      new: true,
      select: "-password",
    });

    res.json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.exportUsers = async (req, res) => {
  try {
    const { format = "csv" } = req.query;

    const users = await Customer.find()
      .select("-password")
      .sort({ registrationDate: -1 });

    if (format === "csv") {
      const csvHeader =
        "Customer ID,Full Name,Email,Phone,City,Status,Registration Date,Total Orders,Total Spent,Deleted At\n";
      const csvData = users
        .map(
          (user) =>
            `"${user.customerId || ""}","${user.fullName || ""}","${
              user.email || ""
            }","${user.phone || ""}","${user.city || ""}","${
              user.status || "Active"
            }","${
              user.registrationDate
                ? new Date(user.registrationDate).toLocaleDateString()
                : ""
            }","${user.totalOrders || 0}","${user.totalSpent || 0}","${
              user.deletedAt
                ? new Date(user.deletedAt).toLocaleDateString()
                : ""
            }"`
        )
        .join("\n");

      res.json({
        success: true,
        data: {
          csvData: csvHeader + csvData,
          filename: `users_export_${
            new Date().toISOString().split("T")[0]
          }.csv`,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          users,
          exportDate: new Date().toISOString(),
          totalRecords: users.length,
        },
      });
    }
  } catch (err) {
    console.error("Export users error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to export users",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= ORDER MANAGEMENT =============
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const {
      search = "",
      orderStatus = "",
      paymentStatus = "",
      delegationStatus = "",
      priority = "",
      sortBy = "urgency",
      sortOrder = "asc",
    } = req.query;

    const skip = (page - 1) * limit;

    // Build advanced query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.fullName": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    // Status filters
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Enhanced delegation status filtering
    if (delegationStatus) {
      switch (delegationStatus) {
        case "unassigned":
          query.$and = [
            {
              $or: [
                {
                  delegationStatus: {
                    $in: ["Not Assigned", "Pending Assignment"],
                  },
                },
                { delegationStatus: { $exists: false } },
                { assignedChef: { $exists: false } },
                { assignedChef: null },
              ],
            },
          ];
          break;
        case "assigned":
          query.$and = [
            {
              $or: [
                {
                  delegationStatus: {
                    $in: ["Assigned", "Accepted", "In Progress"],
                  },
                },
                { assignedChef: { $exists: true, $ne: null } },
              ],
            },
          ];
          break;
        case "completed":
          query.delegationStatus = "Completed";
          break;
        default:
          query.delegationStatus = delegationStatus;
      }
    }

    if (priority) {
      query.priority = priority;
    }

    // Enhanced query with populated fields
    const orders = await Order.find(query)
      .populate("customer", "fullName email phone customerId")
      .populate("assignedChef", "fullName email chefId")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName description duration",
        },
      })
      .sort(buildSortQuery(sortBy, sortOrder))
      .skip(skip)
      .limit(limit);

    // Add urgency calculation to each order
    const ordersWithUrgency = orders.map((order) => {
      const orderObj = order.toObject();
      orderObj.urgencyInfo = calculateOrderUrgency(order);
      return orderObj;
    });

    // Sort by urgency if requested (post-database sort for complex urgency logic)
    if (sortBy === "urgency") {
      ordersWithUrgency.sort((a, b) => {
        const urgencyA = a.urgencyInfo.urgencyScore;
        const urgencyB = b.urgencyInfo.urgencyScore;
        return sortOrder === "desc" ? urgencyB - urgencyA : urgencyA - urgencyB;
      });
    }

    const total = await Order.countDocuments(query);

    console.log(
      `📋 Admin Orders Query: Found ${orders.length}/${total} orders with filters:`,
      {
        search,
        orderStatus,
        paymentStatus,
        delegationStatus,
        priority,
        sortBy,
      }
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithUrgency,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: {
        applied: {
          search,
          orderStatus,
          paymentStatus,
          delegationStatus,
          priority,
          sortBy,
          sortOrder,
        },
        available: {
          orderStatuses: [
            "Confirmed",
            "Preparing",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
          ],
          paymentStatuses: ["Paid", "Pending", "Failed", "Refunded"],
          delegationStatuses: ["unassigned", "assigned", "completed"],
          priorities: ["Low", "Medium", "High", "Urgent"],
        },
      },
    });
  } catch (err) {
    console.error("Get all orders error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("customer", "fullName email phone")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName description",
        },
      })
      .populate("assignedChef", "fullName chefId email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, notes, notifications } = req.body;

    const updates = {};
    if (orderStatus) updates.orderStatus = orderStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (notes) updates.adminNotes = notes;

    if (orderStatus === "Delivered") {
      updates.actualDelivery = new Date();
    }

    const order = await Order.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("customer", "fullName email phone")
      .populate({
        path: "subscription",
        populate: { path: "mealPlanId", select: "planName" },
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Send notifications if requested
    if (notifications && order.customer) {
      await sendOrderStatusNotifications(order, notifications, orderStatus);
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Helper function to send order status notifications
async function sendOrderStatusNotifications(order, notifications, orderStatus) {
  try {
    const customer = order.customer;
    const mealPlan = order.subscription?.mealPlanId?.planName || "Meal Plan";
    const orderNumber =
      order.orderId || order._id.toString().slice(-8).toUpperCase();

    // Create notification message based on status
    let message;
    let title;

    switch (orderStatus) {
      case "Confirmed":
        title = "Order Confirmed";
        message = `Your order #${orderNumber} for ${mealPlan} has been confirmed and is being prepared.`;
        break;
      case "Preparing":
        title = "Order Being Prepared";
        message = `Great news! Your order #${orderNumber} is now being prepared by our chef.`;
        break;
      case "Ready":
        title = "Order Ready";
        message = `Your order #${orderNumber} is ready and will be delivered soon.`;
        break;
      case "Out for Delivery":
        title = "Order Out for Delivery";
        message = `Your order #${orderNumber} is on its way! Expected delivery within 30 minutes.`;
        break;
      case "Delivered":
        title = "Order Delivered";
        message = `Your order #${orderNumber} has been delivered. Enjoy your meal!`;
        break;
      case "Cancelled":
        title = "Order Cancelled";
        message = `Your order #${orderNumber} has been cancelled. If you have any questions, please contact support.`;
        break;
      default:
        title = "Order Update";
        message = `Your order #${orderNumber} status has been updated to: ${orderStatus}`;
    }

    // Send notifications based on selected options
    const notificationPromises = [];

    if (notifications.inApp) {
      // In-app notification (you would implement this based on your notification system)
      console.log(
        `In-app notification sent to ${customer.fullName}: ${message}`
      );
    }

    if (notifications.email && customer.email) {
      // Email notification
      notificationPromises.push(
        sendEmailNotification(customer.email, title, message, order)
      );
    }

    if (notifications.sms && customer.phone) {
      // SMS notification
      notificationPromises.push(sendSMSNotification(customer.phone, message));
    }

    if (notifications.push) {
      // Push notification (you would implement this based on your push notification system)
      console.log(`Push notification sent to ${customer.fullName}: ${message}`);
    }

    // Wait for all notifications to be sent
    await Promise.allSettled(notificationPromises);

    console.log(
      `Notifications sent for order ${orderNumber} to ${customer.fullName}`
    );
  } catch (error) {
    console.error("Error sending notifications:", error);
    // Don't throw error - notifications failing shouldn't stop the order update
  }
}

// Email notification function
async function sendEmailNotification(email, title, message, order) {
  try {
    // This is a placeholder implementation
    // In a real application, you would use a service like SendGrid, Nodemailer, etc.
    console.log(`📧 Email sent to ${email}`);
    console.log(`Subject: ${title}`);
    console.log(`Message: ${message}`);
    console.log(
      `Order Details: #${
        order.orderId || order._id.toString().slice(-8)
      } - ₦${order.totalAmount?.toLocaleString()}`
    );

    // Example implementation with a hypothetical email service:
    /*
    const emailData = {
      to: email,
      subject: title,
      html: `
        <h2>${title}</h2>
        <p>${message}</p>
        <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderId || order._id.toString().slice(-8)}</p>
          <p><strong>Total Amount:</strong> ₦${order.totalAmount?.toLocaleString()}</p>
          <p><strong>Status:</strong> ${order.orderStatus}</p>
        </div>
        <p>Thank you for choosing choma!</p>
      `
    };
    
    await emailService.send(emailData);
    */

    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    throw error;
  }
}

// SMS notification function
async function sendSMSNotification(phone, message) {
  try {
    // This is a placeholder implementation
    // In a real application, you would use a service like Twilio, Africas Talking, etc.
    console.log(`📱 SMS sent to ${phone}`);
    console.log(`Message: ${message}`);

    // Example implementation with a hypothetical SMS service:
    /*
    const smsData = {
      to: phone,
      message: `choma: ${message}`,
      from: 'choma'
    };
    
    await smsService.send(smsData);
    */

    return true;
  } catch (error) {
    console.error("Error sending SMS notification:", error);
    throw error;
  }
}

// ============= PAYMENT MANAGEMENT =============
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || "";
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.paymentStatus = status;
    }
    if (startDate && endDate) {
      query.createdDate = { $gte: startDate, $lte: endDate };
    }

    const payments = await Order.find(query)
      .populate("customer", "fullName email")
      .select(
        "paymentReference paymentStatus paymentMethod totalAmount createdDate customer"
      )
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Get all payments error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= SUBSCRIPTION MANAGEMENT =============
exports.getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const skip = (page - 1) * limit;

    const subscriptions = await Subscription.find()
      .populate("userId", "fullName email")
      .populate("mealPlanId", "planName")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments();

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSubscriptions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Get all subscriptions error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= MEAL PLAN MANAGEMENT =============
exports.getAllMealPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    if (req.query.status) {
      filter.isActive = req.query.status === "active";
    }
    if (req.query.targetAudience) {
      filter.targetAudience = req.query.targetAudience;
    }
    if (req.query.search) {
      filter.$or = [
        { planName: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { planId: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const mealPlans = await MealPlan.find(filter)
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sampleMeals", "mealName mealType")
      .lean();

    const total = await MealPlan.countDocuments(filter);

    res.json({
      success: true,
      data: mealPlans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get all meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.getMealPlanDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id).populate(
      "sampleMeals",
      "mealName mealType description ingredients nutrition"
    );

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      data: mealPlan,
    });
  } catch (err) {
    console.error("Get meal plan details error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get meal plan details",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.createMealPlan = async (req, res) => {
  try {
    const {
      planName,
      description,
      targetAudience,
      basePrice,
      mealsPerWeek,
      planDuration,
      isActive,
      planFeatures,
      nutritionInfo,
      allergens,
      chefNotes,
      weeklyMeals,
      planImageUrl,
      mealImages,
    } = req.body;

    // Ensure weeklyMeals has the proper structure for 4 weeks
    const structuredWeeklyMeals = {
      week1: weeklyMeals?.week1 || weeklyMeals?.["1"] || {},
      week2: weeklyMeals?.week2 || weeklyMeals?.["2"] || {},
      week3: weeklyMeals?.week3 || weeklyMeals?.["3"] || {},
      week4: weeklyMeals?.week4 || weeklyMeals?.["4"] || {},
    };

    // Create the meal plan (planId will be auto-generated by pre-save hook)
    const mealPlan = new MealPlan({
      planName,
      description,
      targetAudience,
      basePrice: Number(basePrice),
      mealsPerWeek: Number(mealsPerWeek),
      planDuration,
      isActive: isActive !== false,
      planFeatures: planFeatures || [],
      nutritionInfo: nutritionInfo || {},
      allergens: allergens || [],
      chefNotes: chefNotes || "",
      weeklyMeals: structuredWeeklyMeals,
      planImageUrl: "", // Will be set after Cloudinary upload
      mealImages: {}, // Will be set after Cloudinary upload
      dailyComments: req.body.dailyComments || {},
    });

    await mealPlan.save();

    // Upload images to Cloudinary after meal plan is created
    let cloudinaryPlanImageUrl = "";
    let cloudinaryMealImages = {};

    try {
      // Upload main plan image if provided
      if (planImageUrl && planImageUrl.startsWith("data:image/")) {
        console.log("🔄 Uploading main plan image to Cloudinary...");
        const uploadResult = await uploadMealPlanMainImage(
          planImageUrl,
          mealPlan.planId
        );
        if (uploadResult) {
          cloudinaryPlanImageUrl = uploadResult.url;
          console.log("✅ Main plan image uploaded:", uploadResult.url);
        }
      }

      // Upload meal images if provided
      if (mealImages && Object.keys(mealImages).length > 0) {
        console.log("🔄 Uploading meal images to Cloudinary...");
        cloudinaryMealImages = await uploadMealImages(
          mealImages,
          mealPlan.planId
        );
        console.log(
          `✅ Uploaded ${Object.keys(cloudinaryMealImages).length} meal images`
        );
      }

      // Update meal plan with Cloudinary URLs
      if (
        cloudinaryPlanImageUrl ||
        Object.keys(cloudinaryMealImages).length > 0
      ) {
        mealPlan.planImageUrl = cloudinaryPlanImageUrl;
        mealPlan.mealImages = cloudinaryMealImages;
        await mealPlan.save();
      }
    } catch (imageError) {
      console.error(
        "⚠️ Image upload error (meal plan saved without images):",
        imageError
      );
      // Don't fail the meal plan creation if image upload fails
    }

    // Process and create individual daily meals if provided
    if (
      structuredWeeklyMeals &&
      Object.keys(structuredWeeklyMeals).some(
        (week) => Object.keys(structuredWeeklyMeals[week]).length > 0
      )
    ) {
      const dailyMeals = await processDailyMeals(
        structuredWeeklyMeals,
        mealPlan._id,
        cloudinaryMealImages
      );
      mealPlan.sampleMeals = dailyMeals.map((meal) => meal._id);
      await mealPlan.save();
    }

    res.status(201).json({
      success: true,
      message: "Meal plan created successfully",
      data: mealPlan,
    });
  } catch (err) {
    console.error("Create meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle image uploads to Cloudinary
    let cloudinaryPlanImageUrl = updates.planImageUrl;
    let cloudinaryMealImages = updates.mealImages || {};

    try {
      // Get current meal plan to check for existing images
      const currentMealPlan = await MealPlan.findById(id);

      // Upload new main plan image if provided as base64
      if (
        updates.planImageUrl &&
        updates.planImageUrl.startsWith("data:image/")
      ) {
        console.log("🔄 Uploading updated main plan image to Cloudinary...");

        // Delete old image if exists
        if (
          currentMealPlan.planImageUrl &&
          currentMealPlan.planImageUrl.includes("cloudinary.com")
        ) {
          const oldPublicId = extractPublicIdFromUrl(
            currentMealPlan.planImageUrl
          );
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId);
          }
        }

        const uploadResult = await uploadMealPlanMainImage(
          updates.planImageUrl,
          currentMealPlan.planId
        );
        if (uploadResult) {
          cloudinaryPlanImageUrl = uploadResult.url;
          console.log("✅ Updated main plan image uploaded:", uploadResult.url);
        }
      }

      // Upload new meal images if provided
      if (updates.mealImages && Object.keys(updates.mealImages).length > 0) {
        console.log("🔄 Uploading updated meal images to Cloudinary...");

        // Delete old meal images that are being replaced
        for (const [mealKey, newImage] of Object.entries(updates.mealImages)) {
          if (newImage && newImage.startsWith("data:image/")) {
            const oldImage = currentMealPlan.mealImages?.[mealKey];
            if (oldImage && oldImage.includes("cloudinary.com")) {
              const oldPublicId = extractPublicIdFromUrl(oldImage);
              if (oldPublicId) {
                await deleteImageFromCloudinary(oldPublicId);
              }
            }
          }
        }

        cloudinaryMealImages = await uploadMealImages(
          updates.mealImages,
          currentMealPlan.planId
        );
        console.log(
          `✅ Uploaded ${
            Object.keys(cloudinaryMealImages).length
          } updated meal images`
        );
      }
    } catch (imageError) {
      console.error("⚠️ Image upload error during update:", imageError);
      // Continue with update even if image upload fails
    }

    // Update the updates object with Cloudinary URLs
    updates.planImageUrl = cloudinaryPlanImageUrl;
    updates.mealImages = cloudinaryMealImages;

    // Update daily comments if provided
    if (req.body.dailyComments) {
      updates.dailyComments = req.body.dailyComments;
    }

    // Process weekly meals if provided
    if (updates.weeklyMeals) {
      // Ensure weeklyMeals has the proper structure for 4 weeks
      const structuredWeeklyMeals = {
        week1: updates.weeklyMeals?.week1 || updates.weeklyMeals?.["1"] || {},
        week2: updates.weeklyMeals?.week2 || updates.weeklyMeals?.["2"] || {},
        week3: updates.weeklyMeals?.week3 || updates.weeklyMeals?.["3"] || {},
        week4: updates.weeklyMeals?.week4 || updates.weeklyMeals?.["4"] || {},
      };

      updates.weeklyMeals = structuredWeeklyMeals;

      // Remove old daily meals associated with this specific meal plan
      await DailyMeal.deleteMany({ assignedMealPlan: id });

      // Create/update daily meals for the new structure
      const dailyMeals = await processDailyMeals(
        structuredWeeklyMeals,
        id,
        cloudinaryMealImages
      );
      updates.sampleMeals = dailyMeals.map((meal) => meal._id);
    }

    updates.lastModified = new Date();

    const mealPlan = await MealPlan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      message: "Meal plan updated successfully",
      data: mealPlan,
    });
  } catch (err) {
    console.error("Update meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if meal plan is used in any active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      mealPlanId: id,
      status: "Active",
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal plan. It has ${activeSubscriptions} active subscription(s).`,
      });
    }

    // Get meal plan before deletion to clean up images
    const mealPlan = await MealPlan.findById(id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Clean up Cloudinary images
    try {
      // Delete main plan image
      if (
        mealPlan.planImageUrl &&
        mealPlan.planImageUrl.includes("cloudinary.com")
      ) {
        const publicId = extractPublicIdFromUrl(mealPlan.planImageUrl);
        if (publicId) {
          await deleteImageFromCloudinary(publicId);
          console.log("🗑️ Deleted main plan image from Cloudinary");
        }
      }

      // Delete meal images
      if (mealPlan.mealImages && Object.keys(mealPlan.mealImages).length > 0) {
        for (const [mealKey, imageUrl] of Object.entries(mealPlan.mealImages)) {
          if (imageUrl && imageUrl.includes("cloudinary.com")) {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await deleteImageFromCloudinary(publicId);
            }
          }
        }
        console.log("🗑️ Deleted meal images from Cloudinary");
      }
    } catch (imageError) {
      console.error("⚠️ Error deleting images from Cloudinary:", imageError);
      // Continue with deletion even if image cleanup fails
    }

    // Delete the meal plan
    await MealPlan.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Meal plan deleted successfully",
    });
  } catch (err) {
    console.error("Delete meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Helper function to process weekly meals into individual DailyMeal documents
async function processDailyMeals(weeklyMeals, mealPlanId, mealImages = {}) {
  const dailyMeals = [];

  for (const [weekKey, weekData] of Object.entries(weeklyMeals)) {
    // Extract week number from weekKey (week1 -> 1, week2 -> 2, etc.)
    const weekNumber = parseInt(weekKey.replace("week", ""));

    for (const [day, dayData] of Object.entries(weekData)) {
      for (const [mealType, mealDescription] of Object.entries(dayData)) {
        if (
          mealType !== "remark" &&
          mealType !== "dailyComment" &&
          mealDescription &&
          mealDescription.trim()
        ) {
          try {
            // Check if this daily meal already exists for this combination
            const existingMeal = await DailyMeal.findOne({
              assignedMealPlan: mealPlanId,
              weekNumber: weekNumber,
              dayOfWeek: day,
              mealType: mealType,
            });

            // Get meal image if available
            const imageKey = `${weekKey}_${day}`;
            const mealImage =
              mealImages[imageKey] && mealImages[imageKey][mealType]
                ? mealImages[imageKey][mealType]
                : "";

            const mealData = {
              mealName: mealDescription.trim(),
              mealType: mealType,
              description: mealDescription.trim(),
              ingredients: mealDescription.trim(), // Could be enhanced to parse ingredients
              mealImage: mealImage,
              mealPlans: [mealPlanId],
              assignedMealPlan: mealPlanId,
              weekNumber: weekNumber,
              dayOfWeek: day,
              remark: dayData.remark || "",
              chefNotes: dayData.remark || "",
              isActive: true,
            };

            let savedMeal;
            if (existingMeal) {
              // Update existing meal
              Object.assign(existingMeal, mealData);
              savedMeal = await existingMeal.save();
            } else {
              // Create new meal
              const dailyMeal = new DailyMeal(mealData);
              savedMeal = await dailyMeal.save();
            }

            dailyMeals.push(savedMeal);
          } catch (error) {
            console.warn(
              `Failed to create/update daily meal for Week ${weekNumber} ${day} ${mealType}:`,
              error.message
            );
          }
        }
      }
    }
  }

  return dailyMeals;
}

// Bulk create meal plans from template
exports.createMealPlanFromTemplate = async (req, res) => {
  try {
    const { templateData, planVariations } = req.body;

    const createdPlans = [];

    for (const variation of planVariations) {
      const planData = {
        ...templateData,
        ...variation,
        planId: `MP${String((await MealPlan.countDocuments()) + 1).padStart(
          3,
          "0"
        )}`,
      };

      const mealPlan = new MealPlan(planData);
      await mealPlan.save();
      createdPlans.push(mealPlan);
    }

    res.status(201).json({
      success: true,
      message: `${createdPlans.length} meal plans created from template`,
      data: createdPlans,
    });
  } catch (err) {
    console.error("Create meal plans from template error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plans from template",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get meal plan analytics
exports.getMealPlanAnalytics = async (req, res) => {
  try {
    const analytics = await MealPlan.aggregate([
      {
        $group: {
          _id: "$targetAudience",
          count: { $sum: 1 },
          avgPrice: { $avg: "$basePrice" },
          totalRevenue: { $sum: "$basePrice" },
          activePlans: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get popular meal types
    const mealTypeStats = await DailyMeal.aggregate([
      {
        $group: {
          _id: "$mealType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get plans by price range
    const priceRanges = await MealPlan.aggregate([
      {
        $bucket: {
          groupBy: "$basePrice",
          boundaries: [0, 5000, 10000, 20000, 50000, 100000],
          default: "Other",
          output: {
            count: { $sum: 1 },
            plans: { $push: "$planName" },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        audienceAnalytics: analytics,
        mealTypeStats,
        priceRanges,
        totalPlans: await MealPlan.countDocuments(),
        activePlans: await MealPlan.countDocuments({ isActive: true }),
        totalMeals: await DailyMeal.countDocuments(),
      },
    });
  } catch (err) {
    console.error("Get meal plan analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Export meal plan data
exports.exportMealPlanData = async (req, res) => {
  try {
    const { format = "csv", planId } = req.query;

    let query = {};
    if (planId) {
      query._id = planId;
    }

    const mealPlans = await MealPlan.find(query)
      .populate("sampleMeals")
      .sort({ createdDate: -1 });

    if (format === "csv") {
      let csvData =
        "Plan ID,Plan Name,Target Audience,Base Price,Meals Per Week,Status,Features,Created Date\n";

      mealPlans.forEach((plan) => {
        const features = (plan.planFeatures || []).join("; ");
        csvData += `"${plan.planId}","${plan.planName}","${
          plan.targetAudience
        }","${plan.basePrice}","${plan.mealsPerWeek}","${
          plan.isActive ? "Active" : "Inactive"
        }","${features}","${new Date(
          plan.createdDate
        ).toLocaleDateString()}"\n`;
      });

      res.json({
        success: true,
        data: {
          csvData,
          filename: `meal_plans_export_${
            new Date().toISOString().split("T")[0]
          }.csv`,
        },
      });
    } else {
      // JSON export with detailed data
      const detailedData = mealPlans.map((plan) => ({
        ...plan.toObject(),
        exportDate: new Date().toISOString(),
        mealCount: plan.sampleMeals ? plan.sampleMeals.length : 0,
      }));

      res.json({
        success: true,
        data: detailedData,
        exportDate: new Date().toISOString(),
        totalRecords: detailedData.length,
      });
    }
  } catch (err) {
    console.error("Export meal plan data error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to export meal plan data",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Duplicate meal plan
exports.duplicateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPlanName, modifications = {} } = req.body;

    const originalPlan = await MealPlan.findById(id);
    if (!originalPlan) {
      return res.status(404).json({
        success: false,
        message: "Original meal plan not found",
      });
    }

    // Create duplicate with modifications
    const duplicatePlan = new MealPlan({
      ...originalPlan.toObject(),
      _id: undefined,
      planId: undefined, // Let the pre-save hook generate this
      planName: newPlanName || `${originalPlan.planName} (Copy)`,
      createdDate: new Date(),
      lastModified: new Date(),
      sampleMeals: [], // Will be created separately
      ...modifications,
    });

    await duplicatePlan.save();

    // Duplicate associated daily meals if they exist
    if (originalPlan.sampleMeals && originalPlan.sampleMeals.length > 0) {
      const originalMeals = await DailyMeal.find({
        _id: { $in: originalPlan.sampleMeals },
      });
      const duplicatedMeals = [];

      for (const meal of originalMeals) {
        const duplicatedMeal = new DailyMeal({
          ...meal.toObject(),
          _id: undefined,
          mealId: undefined, // Will be auto-generated
          mealPlans: [duplicatePlan._id],
        });

        const savedMeal = await duplicatedMeal.save();
        duplicatedMeals.push(savedMeal._id);
      }

      duplicatePlan.sampleMeals = duplicatedMeals;
      await duplicatePlan.save();
    }

    res.status(201).json({
      success: true,
      message: "Meal plan duplicated successfully",
      data: duplicatePlan,
    });
  } catch (err) {
    console.error("Duplicate meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to duplicate meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get daily meals for a specific meal plan
exports.getDailyMealsForPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { week, day, mealType } = req.query;

    let query = { assignedMealPlan: id };

    // Add filters if provided
    if (week) query.weekNumber = parseInt(week);
    if (day) query.dayOfWeek = day;
    if (mealType) query.mealType = mealType;

    const dailyMeals = await DailyMeal.find(query)
      .populate("assignedMealPlan", "planName")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealType: 1 });

    // Organize by week and day for easier frontend consumption
    const organizedMeals = {};
    dailyMeals.forEach((meal) => {
      const weekKey = `week${meal.weekNumber}`;
      if (!organizedMeals[weekKey]) organizedMeals[weekKey] = {};
      if (!organizedMeals[weekKey][meal.dayOfWeek])
        organizedMeals[weekKey][meal.dayOfWeek] = {};

      organizedMeals[weekKey][meal.dayOfWeek][meal.mealType] = {
        _id: meal._id,
        mealId: meal.mealId,
        mealName: meal.mealName,
        description: meal.description,
        mealImage: meal.mealImage,
        remark: meal.remark,
        isActive: meal.isActive,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      };

      if (meal.remark) {
        organizedMeals[weekKey][meal.dayOfWeek].remark = meal.remark;
      }
    });

    res.json({
      success: true,
      data: {
        dailyMeals,
        organizedMeals,
        totalMeals: dailyMeals.length,
      },
    });
  } catch (err) {
    console.error("Get daily meals for plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily meals",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update a specific daily meal
exports.updateDailyMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dailyMeal = await DailyMeal.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("assignedMealPlan", "planName");

    if (!dailyMeal) {
      return res.status(404).json({
        success: false,
        message: "Daily meal not found",
      });
    }

    res.json({
      success: true,
      message: "Daily meal updated successfully",
      data: dailyMeal,
    });
  } catch (err) {
    console.error("Update daily meal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update daily meal",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Delete a specific daily meal
exports.deleteDailyMeal = async (req, res) => {
  try {
    const { id } = req.params;

    const dailyMeal = await DailyMeal.findByIdAndDelete(id);

    if (!dailyMeal) {
      return res.status(404).json({
        success: false,
        message: "Daily meal not found",
      });
    }

    // Remove reference from meal plan's sampleMeals if exists
    await MealPlan.updateOne(
      { _id: dailyMeal.assignedMealPlan },
      { $pull: { sampleMeals: id } }
    );

    res.json({
      success: true,
      message: "Daily meal deleted successfully",
    });
  } catch (err) {
    console.error("Delete daily meal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete daily meal",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get all daily meals (with pagination and filters)
exports.getAllDailyMeals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const mealType = req.query.mealType || "";
    const weekNumber = req.query.weekNumber || "";
    const mealPlanId = req.query.mealPlanId || "";

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { mealName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { mealId: { $regex: search, $options: "i" } },
      ];
    }
    if (mealType) query.mealType = mealType;
    if (weekNumber) query.weekNumber = parseInt(weekNumber);
    if (mealPlanId) query.assignedMealPlan = mealPlanId;

    const dailyMeals = await DailyMeal.find(query)
      .populate("assignedMealPlan", "planName")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealType: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMeals = await DailyMeal.countDocuments(query);

    res.json({
      success: true,
      data: {
        dailyMeals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMeals / limit),
          totalMeals,
          hasMore: page * limit < totalMeals,
        },
      },
    });
  } catch (err) {
    console.error("Get all daily meals error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily meals",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= CHEF MANAGEMENT =============
exports.getAllChefs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { chefId: { $regex: search, $options: "i" } },
      ];
    }

    const chefs = await Chef.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalChefs = await Chef.countDocuments(query);

    // Get additional stats for each chef
    const chefsWithStats = await Promise.all(
      chefs.map(async (chef) => {
        const activeOrders = await Order.countDocuments({
          assignedChef: chef._id,
          delegationStatus: { $in: ["Assigned", "Accepted", "In Progress"] },
        });

        const completedOrders = await Order.countDocuments({
          assignedChef: chef._id,
          delegationStatus: "Completed",
        });

        return {
          ...chef.toObject(),
          stats: {
            activeOrders,
            completedOrders,
            completionRate:
              completedOrders > 0
                ? (
                    (completedOrders / (completedOrders + activeOrders)) *
                    100
                  ).toFixed(1)
                : 0,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        chefs: chefsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalChefs / limit),
          totalChefs,
          hasNext: page < Math.ceil(totalChefs / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all chefs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chefs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getChefDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const chef = await Chef.findById(id).select("-password");
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    // Get chef's orders
    const orders = await Order.find({ assignedChef: id })
      .populate("customer", "fullName email phone")
      .populate("subscription", "mealPlanId")
      .sort({ chefAssignedDate: -1 })
      .limit(10);

    // Get chef stats
    const stats = {
      totalOrders: await Order.countDocuments({ assignedChef: id }),
      completedOrders: await Order.countDocuments({
        assignedChef: id,
        delegationStatus: "Completed",
      }),
      pendingOrders: await Order.countDocuments({
        assignedChef: id,
        delegationStatus: "Assigned",
      }),
      inProgressOrders: await Order.countDocuments({
        assignedChef: id,
        delegationStatus: "In Progress",
      }),
      rejectedOrders: await Order.countDocuments({
        assignedChef: id,
        delegationStatus: "Rejected",
      }),
    };

    res.json({
      success: true,
      data: {
        chef,
        orders,
        stats,
      },
    });
  } catch (error) {
    console.error("Get chef details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chef details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateChefStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, sendEmail = true } = req.body;

    if (!["Active", "Inactive", "Suspended", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Get current chef data to check previous status
    const currentChef = await Chef.findById(id).select("-password");
    if (!currentChef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    const previousStatus = currentChef.status;

    const chef = await Chef.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).select("-password");

    // Send appropriate email and in-app notification based on status change
    let emailSent = false;
    let notificationSent = false;
    if (sendEmail && previousStatus !== status) {
      try {
        const emailService = require("../services/emailService");

        // Determine which email and notification to send based on status transition
        if (status === "Suspended" && previousStatus !== "Suspended") {
          // Chef is being suspended
          emailSent = await emailService.sendChefSuspensionEmail({
            chefName: chef.fullName,
            chefEmail: chef.email,
            reason: reason || "Violation of platform policies",
          });

          // Send in-app notification
          try {
            await NotificationService.notifyChefAccountSuspended(
              chef._id,
              reason || "Violation of platform policies"
            );
            notificationSent = true;
          } catch (notifError) {
            console.error(
              "Failed to send suspension notification:",
              notifError
            );
          }
        } else if (status === "Inactive" && previousStatus !== "Inactive") {
          // Chef is being deactivated
          emailSent = await emailService.sendChefDeactivationEmail({
            chefName: chef.fullName,
            chefEmail: chef.email,
            reason: reason || "Account deactivation",
          });

          // Send in-app notification
          try {
            await NotificationService.notifyChefAccountDeactivated(
              chef._id,
              reason || "Account deactivation"
            );
            notificationSent = true;
          } catch (notifError) {
            console.error(
              "Failed to send deactivation notification:",
              notifError
            );
          }
        } else if (status === "Active" && previousStatus === "Suspended") {
          // Chef is being unsuspended
          emailSent = await emailService.sendChefUnsuspensionEmail({
            chefName: chef.fullName,
            chefEmail: chef.email,
          });

          // Send in-app notification
          try {
            await NotificationService.notifyChefAccountUnsuspended(chef._id);
            notificationSent = true;
          } catch (notifError) {
            console.error(
              "Failed to send unsuspension notification:",
              notifError
            );
          }
        } else if (status === "Active" && previousStatus === "Inactive") {
          // Chef is being reactivated
          emailSent = await emailService.sendChefReactivationEmail({
            chefName: chef.fullName,
            chefEmail: chef.email,
          });

          // Send in-app notification
          try {
            await NotificationService.notifyChefAccountReactivated(chef._id);
            notificationSent = true;
          } catch (notifError) {
            console.error(
              "Failed to send reactivation notification:",
              notifError
            );
          }
        }
      } catch (emailError) {
        console.error("Failed to send chef status update email:", emailError);
        // Don't fail the status update if email fails
      }
    }

    res.json({
      success: true,
      message: `Chef status updated to ${status}`,
      data: chef,
      emailSent: sendEmail ? emailSent : null,
      notificationSent: sendEmail ? notificationSent : null,
      previousStatus,
      statusChanged: previousStatus !== status,
    });
  } catch (error) {
    console.error("Update chef status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update chef status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.approveChef = async (req, res) => {
  try {
    const { id } = req.params;
    const { sendEmail = true } = req.body;

    const chef = await Chef.findByIdAndUpdate(
      id,
      {
        status: "Active",
        availability: "Available",
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    // Send welcome email and in-app notification if requested
    let emailSent = false;
    let notificationSent = false;
    if (sendEmail) {
      try {
        const emailService = require("../services/emailService");
        emailSent = await emailService.sendChefAcceptanceEmail({
          chefName: chef.fullName,
          chefEmail: chef.email,
        });

        // Send in-app notification
        try {
          await NotificationService.notifyChefAccountApproved(chef._id);
          notificationSent = true;
        } catch (notifError) {
          console.error("Failed to send approval notification:", notifError);
        }
      } catch (emailError) {
        console.error("Failed to send chef approval email:", emailError);
        // Don't fail the approval if email fails
      }
    }

    res.json({
      success: true,
      message: "Chef approved successfully",
      data: chef,
      emailSent: sendEmail ? emailSent : null,
      notificationSent: sendEmail ? notificationSent : null,
    });
  } catch (error) {
    console.error("Approve chef error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve chef",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.rejectChef = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, sendEmail = true } = req.body;

    const chef = await Chef.findByIdAndUpdate(
      id,
      {
        status: "Inactive",
        availability: "Offline",
        rejectionReason: reason || "No reason provided",
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    // Send rejection email and in-app notification if requested
    let emailSent = false;
    let notificationSent = false;
    if (sendEmail) {
      try {
        const emailService = require("../services/emailService");
        emailSent = await emailService.sendChefRejectionEmail({
          chefName: chef.fullName,
          chefEmail: chef.email,
          reason: reason,
        });

        // Send in-app notification
        try {
          await NotificationService.notifyChefAccountRejected(
            chef._id,
            reason || "Application does not meet current requirements"
          );
          notificationSent = true;
        } catch (notifError) {
          console.error("Failed to send rejection notification:", notifError);
        }
      } catch (emailError) {
        console.error("Failed to send chef rejection email:", emailError);
        // Don't fail the rejection if email fails
      }
    }

    res.json({
      success: true,
      message: "Chef rejected successfully",
      data: chef,
      emailSent: sendEmail ? emailSent : null,
      notificationSent: sendEmail ? notificationSent : null,
    });
  } catch (error) {
    console.error("Reject chef error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject chef",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getPendingChefsCount = async (req, res) => {
  try {
    const pendingCount = await Chef.countDocuments({ status: "Pending" });

    res.json({
      success: true,
      data: { pendingCount },
    });
  } catch (error) {
    console.error("Get pending chefs count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending chefs count",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= ORDER DELEGATION =============

// ============= ENHANCED ORDER ASSIGNMENT =============
exports.assignChefToOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { chefId, chefName } = req.body;

    console.log("🎯 Chef Assignment Request:", {
      orderId,
      chefId,
      chefName,
      timestamp: new Date().toISOString(),
      body: req.body,
      params: req.params,
    });

    // Validate input parameters
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chefId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chef ID format",
      });
    }

    // Find the order with complete details
    const order = await Order.findById(orderId)
      .populate("customer", "fullName email phone")
      .populate("assignedChef", "fullName email chefId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("📋 Order Details Retrieved:", {
      id: order._id,
      orderNumber: order.orderNumber || "Not set",
      customer: order.customer?.fullName || "No customer",
      currentChef: order.assignedChef
        ? order.assignedChef.fullName
        : "Unassigned",
      delegationStatus: order.delegationStatus,
    });

    // Find and validate the chef
    const chef = await Chef.findById(chefId);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    console.log("👨‍🍳 Chef Details:", {
      id: chef._id,
      name: chef.fullName,
      status: chef.status,
      availability: chef.availability,
      capacity: `${chef.currentCapacity}/${chef.maxCapacity}`,
      isAvailable: chef.isAvailable(),
    });

    // Check if chef is available (with detailed logging)
    const availability = chef.isAvailable();
    console.log("🔍 Chef Availability Check:", {
      isAvailable: availability,
      status: chef.status,
      availability: chef.availability,
      currentCapacity: chef.currentCapacity,
      maxCapacity: chef.maxCapacity,
      capacityCheck: chef.currentCapacity < chef.maxCapacity,
      statusCheck: chef.status === "Active",
      availabilityCheck: chef.availability === "Available",
    });

    if (!availability) {
      const errorMsg = `Chef ${chef.fullName} is not available for new assignments. Status: ${chef.status}, Availability: ${chef.availability}, Capacity: ${chef.currentCapacity}/${chef.maxCapacity}`;
      console.log("❌ Chef unavailable:", errorMsg);
      return res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }

    console.log("✅ Chef is available for assignment");

    // Check if order is already assigned to this chef
    if (order.assignedChef && order.assignedChef._id.toString() === chefId) {
      return res.status(400).json({
        success: false,
        message: `Order is already assigned to ${chef.fullName}`,
      });
    }

    // Handle previous chef assignment - decrease their capacity
    if (order.assignedChef && order.assignedChef._id.toString() !== chefId) {
      console.log("🔄 Reassigning from previous chef...");
      const previousChef = await Chef.findById(order.assignedChef._id);
      if (previousChef) {
        previousChef.currentCapacity = Math.max(
          0,
          previousChef.currentCapacity - 1
        );
        await previousChef.save();
        console.log(
          `✅ Previous chef ${previousChef.fullName} capacity updated: ${previousChef.currentCapacity}`
        );

        // Cancel previous delegation
        await OrderDelegation.findOneAndUpdate(
          { order: orderId },
          {
            status: "Cancelled",
            adminNotes: `Reassigned to different chef ${chef.fullName}`,
          },
          { new: true }
        );
      }
    }

    // Update order with new assignment
    const updateData = {
      assignedChef: chefId,
      delegationStatus: "Assigned",
      chefAssignedDate: new Date(),
      adminNotes: `Assigned to ${
        chef.fullName
      } by admin at ${new Date().toISOString()}`,
    };

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedChef", "fullName email chefId")
      .populate("customer", "fullName email");

    if (!updatedOrder) {
      throw new Error("Failed to update order");
    }

    // Update chef capacity
    chef.currentCapacity += 1;
    await chef.save();
    console.log(
      `✅ Chef ${chef.fullName} capacity updated: ${chef.currentCapacity}/${chef.maxCapacity}`
    );

    // Create OrderDelegation record for chef tracking
    let delegation = await OrderDelegation.findOne({ order: orderId });

    if (delegation) {
      // Update existing delegation
      delegation.chef = chefId;
      delegation.status = "Assigned";
      delegation.delegatedBy = req.user?.id || "admin";
      delegation.delegationDate = new Date();
      delegation.adminNotes = `Reassigned to ${chef.fullName}`;
      delegation.timeline.push({
        status: "Assigned",
        timestamp: new Date(),
        notes: `Reassigned to ${chef.fullName}`,
        updatedBy: "Admin",
      });
    } else {
      // Create new delegation
      const estimatedCompletionTime = new Date();
      estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 24);

      delegation = new OrderDelegation({
        order: orderId,
        chef: chefId,
        delegatedBy: req.user?.id || "admin",
        status: "Assigned",
        estimatedCompletionTime: estimatedCompletionTime,
        priority: "Medium",
        adminNotes: `Assigned to ${chef.fullName}`,
        payment: {
          chefFee: 5000,
          totalCost: 5000,
        },
        timeline: [
          {
            status: "Assigned",
            timestamp: new Date(),
            notes: `Order assigned to ${chef.fullName}`,
            updatedBy: "Admin",
          },
        ],
      });
    }

    await delegation.save();
    console.log("✅ Delegation record updated/created successfully");

    // Send notifications (non-blocking)
    setImmediate(async () => {
      try {
        console.log("📧 Starting notification process...");

        if (updatedOrder.customer) {
          await NotificationService.notifyChefAssigned(
            updatedOrder.customer._id,
            {
              orderId: updatedOrder._id,
              chefName: chef.fullName,
              chefId: chef._id,
            }
          );
          console.log("✅ Customer notification sent");
        }

        await NotificationService.notifyChefNewOrder(chef._id, {
          orderId: updatedOrder._id,
          customerName: updatedOrder.customer?.fullName || "Customer",
          totalAmount: updatedOrder.totalAmount,
        });
        console.log("✅ Chef notification sent");
      } catch (notificationError) {
        console.error(
          "❌ Failed to send notifications:",
          notificationError.message
        );
      }
    });

    console.log("📤 Sending successful response...");
    res.json({
      success: true,
      message: "Order assigned to chef successfully",
      data: {
        order: {
          _id: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          assignedChef: updatedOrder.assignedChef,
          delegationStatus: updatedOrder.delegationStatus,
          chefAssignedDate: updatedOrder.chefAssignedDate,
        },
        chef: {
          _id: chef._id,
          fullName: chef.fullName,
          email: chef.email,
          chefId: chef.chefId,
          currentCapacity: chef.currentCapacity,
          maxCapacity: chef.maxCapacity,
        },
        delegation: {
          _id: delegation._id,
          status: delegation.status,
          delegationDate: delegation.delegationDate,
        },
      },
    });
  } catch (err) {
    console.error("❌ Chef assignment error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to assign chef to order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= CHEF NOTIFICATION SYSTEM =============
exports.notifyChef = async (req, res) => {
  try {
    const { id: chefId } = req.params;
    const { type, orderId, message } = req.body;

    const chef = await Chef.findById(chefId);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    // Send notification based on type
    let notificationSent = false;

    switch (type) {
      case "order_assignment":
        const order = await Order.findById(orderId).populate("customer");
        if (order) {
          notificationSent = await this.sendChefNotification(chef, order);
        }
        break;
      default:
        // Generic notification
        notificationSent = await this.sendGenericChefNotification(
          chef,
          message
        );
    }

    res.json({
      success: true,
      message: "Notification sent to chef",
      data: {
        chef: {
          id: chef._id,
          fullName: chef.fullName,
          email: chef.email,
        },
        notificationSent,
      },
    });
  } catch (error) {
    console.error("Chef notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification to chef",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= NOTIFICATION HELPER METHODS =============
exports.sendChefNotification = async (chef, order) => {
  try {
    const orderNumber =
      order.orderNumber || order._id.toString().slice(-6).toUpperCase();
    const customerName = order.customer?.fullName || "Customer";

    // Create notification message
    const notificationData = {
      chefId: chef._id,
      chefName: chef.fullName,
      chefEmail: chef.email,
      orderId: order._id,
      orderNumber: orderNumber,
      customerName: customerName,
      message: `🍽️ New Order Assignment!\n\nHi ${chef.fullName},\n\nYou have been assigned a new order #${orderNumber} from ${customerName}.\n\nPlease check your chef dashboard for details.\n\nBest regards,\nchoma Admin Team`,
    };

    // Log notification (in production, this would integrate with email/SMS services)
    console.log("📧 CHEF NOTIFICATION SENT:", {
      to: chef.email,
      chef: chef.fullName,
      order: orderNumber,
      customer: customerName,
      timestamp: new Date().toISOString(),
    });

    // In a real application, you would integrate with:
    // - Email service (SendGrid, Nodemailer, etc.)
    // - SMS service (Twilio, Africa's Talking, etc.)
    // - Push notification service
    // - In-app notification system

    /*
    // Example email integration:
    await emailService.send({
      to: chef.email,
      subject: `New Order Assignment #${orderNumber}`,
      template: 'chef_order_assignment',
      data: notificationData
    });

    // Example SMS integration:
    if (chef.phone) {
      await smsService.send({
        to: chef.phone,
        message: `New order #${orderNumber} assigned to you. Check your dashboard for details.`
      });
    }
    */

    return true;
  } catch (error) {
    console.error("Error sending chef notification:", error);
    return false;
  }
};

exports.sendGenericChefNotification = async (chef, message) => {
  try {
    console.log("📧 GENERIC CHEF NOTIFICATION:", {
      to: chef.email,
      chef: chef.fullName,
      message: message,
      timestamp: new Date().toISOString(),
    });

    // In production, integrate with your notification services here
    return true;
  } catch (error) {
    console.error("Error sending generic chef notification:", error);
    return false;
  }
};

// ============= HELPER FUNCTIONS FOR ORDER MANAGEMENT =============

// Build sort query based on sort criteria
function buildSortQuery(sortBy, sortOrder) {
  const order = sortOrder === "desc" ? -1 : 1;

  switch (sortBy) {
    case "date":
      return { createdDate: order };
    case "delivery":
      return { deliveryDate: order };
    case "customer":
      return { "customer.fullName": order };
    case "amount":
      return { totalAmount: order };
    case "status":
      return { orderStatus: order };
    case "urgency":
      // For urgency, we'll sort in memory after adding urgency scores
      return { createdDate: 1 }; // Default to oldest first for unassigned priority
    default:
      return { createdDate: 1 }; // Oldest orders first (higher priority)
  }
}

// Calculate order urgency based on multiple factors
function calculateOrderUrgency(order) {
  const now = new Date();
  const orderDate = new Date(order.createdDate);
  const deliveryDate = new Date(order.deliveryDate);

  // Calculate days since order creation
  const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

  // Calculate days until delivery
  const daysUntilDelivery = Math.floor(
    (deliveryDate - now) / (1000 * 60 * 60 * 24)
  );

  // Base urgency score (higher = more urgent)
  let urgencyScore = 0;
  let urgencyLevel = "normal";
  let urgencyReasons = [];

  // Age-based urgency (orders >1 day old get urgency boost)
  if (daysSinceOrder >= 1) {
    urgencyScore += daysSinceOrder * 10;
    urgencyReasons.push(`${daysSinceOrder} days old`);

    if (daysSinceOrder >= 2) {
      urgencyLevel = "urgent";
    }
  }

  // Assignment-based urgency (unassigned orders are higher priority)
  const isUnassigned =
    !order.assignedChef ||
    order.delegationStatus === "Not Assigned" ||
    !order.delegationStatus;

  if (isUnassigned) {
    urgencyScore += 50;
    urgencyReasons.push("unassigned");

    if (daysSinceOrder >= 1) {
      urgencyLevel = "urgent";
      urgencyScore += 25;
    }
  }

  // Delivery date urgency
  if (daysUntilDelivery <= 1 && daysUntilDelivery >= 0) {
    urgencyScore += 30;
    urgencyReasons.push("delivery soon");
  } else if (daysUntilDelivery < 0) {
    urgencyScore += 100;
    urgencyLevel = "critical";
    urgencyReasons.push("delivery overdue");
  }

  // Priority-based urgency
  if (order.priority === "High") {
    urgencyScore += 20;
    urgencyReasons.push("high priority");
  } else if (order.priority === "Urgent") {
    urgencyScore += 50;
    urgencyLevel = "urgent";
    urgencyReasons.push("urgent priority");
  }

  // Payment status urgency
  if (order.paymentStatus === "Failed") {
    urgencyScore += 15;
    urgencyReasons.push("payment failed");
  } else if (order.paymentStatus === "Pending") {
    urgencyScore += 10;
    urgencyReasons.push("payment pending");
  }

  // Determine final urgency level
  if (urgencyScore >= 100) {
    urgencyLevel = "critical";
  } else if (urgencyScore >= 50) {
    urgencyLevel = "urgent";
  } else if (urgencyScore >= 25) {
    urgencyLevel = "high";
  }

  return {
    urgencyScore,
    urgencyLevel,
    urgencyReasons,
    daysSinceOrder,
    daysUntilDelivery,
    isUnassigned,
    displayText:
      urgencyReasons.length > 0 ? urgencyReasons.join(", ") : "normal",
  };
}

// ============= STATS ENDPOINTS =============

/**
 * Get user statistics for admin dashboard
 */
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await Customer.countDocuments();
    const activeUsers = await Customer.countDocuments({ status: "Active" });
    const inactiveUsers = await Customer.countDocuments({ status: "Inactive" });
    const suspendedUsers = await Customer.countDocuments({
      status: "Suspended",
    });

    // Users with active subscriptions
    const subscribedUsers = await Subscription.countDocuments({
      status: "Active",
    });

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newUsersToday = await Customer.countDocuments({
      registrationDate: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        subscribedUsers,
        newUsersToday,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get chef statistics for admin dashboard
 */
exports.getChefStats = async (req, res) => {
  try {
    const totalChefs = await Chef.countDocuments();
    const activeChefs = await Chef.countDocuments({ status: "Active" });
    const pendingChefs = await Chef.countDocuments({ status: "Pending" });
    const inactiveChefs = await Chef.countDocuments({ status: "Inactive" });
    const suspendedChefs = await Chef.countDocuments({ status: "Suspended" });

    // Available chefs (active and available)
    const availableChefs = await Chef.countDocuments({
      status: "Active",
      availability: "Available",
    });

    // Busy chefs (active but busy)
    const busyChefs = await Chef.countDocuments({
      status: "Active",
      availability: "Busy",
    });

    res.json({
      success: true,
      data: {
        totalChefs,
        activeChefs,
        pendingChefs,
        inactiveChefs,
        suspendedChefs,
        availableChefs,
        busyChefs,
      },
    });
  } catch (error) {
    console.error("Get chef stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chef statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= NEW MODULAR MEAL MANAGEMENT SYSTEM =============

// ============= INDIVIDUAL MEALS MANAGEMENT =============
exports.getAllMeals = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, isAvailable } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === "true";
    }

    const meals = await Meal.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meal.countDocuments(filter);

    res.json({
      success: true,
      data: {
        meals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMeals: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Get assignment count
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealId: id,
    });

    res.json({
      success: true,
      data: {
        meal,
        assignmentCount,
      },
    });
  } catch (error) {
    console.error("Get meal details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.createMeal = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      pricing,
      nutrition,
      ingredients,
      preparationTime,
      complexityLevel,
      allergens,
      category,
      tags,
      adminNotes,
      chefNotes,
    } = req.body;

    const meal = new Meal({
      name,
      description,
      image,
      pricing: {
        ingredients: parseFloat(pricing?.ingredients) || 0,
        cookingCosts: parseFloat(pricing?.cookingCosts) || 0,
        packaging: parseFloat(pricing?.packaging) || 0,
        delivery: parseFloat(pricing?.delivery) || 0,
        platformFee: parseFloat(pricing?.platformFee) || 0,
        totalCosts: parseFloat(pricing?.totalCosts) || 0,
        profit: parseFloat(pricing?.profit) || 0,
        totalPrice: parseFloat(pricing?.totalPrice) || 0,
        chefEarnings: parseFloat(pricing?.chefEarnings) || 0,
        chomaEarnings: parseFloat(pricing?.chomaEarnings) || 0,
      },
      nutrition: {
        calories: parseInt(nutrition?.calories) || 0,
        protein: parseFloat(nutrition?.protein) || 0,
        carbs: parseFloat(nutrition?.carbs) || 0,
        fat: parseFloat(nutrition?.fat) || 0,
        fiber: parseFloat(nutrition?.fiber) || 0,
        sugar: parseFloat(nutrition?.sugar) || 0,
        weight: parseFloat(nutrition?.weight) || 0,
      },
      ingredients,
      preparationTime: parseInt(preparationTime) || 0,
      complexityLevel: complexityLevel || "medium",
      allergens: allergens || [],
      category,
      tags: tags || [],
      adminNotes,
      chefNotes,
    });

    await meal.save();

    res.status(201).json({
      success: true,
      message: "Meal created successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Create meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle pricing data updates - no need for manual calculation as model will handle it
    if (updateData.pricing) {
      // Ensure all required pricing fields are present for calculations
      const meal = await Meal.findById(id);
      if (!meal) {
        return res.status(404).json({
          success: false,
          message: "Meal not found",
        });
      }
    }

    const meal = await Meal.findByIdAndUpdate(id, updateData, { new: true });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Update all meal plans that use this meal
    const assignments = await MealPlanAssignment.find({ mealIds: id }).populate(
      "mealPlanId"
    );
    for (const assignment of assignments) {
      if (assignment.mealPlanId) {
        await assignment.mealPlanId.updateCalculatedFields();
      }
    }

    res.json({
      success: true,
      message: "Meal updated successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Update meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    // Check if meal exists first
    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Check if meal is assigned to any meal plans
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealIds: id,
    });

    if (assignmentCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal. It is assigned to ${assignmentCount} meal plan(s). Remove assignments first.`,
      });
    }

    // If force delete is requested, remove meal from all meal plan assignments
    if (force && assignmentCount > 0) {
      console.log(
        `🔄 Force deleting meal ${id}, removing from ${assignmentCount} meal plan assignments...`
      );

      // Remove the meal from all meal plan assignments
      const updateResult = await MealPlanAssignment.updateMany(
        { mealIds: id },
        { $pull: { mealIds: id } }
      );

      // Remove empty assignments (assignments with no meals left)
      await MealPlanAssignment.deleteMany({ mealIds: { $size: 0 } });

      console.log(
        `✅ Removed meal from ${updateResult.modifiedCount} assignments`
      );
    }

    // Now delete the meal
    await Meal.findByIdAndDelete(id);

    // Recalculate the total price of the affected meal plans
    if (force && assignmentCount > 0) {
      const assignments = await MealPlanAssignment.find({ mealIds: id });
      const mealPlanIds = [...new Set(assignments.map(a => a.mealPlanId.toString()))];

      for (const mealPlanId of mealPlanIds) {
        const mealPlan = await MealPlan.findById(mealPlanId);
        if (mealPlan) {
          await mealPlan.updateCalculatedFields();
        }
      }
    }

    res.json({
      success: true,
      message:
        force && assignmentCount > 0
          ? `Meal deleted successfully. Removed from ${assignmentCount} meal plan assignment(s).`
          : "Meal deleted successfully",
    });
  } catch (error) {
    console.error("Delete meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.toggleMealAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    await meal.toggleAvailability();

    res.json({
      success: true,
      message: `Meal ${meal.isAvailable ? "enabled" : "disabled"} successfully`,
      data: meal,
    });
  } catch (error) {
    console.error("Toggle meal availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle meal availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= NEW MEAL PLANS MANAGEMENT (V2) =============
exports.getAllMealPlansV2 = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isPublished,
      durationWeeks,
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { planName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }
    if (durationWeeks) {
      filter.durationWeeks = parseInt(durationWeeks);
    }

    const mealPlans = await MealPlan.find(filter)
      .sort({ createdDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MealPlan.countDocuments(filter);

    // Get assignment counts for each meal plan
    const mealPlansWithStats = await Promise.all(
      mealPlans.map(async (plan) => {
        const assignmentCount = await MealPlanAssignment.countDocuments({
          mealPlanId: plan._id,
        });
        return {
          ...plan.toObject(),
          assignmentCount,
        };
      })
    );

    res.json({
      success: true,
      data: {
        mealPlans: mealPlansWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMealPlans: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all meal plans V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plans",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealPlanDetailsV2 = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Get all assignments for this meal plan
    const assignments = await MealPlanAssignment.find({ mealPlanId: id })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    // Group assignments by week and day
    const schedule = {};
    assignments.forEach((assignment) => {
      const week = `week${assignment.weekNumber}`;
      const day = assignment.dayOfWeek;

      if (!schedule[week]) schedule[week] = {};
      if (!schedule[week][day]) schedule[week][day] = {};

      schedule[week][day][assignment.mealTime] = {
        assignment: assignment.toObject(),
        meals: assignment.mealIds,
        customTitle: assignment.customTitle,
        customDescription: assignment.customDescription,
      };
    });

    res.json({
      success: true,
      data: {
        mealPlan,
        schedule,
        assignments: assignments.length,
        totalDays: mealPlan.getTotalDays(),
      },
    });
  } catch (error) {
    console.error("Get meal plan details V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.createMealPlanV2 = async (req, res) => {
  try {
    const {
      planName,
      description,
      coverImage,
      durationWeeks,
      targetAudience,
      planFeatures,
      adminNotes,
    } = req.body;

    const mealPlan = new MealPlan({
      planName,
      description,
      coverImage,
      durationWeeks: parseInt(durationWeeks) || 4,
      targetAudience,
      planFeatures: planFeatures || [],
      adminNotes,
      isPublished: false, // Default to unpublished
      totalPrice: 0, // Will be calculated when meals are assigned
      isActive: true,
    });

    await mealPlan.save();

    res.status(201).json({
      success: true,
      message: "Meal plan created successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Create meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMealPlanV2 = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow direct updates to calculated fields
    delete updateData.totalPrice;
    delete updateData.nutritionInfo;
    delete updateData.stats;

    const mealPlan = await MealPlan.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      message: "Meal plan updated successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Update meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteMealPlanV2 = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if meal plan has assignments
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealPlanId: id,
    });
    if (assignmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal plan. It has ${assignmentCount} meal assignment(s). Remove assignments first.`,
      });
    }

    const mealPlan = await MealPlan.findByIdAndDelete(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      message: "Meal plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.publishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Check if meal plan has any assignments
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealPlanId: id,
    });
    if (assignmentCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish meal plan without any meal assignments",
      });
    }

    await mealPlan.publish();

    res.json({
      success: true,
      message: "Meal plan published successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Publish meal plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.unpublishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    await mealPlan.unpublish();

    res.json({
      success: true,
      message: "Meal plan unpublished successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Unpublish meal plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= MEAL ASSIGNMENT SYSTEM =============
exports.getMealPlanAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    const assignments = await MealPlanAssignment.find({ mealPlanId: id })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    res.json({
      success: true,
      data: {
        mealPlan: {
          id: mealPlan._id,
          planName: mealPlan.planName,
          durationWeeks: mealPlan.durationWeeks,
        },
        assignments,
      },
    });
  } catch (error) {
    console.error("Get meal plan assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan assignments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.assignMealToPlan = async (req, res) => {
  try {
    const { id } = req.params; // meal plan id
    const {
      mealIds,
      customTitle,
      customDescription,
      imageUrl,
      weekNumber,
      dayOfWeek,
      mealTime,
      notes,
    } = req.body;

    // Validate inputs
    if (
      !mealIds ||
      !Array.isArray(mealIds) ||
      mealIds.length === 0 ||
      !customTitle ||
      !weekNumber ||
      !dayOfWeek ||
      !mealTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: mealIds (array), customTitle, weekNumber, dayOfWeek, mealTime",
      });
    }

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Verify all meals exist
    const meals = await Meal.find({ _id: { $in: mealIds } });
    if (meals.length !== mealIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more meals not found",
      });
    }

    // Validate week number against meal plan duration
    if (weekNumber < 1 || weekNumber > mealPlan.durationWeeks) {
      return res.status(400).json({
        success: false,
        message: `Week number must be between 1 and ${mealPlan.durationWeeks}`,
      });
    }

    // Validate day of week (1-7)
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return res.status(400).json({
        success: false,
        message: "Day of week must be between 1 (Monday) and 7 (Sunday)",
      });
    }

    // Validate meal time
    if (!["breakfast", "lunch", "dinner"].includes(mealTime)) {
      return res.status(400).json({
        success: false,
        message: "Meal time must be breakfast, lunch, or dinner",
      });
    }

    // Check if slot is already occupied
    const existingAssignment = await MealPlanAssignment.findOne({
      mealPlanId: id,
      weekNumber,
      dayOfWeek,
      mealTime,
    });

    if (existingAssignment) {
      // Replace existing assignment
      await MealPlanAssignment.replaceSlot(
        id,
        weekNumber,
        dayOfWeek,
        mealTime,
        mealIds,
        customTitle,
        customDescription || "",
        imageUrl || "",
        notes || ""
      );
    } else {
      // Create new assignment
      await MealPlanAssignment.create({
        mealPlanId: id,
        mealIds,
        customTitle,
        customDescription: customDescription || "",
        imageUrl: imageUrl || "",
        weekNumber,
        dayOfWeek,
        mealTime,
        notes: notes || "",
      });
    }

    // Recalculate the total price of the meal plan
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: existingAssignment
        ? "Meal assignment updated successfully"
        : "Meal assigned successfully",
    });
  } catch (error) {
    console.error("Assign meal to plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign meal to plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMealAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    const updateData = req.body;

    const assignment = await MealPlanAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Verify assignment belongs to the meal plan
    if (assignment.mealPlanId.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "Assignment does not belong to this meal plan",
      });
    }

    // If changing time slot, check for conflicts
    if (updateData.weekNumber || updateData.dayOfWeek || updateData.mealTime) {
      const weekNumber = updateData.weekNumber || assignment.weekNumber;
      const dayOfWeek = updateData.dayOfWeek || assignment.dayOfWeek;
      const mealTime = updateData.mealTime || assignment.mealTime;

      const conflictingAssignment = await MealPlanAssignment.findOne({
        mealPlanId: id,
        weekNumber,
        dayOfWeek,
        mealTime,
        _id: { $ne: assignmentId },
      });

      if (conflictingAssignment) {
        return res.status(400).json({
          success: false,
          message: "Time slot is already occupied by another meal",
        });
      }
    }

    const updatedAssignment = await MealPlanAssignment.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true }
    ).populate("mealId");

    // Recalculate the total price of the meal plan
    const mealPlan = await MealPlan.findById(id);
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Update meal assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update assignment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.removeMealAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;

    const assignment = await MealPlanAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Verify assignment belongs to the meal plan
    if (assignment.mealPlanId.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "Assignment does not belong to this meal plan",
      });
    }

    await MealPlanAssignment.findByIdAndDelete(assignmentId);

    // Recalculate the total price of the meal plan
    const mealPlan = await MealPlan.findById(id);
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: "Assignment removed successfully",
    });
  } catch (error) {
    console.error("Remove meal assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove assignment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealPlanSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { week } = req.query;

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    let filter = { mealPlanId: id };
    if (week) {
      filter.weekNumber = parseInt(week);
    }

    const assignments = await MealPlanAssignment.find(filter)
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    // Group assignments into a schedule format
    const schedule = {};
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const mealTimes = ["breakfast", "lunch", "dinner"];

    // Initialize schedule structure
    for (let w = 1; w <= mealPlan.durationWeeks; w++) {
      schedule[`week${w}`] = {};
      for (let d = 1; d <= 7; d++) {
        schedule[`week${w}`][dayNames[d - 1]] = {};
        mealTimes.forEach((time) => {
          schedule[`week${w}`][dayNames[d - 1]][time] = null;
        });
      }
    }

    // Fill in assignments
    assignments.forEach((assignment) => {
      const week = `week${assignment.weekNumber}`;
      const day = dayNames[assignment.dayOfWeek - 1];

      schedule[week][day][assignment.mealTime] = {
        assignmentId: assignment._id,
        meals: assignment.mealIds,
        customTitle: assignment.customTitle,
        customDescription: assignment.customDescription,
        notes: assignment.notes,
      };
    });

    res.json({
      success: true,
      data: {
        mealPlan: {
          id: mealPlan._id,
          planName: mealPlan.planName,
          durationWeeks: mealPlan.durationWeeks,
          totalPrice: mealPlan.totalPrice,
        },
        schedule,
        totalAssignments: assignments.length,
      },
    });
  } catch (error) {
    console.error("Get meal plan schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan schedule",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= BULK OPERATIONS =============
exports.bulkCreateMeals = async (req, res) => {
  try {
    const { meals } = req.body;

    if (!Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meals array is required and cannot be empty",
      });
    }

    const createdMeals = [];
    const errors = [];

    for (let i = 0; i < meals.length; i++) {
      try {
        const meal = new Meal(meals[i]);
        await meal.save();
        createdMeals.push(meal);
      } catch (error) {
        errors.push({
          index: i,
          meal: meals[i],
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `${createdMeals.length} meals created successfully`,
      data: {
        created: createdMeals,
        errors: errors,
        summary: {
          total: meals.length,
          created: createdMeals.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Bulk create meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk create meals",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.bulkUpdateMealAvailability = async (req, res) => {
  try {
    const { mealIds, isAvailable } = req.body;

    if (!Array.isArray(mealIds) || mealIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meal IDs array is required and cannot be empty",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be a boolean value",
      });
    }

    const result = await Meal.updateMany(
      { _id: { $in: mealIds } },
      { isAvailable, updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} meals updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Bulk update meal availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update meal availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= MEAL PLAN PUBLISHING SYSTEM =============
exports.publishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal plan ID",
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Check if meal plan has assignments
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealPlanId: id,
    });

    if (assignmentCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish meal plan without meal assignments",
      });
    }

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      { isPublished: true },
      { new: true }
    );

    res.json({
      success: true,
      message: "Meal plan published successfully",
      data: updatedPlan,
    });
  } catch (err) {
    console.error("Publish meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to publish meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.unpublishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal plan ID",
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      { isPublished: false },
      { new: true }
    );

    res.json({
      success: true,
      message: "Meal plan unpublished successfully",
      data: updatedPlan,
    });
  } catch (err) {
    console.error("Unpublish meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
