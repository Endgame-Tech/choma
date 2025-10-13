const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("../models/Subscription");
const MealAssignment = require("../models/MealAssignment");
const DailyMeal = require("../models/DailyMeal");

async function generateMealAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database\n");

    // Find all active subscriptions without meal assignments
    const subscriptions = await Subscription.find({
      status: { $in: ["active", "pending_first_delivery"] },
      paymentStatus: "Paid",
    }).populate("mealPlanId");

    console.log(`📋 Found ${subscriptions.length} paid subscriptions\n`);

    for (const subscription of subscriptions) {
      // Check if assignments already exist
      const existingCount = await MealAssignment.countDocuments({
        subscriptionId: subscription._id,
      });

      if (existingCount > 0) {
        console.log(
          `⏭️  Skipping ${subscription.planName} - already has ${existingCount} assignments`
        );
        continue;
      }

      console.log(`🔧 Generating assignments for: ${subscription.planName}`);
      console.log(`   Subscription ID: ${subscription._id}`);
      console.log(`   Duration: ${subscription.durationWeeks} weeks`);
      console.log(`   Frequency: ${subscription.frequency}`);

      // Calculate start date (use actualStartDate if available)
      const startDate = subscription.actualStartDate
        ? new Date(subscription.actualStartDate)
        : new Date(subscription.startDate);
      startDate.setHours(0, 0, 0, 0);

      console.log(`   Start Date: ${startDate.toISOString().split("T")[0]}`);

      // Get meal plan's daily meals
      if (!subscription.mealPlanId) {
        console.log(`   ❌ No meal plan linked`);
        continue;
      }

      const dailyMeals = await DailyMeal.find({
        mealPlanId: subscription.mealPlanId._id,
      })
        .populate("meals.mealId")
        .sort({ dayNumber: 1 });

      if (dailyMeals.length === 0) {
        console.log(`   ❌ No daily meals found in meal plan`);
        continue;
      }

      console.log(`   ✅ Found ${dailyMeals.length} daily meals`);

      // Create meal assignments for each day
      const assignments = [];
      const totalDays = subscription.durationWeeks * 7;

      for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
        // Find the corresponding daily meal (cycle through if needed)
        const dailyMealIndex = (dayNumber - 1) % dailyMeals.length;
        const dailyMeal = dailyMeals[dailyMealIndex];

        // Calculate delivery date for this day
        const deliveryDate = new Date(startDate);
        deliveryDate.setDate(startDate.getDate() + (dayNumber - 1));

        const assignment = {
          subscriptionId: subscription._id,
          dailyMealId: dailyMeal._id,
          dayNumber: dayNumber,
          scheduledDate: deliveryDate,
          status: "scheduled",
          mealType: subscription.frequency,
          customTitle: `Day ${dayNumber} - ${dailyMeal.title || "Meal"}`,
        };

        assignments.push(assignment);
      }

      // Bulk insert
      const created = await MealAssignment.insertMany(assignments);
      console.log(`   ✅ Created ${created.length} meal assignments\n`);
    }

    console.log("✅ All meal assignments generated!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

generateMealAssignments();
