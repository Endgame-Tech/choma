const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const RecurringSubscription = require('../models/RecurringSubscription');
const MealAssignment = require('../models/MealAssignment');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const Chef = require('../models/Chef');
const mongoose = require('mongoose');

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
      
      console.log('🔍 Getting subscription assignments for chef:', chefId);

      // Validate chef exists
      const chef = await Chef.findById(chefId);
      if (!chef) {
        return res.status(404).json({
          success: false,
          message: 'Chef not found'
        });
      }

      // Get active subscription assignments with related data
      const assignments = await SubscriptionChefAssignment
        .find({
          chefId,
          assignmentStatus: 'active',
          endDate: { $gte: new Date() }
        })
        .populate('subscriptionId', 'status frequency nextDeliveryDate dietaryPreferences allergens')
        .populate('customerId', 'fullName phone email')
        .populate('mealPlanId', 'planName durationWeeks planDescription')
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

          const todaysMeals = await MealAssignment
            .find({
              subscriptionId: assignment.subscriptionId._id,
              scheduledDate: { $gte: todayStart, $lte: todayEnd },
              status: { $nin: ['delivered', 'cancelled', 'skipped'] }
            })
            .populate('mealPlanAssignmentId')
            .lean();

          // Get upcoming week's meal assignments
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          const upcomingMeals = await MealAssignment
            .find({
              subscriptionId: assignment.subscriptionId._id,
              scheduledDate: { $gte: new Date(), $lte: weekEnd }
            })
            .populate('mealPlanAssignmentId')
            .sort({ scheduledDate: 1 })
            .limit(7)
            .lean();

          // Calculate performance metrics
          const totalDeliveries = assignment.performance?.totalDeliveries || 0;
          const onTimeDeliveries = assignment.performance?.onTimeDeliveries || 0;
          const avgRating = assignment.performance?.averageRating || 0;

          return {
            ...assignment,
            todaysMeals,
            upcomingMeals,
            metrics: {
              totalDeliveries,
              onTimeRate: totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 100,
              avgRating: Math.round(avgRating * 10) / 10,
              consistencyScore: assignment.performance?.consistencyScore || 100
            }
          };
        })
      );

      res.json({
        success: true,
        data: {
          assignments: enrichedAssignments,
          summary: {
            totalActiveSubscriptions: enrichedAssignments.length,
            totalTodaysMeals: enrichedAssignments.reduce((sum, a) => sum + a.todaysMeals.length, 0),
            avgPerformanceScore: Math.round(
              enrichedAssignments.reduce((sum, a) => sum + a.metrics.consistencyScore, 0) / 
              (enrichedAssignments.length || 1)
            )
          }
        }
      });

    } catch (error) {
      console.error('❌ Get subscription assignments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription assignments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      console.log('🗓️ Getting weekly meal plan for chef:', chefId);

      // Default to current week if no start date provided
      const weekStart = startDate ? new Date(startDate) : new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all meal assignments for the week
      const weeklyMeals = await MealAssignment
        .find({
          assignedChef: chefId,
          scheduledDate: { $gte: weekStart, $lte: weekEnd }
        })
        .populate('subscriptionId', 'status frequency deliverySchedule')
        .populate('mealPlanAssignmentId')
        .sort({ scheduledDate: 1, 'scheduledTimeSlot.start': 1 })
        .lean();

      // Group meals by day and identify batch preparation opportunities
      const weeklyPlan = {};
      const batchOpportunities = new Map();

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        weeklyPlan[dateKey] = {
          date: dateKey,
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          meals: []
        };
      }

      // Organize meals and identify batch opportunities
      weeklyMeals.forEach(meal => {
        const mealDate = new Date(meal.scheduledDate);
        const dateKey = mealDate.toISOString().split('T')[0];
        
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
      const significantBatchOpportunities = Array.from(batchOpportunities.entries())
        .filter(([_, meals]) => meals.length >= 3)
        .map(([mealName, meals]) => ({
          mealName,
          count: meals.length,
          meals: meals.map(m => ({
            assignmentId: m._id,
            scheduledDate: m.scheduledDate,
            subscriptionId: m.subscriptionId._id,
            status: m.status
          })),
          estimatedTimeSaving: Math.floor(meals.length * 0.3 * 60) // 30% time saving in minutes
        }));

      // Calculate weekly statistics
      const weeklyStats = {
        totalMeals: weeklyMeals.length,
        mealsByStatus: weeklyMeals.reduce((acc, meal) => {
          acc[meal.status] = (acc[meal.status] || 0) + 1;
          return acc;
        }, {}),
        uniqueSubscriptions: new Set(weeklyMeals.map(m => m.subscriptionId._id)).size,
        batchOpportunities: significantBatchOpportunities.length
      };

      res.json({
        success: true,
        data: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          weeklyPlan: Object.values(weeklyPlan),
          batchOpportunities: significantBatchOpportunities,
          statistics: weeklyStats
        }
      });

    } catch (error) {
      console.error('❌ Get weekly meal plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weekly meal plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const assignment = await SubscriptionChefAssignment
        .findOne({
          subscriptionId,
          chefId,
          assignmentStatus: 'active'
        })
        .populate('subscriptionId')
        .populate('mealPlanId')
        .populate('customerId', 'fullName email phone');

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Subscription assignment not found'
        });
      }

      // Get meal plan structure
      const mealPlanStructure = await MealPlanAssignment
        .find({ mealPlanId: assignment.mealPlanId._id })
        .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 })
        .lean();

      // Get completed and upcoming meal assignments
      const mealAssignments = await MealAssignment
        .find({ subscriptionId })
        .sort({ scheduledDate: 1 })
        .lean();

      // Build timeline with progression
      const timeline = mealPlanStructure.map((planMeal, index) => {
        // Find corresponding assignment
        const assignment = mealAssignments.find(ma => 
          ma.mealPlanAssignmentId && ma.mealPlanAssignmentId.toString() === planMeal._id.toString()
        );

        return {
          stepNumber: index + 1,
          weekNumber: planMeal.weekNumber,
          dayOfWeek: planMeal.dayOfWeek,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][planMeal.dayOfWeek - 1],
          mealTime: planMeal.mealTime,
          mealTitle: planMeal.customTitle || 'Meal Plan Item',
          mealDescription: planMeal.customDescription,
          isCompleted: assignment?.status === 'delivered',
          isInProgress: assignment?.status && ['chef_assigned', 'preparing', 'ready', 'out_for_delivery'].includes(assignment.status),
          isUpcoming: !assignment || assignment.status === 'scheduled',
          scheduledDate: assignment?.scheduledDate,
          actualDate: assignment?.actualDeliveryTime,
          status: assignment?.status || 'pending'
        };
      });

      // Calculate progression statistics
      const totalSteps = timeline.length;
      const completedSteps = timeline.filter(step => step.isCompleted).length;
      const inProgressSteps = timeline.filter(step => step.isInProgress).length;
      const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Identify current phase
      let currentPhase = 'Not Started';
      if (completedSteps > 0) {
        if (completedSteps === totalSteps) {
          currentPhase = 'Completed';
        } else if (inProgressSteps > 0) {
          currentPhase = 'In Progress';
        } else {
          currentPhase = 'Active';
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
            estimatedCompletion: assignment.endDate
          }
        }
      });

    } catch (error) {
      console.error('❌ Get subscription timeline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription timeline',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assignment IDs array is required'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      // Validate status
      const validStatuses = ['chef_assigned', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status provided'
        });
      }

      // Get and validate assignments belong to this chef
      const assignments = await MealAssignment.find({
        _id: { $in: assignmentIds },
        assignedChef: chefId
      });

      if (assignments.length !== assignmentIds.length) {
        return res.status(403).json({
          success: false,
          message: 'Some assignments not found or do not belong to this chef'
        });
      }

      // Perform batch update
      const updateData = {
        status,
        ...(notes && { chefNotes: notes }),
        [`${status}At`]: new Date() // Dynamic field like 'preparingAt', 'readyAt', etc.
      };

      // Add status to history for tracking
      const statusHistoryEntry = {
        status,
        timestamp: new Date(),
        updatedBy: chefId,
        notes
      };

      const result = await MealAssignment.updateMany(
        { _id: { $in: assignmentIds } },
        {
          $set: updateData,
          $push: { statusHistory: statusHistoryEntry }
        }
      );

      // Update chef performance metrics for completed deliveries
      if (status === 'delivered') {
        // Update SubscriptionChefAssignment performance metrics
        for (const assignment of assignments) {
          await this.updateChefPerformanceMetrics(chefId, assignment.subscriptionId, {
            delivered: true,
            onTime: true // You might want to calculate this based on scheduled vs actual time
          });
        }
      }

      res.json({
        success: true,
        data: {
          updatedCount: result.modifiedCount,
          status,
          message: `Successfully updated ${result.modifiedCount} meal assignments to ${status}`
        }
      });

    } catch (error) {
      console.error('❌ Update meal status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update meal status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const { period = '30d' } = req.query;

      console.log('📊 Getting subscription metrics for chef:', chefId, 'period:', period);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
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
            assignedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ['$assignmentStatus', 'active'] }, 1, 0] }
            },
            totalDeliveries: { $sum: { $ifNull: ['$performance.totalDeliveries', 0] } },
            onTimeDeliveries: { $sum: { $ifNull: ['$performance.onTimeDeliveries', 0] } },
            totalEarnings: { $sum: { $ifNull: ['$earnings.totalEarnings', 0] } },
            avgRating: { $avg: { $ifNull: ['$performance.averageRating', 0] } },
            avgConsistencyScore: { $avg: { $ifNull: ['$performance.consistencyScore', 100] } }
          }
        }
      ]);

      const metrics = metricsData[0] || {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalDeliveries: 0,
        onTimeDeliveries: 0,
        totalEarnings: 0,
        avgRating: 0,
        avgConsistencyScore: 100
      };

      // Calculate derived metrics
      const onTimeRate = metrics.totalDeliveries > 0 
        ? Math.round((metrics.onTimeDeliveries / metrics.totalDeliveries) * 100) 
        : 100;

      // Use service layer to get insights
      const chefSubscriptionService = require('../services/chefSubscriptionService');
      const performanceAnalysis = await chefSubscriptionService.analyzeSubscriptionPerformance(chefId, period);

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
            avgConsistencyScore: Math.round(metrics.avgConsistencyScore)
          },
          insights: performanceAnalysis.insights
        }
      });

    } catch (error) {
      console.error('❌ Get subscription metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get available batch preparation opportunities
   */
  async getBatchOpportunities(req, res) {
    try {
      const chefId = req.chef.chefId;
      
      console.log('🥘 Getting batch opportunities for chef:', chefId);
      
      // Use the service layer to identify batch opportunities
      const chefSubscriptionService = require('../services/chefSubscriptionService');
      const batchData = await chefSubscriptionService.identifyBatchOpportunities(chefId);
      
      res.json({
        success: true,
        data: batchData
      });
    } catch (error) {
      console.error('❌ Get batch opportunities error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch batch opportunities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        data: []
      });
    } catch (error) {
      console.error('❌ Get active batches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active batches',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
          status: 'started',
          startedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Start batch preparation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start batch preparation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
          status: 'completed',
          completedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Complete batch preparation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete batch preparation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Cancel batch preparation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel batch preparation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      
      const chefSubscriptionService = require('../services/chefSubscriptionService');
      
      const result = await chefSubscriptionService.facilitateSubscriptionCommunication(
        chefId,
        subscriptionId,
        messageType,
        content
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Send customer communication error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send customer communication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        assignmentStatus: 'active'
      });

      if (assignment) {
        await assignment.updatePerformanceMetrics(deliveryData);
      }
    } catch (error) {
      console.error('❌ Error updating chef performance metrics:', error);
    }
  }
}

module.exports = new ChefSubscriptionController();