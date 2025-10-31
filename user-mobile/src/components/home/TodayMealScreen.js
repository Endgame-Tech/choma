import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import apiService from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import ChomaLogo from "../ui/ChomaLogo";
import CustomIcon from "../ui/CustomIcon";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_SPACING = 10;

const TodayMealScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [currentMeal, setCurrentMeal] = useState(null);
  const [todaysMealSlots, setTodaysMealSlots] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFirstDeliveryPopup, setShowFirstDeliveryPopup] = useState(false);

  useEffect(() => {
    loadTodayMeal();
  }, []);

  // ✨ Helper function to extract today's meal slots from mealPlanSnapshot.mealSchedule
  // Logic: Find the FIRST un-delivered meal, then show all meal slots for that same day
  const getTodaysMealSlotsFromSnapshot = (subscription) => {
    try {
      const snapshot = subscription?.mealPlanSnapshot;
      if (!snapshot || !snapshot.mealSchedule) {
        console.log("⚠️ No mealPlanSnapshot.mealSchedule found");
        return [];
      }

      const mealSchedule = snapshot.mealSchedule;
      console.log("📅 mealSchedule items:", mealSchedule.length);

      // STEP 1: Find the FIRST un-delivered meal
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

      console.log("📅 Looking for all meal slots on this day:", {
        weekNumber: targetWeekNumber,
        dayOfWeek: targetDayOfWeek,
        dayName: targetDayName,
      });

      // STEP 3: Find ALL meal slots for that same day (breakfast, lunch, dinner)
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
          customDescription: slot.customDescription,
          imageUrl: slot.imageUrl,
          deliveryStatus: slot.deliveryStatus,
          mealsCount: slot.meals?.length || 0,
        });
      });

      if (todaysMealSlots.length === 0) {
        console.log("⚠️ No meal slots found for this day");
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

      // STEP 5: Return each slot separately (breakfast, lunch, dinner)
      // Each slot has its own customTitle, customDescription, imageUrl
      console.log("✅ getTodaysMealSlotsFromSnapshot returning:", {
        slotsCount: todaysMealSlots.length,
        titles: todaysMealSlots.map((s) => s.customTitle),
        imageUrls: todaysMealSlots.map((s) => s.imageUrl),
      });

      return todaysMealSlots;
    } catch (error) {
      console.error("❌ Error extracting meal slots from snapshot:", error);
      return [];
    }
  };

  const loadTodayMeal = async () => {
    try {
      setLoading(true);

      // ✨ Single unified API call to get subscription with mealPlanSnapshot
      const dashboardResult = await apiService.getMealDashboard();
      console.log("📋 Unified dashboard result:", dashboardResult);

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

          // Check if first delivery is completed - show popup if not
          const firstDeliveryCompleted = subscription.firstDeliveryCompleted;
          const hasDeliveredMeals =
            subscription.mealPlanSnapshot?.mealSchedule?.some(
              (slot) => slot.deliveryStatus === "delivered"
            );

          console.log("🚚 First delivery status:", {
            firstDeliveryCompleted,
            hasDeliveredMeals,
            shouldShowPopup: !firstDeliveryCompleted && !hasDeliveredMeals,
          });

          // Show popup if first delivery hasn't been completed
          if (!firstDeliveryCompleted && !hasDeliveredMeals) {
            setShowFirstDeliveryPopup(true);
          }

          // Load meal slots from mealPlanSnapshot.mealSchedule
          const mealSlots = getTodaysMealSlotsFromSnapshot(subscription);
          console.log("📥 mealSlots result:", mealSlots.length, "slots");

          if (mealSlots.length > 0) {
            setTodaysMealSlots(mealSlots);
            setCurrentMeal(mealSlots[0]); // Set first slot as current
            console.log(
              "✅ Today's meal slots loaded from snapshot:",
              mealSlots.length,
              "slots"
            );
            console.log("📥 First slot:", {
              customTitle: mealSlots[0].customTitle,
              customDescription: mealSlots[0].customDescription,
              imageUrl: mealSlots[0].imageUrl,
              mealsCount: mealSlots[0].meals?.length || 0,
            });
          } else {
            console.log("⚠️ No meal slots found in snapshot");
          }
        } else {
          console.log("ℹ️ No active subscription found");
        }
      }
    } catch (error) {
      console.error("Error loading today's meal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExploreMyPlan = () => {
    console.log("🔘 Explore My Plan button pressed");
    console.log(
      "📋 Active subscription:",
      activeSubscription ? "exists" : "null"
    );

    if (activeSubscription) {
      console.log("✅ Navigating to MyPlan with subscription:", {
        subscriptionId: activeSubscription._id || activeSubscription.id,
        planName:
          activeSubscription.planName ||
          activeSubscription.mealPlanId?.planName,
      });

      navigation.navigate("MyPlan", {
        subscription: activeSubscription,
        subscriptionId: activeSubscription._id || activeSubscription.id,
      });
    } else {
      console.log("❌ No active subscription found, cannot navigate");
    }
  };

  const handleGoBack = () => {
    // Navigate to Home with flag to skip subscription check
    // This prevents the loop where Home redirects back to TodayMeal
    navigation.navigate("Home", { skipSubscriptionCheck: true });
  };

  const renderMealCard = (mealSlot, index) => {
    // Extract slot data - these come directly from mealPlanSnapshot.mealSchedule
    const slotImage = mealSlot?.imageUrl;
    const slotTitle = mealSlot?.customTitle || "Today's Meal";
    const slotDescription = mealSlot?.customDescription || "";

    // Calculate total calories from all meals in this slot
    const totalCalories =
      mealSlot?.meals?.reduce((sum, meal) => {
        return sum + (meal?.nutrition?.calories || 0);
      }, 0) || 0;

    console.log(`🎴 Rendering card ${index}:`, {
      slotTitle,
      slotImage,
      mealsCount: mealSlot?.meals?.length || 0,
      totalCalories,
    });

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
        key={mealSlot?._id || mealSlot?.assignmentId || index}
        style={[
          styles(colors).mealCard,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <Image
          source={
            slotImage
              ? { uri: slotImage }
              : require("../../../assets/authImage.png")
          }
          style={styles(colors).mealImage}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles(colors).mealInfoOverlay}
        >
          <Text style={styles(colors).mealName}>{slotTitle}</Text>
          {slotDescription ? (
            <Text style={styles(colors).mealDescription}>
              {slotDescription}
            </Text>
          ) : null}
          {totalCalories > 0 && (
            <Text style={styles(colors).mealCalories}>{totalCalories} cal</Text>
          )}
        </LinearGradient>
      </Animated.View>
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
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles(colors).loadingText}>
              Loading today's meal...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Prepare meal slots array for carousel (breakfast, lunch, dinner)
  const mealSlotsToDisplay = todaysMealSlots.length > 0 ? todaysMealSlots : [];

  return (
    <View style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

      {/* First Delivery Information Popup */}
      <Modal
        visible={showFirstDeliveryPopup}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFirstDeliveryPopup(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalHeader}>
              <CustomIcon name="info" size={24} color={colors.primary} />
              <Text style={styles(colors).modalTitle}>
                Your First Meal is On Its Way!
              </Text>
            </View>

            <ScrollView style={styles(colors).modalScrollContent}>
              <Text style={styles(colors).modalSubtitle}>
                What happens next?
              </Text>

              <View style={styles(colors).statusSteps}>
                <View style={styles(colors).statusStep}>
                  <View style={styles(colors).stepNumber}>
                    <Text style={styles(colors).stepNumberText}>1</Text>
                  </View>
                  <View style={styles(colors).stepContent}>
                    <Text style={styles(colors).stepTitle}>
                      Chef Prepares Your Meal
                    </Text>
                    <Text style={styles(colors).stepDescription}>
                      Our chef is carefully preparing your delicious meal
                    </Text>
                  </View>
                </View>

                <View style={styles(colors).statusStep}>
                  <View style={styles(colors).stepNumber}>
                    <Text style={styles(colors).stepNumberText}>2</Text>
                  </View>
                  <View style={styles(colors).stepContent}>
                    <Text style={styles(colors).stepTitle}>
                      Driver Picks Up Order
                    </Text>
                    <Text style={styles(colors).stepDescription}>
                      Your meal is packaged and ready for delivery
                    </Text>
                  </View>
                </View>

                <View style={styles(colors).statusStep}>
                  <View style={styles(colors).stepNumber}>
                    <Text style={styles(colors).stepNumberText}>3</Text>
                  </View>
                  <View style={styles(colors).stepContent}>
                    <Text style={styles(colors).stepTitle}>
                      First Delivery Complete
                    </Text>
                    <Text style={styles(colors).stepDescription}>
                      Your meal plan starts and you'll see today's meals
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles(colors).modalButton}
              onPress={() => setShowFirstDeliveryPopup(false)}
              activeOpacity={0.8}
            >
              <Text style={styles(colors).modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Background with gradient */}
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

        {/* SafeAreaView for top content */}
        <SafeAreaView style={styles(colors).safeAreaTop} edges={["top"]}>
          {/* Content */}
          <View style={styles(colors).background}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <CustomIcon name="chevron-back" size={20} color={colors.white} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles(colors).logoContainer}>
              <ChomaLogo width={100} height={78} />
            </View>

            {/* Title */}
            <Text style={styles(colors).title}>My Today's{"\n"}Meal</Text>

            {/* Meal Time Badge - Shows current slot (breakfast, lunch, dinner) */}
            {mealSlotsToDisplay.length > 0 && (
              <View style={styles(colors).mealTimeBadgeContainer}>
                <View style={styles(colors).mealTimeBadge}>
                  <Text style={styles(colors).mealTimeBadgeText}>
                    {mealSlotsToDisplay[currentIndex]?.mealTime || "Meal"}
                  </Text>
                </View>
              </View>
            )}

            {/* Meal Carousel */}
            {mealSlotsToDisplay.length > 0 ? (
              <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles(colors).carouselContent}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x /
                      (CARD_WIDTH + CARD_SPACING)
                  );
                  setCurrentIndex(index);
                }}
                style={styles(colors).carousel}
              >
                {mealSlotsToDisplay.map((mealSlot, index) =>
                  renderMealCard(mealSlot, index)
                )}
              </Animated.ScrollView>
            ) : (
              <View style={styles(colors).noMealContainer}>
                <Text style={styles(colors).noMealText}>
                  No meal scheduled for today
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* Buttons - SafeAreaView for bottom */}
        <SafeAreaView style={styles(colors).safeAreaBottom} edges={["bottom"]}>
          <View style={styles(colors).buttonsContainer}>
            {/* Primary Button - Explore My Plan */}
            <TouchableOpacity
              style={styles(colors).primaryButton}
              onPress={handleExploreMyPlan}
              activeOpacity={0.8}
            >
              <Text style={styles(colors).primaryButtonText}>
                Explore my plan
              </Text>
            </TouchableOpacity>

            {/* Secondary Button - Profile (Circular) */}
            <TouchableOpacity
              style={styles(colors).secondaryButton}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <CustomIcon name="profile" size={20} color={colors.white} />
            </TouchableOpacity>
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
    safeAreaTop: {
      flex: 1,
      position: "relative",
    },
    safeAreaBottom: {
      position: "relative",
    },
    background: {
      flex: 1,
      paddingTop: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.white,
    },
    backButton: {
      position: "absolute",
      top: 30,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    backButtonText: {
      fontSize: 24,
      color: colors.white,
      fontWeight: "600",
    },
    logoContainer: {
      alignItems: "center",
      marginTop: 10,
      marginBottom: 5,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
      marginBottom: 20,
      // lineHeight: 40,
    },
    mealTimeBadgeContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    mealTimeBadge: {
      backgroundColor: "#F7AE1A",
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
      shadowColor: "#F7AE1A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    mealTimeBadgeText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#004432",
      textTransform: "capitalize",
      letterSpacing: 0.5,
    },
    carousel: {
      flexGrow: 0,
      // marginBottom: 40,
    },
    carouselContent: {
      paddingHorizontal: (width - CARD_WIDTH) / 2,
      gap: CARD_SPACING,
      // paddingVertical: 30,
    },
    mealCard: {
      width: CARD_WIDTH,
      height: height * 0.55,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.white,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      // elevation: 8,
    },
    mealImage: {
      width: "100%",
      height: "100%",
    },
    mealInfoOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      // paddingBottom: 30,
    },
    mealName: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.white,
      marginBottom: 8,
    },
    mealDescription: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.white,
      opacity: 0.85,
      marginBottom: 8,
    },
    mealCalories: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
      opacity: 0.9,
    },
    noMealContainer: {
      height: height * 0.45,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    noMealText: {
      fontSize: 18,
      color: colors.white,
      textAlign: "center",
      opacity: 0.8,
    },
    // Updated Button Styles
    buttonsContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 40,
      gap: 12,
      marginTop: 0,
      paddingBottom: 15,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: "#F7AE1A",
      paddingVertical: 18,
      borderRadius: 30,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#004432",
    },
    secondaryButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContainer: {
      backgroundColor: colors.white,
      borderRadius: 40,
      padding: 24,
      maxHeight: "85%",
      width: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      alignItems: "center",
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1b1b1b",
      textAlign: "center",
      marginTop: 4,
      width: "70%",
    },
    modalScrollContent: {
      maxHeight: 300,
    },
    modalContent: {
      flex: 1,
    },
    modalSubtitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1b1b1b",
      marginBottom: 16,
      textAlign: "center",
    },
    statusSteps: {
      marginBottom: 20,
    },
    statusStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#004432",
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#004432",
      marginBottom: 4,
    },
    stepDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    modalButton: {
      backgroundColor: "#004432",
      paddingVertical: 16,
      borderRadius: 32,
      alignItems: "center",
      // marginTop: 8,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFF",
    },
  });

export default TodayMealScreen;
