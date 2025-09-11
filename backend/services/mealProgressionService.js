const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');

/**
 * Meal Plan Progression Service
 * Handles meal plan progression logic for subscriptions
 * Manages current meal display and next meal advancement
 */
class MealProgressionService {
  
  /**
   * Get current meal assignment for a subscription
   * @param {string} subscriptionId - The subscription ID
   * @returns {Object} Current meal assignment with details
   */
  async getCurrentMeal(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('mealPlanId');
        
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // If subscription is not activated, return first meal
      if (!subscription.recurringDelivery.isActivated) {
        return this.getFirstMeal(subscription);
      }
      
      // Get current meal based on progression
      const { weekNumber, dayOfWeek, mealTime } = subscription.recurringDelivery.currentMealProgression;
      
      const mealAssignment = await MealPlanAssignment.findOne({
        mealPlanId: subscription.mealPlanId,
        weekNumber,
        dayOfWeek,
        mealTime
      }).populate('mealIds');
      
      if (!mealAssignment) {
        // If no assignment found, try to get next available meal
        return this.getNextAvailableMeal(subscription);
      }
      
      return await this.formatMealResponse(mealAssignment, subscription, {
        isCurrentMeal: true,
        progressionInfo: { weekNumber, dayOfWeek, mealTime }
      });
      
    } catch (error) {
      console.error('❌ Error getting current meal:', error);
      throw error;
    }
  }
  
  /**
   * Get the first meal of a meal plan (for new subscriptions)
   * @param {Object} subscription - Subscription document
   * @returns {Object} First meal assignment
   */
  async getFirstMeal(subscription) {
    const firstMealTime = subscription.selectedMealTypes?.[0] || 'lunch';
    
    const firstMealAssignment = await MealPlanAssignment.findOne({
      mealPlanId: subscription.mealPlanId,
      weekNumber: 1,
      dayOfWeek: 1,
      mealTime: firstMealTime
    }).populate('mealIds');
    
    if (!firstMealAssignment) {
      throw new Error('No meals found in meal plan');
    }
    
    return await this.formatMealResponse(firstMealAssignment, subscription, {
      isFirstMeal: true,
      progressionInfo: { weekNumber: 1, dayOfWeek: 1, mealTime: firstMealTime }
    });
  }
  
  /**
   * Advance subscription to next meal after delivery completion
   * @param {string} subscriptionId - The subscription ID
   * @returns {Object} Next meal assignment
   */
  async advanceToNextMeal(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('mealPlanId');
        
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // Update last delivered meal info
      subscription.recurringDelivery.lastDeliveredMeal = {
        assignmentId: subscription.recurringDelivery.currentMealProgression.assignmentId,
        deliveredAt: new Date(),
        weekNumber: subscription.recurringDelivery.currentMealProgression.weekNumber,
        dayOfWeek: subscription.recurringDelivery.currentMealProgression.dayOfWeek
      };
      
      // Calculate next meal progression
      const nextProgression = await this.calculateNextMealProgression(subscription);
      
      // Update subscription with next meal
      subscription.recurringDelivery.currentMealProgression = nextProgression;
      
      // Schedule next delivery if needed
      await this.scheduleNextDelivery(subscription, nextProgression);
      
      await subscription.save();
      
      // Get the next meal assignment
      return this.getCurrentMeal(subscriptionId);
      
    } catch (error) {
      console.error('❌ Error advancing to next meal:', error);
      throw error;
    }
  }
  
  /**
   * Calculate next meal progression based on current state
   * @param {Object} subscription - Subscription document
   * @returns {Object} Next meal progression
   */
  async calculateNextMealProgression(subscription) {
    const { weekNumber, dayOfWeek, mealTime } = subscription.recurringDelivery.currentMealProgression;
    const mealTypes = subscription.selectedMealTypes || ['lunch'];
    const plan = subscription.mealPlanId;
    
    let nextWeek = weekNumber;
    let nextDay = dayOfWeek;
    let nextMealTime = mealTime;
    
    // Find next meal time for current day
    const currentMealIndex = mealTypes.indexOf(mealTime);
    if (currentMealIndex < mealTypes.length - 1) {
      // Move to next meal time same day
      nextMealTime = mealTypes[currentMealIndex + 1];
    } else {
      // Move to first meal of next delivery day
      nextMealTime = mealTypes[0];
      const deliveryDays = subscription.recurringDelivery.deliverySchedule?.daysOfWeek || [1, 2, 3, 4, 5]; // Default weekdays
      
      // Find next delivery day
      const currentDayIndex = deliveryDays.indexOf(dayOfWeek);
      if (currentDayIndex < deliveryDays.length - 1) {
        nextDay = deliveryDays[currentDayIndex + 1];
      } else {
        // Move to next week, first delivery day
        nextDay = deliveryDays[0];
        nextWeek += 1;
        
        // If exceeded plan duration, restart cycle
        if (nextWeek > plan.durationWeeks) {
          nextWeek = 1;
        }
      }
    }
    
    return {
      weekNumber: nextWeek,
      dayOfWeek: nextDay,
      mealTime: nextMealTime
    };
  }
  
  /**
   * Get next available meal if current progression is invalid
   * @param {Object} subscription - Subscription document
   * @returns {Object} Next available meal assignment
   */
  async getNextAvailableMeal(subscription) {
    const mealTypes = subscription.selectedMealTypes || ['lunch'];
    const plan = subscription.mealPlanId;
    
    // Try to find any available meal assignment in the plan
    for (let week = 1; week <= plan.durationWeeks; week++) {
      for (let day = 1; day <= 7; day++) {
        for (const mealType of mealTypes) {
          const assignment = await MealPlanAssignment.findOne({
            mealPlanId: plan._id,
            weekNumber: week,
            dayOfWeek: day,
            mealTime: mealType
          }).populate('mealIds');
          
          if (assignment) {
            // Update subscription progression
            subscription.recurringDelivery.currentMealProgression = {
              weekNumber: week,
              dayOfWeek: day,
              mealTime: mealType
            };
            await subscription.save();
            
            return await this.formatMealResponse(assignment, subscription, {
              isRecoveredMeal: true,
              progressionInfo: { weekNumber: week, dayOfWeek: day, mealTime: mealType }
            });
          }
        }
      }
    }
    
    throw new Error('No available meals found in meal plan');
  }
  
  /**
   * Schedule next delivery based on meal progression
   * @param {Object} subscription - Subscription document
   * @param {Object} progression - Next meal progression
   */
  async scheduleNextDelivery(subscription, progression) {
    const deliveryFrequency = subscription.deliveryPreferences?.frequency || 'daily';
    const timeSlot = subscription.recurringDelivery.deliverySchedule?.timeSlot || 'afternoon';
    
    let nextDeliveryDate = new Date();
    
    // Calculate next delivery date based on frequency
    switch (deliveryFrequency) {
      case 'daily':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
        break;
      case 'weekly':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
        break;
      case 'bi-weekly':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 14);
        break;
      default:
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    }
    
    // Set delivery time based on time slot
    const timeRanges = {
      morning: { start: '08:00', end: '10:00' },
      afternoon: { start: '12:00', end: '14:00' },
      evening: { start: '17:00', end: '19:00' },
      custom: subscription.recurringDelivery.deliverySchedule?.customTimeRange || { start: '12:00', end: '14:00' }
    };
    
    const selectedRange = timeRanges[timeSlot];
    
    // Find meal assignment for next delivery
    const nextMealAssignment = await MealPlanAssignment.findOne({
      mealPlanId: subscription.mealPlanId,
      weekNumber: progression.weekNumber,
      dayOfWeek: progression.dayOfWeek,
      mealTime: progression.mealTime
    });
    
    subscription.recurringDelivery.nextScheduledDelivery = {
      date: nextDeliveryDate,
      assignmentId: nextMealAssignment?._id,
      estimatedTime: `${selectedRange.start}-${selectedRange.end}`
    };
  }
  
  /**
   * Format meal assignment response with additional context
   * @param {Object} mealAssignment - Meal plan assignment
   * @param {Object} subscription - Subscription document
   * @param {Object} options - Additional options
   * @returns {Object} Formatted meal response
   */
  async formatMealResponse(mealAssignment, subscription, options = {}) {
    const mealDetails = mealAssignment.mealIds.map(meal => ({
      id: meal._id,
      name: meal.name,
      description: meal.description,
      image: meal.image,
      nutrition: meal.nutrition,
      preparationTime: meal.preparationTime,
      ingredients: meal.ingredients
    }));
    
    const totalMealsInPlan = await this.getTotalMealsInPlan(subscription.mealPlanId._id);
    
    return {
      assignmentId: mealAssignment._id,
      customTitle: mealAssignment.customTitle,
      customDescription: mealAssignment.customDescription,
      imageUrl: mealAssignment.imageUrl,
      mealTime: mealAssignment.mealTime,
      weekNumber: mealAssignment.weekNumber,
      dayOfWeek: mealAssignment.dayOfWeek,
      meals: mealDetails,
      
      // Context information
      subscriptionInfo: {
        subscriptionId: subscription._id,
        isActivated: subscription.recurringDelivery.isActivated,
        currentStatus: subscription.status,
        nextDelivery: subscription.recurringDelivery.nextScheduledDelivery
      },
      
      // Progression context
      progressionContext: {
        isFirstMeal: options.isFirstMeal || false,
        isCurrentMeal: options.isCurrentMeal || false,
        isRecoveredMeal: options.isRecoveredMeal || false,
        totalMealsInPlan,
        completedMeals: subscription.metrics?.totalMealsDelivered || 0
      },
      
      // Additional options
      ...options
    };
  }
  
  /**
   * Get total number of meals in a plan
   * @param {string} mealPlanId - Meal plan ID
   * @returns {number} Total meals count
   */
  async getTotalMealsInPlan(mealPlanId) {
    return await MealPlanAssignment.countDocuments({ mealPlanId });
  }
  
  /**
   * Get meal progression timeline for subscription grouped by day
   * @param {string} subscriptionId - Subscription ID
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Array} Timeline of upcoming meals grouped by day
   */
  async getMealProgressionTimeline(subscriptionId, daysAhead = 7) {
    try {
      console.log('🔍 Getting meal timeline for subscription:', subscriptionId);
      
      const subscription = await Subscription.findById(subscriptionId)
        .populate('mealPlanId');
        
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      const assignments = await MealPlanAssignment.find({ 
        mealPlanId: subscription.mealPlanId._id 
      })
      .populate({
        path: 'mealIds',
        match: { isActive: true }
      })
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });
      
      console.log(`📊 Found ${assignments.length} MealPlanAssignment records`);
      
      if (assignments.length === 0) {
        console.log('❌ No meal assignments found');
        return [];
      }
      
      // Organize meals by week and day
      const organizeScheduleByWeek = (assignments) => {
        const schedule = {};
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        assignments.forEach(assignment => {
          const weekKey = `week${assignment.weekNumber}`;
          if (!schedule[weekKey]) {
            schedule[weekKey] = {};
          }
          const dayName = dayNames[assignment.dayOfWeek - 1];
          if (!schedule[weekKey][dayName]) {
            schedule[weekKey][dayName] = {};
          }
          
          schedule[weekKey][dayName][assignment.mealTime] = {
            title: assignment.customTitle,
            description: assignment.customDescription || (assignment.mealIds[0] ? assignment.mealIds[0].description : ''),
            meals: assignment.mealIds.map(meal => meal?.name || '').join(', '),
            imageUrl: assignment.imageUrl || (assignment.mealIds[0] ? assignment.mealIds[0].image : '')
          };
        });
        return schedule;
      };
      
      const weeklyMeals = organizeScheduleByWeek(assignments);
      console.log('✅ Generated weeklyMeals structure with', Object.keys(weeklyMeals).length, 'weeks');
      
      // Initialize progression if not set
      if (!subscription.recurringDelivery || !subscription.recurringDelivery.currentMealProgression) {
        console.log('⚠️ No meal progression set, initializing defaults');
        subscription.recurringDelivery = subscription.recurringDelivery || {};
        subscription.recurringDelivery.currentMealProgression = {
          weekNumber: 1,
          dayOfWeek: 1,
          mealTime: subscription.selectedMealTypes?.[0] || 'lunch'
        };
        await subscription.save();
      }
      
      const timeline = [];
      const selectedMealTypes = subscription.selectedMealTypes || ['lunch'];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let currentProgression = { ...subscription.recurringDelivery.currentMealProgression };
      
      console.log('🎯 Starting progression:', currentProgression);
      console.log('🍽️ Selected meal types:', selectedMealTypes);
      
      for (let i = 0; i < daysAhead; i++) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + i);
        
        const weekKey = `week${currentProgression.weekNumber}`;
        const dayName = dayNames[currentProgression.dayOfWeek - 1];
        const weekData = weeklyMeals[weekKey];
        const dayData = weekData?.[dayName];
        
        console.log(`🔍 Day ${i + 1}: Checking ${weekKey} > ${dayName}`);
        
        // Check if this day has any meals for the selected meal types
        const dayMeals = [];
        let hasMeals = false;
        
        selectedMealTypes.forEach(mealType => {
          const mealData = dayData?.[mealType];
          if (mealData && mealData.title) {
            hasMeals = true;
            dayMeals.push({
              mealTime: mealType,
              title: mealData.title,
              description: mealData.description,
              meals: mealData.meals,
              imageUrl: mealData.imageUrl
            });
          }
        });
        
        // Only add days that have meal assignments
        if (hasMeals) {
          console.log(`✅ Found ${dayMeals.length} meals for ${dayName}`);
          
          timeline.push({
            date: deliveryDate,
            dayIndex: i,
            dayName: dayName,
            weekNumber: currentProgression.weekNumber,
            dayOfWeek: currentProgression.dayOfWeek,
            meals: dayMeals,
            // Summary info for the day
            dayTitle: `${dayName} - Week ${currentProgression.weekNumber}`,
            mealCount: dayMeals.length,
            // Primary image (use first meal's image)
            imageUrl: dayMeals[0]?.imageUrl || null
          });
        } else {
          console.log(`⚠️ No meals found for ${dayName} - skipping day`);
        }
        
        // Advance to next day
        currentProgression.dayOfWeek = currentProgression.dayOfWeek % 7 + 1;
        if (currentProgression.dayOfWeek === 1) {
          currentProgression.weekNumber++;
          // Cycle back to week 1 if exceeded plan duration
          if (currentProgression.weekNumber > subscription.mealPlanId.durationWeeks) {
            currentProgression.weekNumber = 1;
          }
        }
      }
      
      console.log(`✅ Generated timeline with ${timeline.length} days (only showing days with meals)`);
      return timeline;
      
    } catch (error) {
      console.error('❌ Error getting meal progression timeline:', error);
      throw error;
    }
  }
  
  /**
   * Check if meal can be skipped
   * @param {string} subscriptionId - Subscription ID
   * @param {Date} skipDate - Date to skip
   * @param {string} reason - Skip reason
   * @returns {boolean} Whether skip was successful
   */
  async skipMeal(subscriptionId, skipDate, reason = 'Customer request') {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // Add to skipped days
      subscription.recurringDelivery.skippedDays.push({
        date: new Date(skipDate),
        reason,
        skippedBy: 'customer'
      });
      
      // If skipping today's meal, advance to next
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const skipDateObj = new Date(skipDate);
      skipDateObj.setHours(0, 0, 0, 0);
      
      if (skipDateObj.getTime() === today.getTime()) {
        await this.advanceToNextMeal(subscriptionId);
      }
      
      await subscription.save();
      return true;
      
    } catch (error) {
      console.error('❌ Error skipping meal:', error);
      throw error;
    }
  }
}

module.exports = new MealProgressionService();