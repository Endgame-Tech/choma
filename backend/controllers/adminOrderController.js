const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const Chef = require("../models/Chef");
const OrderDelegation = require("../models/OrderDelegation");
const NotificationService = require("../services/notificationService");
const deliveryAssignmentService = require("../services/deliveryAssignmentService");
const mongoose = require("mongoose");

// Helper function to check if this is the first order for a subscription
const isFirstSubscriptionOrder = async (order) => {
  console.log(`🔍 Checking if first subscription order:`, {
    orderId: order._id,
    subscriptionId: order.subscriptionId,
    hasSubscriptionId: !!order.subscriptionId,
  });

  if (!order.subscriptionId) {
    console.log(`❌ Not a subscription order - no subscriptionId`);
    return false; // Not a subscription order
  }

  try {
    // Count previous orders for this subscription
    const previousOrdersCount = await Order.countDocuments({
      subscriptionId: order.subscriptionId,
      createdAt: { $lt: order.createdAt },
      status: { $nin: ["cancelled", "failed"] },
    });

    const isFirst = previousOrdersCount === 0;
    console.log(`🔍 Subscription order analysis:`, {
      subscriptionId: order.subscriptionId,
      previousOrdersCount,
      isFirstOrder: isFirst,
      currentOrderCreatedAt: order.createdAt,
    });

    return isFirst;
  } catch (error) {
    console.error("Error checking first subscription order:", error);
    return false;
  }
};

// ============= ENHANCED ORDER MANAGEMENT =============

