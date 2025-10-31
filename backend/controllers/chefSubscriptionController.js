const SubscriptionChefAssignment = require("../models/SubscriptionChefAssignment");
const Subscription = require("../models/Subscription");
const MealAssignment = require("../models/MealAssignment");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Chef = require("../models/Chef");
const Order = require("../models/Order");
const mongoose = require("mongoose");

/**
 * Chef Subscription Management Controller
 * Clean architecture approach with proper separation of concerns
 * Handles all chef-facing subscription management operations
 */
class ChefSubscriptionController {
  /**
   * Get chef's active subscription assignments
   * Provides comprehensive view of all recurring cooking responsibilities
   * REFACTORED: Queries from Subscription schema directly for more robust data
   */
  async getMySubscriptionAssignments(req, res) {
    try {
      const chefId = req.chef.chefId;

      console.log("🔍 Getting subscription assignments for chef:", chefId);

      // Validate chef exists
      const chef = await Chef.findById(chefId);
      if (!chef) {
        return res.status(404).json({
          success: false,
          message: "Chef not found",
        });
      }

      // Get chef assignment records to find which subscriptions this chef is assigned to
      const chefAssignments = await SubscriptionChefAssignment.find({
        chefId,
        assignmentStatus: "active",
        endDate: { $gte: new Date() },
      })
        .select("subscriptionId assignedAt performance")
        .lean();

      if (chefAssignments.length === 0) {
        return res.json({
          success: true,
          data: {
            assignments: [],
            totalActive: 0,
            todaysMealCount: 0,
            weeklyMealCount: 0,
          },
        });
      }

      const subscriptionIds = chefAssignments.map((a) => a.subscriptionId);

      // Query subscriptions directly - this is the primary source of truth
      // Use regex for case-insensitive status matching (handles both "Active" and "active")
      const subscriptions = await Subscription.find({
        _id: { $in: subscriptionIds },
        status: {
          $in: [/^active$/i, /^pending$/i, /^pending_first_delivery$/i],
        },
      })
        .populate("customerId", "fullName phone email profileImage")
        .populate("userId", "fullName phone email profileImage")
        .populate(
          "mealPlanId",
          "planName durationWeeks planDescription mealsPerDay"
        )
        .sort({ createdAt: -1 })
        .lean();

      // Enrich subscriptions with today's meals from mealPlanSnapshot
      const enrichedAssignments = subscriptions.map((subscription) => {
        // Find corresponding chef assignment for performance metrics
        const chefAssignment = chefAssignments.find(
          (a) => a.subscriptionId.toString() === subscription._id.toString()
        );

        // Extract today's meals from mealPlanSnapshot
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const todaysMeals =
          subscription.mealPlanSnapshot?.mealSchedule
            ?.filter((meal) => {
              // Skip meals without valid scheduled date
              if (!meal.scheduledDate) return false;

              const mealDate = new Date(meal.scheduledDate);
              // Check if date is valid
              if (isNaN(mealDate.getTime())) return false;

              mealDate.setHours(0, 0, 0, 0);
              const mealDateStr = mealDate.toISOString().split("T")[0];
              return (
                mealDateStr === todayStr &&
                !["delivered", "cancelled", "skipped"].includes(
                  meal.deliveryStatus
                )
              );
            })
            .map((meal) => ({
              _id: meal._id,
              mealTitle: meal.mealTitle,
              mealType: meal.mealType,
              scheduledDate: meal.scheduledDate,
              scheduledTimeSlot: meal.timeSlot,
              status: meal.deliveryStatus || "scheduled",
              ingredients: meal.ingredients || [],
            })) || [];

        // Get upcoming week's meals
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);

        const upcomingMeals =
          subscription.mealPlanSnapshot?.mealSchedule
            ?.filter((meal) => {
              // Skip meals without valid scheduled date
              if (!meal.scheduledDate) return false;

              const mealDate = new Date(meal.scheduledDate);
              // Check if date is valid
              if (isNaN(mealDate.getTime())) return false;

              return mealDate >= today && mealDate <= weekEnd;
            })
            .sort((a, b) => {
              const dateA = new Date(a.scheduledDate);
              const dateB = new Date(b.scheduledDate);
              return dateA - dateB;
            })
            .slice(0, 7)
            .map((meal) => ({
              _id: meal._id,
              mealTitle: meal.mealTitle,
              mealType: meal.mealType,
              scheduledDate: meal.scheduledDate,
              scheduledTimeSlot: meal.timeSlot,
              status: meal.deliveryStatus || "scheduled",
            })) || [];

        // Calculate performance metrics
        const totalDeliveries =
          chefAssignment?.performance?.totalDeliveries || 0;
        const onTimeDeliveries =
          chefAssignment?.performance?.onTimeDeliveries || 0;
        const avgRating = chefAssignment?.performance?.averageRating || 0;

        return {
          _id: subscription._id,
          subscriptionId: subscription,
          customerId: subscription.customerId || subscription.userId,
          mealPlanId: subscription.mealPlanId,
          assignedAt: chefAssignment?.assignedAt || subscription.createdAt,
          todaysMeals,
          upcomingMeals,
          metrics: {
            totalDeliveries,
            onTimeRate:
              totalDeliveries > 0
                ? Math.round((onTimeDeliveries / totalDeliveries) * 100)
                : 100,
            avgRating: Math.round(avgRating * 10) / 10,
            consistencyScore:
              chefAssignment?.performance?.consistencyScore || 100,
          },
        };
      });

      res.json({
        success: true,
        data: {
          assignments: enrichedAssignments,
          totalActive: enrichedAssignments.length,
          todaysMealCount: enrichedAssignments.reduce(
            (sum, a) => sum + (a.todaysMeals?.length || 0),
            0
          ),
          weeklyMealCount: enrichedAssignments.reduce(
            (sum, a) => sum + (a.upcomingMeals?.length || 0),
            0
          ),
          summary: {
            totalActiveSubscriptions: enrichedAssignments.length,
            totalTodaysMeals: enrichedAssignments.reduce(
              (sum, a) => sum + (a.todaysMeals?.length || 0),
              0
            ),
            avgPerformanceScore:
              enrichedAssignments.length > 0
                ? Math.round(
                    enrichedAssignments.reduce(
                      (sum, a) => sum + a.metrics.consistencyScore,
                      0
                    ) / enrichedAssignments.length
                  )
                : 100,
          },
        },
      });
    } catch (error) {
      console.error("❌ Get subscription assignments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription assignments",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get weekly meal planning view
   * Optimized for batch preparation and weekly planning
   */
  async getWeeklyMealPlan(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { startDate } = req.query;

      console.log("🗓️ Getting weekly meal plan for chef:", chefId);

      // Default to current week if no start date provided
      const weekStart = startDate ? new Date(startDate) : new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all meal assignments for the week
      const weeklyMeals = await MealAssignment.find({
        assignedChef: chefId,
        scheduledDate: { $gte: weekStart, $lte: weekEnd },
      })
        .populate("subscriptionId", "status frequency deliverySchedule")
        .populate("mealPlanAssignmentId")
        .sort({ scheduledDate: 1, "scheduledTimeSlot.start": 1 })
        .lean();

      // Group meals by day and identify batch preparation opportunities
      const weeklyPlan = {};
      const batchOpportunities = new Map();

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];

        weeklyPlan[dateKey] = {
          date: dateKey,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          meals: [],
        };
      }

      // Organize meals and identify batch opportunities
      weeklyMeals.forEach((meal) => {
        const mealDate = new Date(meal.scheduledDate);
        const dateKey = mealDate.toISOString().split("T")[0];

        if (weeklyPlan[dateKey]) {
          weeklyPlan[dateKey].meals.push(meal);
        }

        // Track similar meals for batch preparation
        if (meal.mealTitle) {
          const mealKey = meal.mealTitle.toLowerCase();
          if (!batchOpportunities.has(mealKey)) {
            batchOpportunities.set(mealKey, []);
          }
          batchOpportunities.get(mealKey).push(meal);
        }
      });

      // Identify significant batch opportunities (3+ similar meals)
      const significantBatchOpportunities = Array.from(
        batchOpportunities.entries()
      )
        .filter(([_, meals]) => meals.length >= 3)
        .map(([mealName, meals]) => ({
          mealName,
          count: meals.length,
          meals: meals.map((m) => ({
            assignmentId: m._id,
            scheduledDate: m.scheduledDate,
            subscriptionId: m.subscriptionId._id,
            status: m.status,
          })),
          estimatedTimeSaving: Math.floor(meals.length * 0.3 * 60), // 30% time saving in minutes
        }));

      // Calculate weekly statistics
      const weeklyStats = {
        totalMeals: weeklyMeals.length,
        mealsByStatus: weeklyMeals.reduce((acc, meal) => {
          acc[meal.status] = (acc[meal.status] || 0) + 1;
          return acc;
        }, {}),
        uniqueSubscriptions: new Set(
          weeklyMeals.map((m) => m.subscriptionId._id)
        ).size,
        batchOpportunities: significantBatchOpportunities.length,
      };

      res.json({
        success: true,
        data: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          weeklyPlan: Object.values(weeklyPlan),
          batchOpportunities: significantBatchOpportunities,
          statistics: weeklyStats,
        },
      });
    } catch (error) {
      console.error("❌ Get weekly meal plan error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch weekly meal plan",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get subscription timeline and progression
   * Shows where customer is in their meal plan journey
   */
  async getSubscriptionTimeline(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionId } = req.params;

      // Validate subscription assignment
      const assignment = await SubscriptionChefAssignment.findOne({
        subscriptionId,
        chefId,
        assignmentStatus: "active",
      })
        .populate("subscriptionId")
        .populate("mealPlanId")
        .populate("customerId", "fullName email phone");

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Subscription assignment not found",
        });
      }

      const subscription = assignment.subscriptionId;

      // Check if subscription has meal plan snapshot
      if (
        !subscription.mealPlanSnapshot ||
        !subscription.mealPlanSnapshot.mealSchedule
      ) {
        return res.status(400).json({
          success: false,
          message: "No meal schedule found for this subscription",
        });
      }

      // Build timeline from mealPlanSnapshot.mealSchedule
      const timeline = subscription.mealPlanSnapshot.mealSchedule.map(
        (slot, index) => {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];

          return {
            stepNumber: index + 1,
            weekNumber: slot.weekNumber,
            dayOfWeek: slot.dayOfWeek,
            dayName: dayNames[slot.dayOfWeek - 1] || slot.dayName,
            mealTime: slot.mealTime,
            mealTitle: slot.meals?.[0]?.name || "Meal Plan Item",
            mealDescription: slot.meals?.[0]?.description || "",
            isCompleted: slot.deliveryStatus === "delivered",
            isInProgress:
              slot.deliveryStatus &&
              [
                "chef_assigned",
                "preparing",
                "prepared",
                "ready",
                "out_for_delivery",
              ].includes(slot.deliveryStatus),
            isUpcoming:
              !slot.deliveryStatus || slot.deliveryStatus === "scheduled",
            scheduledDate: slot.scheduledDeliveryDate,
            actualDate: slot.actualDeliveryTime,
            status: slot.deliveryStatus || "scheduled",
          };
        }
      );

      // Calculate progression statistics
      const totalSteps = timeline.length;
      const completedSteps = timeline.filter((step) => step.isCompleted).length;
      const inProgressSteps = timeline.filter(
        (step) => step.isInProgress
      ).length;
      const progressPercentage =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Identify current phase
      let currentPhase = "Not Started";
      if (completedSteps > 0) {
        if (completedSteps === totalSteps) {
          currentPhase = "Completed";
        } else if (inProgressSteps > 0) {
          currentPhase = "In Progress";
        } else {
          currentPhase = "Active";
        }
      }

      res.json({
        success: true,
        data: {
          subscription: assignment.subscriptionId,
          customer: assignment.customerId,
          mealPlan: assignment.mealPlanId,
          timeline,
          progression: {
            totalSteps,
            completedSteps,
            inProgressSteps,
            progressPercentage,
            currentPhase,
            estimatedCompletion: assignment.endDate,
          },
        },
      });
    } catch (error) {
      console.error("❌ Get subscription timeline error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription timeline",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update meal assignment status
   * Handles batch status updates for efficient workflow management
   */
  async updateMealStatus(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { assignmentIds, status, notes } = req.body;

      // Validate required fields
      if (
        !assignmentIds ||
        !Array.isArray(assignmentIds) ||
        assignmentIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Assignment IDs array is required",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      // Validate status
      const validStatuses = [
        "chef_assigned",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status provided",
        });
      }

      // Get and validate assignments belong to this chef
      const assignments = await MealAssignment.find({
        _id: { $in: assignmentIds },
        assignedChef: chefId,
      });

      if (assignments.length !== assignmentIds.length) {
        return res.status(403).json({
          success: false,
          message: "Some assignments not found or do not belong to this chef",
        });
      }

      // Perform batch update
      const updateData = {
        status,
        ...(notes && { chefNotes: notes }),
        [`${status}At`]: new Date(), // Dynamic field like 'preparingAt', 'readyAt', etc.
      };

      // Add status to history for tracking
      const statusHistoryEntry = {
        status,
        timestamp: new Date(),
        updatedBy: chefId,
        notes,
      };

      const result = await MealAssignment.updateMany(
        { _id: { $in: assignmentIds } },
        {
          $set: updateData,
          $push: { statusHistory: statusHistoryEntry },
        }
      );

      // Update chef performance metrics for completed deliveries
      if (status === "delivered") {
        // Update SubscriptionChefAssignment performance metrics
        for (const assignment of assignments) {
          await this.updateChefPerformanceMetrics(
            chefId,
            assignment.subscriptionId,
            {
              delivered: true,
              onTime: true, // You might want to calculate this based on scheduled vs actual time
            }
          );
        }
      }

      res.json({
        success: true,
        data: {
          updatedCount: result.modifiedCount,
          status,
          message: `Successfully updated ${result.modifiedCount} meal assignments to ${status}`,
        },
      });
    } catch (error) {
      console.error("❌ Update meal status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update meal status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get chef subscription performance metrics
   * Provides insights into subscription-specific performance
   */
  async getSubscriptionMetrics(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { period = "30d" } = req.query;

      console.log(
        "📊 Getting subscription metrics for chef:",
        chefId,
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

      // Aggregate subscription metrics from the database
      const metricsData = await SubscriptionChefAssignment.aggregate([
        {
          $match: {
            chefId: new mongoose.Types.ObjectId(chefId),
            assignedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ["$assignmentStatus", "active"] }, 1, 0] },
            },
            totalDeliveries: {
              $sum: { $ifNull: ["$performance.totalDeliveries", 0] },
            },
            onTimeDeliveries: {
              $sum: { $ifNull: ["$performance.onTimeDeliveries", 0] },
            },
            totalEarnings: {
              $sum: { $ifNull: ["$earnings.totalEarnings", 0] },
            },
            avgRating: { $avg: { $ifNull: ["$performance.averageRating", 0] } },
            avgConsistencyScore: {
              $avg: { $ifNull: ["$performance.consistencyScore", 100] },
            },
          },
        },
      ]);

      const metrics = metricsData[0] || {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalDeliveries: 0,
        onTimeDeliveries: 0,
        totalEarnings: 0,
        avgRating: 0,
        avgConsistencyScore: 100,
      };

      // Calculate derived metrics
      const onTimeRate =
        metrics.totalDeliveries > 0
          ? Math.round(
              (metrics.onTimeDeliveries / metrics.totalDeliveries) * 100
            )
          : 100;

      // Use service layer to get insights
      const chefSubscriptionService = require("../services/chefSubscriptionService");
      const performanceAnalysis =
        await chefSubscriptionService.analyzeSubscriptionPerformance(
          chefId,
          period
        );

      res.json({
        success: true,
        data: {
          period,
          metrics: {
            totalSubscriptions: metrics.totalSubscriptions,
            activeSubscriptions: metrics.activeSubscriptions,
            totalMealsDelivered: metrics.totalDeliveries,
            totalOnTimeMeals: metrics.onTimeDeliveries,
            avgPreparationTime: 45, // Would need to track actual prep times
            avgRating: Math.round(metrics.avgRating * 10) / 10,
            totalEarnings: metrics.totalEarnings,
            avgConsistencyScore: Math.round(metrics.avgConsistencyScore),
          },
          insights: performanceAnalysis.insights,
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
   * Get available batch preparation opportunities
   */
  async getBatchOpportunities(req, res) {
    try {
      const chefId = req.chef.chefId;

      console.log("🥘 Getting batch opportunities for chef:", chefId);

      // Use the service layer to identify batch opportunities
      const chefSubscriptionService = require("../services/chefSubscriptionService");
      const batchData =
        await chefSubscriptionService.identifyBatchOpportunities(chefId);

      res.json({
        success: true,
        data: batchData,
      });
    } catch (error) {
      console.error("❌ Get batch opportunities error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch batch opportunities",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get currently active batch preparations
   */
  async getActiveBatches(req, res) {
    try {
      const chefId = req.chef.chefId;

      // For now, return empty array - this would be stored in a BatchPreparation model
      res.json({
        success: true,
        data: [],
      });
    } catch (error) {
      console.error("❌ Get active batches error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active batches",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Start a batch preparation
   */
  async startBatchPreparation(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { batchId } = req.params;

      // This would involve creating a batch preparation record and updating meal statuses
      res.json({
        success: true,
        data: {
          batchId,
          status: "started",
          startedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("❌ Start batch preparation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start batch preparation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Complete a batch preparation
   */
  async completeBatchPreparation(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { batchId } = req.params;

      res.json({
        success: true,
        data: {
          batchId,
          status: "completed",
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("❌ Complete batch preparation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete batch preparation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Cancel a batch preparation
   */
  async cancelBatchPreparation(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { batchId } = req.params;

      res.json({
        success: true,
        data: {
          batchId,
          status: "cancelled",
          cancelledAt: new Date(),
        },
      });
    } catch (error) {
      console.error("❌ Cancel batch preparation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel batch preparation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Send customer communication about subscription
   */
  async sendCustomerCommunication(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionId } = req.params;
      const { messageType, content } = req.body;

      const chefSubscriptionService = require("../services/chefSubscriptionService");

      const result =
        await chefSubscriptionService.facilitateSubscriptionCommunication(
          chefId,
          subscriptionId,
          messageType,
          content
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Send customer communication error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send customer communication",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update all meals for a specific day in a subscription
   * Allows chef to bulk update status for all meals scheduled on a particular date
   */
  async updateDailyMealsStatus(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionId } = req.params;
      const { date, status, notes } = req.body;

      console.log("📅 Updating daily meals:", {
        chefId,
        subscriptionId,
        date,
        status,
      });

      // Validate chef is assigned to this subscription
      const chefAssignment = await SubscriptionChefAssignment.findOne({
        chefId,
        subscriptionId,
        assignmentStatus: "active",
      });

      if (!chefAssignment) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this subscription",
        });
      }

      // Get the subscription
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (!subscription.mealPlanSnapshot?.mealSchedule) {
        return res.status(400).json({
          success: false,
          message: "No meal schedule found for this subscription",
        });
      }

      // Parse the target date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Find all meals for this date
      let updatedCount = 0;
      const updatedMeals = [];
      const fullMealSlots = []; // Store full meal slot objects for order creation

      subscription.mealPlanSnapshot.mealSchedule.forEach((meal) => {
        if (!meal.scheduledDeliveryDate) return;

        const mealDate = new Date(meal.scheduledDeliveryDate);
        if (isNaN(mealDate.getTime())) return;

        mealDate.setHours(0, 0, 0, 0);
        const mealDateStr = mealDate.toISOString().split("T")[0];

        // If meal is on target date, update its status
        if (mealDateStr === targetDateStr) {
          // Validate status transition before updating
          const currentStatus = meal.deliveryStatus || "scheduled";
          const isValidTransition = this.isValidStatusTransition(
            currentStatus,
            status
          );

          if (!isValidTransition) {
            console.warn(
              `⚠️ Skipping ${meal.mealTime} - Invalid transition from ${currentStatus} to ${status}`
            );
            return; // Skip this meal
          }

          meal.deliveryStatus = status;

          // Update delivered timestamp if status is delivered
          if (status === "delivered") {
            meal.deliveredAt = new Date();
          }

          // Add notes if provided
          if (notes) {
            meal.notes = notes;
          }

          updatedCount++;
          updatedMeals.push({
            mealTitle: meal.mealTitle,
            mealType: meal.mealType,
            status: meal.deliveryStatus,
          });

          // Store the full meal slot for order creation
          fullMealSlots.push(meal);
        }
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          message: `No meals found for date: ${targetDateStr}`,
        });
      }

      // Save the subscription with updated meal statuses
      // Use validateModifiedOnly to avoid validating unchanged fields like subscription.status
      await subscription.save({ validateModifiedOnly: true });

      // Update subscription metrics if all meals delivered
      if (status === "delivered") {
        subscription.metrics.totalMealsDelivered += updatedCount;
        await subscription.save({ validateModifiedOnly: true });

        // Update chef performance metrics
        await this.updateChefPerformanceMetrics(chefId, subscriptionId, {
          mealsDelivered: updatedCount,
          onTime: true,
        });
      }

      console.log(`✅ Updated ${updatedCount} meals for ${targetDateStr}`);

      // Update delivery order to reflect meal preparation progress
      const allMealsReady = status === "ready" && updatedCount > 0;

      try {
        await this.updateDeliveryOrderForDay(
          subscription,
          targetDateStr,
          fullMealSlots,
          chefId,
          allMealsReady
        );
      } catch (orderError) {
        console.error("❌ Failed to update delivery order:", orderError);
        // Don't fail the main request if order update fails
      }

      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} meal(s) for ${targetDateStr}`,
        data: {
          date: targetDateStr,
          updatedCount,
          status,
          updatedMeals,
        },
      });
    } catch (error) {
      console.error("❌ Update daily meals status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update daily meals status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Private helper method to update chef performance metrics
   */
  async updateChefPerformanceMetrics(chefId, subscriptionId, deliveryData) {
    try {
      const assignment = await SubscriptionChefAssignment.findOne({
        chefId,
        subscriptionId,
        assignmentStatus: "active",
      });

      if (assignment) {
        await assignment.updatePerformanceMetrics(deliveryData);
      }
    } catch (error) {
      console.error("❌ Error updating chef performance metrics:", error);
    }
  }

  /**
   * Update status for a SPECIFIC meal type on a SPECIFIC day
   * Allows chef to update breakfast, lunch, dinner independently
   * Validates status transitions and checks if all meals ready for delivery
   */
  async updateMealTypeStatus(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionId } = req.params;
      const { date, mealType, status, notes } = req.body;

      console.log("🍳 Updating individual meal type:", {
        chefId,
        subscriptionId,
        date,
        mealType,
        status,
      });

      // Validate chef is assigned to this subscription
      const chefAssignment = await SubscriptionChefAssignment.findOne({
        chefId,
        subscriptionId,
        assignmentStatus: "active",
      });

      if (!chefAssignment) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this subscription",
        });
      }

      // Get the subscription
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (!subscription.mealPlanSnapshot?.mealSchedule) {
        return res.status(400).json({
          success: false,
          message: "No meal schedule found for this subscription",
        });
      }

      // Parse the target date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Find the SPECIFIC meal slot (date + mealType)
      const targetSlot = subscription.mealPlanSnapshot.mealSchedule.find(
        (slot) => {
          if (!slot.scheduledDeliveryDate) return false;

          const slotDate = new Date(slot.scheduledDeliveryDate);
          if (isNaN(slotDate.getTime())) return false;

          slotDate.setHours(0, 0, 0, 0);
          const slotDateStr = slotDate.toISOString().split("T")[0];

          return slotDateStr === targetDateStr && slot.mealTime === mealType;
        }
      );

      if (!targetSlot) {
        return res.status(404).json({
          success: false,
          message: `No ${mealType} meal found for date: ${targetDateStr}`,
        });
      }

      // Validate status transition (prevent skipping steps)
      const currentStatus = targetSlot.deliveryStatus || "scheduled";
      const isValidTransition = this.isValidStatusTransition(
        currentStatus,
        status
      );

      if (!isValidTransition) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from "${currentStatus}" to "${status}"`,
          validNextStatuses: this.getValidNextStatuses(currentStatus),
        });
      }

      // Update the slot
      targetSlot.deliveryStatus = status;

      // Update delivered timestamp if status is delivered
      if (status === "delivered") {
        targetSlot.deliveredAt = new Date();
      }

      // Add notes if provided
      if (notes) {
        targetSlot.notes = notes;
      }

      // Save the subscription
      // Use validateModifiedOnly to avoid validating unchanged fields like subscription.status
      await subscription.save({ validateModifiedOnly: true });

      // Check if ALL meals for this day are "ready"
      const allDaySlots = subscription.mealPlanSnapshot.mealSchedule.filter(
        (slot) => {
          if (!slot.scheduledDeliveryDate) return false;
          const slotDate = new Date(slot.scheduledDeliveryDate);
          if (isNaN(slotDate.getTime())) return false;
          slotDate.setHours(0, 0, 0, 0);
          const slotDateStr = slotDate.toISOString().split("T")[0];
          return slotDateStr === targetDateStr;
        }
      );

      const allReady = allDaySlots.every(
        (slot) => slot.deliveryStatus === "ready"
      );

      console.log(`✅ Updated ${mealType} to ${status} for ${targetDateStr}`);
      console.log(`📦 All meals ready for ${targetDateStr}:`, allReady);

      // Update delivery order to reflect meal preparation progress
      try {
        await this.updateDeliveryOrderForDay(
          subscription,
          targetDateStr,
          allDaySlots,
          chefId,
          allReady
        );
      } catch (orderError) {
        console.error("❌ Failed to update delivery order:", orderError);
        // Don't fail the main request if order update fails
      }

      res.json({
        success: true,
        message: `Successfully updated ${mealType} to ${status}`,
        data: {
          date: targetDateStr,
          mealType,
          status,
          allMealsReady: allReady,
          dayMealStatuses: allDaySlots.map((s) => ({
            mealTime: s.mealTime,
            status: s.deliveryStatus,
          })),
        },
      });
    } catch (error) {
      console.error("❌ Update meal type status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update meal type status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update OrderDelegation daily timeline when chef updates meal status
   * Syncs status between subscription meal schedule and order delegation
   */
  async updateDeliveryOrderForDay(
    subscription,
    date,
    mealSlots,
    chefId,
    allMealsReady
  ) {
    const OrderDelegation = require("../models/OrderDelegation");

    console.log("📦 Updating delegation timeline for:", {
      subscriptionId: subscription._id,
      date,
      allMealsReady,
    });

    try {
      // Find OrderDelegation for this subscription
      const delegation = await OrderDelegation.findOne({
        subscriptionId: subscription._id,
      });

      if (!delegation) {
        console.log("⚠️ No OrderDelegation found for subscription");
        return null;
      }

      // Update the daily timeline status for this date
      const dateStr = new Date(date).toISOString().split("T")[0];
      const updated = await delegation.updateDailyStatus(
        date,
        allMealsReady ? "ready" : "pending",
        allMealsReady ? "chef" : null
      );

      if (updated) {
        await delegation.save();
        console.log(
          `✅ Updated delegation timeline for ${dateStr} to ${
            allMealsReady ? "ready" : "pending"
          }`
        );
        return delegation;
      } else {
        console.log(`⚠️ No timeline entry found for date: ${dateStr}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Error updating delegation timeline:", error);
      return null;
    }
  }

  /**
   * Validate if a status transition is allowed
   * Prevents chefs from skipping preparation steps
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      pending: [
        "scheduled",
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "cancelled",
        "skipped",
      ], // Initial state - allow chef to skip steps
      scheduled: [
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "cancelled",
        "skipped",
      ], // Allow chef to skip steps
      chef_assigned: ["preparing", "prepared", "ready", "cancelled", "skipped"], // Allow chef to skip to ready
      preparing: ["prepared", "ready", "cancelled"],
      prepared: ["preparing", "ready", "cancelled"], // Allow back to preparing
      ready: ["preparing", "prepared", "out_for_delivery", "cancelled"], // Allow chef to undo and go back
      // Driver-controlled statuses (chef cannot set these directly in normal flow)
      out_for_delivery: ["delivered", "cancelled"],
      delivered: [], // Final state
      cancelled: [], // Final state
      skipped: [], // Final state
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get list of valid next statuses for current status
   * Used to show chef what transitions are allowed
   */
  getValidNextStatuses(currentStatus) {
    const allowedTransitions = {
      pending: [
        "scheduled",
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "cancelled",
        "skipped",
      ], // Initial state - allow chef to skip steps
      scheduled: [
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "cancelled",
        "skipped",
      ], // Allow chef to skip steps
      chef_assigned: ["preparing", "prepared", "ready", "cancelled", "skipped"], // Allow chef to skip to ready
      preparing: ["prepared", "ready", "cancelled"],
      prepared: ["preparing", "ready", "cancelled"], // Allow back to preparing
      ready: ["preparing", "prepared", "out_for_delivery", "cancelled"], // Allow chef to undo and go back
      out_for_delivery: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
      skipped: [],
    };

    return allowedTransitions[currentStatus] || [];
  }
}

module.exports = new ChefSubscriptionController();
