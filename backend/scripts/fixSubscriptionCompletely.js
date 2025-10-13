const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const MealPlan = require("../models/MealPlan");
const MealAssignment = require("../models/MealAssignment");
const DailyMeal = require("../models/DailyMeal");

async function fixSubscriptionCompletely() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database\n");

    // Find the problematic subscription
    const subscription = await Subscription.findOne({
      _id: "68ec1ca816769342f05e24ad",
    })
      .populate("mealPlanId")
      .populate("customer");

    if (!subscription) {
      console.log("❌ Subscription not found");
      return;
    }

    console.log("📋 Found subscription:", subscription._id);
    console.log("   Plan:", subscription.planName);
    console.log(
      "   Customer:",
      subscription.customer?.fullName || subscription.customer
    );

    // STEP 1: Fix the meal plan duration
    const mealPlan = await MealPlan.findById(subscription.mealPlanId);
    if (mealPlan && !mealPlan.duration) {
      console.log("\n🔧 STEP 1: Fixing meal plan duration...");

      // Check if we can calculate from sample meals
      const sampleMealsCount = mealPlan.sampleMeals?.length || 0;
      const assignmentsCount = mealPlan.assignments?.length || 0;
      const weeklyMealsCount = mealPlan.weeklyMeals?.length || 0;

      const calculatedDuration =
        sampleMealsCount || assignmentsCount || weeklyMealsCount || 7; // Default to 7 days

      mealPlan.duration = calculatedDuration;
      await mealPlan.save();

      console.log(`   ✅ Meal plan duration set to ${calculatedDuration} days`);
    } else {
      console.log("\n✅ STEP 1: Meal plan duration already set");
    }

    // STEP 2: Set actualStartDate from delivered order
    const deliveredOrder = await Order.findOne({
      subscription: subscription._id,
      orderStatus: "Delivered",
    }).sort({ actualDelivery: -1 });

    if (deliveredOrder && !subscription.actualStartDate) {
      console.log("\n🔧 STEP 2: Setting actualStartDate...");

      subscription.actualStartDate =
        deliveredOrder.actualDelivery || new Date();
      subscription.firstDeliveryCompleted = true;
      subscription.firstDeliveryCompletedAt =
        deliveredOrder.actualDelivery || new Date();
      subscription.firstDeliveryOrderId = deliveredOrder._id;
      subscription.status = "active";

      await subscription.save();

      console.log(
        `   ✅ actualStartDate set to ${subscription.actualStartDate}`
      );
      console.log(`   ✅ Subscription marked as active`);
    } else {
      console.log("\n✅ STEP 2: actualStartDate already set");
    }

    // STEP 3: Create meal assignments
    console.log("\n🔧 STEP 3: Creating meal assignments...");

    const existingAssignments = await MealAssignment.find({
      subscriptionId: subscription._id,
    });

    if (existingAssignments.length > 0) {
      console.log(
        `   ℹ️  Found ${existingAssignments.length} existing assignments, deleting them...`
      );
      await MealAssignment.deleteMany({ subscriptionId: subscription._id });
    }

    // Get fresh meal plan data
    const freshMealPlan = await MealPlan.findById(
      subscription.mealPlanId
    ).populate("sampleMeals");
    const planDuration = freshMealPlan.duration || 7;

    // Determine meals source (sample meals, assignments, or weekly meals)
    let mealsSource = [];
    if (
      freshMealPlan.sampleMeals &&
      freshMealPlan.sampleMeals.length > 0 &&
      typeof freshMealPlan.sampleMeals[0] === "object"
    ) {
      mealsSource = freshMealPlan.sampleMeals;
      console.log(
        `   📋 Using ${mealsSource.length} sample meals from meal plan`
      );
    } else if (
      freshMealPlan.assignments &&
      freshMealPlan.assignments.length > 0
    ) {
      mealsSource = freshMealPlan.assignments;
      console.log(
        `   📋 Using ${mealsSource.length} assignments from meal plan`
      );
    } else if (
      freshMealPlan.weeklyMeals &&
      freshMealPlan.weeklyMeals.length > 0
    ) {
      mealsSource = freshMealPlan.weeklyMeals;
      console.log(
        `   📋 Using ${mealsSource.length} weekly meals from meal plan`
      );
    }

    // Create DailyMeal documents and MealAssignment documents
    const startDate = new Date(
      subscription.actualStartDate || subscription.startDate
    );
    const createdAssignments = [];

    for (let dayNumber = 1; dayNumber <= planDuration; dayNumber++) {
      const deliveryDate = new Date(startDate);
      deliveryDate.setDate(startDate.getDate() + (dayNumber - 1));

      // Get meal for this day (cycle through available meals)
      const mealIndex = (dayNumber - 1) % mealsSource.length;
      const sourceMeal = mealsSource[mealIndex];

      // Create DailyMeal document
      const dailyMeal = await DailyMeal.create({
        date: deliveryDate,
        dayNumber: dayNumber,
        meals: [
          {
            mealId: sourceMeal._id,
            mealType: "Main",
            quantity: 1,
            portionSize: "Regular",
          },
        ],
      });

      // Create MealAssignment
      const assignment = await MealAssignment.create({
        subscriptionId: subscription._id,
        customerId: subscription.customer,
        dailyMealId: dailyMeal._id,
        deliveryDate: deliveryDate,
        dayNumber: dayNumber,
        status: dayNumber === 1 ? "Delivered" : "Scheduled",
      });

      createdAssignments.push(assignment);
    }

    console.log(`   ✅ Created ${createdAssignments.length} meal assignments`);
    console.log(`   📅 Date range: Day 1 to Day ${planDuration}`);

    // Verify
    console.log("\n🔍 VERIFICATION:");
    const verifyAssignments = await MealAssignment.find({
      subscriptionId: subscription._id,
    })
      .populate({
        path: "dailyMealId",
        populate: {
          path: "meals.mealId",
          select: "title image",
        },
      })
      .sort({ dayNumber: 1 });

    console.log(`   ✅ Total assignments: ${verifyAssignments.length}`);

    if (verifyAssignments.length > 0) {
      console.log(`\n   📋 Sample assignments:`);
      verifyAssignments.slice(0, 3).forEach((a) => {
        console.log(
          `      Day ${a.dayNumber}: ${
            a.dailyMealId?.meals?.[0]?.mealId?.title || "Meal"
          } (${a.deliveryDate.toISOString().split("T")[0]})`
        );
      });
    }

    console.log("\n✅ ALL FIXES APPLIED SUCCESSFULLY!");
    console.log("   - Meal plan duration set");
    console.log("   - actualStartDate configured");
    console.log("   - Meal assignments created");
    console.log("\n🎉 Your TodayMeal screen should now work!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

fixSubscriptionCompletely();
