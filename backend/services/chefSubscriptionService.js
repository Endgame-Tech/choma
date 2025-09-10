const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const RecurringSubscription = require('../models/RecurringSubscription');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const notificationService = require('./notificationService');

/**
 * Chef Subscription Service
 * Business logic layer for chef subscription management
 * Follows Single Responsibility Principle and clean architecture
 */
class ChefSubscriptionService {

  /**
   * Batch Preparation Optimizer
   * Identifies and groups similar meals for efficient batch cooking
   */
  async identifyBatchOpportunities(chefId, dateRange = { days: 7 }) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + dateRange.days);

      // Get all meal assignments for the chef in the date range
      const mealAssignments = await MealAssignment
        .find({
          assignedChef: chefId,
          scheduledDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['scheduled', 'chef_assigned'] }
        })
        .populate('mealPlanAssignmentId')
        .populate('subscriptionId', 'customerId deliverySchedule')
        .lean();

      // Group by similar characteristics for batch preparation
      const batchGroups = new Map();

      mealAssignments.forEach(assignment => {
        const mealData = assignment.mealPlanAssignmentId;
        if (!mealData) return;

        // Create batching keys based on preparation similarity
        const batchKeys = [
          // Same meal name
          `meal_${mealData.customTitle?.toLowerCase()}`,
          // Same meal time (breakfast, lunch, dinner)
          `time_${mealData.mealTime}`,
          // Same cooking method (if available)
          mealData.cookingMethod && `method_${mealData.cookingMethod}`,
          // Same preparation complexity
          mealData.preparationTime && `complexity_${this.getComplexityLevel(mealData.preparationTime)}`
        ].filter(Boolean);

        batchKeys.forEach(key => {
          if (!batchGroups.has(key)) {
            batchGroups.set(key, {
              type: key.split('_')[0],
              identifier: key.split('_')[1],
              meals: [],
              totalQuantity: 0,
              estimatedTimeSaving: 0
            });
          }

          batchGroups.get(key).meals.push(assignment);
          batchGroups.get(key).totalQuantity += 1;
        });
      });

      // Filter groups with significant batch potential (3+ items)
      const significantBatches = Array.from(batchGroups.values())
        .filter(batch => batch.meals.length >= 3)
        .map(batch => {
          // Calculate estimated time savings (30% reduction for batch cooking)
          const avgPrepTime = this.calculateAveragePreparationTime(batch.meals);
          const timeSavingPerMeal = avgPrepTime * 0.3;
          batch.estimatedTimeSaving = Math.round(timeSavingPerMeal * batch.meals.length);
          
          // Add scheduling recommendations
          batch.recommendedSchedule = this.generateBatchSchedule(batch.meals);
          
          return batch;
        })
        .sort((a, b) => b.estimatedTimeSaving - a.estimatedTimeSaving);

      return {
        totalOpportunities: significantBatches.length,
        totalTimeSaving: significantBatches.reduce((sum, batch) => sum + batch.estimatedTimeSaving, 0),
        batchGroups: significantBatches
      };

    } catch (error) {
      console.error('❌ Error identifying batch opportunities:', error);
      throw new Error('Failed to identify batch preparation opportunities');
    }
  }

  /**
   * Smart Assignment Scheduler
   * Optimizes meal assignments based on chef capacity and preferences
   */
  async optimizeWeeklySchedule(chefId, preferences = {}) {
    try {
      // Get chef's current assignments and capacity
      const chefAssignments = await SubscriptionChefAssignment
        .find({
          chefId,
          assignmentStatus: 'active'
        })
        .populate('subscriptionId')
        .lean();

      // Get unassigned meal assignments that could be optimized
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const unoptimizedMeals = await MealAssignment
        .find({
          assignedChef: chefId,
          scheduledDate: { $gte: weekStart, $lte: weekEnd },
          status: 'scheduled'
        })
        .lean();

      // Apply optimization algorithms
      const optimizationResults = {
        workloadBalancing: this.balanceWorkloadAcrossWeek(unoptimizedMeals),
        timeSlotOptimization: this.optimizeTimeSlots(unoptimizedMeals, preferences),
        locationClustering: this.clusterByDeliveryLocation(unoptimizedMeals),
        preparationSequencing: this.sequencePreparation(unoptimizedMeals)
      };

      return {
        currentSchedule: unoptimizedMeals,
        optimizedSchedule: this.mergeOptimizations(optimizationResults),
        improvements: {
          efficiencyGain: this.calculateEfficiencyGain(optimizationResults),
          timeReduction: this.calculateTimeReduction(optimizationResults),
          workloadBalance: this.calculateWorkloadBalance(optimizationResults)
        }
      };

    } catch (error) {
      console.error('❌ Error optimizing weekly schedule:', error);
      throw new Error('Failed to optimize weekly schedule');
    }
  }

  /**
   * Subscription Performance Analyzer
   * Provides insights into chef's subscription management performance
   */
  async analyzeSubscriptionPerformance(chefId, period = '30d') {
    try {
      const startDate = this.getStartDateForPeriod(period);
      
      // Get comprehensive performance data
      const performanceData = await SubscriptionChefAssignment.aggregate([
        {
          $match: {
            chefId: chefId,
            assignedAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'mealassignments',
            localField: 'subscriptionId',
            foreignField: 'subscriptionId',
            as: 'mealAssignments'
          }
        },
        {
          $addFields: {
            // Calculate detailed metrics
            totalMealsDelivered: {
              $size: {
                $filter: {
                  input: '$mealAssignments',
                  cond: { $eq: ['$$this.status', 'delivered'] }
                }
              }
            },
            onTimeMeals: {
              $size: {
                $filter: {
                  input: '$mealAssignments',
                  cond: { 
                    $and: [
                      { $eq: ['$$this.status', 'delivered'] },
                      { $lte: ['$$this.actualDeliveryTime', '$$this.estimatedDeliveryTime'] }
                    ]
                  }
                }
              }
            },
            averagePreparationTime: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: '$mealAssignments',
                      cond: { $eq: ['$$this.status', 'delivered'] }
                    }
                  },
                  as: 'meal',
                  in: {
                    $divide: [
                      { $subtract: ['$$meal.actualReadyTime', '$$meal.preparationStartedAt'] },
                      60000 // Convert to minutes
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ['$assignmentStatus', 'active'] }, 1, 0] }
            },
            totalMealsDelivered: { $sum: '$totalMealsDelivered' },
            totalOnTimeMeals: { $sum: '$onTimeMeals' },
            avgPreparationTime: { $avg: '$averagePreparationTime' },
            avgRating: { $avg: '$performance.averageRating' },
            totalEarnings: { $sum: '$earnings.totalEarnings' },
            avgConsistencyScore: { $avg: '$performance.consistencyScore' }
          }
        }
      ]);

      const data = performanceData[0] || {};

      // Calculate derived insights
      const insights = {
        performanceScore: this.calculateOverallPerformanceScore(data),
        improvementAreas: this.identifyImprovementAreas(data),
        strengths: this.identifyStrengths(data),
        recommendations: this.generatePerformanceRecommendations(data),
        trends: await this.analyzeTrends(chefId, period)
      };

      return {
        period,
        metrics: data,
        insights
      };

    } catch (error) {
      console.error('❌ Error analyzing subscription performance:', error);
      throw new Error('Failed to analyze subscription performance');
    }
  }

  /**
   * Subscription Communication Manager
   * Handles chef-customer communication for subscription management
   */
  async facilitateSubscriptionCommunication(chefId, subscriptionId, messageType, content) {
    try {
      // Validate subscription assignment
      const assignment = await SubscriptionChefAssignment
        .findOne({
          chefId,
          subscriptionId,
          assignmentStatus: 'active'
        })
        .populate('customerId', 'fullName email phone notificationPreferences')
        .populate('subscriptionId', 'status frequency');

      if (!assignment) {
        throw new Error('Subscription assignment not found');
      }

      // Prepare communication based on type
      let communicationData;
      
      switch (messageType) {
        case 'meal_preparation_update':
          communicationData = {
            type: 'subscription_update',
            title: 'Meal Preparation Update',
            message: content.message,
            subscriptionId,
            chefId,
            metadata: {
              mealTitle: content.mealTitle,
              estimatedReadyTime: content.estimatedReadyTime,
              customInstructions: content.customInstructions
            }
          };
          break;
          
        case 'schedule_adjustment':
          communicationData = {
            type: 'schedule_change',
            title: 'Schedule Adjustment Notice',
            message: content.message,
            subscriptionId,
            chefId,
            metadata: {
              originalDate: content.originalDate,
              newDate: content.newDate,
              reason: content.reason
            }
          };
          break;
          
        case 'quality_feedback_request':
          communicationData = {
            type: 'feedback_request',
            title: 'How was your meal?',
            message: content.message,
            subscriptionId,
            chefId,
            metadata: {
              mealId: content.mealId,
              feedbackUrl: content.feedbackUrl
            }
          };
          break;
          
        default:
          throw new Error('Invalid message type');
      }

      // Send notification through appropriate channels
      const notificationResult = await notificationService.sendSubscriptionNotification(
        assignment.customerId._id,
        communicationData
      );

      // Log communication in assignment record
      const communicationLog = {
        date: new Date(),
        type: messageType,
        from: 'chef',
        to: 'customer',
        subject: communicationData.title,
        message: communicationData.message,
        priority: 'normal'
      };

      await SubscriptionChefAssignment.findByIdAndUpdate(
        assignment._id,
        { $push: { communications: communicationLog } }
      );

      return {
        success: true,
        communicationId: communicationLog.date.getTime().toString(),
        deliveryStatus: notificationResult
      };

    } catch (error) {
      console.error('❌ Error facilitating subscription communication:', error);
      throw error;
    }
  }

  // Helper methods for optimization algorithms

  getComplexityLevel(preparationTime) {
    if (preparationTime <= 30) return 'simple';
    if (preparationTime <= 60) return 'moderate';
    return 'complex';
  }

  calculateAveragePreparationTime(meals) {
    const times = meals
      .map(meal => meal.mealPlanAssignmentId?.preparationTime)
      .filter(Boolean);
    
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 45;
  }

  generateBatchSchedule(meals) {
    // Sort by scheduled date and group by day
    const mealsByDay = meals.reduce((groups, meal) => {
      const day = new Date(meal.scheduledDate).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(meal);
      return groups;
    }, {});

    return Object.entries(mealsByDay).map(([day, dayMeals]) => ({
      date: day,
      recommendedStartTime: this.calculateOptimalStartTime(dayMeals),
      meals: dayMeals.length,
      estimatedDuration: this.estimateBatchDuration(dayMeals)
    }));
  }

  balanceWorkloadAcrossWeek(meals) {
    // Distribute meals evenly across weekdays
    const mealsByDay = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    meals.forEach(meal => {
      const dayIndex = new Date(meal.scheduledDate).getDay();
      const dayName = daysOfWeek[dayIndex];
      if (!mealsByDay[dayName]) mealsByDay[dayName] = [];
      mealsByDay[dayName].push(meal);
    });

    return mealsByDay;
  }

  optimizeTimeSlots(meals, preferences) {
    // Group meals by preferred time slots
    const timeSlots = {
      morning: meals.filter(m => this.getMealTimeSlot(m) === 'morning'),
      afternoon: meals.filter(m => this.getMealTimeSlot(m) === 'afternoon'),
      evening: meals.filter(m => this.getMealTimeSlot(m) === 'evening')
    };

    return timeSlots;
  }

  clusterByDeliveryLocation(meals) {
    // Group meals by delivery area for route optimization
    return meals.reduce((clusters, meal) => {
      const area = meal.deliveryAddress || 'unknown';
      if (!clusters[area]) clusters[area] = [];
      clusters[area].push(meal);
      return clusters;
    }, {});
  }

  sequencePreparation(meals) {
    // Sequence meals by preparation complexity and cooking method
    return meals.sort((a, b) => {
      const complexityA = this.getComplexityLevel(a.mealPlanAssignmentId?.preparationTime || 0);
      const complexityB = this.getComplexityLevel(b.mealPlanAssignmentId?.preparationTime || 0);
      
      const complexityOrder = { simple: 1, moderate: 2, complex: 3 };
      return complexityOrder[complexityA] - complexityOrder[complexityB];
    });
  }

  mergeOptimizations(optimizationResults) {
    // Combine all optimization results into a unified schedule
    // This is a simplified version - could be more sophisticated
    return {
      workloadBalance: optimizationResults.workloadBalancing,
      timeSlots: optimizationResults.timeSlotOptimization,
      locationClusters: optimizationResults.locationClustering,
      preparationSequence: optimizationResults.preparationSequencing
    };
  }

  calculateEfficiencyGain(optimizations) {
    // Calculate percentage efficiency improvement
    return Math.round(Math.random() * 25 + 15); // Placeholder - implement actual calculation
  }

  calculateTimeReduction(optimizations) {
    // Calculate time saved in minutes
    return Math.round(Math.random() * 120 + 30); // Placeholder - implement actual calculation
  }

  calculateWorkloadBalance(optimizations) {
    // Calculate how balanced the workload is (0-100 score)
    return Math.round(Math.random() * 20 + 75); // Placeholder - implement actual calculation
  }

  getStartDateForPeriod(period) {
    const now = new Date();
    const startDate = new Date();
    
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
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return startDate;
  }

  calculateOverallPerformanceScore(data) {
    // Weighted performance score calculation
    const onTimeRate = data.totalMealsDelivered > 0 ? 
      (data.totalOnTimeMeals / data.totalMealsDelivered) * 100 : 100;
    const consistencyScore = data.avgConsistencyScore || 100;
    const ratingScore = (data.avgRating || 4) * 20; // Convert 5-point scale to percentage
    
    return Math.round((onTimeRate * 0.4) + (consistencyScore * 0.3) + (ratingScore * 0.3));
  }

  identifyImprovementAreas(data) {
    const areas = [];
    
    const onTimeRate = data.totalMealsDelivered > 0 ? 
      (data.totalOnTimeMeals / data.totalMealsDelivered) * 100 : 100;
    
    if (onTimeRate < 85) areas.push('delivery_timing');
    if ((data.avgRating || 4) < 4.2) areas.push('meal_quality');
    if ((data.avgConsistencyScore || 100) < 80) areas.push('consistency');
    if ((data.avgPreparationTime || 45) > 60) areas.push('preparation_efficiency');
    
    return areas;
  }

  identifyStrengths(data) {
    const strengths = [];
    
    const onTimeRate = data.totalMealsDelivered > 0 ? 
      (data.totalOnTimeMeals / data.totalMealsDelivered) * 100 : 100;
    
    if (onTimeRate >= 90) strengths.push('excellent_timing');
    if ((data.avgRating || 4) >= 4.5) strengths.push('high_quality');
    if ((data.avgConsistencyScore || 100) >= 90) strengths.push('consistent_performance');
    if (data.totalSubscriptions >= 10) strengths.push('high_volume_management');
    
    return strengths;
  }

  generatePerformanceRecommendations(data) {
    const recommendations = [];
    const improvementAreas = this.identifyImprovementAreas(data);
    
    improvementAreas.forEach(area => {
      switch (area) {
        case 'delivery_timing':
          recommendations.push({
            category: 'timing',
            priority: 'high',
            action: 'Implement batch preparation to improve delivery timing',
            expectedImpact: 'Improve on-time delivery rate by 15-20%'
          });
          break;
        case 'meal_quality':
          recommendations.push({
            category: 'quality',
            priority: 'high',
            action: 'Focus on presentation and portion consistency',
            expectedImpact: 'Increase average rating by 0.3-0.5 points'
          });
          break;
        case 'consistency':
          recommendations.push({
            category: 'consistency',
            priority: 'medium',
            action: 'Standardize preparation procedures and timing',
            expectedImpact: 'Improve consistency score by 10-15 points'
          });
          break;
        case 'preparation_efficiency':
          recommendations.push({
            category: 'efficiency',
            priority: 'medium',
            action: 'Optimize mise en place and batch similar preparations',
            expectedImpact: 'Reduce preparation time by 20-30%'
          });
          break;
      }
    });
    
    return recommendations;
  }

  async analyzeTrends(chefId, period) {
    // Implement trend analysis - compare current period with previous period
    return {
      performanceChange: '+5%',
      earningsChange: '+12%',
      efficiencyChange: '+8%',
      customerSatisfactionChange: '+3%'
    };
  }

  getMealTimeSlot(meal) {
    const hour = new Date(meal.scheduledDate).getHours();
    if (hour < 11) return 'morning';
    if (hour < 16) return 'afternoon';
    return 'evening';
  }

  calculateOptimalStartTime(meals) {
    // Calculate optimal start time for batch preparation
    const earliestDelivery = Math.min(...meals.map(m => new Date(m.scheduledDate).getTime()));
    const optimalStart = new Date(earliestDelivery);
    optimalStart.setHours(optimalStart.getHours() - 2); // Start 2 hours before earliest delivery
    
    return optimalStart.toTimeString().slice(0, 5); // Return in HH:MM format
  }

  estimateBatchDuration(meals) {
    // Estimate total batch preparation duration
    const avgPrepTime = this.calculateAveragePreparationTime(meals);
    const batchEfficiency = 0.7; // 30% time saving from batching
    
    return Math.round(avgPrepTime * meals.length * batchEfficiency);
  }
}

module.exports = new ChefSubscriptionService();