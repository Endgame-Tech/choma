import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import apiService from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import ChomaLogo from "../ui/ChomaLogo";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = 20;

const TodayMealScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [currentMeal, setCurrentMeal] = useState(null);
  const [adjacentMeals, setAdjacentMeals] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadTodayMeal();
  }, []);

  const loadTodayMeal = async () => {
    try {
      setLoading(true);

      // Get user's active subscriptions
      const dashboardResult = await apiService.getUserDashboard();
      console.log("📋 Dashboard result:", dashboardResult);

      if (dashboardResult?.success && dashboardResult?.data) {
        // Handle nested data structure: data.data or just data
        const dashboardData = dashboardResult.data.data || dashboardResult.data;

        console.log("📊 Dashboard data structure:", {
          hasActiveSubscription: dashboardData.hasActiveSubscription,
          hasSubscription: !!dashboardData.subscription,
        });

        // Try to get active subscription from dashboard (preferred method)
        let active = null;

        if (dashboardData.hasActiveSubscription && dashboardData.subscription) {
          active = dashboardData.subscription;
          console.log("✅ Found subscription from dashboard.subscription");
        } else {
          // Fallback: check subscriptions array
          const subscriptions = dashboardData.subscriptions || [];
          active = subscriptions.find(
            (sub) => sub.status === "active" || sub.status === "Active"
          );
          console.log("✅ Found subscription from subscriptions array");
        }

        if (active) {
          console.log("📦 Setting active subscription:", {
            id: active._id || active.id,
            planName: active.planName || active.mealPlanId?.planName,
          });
          setActiveSubscription(active);

          // Get current meal for this subscription
          const currentMealResult = await apiService.getSubscriptionCurrentMeal(
            active._id || active.id
          );
          console.log("🍽️ Current meal result:", currentMealResult);

          if (currentMealResult?.success && currentMealResult?.data) {
            setCurrentMeal(currentMealResult.data);
          }

          // Get meal timeline for adjacent meals
          const timelineResult = await apiService.getSubscriptionMealTimeline(
            active._id || active.id,
            7
          );
          console.log("📅 Timeline result:", timelineResult);

          if (timelineResult?.success && timelineResult?.data) {
            const meals = timelineResult.data.meals || [];
            setAdjacentMeals(meals);

            // Find current meal index in timeline
            const todayIndex = meals.findIndex((meal) => meal.isToday);
            if (todayIndex !== -1) {
              setCurrentIndex(todayIndex);
            }
          }
        } else {
          console.log("❌ No active subscription found in dashboard");
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

  const handleSearch = () => {
    navigation.navigate("SearchScreen");
  };

  const renderMealCard = (meal, index) => {
    const isCenter = index === currentIndex;
    const isMealToday =
      meal?.isToday || (currentMeal && meal?._id === currentMeal._id);

    return (
      <View
        key={meal?._id || index}
        style={[styles(colors).mealCard, isCenter && styles(colors).centerCard]}
      >
        <Image
          source={
            meal?.image
              ? { uri: meal.image }
              : meal?.mealImage
              ? { uri: meal.mealImage }
              : require("../../../assets/authImage.png")
          }
          style={styles(colors).mealImage}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles(colors).mealInfoOverlay}
        >
          <Text style={styles(colors).mealName}>
            {meal?.name || meal?.mealName || "Delicious Meal"}
          </Text>
          {meal?.calories && (
            <Text style={styles(colors).mealCalories}>
              cal: {meal.calories}
            </Text>
          )}
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor="#652815" />
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles(colors).loadingText}>
            Loading today's meal...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare meals array for carousel
  const mealsToDisplay =
    adjacentMeals.length > 0 ? adjacentMeals : currentMeal ? [currentMeal] : [];

  return (
    <SafeAreaView style={styles(colors).container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#652815" />

      {/* Background */}
      <LinearGradient
        colors={["#652815", "#7A2E18"]}
        style={styles(colors).background}
      >
        {/* Logo */}
        <View style={styles(colors).logoContainer}>
          <ChomaLogo width={140} height={78} />
        </View>

        {/* Title */}
        <Text style={styles(colors).title}>My Today's{"\n"}Meal</Text>

        {/* Meal Carousel */}
        {mealsToDisplay.length > 0 ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles(colors).carouselContent}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING)
              );
              setCurrentIndex(index);
            }}
            style={styles(colors).carousel}
          >
            {mealsToDisplay.map((meal, index) => renderMealCard(meal, index))}
          </ScrollView>
        ) : (
          <View style={styles(colors).noMealContainer}>
            <Text style={styles(colors).noMealText}>
              No meal scheduled for today
            </Text>
          </View>
        )}

        {/* Buttons - Updated to match reference image */}
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

          {/* Secondary Button - Search (Circular) */}
          <TouchableOpacity
            style={styles(colors).secondaryButton}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Text style={styles(colors).secondaryButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: "#652815",
    },
    background: {
      flex: 1,
      paddingTop: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#652815",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.white,
    },
    logoContainer: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
      marginBottom: 20,
      // lineHeight: 40,
    },
    carousel: {
      flexGrow: 0,
      marginBottom: 40,
    },
    carouselContent: {
      paddingHorizontal: (width - CARD_WIDTH) / 2,
      gap: CARD_SPACING,
      paddingVertical: 30,
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
      elevation: 8,
      transform: [{ scale: 0.9 }],
      opacity: 0.7,
    },
    centerCard: {
      transform: [{ scale: 1 }],
      opacity: 1,
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
      paddingBottom: 30,
    },
    mealName: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.white,
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
      // marginTop: "auto",
      paddingBottom: 15,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: "#E8B44A",
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
      color: "#652815",
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
    secondaryButtonText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.white,
    },
  });

export default TodayMealScreen;