// Get all orders with advanced filtering
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const paymentStatus = req.query.paymentStatus || "";
    const sortBy = req.query.sortBy || "createdDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const chef = req.query.chef;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      // Search by order ID, customer name, or email
      const customers = await Customer.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const customerIds = customers.map((c) => c._id);

      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } },
      ];
    }

    // Status filters
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdDate = {};
      if (dateFrom) query.createdDate.$gte = new Date(dateFrom);
      if (dateTo) query.createdDate.$lte = new Date(dateTo);
    }

    // Chef filter
    if (chef) {
      const delegations = await OrderDelegation.find({ chef: chef }).select(
        "order"
      );
      const orderIds = delegations.map((d) => d.order);
      query._id = { $in: orderIds };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Execute query with population
    const orders = await Order.find(query)
      .populate("customer", "fullName email phone customerId")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName planType",
        },
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get chef assignments for each order
    const orderIds = orders.map((o) => o._id);
    const subscriptionIds = orders
      .filter((o) => o.subscription)
      .map((o) => o.subscription._id || o.subscription);

    // Fetch delegations for both regular orders (old schema) and subscription orders (new schema)
    const [regularDelegations, subscriptionDelegations] = await Promise.all([
      OrderDelegation.find({ order: { $in: orderIds } })
        .populate("chef", "fullName email")
        .lean(),
      OrderDelegation.find({ subscriptionId: { $in: subscriptionIds } })
        .populate("chefId", "fullName email")
        .lean(),
    ]);

    // Create a map for quick lookup of subscription delegations
    const subDelegationMap = new Map();
    subscriptionDelegations.forEach((delegation) => {
      subDelegationMap.set(delegation.subscriptionId.toString(), delegation);
    });

    // Add chef info and meal statuses to orders
    const ordersWithChefs = orders.map((order) => {
      let assignedChef = null;
      let chefStatus = null;

      // Check if this is a subscription order
      const isSubscriptionOrder = order.subscription?._id || order.subscription;

      if (isSubscriptionOrder) {
        // Use NEW schema: get chef from OrderDelegation by subscriptionId
        const subId = (order.subscription._id || order.subscription).toString();
        const subDelegation = subDelegationMap.get(subId);

        if (subDelegation) {
          assignedChef = subDelegation.chefId || null;

          // If chef is assigned, set status to "Assigned"
          if (assignedChef) {
            chefStatus = "Assigned";
          }

          // Get more specific chef status from dailyTimeline if order has a specific delivery date
          if (order.deliveryDate && subDelegation.dailyTimeline) {
            const orderDate = new Date(order.deliveryDate);
            orderDate.setHours(0, 0, 0, 0);

            const dayEntry = subDelegation.dailyTimeline.find((entry) => {
              const entryDate = new Date(entry.date);
              entryDate.setHours(0, 0, 0, 0);
              return entryDate.getTime() === orderDate.getTime();
            });

            if (dayEntry) {
              // Map daily timeline status to delegation status
              if (dayEntry.status === "ready") {
                chefStatus = "Ready";
              } else if (dayEntry.status === "delivered") {
                chefStatus = "Completed";
              } else if (dayEntry.status === "pending") {
                chefStatus = "In Progress";
              }
            }
          }
        }
      } else {
        // Use OLD schema: get chef from OrderDelegation by order ID
        const delegation = regularDelegations.find(
          (d) => d.order.toString() === order._id.toString()
        );
        assignedChef = delegation?.chef || null;
        chefStatus = delegation?.status || null;
      }

      // Extract meal statuses from subscription if available
      let mealStatuses = [];
      let allMealsReady = false;

      if (order.subscription?.mealPlanSnapshot?.mealSchedule) {
        // Get meals for this order's delivery date
        const orderDate = new Date(order.deliveryDate);
        orderDate.setHours(0, 0, 0, 0);
        const orderDateStr = orderDate.toISOString().split("T")[0];

        const relevantMeals =
          order.subscription.mealPlanSnapshot.mealSchedule.filter((slot) => {
            if (!slot.scheduledDeliveryDate) return false;
            const slotDate = new Date(slot.scheduledDeliveryDate);
            slotDate.setHours(0, 0, 0, 0);
            const slotDateStr = slotDate.toISOString().split("T")[0];
            return slotDateStr === orderDateStr;
          });

        mealStatuses = relevantMeals.map((slot) => ({
          mealType: slot.mealTime,
          status: slot.deliveryStatus || "pending",
          isReady: slot.deliveryStatus === "ready",
        }));

        allMealsReady =
          mealStatuses.length > 0 && mealStatuses.every((m) => m.isReady);
      }

      // For subscription orders with assigned chefs, override any existing delegationStatus
      const finalDelegationStatus =
        isSubscriptionOrder && assignedChef
          ? chefStatus || "Assigned" // Use calculated status or default to "Assigned"
          : chefStatus || order.delegationStatus || null; // For regular orders, use original logic

      return {
        ...order,
        assignedChef: assignedChef,
        delegationStatus: finalDelegationStatus,
        mealStatuses,
        allMealsReady,
        readyForDriver: order.orderStatus === "Ready" || allMealsReady,
      };
    });

    const total = await Order.countDocuments(query);

    // Get order statistics
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        orders: ordersWithChefs,
        stats: {
          orderStatus: orderStats.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, total: stat.totalAmount };
            return acc;
          }, {}),
          paymentStatus: paymentStats.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, total: stat.totalAmount };
            return acc;
          }, {}),
        },
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit,
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

