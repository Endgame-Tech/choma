// backend/scripts/testCustomMealPlanGeneration.js
// Test script to generate a custom meal plan without authentication

const mongoose = require("mongoose");
const path = require("path");
const CustomMealPlan = require("../models/CustomMealPlan");
const SystemSettings = require("../models/SystemSettings");
const { generateCustomMealPlan } = require("../utils/mealMatchingAlgorithm");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const testCustomMealPlanGeneration = async () => {
  try {
    console.log("🧪 Starting custom meal plan generation test...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MongoDB URI not found");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ Connected to MongoDB\n");

    // Test preferences
    const preferences = {
      healthGoal: "weight_loss",
      dietaryRestrictions: [], // Empty for initial test
      allergies: [],
      excludeIngredients: [],
      mealTypes: ["breakfast", "lunch"],
      durationWeeks: 4
    };

    console.log("📋 Test Preferences:");
    console.log(JSON.stringify(preferences, null, 2));
    console.log("");

    // Get customization fee
    const customizationFeePercent = await SystemSettings.getSetting('CUSTOM_PLAN_FEE_PERCENT') || 15;
    console.log(`💰 Customization Fee: ${customizationFeePercent}%\n`);

    // Generate meal plan
    console.log("🚀 Generating meal plan...\n");
    const mealAssignments = await generateCustomMealPlan(preferences);

    // Create mock user ID for testing
    const testUserId = new mongoose.Types.ObjectId();

    // Create custom meal plan document
    const customPlan = new CustomMealPlan({
      userId: testUserId,
      preferences,
      chefInstructions: "Test plan - please reduce oil",
      mealAssignments: mealAssignments.map(a => ({
        weekNumber: a.weekNumber,
        dayOfWeek: a.dayOfWeek,
        mealTime: a.mealTime,
        mealId: a.mealId,
        customizations: a.customizations || {}
      })),
      status: 'generated'
    });

    // Calculate pricing
    await customPlan.populate('mealAssignments.mealId');
    await customPlan.calculatePricing(customizationFeePercent);

    // Calculate nutrition
    await customPlan.calculateNutritionSummary();

    // Calculate stats
    customPlan.calculateStats();

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("✅ CUSTOM MEAL PLAN GENERATED SUCCESSFULLY");
    console.log("=".repeat(60) + "\n");

    console.log("📊 STATS:");
    console.log(`   Total Meals: ${customPlan.stats.totalMeals}`);
    console.log(`   Breakfast: ${customPlan.stats.breakfastCount} meals`);
    console.log(`   Lunch: ${customPlan.stats.lunchCount} meals`);
    console.log(`   Dinner: ${customPlan.stats.dinnerCount} meals`);
    console.log("");

    console.log("💰 PRICING:");
    console.log(`   Base Meal Cost: ₦${customPlan.pricing.baseMealCost.toLocaleString()}`);
    console.log(`   Customization Fee (${customPlan.pricing.customizationFeePercent}%): ₦${customPlan.pricing.customizationFeeAmount.toLocaleString()}`);
    console.log(`   Total Price: ₦${customPlan.pricing.totalPrice.toLocaleString()}`);
    console.log("");

    console.log("🥗 NUTRITION SUMMARY:");
    console.log(`   Avg Calories/Day: ${customPlan.nutritionSummary.avgCaloriesPerDay} cal`);
    console.log(`   Avg Protein/Day: ${customPlan.nutritionSummary.avgProteinPerDay}g`);
    console.log(`   Avg Carbs/Day: ${customPlan.nutritionSummary.avgCarbsPerDay}g`);
    console.log(`   Avg Fat/Day: ${customPlan.nutritionSummary.avgFatPerDay}g`);
    console.log("");

    console.log("📅 SAMPLE MEALS (Week 1, Day 1):");
    const day1Meals = mealAssignments.filter(a => a.weekNumber === 1 && a.dayOfWeek === 1);
    day1Meals.forEach(assignment => {
      console.log(`   ${assignment.mealTime}: ${assignment.meal.name} (${assignment.meal.nutrition?.calories || 0} cal)`);
    });
    console.log("");

    console.log("💾 Saving to database...");
    await customPlan.save();
    console.log(`✓ Saved as: ${customPlan.customPlanId}\n`);

    console.log("=".repeat(60));
    console.log("✅ TEST COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));

    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
};

// Run the test
testCustomMealPlanGeneration();
