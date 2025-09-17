import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import apiService from "../../services/api";
import ratingPromptManager from "../../services/ratingPromptManager";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const SubscriptionTrackingScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showAlert, showConfirm, showError, showSuccess } = useAlert();
  const { subscription: initialSubscription } = route.params || {};

  const [subscription, setSubscription] = useState(initialSubscription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFullSubscriptionData();
  }, []);

  useEffect(() => {
    // Check for subscription milestones when subscription data changes
    if (subscription && subscription.metrics?.totalMealsDelivered) {
      checkSubscriptionMilestone();
    }
  }, [subscription?.metrics?.totalMealsDelivered]);

  const loadFullSubscriptionData = async () => {
    if (!subscription?.mealPlanId?._id) return;

    try {
      setLoading(true);
      const mealPlanResult = await apiService.getMealPlanById(
        subscription.mealPlanId?._id
      );

      if (mealPlanResult.success && mealPlanResult.data) {
        setSubscription((prev) => ({
          ...prev,
          mealPlanId: mealPlanResult.data,
        }));
      }
    } catch (error) {
      console.error("Error loading meal plan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionMilestone = async () => {
    try {
      if (!subscription?.metrics?.totalMealsDelivered) return;

      const subscriptionDay = subscription.metrics.totalMealsDelivered;
      const milestones = [1, 7, 14, 30, 60, 90];

      if (milestones.includes(subscriptionDay)) {
        console.log(`🎯 Checking milestone for Day ${subscriptionDay}`);

        await ratingPromptManager.triggerSubscriptionMilestone({
          ...subscription,
          userId: subscription.userId,
          subscriptionDay,
          totalMealsReceived: subscriptionDay,
        });
      }
    } catch (error) {
      console.error("Error checking subscription milestone:", error);
    }
  };

  const handlePausePlan = () => {
    // Check if subscription is already paused
    const hasCompletedDeliveries =
      subscription.metrics?.completedMeals > 0 ||
      subscription.deliveredMeals > 0 ||
      subscription.totalDeliveries > 0;

    const isSubscriptionActive =
      subscription.recurringDelivery?.activationDeliveryCompleted === true ||
      subscription.recurringDelivery?.isActivated === true ||
      subscription.status === "active" ||
      hasCompletedDeliveries;

    if (!isSubscriptionActive) {
      showAlert({
        title: "Subscription Already Paused",
        message:
          "Your subscription is currently paused. It will resume after the first delivery is completed.",
        type: "info",
        buttons: [{ text: "OK", style: "primary" }],
      });
      return;
    }

    showConfirm(
      "Pause Subscription",
      "Are you sure you want to pause your meal plan? You can resume it anytime from your subscription settings.",
      async () => {
        try {
          setLoading(true);
          const result = await apiService.pauseSubscription(subscription._id);

          if (result.success) {
            showSuccess(
              "Subscription Paused",
              "Your meal plan has been paused successfully."
            );
            // Refresh subscription data
            loadFullSubscriptionData();
          } else {
            showError(
              "Error",
              result.message ||
                "Failed to pause subscription. Please try again."
            );
          }
        } catch (error) {
          console.error("Error pausing subscription:", error);
          showError("Error", "Failed to pause subscription. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleCustomize = () => {
    try {
      navigation.navigate("SubscriptionDetails", {
        subscription: subscription,
        showEditMode: true,
      });
    } catch (error) {
      // If SubscriptionDetails doesn't exist, try MealPlanCustomization
      try {
        navigation.navigate("MealPlanCustomization", {
          mealPlan: subscription.mealPlanId,
          subscription: subscription,
        });
      } catch (navError) {
        showAlert({
          title: "Customize Meal Plan",
          message:
            "Meal plan customization is coming soon! You'll be able to modify your preferences, dietary restrictions, and meal selections.",
          type: "info",
          buttons: [
            { text: "Contact Support", onPress: handleSupport },
            { text: "OK", style: "primary" },
          ],
        });
      }
    }
  };

  const handleSupport = () => {
    showAlert({
      title: "Contact Support",
      message: "How would you like to get help with your subscription?",
      type: "info",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Live Chat",
          onPress: () => {
            // Try to navigate to support chat or show info
            try {
              navigation.navigate("SupportChat", {
                subscription: subscription,
                issue: "subscription_tracking",
              });
            } catch (error) {
              showAlert({
                title: "Live Chat",
                message:
                  "Live chat support is temporarily unavailable. Please contact us via email or phone for immediate assistance.",
                type: "info",
                buttons: [{ text: "OK", style: "primary" }],
              });
            }
          },
        },
        {
          text: "Email Support",
          onPress: () => {
            showAlert({
              title: "Email Support",
              message:
                "Send us an email at support@choma.app with your subscription details. We'll get back to you within 24 hours.",
              type: "info",
              buttons: [{ text: "OK", style: "primary" }],
            });
          },
        },
      ],
    });
  };

  const renderTodaysMeals = () => {
    if (!subscription) return null;

    // Calculate current meal using the same logic as SubscriptionCard
    const today = new Date();
    const startDate = new Date(
      subscription.startDate || subscription.createdAt || today
    );

    // Ensure we have a valid start date
    if (isNaN(startDate.getTime())) {
      console.warn("Invalid start date for subscription, using today");
      startDate.setTime(today.getTime());
    }

    // Normalize dates to midnight to avoid time-of-day issues
    const todayNormalized = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startDateNormalized = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    // Check if subscription is valid and should show meals
    const inactiveStatuses = ["cancelled", "expired", "suspended", "deleted"];
    const shouldShowMeals = !inactiveStatuses.includes(
      subscription.status?.toLowerCase()
    );

    // Check if first delivery has been completed to determine if subscription is "active"
    const hasCompletedDeliveries =
      subscription.metrics?.completedMeals > 0 ||
      subscription.deliveredMeals > 0 ||
      subscription.totalDeliveries > 0;

    const isSubscriptionActive =
      subscription.recurringDelivery?.activationDeliveryCompleted === true ||
      subscription.recurringDelivery?.isActivated === true ||
      subscription.status === "active" ||
      hasCompletedDeliveries;

    if (!shouldShowMeals) {
      return (
        <View style={styles(colors).noMealsContainer}>
          <Ionicons
            name="restaurant-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles(colors).noMealsText}>
            Subscription is {subscription.status?.toLowerCase() || "inactive"}
          </Text>
        </View>
      );
    }

    // Calculate days since subscription start
    const daysDiff = Math.max(
      0,
      Math.floor(
        (todayNormalized - startDateNormalized) / (1000 * 60 * 60 * 24)
      )
    );

    // Pause the day counter if first delivery hasn't been completed
    let currentDay, currentWeek, dayInWeek;

    if (!isSubscriptionActive) {
      // Subscription is paused - show Day 1, Week 1 until first delivery
      currentDay = 1;
      currentWeek = 1;
      dayInWeek = 1;
    } else {
      // Normal progression after first delivery
      currentDay = Math.max(1, daysDiff + 1);
      currentWeek = Math.max(1, Math.ceil(currentDay / 7));
      dayInWeek = Math.max(1, ((currentDay - 1) % 7) + 1);
    }

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

    // Try to get meal data from mealPlanId if available
    const mealPlan = subscription.mealPlanId;
    const weeklyMeals = mealPlan?.weeklyMeals || {};
    const currentWeekMeals = weeklyMeals[`week${currentWeek}`] || {};
    const todaysMealsData = currentWeekMeals[dayName] || {};

    // Helper function to get specific meal assignment from weeklyMeals structure
    const getMealAssignment = (mealType) => {
      // Look in the organized weekly schedule for the assignment
      const assignment = todaysMealsData[mealType.toLowerCase()];

      // If no weekly meals structure, try to get from assignments array
      if (!assignment && mealPlan?.assignments) {
        const assignmentsList = mealPlan.assignments;
        // Find assignment that matches current day and meal type
        const foundAssignment = assignmentsList.find(
          (a) =>
            a.week === currentWeek &&
            a.day === dayName &&
            a.mealType?.toLowerCase() === mealType.toLowerCase()
        );

        if (foundAssignment) {
          return foundAssignment;
        }
      }

      return assignment;
    };

    // Helper function to get meal data with improved fallback logic
    const getMealData = (mealType) => {
      const assignment = getMealAssignment(mealType);

      if (assignment && (assignment.title || assignment.name)) {
        return {
          name: assignment.title || assignment.name,
          description: assignment.description || "",
          image: assignment.imageUrl
            ? { uri: assignment.imageUrl }
            : mealPlan?.planImageUrl || mealPlan?.image || mealPlan?.coverImage
              ? {
                  uri:
                    mealPlan.planImageUrl ||
                    mealPlan.image ||
                    mealPlan.coverImage,
                }
              : require("../../assets/images/meal-plans/fitfuel.jpg"),
          time:
            mealType === "breakfast"
              ? "8:00 AM"
              : mealType === "lunch"
                ? "1:00 PM"
                : "7:00 PM",
          calories: assignment.calories || null,
        };
      }
      return null;
    };

    const breakfast = getMealData("breakfast");
    const lunch = getMealData("lunch");
    const dinner = getMealData("dinner");

    const availableMeals = [
      ...(breakfast ? [{ type: "Breakfast", data: breakfast }] : []),
      ...(lunch ? [{ type: "Lunch", data: lunch }] : []),
      ...(dinner ? [{ type: "Dinner", data: dinner }] : []),
    ];

    if (availableMeals.length === 0) {
      return (
        <View style={styles(colors).noMealsContainer}>
          <Ionicons
            name="restaurant-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles(colors).noMealsText}>
            {!isSubscriptionActive
              ? "Waiting for first delivery to begin meal schedule"
              : "No meals scheduled for today"}
          </Text>
          {!isSubscriptionActive && (
            <Text style={styles(colors).statusText}>
              Subscription Status: Paused
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles(colors).mealsSection}>
        <Text style={styles(colors).sectionTitle}>
          My Today's Meals - Day {currentDay}, Week {currentWeek}
          {!isSubscriptionActive && " (Paused)"}
        </Text>

        {availableMeals.length === 1 ? (
          // Single meal - centered
          <View style={styles(colors).singleMealContainer}>
            <TouchableOpacity style={styles(colors).centeredMealCard}>
              <View style={styles(colors).mealImageContainer}>
                <Image
                  source={availableMeals[0].data.image}
                  style={styles(colors).mealImage}
                />
                <LinearGradient
                  colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                  style={styles(colors).mealOverlay}
                >
                  <Text style={styles(colors).mealType}>
                    {availableMeals[0].type}
                  </Text>
                  <Text style={styles(colors).mealName}>
                    {availableMeals[0].data.name}
                  </Text>
                  <Text style={styles(colors).mealTime}>
                    {availableMeals[0].data.time}
                  </Text>
                  {availableMeals[0].data.calories && (
                    <Text style={styles(colors).mealCalories}>
                      {availableMeals[0].data.calories} cal
                    </Text>
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          // Multiple meals - scroll
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableMeals.map((meal, index) => (
              <TouchableOpacity key={meal.type} style={styles(colors).mealCard}>
                <View style={styles(colors).mealImageContainer}>
                  <Image
                    source={meal.data.image}
                    style={styles(colors).mealImage}
                  />
                  <LinearGradient
                    colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                    style={styles(colors).mealOverlay}
                  >
                    <Text style={styles(colors).mealType}>{meal.type}</Text>
                    <Text style={styles(colors).mealName}>
                      {meal.data.name}
                    </Text>
                    <Text style={styles(colors).mealTime}>
                      {meal.data.time}
                    </Text>
                    {meal.data.calories && (
                      <Text style={styles(colors).mealCalories}>
                        {meal.data.calories} cal
                      </Text>
                    )}
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderProgress = () => {
    // Calculate progress based on actual meal assignments (like SubscriptionCard)
    const completedMeals = subscription.metrics?.completedMeals || 0;

    // Calculate total meals based on actual meal plan assignments
    let totalMeals = subscription.metrics?.totalMeals || 0;

    // If no metrics available, calculate from meal plan data
    if (totalMeals === 0) {
      const mealPlan = subscription.mealPlanId;

      if (mealPlan?.weeklyMeals) {
        // Count actual meal assignments from weeklyMeals structure
        let mealCount = 0;
        const weeklyMeals = mealPlan.weeklyMeals;

        Object.keys(weeklyMeals).forEach((weekKey) => {
          const weekMeals = weeklyMeals[weekKey];
          Object.keys(weekMeals).forEach((dayKey) => {
            const dayMeals = weekMeals[dayKey];
            Object.keys(dayMeals).forEach((mealType) => {
              if (
                dayMeals[mealType] &&
                typeof dayMeals[mealType] === "object"
              ) {
                mealCount++;
              }
            });
          });
        });

        totalMeals = mealCount;
      } else if (mealPlan?.assignments && Array.isArray(mealPlan.assignments)) {
        // Count actual meal assignments from assignments array
        totalMeals = mealPlan.assignments.length;
      } else {
        // Fallback: use plan configuration if available
        const durationWeeks =
          mealPlan?.durationWeeks ||
          subscription.duration?.replace(" weeks", "") ||
          2; // Default to 2 weeks
        const mealsPerWeek =
          mealPlan?.mealsPerWeek || subscription.mealsPerWeek || 7; // Default to 7 meals per week (1 meal per day)

        totalMeals = parseInt(durationWeeks) * parseInt(mealsPerWeek);
      }
    }

    // Calculate actual subscription progress based on dates
    const startDate = new Date(
      subscription.startDate || subscription.createdAt
    );
    const endDate = subscription.endDate
      ? new Date(subscription.endDate)
      : null;
    const currentDate = new Date();

    // Check if subscription is active (first delivery completed)
    const hasCompletedDeliveries =
      subscription.metrics?.completedMeals > 0 ||
      subscription.deliveredMeals > 0 ||
      subscription.totalDeliveries > 0;

    const isSubscriptionActive =
      subscription.recurringDelivery?.activationDeliveryCompleted === true ||
      subscription.recurringDelivery?.isActivated === true ||
      subscription.status === "active" ||
      hasCompletedDeliveries;

    // Calculate progress
    let progressPercentage = 0;
    let daysRemaining = 0;
    let totalDays = 0;

    if (endDate && !isNaN(endDate.getTime())) {
      // Use actual end date if available
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24))
      );
      totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      progressPercentage = Math.max(
        0,
        Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100)
      );
    } else {
      // Calculate based on meals if no end date
      progressPercentage =
        totalMeals > 0 ? Math.min(100, (completedMeals / totalMeals) * 100) : 0;

      // Estimate remaining days based on meal plan duration
      const mealPlan = subscription.mealPlanId;
      const durationWeeks =
        mealPlan?.durationWeeks ||
        subscription.duration?.replace(" weeks", "") ||
        2;
      totalDays = parseInt(durationWeeks) * 7;
      const daysPassed = Math.floor(
        (currentDate - startDate) / (1000 * 60 * 60 * 24)
      );
      daysRemaining = Math.max(0, totalDays - daysPassed);
    }

    return (
      <View style={styles(colors).progressSection}>
        <Text style={styles(colors).sectionTitle}>Your Progress</Text>

        <View style={styles(colors).progressCard}>
          <View style={styles(colors).progressHeader}>
            <Text style={styles(colors).progressTitle}>
              {subscription.mealPlanId?.planName ||
                subscription.mealPlanId?.name ||
                "Meal Plan"}
            </Text>
            <Text style={styles(colors).progressDays}>
              {!isSubscriptionActive
                ? "Waiting for first delivery"
                : `${daysRemaining} days remaining`}
            </Text>
          </View>

          <View style={styles(colors).progressBarContainer}>
            <View style={styles(colors).progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={[
                  styles(colors).progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles(colors).progressPercent}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>

          {!isSubscriptionActive && (
            <View style={styles(colors).pausedIndicator}>
              <Ionicons name="pause-circle" size={16} color={colors.warning} />
              <Text style={styles(colors).pausedText}>
                Subscription paused - {totalMeals} meals planned
              </Text>
            </View>
          )}
        </View>

        <View style={styles(colors).statsGrid}>
          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>{completedMeals}</Text>
            <Text style={styles(colors).statLabel}>
              {isSubscriptionActive ? "Meals Delivered" : "Meals Planned"}
            </Text>
          </View>

          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>
              ₦
              {(
                subscription.totalPrice ||
                subscription.price ||
                0
              ).toLocaleString()}
            </Text>
            <Text style={styles(colors).statLabel}>Plan Value</Text>
          </View>

          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>
              {subscription.metrics?.consecutiveDays || 0}
            </Text>
            <Text style={styles(colors).statLabel}>
              {isSubscriptionActive ? "Streak Days" : "Duration"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles(colors).headerTitle}>
          {subscription?.mealPlanId?.planName ||
            subscription?.mealPlanId?.name ||
            "Subscription"}
        </Text>

        <TouchableOpacity style={styles(colors).menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
        {/* My Today's Meals */}
        {renderTodaysMeals()}

        {/* Progress */}
        {renderProgress()}

        {/* Quick Actions */}
        <View style={styles(colors).actionsSection}>
          <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
          <View style={styles(colors).actionButtons}>
            <TouchableOpacity
              style={styles(colors).actionButton}
              onPress={handlePausePlan}
              disabled={loading}
            >
              <Ionicons
                name="pause-circle-outline"
                size={24}
                color={colors.warning}
              />
              <Text style={styles(colors).actionButtonText}>
                {(() => {
                  const hasCompletedDeliveries =
                    subscription.metrics?.completedMeals > 0 ||
                    subscription.deliveredMeals > 0 ||
                    subscription.totalDeliveries > 0;

                  const isActive =
                    subscription.recurringDelivery
                      ?.activationDeliveryCompleted === true ||
                    subscription.recurringDelivery?.isActivated === true ||
                    subscription.status === "active" ||
                    hasCompletedDeliveries;

                  return isActive ? "Pause Plan" : "Resume Plan";
                })()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors).actionButton}
              onPress={handleCustomize}
              disabled={loading}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles(colors).actionButtonText}>Customize</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors).actionButton}
              onPress={handleSupport}
            >
              <Ionicons
                name="headset-outline"
                size={24}
                color={colors.secondary}
              />
              <Text style={styles(colors).actionButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.white,
      flex: 1,
      textAlign: "center",
    },
    menuButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Meals Section
    mealsSection: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 15,
    },
    singleMealContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    centeredMealCard: {
      width: "80%",
      maxWidth: 280,
      height: 300,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    fullWidthMealCard: {
      width: "100%",
      height: 300,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    mealCard: {
      width: 160,
      height: 250,
      borderRadius: 16,
      overflow: "hidden",
      marginRight: 15,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    mealImageContainer: {
      flex: 1,
      position: "relative",
    },
    mealImage: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.background,
    },
    mealOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
    },
    mealType: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.white,
      opacity: 0.9,
    },
    mealName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.white,
      marginVertical: 4,
    },
    mealTime: {
      fontSize: 12,
      color: colors.white,
      opacity: 0.8,
    },
    mealCalories: {
      fontSize: 11,
      color: colors.white,
      opacity: 0.9,
      backgroundColor: "rgba(255,215,0,0.3)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: "flex-start",
      marginTop: 2,
    },
    // Progress Section
    progressSection: {
      padding: 20,
    },
    progressCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressHeader: {
      marginBottom: 15,
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    progressDays: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    pausedIndicator: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      padding: 8,
      backgroundColor: colors.warning + "20",
      borderRadius: 8,
    },
    pausedText: {
      fontSize: 12,
      color: colors.warning,
      marginLeft: 6,
      fontWeight: "500",
    },
    statusText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      fontStyle: "italic",
    },
    progressBarContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    progressBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginRight: 12,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressPercent: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 4,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Actions Section
    actionsSection: {
      padding: 20,
    },
    actionButtons: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    actionButton: {
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      width: 90,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 12,
      color: colors.text,
      marginTop: 8,
      textAlign: "center",
    },
    // No Meals State
    noMealsContainer: {
      alignItems: "center",
      padding: 40,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noMealsText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 12,
    },
  });

export default SubscriptionTrackingScreen;