// Get delivery-ready orders (Tab 2: for driver assignment)
exports.getDeliveryReadyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "deliveryDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build query for delivery-ready orders
    // Removed status restrictions - admin can assign driver anytime
    let query = {
      "recurringOrder.orderType": "subscription-recurring", // Only subscription deliveries
    };

    // Search functionality
    if (search) {
      const customers = await Customer.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const customerIds = customers.map((c) => c._id);

      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } },
      ];
    }

    // Get orders with populated refs
    const orders = await Order.find(query)
      .populate("customer", "fullName email phone")
      .populate("subscription", "subscriptionId frequency")
      .populate("assignedChef", "fullName email phone")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    // Enrich orders with chef and driver info from OrderDelegation for subscription orders
    const subscriptionIds = orders
      .filter((o) => o.subscription)
      .map((o) => o.subscription._id || o.subscription);

    const subscriptionDelegations = await OrderDelegation.find({
      subscriptionId: { $in: subscriptionIds },
    })
      .populate("chefId", "fullName email")
      .populate("driverId", "fullName email phone vehicleInfo")
      .lean();

    const subDelegationMap = new Map();
    subscriptionDelegations.forEach((delegation) => {
      subDelegationMap.set(delegation.subscriptionId.toString(), delegation);
    });

    // Add chef and driver info to orders
    const enrichedOrders = orders.map((order) => {
      const isSubscriptionOrder = order.subscription?._id || order.subscription;

      if (isSubscriptionOrder) {
        const subId = (order.subscription._id || order.subscription).toString();
        const subDelegation = subDelegationMap.get(subId);

        if (subDelegation) {
          return {
            ...order,
            assignedChef: subDelegation.chefId || order.assignedChef,
            assignedDriver: subDelegation.driverId || null,
            delegationStatus: subDelegation.chefId
              ? "Assigned"
              : "Not Assigned",
          };
        }
      }

      return order;
    });

    // Calculate stats
    const totalReady = await Order.countDocuments({
      orderStatus: "Ready",
      "recurringOrder.orderType": "subscription-recurring",
    });

    const totalAmount = await Order.aggregate([
      {
        $match: {
          orderStatus: "Ready",
          "recurringOrder.orderType": "subscription-recurring",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        orders: enrichedOrders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasMore: skip + enrichedOrders.length < total,
        },
        stats: {
          totalReadyOrders: totalReady,
          totalValue: totalAmount[0]?.total || 0,
        },
      },
      message: `Found ${enrichedOrders.length} delivery-ready orders`,
    });
  } catch (error) {
    console.error("❌ Get delivery-ready orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery-ready orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id)
      .populate("customer", "fullName email phone customerId address")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName planType description nutritionInfo",
        },
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get chef assignment
    const delegation = await OrderDelegation.findOne({ order: id })
      .populate("chef", "fullName email phone specializations")
      .lean();

    // Get order history/timeline
    const orderHistory = [
      {
        status: "Pending",
        timestamp: order.createdDate,
        note: "Order created",
      },
      ...(order.confirmedDate
        ? [
            {
              status: "Confirmed",
              timestamp: order.confirmedDate,
              note: "Order confirmed",
            },
          ]
        : []),
      ...(order.inProgressDate
        ? [
            {
              status: "InProgress",
              timestamp: order.inProgressDate,
              note: "Preparation started",
            },
          ]
        : []),
      ...(order.completedDate
        ? [
            {
              status: "Completed",
              timestamp: order.completedDate,
              note: "Order completed",
            },
          ]
        : []),
      ...(order.deliveredDate
        ? [
            {
              status: "Delivered",
              timestamp: order.deliveredDate,
              note: "Order delivered",
            },
          ]
        : []),
      ...(order.cancelledDate
        ? [
            {
              status: "Cancelled",
              timestamp: order.cancelledDate,
              note: `Order cancelled: ${
                order.cancellationReason || "No reason provided"
              }`,
            },
          ]
        : []),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      data: {
        order,
        assignedChef: delegation?.chef || null,
        delegationStatus: delegation?.status || null,
        orderHistory,
      },
    });
  } catch (err) {
    console.error("Get order details error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, estimatedDelivery } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const validStatuses = [
      "Pending",
      "Confirmed",
      "InProgress",
      "Completed",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate status transitions
    const currentStatus = order.orderStatus;
    const invalidTransitions = {
      Delivered: ["Pending", "Confirmed", "InProgress", "Completed"],
      Cancelled: [
        "Pending",
        "Confirmed",
        "InProgress",
        "Completed",
        "Delivered",
      ],
      Completed: ["Pending", "Confirmed"],
    };

    if (invalidTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`,
      });
    }

    // Prepare update data
    const updateData = { orderStatus: status };
    const now = new Date();

    // Set status-specific timestamps
    switch (status) {
      case "Confirmed":
        updateData.confirmedDate = now;

        // Auto-create delivery assignment when order is confirmed
        try {
          const result =
            await deliveryAssignmentService.createAssignmentFromOrder(id, {
              isFirstDelivery: await isFirstSubscriptionOrder(order),
              priority: order.priority || "normal",
              autoAssign: false, // Let admin or system assign later
            });

          if (result.success) {
            console.log(
              `✅ Delivery assignment created for order ${id}: ${result.confirmationCode}`
            );
          } else {
            console.warn(
              `⚠️ Failed to create delivery assignment for order ${id}: ${result.error}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error creating delivery assignment for order ${id}:`,
            error
          );
        }
        break;
      case "InProgress":
        updateData.inProgressDate = now;
        break;
      case "Completed":
        updateData.completedDate = now;
        break;
      case "Delivered":
        updateData.deliveredDate = now;
        break;
      case "Cancelled":
        updateData.cancelledDate = now;
        if (reason) updateData.cancellationReason = reason;
        break;
    }

    // Set estimated delivery if provided
    if (estimatedDelivery && ["Confirmed", "InProgress"].includes(status)) {
      updateData.estimatedDeliveryDate = new Date(estimatedDelivery);
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("customer", "fullName email")
      .populate("subscriptionId");

    // Handle subscription activation for first delivery
    if (status === "Delivered" && updatedOrder.subscriptionId) {
      const Subscription = require("../models/Subscription");
      const subscription = await Subscription.findById(
        updatedOrder.subscriptionId
      );

      if (subscription && !subscription.recurringDelivery?.isActivated) {
        // Activate subscription using the model method (recalculates end date)
        await subscription.activate();
        console.log(
          `🎯 Subscription ${subscription._id} activated by admin-marked delivery completion`
        );
      }
    }

    // Handle payment status for cancelled orders
    if (status === "Cancelled" && order.paymentStatus === "Paid") {
      // You might want to initiate refund process here
      console.log(`Order ${order.orderId} cancelled - refund may be required`);
    }

    // Update chef delegation status if applicable
    let chefInfo = null;
    if (status === "Completed" || status === "Cancelled") {
      const delegation = await OrderDelegation.findOneAndUpdate(
        { order: id },
        { status: status === "Completed" ? "Completed" : "Cancelled" }
      ).populate("chef", "fullName");
      chefInfo = delegation?.chef;
    }

    // Send comprehensive notifications to all parties
    try {
      const NotificationService = require("../services/notificationService");
      const notificationResult =
        await NotificationService.notifyAllPartiesOrderStatus(
          {
            orderId: updatedOrder._id,
            orderNumber: updatedOrder.orderNumber,
            customerId: updatedOrder.customer?._id,
            customerName: updatedOrder.customer?.fullName || "Customer",
            chefId: updatedOrder.assignedChef,
            chefName: chefInfo?.fullName || "Chef",
            totalAmount: updatedOrder.totalAmount,
            deliveryDate: updatedOrder.deliveryDate,
          },
          {
            oldStatus: currentStatus,
            newStatus: status,
          },
          {
            updatedBy: "Admin",
            reason: reason,
            estimatedDelivery: estimatedDelivery,
            timestamp: now,
          }
        );

      console.log(
        `Comprehensive notifications sent for order ${id} status change:`,
        {
          from: currentStatus,
          to: status,
          totalSent: notificationResult.totalNotificationsSent,
          success: notificationResult.success,
          errors: notificationResult.results.errors,
        }
      );
    } catch (notificationError) {
      console.error(
        "Failed to send status change notifications:",
        notificationError.message
      );
      // Don't fail the status update if notification fails
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
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

// Bulk update order status
exports.bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status, reason } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    const validStatuses = [
      "Pending",
      "Confirmed",
      "InProgress",
      "Completed",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    // Validate order IDs
    const validIds = orderIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length !== orderIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some order IDs are invalid",
      });
    }

    // Find existing orders
    const orders = await Order.find({ _id: { $in: validIds } });
    if (orders.length !== validIds.length) {
      return res.status(404).json({
        success: false,
        message: "Some orders not found",
      });
    }

    // Prepare update data
    const updateData = { orderStatus: status };
    const now = new Date();

    switch (status) {
      case "Confirmed":
        updateData.confirmedDate = now;
        break;
      case "InProgress":
        updateData.inProgressDate = now;
        break;
      case "Completed":
        updateData.completedDate = now;
        break;
      case "Delivered":
        updateData.deliveredDate = now;
        break;
      case "Cancelled":
        updateData.cancelledDate = now;
        if (reason) updateData.cancellationReason = reason;
        break;
    }

    // Update orders
    const result = await Order.updateMany(
      { _id: { $in: validIds } },
      updateData
    );

    // Update chef delegations if applicable
    if (status === "Completed" || status === "Cancelled") {
      await OrderDelegation.updateMany(
        { order: { $in: validIds } },
        { status: status === "Completed" ? "Completed" : "Cancelled" }
      );
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} orders updated to ${status}`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (err) {
    console.error("Bulk update order status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update order status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Cancel order with refund handling
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refundAmount, notifyCustomer = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id).populate(
      "customer",
      "fullName email"
    );
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (order.orderStatus === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered order",
      });
    }

    // Update order status
    const updateData = {
      orderStatus: "Cancelled",
      cancelledDate: new Date(),
      cancellationReason: reason || "Cancelled by admin",
    };

    // Handle refund if payment was made
    if (order.paymentStatus === "Paid") {
      updateData.refundAmount = refundAmount || order.totalAmount;
      updateData.refundStatus = "Pending";
      updateData.refundInitiatedDate = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // Cancel chef delegation
    await OrderDelegation.findOneAndUpdate(
      { order: id },
      { status: "Cancelled" }
    );

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order: updatedOrder,
        refundInitiated: order.paymentStatus === "Paid",
        refundAmount: updateData.refundAmount,
      },
    });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get order analytics
