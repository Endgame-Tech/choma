const MealPlan = require("../models/MealPlan");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Meal = require("../models/DailyMeal");

/**
 * Compiles a complete meal plan snapshot at subscription time
 * This captures all meal plan data, assignments, and meals to ensure
 * data consistency even if the original meal plan is modified later
 *
 * @param {String|ObjectId} mealPlanId - The meal plan ID
 * @param {String|ObjectId} userId - The user ID (for discount calculations)
 * @param {Date} startDate - Subscription start date
 * @param {Date} endDate - Subscription end date
 * @param {Array<String>} selectedMealTypes - Meal types user selected (breakfast, lunch, dinner)
 * @param {Object} discountInfo - Discount information if applied
 * @param {Object} pricingOverrides - Custom pricing overrides
 * @param {Number} userSelectedDurationWeeks - Duration in weeks selected by user (optional, defaults to meal plan duration)
 * @returns {Promise<Object>} Complete meal plan snapshot
 */
async function compileMealPlanSnapshot(
  mealPlanId,
  userId,
  startDate,
  endDate,
  selectedMealTypes = ["lunch"],
  discountInfo = null,
  pricingOverrides = {},
  userSelectedDurationWeeks = null
) {
  try {
    console.log(`📸 Starting meal plan snapshot compilation...`, {
      mealPlanId,
      userId,
      startDate,
      endDate,
      selectedMealTypes,
    });

    // 1. Fetch the meal plan with all details
    const mealPlan = await MealPlan.findById(mealPlanId);
    if (!mealPlan) {
      throw new Error(`Meal plan not found: ${mealPlanId}`);
    }

    console.log(`📋 Found meal plan: ${mealPlan.planName}`);

    // 2. Fetch all meal assignments for this plan
    const assignments = await MealPlanAssignment.find({
      mealPlanId: mealPlan._id,
    })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    console.log(`🍽️ Found ${assignments.length} meal assignments`);

    // 3. Filter assignments based on selected meal types
    const filteredAssignments = assignments.filter((assignment) =>
      selectedMealTypes.includes(assignment.mealTime)
    );

    console.log(
      `✅ Filtered to ${
        filteredAssignments.length
      } assignments based on selected meal types: ${selectedMealTypes.join(
        ", "
      )}`
    );

    // 4. Build the meal schedule array with complete details
    const mealSchedule = [];
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Aggregation variables
    let totalMeals = 0;
    let totalMealsCost = 0;
    let totalChefEarnings = 0;
    let totalChomaEarnings = 0;

    const totalNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    };

    const mealTypeDistribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    const dietaryDistribution = {
      vegan: 0,
      vegetarian: 0,
      pescatarian: 0,
      halal: 0,
      glutenFree: 0,
      dairyFree: 0,
    };

    const complexityDistribution = {
      low: 0,
      medium: 0,
      high: 0,
    };

    const allAllergens = new Set();
    const daysWithMeals = new Set();

    // Process each assignment
    for (const assignment of filteredAssignments) {
      // Track days with meals
      daysWithMeals.add(`${assignment.weekNumber}-${assignment.dayOfWeek}`);

      // Count meal type distribution
      mealTypeDistribution[assignment.mealTime]++;

      // Process meals in this assignment
      const mealsInSlot = [];

      if (assignment.mealIds && assignment.mealIds.length > 0) {
        for (const meal of assignment.mealIds) {
          if (!meal) continue;

          totalMeals++;

          // Compile meal data
          const mealData = {
            mealId: meal._id,
            name: meal.name,
            image: meal.image,
            category: meal.category,

            // Nutrition snapshot
            nutrition: {
              calories: meal.nutrition?.calories || 0,
              protein: meal.nutrition?.protein || 0,
              carbs: meal.nutrition?.carbs || 0,
              fat: meal.nutrition?.fat || 0,
              fiber: meal.nutrition?.fiber || 0,
              sugar: meal.nutrition?.sugar || 0,
              weight: meal.nutrition?.weight || 0,
            },

            // Pricing snapshot
            pricing: {
              cookingCosts: meal.pricing?.cookingCosts || 0,
              packaging: meal.pricing?.packaging || 0,
              platformFee: meal.pricing?.platformFee || 0,
              totalPrice: meal.pricing?.totalPrice || 0,
              chefEarnings: meal.pricing?.chefEarnings || 0,
              chomaEarnings: meal.pricing?.chomaEarnings || 0,
            },

            // Dietary information
            dietaryTags: meal.dietaryTags || [],
            healthGoals: meal.healthGoals || [],
            allergens: meal.allergens || [],
            ingredients: meal.ingredients || "",
            detailedIngredients: meal.detailedIngredients || [],

            // Preparation info
            preparationTime: meal.preparationTime || 0,
            complexityLevel: meal.complexityLevel || "medium",
            preparationMethod: meal.preparationMethod || "",
            glycemicIndex: meal.glycemicIndex || "medium",

            // Customization options
            customizationOptions: meal.customizationOptions || {},
          };

          mealsInSlot.push(mealData);

          // Aggregate nutrition
          totalNutrition.calories += mealData.nutrition.calories;
          totalNutrition.protein += mealData.nutrition.protein;
          totalNutrition.carbs += mealData.nutrition.carbs;
          totalNutrition.fat += mealData.nutrition.fat;
          totalNutrition.fiber += mealData.nutrition.fiber;

          // Aggregate pricing
          totalMealsCost += mealData.pricing.totalPrice;
          totalChefEarnings += mealData.pricing.chefEarnings;
          totalChomaEarnings += mealData.pricing.chomaEarnings;

          // Track dietary distribution
          if (mealData.dietaryTags.includes("vegan"))
            dietaryDistribution.vegan++;
          if (mealData.dietaryTags.includes("vegetarian"))
            dietaryDistribution.vegetarian++;
          if (mealData.dietaryTags.includes("pescatarian"))
            dietaryDistribution.pescatarian++;
          if (mealData.dietaryTags.includes("halal"))
            dietaryDistribution.halal++;
          if (mealData.dietaryTags.includes("gluten-free"))
            dietaryDistribution.glutenFree++;
          if (mealData.dietaryTags.includes("dairy-free"))
            dietaryDistribution.dairyFree++;

          // Track complexity distribution
          complexityDistribution[mealData.complexityLevel]++;

          // Collect allergens
          mealData.allergens.forEach((allergen) => allAllergens.add(allergen));
        }
      }

      // Calculate scheduled delivery date
      // This is a simplified calculation - you may need to adjust based on your delivery logic
      const scheduledDeliveryDate = new Date(startDate);
      const daysToAdd =
        (assignment.weekNumber - 1) * 7 + (assignment.dayOfWeek - 1);
      scheduledDeliveryDate.setDate(
        scheduledDeliveryDate.getDate() + daysToAdd
      );

      // Add to meal schedule
      mealSchedule.push({
        assignmentId: assignment._id,
        weekNumber: assignment.weekNumber,
        dayOfWeek: assignment.dayOfWeek,
        dayName: dayNames[assignment.dayOfWeek - 1],
        mealTime: assignment.mealTime,
        customTitle: assignment.customTitle,
        customDescription: assignment.customDescription || "",
        imageUrl: assignment.imageUrl || "",
        meals: mealsInSlot,
        scheduledDeliveryDate,
        deliveryStatus: "pending",
        notes: assignment.notes || "",
      });
    }

    // 5. Calculate aggregated statistics
    const totalDays = mealPlan.durationWeeks * 7;
    const actualDaysWithMeals = daysWithMeals.size;
    const totalMealSlots = filteredAssignments.length;

    const stats = {
      totalMeals,
      totalMealSlots,
      mealsPerWeek:
        mealPlan.durationWeeks > 0
          ? Math.round(totalMealSlots / mealPlan.durationWeeks)
          : 0,
      totalDays,
      daysWithMeals: actualDaysWithMeals,

      totalNutrition,

      avgNutritionPerMeal: {
        calories:
          totalMeals > 0 ? Math.round(totalNutrition.calories / totalMeals) : 0,
        protein:
          totalMeals > 0 ? Math.round(totalNutrition.protein / totalMeals) : 0,
        carbs:
          totalMeals > 0 ? Math.round(totalNutrition.carbs / totalMeals) : 0,
        fat: totalMeals > 0 ? Math.round(totalNutrition.fat / totalMeals) : 0,
      },

      avgNutritionPerDay: {
        calories:
          actualDaysWithMeals > 0
            ? Math.round(totalNutrition.calories / actualDaysWithMeals)
            : 0,
        protein:
          actualDaysWithMeals > 0
            ? Math.round(totalNutrition.protein / actualDaysWithMeals)
            : 0,
        carbs:
          actualDaysWithMeals > 0
            ? Math.round(totalNutrition.carbs / actualDaysWithMeals)
            : 0,
        fat:
          actualDaysWithMeals > 0
            ? Math.round(totalNutrition.fat / actualDaysWithMeals)
            : 0,
      },

      mealTypeDistribution,
      dietaryDistribution,
      complexityDistribution,
    };

    // 6. Calculate pricing
    const basePlanPrice =
      pricingOverrides.basePlanPrice || mealPlan.totalPrice || 0;
    const frequencyMultiplier = pricingOverrides.frequencyMultiplier || 1;
    const durationMultiplier = pricingOverrides.durationMultiplier || 1;
    const subtotal = basePlanPrice * frequencyMultiplier * durationMultiplier;

    let finalPrice = subtotal;
    let discountAmount = 0;

    // Apply discount if provided
    if (discountInfo && discountInfo.discountPercent > 0) {
      discountAmount = Math.round(
        (subtotal * discountInfo.discountPercent) / 100
      );
      finalPrice = subtotal - discountAmount;
    }

    const pricing = {
      basePlanPrice,
      totalMealsCost,
      frequencyMultiplier,
      durationMultiplier,
      subtotal,
      discountApplied: discountInfo
        ? {
            discountId: discountInfo.discountId || null,
            discountPercent: discountInfo.discountPercent || 0,
            discountAmount,
            reason: discountInfo.reason || "",
            discountType: discountInfo.discountType || "promo",
          }
        : null,
      totalPrice: finalPrice,
      pricePerMeal: totalMeals > 0 ? Math.round(finalPrice / totalMeals) : 0,
      pricePerWeek:
        mealPlan.durationWeeks > 0
          ? Math.round(finalPrice / mealPlan.durationWeeks)
          : finalPrice,
      totalChefEarnings,
      totalChomaEarnings,
    };

    // 7. Compile the complete snapshot
    const snapshot = {
      // Basic plan information
      planId: mealPlan._id,
      planName: mealPlan.planName,
      planDescription: mealPlan.description || "",
      targetAudience: mealPlan.targetAudience || "",
      coverImage: mealPlan.coverImage || mealPlan.planImageUrl || "",
      tier: mealPlan.tier || "Silver",
      isFiveWorkingDays: mealPlan.isFiveWorkingDays || false,

      // Subscription period
      startDate,
      endDate,
      durationWeeks: userSelectedDurationWeeks || mealPlan.durationWeeks,

      // Complete meal schedule
      mealSchedule,

      // Aggregated statistics
      stats,

      // Pricing
      pricing,

      // Plan features
      features: mealPlan.planFeatures || [],

      // Allergen summary
      allergensSummary: Array.from(allAllergens),

      // Metadata
      snapshotCreatedAt: new Date(),
      lastSyncedAt: new Date(),
      isCustomized: false,
    };

    console.log(`✅ Meal plan snapshot compiled successfully:`, {
      planName: snapshot.planName,
      totalMeals: stats.totalMeals,
      totalMealSlots: stats.totalMealSlots,
      totalPrice: pricing.totalPrice,
      durationWeeks: snapshot.durationWeeks,
    });

    return snapshot;
  } catch (error) {
    console.error("❌ Error compiling meal plan snapshot:", error);
    throw error;
  }
}

