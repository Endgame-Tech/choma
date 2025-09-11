const SubscriptionChefAssignment = require("../models/SubscriptionChefAssignment");
const RecurringSubscription = require("../models/RecurringSubscription");
const MealAssignment = require("../models/MealAssignment");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Chef = require("../models/Chef");
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

      // Get active subscription assignments with related data
      const assignments = await SubscriptionChefAssignment.find({
        chefId,
        assignmentStatus: "active",
        endDate: { $gte: new Date() },
      })
        .populate(
          "subscriptionId",
          "status frequency nextDeliveryDate dietaryPreferences allergens"
        )
        .populate("customerId", "fullName phone email")
        .populate("mealPlanId", "planName durationWeeks planDescription")
        .sort({ assignedAt: -1 })
        .lean();

      // Enrich with current meal assignments and upcoming schedule
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          // Get today's meal assignments
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const todaysMealsRaw = await MealAssignment.find({
            subscriptionId: assignment.subscriptionId._id,
            scheduledDate: { $gte: todayStart, $lte: todayEnd },
            status: { $nin: ["delivered", "cancelled", "skipped"] },
          })
            .populate("mealPlanAssignmentId")
            .lean();

          // Transform meals to match frontend expectations
          const todaysMeals = todaysMealsRaw.map((meal) => {
            // Extract meal type from mealTitle or mealTime field
            let mealType = "breakfast"; // default
            if (meal.mealTitle) {
              const title = meal.mealTitle.toLowerCase();
              if (title.includes("lunch")) mealType = "lunch";
              else if (title.includes("dinner")) mealType = "dinner";
              else if (title.includes("breakfast")) mealType = "breakfast";
            }

            // Map backend status to frontend status
            const statusMapping = {
              scheduled: "scheduled",
              chef_assigned: "scheduled",
              preparing: "in_progress",
              ready: "completed",
              out_for_delivery: "completed",
              delivered: "completed",
              failed: "scheduled",
              cancelled: "cancelled",
            };

            return {
              _id: meal._id,
              mealType,
              name:
                meal.mealTitle ||
                `${assignment.mealPlanId.planName} - ${mealType}`,
              description: meal.mealDescription,
              deliveryDate: meal.scheduledDate,
              status: statusMapping[meal.status] || "scheduled",
              backendStatus: meal.status, // Keep original for debugging
              scheduledTimeSlot: meal.scheduledTimeSlot,
              isScheduled: true,
            };
          });

          // Get upcoming week's meal assignments
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() + 7);

          const upcomingMeals = await MealAssignment.find({
            subscriptionId: assignment.subscriptionId._id,
            scheduledDate: { $gte: new Date(), $lte: weekEnd },
          })
            .populate("mealPlanAssignmentId")
            .sort({ scheduledDate: 1 })
            .limit(7)
            .lean();

          // Calculate performance metrics
          const totalDeliveries = assignment.performance?.totalDeliveries || 0;
          const onTimeDeliveries =
            assignment.performance?.onTimeDeliveries || 0;
          const avgRating = assignment.performance?.averageRating || 0;

          return {
            ...assignment,
            todaysMeals,
            upcomingMeals,
            metrics: {
              totalDeliveries,
              onTimeRate:
                totalDeliveries > 0
                  ? Math.round((onTimeDeliveries / totalDeliveries) * 100)
                  : 100,
              avgRating: Math.round(avgRating * 10) / 10,
              consistencyScore: assignment.performance?.consistencyScore || 100,
            },
          };
        })
      );

      res.json({
        success: true,
        data: {
          assignments: enrichedAssignments,
          summary: {
            totalActiveSubscriptions: enrichedAssignments.length,
            totalTodaysMeals: enrichedAssignments.reduce(
              (sum, a) => sum + a.todaysMeals.length,
              0
            ),
            avgPerformanceScore: Math.round(
              enrichedAssignments.reduce(
                (sum, a) => sum + a.metrics.consistencyScore,
                0
              ) / (enrichedAssignments.length || 1)
            ),
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

      // Debug: Check for meals with null subscriptionId
      const mealsWithNullSubscription = weeklyMeals.filter(
        (meal) => !meal.subscriptionId
      );
      if (mealsWithNullSubscription.length > 0) {
        console.log(
          "⚠️ Found meals with null subscriptionId:",
          mealsWithNullSubscription.length
        );
        console.log(
          "Sample meal with null subscription:",
          mealsWithNullSubscription[0]
        );
      }

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
          meals: meals
            .filter((m) => m.subscriptionId) // Filter out meals without subscriptionId
            .map((m) => ({
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
          weeklyMeals
            .filter((m) => m.subscriptionId) // Filter out meals without subscriptionId
            .map((m) => m.subscriptionId._id)
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

      // Get meal plan structure
      const mealPlanStructure = await MealPlanAssignment.find({
        mealPlanId: assignment.mealPlanId._id,
      })
        .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 })
        .lean();

      // Get completed and upcoming meal assignments
      const mealAssignments = await MealAssignment.find({ subscriptionId })
        .sort({ scheduledDate: 1 })
        .lean();

      // Build timeline with progression
      const timeline = mealPlanStructure.map((planMeal, index) => {
        // Find corresponding assignment
        const assignment = mealAssignments.find(
          (ma) =>
            ma.mealPlanAssignmentId &&
            ma.mealPlanAssignmentId.toString() === planMeal._id.toString()
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
          isCompleted: assignment?.status === "delivered",
          isInProgress:
            assignment?.status &&
            [
              "chef_assigned",
              "preparing",
              "ready",
              "out_for_delivery",
            ].includes(assignment.status),
          isUpcoming: !assignment || assignment.status === "scheduled",
          scheduledDate: assignment?.scheduledDate,
          actualDate: assignment?.actualDeliveryTime,
          status: assignment?.status || "pending",
        };
      });

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
   * Update individual meal status for subscription assignments
   * Handles single meal status updates with automatic driver assignment
   */
  async updateSubscriptionMealStatus(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionAssignmentId, mealType, status, notes } = req.body;

      console.log("🍽️ Updating subscription meal status:", {
        subscriptionAssignmentId,
        mealType,
        status,
      });

      // Validate required fields
      if (!subscriptionAssignmentId || !mealType || !status) {
        return res.status(400).json({
          success: false,
          message:
            "Subscription assignment ID, meal type, and status are required",
        });
      }

      // Map frontend status to backend enum values
      const statusMapping = {
        scheduled: "scheduled",
        in_progress: "preparing",
        preparing: "preparing",
        completed: "ready",
        ready: "ready",
        ready_for_pickup: "ready",
        out_for_delivery: "out_for_delivery",
        delivered: "delivered",
        cancelled: "cancelled",
      };

      const backendStatus = statusMapping[status];
      if (!backendStatus) {
        return res.status(400).json({
          success: false,
          message: "Invalid status provided",
        });
      }

      // Verify chef has access to this subscription assignment
      const assignment = await SubscriptionChefAssignment.findOne({
        _id: subscriptionAssignmentId,
        chefId,
        assignmentStatus: "active",
      })
        .populate("subscriptionId")
        .populate("customerId", "fullName phone email");

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Subscription assignment not found or not accessible",
        });
      }

      // Get or create meal assignment for today
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      let mealAssignment = await MealAssignment.findOne({
        subscriptionId: assignment.subscriptionId._id,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        mealTitle: { $regex: new RegExp(mealType, "i") }, // Match breakfast, lunch, dinner
      });

      // If no meal assignment exists, create one
      if (!mealAssignment) {
        mealAssignment = new MealAssignment({
          subscriptionId: assignment.subscriptionId._id,
          assignedChef: chefId,
          scheduledDate: today,
          status: "chef_assigned",
          mealTitle: `${assignment.mealPlanId?.planName || "Subscription"} - ${
            mealType.charAt(0).toUpperCase() + mealType.slice(1)
          }`,
          mealDescription: `${
            mealType.charAt(0).toUpperCase() + mealType.slice(1)
          } meal for subscription`,
          scheduledTimeSlot: {
            start:
              mealType === "breakfast"
                ? "08:00"
                : mealType === "lunch"
                ? "12:00"
                : "18:00",
            end:
              mealType === "breakfast"
                ? "10:00"
                : mealType === "lunch"
                ? "14:00"
                : "20:00",
          },
        });
        await mealAssignment.save();
      }

      // Update status with notes
      await mealAssignment.updateStatus(
        backendStatus,
        chefId,
        notes || `Meal ${status} by chef`
      );

      // If marked as completed/ready, automatically assign to available driver
      let driverAssignment = null;
      if (
        status === "completed" ||
        status === "ready" ||
        status === "ready_for_pickup"
      ) {
        try {
          // Find available drivers using correct field names
          const Driver = require("../models/Driver");
          const availableDrivers = await Driver.find({
            accountStatus: "approved",
            status: { $in: ["online", "available"] }
          }).limit(5);

          if (availableDrivers.length > 0) {
            // Assign to first available driver (you can add more sophisticated assignment logic)
            const selectedDriver = availableDrivers[0];

            // Update meal assignment with driver
            await mealAssignment.assignDriver(selectedDriver._id, "system");

            // Create a delivery task/notification for the driver
            // This could be expanded to use a proper notification service
            console.log(
              `🚚 Meal assigned to driver ${selectedDriver._id} for delivery`
            );

            driverAssignment = {
              driverId: selectedDriver._id,
              driverName: selectedDriver.fullName,
              assignedAt: new Date(),
            };
          } else {
            console.log(
              "⚠️ No available drivers found for immediate assignment"
            );
          }
        } catch (driverError) {
          console.error("❌ Error assigning driver:", driverError);
          // Continue without driver assignment - meal is still ready
        }
      }

      // Check if all daily meals for this subscription are completed
      // Only check this when a meal reaches a completed state
      let dailyWorkloadCompleted = false;
      if (
        status === "completed" ||
        status === "ready" ||
        status === "ready_for_pickup"
      ) {
        dailyWorkloadCompleted = await this.checkDailyWorkloadCompletion(
          assignment.subscriptionId._id,
          chefId
        );
        
        if (dailyWorkloadCompleted) {
          console.log(`🎯 All daily meals completed for subscription ${assignment.subscriptionId._id}`);
          
          // Trigger pickup workflow (with duplicate prevention built-in)
          await this.triggerPickupWorkflow(assignment, chefId);
        }
      }

      // Update subscription assignment performance if delivered
      if (status === "delivered") {
        await this.updateChefPerformanceMetrics(
          chefId,
          assignment.subscriptionId._id,
          {
            delivered: true,
            onTime: true,
          }
        );
      }

      // Map backend status back to frontend status for response
      const frontendStatusMapping = {
        scheduled: "scheduled",
        chef_assigned: "scheduled",
        preparing: "in_progress",
        ready: "completed",
        out_for_delivery: "completed",
        delivered: "completed",
        failed: "scheduled",
        cancelled: "cancelled",
      };

      res.json({
        success: true,
        data: {
          mealAssignment: {
            id: mealAssignment._id,
            status: frontendStatusMapping[mealAssignment.status] || "scheduled",
            backendStatus: mealAssignment.status,
            mealType,
            name: mealAssignment.mealTitle,
            updatedAt: new Date(),
          },
          driverAssignment,
          dailyWorkloadCompleted,
          message: dailyWorkloadCompleted
            ? `All daily meals completed! Pickup notifications sent.`
            : driverAssignment
            ? `Meal ${status} and assigned to driver ${driverAssignment.driverName}`
            : `Meal status updated to ${status}`,
        },
      });
    } catch (error) {
      console.error("❌ Update subscription meal status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update meal status",
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
   * Create daily meal assignment for subscription
   * Used when no meals are scheduled for today
   */
  async createDailyMealAssignment(req, res) {
    try {
      const chefId = req.chef.chefId;
      const { subscriptionId } = req.params;
      const { date } = req.body;

      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split("T")[0];

      // Verify chef has access to this subscription
      const assignment = await SubscriptionChefAssignment.findOne({
        chefId,
        subscriptionId,
        assignmentStatus: "active",
      })
        .populate("subscriptionId")
        .populate("mealPlanId");

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Subscription assignment not found for this chef",
        });
      }

      // Check if meal assignment already exists for today
      const MealAssignment = require("../models/MealAssignment");
      const existingAssignment = await MealAssignment.findOne({
        assignedChef: chefId,
        subscriptionId: subscriptionId,
        scheduledDate: {
          $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          $lt: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: "Meal assignment already exists for this date",
        });
      }

      // Create new meal assignment
      const mealAssignment = new MealAssignment({
        subscriptionId: subscriptionId,
        assignedChef: chefId,
        scheduledDate: targetDate,
        status: "chef_assigned",
        mealTitle: `${assignment.mealPlanId.planName} - Daily Meal`,
        mealDescription: "Daily subscription meal",
        scheduledTimeSlot: {
          start: "12:00",
          end: "14:00",
        },
        preparationTime: 60, // Default 1 hour
        mealTime: "lunch", // Default
      });

      await mealAssignment.save();

      // Create corresponding SubscriptionDelivery
      const SubscriptionDelivery = require("../models/SubscriptionDelivery");
      const delivery = new SubscriptionDelivery({
        subscriptionId: subscriptionId,
        customerId: assignment.subscriptionId.userId,
        mealAssignment: {
          assignmentId: mealAssignment._id,
          weekNumber: 1, // Calculate based on subscription start
          dayOfWeek: targetDate.getDay() || 7, // 1-7, Sunday = 7
          mealTime: "lunch",
          dailyValue: assignment.subscriptionId.totalAmount / 7, // Daily portion
        },
        scheduledDate: targetDate,
        status: "chef_assigned",
        chefAssignment: {
          chefId: chefId,
          assignedAt: new Date(),
        },
      });

      await delivery.save();

      // Update the order reference if needed
      const Order = require("../models/Order");
      await Order.findOneAndUpdate(
        {
          subscription: subscriptionId,
          "recurringOrder.orderType": { $ne: "one-time" },
        },
        { "recurringOrder.subscriptionDeliveryId": delivery._id }
      );

      res.json({
        success: true,
        message: "Daily meal assignment created successfully",
        data: {
          mealAssignment,
          subscriptionDelivery: delivery,
        },
      });
    } catch (error) {
      console.error("❌ Create daily meal assignment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create daily meal assignment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Check if all daily meals for a subscription are completed
   */
  async checkDailyWorkloadCompletion(subscriptionId, chefId) {
    try {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      // Get all meal assignments for today for this subscription
      const todaysMeals = await MealAssignment.find({
        subscriptionId,
        assignedChef: chefId,
        scheduledDate: { $gte: todayStart, $lte: todayEnd }
      });

      console.log(`📊 Found ${todaysMeals.length} meals for today`);

      if (todaysMeals.length === 0) {
        return false; // No meals to complete
      }

      // Check if all meals are in completed states
      const completedStates = ['ready', 'out_for_delivery', 'delivered'];
      const completedMeals = todaysMeals.filter(meal => 
        completedStates.includes(meal.status)
      );

      console.log(`✅ ${completedMeals.length}/${todaysMeals.length} meals completed`);

      return completedMeals.length === todaysMeals.length;
    } catch (error) {
      console.error("❌ Error checking daily workload completion:", error);
      return false;
    }
  }

  /**
   * Trigger pickup workflow when all daily meals are completed
   */
  async triggerPickupWorkflow(assignment, chefId) {
    try {
      console.log(`🚀 Triggering pickup workflow for subscription ${assignment.subscriptionId._id}`);
      
      // Import required services
      const notificationService = require('../services/notificationService');
      const DriverAssignment = require('../models/DriverAssignment');
      
      // DUPLICATE PREVENTION: Check if pickup assignment already exists for today
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      
      const existingPickupAssignment = await DriverAssignment.findOne({
        'subscriptionInfo.subscriptionId': assignment.subscriptionId._id,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });
      
      if (existingPickupAssignment) {
        console.log(`⚠️ Pickup assignment already exists for subscription ${assignment.subscriptionId._id} today - skipping duplicate creation`);
        return existingPickupAssignment;
      }
      
      // Get subscription and customer details
      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findById(assignment.subscriptionId._id)
        .populate('userId', 'fullName phone email deviceTokens');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Generate pickup code for returning customers
      const pickupCode = await this.generatePickupCode(subscription);
      
      // Find available driver for pickup
      const availableDriver = await this.findAvailableDriverForPickup(subscription);
      
      if (!availableDriver) {
        console.log('⚠️ No available drivers for pickup - will retry later');
        return;
      }

      // Create pickup assignment for driver
      const pickupAssignment = await this.createPickupAssignment(
        subscription,
        availableDriver,
        chefId,
        pickupCode
      );

      // Update chef assignment with driver assignment ID for package labeling
      await this.linkChefAssignmentToDriverAssignment(
        assignment.subscriptionId._id,
        chefId,
        pickupAssignment._id
      );

      // Send notifications
      await Promise.all([
        // Notify driver about pickup
        this.notifyDriverForPickup(availableDriver, subscription, pickupAssignment),
        
        // Notify customer about pickup
        this.notifyCustomerForPickup(subscription, pickupCode, availableDriver)
      ]);

      console.log(`✅ Pickup workflow triggered successfully`);
      
    } catch (error) {
      console.error("❌ Error triggering pickup workflow:", error);
    }
  }

  /**
   * Generate 4-digit pickup code for returning customers
   */
  async generatePickupCode(subscription) {
    try {
      // Check if this is a first-time order
      const Order = require('../models/Order');
      const previousOrders = await Order.countDocuments({
        customerId: subscription.userId._id,
        orderStatus: 'delivered'
      });

      // Only generate code for returning customers
      if (previousOrders === 0) {
        console.log('🆕 First-time customer - no pickup code needed');
        return null;
      }

      // Generate 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      console.log(`🔢 Generated pickup code: ${code} for returning customer`);
      
      return code;
    } catch (error) {
      console.error("❌ Error generating pickup code:", error);
      return null;
    }
  }

  /**
   * Find available driver for pickup
   */
  async findAvailableDriverForPickup(subscription) {
    try {
      const Driver = require('../models/Driver');
      
      // Find drivers who are approved and online
      const availableDrivers = await Driver.find({
        accountStatus: 'approved',
        status: { $in: ['online', 'available'] }
      }).limit(10);

      if (availableDrivers.length === 0) {
        return null;
      }

      // Simple assignment - pick driver with least current assignments
      const DriverAssignment = require('../models/DriverAssignment');
      
      const driversWithLoad = await Promise.all(
        availableDrivers.map(async (driver) => {
          const activeAssignments = await DriverAssignment.countDocuments({
            driverId: driver._id,
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
          });
          
          return {
            ...driver.toObject(),
            activeAssignments
          };
        })
      );

      // Sort by least assignments
      driversWithLoad.sort((a, b) => a.activeAssignments - b.activeAssignments);
      
      return driversWithLoad[0];
    } catch (error) {
      console.error("❌ Error finding available driver:", error);
      return null;
    }
  }

  /**
   * Create pickup assignment for driver
   */
  async createPickupAssignment(subscription, driver, chefId, pickupCode) {
    try {
      const DriverAssignment = require('../models/DriverAssignment');
      const Order = require('../models/Order');
      const Chef = require('../models/Chef');
      
      // Get chef details
      const chef = await Chef.findById(chefId);
      if (!chef) {
        throw new Error('Chef not found');
      }

      // Create a temporary order for this pickup
      const tempOrder = new Order({
        customer: subscription.userId._id, // Fixed: use 'customer' instead of 'customerId'
        orderStatus: 'Preparing', // Fixed: use valid enum value instead of 'ready_for_pickup'
        subscription: subscription._id,
        totalAmount: subscription.price || 0, // Fixed: use 'totalAmount' instead of 'totalPrice'
        deliveryAddress: subscription.deliveryAddress || 'Customer Address',
        
        // Required fields for Order model
        orderItems: { meals: 3, type: 'subscription_pickup' },
        paymentMethod: 'Transfer',
        paymentStatus: 'Paid',
        
        // Mark as subscription pickup order
        recurringOrder: {
          orderType: 'subscription-recurring',
          parentSubscription: subscription._id,
          isActivationOrder: false
        }
      });
      await tempOrder.save();
      
      const pickupAssignment = new DriverAssignment({
        driverId: driver._id,
        orderId: tempOrder._id, // Use the temporary order
        confirmationCode: pickupCode,
        
        pickupLocation: {
          address: 'Chef Kitchen - Subscription Pickup',
          coordinates: [3.3792, 6.5244], // [longitude, latitude] format for MongoDB
          chefId: chef._id,
          chefName: chef.fullName,
          chefPhone: chef.phone || '08012345678', // Default if no phone
          instructions: 'Pick up daily meal subscription'
        },
        
        deliveryLocation: {
          address: subscription.deliveryAddress || 'Customer Address',
          coordinates: [3.3892, 6.5344], // [longitude, latitude] - slightly different location
          area: 'Lagos',
          instructions: pickupCode ? `Customer pickup code: ${pickupCode}` : 'First-time customer - no code needed'
        },
        
        status: 'assigned',
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        estimatedDeliveryTime: new Date(Date.now() + 90 * 60 * 1000), // 90 minutes from now
        
        // Required financial fields
        totalDistance: 5, // 5km default distance
        estimatedDuration: 60, // 60 minutes
        baseFee: 500,
        distanceFee: 100,
        totalEarning: 600,
        
        // Subscription information
        subscriptionInfo: {
          subscriptionId: subscription._id,
          mealPlanId: subscription.mealPlanId,
          deliveryDay: 1,
          isActivationDelivery: false
        },
        
        priority: 'high', // High priority for subscription pickups
        specialInstructions: `Subscription pickup for ${subscription.userId.fullName}. Contains ${3} meals.`,
        isFirstDelivery: pickupCode ? false : true // First delivery if no pickup code
      });

      await pickupAssignment.save();
      console.log(`📦 Created pickup assignment: ${pickupAssignment._id}`);
      
      return pickupAssignment;
    } catch (error) {
      console.error("❌ Error creating pickup assignment:", error);
      throw error;
    }
  }

  /**
   * Notify driver about pickup
   */
  async notifyDriverForPickup(driver, subscription, pickupAssignment) {
    try {
      const notificationService = require('../services/notificationService');
      
      const notification = {
        title: '🍽️ New Pickup Available',
        body: `Pick up meals for ${subscription.userId.fullName}`,
        data: {
          type: 'pickup_assignment',
          assignmentId: pickupAssignment._id.toString(),
          subscriptionId: subscription._id.toString(),
          estimatedPickupTime: pickupAssignment.estimatedPickupTime,
          confirmationCode: pickupAssignment.confirmationCode
        }
      };

      // Send push notification
      if (driver.deviceTokens && driver.deviceTokens.length > 0) {
        await notificationService.sendPushNotification(
          driver.deviceTokens,
          notification.title,
          notification.body,
          notification.data
        );
      }

      // Send SMS backup
      if (driver.phone) {
        const smsMessage = `New pickup available for ${subscription.userId.fullName}. Check your driver app for details.`;
        await notificationService.sendSMS(driver.phone, smsMessage);
      }

      console.log(`📱 Driver notification sent to ${driver.fullName}`);
    } catch (error) {
      console.error("❌ Error notifying driver:", error);
    }
  }

  /**
   * Notify customer about pickup
   */
  async notifyCustomerForPickup(subscription, pickupCode, driver) {
    try {
      const notificationService = require('../services/notificationService');
      
      const customer = subscription.userId;
      
      let notification;
      if (pickupCode) {
        // Returning customer with pickup code
        notification = {
          title: '📦 Your meals are ready for pickup!',
          body: `Driver ${driver.fullName} will deliver soon. Pickup code: ${pickupCode}`,
          data: {
            type: 'pickup_notification',
            subscriptionId: subscription._id.toString(),
            driverId: driver._id.toString(),
            pickupCode,
            isReturningCustomer: true
          }
        };
      } else {
        // First-time customer (no code needed)
        notification = {
          title: '📦 Your meals are ready for pickup!',
          body: `Driver ${driver.fullName} will deliver soon. No pickup code needed for your first order!`,
          data: {
            type: 'pickup_notification',
            subscriptionId: subscription._id.toString(),
            driverId: driver._id.toString(),
            isReturningCustomer: false
          }
        };
      }

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
        const smsMessage = pickupCode 
          ? `Your meals are ready! Driver ${driver.fullName} will deliver soon. Pickup code: ${pickupCode}`
          : `Your meals are ready! Driver ${driver.fullName} will deliver soon. Welcome to Choma!`;
          
        await notificationService.sendSMS(customer.phone, smsMessage);
      }

      console.log(`📱 Customer notification sent to ${customer.fullName}`);
    } catch (error) {
      console.error("❌ Error notifying customer:", error);
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
   * Link chef assignment to driver assignment for package labeling coordination
   */
  async linkChefAssignmentToDriverAssignment(subscriptionId, chefId, driverAssignmentId) {
    try {
      const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
      
      // Update the chef assignment with the driver assignment ID
      const result = await SubscriptionChefAssignment.findOneAndUpdate(
        {
          subscriptionId,
          chefId,
          assignmentStatus: 'active'
        },
        {
          $set: {
            driverAssignmentId: driverAssignmentId,
            packageLabelId: driverAssignmentId.toString().slice(-8), // Last 8 characters for easy labeling
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (result) {
        console.log(`🏷️ Linked chef assignment to driver assignment: ${driverAssignmentId.toString().slice(-8)}`);
      } else {
        console.warn(`⚠️ Could not find chef assignment to link for subscription ${subscriptionId}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error linking chef assignment to driver assignment:', error);
    }
  }
}

module.exports = new ChefSubscriptionController();