exports.getOrderAnalytics = async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    let dateRange = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateRange = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case "30d":
        dateRange = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateRange = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1y":
        dateRange = {
          $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    // Orders over time
    const ordersOverTime = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdDate" },
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$totalAmount", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Status distribution
    const statusDistribution = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Payment status distribution
    const paymentDistribution = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          amount: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Average order value
    const avgOrderValue = await Order.aggregate([
      { $match: { createdDate: dateRange, paymentStatus: "Paid" } },
      {
        $group: {
          _id: null,
          avgValue: { $avg: "$totalAmount" },
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        period,
        ordersOverTime,
        statusDistribution,
        paymentDistribution,
        averageOrderValue: avgOrderValue[0]?.avgValue || 0,
        totalRevenue: avgOrderValue[0]?.totalRevenue || 0,
        totalOrders: avgOrderValue[0]?.totalOrders || 0,
      },
    });
  } catch (err) {
    console.error("Get order analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update order (generic update method)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { ...updateData, updatedDate: new Date() },
      { new: true, runValidators: true }
    )
      .populate("customer", "fullName email")
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName planType",
        },
      });

    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Bulk update orders (generic bulk update method)
exports.bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, ...updateData } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    // Validate order IDs
    const validIds = orderIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length !== orderIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some order IDs are invalid",
      });
    }

    // Find existing orders
    const orders = await Order.find({ _id: { $in: validIds } });
    if (orders.length !== validIds.length) {
      return res.status(404).json({
        success: false,
        message: "Some orders not found",
      });
    }

    // Update orders
    const result = await Order.updateMany(
      { _id: { $in: validIds } },
      { ...updateData, updatedDate: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} orders updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (err) {
    console.error("Bulk update orders error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update orders",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Utility function to recalculate chef current capacity based on active orders
exports.recalculateChefCapacities = async (req, res) => {
  try {
    // Get all chefs
    const chefs = await Chef.find({ status: "Active" });

    const results = [];

    for (const chef of chefs) {
      // Count active orders (orders that are assigned but not completed/cancelled/delivered)
      const activeOrdersCount = await OrderDelegation.countDocuments({
        chef: chef._id,
        status: {
          $in: ["Assigned", "Pending", "Accepted", "In Progress", "Ready"],
        },
      });

      // Update chef's current capacity
      const oldCapacity = chef.currentCapacity;
      await Chef.findByIdAndUpdate(chef._id, {
        currentCapacity: activeOrdersCount,
      });

      results.push({
        chefId: chef._id,
        chefName: chef.fullName,
        oldCapacity: oldCapacity,
        newCapacity: activeOrdersCount,
        corrected: oldCapacity !== activeOrdersCount,
      });
    }

    const correctedChefs = results.filter((r) => r.corrected);

    res.json({
      success: true,
      message: "Chef capacities recalculated successfully",
      data: {
        totalChefs: results.length,
        correctedChefs: correctedChefs.length,
        details: results,
      },
    });
  } catch (err) {
    console.error("Recalculate chef capacities error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to recalculate chef capacities",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = exports;
