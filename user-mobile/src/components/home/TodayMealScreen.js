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

      // ✨ NEW: Single unified API call instead of 3 sequential calls
      const dashboardResult = await apiService.getMealDashboard();
      console.log("📋 Unified dashboard result:", dashboardResult);

      if (dashboardResult?.success && dashboardResult?.data) {
        const data = dashboardResult.data;

        if (data.hasActiveSubscription && data.activeSubscription) {
          console.log(
            "✅ Setting active subscription:",
            data.activeSubscription.planName
          );
          setActiveSubscription(data.activeSubscription);

          // Set current meal
          if (data.currentMeal) {
            setCurrentMeal(data.currentMeal);
            console.log("🍽️ Current meal:", data.currentMeal.customTitle);
          }

          // Set timeline meals (already transformed by backend)
          if (data.mealTimeline && data.mealTimeline.length > 0) {
            setAdjacentMeals(data.mealTimeline);

            // Find current meal index in timeline (today's meal)
            const todayIndex = data.mealTimeline.findIndex(
              (meal) => meal.isToday
            );
            if (todayIndex !== -1) {
              setCurrentIndex(todayIndex);
              console.log("📍 Today's meal index:", todayIndex);
            }
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

  const handleSearch = () => {
    navigation.navigate("SearchScreen");
  };

  const handleGoBack = () => {
    // Navigate to Home with flag to skip subscription check
    // This prevents the loop where Home redirects back to TodayMeal
    navigation.navigate("Home", { skipSubscriptionCheck: true });
  };

  const renderMealCard = (meal, index) => {
    const isCenter = index === currentIndex;
    const isMealToday =
      meal?.isToday || (currentMeal && meal?._id === currentMeal._id);

    // Extract meal data from the backend structure
    const mealImage =
      meal?.imageUrl ||
      meal?.meals?.[0]?.image ||
      meal?.image ||
      meal?.mealImage;
    const mealName =
      meal?.customTitle ||
      meal?.meals?.[0]?.name ||
      meal?.name ||
      meal?.mealName;
    const mealCalories =
      meal?.meals?.[0]?.nutrition?.calories || meal?.calories;

    return (
      <View
        key={meal?._id || meal?.assignmentId || index}
        style={[styles(colors).mealCard, isCenter && styles(colors).centerCard]}
      >
        <Image
          source={
            mealImage
              ? { uri: mealImage }
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
            {mealName || "Today's Special"}
          </Text>
          {mealCalories && (
            <Text style={styles(colors).mealCalories}>{mealCalories} cal</Text>
          )}
        </LinearGradient>
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
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles(colors).loadingText}>
              Loading today's meal...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Prepare meals array for carousel
  const mealsToDisplay =
    adjacentMeals.length > 0 ? adjacentMeals : currentMeal ? [currentMeal] : [];

  return (
    <View style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

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
                  event.nativeEvent.contentOffset.x /
                    (CARD_WIDTH + CARD_SPACING)
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

            {/* Secondary Button - Search (Circular) */}
            <TouchableOpacity
              style={styles(colors).secondaryButton}
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <CustomIcon name="search" size={20} color={colors.white} />
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
      top: 10,
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
  });

export default TodayMealScreen;
