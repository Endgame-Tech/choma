const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const MealAssignment = require('../models/MealAssignment');
const DailyMeal = require('../models/DailyMeal');

class MealAssignmentService {
  /**
   * Generates the full set of MealAssignment records for a new subscription.
   * This should be called after a subscription is successfully created.
   * @param {Object} subscription - The newly created subscription document.
   */
  async generateAssignmentsForSubscription(subscription) {
    try {
      console.log(`🔄 Generating meal assignments for subscription: ${subscription._id}`);

      if (!subscription.mealPlanId) {
        throw new Error('Subscription is missing a mealPlanId.');
      }

      // 1. Get all the MealPlanAssignments for the meal plan.
      const planAssignments = await MealPlanAssignment.find({
        mealPlanId: subscription.mealPlanId,
      }).populate('mealIds');

      if (planAssignments.length === 0) {
        console.warn(`⚠️ No MealPlanAssignments found for meal plan: ${subscription.mealPlanId}. Cannot generate assignments.`);
        return;
      }

      const assignmentsToCreate = [];
      const durationInDays = subscription.durationWeeks * 7;

      // 2. Loop for the duration of the subscription.
      for (let dayIndex = 0; dayIndex < durationInDays; dayIndex++) {
        const dayNumber = dayIndex + 1;

        // Determine the week and day of the week for the template
        const weekNumber = Math.floor(dayIndex / 7) + 1;
        const dayOfWeek = (dayIndex % 7) + 1;

        // 3. Find the corresponding MealPlanAssignment for that day.
        const dailyPlanAssignments = planAssignments.filter(p => p.weekNumber === weekNumber && p.dayOfWeek === dayOfWeek);

        if (dailyPlanAssignments.length > 0) {
          // 4. Create a DailyMeal document.
          const mealsForDay = dailyPlanAssignments.flatMap(dpa => dpa.mealIds.map(meal => ({
            mealId: meal._id,
            name: meal.name,
            image: meal.image,
            nutrition: meal.nutrition,
          })));

          const dailyMeal = new DailyMeal({
            customTitle: dailyPlanAssignments[0].customTitle || `Day ${dayNumber} Meal`,
            image: dailyPlanAssignments[0].imageUrl || dailyPlanAssignments[0].mealIds[0]?.image,
            meals: mealsForDay,
          });
          const savedDailyMeal = await dailyMeal.save();


          // 5. Create the MealAssignment document.
          const deliveryDate = new Date(subscription.startDate);
          deliveryDate.setDate(deliveryDate.getDate() + dayIndex);

          assignmentsToCreate.push({
            subscriptionId: subscription._id,
            dailyMealId: savedDailyMeal._id,
            dayNumber: dayNumber,
            deliveryDate: deliveryDate,
            status: 'pending',
          });
        }
      }

      // 6. Bulk insert all the new assignments.
      if (assignmentsToCreate.length > 0) {
        await MealAssignment.insertMany(assignmentsToCreate);
        console.log(`✅ Successfully generated ${assignmentsToCreate.length} meal assignments for subscription: ${subscription._id}`);
      } else {
        console.log(`ℹ️ No assignments were generated for subscription: ${subscription._id}. Check plan structure.`);
      }

    } catch (error) {
      console.error(`❌ Error generating meal assignments for subscription ${subscription._id}:`, error);
    }
  }
}

module.exports = new MealAssignmentService();
