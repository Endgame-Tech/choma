import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import apiService from "../../services/api";

const { width } = Dimensions.get("window");

const SubscriptionCard = ({ subscription, onPress, onMenuPress }) => {
  const [currentMeal, setCurrentMeal] = useState(null);
  const [chefStatus, setChefStatus] = useState(null);
  const [nextDelivery, setNextDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  // Early return if subscription is invalid
  if (!subscription || !subscription._id) {
    console.warn(
      "⚠️ SubscriptionCard received invalid subscription:",
      subscription
    );
    return null;
  }

  // Debug subscription data structure
  console.log("🔍 SubscriptionCard received subscription data:", {
    id: subscription._id,
    status: subscription.status,
    startDate: subscription.startDate,
    createdAt: subscription.createdAt,
    mealPlanId: subscription.mealPlanId,
    planName: subscription.planName,
  });

  useEffect(() => {
    if (subscription?._id) {
      loadSubscriptionDetails();
    }
  }, [subscription._id]);

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true);

      // Calculate current meal from subscription data directly since API methods may not exist
      const currentMealData = calculateCurrentMeal();
      if (currentMealData) {
        setCurrentMeal(currentMealData);
      }

      // Set default chef status based on subscription status
      setChefStatus({
        status: subscription.status === "active" ? "preparing" : "scheduled",
        estimatedReadyTime: subscription.nextDelivery || null,
      });

      // Set next delivery from subscription data
      if (subscription.nextDelivery) {
        setNextDelivery({
          date: subscription.nextDelivery,
          estimatedTime: "12:00 PM", // Default delivery time
        });
      }

      // Try to get more detailed data if API methods are available
      try {
        const mealResult = await apiService.getSubscriptionCurrentMeal(
          subscription._id
        );
        if (mealResult?.success && mealResult.data) {
          // Merge API data with our calculated data to ensure no undefined values
          const mergedMealData = {
            ...currentMealData, // Use calculated data as base
            ...mealResult.data, // Override with API data where available
            weekNumber:
              mealResult.data.weekNumber || currentMealData.weekNumber,
            dayOfWeek: mealResult.data.dayOfWeek || currentMealData.dayOfWeek,
            meals: mealResult.data.meals || currentMealData.meals,
          };
          setCurrentMeal(mergedMealData);
        }
      } catch (error) {
        console.log("Current meal API not available, using calculated data");
      }

      try {
        const statusResult = await apiService.getSubscriptionChefStatus(
          subscription._id
        );
        if (statusResult?.success && statusResult.data) {
          setChefStatus(statusResult.data);
        }
      } catch (error) {
        console.log("Chef status API not available, using default");
      }

      try {
        const deliveryResult = await apiService.getSubscriptionNextDelivery(
          subscription._id
        );
        if (deliveryResult?.success && deliveryResult.data) {
          setNextDelivery(deliveryResult.data);
        }
      } catch (error) {
        console.log("Next delivery API not available, using subscription data");
      }
    } catch (error) {
      console.error("Error loading subscription details:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentMeal = () => {
    if (!subscription) return null;

    // Calculate current subscription day
    const today = new Date();
    const startDate = new Date(
      subscription.startDate || subscription.createdAt || today
    );

    // Ensure we have a valid start date
    if (isNaN(startDate.getTime())) {
      console.warn("Invalid start date for subscription, using today");
      startDate.setTime(today.getTime());
    }

    const daysDiff = Math.max(
      0,
      Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    );
    const currentDay = Math.max(1, daysDiff + 1);
    const currentWeek = Math.max(1, Math.ceil(currentDay / 7));
    const dayInWeek = Math.max(1, ((currentDay - 1) % 7) + 1);

    // Try to get meal data from mealPlanId if available
    const mealPlan = subscription.mealPlanId;
    const planName =
      mealPlan?.planName ||
      mealPlan?.name ||
      subscription.planName ||
      "FitFam Fuel";

    // Get day names for meal lookup
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const dayName = dayNames[dayInWeek - 1];

    // Note: weeklyMeals structure is accessed in helper functions

    // Determine current meal time based on time of day
    const currentHour = today.getHours();
    let mealTime = "lunch";
    if (currentHour < 11) {
      mealTime = "breakfast";
    } else if (currentHour >= 18) {
      mealTime = "dinner";
    }

    // Helper function to get specific meal assignment from weeklyMeals structure
    const getMealAssignment = (mealType) => {
      // Look in the organized weekly schedule for the assignment
      const weeklyMeals = mealPlan?.weeklyMeals || {};
      const currentWeekMeals = weeklyMeals[`week${currentWeek}`] || {};
      const todaysMeals = currentWeekMeals[dayName] || {};

      // Get the assignment for the specific meal type
      const assignment = todaysMeals[mealType.toLowerCase()];

      console.log(`🍽️ Looking for ${mealType} assignment:`, {
        week: `week${currentWeek}`,
        day: dayName,
        mealType: mealType.toLowerCase(),
        assignment,
        hasImageUrl: !!assignment?.imageUrl,
        imageUrl: assignment?.imageUrl,
      });

      return assignment;
    };

    // Helper function to get specific meal image
    const getMealImage = (mealType) => {
      const assignment = getMealAssignment(mealType);

      // Use the assignment's imageUrl if available
      if (assignment?.imageUrl) {
        console.log(
          `✅ Found assignment image for ${mealType}:`,
          assignment.imageUrl
        );
        return { uri: assignment.imageUrl };
      }

      // Fallback to meal plan image if specific meal image not found
      if (mealPlan?.planImageUrl || mealPlan?.image || mealPlan?.coverImage) {
        const fallbackImage =
          mealPlan.planImageUrl || mealPlan.image || mealPlan.coverImage;
        console.log(
          `⚠️ Using fallback meal plan image for ${mealType}:`,
          fallbackImage
        );
        return { uri: fallbackImage };
      }

      console.log(`❌ No image found for ${mealType}, using default`);
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    };

    // Helper function to get meal name
    const getMealName = (mealType) => {
      const assignment = getMealAssignment(mealType);

      // Use the assignment's custom title if available
      if (assignment?.title) {
        return assignment.title;
      }

      // Fallback to capitalized meal type
      const capitalizedMealType =
        mealType.charAt(0).toUpperCase() + mealType.slice(1);
      return `${capitalizedMealType} meal`;
    };

    // Helper function to get meal calories
    const getMealCalories = (mealType) => {
      const assignment = getMealAssignment(mealType);

      // Try to get calories from assignment or meal data
      if (assignment?.calories) {
        return assignment.calories;
      }

      // If assignment has meals info, try to calculate calories
      if (assignment?.meals && typeof assignment.meals === "object") {
        // This would need to be implemented based on your meal structure
        // For now, return null since we don't have direct calorie data
      }

      return null;
    };

    const currentMealName = getMealName(mealTime);
    const currentMealCalories = getMealCalories(mealTime);
    const currentMealImage = getMealImage(mealTime);

    // Debug logging
    console.log("🍽️ SubscriptionCard calculateCurrentMeal:", {
      subscriptionId: subscription._id,
      startDate: subscription.startDate,
      createdAt: subscription.createdAt,
      calculatedStartDate: startDate.toISOString(),
      daysDiff,
      currentDay,
      currentWeek,
      dayInWeek,
      dayName,
      mealTime,
      currentMealName,
      currentMealCalories,
      planName,
    });

    return {
      customTitle:
        currentMealName ||
        `${planName} ${mealTime.charAt(0).toUpperCase() + mealTime.slice(1)}`,
      customDescription: `Week ${currentWeek}, Day ${dayInWeek}`,
      weekNumber: currentWeek,
      dayOfWeek: dayInWeek,
      mealTime: mealTime,
      calories: currentMealCalories,
      meals: [
        {
          name:
            currentMealName ||
            `${mealTime.charAt(0).toUpperCase() + mealTime.slice(1)} meal`,
          calories: currentMealCalories,
        },
      ],
      imageUrl: currentMealImage,
    };
  };

  const calculateProgress = () => {
    // Calculate progress based on subscription data
    const completedMeals = subscription.metrics?.completedMeals || 0;

    // Get duration and meals per week values
    const durationWeeks =
      subscription.mealPlanId?.durationWeeks ||
      subscription.duration?.replace(" weeks", "") ||
      4; // Default to 4 weeks
    const mealsPerWeek =
      subscription.mealPlanId?.mealsPerWeek || subscription.mealsPerWeek || 21; // Default to 21 meals per week (3 meals × 7 days)

    // Calculate total meals based on subscription plan
    let totalMeals = subscription.metrics?.totalMeals || 0;

    // If no metrics available, calculate from subscription data
    if (totalMeals === 0) {
      totalMeals = parseInt(durationWeeks) * parseInt(mealsPerWeek);
    }

    // Calculate current progress based on subscription day
    const today = new Date();
    const startDate = new Date(
      subscription.startDate || subscription.createdAt || today
    );
    const daysDiff = Math.max(
      0,
      Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    );
    const currentDay = Math.max(1, daysDiff + 1);

    // Estimate completed meals based on current day (3 meals per day)
    const estimatedCompleted = Math.min(
      Math.floor((currentDay - 1) * 3),
      totalMeals
    );
    const actualCompleted = Math.max(completedMeals, estimatedCompleted);

    const percentage =
      totalMeals > 0 ? Math.min(100, (actualCompleted / totalMeals) * 100) : 0;

    console.log("📊 SubscriptionCard progress calculation:", {
      subscriptionId: subscription._id,
      durationWeeks,
      mealsPerWeek,
      totalMeals,
      currentDay,
      estimatedCompleted,
      actualCompleted,
      percentage,
    });

    return {
      completed: actualCompleted,
      total: totalMeals,
      percentage: Math.round(percentage),
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "preparing":
        return "#FF9500";
      case "ready":
        return "#34C759";
      case "out_for_delivery":
        return "#007AFF";
      case "delivered":
        return "#28A745";
      case "scheduled":
        return "#6C757D";
      default:
        return "#6C757D";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "preparing":
        return "Chef is cooking";
      case "ready":
        return "Ready for pickup";
      case "out_for_delivery":
        return "Out for delivery";
      case "delivered":
        return "Delivered";
      case "scheduled":
        return "Meal scheduled";
      case "active":
        return "Subscription active";
      case "paid":
        return "Meal scheduled";
      default:
        return "Preparing meal";
    }
  };

  const formatDeliveryTime = (timeString) => {
    if (!timeString) return "";
    try {
      const time = new Date(timeString);
      return time.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading today's meal...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#4A90E2", "#357ABD"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Today's Meal</Text>
            <Text style={styles.subtitle}>
              {subscription.mealPlanId?.planName || subscription.planName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => onMenuPress && onMenuPress(subscription)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Current Meal Display */}
        <View style={styles.mealSection}>
          {currentMeal ? (
            <>
              <View style={styles.mealHeader}>
                <Image
                  source={
                    currentMeal.imageUrl &&
                    typeof currentMeal.imageUrl === "string"
                      ? { uri: currentMeal.imageUrl }
                      : currentMeal.imageUrl ||
                        require("../../assets/images/meal-plans/fitfuel.jpg")
                  }
                  style={styles.mealImage}
                  defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTitle}>
                    {currentMeal.customTitle ||
                      (currentMeal.mealTime || "").charAt(0).toUpperCase() +
                        (currentMeal.mealTime || "").slice(1)}
                  </Text>
                  <Text style={styles.mealDescription}>
                    {currentMeal.customDescription ||
                      `Week ${currentMeal.weekNumber || 1}, Day ${
                        currentMeal.dayOfWeek || 1
                      }`}
                  </Text>
                  <View style={styles.mealMetrics}>
                    {currentMeal.calories && (
                      <Text style={styles.mealCalories}>
                        {currentMeal.calories} cal
                      </Text>
                    )}
                    <Text style={styles.mealCount}>
                      {currentMeal.meals?.length || 1} meal
                      {(currentMeal.meals?.length || 1) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Chef Status */}
              {chefStatus && (
                <View style={styles.statusSection}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(chefStatus.status) },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {getStatusText(chefStatus.status)}
                  </Text>
                  {chefStatus.estimatedReadyTime && (
                    <Text style={styles.estimatedTime}>
                      Ready by{" "}
                      {formatDeliveryTime(chefStatus.estimatedReadyTime)}
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noMealSection}>
              <Ionicons
                name="restaurant-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.noMealText}>No meal scheduled for today</Text>
            </View>
          )}
        </View>

        {/* Next Delivery Info */}
        {nextDelivery && (
          <View style={styles.deliverySection}>
            <View style={styles.deliveryHeader}>
              <Ionicons
                name="time-outline"
                size={16}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.deliveryLabel}>Next Delivery</Text>
            </View>
            <Text style={styles.deliveryTime}>
              {nextDelivery.date
                ? new Date(nextDelivery.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "Today"}
              {nextDelivery.estimatedTime && ` • ${nextDelivery.estimatedTime}`}
            </Text>
          </View>
        )}

        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {calculateProgress().completed} of {calculateProgress().total} meals
            delivered
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${calculateProgress().percentage}%`,
                },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingCard: {
    backgroundColor: "#F8F9FA",
    padding: 40,
    margin: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  mealSection: {
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  mealDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 4,
  },
  mealMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealCalories: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "rgba(255,215,0,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mealCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  noMealSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noMealText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  estimatedTime: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  deliverySection: {
    marginBottom: 16,
  },
  deliveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deliveryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginLeft: 6,
  },
  deliveryTime: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  progressSection: {
    marginTop: 4,
  },
  progressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 1.5,
  },
});

export default SubscriptionCard;