/**
 * Re-syncs a meal plan snapshot with the latest data
 * Use this when the original meal plan is updated and you want to update
 * subscriptions that haven't started yet
 *
 * @param {Object} existingSnapshot - The existing snapshot to update
 * @param {String|ObjectId} mealPlanId - The meal plan ID
 * @returns {Promise<Object>} Updated meal plan snapshot
 */
async function resyncMealPlanSnapshot(existingSnapshot, mealPlanId) {
  try {
    console.log(`🔄 Re-syncing meal plan snapshot for plan: ${mealPlanId}`);

    // Extract selected meal types from existing schedule
    const selectedMealTypes = [
      ...new Set(existingSnapshot.mealSchedule.map((slot) => slot.mealTime)),
    ];

    // Recompile the snapshot
    const newSnapshot = await compileMealPlanSnapshot(
      mealPlanId,
      null, // userId not needed for resync
      existingSnapshot.startDate,
      existingSnapshot.endDate,
      selectedMealTypes,
      existingSnapshot.pricing.discountApplied,
      {
        basePlanPrice: existingSnapshot.pricing.basePlanPrice,
        frequencyMultiplier: existingSnapshot.pricing.frequencyMultiplier,
        durationMultiplier: existingSnapshot.pricing.durationMultiplier,
      }
    );

    // Update lastSyncedAt
    newSnapshot.lastSyncedAt = new Date();
    newSnapshot.isCustomized = existingSnapshot.isCustomized;

    console.log(`✅ Meal plan snapshot re-synced successfully`);

    return newSnapshot;
  } catch (error) {
    console.error("❌ Error re-syncing meal plan snapshot:", error);
    throw error;
  }
}

/**
 * Updates delivery status for a specific meal slot in the snapshot
 *
 * @param {Object} snapshot - The meal plan snapshot
 * @param {Number} weekNumber - Week number
 * @param {Number} dayOfWeek - Day of week (1-7)
 * @param {String} mealTime - Meal time (breakfast, lunch, dinner)
 * @param {String} status - New delivery status
 * @param {Date} deliveredAt - Delivery timestamp (optional)
 * @returns {Object} Updated snapshot
 */
function updateMealSlotDeliveryStatus(
  snapshot,
  weekNumber,
  dayOfWeek,
  mealTime,
  status,
  deliveredAt = null
) {
  const slot = snapshot.mealSchedule.find(
    (s) =>
      s.weekNumber === weekNumber &&
      s.dayOfWeek === dayOfWeek &&
      s.mealTime === mealTime
  );

  if (slot) {
    slot.deliveryStatus = status;
    if (deliveredAt) {
      slot.deliveredAt = deliveredAt;
    }
  }

  return snapshot;
}

module.exports = {
  compileMealPlanSnapshot,
  resyncMealPlanSnapshot,
  updateMealSlotDeliveryStatus,
};
