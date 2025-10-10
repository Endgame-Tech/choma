// backend/utils/mealMatchingAlgorithm.js
// Smart meal matching algorithm for custom meal plans

const CustomMeal = require("../models/CustomMeal");

// Health goal nutritional targets
const HEALTH_GOAL_TARGETS = {
  weight_loss: {
    caloriesPerDay: { min: 1200, max: 1800, target: 1500 },
    proteinPercent: 40,
    carbsPercent: 30,
    fatPercent: 30,
    fiberMin: 25, // grams per day
    sugarMax: 50  // grams per day
  },
  muscle_gain: {
    caloriesPerDay: { min: 2200, max: 3000, target: 2600 },
    proteinPercent: 40,
    carbsPercent: 40,
    fatPercent: 20,
    fiberMin: 20,
    sugarMax: 80
  },
  diabetes_management: {
    caloriesPerDay: { min: 1600, max: 2000, target: 1800 },
    proteinPercent: 40,
    carbsPercent: 30,
    fatPercent: 30,
    fiberMin: 30,
    sugarMax: 30
  },
  heart_health: {
    caloriesPerDay: { min: 1800, max: 2200, target: 2000 },
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,
    fiberMin: 25,
    sugarMax: 50
  },
  maintenance: {
    caloriesPerDay: { min: 2000, max: 2400, target: 2200 },
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,
    fiberMin: 25,
    sugarMax: 60
  }
};

/**
 * Main function to generate custom meal plan
 */
async function generateCustomMealPlan(preferences) {
  console.log("🚀 Starting custom meal plan generation...");
  console.log("📋 Preferences:", JSON.stringify(preferences, null, 2));

  // Step 1: Calculate nutritional targets
  const targets = calculateNutritionalTargets(preferences.healthGoal, preferences.mealTypes);
  console.log("🎯 Nutritional targets:", targets);

  // Step 2: Filter meals by hard constraints
  const eligibleMeals = await filterMealsByConstraints(preferences);
  console.log(`✅ Eligible meals after filtering: ${eligibleMeals.length}`);

  if (eligibleMeals.length < 20) {
    throw new Error(
      `Not enough meals match your criteria (found ${eligibleMeals.length}). ` +
      `Try relaxing some restrictions.`
    );
  }

  // Step 3: Score meals based on health goal
  const scoredMeals = scoreMealsByGoal(eligibleMeals, preferences.healthGoal);
  console.log(`📊 Scored ${scoredMeals.length} meals`);

  // Step 4: Generate balanced meal plan
  const mealPlan = generateBalancedPlan(scoredMeals, preferences, targets);
  console.log(`📅 Generated plan with ${mealPlan.length} meal assignments`);

  // Step 5: Ensure variety
  const variedPlan = ensureVariety(mealPlan);
  console.log(`🎨 Applied variety rules`);

  // Step 6: Validate and adjust
  const validatedPlan = validateAndAdjust(variedPlan, targets, scoredMeals);
  console.log(`✓ Validated and adjusted plan`);

  return validatedPlan;
}

/**
 * Step 1: Calculate nutritional targets based on health goal
 */
function calculateNutritionalTargets(healthGoal, mealTypes) {
  const goalTargets = HEALTH_GOAL_TARGETS[healthGoal];
  const mealsPerDay = mealTypes.length;
  const targetCaloriesPerDay = goalTargets.caloriesPerDay.target;
  const targetCaloriesPerMeal = Math.round(targetCaloriesPerDay / mealsPerDay);

  // Calculate macro targets in grams
  const proteinGrams = Math.round((targetCaloriesPerDay * goalTargets.proteinPercent / 100) / 4);
  const carbsGrams = Math.round((targetCaloriesPerDay * goalTargets.carbsPercent / 100) / 4);
  const fatGrams = Math.round((targetCaloriesPerDay * goalTargets.fatPercent / 100) / 9);

  return {
    caloriesPerDay: goalTargets.caloriesPerDay,
    targetCaloriesPerDay,
    targetCaloriesPerMeal,
    mealsPerDay,
    macros: {
      proteinGrams,
      carbsGrams,
      fatGrams
    },
    fiberMin: goalTargets.fiberMin,
    sugarMax: goalTargets.sugarMax
  };
}

