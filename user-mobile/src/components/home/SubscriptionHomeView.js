import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomIcon from '../ui/CustomIcon';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';

const SubscriptionHomeView = React.memo(({
  activeSubscriptions,
  setShowBrowseMode,
}) => {
  const { colors } = useTheme();
  const mealsScrollRef = useRef(null);

  const renderTodaysMeals = () => {
    try {
      // Use the first active subscription for My Today's Meals
      const primarySubscription = activeSubscriptions[0];
      if (!primarySubscription?.mealPlanId) {
        console.log("⚠️ No primary subscription or mealPlanId found");
        return null;
      }

      // Additional safety check to ensure mealPlanId has the required properties
      if (!primarySubscription.mealPlanId?.weeklyMeals) {
        console.log("⚠️ No weeklyMeals data found in mealPlanId");
        return null;
      }

      // Calculate subscription day using same logic as RecurringDeliveryCard
      const getSubscriptionDay = () => {
        // If subscription is not yet activated (first delivery not completed), always show Day 1
        if (
          !primarySubscription.activationDeliveryCompleted ||
          !primarySubscription.isActivated
        ) {
          console.log("🔄 Subscription not yet activated - showing Day 1");
          return 1;
        }

        // If subscription has nextDelivery date, calculate based on that
        if (primarySubscription.nextDelivery && primarySubscription.startDate) {
          const startDate = new Date(primarySubscription.startDate);
          const nextDelivery = new Date(primarySubscription.nextDelivery);

          // Normalize dates to avoid timezone issues
          const startDateNormalized = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const nextDeliveryNormalized = new Date(
            nextDelivery.getFullYear(),
            nextDelivery.getMonth(),
            nextDelivery.getDate()
          );

          const daysDiff = Math.floor(
            (nextDeliveryNormalized - startDateNormalized) /
              (1000 * 60 * 60 * 24)
          );
          return Math.max(1, daysDiff + 1);
        }

        // Fallback to current date calculation if nextDelivery not available
        if (primarySubscription.startDate) {
          const startDate = new Date(primarySubscription.startDate);
          const currentDate = new Date();

          // Normalize dates to avoid timezone issues
          const startDateNormalized = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const currentDateNormalized = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          );

          const daysDiff = Math.floor(
            (currentDateNormalized - startDateNormalized) /
              (1000 * 60 * 60 * 24)
          );
          return Math.max(1, daysDiff + 1);
        }

        // Default to day 1 if no dates available
        return 1;
      };

      const subscriptionDay = getSubscriptionDay();

      // Map subscription day to week and day
      // Day 1-7 = Week 1, Day 8-14 = Week 2, etc.
      const weekNumber = Math.ceil(subscriptionDay / 7);
      const dayInWeek = ((subscriptionDay - 1) % 7) + 1; // 1-7

      // Handle cycling through weeks (after 4 weeks, start over)
      const currentWeekNumber = ((weekNumber - 1) % 4) + 1; // 1-4

      // Map subscription day to calendar day names (as used in database)
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const dayName = dayNames[dayInWeek - 1]; // dayInWeek is 1-7, array is 0-6

      // Get My Today's Meals from the subscription's meal plan
      const weeklyMeals = primarySubscription.mealPlanId?.weeklyMeals || {};
      const currentWeek = weeklyMeals[`week${currentWeekNumber}`] || {};
      const todaysMealsData = currentWeek[dayName] || {};

      // Helper function to get specific meal assignment from weeklyMeals structure
      const getMealAssignment = (mealType) => {
        // Look in the organized weekly schedule for the assignment
        const assignment = todaysMealsData[mealType.toLowerCase()];
        return assignment;
      };

      // Helper function to get specific meal image from assignment data
      const getMealImage = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Use the assignment's imageUrl if available
        if (assignment?.imageUrl) {
          return { uri: assignment.imageUrl };
        }

        // Fallback to meal plan image if specific meal image not found
        const mealPlan = primarySubscription.mealPlanId;
        if (mealPlan?.planImageUrl || mealPlan?.image || mealPlan?.coverImage) {
          const fallbackImage =
            mealPlan.planImageUrl || mealPlan.image || mealPlan.coverImage;
          console.log(
            `⚠️ HomeScreen - Using fallback meal plan image for ${mealType}:`,
            fallbackImage
          );
          return { uri: fallbackImage };
        }

        console.log(
          `❌ HomeScreen - No image found for ${mealType}, using default`
        );
        return require("../../assets/images/meal-plans/fitfuel.jpg");
      };

      // Helper function to get meal name from assignment data
      const getMealName = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Use the assignment's custom title if available
        if (assignment?.title) {
          return assignment.title;
        }

        // If assignment exists but no title, it means meal is scheduled but no custom name
        if (assignment) {
          const capitalizedMealType =
            mealType.charAt(0).toUpperCase() + mealType.slice(1);
          console.log(
            `⚠️ HomeScreen - Assignment exists but no title for ${mealType}, using default`
          );
          return `${capitalizedMealType} meal`;
        }

        console.log(`❌ HomeScreen - No assignment found for ${mealType}`);
        return null;
      };

      // Helper function to get meal calories from assignment data
      const getMealCalories = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Try to get calories from assignment
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

      const todaysMeals = {
        breakfast: {
          name: getMealName("breakfast"),
          image: getMealImage("breakfast"),
          calories: getMealCalories("breakfast"),
          time: "8:00 AM",
        },
        lunch: {
          name: getMealName("lunch"),
          image: getMealImage("lunch"),
          calories: getMealCalories("lunch"),
          time: "1:00 PM",
        },
        dinner: {
          name: getMealName("dinner"),
          image: getMealImage("dinner"),
          calories: getMealCalories("dinner"),
          time: "7:00 PM",
        },
      };

      // Filter out meals that don't have actual assignment data (no template fallbacks)
      const availableMeals = Object.entries(todaysMeals).filter(
        ([mealType, meal]) => {
          const assignment = getMealAssignment(mealType);
          // Only include meals that have actual assignment data
          return assignment && meal.name;
        }
      );

      // If no meals are available for today, show a message
      if (availableMeals.length === 0) {
        return (
          <View style={styles(colors).todaysMealsSection}>
            <Text style={styles(colors).sectionTitle}>
              My Today's Meals - Day {subscriptionDay}
            </Text>
            <View style={styles(colors).noMealsContainer}>
              <CustomIcon
                name="restaurant-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles(colors).noMealsTitle}>
                No meals scheduled for today
              </Text>
              <Text style={styles(colors).noMealsText}>
                Week {currentWeekNumber}, {dayName} meals are not available in
                your meal plan. Please contact support.
              </Text>
              <TouchableOpacity
                style={styles(colors).contactSupportButton}
                onPress={() => setShowBrowseMode(true)}
              >
                <Text style={styles(colors).contactSupportText}>
                  Browse Meal Plans
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      // Calculate delivery status based on real subscription data
      const today = new Date();
      const nextDelivery = new Date(primarySubscription.nextDelivery);
      const isToday = nextDelivery.toDateString() === today.toDateString();
      const deliveryTime = nextDelivery.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      let deliveryStatus = "";
      if (isToday) {
        deliveryStatus = `🚚 Preparing your meals • Estimated delivery: ${deliveryTime}`;
      } else {
        const deliveryDate = nextDelivery.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        deliveryStatus = `📅 Next delivery: ${deliveryDate} at ${deliveryTime}`;
      }

      return (
        <View style={styles(colors).todaysMealsSection}>
          <Text style={styles(colors).sectionTitle}>
            My Today's Meals - Day {subscriptionDay}
          </Text>
          <Text style={styles(colors).deliveryStatus}>{deliveryStatus}</Text>

          {/* Dynamic layout: ScrollView for multiple meals, full width for single meal */}
          {availableMeals.length === 1 ? (
            // Single meal - full width card
            <View style={styles(colors).singleMealContainer}>
              {availableMeals.map(([mealType, meal]) => (
                <TouchableOpacity
                  key={mealType}
                  style={styles(colors).fullWidthMealCard}
                >
                  <View style={styles(colors).todayMealImageContainer}>
                    <Image
                      source={meal.image}
                      style={styles(colors).todayMealImage}
                    />
                    <LinearGradient
                      colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                      style={styles(colors).todayMealOverlay}
                    >
                      <View style={styles(colors).mealTimeContainer}>
                        <Text style={styles(colors).mealTime}>{meal.time}</Text>
                      </View>
                      <Text style={styles(colors).mealType}>
                        {(mealType || "").charAt(0).toUpperCase() +
                          (mealType || "").slice(1)}
                      </Text>
                      <Text
                        style={styles(colors).todayMealName}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Multiple meals - horizontal scroll
            <ScrollView
              ref={mealsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles(colors).mealsScroll}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={215} // Card width (200) + margin (15) for snapping
              snapToAlignment="start"
              onMomentumScrollEnd={(event) => {
                const cardWidth = 200;
                const cardMargin = 15;
                const slideIndex = Math.round(
                  event.nativeEvent.contentOffset.x / (cardWidth + cardMargin)
                );
                // Optional: You can track the current meal index if needed
                // setCurrentMealIndex(slideIndex);
              }}
            >
              {availableMeals.map(([mealType, meal]) => (
                <TouchableOpacity
                  key={mealType}
                  style={styles(colors).todayMealCard}
                >
                  <View style={styles(colors).todayMealImageContainer}>
                    <Image
                      source={meal.image}
                      style={styles(colors).todayMealImage}
                    />
                    <LinearGradient
                      colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                      style={styles(colors).todayMealOverlay}
                    >
                      <View style={styles(colors).mealTimeContainer}>
                        <Text style={styles(colors).mealTime}>{meal.time}</Text>
                      </View>
                      <Text style={styles(colors).mealType}>
                        {(mealType || "").charAt(0).toUpperCase() +
                          (mealType || "").slice(1)}
                      </Text>
                      <Text
                        style={styles(colors).todayMealName}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      );
    } catch (error) {
      console.error("❌ Error in renderTodaysMeals:", error);
      return null;
    }
  };

  if (!activeSubscriptions || activeSubscriptions.length === 0) {
    return null;
  }

  return (
    <View style={styles(colors).container}>
      {renderTodaysMeals()}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeSubscriptions?.length === nextProps.activeSubscriptions?.length &&
    prevProps.activeSubscriptions === nextProps.activeSubscriptions
  );
});

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
    },
    todaysMealsSection: {
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    deliveryStatus: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    noMealsContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
    },
    noMealsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noMealsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    contactSupportButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    contactSupportText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    singleMealContainer: {
      marginBottom: 16,
    },
    fullWidthMealCard: {
      borderRadius: 16,
      overflow: 'hidden',
      height: 180,      
      borderWidth: 1,
      borderColor: colors.black,
    },
    mealsScroll: {
      paddingBottom: 16,
    },
    todayMealCard: {
      width: 200,
      height: 180,
      marginRight: 15,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.black,
    },
    todayMealImageContainer: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    todayMealImage: {
      width: '100%',
      height: '100%',
    },
    todayMealOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
      justifyContent: 'flex-end',
      padding: 16,
    },
    mealTimeContainer: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    mealTime: {
      fontSize: 12,
      color: '#333',
      fontWeight: '600',
    },
    mealType: {
      fontSize: 12,
      color: colors.white,
      opacity: 0.8,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    todayMealName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
  });

export default SubscriptionHomeView;