const Order = require("../models/Order");
const Customer = require("../models/Customer");
const MealPlan = require("../models/MealPlan");
const DriverAssignment = require("../models/DriverAssignment");
const OrderDelegation = require("../models/OrderDelegation");
const NotificationService = require("../services/notificationService");
const ratingPromptService = require("../services/ratingPromptService");

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    // Get orders that are NOT assigned to chefs or are completed/cancelled
    const orders = await Order.find({
      customer: req.user.id,
      $or: [
        { assignedChef: { $exists: false } },
        { assignedChef: null },
        { delegationStatus: { $in: ["Completed", "Cancelled"] } },
      ],
    })
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName price description coverImage planImageUrl image",
        },
      })
      .populate("customer", "fullName email phone")
      .populate("assignedChef", "fullName email chefId")
      .sort({ createdDate: -1 });

    console.log(`📋 Found ${orders.length} orders for user ${req.user.id}`);

    // Get OrderDelegation data for subscription orders
    const subscriptionIds = orders
      .filter((o) => o.subscription)
      .map((o) => o.subscription._id || o.subscription);

    let subscriptionDelegations = [];
    if (subscriptionIds.length > 0) {
      subscriptionDelegations = await OrderDelegation.find({
        subscriptionId: { $in: subscriptionIds },
      })
        .populate("chefId", "fullName email")
        .populate("driverId", "fullName phone")
        .lean();

      console.log(
        `📊 Found ${subscriptionDelegations.length} OrderDelegations for subscription orders`
      );
    }

    // Create a map for quick lookup
    const delegationMap = new Map();
    subscriptionDelegations.forEach((delegation) => {
      delegationMap.set(delegation.subscriptionId.toString(), delegation);
    });

    // Enhance orders with driver assignment data (including confirmation codes)
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const orderObj = order.toObject();

          // Check if this is a subscription order
          const isSubscriptionOrder =
            orderObj.subscription?._id || orderObj.subscription;

          if (isSubscriptionOrder) {
            // Enrich with OrderDelegation data for subscription orders
            const subId = (
              orderObj.subscription._id || orderObj.subscription
            ).toString();
            const delegation = delegationMap.get(subId);

            if (delegation) {
              // Override chef assignment from OrderDelegation
              orderObj.assignedChef = delegation.chefId || null;

              // Set delegationStatus based on chef assignment
              if (delegation.chefId) {
                // Chef is assigned - check daily timeline for more specific status
                if (
                  delegation.dailyTimeline &&
                  delegation.dailyTimeline.length > 0
                ) {
                  // Get the most recent/relevant timeline entry
                  const latestTimeline =
                    delegation.dailyTimeline[
                      delegation.dailyTimeline.length - 1
                    ];

                  if (latestTimeline.status === "delivered") {
                    orderObj.delegationStatus = "Delivered";
                  } else if (latestTimeline.status === "ready") {
                    orderObj.delegationStatus = "Ready";
                  } else {
                    orderObj.delegationStatus = "In Progress";
                  }
                } else {
                  orderObj.delegationStatus = "Assigned";
                }
              } else {
                orderObj.delegationStatus = "Not Assigned";
              }

              // Add driver info if assigned
              if (delegation.driverId) {
                orderObj.assignedDriver = delegation.driverId;
              }

              // Include dailyTimeline for frontend virtual order creation
              if (delegation.dailyTimeline) {
                orderObj.dailyTimeline = delegation.dailyTimeline;
              }

              console.log(
                `✓ Enriched subscription order ${orderObj.orderNumber}: chef=${
                  delegation.chefId ? "assigned" : "not assigned"
                }, status=${orderObj.delegationStatus}, days=${
                  delegation.dailyTimeline?.length || 0
                }`
              );
            }
          }

          // Find driver assignment(s) for this order
          if (isSubscriptionOrder && orderObj.dailyTimeline) {
            // For subscription orders, fetch all driver assignments and map them by subDayId
            const allAssignments = await DriverAssignment.find({
              orderId: order._id,
            })
              .populate("driverId", "fullName phone")
              .lean();

            // Create a map of subDayId -> assignment
            const assignmentMap = new Map();
            allAssignments.forEach((assignment) => {
              if (assignment.subscriptionInfo?.subDayId) {
                assignmentMap.set(assignment.subscriptionInfo.subDayId, {
                  _id: assignment._id,
                  confirmationCode: assignment.confirmationCode,
                  status: assignment.status,
                  driver: assignment.driverId,
                  pickupLocation: assignment.pickupLocation,
                  deliveryLocation: assignment.deliveryLocation,
                  estimatedPickupTime: assignment.estimatedPickupTime,
                  estimatedDeliveryTime: assignment.estimatedDeliveryTime,
                });
              }
            });

            // Add assignments to each day in dailyTimeline
            orderObj.dailyTimeline = orderObj.dailyTimeline.map((day) => ({
              ...day,
              driverAssignment: assignmentMap.get(day.subDayId) || null,
              confirmationCode:
                assignmentMap.get(day.subDayId)?.confirmationCode || null,
            }));

            console.log(
              `✓ Mapped ${allAssignments.length} driver assignments to subscription order ${orderObj.orderNumber}`
            );
          } else {
            // For regular orders, fetch single driver assignment
            const driverAssignment = await DriverAssignment.findOne({
              orderId: order._id,
            })
              .populate("driverId", "fullName phone")
              .lean();

            if (driverAssignment) {
              // Add driver assignment data to order
              orderObj.driverAssignment = {
                _id: driverAssignment._id,
                confirmationCode: driverAssignment.confirmationCode,
                status: driverAssignment.status,
                driver: driverAssignment.driverId,
                pickupLocation: driverAssignment.pickupLocation,
                deliveryLocation: driverAssignment.deliveryLocation,
                estimatedPickupTime: driverAssignment.estimatedPickupTime,
                estimatedDeliveryTime: driverAssignment.estimatedDeliveryTime,
              };

              // Also add confirmation code directly to order for easier access
              orderObj.confirmationCode = driverAssignment.confirmationCode;
            }
          }

          return orderObj;
        } catch (error) {
          console.error(`Error enhancing order ${order._id}:`, error);
          return order.toObject();
        }
      })
    );

    res.json({
      success: true,
      data: enhancedOrders,
      count: enhancedOrders.length,
    });
  } catch (err) {
    console.error("Get user orders error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get user's orders that are assigned to chefs (in progress)
exports.getUserAssignedOrders = async (req, res) => {
  try {
    // Get orders that are assigned to chefs and in progress
    const orders = await Order.find({
      customer: req.user.id,
      assignedChef: { $exists: true, $ne: null },
      delegationStatus: {
        $in: ["Assigned", "Accepted", "In Progress", "Ready"],
      },
    })
      .populate({
        path: "subscription",
        populate: {
          path: "mealPlanId",
          select: "planName price description coverImage planImageUrl image",
        },
      })
      .populate("customer", "fullName email phone")
      .populate("assignedChef", "fullName email chefId")
      .sort({ createdDate: -1 });

    console.log(
      `🍳 Found ${orders.length} assigned orders for user ${req.user.id}`
    );

    // Get OrderDelegation data for subscription orders
    const subscriptionIds = orders
      .filter((o) => o.subscription)
      .map((o) => o.subscription._id || o.subscription);

    let subscriptionDelegations = [];
    if (subscriptionIds.length > 0) {
      subscriptionDelegations = await OrderDelegation.find({
        subscriptionId: { $in: subscriptionIds },
      })
        .populate("chefId", "fullName email")
        .populate("driverId", "fullName phone")
        .lean();

      console.log(
        `📊 Found ${subscriptionDelegations.length} OrderDelegations for assigned subscription orders`
      );
    }

    // Create a map for quick lookup
    const delegationMap = new Map();
    subscriptionDelegations.forEach((delegation) => {
      delegationMap.set(delegation.subscriptionId.toString(), delegation);
    });

    // Enhance orders with driver assignment data (including confirmation codes)
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const orderObj = order.toObject();

          // Check if this is a subscription order
          const isSubscriptionOrder =
            orderObj.subscription?._id || orderObj.subscription;

          if (isSubscriptionOrder) {
            // Enrich with OrderDelegation data for subscription orders
            const subId = (
              orderObj.subscription._id || orderObj.subscription
            ).toString();
            const delegation = delegationMap.get(subId);

            if (delegation) {
              // Override chef assignment from OrderDelegation
              orderObj.assignedChef = delegation.chefId || null;

              // Set delegationStatus based on chef assignment
              if (delegation.chefId) {
                // Chef is assigned - check daily timeline for more specific status
                if (
                  delegation.dailyTimeline &&
                  delegation.dailyTimeline.length > 0
                ) {
                  // Get the most recent/relevant timeline entry
                  const latestTimeline =
                    delegation.dailyTimeline[
                      delegation.dailyTimeline.length - 1
                    ];

                  if (latestTimeline.status === "delivered") {
                    orderObj.delegationStatus = "Delivered";
                  } else if (latestTimeline.status === "ready") {
                    orderObj.delegationStatus = "Ready";
                  } else {
                    orderObj.delegationStatus = "In Progress";
                  }
                } else {
                  orderObj.delegationStatus = "Assigned";
                }
              } else {
                orderObj.delegationStatus = "Not Assigned";
              }

              // Add driver info if assigned
              if (delegation.driverId) {
                orderObj.assignedDriver = delegation.driverId;
              }

              // Include dailyTimeline for frontend virtual order creation
              if (delegation.dailyTimeline) {
                orderObj.dailyTimeline = delegation.dailyTimeline;
              }

              console.log(
                `✓ Enriched assigned subscription order ${
                  orderObj.orderNumber
                }: status=${orderObj.delegationStatus}, days=${
                  delegation.dailyTimeline?.length || 0
                }`
              );
            }
          }

          // Find driver assignment(s) for this order
          if (isSubscriptionOrder && orderObj.dailyTimeline) {
            // For subscription orders, fetch all driver assignments and map them by subDayId
            const allAssignments = await DriverAssignment.find({
              orderId: order._id,
            })
              .populate("driverId", "fullName phone")
              .lean();

            // Create a map of subDayId -> assignment
            const assignmentMap = new Map();
            allAssignments.forEach((assignment) => {
              if (assignment.subscriptionInfo?.subDayId) {
                assignmentMap.set(assignment.subscriptionInfo.subDayId, {
                  _id: assignment._id,
                  confirmationCode: assignment.confirmationCode,
                  status: assignment.status,
                  driver: assignment.driverId,
                  pickupLocation: assignment.pickupLocation,
                  deliveryLocation: assignment.deliveryLocation,
                  estimatedPickupTime: assignment.estimatedPickupTime,
                  estimatedDeliveryTime: assignment.estimatedDeliveryTime,
                });
              }
            });

            // Add assignments to each day in dailyTimeline
            orderObj.dailyTimeline = orderObj.dailyTimeline.map((day) => ({
              ...day,
              driverAssignment: assignmentMap.get(day.subDayId) || null,
              confirmationCode:
                assignmentMap.get(day.subDayId)?.confirmationCode || null,
            }));

            console.log(
              `✓ Mapped ${allAssignments.length} driver assignments to assigned subscription order ${orderObj.orderNumber}`
            );
          } else {
            // For regular orders, fetch single driver assignment
            const driverAssignment = await DriverAssignment.findOne({
              orderId: order._id,
            })
              .populate("driverId", "fullName phone")
              .lean();

            if (driverAssignment) {
              // Add driver assignment data to order
              orderObj.driverAssignment = {
                _id: driverAssignment._id,
                confirmationCode: driverAssignment.confirmationCode,
                status: driverAssignment.status,
                driver: driverAssignment.driverId,
                pickupLocation: driverAssignment.pickupLocation,
                deliveryLocation: driverAssignment.deliveryLocation,
                estimatedPickupTime: driverAssignment.estimatedPickupTime,
                estimatedDeliveryTime: driverAssignment.estimatedDeliveryTime,
              };

              // Also add confirmation code directly to order for easier access
              orderObj.confirmationCode = driverAssignment.confirmationCode;
            }
          }

          return orderObj;
        } catch (error) {
          console.error(`Error enhancing order ${order._id}:`, error);
          return order.toObject();
        }
      })
    );

    res.json({
      success: true,
      data: enhancedOrders,
      count: enhancedOrders.length,
    });
  } catch (err) {
    console.error("Get user assigned orders error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned orders",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      customer: req.user.id,
    })
      .populate("subscription")
      .populate("customer", "fullName email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Enhance order with driver assignment data (including confirmation code)
    try {
      const driverAssignment = await DriverAssignment.findOne({
        orderId: order._id,
      })
        .populate("driverId", "fullName phone")
        .lean();

      const orderObj = order.toObject();

      if (driverAssignment) {
        // Add driver assignment data to order
        orderObj.driverAssignment = {
          _id: driverAssignment._id,
          confirmationCode: driverAssignment.confirmationCode,
          status: driverAssignment.status,
          driver: driverAssignment.driverId,
          pickupLocation: driverAssignment.pickupLocation,
          deliveryLocation: driverAssignment.deliveryLocation,
          estimatedPickupTime: driverAssignment.estimatedPickupTime,
          estimatedDeliveryTime: driverAssignment.estimatedDeliveryTime,
        };

        // Also add confirmation code directly to order for easier access
        orderObj.confirmationCode = driverAssignment.confirmationCode;
      }

      res.json({
        success: true,
        data: orderObj,
      });
    } catch (error) {
      console.error(`Error enhancing order ${id}:`, error);
      res.json({
        success: true,
        data: order,
      });
    }
  } catch (err) {
    console.error("Get order by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const {
      subscription,
      orderItems,
      totalAmount,
      paymentMethod,
      paymentReference,
      deliveryAddress,
      deliveryDate,
      specialInstructions,
    } = req.body;

    // Validation
    if (!orderItems || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Order items, total amount, and payment method are required",
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      subscription,
      orderItems,
      totalAmount,
      paymentMethod,
      paymentReference,
      deliveryAddress: deliveryAddress || req.user.address,
      deliveryDate,
      specialInstructions,
      paymentStatus: "Pending",
    });

    // Update customer's total orders and spent
    await Customer.findByIdAndUpdate(req.user.id, {
      $inc: { totalOrders: 1, totalSpent: totalAmount },
    });

    // Send order confirmation notification
    try {
      await NotificationService.notifyOrderConfirmed(req.user.id, {
        orderId: order._id,
        totalAmount: totalAmount,
        deliveryDate: deliveryDate,
      });
    } catch (notificationError) {
      console.error("Failed to send order notification:", notificationError);
      // Don't fail the order creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      "deliveryAddress",
      "deliveryDate",
      "specialInstructions",
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    const order = await Order.findOneAndUpdate(
      { _id: id, customer: req.user.id },
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you do not have permission to update it",
      });
    }

    res.json({
      success: true,
      message: "Order updated successfully",
      data: order,
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

// Update order status (admin function, but keeping for completeness)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updates = {};
    if (status) updates.orderStatus = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    if (status === "Delivered") {
      updates.actualDelivery = new Date();
    }

    const order = await Order.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("subscription");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Handle first delivery completion and subscription activation
    if (status === "Delivered" && order.subscription) {
      const Subscription = require("../models/Subscription");
      const subscription = await Subscription.findById(order.subscription);

      if (subscription) {
        // Check if this is the first delivery
        const isFirstDelivery = !subscription.firstDeliveryCompleted;

        if (isFirstDelivery) {
          // Mark first delivery as completed
          subscription.firstDeliveryCompleted = true;
          subscription.firstDeliveryCompletedAt = new Date();
          subscription.firstDeliveryOrderId = order._id;
          subscription.actualStartDate = new Date();
          subscription.status = "active"; // Change from pending_first_delivery to active
          await subscription.save();

          console.log(
            `🎉 FIRST DELIVERY COMPLETED for subscription ${subscription._id}`
          );
          console.log(`   - Order: ${order._id}`);
          console.log(`   - Subscription now ACTIVE`);

          // Send notification to user
          try {
            const notificationService = require("../services/notificationService");
            await notificationService.sendNotification({
              userId: order.customer,
              title: "Your meal plan has started! 🎉",
              message: `Your first meal has been delivered. Enjoy your ${
                subscription.mealPlanId?.name || "meal plan"
              }!`,
              type: "first_delivery_completed",
              data: {
                subscriptionId: subscription._id,
                orderId: order._id,
              },
              priority: "high",
            });
          } catch (notifError) {
            console.error(
              "Error sending first delivery notification:",
              notifError
            );
          }
        } else if (!subscription.recurringDelivery?.isActivated) {
          // Activate subscription using the model method (recalculates end date)
          await subscription.activate();
          console.log(
            `🎯 Subscription ${subscription._id} activated by delivery completion`
          );
        }
      }
    }

    // Trigger rating prompt for completed orders
    if (status === "Delivered" && order.customer) {
      try {
        await ratingPromptService.triggerRatingPrompt({
          triggerType: "order_completion",
          userId: order.customer,
          relatedOrderId: order._id,
          triggerContext: {
            orderValue: order.total || order.amount || 0,
            isFirstOrder: false, // TODO: Calculate if this is user's first order
            isRecurringOrder: !!order.subscription,
            orderRating: order.customerRating, // Existing rating if any
          },
        });
        console.log(
          `🎯 Rating prompt triggered for order completion: ${order._id}`
        );
      } catch (error) {
        console.error(
          "Error triggering order completion rating prompt:",
          error
        );
        // Don't fail the order update if rating prompt fails
      }
    }

    // Trigger delivery completion prompt (separate from order completion)
    if (status === "Delivered" && order.customer) {
      try {
        await ratingPromptService.triggerRatingPrompt({
          triggerType: "delivery_completion",
          userId: order.customer,
          relatedOrderId: order._id,
          relatedDriverId: order.assignedDriver || order.driverId,
          triggerContext: {
            deliveryDate: order.actualDelivery || new Date(),
            wasOnTime: true, // TODO: Calculate if delivery was on time
            deliveryIssues: [], // TODO: Get delivery issues if any
            deliveryRating: order.deliveryRating, // Existing rating if any
          },
        });
        console.log(
          `🚚 Delivery rating prompt triggered for order: ${order._id}`
        );
      } catch (error) {
        console.error(
          "Error triggering delivery completion rating prompt:",
          error
        );
        // Don't fail the order update if rating prompt fails
      }
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

// Rate an order
exports.rateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        customer: req.user.id,
        orderStatus: "Delivered", // Only allow rating delivered orders
      },
      {
        customerRating: rating,
        customerFeedback: feedback,
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or cannot be rated",
      });
    }

    res.json({
      success: true,
      message: "Order rated successfully",
      data: order,
    });
  } catch (err) {
    console.error("Rate order error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to rate order",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
