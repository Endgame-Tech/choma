const DriverAssignment = require("../models/DriverAssignment");
const RecurringSubscription = require("../models/RecurringSubscription");
const SubscriptionDelivery = require("../models/SubscriptionDelivery");
const MealPlan = require("../models/MealPlan");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Driver = require("../models/Driver");
const mongoose = require("mongoose");

/**
 * Driver Subscription Management Controller
 * Clean architecture approach for driver-facing subscription delivery management
 * Handles all recurring delivery responsibilities and customer relationship management
 */
class DriverSubscriptionController {
  /**
   * Get driver's pickup assignments
   * Returns pending pickups from chefs when meals are ready
   */
  async getMyPickupAssignments(req, res) {
    try {
      const driverId = req.driver.id;

      console.log("📦 Getting pickup assignments for driver:", driverId);

      // Use the service layer
      const driverSubscriptionService = require("../services/driverSubscriptionService");
      const result = await driverSubscriptionService.getPickupAssignments(
        driverId
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: `Found ${result.data.totalAssignments} pickup assignments`,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Error getting pickup assignments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get pickup assignments",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Confirm pickup of meals from chef
   */
  async confirmPickup(req, res) {
    try {
      const driverId = req.driver.id;
      const { assignmentId, notes, location } = req.body;

      console.log("📦 Confirming pickup for assignment:", assignmentId);

      // Find the assignment
      const assignment = await DriverAssignment.findOne({
        _id: assignmentId,
        driverId,
        assignmentType: "subscription_pickup",
        status: "assigned",
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Pickup assignment not found or already picked up",
        });
      }

      // Update assignment status
      assignment.status = "picked_up";
      assignment.pickedUpAt = new Date();
      assignment.actualPickupTime = new Date();
      assignment.driverNotes = notes;

      if (location) {
        assignment.pickupLocation.actualCoordinates = {
          lat: location.lat,
          lng: location.lng,
        };
      }

      await assignment.save();

      // Notify customer that driver has picked up their meals
      await this.notifyCustomerPickupConfirmed(assignment);

      res.json({
        success: true,
        data: {
          assignment,
          message: "Pickup confirmed successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error confirming pickup:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm pickup",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Confirm delivery to customer with pickup code verification
   */
  async confirmDelivery(req, res) {
    try {
      const driverId = req.driver.id;
      const { assignmentId, pickupCode, notes, location } = req.body;

      console.log("📦 Confirming delivery for assignment:", assignmentId);

      // Find the assignment
      const assignment = await DriverAssignment.findOne({
        _id: assignmentId,
        driverId,
        assignmentType: "subscription_pickup",
        status: "picked_up",
      }).populate("customerId", "fullName phone");

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found or not in pickup state",
        });
      }

      // Verify pickup code for returning customers
      if (assignment.confirmationCode) {
        if (!pickupCode || pickupCode !== assignment.confirmationCode) {
          return res.status(400).json({
            success: false,
            message: "Invalid pickup code. Please verify with customer.",
          });
        }
      }

      // Update assignment status
      assignment.status = "delivered";
      assignment.deliveredAt = new Date();
      assignment.actualDeliveryTime = new Date();
      assignment.deliveryNotes = notes;

      if (location) {
        assignment.deliveryLocation.actualCoordinates = {
          lat: location.lat,
          lng: location.lng,
        };
      }

      await assignment.save();

      // Calculate earnings for this delivery
      const earnings = this.calculateDeliveryEarnings(assignment);

      // Update driver's daily earnings
      await this.updateDriverEarnings(driverId, earnings);

      // Notify customer of successful delivery
      await this.notifyCustomerDeliveryCompleted(assignment);

      res.json({
        success: true,
        data: {
          assignment,
          earnings,
          message: "Delivery confirmed successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error confirming delivery:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm delivery",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Notify customer that driver has picked up meals
   */
  async notifyCustomerPickupConfirmed(assignment) {
    try {
      const notificationService = require("../services/notificationService");
      const Customer = require("../models/Customer");

      const customer = await Customer.findById(assignment.customerId);
      if (!customer) return;

      const notification = {
        title: "🚚 Your meals are on the way!",
        body: "Driver has picked up your meals and is heading to you now.",
        data: {
          type: "pickup_confirmed",
          assignmentId: assignment._id.toString(),
          estimatedDeliveryTime: assignment.estimatedDeliveryTime,
        },
      };

      // Send push notification
      if (customer.deviceTokens && customer.deviceTokens.length > 0) {
        await notificationService.sendPushNotification(
          customer.deviceTokens,
          notification.title,
          notification.body,
          notification.data
        );
      }

      // Send SMS
      if (customer.phone) {
        const smsMessage = `Your meals are on the way! Expected delivery in ${Math.round(
          (new Date(assignment.estimatedDeliveryTime) - new Date()) /
            (1000 * 60)
        )} minutes.`;
        await notificationService.sendSMS(customer.phone, smsMessage);
      }
    } catch (error) {
      console.error("❌ Error notifying customer pickup confirmed:", error);
    }
  }

  /**
   * Notify customer of successful delivery
   */
  async notifyCustomerDeliveryCompleted(assignment) {
    try {
      const notificationService = require("../services/notificationService");
      const Customer = require("../models/Customer");

      const customer = await Customer.findById(assignment.customerId);
      if (!customer) return;

      const notification = {
        title: "✅ Delivery completed!",
        body: "Your meals have been delivered. Enjoy your meal!",
        data: {
          type: "delivery_completed",
          assignmentId: assignment._id.toString(),
        },
      };

      // Send push notification
      if (customer.deviceTokens && customer.deviceTokens.length > 0) {
        await notificationService.sendPushNotification(
          customer.deviceTokens,
          notification.title,
          notification.body,
          notification.data
        );
      }

      // Send SMS
      if (customer.phone) {
        const smsMessage = `Your meals have been delivered successfully! Enjoy your meal and thank you for choosing Choma.`;
        await notificationService.sendSMS(customer.phone, smsMessage);
      }
    } catch (error) {
      console.error("❌ Error notifying customer delivery completed:", error);
    }
  }

  /**
   * Calculate delivery earnings
   */
  calculateDeliveryEarnings(assignment) {
    const baseEarning = 500; // Base earning in Naira
    const distanceBonus = 0; // Could calculate based on distance
    const timeBonus = 0; // Could calculate based on delivery time

    return {
      base: baseEarning,
      distance: distanceBonus,
      time: timeBonus,
      total: baseEarning + distanceBonus + timeBonus,
    };
  }

  /**
   * Update driver's daily earnings
   */
  async updateDriverEarnings(driverId, earnings) {
    try {
      const Driver = require("../models/Driver");

      const driver = await Driver.findById(driverId);
      if (!driver) return;

      // Update earnings for today
      const today = new Date().toISOString().split("T")[0];

      if (!driver.earnings) {
        driver.earnings = { daily: {}, total: 0 };
      }

      if (!driver.earnings.daily[today]) {
        driver.earnings.daily[today] = 0;
      }

      driver.earnings.daily[today] += earnings.total;
      driver.earnings.total += earnings.total;

      await driver.save();
    } catch (error) {
      console.error("❌ Error updating driver earnings:", error);
    }
  }

  /**
   * Get driver's active subscription deliveries
   * Provides comprehensive view of all recurring delivery responsibilities
   */
  async getMySubscriptionDeliveries(req, res) {
    try {
      const driverId = req.driver.id;

      console.log("🚚 Getting subscription deliveries for driver:", driverId);

      // Validate driver exists
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Get active subscription-related assignments
      const subscriptionAssignments = await DriverAssignment.find({
        driverId,
        "subscriptionInfo.subscriptionId": { $exists: true },
        status: { $in: ["assigned", "picked_up"] },
      })
        .populate(
          "subscriptionInfo.subscriptionId",
          "status frequency nextDeliveryDate dietaryPreferences"
        )
        .populate(
          "subscriptionInfo.mealPlanId",
          "planName durationWeeks planDescription"
        )
        .populate("orderId", "customer orderNumber recurringOrder")
        .sort({ estimatedDeliveryTime: 1 })
        .lean();

      // Enrich with customer and subscription details
      const enrichedAssignments = await Promise.all(
        subscriptionAssignments.map(async (assignment) => {
          // Get customer details from order
          const Customer = require("../models/Customer");
          const customer = await Customer.findById(assignment.orderId.customer)
            .select("fullName phone email profilePicture preferences")
            .lean();

          // Get delivery history with this customer
          const deliveryHistory = await DriverAssignment.find({
            driverId,
            "subscriptionInfo.subscriptionId":
              assignment.subscriptionInfo.subscriptionId,
            status: "delivered",
          })
            .sort({ deliveredAt: -1 })
            .limit(5)
            .lean();

          // Calculate customer relationship metrics
          const totalDeliveries = deliveryHistory.length;
          const avgDeliveryTime =
            deliveryHistory.length > 0
              ? deliveryHistory.reduce((sum, h) => {
                  const deliveryTime =
                    new Date(h.deliveredAt) - new Date(h.estimatedDeliveryTime);
                  return sum + Math.max(0, deliveryTime);
                }, 0) /
                deliveryHistory.length /
                (1000 * 60) // Convert to minutes
              : 0;

          return {
            ...assignment,
            customerInfo: customer,
            deliveryHistory,
            relationshipMetrics: {
              totalDeliveries,
              avgDeliveryTime: Math.round(avgDeliveryTime),
              consistency:
                totalDeliveries > 0
                  ? Math.max(0, 100 - (avgDeliveryTime / 15) * 100)
                  : 100,
            },
          };
        })
      );

      // Group by subscription for better organization
      const subscriptionGroups = {};
      enrichedAssignments.forEach((assignment) => {
        const subId = assignment.subscriptionInfo.subscriptionId._id.toString();
        if (!subscriptionGroups[subId]) {
          subscriptionGroups[subId] = {
            subscriptionId: assignment.subscriptionInfo.subscriptionId,
            mealPlan: assignment.subscriptionInfo.mealPlanId,
            customer: assignment.customerInfo,
            assignments: [],
            totalDeliveries: 0,
            relationshipScore: 0,
          };
        }
        subscriptionGroups[subId].assignments.push(assignment);
        subscriptionGroups[subId].totalDeliveries +=
          assignment.relationshipMetrics.totalDeliveries;
        subscriptionGroups[subId].relationshipScore = Math.max(
          subscriptionGroups[subId].relationshipScore,
          assignment.relationshipMetrics.consistency
        );
      });

      res.json({
        success: true,
        data: {
          subscriptionGroups: Object.values(subscriptionGroups),
          summary: {
            totalActiveSubscriptions: Object.keys(subscriptionGroups).length,
            totalDeliveriesToday: enrichedAssignments.filter((a) => {
              const today = new Date().toDateString();
              return new Date(a.estimatedDeliveryTime).toDateString() === today;
            }).length,
            avgRelationshipScore: Math.round(
              Object.values(subscriptionGroups).reduce(
                (sum, g) => sum + g.relationshipScore,
                0
              ) / (Object.keys(subscriptionGroups).length || 1)
            ),
          },
        },
      });
    } catch (error) {
      console.error("❌ Get subscription deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription deliveries",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get weekly recurring delivery schedule
   * Optimized for route planning and recurring customer relationships
   */
  async getWeeklyDeliverySchedule(req, res) {
    try {
      const driverId = req.driver.id;
      const { startDate } = req.query;

      console.log("📅 Getting weekly delivery schedule for driver:", driverId);

      // Default to current week if no start date provided
      const weekStart = startDate ? new Date(startDate) : new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all delivery assignments for the week (including subscription and one-time)
      const weeklyDeliveries = await DriverAssignment.find({
        driverId,
        estimatedDeliveryTime: { $gte: weekStart, $lte: weekEnd },
      })
        .populate("subscriptionInfo.subscriptionId", "status frequency")
        .populate("subscriptionInfo.mealPlanId", "planName")
        .populate("orderId", "customer orderNumber recurringOrder")
        .sort({ estimatedDeliveryTime: 1 })
        .lean();

      // Group deliveries by day and identify route optimization opportunities
      const weeklySchedule = {};
      const routeOptimizations = new Map();

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];

        weeklySchedule[dateKey] = {
          date: dateKey,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          deliveries: [],
          subscriptionDeliveries: 0,
          oneTimeDeliveries: 0,
        };
      }

      // Organize deliveries and identify route optimizations
      for (const delivery of weeklyDeliveries) {
        const deliveryDate = new Date(delivery.estimatedDeliveryTime);
        const dateKey = deliveryDate.toISOString().split("T")[0];

        if (weeklySchedule[dateKey]) {
          // Enrich with customer info
          const Customer = require("../models/Customer");
          const customer = await Customer.findById(delivery.orderId.customer)
            .select("fullName phone")
            .lean();

          const enrichedDelivery = {
            ...delivery,
            customerInfo: customer,
            isSubscription: !!delivery.subscriptionInfo.subscriptionId,
          };

          weeklySchedule[dateKey].deliveries.push(enrichedDelivery);

          if (delivery.subscriptionInfo.subscriptionId) {
            weeklySchedule[dateKey].subscriptionDeliveries++;
          } else {
            weeklySchedule[dateKey].oneTimeDeliveries++;
          }

          // Track area clusters for route optimization
          const area = delivery.deliveryLocation.area;
          const areaKey = `${dateKey}_${area}`;
          if (!routeOptimizations.has(areaKey)) {
            routeOptimizations.set(areaKey, {
              date: dateKey,
              area,
              deliveries: [],
              estimatedTimeSaving: 0,
            });
          }
          routeOptimizations.get(areaKey).deliveries.push(enrichedDelivery);
        }
      }

      // Identify significant route optimizations (3+ deliveries in same area)
      const significantOptimizations = Array.from(routeOptimizations.values())
        .filter((opt) => opt.deliveries.length >= 3)
        .map((opt) => {
          // Calculate estimated time saving (20% reduction for area clustering)
          const avgDuration =
            opt.deliveries.reduce((sum, d) => sum + d.estimatedDuration, 0) /
            opt.deliveries.length;
          opt.estimatedTimeSaving = Math.round(
            avgDuration * opt.deliveries.length * 0.2
          );
          return opt;
        })
        .sort((a, b) => b.estimatedTimeSaving - a.estimatedTimeSaving);

      // Calculate weekly statistics
      const weeklyStats = {
        totalDeliveries: weeklyDeliveries.length,
        subscriptionDeliveries: weeklyDeliveries.filter(
          (d) => d.subscriptionInfo.subscriptionId
        ).length,
        oneTimeDeliveries: weeklyDeliveries.filter(
          (d) => !d.subscriptionInfo.subscriptionId
        ).length,
        uniqueCustomers: new Set(
          weeklyDeliveries.map((d) => d.orderId.customer)
        ).size,
        routeOptimizations: significantOptimizations.length,
        totalDistance: weeklyDeliveries.reduce(
          (sum, d) => sum + d.totalDistance,
          0
        ),
        totalEarnings: weeklyDeliveries.reduce(
          (sum, d) => sum + d.totalEarning,
          0
        ),
      };

      res.json({
        success: true,
        data: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          weeklySchedule: Object.values(weeklySchedule),
          routeOptimizations: significantOptimizations,
          statistics: weeklyStats,
        },
      });
    } catch (error) {
      console.error("❌ Get weekly delivery schedule error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch weekly delivery schedule",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get customer subscription timeline
   * Shows where customer is in their meal plan journey for better service
   */
  async getCustomerSubscriptionTimeline(req, res) {
    try {
      const driverId = req.driver.id;
      const { customerId, subscriptionId } = req.params;

      console.log("📋 Getting customer subscription timeline:", {
        customerId,
        subscriptionId,
      });

      // Validate driver has delivered to this customer
      const driverCustomerHistory = await DriverAssignment.findOne({
        driverId,
        orderId: { $exists: true },
        "subscriptionInfo.subscriptionId": subscriptionId,
      }).populate("orderId", "customer");

      if (!driverCustomerHistory) {
        return res.status(403).json({
          success: false,
          message: "Access denied - no delivery history with this customer",
        });
      }

      // Get subscription and meal plan details
      const subscription = await RecurringSubscription.findById(subscriptionId)
        .populate("customerId", "fullName email phone profilePicture")
        .populate("mealPlanId", "planName durationWeeks planDescription")
        .lean();

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Get meal plan structure
      const mealPlanStructure = await MealPlanAssignment.find({
        mealPlanId: subscription.mealPlanId._id,
      })
        .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 })
        .lean();

      // Get delivery history for this subscription
      const deliveryHistory = await DriverAssignment.find({
        "subscriptionInfo.subscriptionId": subscriptionId,
        status: { $in: ["assigned", "picked_up", "delivered"] },
      })
        .populate("driverId", "fullName")
        .sort({ estimatedDeliveryTime: 1 })
        .lean();

      // Build timeline with delivery information
      const timeline = mealPlanStructure.map((planMeal, index) => {
        // Find corresponding delivery
        const delivery = deliveryHistory.find(
          (d) => d.subscriptionInfo.deliveryDay === index + 1
        );

        return {
          stepNumber: index + 1,
          weekNumber: planMeal.weekNumber,
          dayOfWeek: planMeal.dayOfWeek,
          dayName: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][planMeal.dayOfWeek - 1],
          mealTime: planMeal.mealTime,
          mealTitle: planMeal.customTitle || "Meal Plan Item",
          mealDescription: planMeal.customDescription,
          isDelivered: delivery?.status === "delivered",
          isInProgress:
            delivery?.status &&
            ["assigned", "picked_up"].includes(delivery.status),
          isUpcoming: !delivery || delivery.status === "available",
          scheduledDeliveryTime: delivery?.estimatedDeliveryTime,
          actualDeliveryTime: delivery?.deliveredAt,
          deliveredBy: delivery?.driverId?.fullName,
          deliveryStatus: delivery?.status || "pending",
          isMyDelivery: delivery?.driverId?._id.toString() === driverId,
        };
      });

      // Calculate progression statistics
      const totalSteps = timeline.length;
      const deliveredSteps = timeline.filter((step) => step.isDelivered).length;
      const inProgressSteps = timeline.filter(
        (step) => step.isInProgress
      ).length;
      const myDeliveries = timeline.filter((step) => step.isMyDelivery).length;
      const progressPercentage =
        totalSteps > 0 ? Math.round((deliveredSteps / totalSteps) * 100) : 0;

      res.json({
        success: true,
        data: {
          subscription,
          timeline,
          progression: {
            totalSteps,
            deliveredSteps,
            inProgressSteps,
            progressPercentage,
            myDeliveries,
            relationshipStrength: Math.round(
              (myDeliveries / Math.max(deliveredSteps, 1)) * 100
            ),
          },
        },
      });
    } catch (error) {
      console.error("❌ Get customer subscription timeline error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch customer subscription timeline",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get driver subscription performance metrics
   * Provides insights into subscription delivery performance and customer relationships
   */
  async getSubscriptionMetrics(req, res) {
    try {
      const driverId = req.driver.id;
      const { period = "30d" } = req.query;

      console.log(
        "📊 Getting subscription metrics for driver:",
        driverId,
        "period:",
        period
      );

      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default: // 30d
          startDate.setDate(now.getDate() - 30);
      }

      // Aggregate subscription delivery metrics
      const metricsData = await DriverAssignment.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),
            assignedAt: { $gte: startDate },
            "subscriptionInfo.subscriptionId": { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            totalSubscriptionDeliveries: { $sum: 1 },
            deliveredSubscriptionOrders: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            totalSubscriptionEarnings: { $sum: "$totalEarning" },
            avgDeliveryTime: {
              $avg: {
                $cond: [
                  { $eq: ["$status", "delivered"] },
                  { $subtract: ["$deliveredAt", "$estimatedDeliveryTime"] },
                  null,
                ],
              },
            },
            uniqueSubscriptionCustomers: {
              $addToSet: "$subscriptionInfo.subscriptionId",
            },
          },
        },
      ]);

      // Get comparison with one-time deliveries
      const oneTimeMetrics = await DriverAssignment.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),
            assignedAt: { $gte: startDate },
            "subscriptionInfo.subscriptionId": { $exists: false },
          },
        },
        {
          $group: {
            _id: null,
            totalOneTimeDeliveries: { $sum: 1 },
            deliveredOneTimeOrders: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            totalOneTimeEarnings: { $sum: "$totalEarning" },
          },
        },
      ]);

      const subscriptionData = metricsData[0] || {
        totalSubscriptionDeliveries: 0,
        deliveredSubscriptionOrders: 0,
        totalSubscriptionEarnings: 0,
        avgDeliveryTime: 0,
        uniqueSubscriptionCustomers: [],
      };

      const oneTimeData = oneTimeMetrics[0] || {
        totalOneTimeDeliveries: 0,
        deliveredOneTimeOrders: 0,
        totalOneTimeEarnings: 0,
      };

      // Calculate derived metrics
      const subscriptionOnTimeRate =
        subscriptionData.totalSubscriptionDeliveries > 0
          ? Math.round(
              (subscriptionData.deliveredSubscriptionOrders /
                subscriptionData.totalSubscriptionDeliveries) *
                100
            )
          : 100;

      const oneTimeOnTimeRate =
        oneTimeData.totalOneTimeDeliveries > 0
          ? Math.round(
              (oneTimeData.deliveredOneTimeOrders /
                oneTimeData.totalOneTimeDeliveries) *
                100
            )
          : 100;

      const avgDeliveryTimeMinutes = subscriptionData.avgDeliveryTime
        ? Math.round(subscriptionData.avgDeliveryTime / (1000 * 60)) // Convert to minutes
        : 0;

      // Calculate insights
      const insights = {
        customerRetention:
          subscriptionData.uniqueSubscriptionCustomers.length > 5
            ? "excellent"
            : subscriptionData.uniqueSubscriptionCustomers.length > 2
            ? "good"
            : "developing",
        performanceVsOneTime:
          subscriptionOnTimeRate >= oneTimeOnTimeRate
            ? "better"
            : "needs_improvement",
        earningsComparison:
          subscriptionData.totalSubscriptionEarnings >=
          oneTimeData.totalOneTimeEarnings
            ? "higher"
            : "lower",
        strengths: [],
        improvementAreas: [],
        recommendations: [],
      };

      // Generate insights
      if (subscriptionOnTimeRate >= 95)
        insights.strengths.push("excellent_delivery_consistency");
      if (avgDeliveryTimeMinutes <= 5)
        insights.strengths.push("punctual_deliveries");
      if (subscriptionData.uniqueSubscriptionCustomers.length >= 10)
        insights.strengths.push("strong_customer_relationships");

      if (subscriptionOnTimeRate < 85)
        insights.improvementAreas.push("delivery_consistency");
      if (avgDeliveryTimeMinutes > 15)
        insights.improvementAreas.push("delivery_timing");

      // Generate recommendations
      insights.improvementAreas.forEach((area) => {
        switch (area) {
          case "delivery_consistency":
            insights.recommendations.push({
              category: "consistency",
              priority: "high",
              action:
                "Focus on route planning and time management for subscription deliveries",
              expectedImpact: "Improve customer satisfaction and retention",
            });
            break;
          case "delivery_timing":
            insights.recommendations.push({
              category: "timing",
              priority: "medium",
              action:
                "Use area clustering and route optimization for better time management",
              expectedImpact: "Reduce delivery delays by 10-15 minutes",
            });
            break;
        }
      });

      res.json({
        success: true,
        data: {
          period,
          metrics: {
            subscription: {
              totalDeliveries: subscriptionData.totalSubscriptionDeliveries,
              deliveredOrders: subscriptionData.deliveredSubscriptionOrders,
              onTimeRate: subscriptionOnTimeRate,
              totalEarnings: subscriptionData.totalSubscriptionEarnings,
              avgDeliveryTimeMinutes,
              uniqueCustomers:
                subscriptionData.uniqueSubscriptionCustomers.length,
            },
            oneTime: {
              totalDeliveries: oneTimeData.totalOneTimeDeliveries,
              deliveredOrders: oneTimeData.deliveredOneTimeOrders,
              onTimeRate: oneTimeOnTimeRate,
              totalEarnings: oneTimeData.totalOneTimeEarnings,
            },
            comparison: {
              subscriptionEarningsPercentage: Math.round(
                (subscriptionData.totalSubscriptionEarnings /
                  Math.max(
                    subscriptionData.totalSubscriptionEarnings +
                      oneTimeData.totalOneTimeEarnings,
                    1
                  )) *
                  100
              ),
              subscriptionDeliveryPercentage: Math.round(
                (subscriptionData.totalSubscriptionDeliveries /
                  Math.max(
                    subscriptionData.totalSubscriptionDeliveries +
                      oneTimeData.totalOneTimeDeliveries,
                    1
                  )) *
                  100
              ),
            },
          },
          insights,
        },
      });
    } catch (error) {
      console.error("❌ Get subscription metrics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription metrics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update delivery status with subscription context
   * Handles subscription-specific status updates and customer communication
   */
  async updateDeliveryStatus(req, res) {
    try {
      const driverId = req.driver.id;
      const { assignmentId, status, notes } = req.body;

      console.log("📦 Updating delivery status:", {
        assignmentId,
        status,
        driverId,
      });

      // Get and validate assignment
      const assignment = await DriverAssignment.findOne({
        _id: assignmentId,
        driverId,
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Delivery assignment not found",
        });
      }

      // Update status with subscription context
      const oldStatus = assignment.status;
      assignment.status = status;

      if (notes) {
        assignment.specialInstructions = notes;
      }

      // Handle subscription-specific status updates
      if (assignment.subscriptionInfo.subscriptionId) {
        // For subscription deliveries, track additional metrics
        switch (status) {
          case "picked_up":
            assignment.pickedUpAt = new Date();
            // Call confirmPickup method to update OrderDelegation dailyTimeline
            await assignment.confirmPickup();
            console.log(
              "✅ Called confirmPickup() to update OrderDelegation timeline"
            );
            break;
          case "delivered":
            assignment.deliveredAt = new Date();
            // This will trigger the existing confirmDelivery logic in the model
            break;
        }
      }

      // Save if not already saved by confirmPickup
      if (
        status !== "picked_up" ||
        !assignment.subscriptionInfo.subscriptionId
      ) {
        await assignment.save();
      }

      // Send appropriate notifications for subscription deliveries
      if (
        assignment.subscriptionInfo.subscriptionId &&
        status === "delivered"
      ) {
        // Additional subscription-specific delivery confirmation
        console.log("🔔 Sending subscription delivery confirmation");
      }

      res.json({
        success: true,
        data: {
          assignmentId,
          oldStatus,
          newStatus: status,
          isSubscriptionDelivery: !!assignment.subscriptionInfo.subscriptionId,
          message: `Delivery status updated to ${status}`,
        },
      });
    } catch (error) {
      console.error("❌ Update delivery status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update delivery status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = new DriverSubscriptionController();