/**
 * Step 2: Filter meals by hard constraints
 * NOTE: Now browsing CustomMeal collection (admin-curated combos) instead of DailyMeal
 */
async function filterMealsByConstraints(preferences) {
  let query = {
    status: 'active',
    isAvailableForCustomPlans: true
  };

  // Filter by allergies (MANDATORY - safety first)
  if (preferences.allergies && preferences.allergies.length > 0) {
    query.allergens = { $not: { $elemMatch: { $in: preferences.allergies } } };
  }

  // Filter by dietary restrictions (MANDATORY)
  if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
    // All dietary restrictions must be satisfied
    query.dietaryTags = { $all: preferences.dietaryRestrictions };
  }

  // Fetch custom meals (combo meals created by admin)
  let meals = await CustomMeal.find(query)
    .select('customMealId name category nutrition allergens dietaryTags healthGoals preparationMethod glycemicIndex detailedIngredients pricing')
    .lean();

  console.log(`📦 Found ${meals.length} custom meals after allergy and dietary filtering`);

  // Filter by excluded ingredients
  if (preferences.excludeIngredients && preferences.excludeIngredients.length > 0) {
    meals = meals.filter(meal => {
      if (!meal.detailedIngredients || meal.detailedIngredients.length === 0) {
        return true; // Keep meals without detailed ingredients (assume safe)
      }

      const mealIngredientNames = meal.detailedIngredients.map(
        ing => ing.name.toLowerCase()
      );

      const hasExcludedIngredient = preferences.excludeIngredients.some(
        excluded => mealIngredientNames.includes(excluded.toLowerCase())
      );

      return !hasExcludedIngredient;
    });

    console.log(`🚫 After excluding ingredients: ${meals.length} custom meals remaining`);
  }

  // Filter by health goal compatibility (soft filter - include meals tagged for this goal OR generic meals)
  meals = meals.filter(meal => {
    if (!meal.healthGoals || meal.healthGoals.length === 0) {
      return true; // Include meals without health goal tags (generic meals)
    }
    return meal.healthGoals.includes(preferences.healthGoal);
  });

  console.log(`🎯 After health goal filtering: ${meals.length} custom meals remaining`);

  return meals;
}

/**
 * Step 3: Score meals based on health goal
 */
