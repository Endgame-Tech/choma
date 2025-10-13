const Subscription = require("../models/Subscription");
const DailyMeal = require("../models/DailyMeal");
const MealPlan = require("../models/MealPlan");
const MealAssignment = require("../models/MealAssignment");

/**
 * @route GET /api/user/meal-dashboard
 * @desc Get all meal dashboard data in a single optimized request
 * @access Private (requires auth)
 * @returns {Object} Complete dashboard data including:
 *   - activeSubscription: User's active subscription with populated meal plan
 *   - currentMeal: Today's meal assignment
 *   - mealTimeline: 7-day meal progression (past, current, upcoming)
 *   - stats: Quick stats (days completed, meals remaining, etc.)
 */
exports.getMealDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔄 Fetching unified meal dashboard for user:", userId);

    // STEP 1: Get active subscription (with populated meal plan data)
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ["active", "Active", "pending_first_delivery"] },
    })
      .populate({
        path: "mealPlanId",
        select:
          "planName description duration totalPrice basePrice mealsPerDay image planFeatures targetAudience",
      })
      .lean(); // Use lean() for better performance

    if (!activeSubscription) {
      console.log("ℹ️ No active subscription found for user:", userId);
      return res.json({
        hasActiveSubscription: false,
        activeSubscription: null,
        currentMeal: null,
        mealTimeline: [],
        stats: {
          daysCompleted: 0,
          mealsRemaining: 0,
          progress: 0,
        },
      });
    }

    console.log("✅ Found active subscription:", activeSubscription._id);

    // Get subscription state using middleware helper
    const {
      getSubscriptionState,
    } = require("../middleware/subscriptionAccessMiddleware");

    console.log(`🔍 Active subscription before getSubscriptionState:`, {
      id: activeSubscription._id,
      status: activeSubscription.status,
      firstDeliveryCompleted: activeSubscription.firstDeliveryCompleted,
      paymentStatus: activeSubscription.paymentStatus,
      pausedAt: activeSubscription.pausedAt,
    });

    const subscriptionState = getSubscriptionState(activeSubscription);
    console.log(`📱 Subscription state for user:`, subscriptionState);

    // STEP 2: Calculate current day based on actualStartDate (not calendar date)
    const subscriptionId = activeSubscription._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // CRITICAL: Calculate which day of the plan the user is on
    // Use actualStartDate (set after first delivery) to determine current day
    const effectiveStartDate = activeSubscription.actualStartDate
      ? new Date(activeSubscription.actualStartDate)
      : new Date(activeSubscription.startDate);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor(
      (today - effectiveStartDate) / (24 * 60 * 60 * 1000)
    );
    const currentDayNumber = daysSinceStart + 1; // Day 1, Day 2, etc.

    console.log(`📅 Day calculation:`, {
      effectiveStartDate: effectiveStartDate.toISOString(),
      today: today.toISOString(),
      daysSinceStart,
      currentDayNumber,
      usedActualStartDate: !!activeSubscription.actualStartDate,
    });

    // Get meal data from snapshot instead of separate queries
    const mealSchedule =
      activeSubscription.mealPlanSnapshot?.mealSchedule || [];

    console.log("📊 Meal schedule from snapshot:", {
      totalSlots: mealSchedule.length,
      currentDayNumber,
      hasSnapshot: !!activeSubscription.mealPlanSnapshot,
    });

    // Find today's meal from the schedule
    // Calculate which week and day we're on
    const weekNumber = Math.ceil(currentDayNumber / 7);
    const dayOfWeek = ((currentDayNumber - 1) % 7) + 1; // 1=Monday, 7=Sunday

    const currentMealSlot = mealSchedule.find(
      (slot) => slot.weekNumber === weekNumber && slot.dayOfWeek === dayOfWeek
    );

    // Get timeline meals (±3 days around current day)
    const timelineMealSlots = mealSchedule.filter((slot) => {
      const slotDayNumber = (slot.weekNumber - 1) * 7 + slot.dayOfWeek;
      return (
        slotDayNumber >= Math.max(1, currentDayNumber - 3) &&
        slotDayNumber <= currentDayNumber + 3
      );
    });

    console.log("📊 Meals found:", {
      currentMeal: currentMealSlot ? "found" : "not found",
      timelineCount: timelineMealSlots.length,
      weekNumber,
      dayOfWeek,
    });

    // STEP 3: Transform current meal data from snapshot
    const currentMeal = currentMealSlot
      ? transformSnapshotMealSlot(currentMealSlot, today, currentDayNumber)
      : null;

    // STEP 4: Transform timeline data from snapshot
    const mealTimeline = timelineMealSlots.map((slot) => {
      const slotDayNumber = (slot.weekNumber - 1) * 7 + slot.dayOfWeek;
      return transformSnapshotMealSlot(slot, today, slotDayNumber);
    });

    // STEP 5: Calculate stats
    // Get duration from subscription (durationWeeks * 7 days) or mealPlan
    const durationWeeks = activeSubscription.durationWeeks || 1;
    const totalDays = durationWeeks * 7; // Convert weeks to days

    // Use the effectiveStartDate already calculated above (line 76)
    const daysCompleted = daysSinceStart; // Already calculated above
    const daysRemaining = Math.max(0, totalDays - daysCompleted);
    const progress =
      totalDays > 0
        ? Math.min(100, Math.round((daysCompleted / totalDays) * 100))
        : 0;

    console.log("✅ Meal dashboard data prepared successfully");
    console.log(`📊 Stats calculated:`, {
      effectiveStartDate: effectiveStartDate.toISOString(),
      usedActualStartDate: !!activeSubscription.actualStartDate,
      daysCompleted,
      daysRemaining,
      totalDays,
      progress: `${progress}%`,
    });

    // STEP 6: Return unified response
    return res.json({
      hasActiveSubscription: true,
      hasSubscription: true,
      subscriptionState: {
        ...subscriptionState,
        canAccessTodayMeals: subscriptionState.screen === "TodayMealScreen",
      },
      activeSubscription: {
        _id: activeSubscription._id,
        id: activeSubscription._id,
        subscriptionId: activeSubscription._id,
        status: activeSubscription.status,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        planName: activeSubscription.mealPlanId?.planName,
        planImage: activeSubscription.mealPlanId?.image,
        duration: activeSubscription.mealPlanId?.duration,
        mealsPerDay: activeSubscription.mealPlanId?.mealsPerDay,
        totalPrice: activeSubscription.mealPlanId?.totalPrice,
        mealPlanId: activeSubscription.mealPlanId,
        daysRemaining: daysRemaining,
        firstDeliveryCompleted:
          activeSubscription.firstDeliveryCompleted || false,
        firstDeliveryCompletedAt: activeSubscription.firstDeliveryCompletedAt,
        actualStartDate: activeSubscription.actualStartDate,
      },
      currentMeal: currentMeal,
      mealTimeline: mealTimeline,
      stats: {
        daysCompleted: daysCompleted,
        daysRemaining: daysRemaining,
        totalDays: totalDays,
        mealsRemaining:
          daysRemaining * (activeSubscription.mealPlanId?.mealsPerDay || 1),
        progress: progress,
      },
    });
  } catch (error) {
    console.error("❌ Meal dashboard fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meal dashboard data",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Helper function to transform meal assignment data
 * @param {Object} assignment - Meal assignment document
 * @param {Date} today - Today's date for comparison
 * @returns {Object} Transformed meal data
 */
function transformMealAssignment(assignment, today) {
  if (!assignment) return null;

  const assignmentDate = new Date(assignment.deliveryDate);
  assignmentDate.setHours(0, 0, 0, 0);

  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);

  let dayType = "upcoming";
  if (assignmentDate < todayDate) dayType = "past";
  if (assignmentDate.getTime() === todayDate.getTime()) dayType = "current";

  const dailyMeal = assignment.dailyMealId;

  // Extract meal data
  const meals =
    dailyMeal?.meals?.map((mealEntry) => ({
      title: mealEntry.mealId?.title || mealEntry.title || "Meal",
      name: mealEntry.mealId?.title || mealEntry.title || "Meal",
      description: mealEntry.mealId?.description || "",
      imageUrl: mealEntry.mealId?.image || mealEntry.image,
      image: mealEntry.mealId?.image || mealEntry.image,
      calories:
        mealEntry.mealId?.nutrition?.calories || mealEntry.nutrition?.calories,
      nutrition: mealEntry.mealId?.nutrition ||
        mealEntry.nutrition || { calories: 0 },
    })) || [];

  return {
    _id: assignment._id,
    assignmentId: assignment._id,
    dayIndex: assignment.dayIndex,
    deliveryDate: assignment.deliveryDate,
    date: assignment.deliveryDate,
    dayType: dayType,
    isToday: dayType === "current",
    customTitle: dailyMeal?.customTitle || meals[0]?.title || "Daily Meal",
    dayTitle: dailyMeal?.customTitle || `Day ${assignment.dayIndex}`,
    imageUrl: dailyMeal?.image || meals[0]?.imageUrl,
    image: dailyMeal?.image || meals[0]?.imageUrl,
    meals: meals,
    status: assignment.status || "pending",
  };
}

// Transform meal slot from snapshot (new function for snapshot-based system)
function transformSnapshotMealSlot(slot, today, dayNumber) {
  if (!slot) return null;

  // Calculate delivery date for this slot
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);

  let dayType = "upcoming";
  if (dayNumber < 1) dayType = "past";
  if (dayNumber === 1) dayType = "current";

  // Extract meals from slot
  const meals =
    slot.meals?.map((meal) => ({
      _id: meal.mealId,
      title: meal.name || "Meal",
      name: meal.name || "Meal",
      description: meal.description || "",
      imageUrl: meal.image,
      image: meal.image,
      calories: meal.nutrition?.calories || 0,
      nutrition: meal.nutrition || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    })) || [];

  return {
    _id: slot.assignmentId || slot._id,
    assignmentId: slot.assignmentId,
    weekNumber: slot.weekNumber,
    dayOfWeek: slot.dayOfWeek,
    dayNumber: dayNumber,
    dayName: slot.dayName,
    mealTime: slot.mealTime,
    date: slot.scheduledDeliveryDate,
    deliveryDate: slot.scheduledDeliveryDate,
    dayType: dayType,
    isToday: dayNumber === 1, // Day 1 is "today" after first delivery
    customTitle:
      slot.customTitle ||
      meals[0]?.title ||
      `Day ${dayNumber} ${slot.mealTime}`,
    dayTitle: slot.customTitle || `Day ${dayNumber}`,
    imageUrl: slot.imageUrl || meals[0]?.imageUrl,
    image: slot.imageUrl || meals[0]?.imageUrl,
    mealImage: slot.imageUrl || meals[0]?.imageUrl,
    meals: meals,
    status: slot.deliveryStatus || "scheduled",
  };
}
