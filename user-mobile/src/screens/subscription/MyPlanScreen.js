import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  ImageBackground,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import CustomIcon from "../../components/ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import apiService from "../../services/api";
import SubscriptionManagementModal from "../../components/subscription/SubscriptionManagementModal";

const PRIMARY_GOLD = "#F7AE1A";
const PRIMARY_GOLD_DARK = "#D88908";
const CARD_SURFACE = "rgba(255,255,255,0.06)";
const RICH_BROWN = "#4A1B0A";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width
const CARD_SPACING = 6; // Space between cards

const getPlanDisplayName = (subscription) => {
  if (!subscription) return "Meal Plan";

  const mealPlanObject =
    (subscription.mealPlanId &&
      typeof subscription.mealPlanId === "object" &&
      subscription.mealPlanId) ||
    (subscription.mealPlan &&
      typeof subscription.mealPlan === "object" &&
      subscription.mealPlan) ||
    (subscription.mealPlanDetails &&
      typeof subscription.mealPlanDetails === "object" &&
      subscription.mealPlanDetails) ||
    null;

  const possibleNames = [
    mealPlanObject?.planName,
    mealPlanObject?.name,
    mealPlanObject?.title,
    subscription.planName,
    subscription.mealPlanName,
    subscription.subscriptionName,
    subscription.plan?.planName,
    subscription.plan?.name,
    subscription.mealPlanLabel,
    typeof subscription.mealPlanId === "string"
      ? subscription.mealPlanId
      : null,
    typeof subscription.mealPlan === "string" ? subscription.mealPlan : null,
  ];

  const displayName = possibleNames.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return displayName ? displayName.trim() : "Meal Plan";
};

const MyPlanScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { subscription: subscriptionParam } = route.params || {};
  const scrollX = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [currentMeal, setCurrentMeal] = useState(null);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementModalTab, setManagementModalTab] = useState("overview");
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);

  useEffect(() => {
    loadPlanData();
  }, []);

  // ✨ Helper function to extract today's meals from mealPlanSnapshot.mealSchedule
  // Logic: Find the FIRST un-delivered meal, then show all meals for that same day
  const getTodaysMealsFromSnapshot = (subscription) => {
    try {
      const snapshot = subscription?.mealPlanSnapshot;
      if (!snapshot || !snapshot.mealSchedule) {
        console.log("⚠️ No mealPlanSnapshot.mealSchedule found");
        return [];
      }

      const mealSchedule = snapshot.mealSchedule;
      console.log("📅 mealSchedule items:", mealSchedule.length);

      // STEP 1: Find the FIRST un-delivered meal
      // ✨ deliveryStatus tells us if a meal has been delivered
      const firstUndeliveredMeal = mealSchedule.find((slot) => {
        return slot.deliveryStatus !== "delivered";
      });

      console.log("🔍 First un-delivered meal search:", {
        found: !!firstUndeliveredMeal,
        deliveryStatus: firstUndeliveredMeal?.deliveryStatus,
        weekNumber: firstUndeliveredMeal?.weekNumber,
        dayOfWeek: firstUndeliveredMeal?.dayOfWeek,
        dayName: firstUndeliveredMeal?.dayName,
        mealTime: firstUndeliveredMeal?.mealTime,
      });

      if (!firstUndeliveredMeal) {
        console.log(
          "⚠️ No un-delivered meals found - all meals have been delivered"
        );
        return [];
      }

      // STEP 2: Get the day identifier from the first un-delivered meal
      const targetWeekNumber = firstUndeliveredMeal.weekNumber;
      const targetDayOfWeek = firstUndeliveredMeal.dayOfWeek;
      const targetDayName = firstUndeliveredMeal.dayName;

      console.log("📅 Looking for all meals on this day:", {
        weekNumber: targetWeekNumber,
        dayOfWeek: targetDayOfWeek,
        dayName: targetDayName,
      });

      // STEP 3: Find ALL meals for that same day (same weekNumber and dayOfWeek)
      // These might include breakfast, lunch, dinner, etc.
      const todaysMealSlots = mealSchedule.filter((slot) => {
        return (
          slot.weekNumber === targetWeekNumber &&
          slot.dayOfWeek === targetDayOfWeek
        );
      });

      console.log("📅 Found today's meal slots:", todaysMealSlots.length);
      todaysMealSlots.forEach((slot, index) => {
        console.log(`📋 Slot ${index}:`, {
          mealTime: slot.mealTime,
          customTitle: slot.customTitle,
          deliveryStatus: slot.deliveryStatus,
          mealsCount: slot.meals?.length || 0,
        });
      });

      if (todaysMealSlots.length === 0) {
        console.log("⚠️ No meals found for this day");
        return [];
      }

      // STEP 4: Sort meal slots by meal time order (Breakfast → Lunch → Dinner)
      const mealTimeOrder = {
        breakfast: 1,
        lunch: 2,
        dinner: 3,
      };

      todaysMealSlots.sort((a, b) => {
        const timeA = a.mealTime?.toLowerCase() || "";
        const timeB = b.mealTime?.toLowerCase() || "";
        return (mealTimeOrder[timeA] || 999) - (mealTimeOrder[timeB] || 999);
      });

      console.log(
        "📅 Sorted meal slots:",
        todaysMealSlots.map((s) => s.mealTime)
      );

      // STEP 5: Combine all today's meals into one object for display
      const allTodaysMeals = todaysMealSlots.flatMap(
        (slot) => slot.meals || []
      );

      console.log("🍽️ Total meals for today:", allTodaysMeals.length);
      console.log("📊 Today's meals structure:", {
        mealsCount: allTodaysMeals.length,
        mealTimes: todaysMealSlots.map((s) => s.mealTime),
        deliveryStatuses: [
          ...new Set(todaysMealSlots.map((s) => s.deliveryStatus)),
        ],
        firstMeal: allTodaysMeals[0]
          ? {
              name: allTodaysMeals[0].name,
              image: allTodaysMeals[0].image,
              nutrition: allTodaysMeals[0].nutrition,
            }
          : null,
      });

      // STEP 6: Return as array with single object containing all meals for this day
      const resultObject = {
        customTitle: todaysMealSlots[0]?.customTitle || "Today's Meals",
        customDescription: todaysMealSlots[0]?.customDescription || "",
        imageUrl: todaysMealSlots[0]?.imageUrl || "",
        mealTime: todaysMealSlots.map((s) => s.mealTime).join(", "),
        dayName: targetDayName,
        weekNumber: targetWeekNumber,
        dayOfWeek: targetDayOfWeek,
        deliveryStatus: firstUndeliveredMeal.deliveryStatus,
        meals: allTodaysMeals,
        isToday: true,
        allMealSlots: todaysMealSlots, // Include slot info for reference
      };

      console.log("✅ getTodaysMealsFromSnapshot returning:", {
        customTitle: resultObject.customTitle,
        customDescription: resultObject.customDescription,
        imageUrl: resultObject.imageUrl,
        mealsCount: resultObject.meals.length,
      });

      return [resultObject];
    } catch (error) {
      console.error("❌ Error extracting meals from snapshot:", error);
      return [];
    }
  };

  const loadPlanData = async () => {
    try {
      setLoading(true);

      // Use subscription from params or fetch active subscription
      if (subscriptionParam) {
        setActiveSubscription(subscriptionParam);
        // Load meals from mealPlanSnapshot.mealSchedule
        const mealsFromSnapshot = getTodaysMealsFromSnapshot(subscriptionParam);
        setTodaysMeals(mealsFromSnapshot);
        if (mealsFromSnapshot.length > 0) {
          setCurrentMeal(mealsFromSnapshot[0]);
          console.log(
            "✅ Today's meals loaded from snapshot:",
            mealsFromSnapshot[0].meals.length,
            "meals"
          );
        }
      } else {
        // Fetch active subscription via dashboard
        const dashboardResult = await apiService.getMealDashboard();
        console.log("📋 Dashboard result in MyPlan:", dashboardResult);

        if (dashboardResult?.success && dashboardResult?.data) {
          const data = dashboardResult.data;

          if (data.hasActiveSubscription && data.activeSubscription) {
            const subscription = data.activeSubscription;
            console.log(
              "✅ Setting active subscription:",
              subscription.mealPlanSnapshot?.planName || subscription.planName
            );

            // ✨ DEBUG: Check if mealPlanSnapshot exists
            console.log("📦 Subscription has mealPlanSnapshot:", {
              hasMealPlanSnapshot: !!subscription.mealPlanSnapshot,
              hasMealSchedule: !!subscription.mealPlanSnapshot?.mealSchedule,
              mealScheduleLength:
                subscription.mealPlanSnapshot?.mealSchedule?.length || 0,
              firstSlotCustomTitle:
                subscription.mealPlanSnapshot?.mealSchedule?.[0]?.customTitle,
              firstSlotImageUrl:
                subscription.mealPlanSnapshot?.mealSchedule?.[0]?.imageUrl,
            });

            setActiveSubscription(subscription);

            // Load meals from mealPlanSnapshot.mealSchedule
            const mealsFromSnapshot = getTodaysMealsFromSnapshot(subscription);
            console.log(
              "📥 mealsFromSnapshot result:",
              mealsFromSnapshot.length,
              "items"
            );
            if (mealsFromSnapshot.length > 0) {
              console.log("📥 First meal object keys:", {
                keys: Object.keys(mealsFromSnapshot[0]),
                customTitle: mealsFromSnapshot[0].customTitle,
                customDescription: mealsFromSnapshot[0].customDescription,
                imageUrl: mealsFromSnapshot[0].imageUrl,
              });
            }

            setTodaysMeals(mealsFromSnapshot);
            if (mealsFromSnapshot.length > 0) {
              setCurrentMeal(mealsFromSnapshot[0]);
              console.log(
                "✅ Today's meals loaded from snapshot:",
                mealsFromSnapshot[0].meals.length,
                "meals"
              );
            } else {
              console.log(
                "⚠️ No meals found in snapshot for today, trying API fallback..."
              );
              // Fallback to API if snapshot doesn't have meals
              await loadTodaysMeals(subscription);
            }
          } else {
            console.log("ℹ️ No active subscription found");
          }
        }
      }
    } catch (error) {
      console.error("Error loading plan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysMeals = async (subscription) => {
    try {
      const subscriptionId = subscription._id || subscription.id;

      // Get current meal
      const currentMealResult = await apiService.getSubscriptionCurrentMeal(
        subscriptionId
      );

      console.log("📋 Current meal result:", currentMealResult);
      if (currentMealResult?.success && currentMealResult?.data) {
        // Handle nested data structure: data.data or just data
        const mealData = currentMealResult.data.data || currentMealResult.data;
        console.log("✅ Current meal data:", JSON.stringify(mealData, null, 2));
        setCurrentMeal(mealData);

        // ✨ IMPORTANT: Use currentMeal directly as today's meals
        // The currentMeal already has the meals array with all meals for today
        if (mealData && mealData.meals && mealData.meals.length > 0) {
          console.log(
            "📅 ✅ Setting todaysMeals from currentMeal with:",
            mealData.meals.length,
            "meals"
          );
          setTodaysMeals([mealData]); // Wrap in array to maintain consistency with mealTimeline structure
        } else {
          console.log(
            "⚠️ Current meal has no meals array, will try timeline endpoint"
          );
          // Fallback to timeline if currentMeal doesn't have meals
          await fetchMealTimeline(subscriptionId);
        }
      } else {
        console.log(
          "⚠️ Current meal API failed, falling back to timeline endpoint"
        );
        // Fallback to timeline if current meal fails
        await fetchMealTimeline(subscriptionId);
      }
    } catch (error) {
      console.error("Error loading today's meals:", error);
    }
  };

  const fetchMealTimeline = async (subscriptionId) => {
    try {
      // Get meal timeline for today's meals
      const timelineResult = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        7 // Get a week instead of just 1 day
      );

      console.log("📅 Timeline result:", timelineResult);
      if (timelineResult?.success && timelineResult?.data) {
        // Handle nested data structure
        const timelineData = timelineResult.data.data || timelineResult.data;
        const timeline = Array.isArray(timelineData) ? timelineData : [];
        console.log("📅 Timeline array length:", timeline.length);

        if (timeline.length > 0) {
          // Find today's meals (dayType === 'current' or isToday === true)
          const todayMeals = timeline.filter(
            (day) => day.dayType === "current" || day.isToday
          );
          console.log("📅 Today's meals from timeline:", todayMeals.length);
          setTodaysMeals(todayMeals);
        } else {
          console.log("⚠️ Timeline is empty");
          setTodaysMeals([]);
        }
      }
    } catch (error) {
      console.error("Error fetching meal timeline:", error);
      setTodaysMeals([]);
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return "Today";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Today";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day}, ${month}, ${year}`;
  };

  const getOrdinalSuffix = (value) => {
    const j = value % 10;
    const k = value % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const getSubscriptionDay = (subscription) => {
    if (!subscription) return 1;

    // If subscription is not yet activated, always show Day 1
    if (
      !subscription.activationDeliveryCompleted ||
      !subscription.isActivated
    ) {
      return 1;
    }

    // Calculate based on nextDelivery date
    if (subscription.nextDelivery && subscription.startDate) {
      const startDate = new Date(subscription.startDate);
      const nextDelivery = new Date(subscription.nextDelivery);

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
        (nextDeliveryNormalized - startDateNormalized) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    // Fallback to current date calculation
    if (subscription.startDate) {
      const startDate = new Date(subscription.startDate);
      const currentDate = new Date();

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
        (currentDateNormalized - startDateNormalized) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    return 1;
  };

  const renderHeroSection = () => {
    if (!activeSubscription) return null;

    // Get all meals for today from todaysMeals
    const todayMealObject = todaysMeals[0];
    const allMeals = todayMealObject?.meals || [];
    const allMealSlots = todayMealObject?.allMealSlots || []; // Get slot info

    // ✨ Use the currently selected slot based on selectedMealIndex
    const currentSlot =
      allMealSlots[selectedMealIndex] || allMealSlots[0] || todayMealObject;

    console.log("🎨 renderHeroSection Debug:", {
      todaysMealsLength: todaysMeals.length,
      allMealsCount: allMeals.length,
      allMealSlotsCount: allMealSlots.length,
      selectedMealIndex,
      currentSlotMealTime: currentSlot?.mealTime,
      currentSlotTitle: currentSlot?.customTitle,
      currentSlotImageUrl: currentSlot?.imageUrl,
      willRenderSlider: allMealSlots.length > 0,
    });

    const mealPlan =
      activeSubscription.mealPlanId || activeSubscription.mealPlan || {};

    // ✨ Extract meal title from the CURRENT SLOT (changes as you swipe)
    const mealTitle = currentSlot?.customTitle || "Today's Meal";

    // Extract meal times - show all slot times
    const allMealTimes = allMealSlots
      .map((slot) => slot.mealTime)
      .filter(Boolean)
      .join(", ");
    const timeRange = allMealTimes || "";

    console.log("📝 Meal title for hero:", mealTitle);
    console.log("🖼️ Current slot image:", currentSlot?.imageUrl);

    const planName = getPlanDisplayName(activeSubscription);
    const subscriptionId = activeSubscription._id || activeSubscription.id;

    return (
      <View style={styles(colors).heroSection}>
        {/* Header with meal time range */}
        {timeRange && (
          <View style={{ paddingHorizontal: 20, marginBottom: 2 }}>
            <Text style={styles(colors).mealTimeHeader}>
              Today Meals - {timeRange}
            </Text>
          </View>
        )}

        {/* Meals Slider - Now iterates over SLOTS (breakfast, lunch, dinner) */}
        {allMealSlots.length > 0 ? (
          <View style={styles(colors).mealsSliderContainer}>
            <Animated.ScrollView
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              snapToAlignment="start"
              contentContainerStyle={{
                paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
                gap: CARD_SPACING,
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x /
                    (CARD_WIDTH + CARD_SPACING)
                );
                setSelectedMealIndex(index);
              }}
              style={styles(colors).mealsSlider}
              scrollEnabled={allMealSlots.length > 1}
            >
              {allMealSlots.map((slot, index) => {
                // Calculate input range for this card
                const inputRange = [
                  (index - 1) * (CARD_WIDTH + CARD_SPACING),
                  index * (CARD_WIDTH + CARD_SPACING),
                  (index + 1) * (CARD_WIDTH + CARD_SPACING),
                ];

                // Animate scale: 0.9 when off-center, 1.0 when centered
                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.9, 1, 0.9],
                  extrapolate: "clamp",
                });

                // Animate opacity: 0.7 when off-center, 1.0 when centered
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: "clamp",
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles(colors).mealSlideContainer,
                      { width: CARD_WIDTH, transform: [{ scale }], opacity },
                    ]}
                  >
                    <View style={styles(colors).heroCard}>
                      <Image
                        source={
                          slot.imageUrl
                            ? { uri: slot.imageUrl }
                            : mealPlan?.planImageUrl
                            ? { uri: mealPlan.planImageUrl }
                            : mealPlan?.image
                            ? { uri: mealPlan.image }
                            : require("../../../assets/authImage.png")
                        }
                        style={styles(colors).heroImage}
                        resizeMode="cover"
                      />
                    </View>
                  </Animated.View>
                );
              })}
            </Animated.ScrollView>

            {/* Pagination Dots */}
            {allMealSlots.length > 1 && (
              <View style={styles(colors).paginationDotsContainer}>
                {allMealSlots.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles(colors).paginationDot,
                      index === selectedMealIndex &&
                        styles(colors).paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          // Fallback to single image if no slot data
          <View style={styles(colors).heroCard}>
            <Image
              source={
                mealPlan?.planImageUrl
                  ? { uri: mealPlan.planImageUrl }
                  : mealPlan?.image
                  ? { uri: mealPlan.image }
                  : require("../../../assets/authImage.png")
              }
              style={styles(colors).heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
              style={styles(colors).heroOverlay}
            >
              <Text style={styles(colors).heroMealName}>{mealTitle}</Text>
              <Text style={styles(colors).heroPlanName}>{planName}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Meal Details Below Image */}
        <View style={styles(colors).mealDetailsContainer}>
          <Text style={styles(colors).mealDetailTitle} numberOfLines={2}>
            {mealTitle}
          </Text>
          {/* ✨ Show description from the CURRENT SLOT (changes as you swipe) */}
          {!!currentSlot?.customDescription && (
            <Text
              style={styles(colors).mealDetailDescription}
              numberOfLines={3}
            >
              {currentSlot.customDescription}
            </Text>
          )}
          {(() => {
            // ✨ Calculate TOTAL calories from meals in the CURRENT SLOT
            const slotMeals = currentSlot?.meals || [];
            const totalCalories = slotMeals.reduce((sum, meal) => {
              return sum + (meal.nutrition?.calories || meal.calories || 0);
            }, 0);

            return totalCalories > 0 ? (
              <View style={styles(colors).mealDetailMetaRow}>
                <View style={styles(colors).mealKcalBadge}>
                  <Text style={styles(colors).mealKcalText}>
                    {totalCalories} kcal
                  </Text>
                </View>
              </View>
            ) : null;
          })()}
        </View>

        <View style={styles(colors).heroButtonsGroup}>
          <TouchableOpacity
            style={styles(colors).heroPrimaryButton}
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate("MealTimeline", {
                subscriptionId,
                subscription: activeSubscription,
              });
            }}
          >
            <Text style={styles(colors).heroPrimaryButtonText}>
              See my meal plan timeline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors).heroSecondaryButton}
            activeOpacity={0.85}
            onPress={() => {
              setManagementModalTab("overview");
              setShowManagementModal(true);
            }}
          >
            <Text style={styles(colors).heroSecondaryButtonText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSubscriptionStatus = () => {
    if (!activeSubscription) return null;

    const subscriptionDay = getSubscriptionDay(activeSubscription);
    const nextDelivery = activeSubscription.nextDelivery
      ? new Date(activeSubscription.nextDelivery)
      : null;
    const statusText = activeSubscription.status
      ? activeSubscription.status.charAt(0).toUpperCase() +
        activeSubscription.status.slice(1)
      : "Active";
    const nextDeliveryMonthYear = nextDelivery
      ? nextDelivery.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "Pending";
    const nextDeliveryDay = nextDelivery ? nextDelivery.getDate() : null;
    const nextDeliverySuffix =
      nextDelivery && nextDeliveryDay ? getOrdinalSuffix(nextDeliveryDay) : "";

    return (
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Subscription Status</Text>
        <LinearGradient
          colors={["rgba(245, 173, 26, 0.3)", "rgba(245, 173, 26, 0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles(colors).statusCard}
        >
          <ImageBackground
            source={require("../../../assets/patternchoma.png")}
            resizeMode="cover"
            style={styles(colors).statusPattern}
            imageStyle={styles(colors).statusPatternImage}
          >
            <View style={styles(colors).statusRow}>
              <View style={styles(colors).statusItem}>
                <Text style={styles(colors).statusLabel}>Day</Text>
                <Text style={styles(colors).statusNumber}>
                  {subscriptionDay}
                </Text>
              </View>

              <View style={styles(colors).statusDivider} />

              <View style={styles(colors).statusItem}>
                <Text style={styles(colors).statusLabel}>Next delivery</Text>
                {nextDeliveryDay ? (
                  <View style={styles(colors).statusNumberGroup}>
                    <Text style={styles(colors).statusNumber}>
                      {nextDeliveryDay}
                      <Text style={styles(colors).statusNumberSuffix}>
                        {nextDeliverySuffix}
                      </Text>
                    </Text>
                    <Text style={styles(colors).statusSubText}>
                      {nextDeliveryMonthYear}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles(colors).statusSubText}>Pending</Text>
                )}
              </View>

              <View style={styles(colors).statusDivider} />

              <View style={styles(colors).statusItem}>
                <Text style={styles(colors).statusLabel}>Status</Text>
                <View style={styles(colors).statusBadge}>
                  <Text style={styles(colors).statusValue}>{statusText}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </LinearGradient>
      </View>
    );
  };

  const renderPlanDetails = () => {
    if (!activeSubscription) return null;

    const mealPlan =
      activeSubscription.mealPlanId || activeSubscription.mealPlan;
    const planName = getPlanDisplayName(activeSubscription);

    return (
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Plan Details</Text>
        <View style={styles(colors).detailsCard}>
          <View style={styles(colors).detailRow}>
            <Text style={styles(colors).detailLabel}>Plan Name</Text>
            <Text style={styles(colors).detailValue} numberOfLines={1}>
              {planName}
            </Text>
          </View>
          <View style={styles(colors).detailRow}>
            <Text style={styles(colors).detailLabel}>Frequency</Text>
            <Text style={styles(colors).detailValue}>
              {(() => {
                const freq =
                  activeSubscription.deliveryPreferences?.frequency ||
                  activeSubscription.frequency ||
                  "weekly";
                return freq === "all"
                  ? "Daily"
                  : freq.charAt(0).toUpperCase() + freq.slice(1);
              })()}
            </Text>
          </View>
          <View style={styles(colors).detailRow}>
            <Text style={styles(colors).detailLabel}>Duration</Text>
            <Text style={styles(colors).detailValue}>
              {activeSubscription.durationWeeks
                ? `${activeSubscription.durationWeeks} ${
                    activeSubscription.durationWeeks === 1 ? "week" : "weeks"
                  }`
                : "4 weeks"}
            </Text>
          </View>
          <View style={[styles(colors).detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles(colors).detailLabel}>Start Date</Text>
            <Text style={styles(colors).detailValue}>
              {formatFullDate(activeSubscription.startDate)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />
        <LinearGradient
          colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
          locations={[0, 0.4, 0.7, 1]}
          style={styles(colors).backgroundGradient}
        >
          {/* Pattern overlay on gradient */}
          <ImageBackground
            source={require("../../../assets/patternchoma.png")}
            style={styles(colors).backgroundPattern}
            resizeMode="repeat"
            imageStyle={styles(colors).backgroundImageStyle}
          />
          <View style={styles(colors).loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading your plan...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!activeSubscription) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />
        <LinearGradient
          colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
          locations={[0, 0.4, 0.7, 1]}
          style={styles(colors).backgroundGradient}
        >
          {/* Pattern overlay on gradient */}
          <ImageBackground
            source={require("../../../assets/patternchoma.png")}
            style={styles(colors).backgroundPattern}
            resizeMode="repeat"
            imageStyle={styles(colors).backgroundImageStyle}
          />
          {/* Header */}
          <View style={styles(colors).header}>
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={() => navigation.goBack()}
            >
              <CustomIcon name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles(colors).headerTitle}>My Plan</Text>
            <View style={styles(colors).placeholder} />
          </View>

          <View style={styles(colors).emptyContainer}>
            <CustomIcon
              name="calendar-outline"
              size={80}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyTitle}>No Active Plan</Text>
            <Text style={styles(colors).emptyText}>
              You don't have an active meal plan subscription. Browse our meal
              plans to get started!
            </Text>
            <TouchableOpacity
              style={styles(colors).browseButton}
              onPress={() => navigation.navigate("Home")}
            >
              <Text style={styles(colors).browseButtonText}>
                Browse Meal Plans
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles(colors).backgroundGradient}
      >
        {/* Pattern overlay on gradient */}
        <ImageBackground
          source={require("../../../assets/patternchoma.png")}
          resizeMode="repeat"
          style={styles(colors).backgroundPattern}
          imageStyle={styles(colors).backgroundImageStyle}
        />

        <ScrollView
          style={styles(colors).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(colors).scrollContent}
        >
          {renderHeroSection()}

          {renderSubscriptionStatus()}
          {renderPlanDetails()}

          <View style={styles(colors).bottomPadding} />
        </ScrollView>
      </LinearGradient>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        visible={showManagementModal}
        onClose={() => {
          setShowManagementModal(false);
          setManagementModalTab("overview");
        }}
        subscription={activeSubscription}
        initialTab={managementModalTab}
        onSubscriptionUpdate={(updatedSubscription) => {
          setActiveSubscription(updatedSubscription);
          loadPlanData(); // Refresh data after update
        }}
      />

      {/* Sticky Hero Header with Gold Gradient */}
      <LinearGradient
        colors={[PRIMARY_GOLD, PRIMARY_GOLD_DARK]}
        style={styles(colors).stickyHeader}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles(colors).headerRow}>
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={() => navigation.goBack()}
            >
              <CustomIcon
                name="chevron-back"
                size={20}
                color={colors.primary2}
              />
            </TouchableOpacity>
            <Text style={styles(colors).heroTitle}>My Meal Plan</Text>
            <View style={styles(colors).placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      position: "relative",
    },
    backgroundGradient: {
      flex: 1,
      position: "relative",
    },
    backgroundPattern: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      opacity: 0.15, // Subtle pattern overlay
    },
    backgroundImageStyle: {
      opacity: 1,
      transform: [{ scale: 2.5 }],
    },
    // Sticky Hero Header Styles
    stickyHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      // justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(0,0,0,0.08)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary2,
      letterSpacing: 0.4,
    },
    placeholder: {
      width: 42,
    },
    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(0,0,0,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    // Loading & Empty States
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
      backgroundColor: "transparent",
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      marginTop: 24,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      color: "rgba(255,255,255,0.65)",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    browseButton: {
      backgroundColor: "#F7AE1A",
      paddingHorizontal: 40,
      paddingVertical: 18,
      borderRadius: 30,
      shadowColor: "#F7AE1A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    browseButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1A1A1A",
    },
    // Content Layout
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 36,
      paddingTop: 100, // Add padding for sticky header
    },
    heroSection: {
      marginTop: 28,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    heroCard: {
      width: "100%",
      height: 300,
      borderRadius: 32,
      overflow: "hidden",
      borderWidth: 0.5,
      borderColor: "rgba(255,255,255,0.9)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 18,
      elevation: 12,
      backgroundColor: "#1a1a1a",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingBottom: 28,
      paddingTop: 80,
      justifyContent: "flex-end",
    },
    heroMealName: {
      fontSize: 24,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    heroPlanName: {
      fontSize: 14,
      fontWeight: "500",
      color: "rgba(255,255,255,0.78)",
    },
    heroButtonsGroup: {
      marginTop: 28,
      paddingHorizontal: 20,
      gap: 12,
    },
    heroPrimaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 30,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    heroPrimaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.primary2,
      letterSpacing: 0.3,
      textTransform: "none",
    },
    heroSecondaryButton: {
      borderWidth: 2,
      borderColor: PRIMARY_GOLD,
      borderRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    heroSecondaryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: PRIMARY_GOLD,
      letterSpacing: 0.3,
    },
    // Meal Time Header
    mealTimeHeader: {
      fontSize: 15,
      fontWeight: "600",
      color: "rgba(255,255,255,0.75)",
      marginBottom: 16,
      letterSpacing: 0.3,
      textAlign: "center",
    },
    // Meal Details under hero
    mealDetailsContainer: {
      paddingHorizontal: 20,
      // marginTop: 12,
      gap: 8,
    },
    mealDetailTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
    mealDetailDescription: {
      fontSize: 14,
      color: "rgba(255,255,255,0.75)",
      lineHeight: 20,
    },
    mealDetailMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      // marginTop: 2,
    },
    mealKcalBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    mealKcalText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },
    // Meals Slider Styles
    mealsSliderContainer: {
      marginBottom: 20,
    },
    mealsSlider: {
      width: "100%",
      height: 330,
    },
    mealSlideContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    // Pagination Dots
    paginationDotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
    },
    paginationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "rgba(255,255,255,0.35)",
      transition: "all 0.3s ease",
    },
    paginationDotActive: {
      backgroundColor: colors.primary,
      width: 28,
      height: 10,
      borderRadius: 5,
    },
    // Section Styles
    section: {
      paddingHorizontal: 20,
      marginTop: 32,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: PRIMARY_GOLD,
      marginBottom: 18,
      letterSpacing: 0.4,
    },
    viewDetailsText: {
      fontSize: 14,
      fontWeight: "600",
      color: PRIMARY_GOLD,
    },
    // Status Card - Premium Design
    statusCard: {
      borderRadius: 26,
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      //   elevation: 6,
      overflow: "hidden",
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    statusItem: {
      flex: 1,
      alignItems: "flex-start",
      gap: 6,
    },
    statusDivider: {
      width: 1,
      height: 72,
      backgroundColor: "rgba(255,255,255,0.25)",
      marginHorizontal: 12,
    },
    statusLabel: {
      fontSize: 13,
      color: "rgba(255,255,255,0.78)",
      marginBottom: 10,
      fontWeight: "500",
    },
    statusNumber: {
      fontSize: 30,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.4,
      lineHeight: 34,
    },
    statusNumberSuffix: {
      fontSize: 16,
      fontWeight: "600",
      color: "rgba(255,255,255,0.85)",
      marginLeft: 2,
      lineHeight: 24,
    },
    statusSubText: {
      fontSize: 13,
      fontWeight: "600",
      color: "rgba(255,255,255,0.78)",
      marginTop: 4,
    },
    statusValue: {
      fontSize: 18,
      fontWeight: "700",
      color: "#fff",
    },
    // Details Card - Clean & Modern
    detailsCard: {
      backgroundColor: CARD_SURFACE,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      //   elevation: 5,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.08)",
    },
    detailLabel: {
      fontSize: 14,
      color: "rgba(255,255,255,0.65)",
      fontWeight: "500",
    },
    detailValue: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
      maxWidth: "60%",
    },
    timelineCard: {
      backgroundColor: CARD_SURFACE,
      borderRadius: 24,
      padding: 4,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    bottomPadding: {
      height: 80,
    },
  });

export default MyPlanScreen;