function scoreMealsByGoal(meals, healthGoal) {
  return meals.map(meal => {
    let score = 0;
    const nutrition = meal.nutrition || {};

    switch (healthGoal) {
      case 'weight_loss':
        // Prefer low-calorie meals
        if (nutrition.calories < 600) score += 10;
        else if (nutrition.calories < 700) score += 5;

        // Prefer high-fiber meals
        if (nutrition.fiber > 7) score += 8;
        else if (nutrition.fiber > 5) score += 5;

        // Avoid fried foods
        if (meal.preparationMethod !== 'fried') score += 8;
        else score -= 5;

        // Prefer low-sugar meals
        if (nutrition.sugar < 10) score += 5;
        else if (nutrition.sugar > 20) score -= 3;

        // Moderate fat
        if (nutrition.fat < 15) score += 5;
        break;

      case 'muscle_gain':
        // Prefer high-protein meals
        if (nutrition.protein > 35) score += 10;
        else if (nutrition.protein > 30) score += 8;
        else if (nutrition.protein > 25) score += 5;

        // Need adequate calories
        if (nutrition.calories > 600) score += 5;
        else if (nutrition.calories < 400) score -= 3;

        // Prefer grilled/baked meats
        if (meal.preparationMethod === 'grilled' || meal.preparationMethod === 'baked') {
          score += 3;
        }

        // High carbs for energy
        if (nutrition.carbs > 50) score += 5;
        break;

      case 'diabetes_management':
        // Low sugar is critical
        if (nutrition.sugar < 10) score += 10;
        else if (nutrition.sugar > 15) score -= 8;

        // High fiber is critical
        if (nutrition.fiber > 7) score += 10;
        else if (nutrition.fiber > 5) score += 5;

        // Prefer low glycemic index
        if (meal.glycemicIndex === 'low') score += 8;
        else if (meal.glycemicIndex === 'high') score -= 5;

        // Avoid fried foods
        if (meal.preparationMethod !== 'fried') score += 5;

        // Moderate calories
        if (nutrition.calories >= 400 && nutrition.calories <= 600) score += 5;
        break;

      case 'heart_health':
        // Low fat is critical
        if (nutrition.fat < 15) score += 10;
        else if (nutrition.fat > 25) score -= 5;

        // High fiber
        if (nutrition.fiber > 7) score += 8;
        else if (nutrition.fiber > 5) score += 5;

        // Avoid fried foods
        if (meal.preparationMethod !== 'fried') score += 10;
        else score -= 8;

        // Prefer steamed or grilled
        if (meal.preparationMethod === 'steamed' || meal.preparationMethod === 'grilled') {
          score += 5;
        }

        // Moderate calories
        if (nutrition.calories >= 400 && nutrition.calories <= 700) score += 5;
        break;

      case 'maintenance':
        // Balanced approach - no extreme preferences
        if (nutrition.calories >= 500 && nutrition.calories <= 800) score += 5;
        if (nutrition.protein >= 20 && nutrition.protein <= 40) score += 3;
        if (nutrition.fiber > 5) score += 3;
        if (meal.preparationMethod !== 'fried') score += 3;
        break;
    }

    // General bonuses for all goals
    if (nutrition.protein > 20) score += 2; // Good protein content
    if (nutrition.fiber > 5) score += 2; // Good fiber content

    return {
      ...meal,
      score
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Step 4: Generate balanced meal plan
 */
function generateBalancedPlan(scoredMeals, preferences, targets) {
  const plan = [];
  const { durationWeeks, mealTypes } = preferences;
  const mealsPerDay = mealTypes.length;

  for (let week = 1; week <= durationWeeks; week++) {
    for (let day = 1; day <= 7; day++) {
      let dailyCalories = 0;
      const targetCaloriesForDay = targets.targetCaloriesPerDay;

      for (let mealType of mealTypes) {
        // Filter meals by category
        const categoryMeals = scoredMeals.filter(m => {
          if (!m.category) return false;
          return m.category.toLowerCase() === mealType.toLowerCase();
        });

        if (categoryMeals.length === 0) {
          console.warn(`⚠️ No ${mealType} meals available for Week ${week}, Day ${day}`);
          continue;
        }

        // Calculate target calories for this meal
        const remainingCalories = targetCaloriesForDay - dailyCalories;
        const targetCaloriesForMeal = remainingCalories / (mealsPerDay - mealTypes.indexOf(mealType));

        // Select best meal that fits calorie budget (with 30% flexibility)
        const selectedMeal = selectBestMeal(
          categoryMeals,
          targetCaloriesForMeal,
          dailyCalories,
          targetCaloriesForDay,
          plan // Pass existing plan to avoid recent repeats
        );

        if (selectedMeal) {
          plan.push({
            weekNumber: week,
            dayOfWeek: day,
            mealTime: mealType,
            mealId: selectedMeal._id,
            meal: selectedMeal,
            customizations: {}
          });

          dailyCalories += selectedMeal.nutrition?.calories || 0;
        }
      }
    }
  }

  return plan;
}

/**
 * Helper: Select best meal for a slot
 */
function selectBestMeal(meals, targetCalories, currentDailyCalories, dailyTarget, existingPlan) {
  const flexibleMin = targetCalories * 0.7;
  const flexibleMax = targetCalories * 1.3;

  // Filter meals that fit the flexible calorie range
  const fittingMeals = meals.filter(meal => {
    const calories = meal.nutrition?.calories || 0;
    const totalWithMeal = currentDailyCalories + calories;

    // Check if meal fits within flexible range and doesn't exceed daily target
    return calories >= flexibleMin &&
           calories <= flexibleMax &&
           totalWithMeal <= (dailyTarget * 1.1); // Allow 10% over daily target
  });

  if (fittingMeals.length === 0) {
    // If no meals fit perfectly, just take the highest scored meal
    return meals[0];
  }

  // Return the highest scored meal that fits
  return fittingMeals[0];
}

/**
 * Step 5: Ensure variety (no meal repeated within 7 days)
 */
function ensureVariety(mealPlan) {
  const adjustedPlan = [];
  const usedMeals = new Map(); // Track when each meal was last used

  mealPlan.forEach((assignment, index) => {
    const mealId = assignment.mealId.toString();
    const currentSlot = index;

    // Check if meal was used in last 21 assignments (7 days × 3 meal types)
    const lookbackWindow = 21;
    const recentAssignments = adjustedPlan.slice(Math.max(0, currentSlot - lookbackWindow));

    const recentlyUsed = recentAssignments.some(a =>
      a.mealId.toString() === mealId
    );

    if (recentlyUsed) {
      // Try to find alternative with similar score and category
      const alternatives = mealPlan
        .filter(a => a.mealTime === assignment.mealTime)
        .filter(a => {
          const altMealId = a.mealId.toString();
          return !recentAssignments.some(ra => ra.mealId.toString() === altMealId);
        });

      if (alternatives.length > 0) {
        // Pick first available alternative
        const alternative = alternatives[0];
        adjustedPlan.push({
          ...assignment,
          mealId: alternative.mealId,
          meal: alternative.meal
        });
        return;
      }
    }

    // If no recent conflict or no alternative, use original
    adjustedPlan.push(assignment);
  });

  return adjustedPlan;
}

/**
 * Step 6: Validate and adjust plan to meet targets
 */
function validateAndAdjust(mealPlan, targets, scoredMeals) {
  // Calculate actual nutritional values
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  const uniqueDays = new Set();

  mealPlan.forEach(assignment => {
    if (assignment.meal && assignment.meal.nutrition) {
      totalCalories += assignment.meal.nutrition.calories || 0;
      totalProtein += assignment.meal.nutrition.protein || 0;
      totalCarbs += assignment.meal.nutrition.carbs || 0;
      totalFat += assignment.meal.nutrition.fat || 0;
      totalFiber += assignment.meal.nutrition.fiber || 0;
    }
    uniqueDays.add(`${assignment.weekNumber}-${assignment.dayOfWeek}`);
  });

  const totalDays = uniqueDays.size;
  const avgCaloriesPerDay = Math.round(totalCalories / totalDays);
  const avgProteinPerDay = Math.round(totalProtein / totalDays);

  console.log("📊 Validation Results:");
  console.log(`  Avg Calories/Day: ${avgCaloriesPerDay} (Target: ${targets.caloriesPerDay.min}-${targets.caloriesPerDay.max})`);
  console.log(`  Avg Protein/Day: ${avgProteinPerDay}g (Target: ${targets.macros.proteinGrams}g)`);

  // Check if adjustments needed
  const caloriesInRange = avgCaloriesPerDay >= targets.caloriesPerDay.min &&
                          avgCaloriesPerDay <= targets.caloriesPerDay.max;

  const proteinDeficit = avgProteinPerDay < (targets.macros.proteinGrams * 0.9); // 10% tolerance

  if (!caloriesInRange || proteinDeficit) {
    console.log("⚠️ Plan needs adjustment");
    // Future: implement swap logic here
    // For now, we'll accept the plan as-is
  } else {
    console.log("✅ Plan meets all targets");
  }

  return mealPlan;
}

module.exports = {
  generateCustomMealPlan,
  calculateNutritionalTargets,
  HEALTH_GOAL_TARGETS
};
