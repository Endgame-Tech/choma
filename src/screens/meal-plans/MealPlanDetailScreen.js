// src/screens/meal-plans/MealPlanDetailScreen.js
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Dimensions,
  Animated,
  FlatList,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import apiService from "../../services/api";
import discountService from "../../services/discountService";
import { useTheme } from "../../styles/theme";
import { useAuth } from "../../hooks/useAuth";
import {
  formatNumber,
  formatCalories,
  formatNutritionValue,
} from "../../utils/numberUtils";
import { THEME } from "../../utils/colors";
import MealPlanDetailSkeleton from "../../components/meal-plans/MealPlanDetailSkeleton";
import StandardHeader from "../../components/layout/Header";
import MealDetailModal from "../../components/modals/MealDetailModal";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const MealPlanDetailScreen = ({ route, navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { bundle } = route.params;
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [mealPlanDetails, setMealPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const [currentDayMeals, setCurrentDayMeals] = useState([]);

  // Discount state
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(true);

  // Animation states for smooth expand/collapse
  const animationValues = useRef({}).current;

  // Image loading handlers
  const handleImageLoad = (imageKey) => {
    setImageLoadingStates((prev) => ({ ...prev, [imageKey]: "loaded" }));
  };

  const handleImageError = (imageKey) => {
    setImageLoadingStates((prev) => ({ ...prev, [imageKey]: "error" }));
  };

  const handleImageLoadStart = (imageKey) => {
    setImageLoadingStates((prev) => ({ ...prev, [imageKey]: "loading" }));
  };

  // Open meal modal with swipe functionality
  const openMealModal = (dayMeals, initialMealIndex = 0) => {
    const formattedMeals = dayMeals.map((meal) => ({
      name: meal.name || meal.label,
      description: meal.description,
      image: meal.image,
      type: meal.label,
      nutrition: meal.nutrition,
      ingredients: meal.ingredients,
      // Extract nutrition values from nutrition object if available
      calories: meal.nutrition?.calories || meal.calories || 0,
      protein: meal.nutrition?.protein || meal.protein || 0,
      carbs: meal.nutrition?.carbs || meal.carbs || 0,
      fat: meal.nutrition?.fat || meal.fat || 0,
      fiber: meal.nutrition?.fiber || meal.fiber || 0,
      sugar: meal.nutrition?.sugar || meal.sugar || 0,
    }));

    console.log(
      "🔍 DEBUG: Formatted meals for modal:",
      JSON.stringify(formattedMeals, null, 2)
    );
    setCurrentDayMeals(formattedMeals);
    setSelectedMealIndex(initialMealIndex);
    setModalVisible(true);
  };

  // Handle share functionality
  const handleShare = async () => {
    try {
      const planName = mealPlanDetails?.planName || bundle?.name || "Meal Plan";
      const duration = mealPlanDetails?.durationWeeks
        ? `${mealPlanDetails.durationWeeks} week${
            mealPlanDetails.durationWeeks !== 1 ? "s" : ""
          }`
        : "4 weeks";
      const price = mealPlanDetails?.basePrice || bundle?.price || 25000;
      const calories = mealPlanDetails?.nutritionInfo?.avgCaloriesPerDay
        ? formatCalories(mealPlanDetails.nutritionInfo.avgCaloriesPerDay)
        : "N/A";
      const protein = mealPlanDetails?.nutritionInfo?.totalProtein
        ? formatNutritionValue(
            Math.round(
              mealPlanDetails.nutritionInfo.totalProtein /
                (mealPlanDetails.durationWeeks * 7)
            )
          ) + "g"
        : "N/A";

      const shareMessage =
        `🍽️ Check out this amazing meal plan: ${planName}!\n\n` +
        `⏱️ Duration: ${duration}\n` +
        `💰 Price: ₦${price.toLocaleString()}\n` +
        `🔥 Avg Calories/Day: ${calories}\n` +
        `💪 Avg Protein/Day: ${protein}\n\n` +
        `Download the Choma app to order your healthy meals! 📱`;

      const result = await Share.share({
        message: shareMessage,
        title: `${planName} - Choma Meal Plan`,
      });

      if (result.action === Share.sharedAction) {
        console.log("✅ Meal plan shared successfully");
      }
    } catch (error) {
      console.error("❌ Error sharing meal plan:", error);
      Alert.alert("Error", "Unable to share meal plan. Please try again.");
    }
  };

  // Fetch detailed meal plan data from backend
  useEffect(() => {
    const fetchMealPlanDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try multiple ID formats: planId (MP001), _id (ObjectId), or id
        const mealPlanId = bundle.planId || bundle._id || bundle.id;

        if (!mealPlanId) {
          throw new Error("No meal plan ID found");
        }

        console.log(
          "🔍 MealPlanDetailScreen: Fetching details for ID:",
          mealPlanId
        );

        const result = await apiService.getMealPlanDetails(mealPlanId);

        if (result.success && result.mealPlan) {
          console.log("✅ Meal plan details received");
          setMealPlanDetails(result.mealPlan);
          setError(null);
        } else {
          console.error("Failed to fetch meal plan details:", result.message);
          setError("Failed to load meal plan details");
          // Fallback to the bundle data if API call fails
          setMealPlanDetails(bundle);
        }
      } catch (error) {
        console.error("Error fetching meal plan details:", error);
        setError(error.message || "An error occurred while loading meal plan");
        // Fallback to the bundle data on exception
        setMealPlanDetails(bundle);
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlanDetails();
  }, [bundle]);

  // Fetch discount information for the user and meal plan
  useEffect(() => {
    discountService.clearCaches();

    const fetchDiscountInfo = async () => {
      // Debug logging to identify which condition is failing
      console.log("🔍 DEBUG: Checking discount fetch conditions");
      console.log("🔍 DEBUG: user:", !!user, user ? Object.keys(user) : "null");
      console.log(
        "🔍 DEBUG: mealPlanDetails:",
        !!mealPlanDetails,
        mealPlanDetails ? Object.keys(mealPlanDetails) : "null"
      );
      console.log("🔍 DEBUG: user._id:", user?._id);
      console.log("🔍 DEBUG: user.id:", user?.id);

      const userId = user?._id || user?.id;

      if (!user || !mealPlanDetails || !userId) {
        console.log("❌ DEBUG: Discount fetch skipped - missing requirements");
        console.log("❌ DEBUG: user:", !!user);
        console.log("❌ DEBUG: mealPlanDetails:", !!mealPlanDetails);
        console.log("❌ DEBUG: userId:", !!userId);
        setDiscountLoading(false);
        return;
      }

      try {
        setDiscountLoading(true);
        console.log("💰 Fetching discount info for user and meal plan");
        console.log("💰 User ID:", userId);
        console.log(
          "💰 Meal plan ID:",
          mealPlanDetails.id || mealPlanDetails._id
        );

        const discount = await discountService.calculateDiscount(
          user,
          mealPlanDetails
        );
        console.log("💰 Discount calculated:", discount);

        setDiscountInfo(discount);
      } catch (error) {
        console.error("Error fetching discount info:", error);
        // Set no discount on error
        setDiscountInfo({
          discountPercent: 0,
          discountAmount: 0,
          reason: "Error calculating discount",
        });
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscountInfo();
  }, [user, mealPlanDetails]);

  // Edited to trigger Codacy CLI analysis
  // Transform backend weekly meals data to display format
  const getWeeklyMealPlan = () => {
    if (!mealPlanDetails || !mealPlanDetails.weeklyMeals) {
      return getFallbackMealPlan();
    }

    const weeklyMealPlan = {};
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Initialize weeks
    [1, 2, 3, 4].forEach((week) => {
      weeklyMealPlan[week] = [];
    });

    Object.keys(mealPlanDetails.weeklyMeals).forEach((weekKey) => {
      const weekNumber = parseInt(weekKey.replace("week", ""));
      const weekData = mealPlanDetails.weeklyMeals[weekKey];

      if (weekNumber >= 1 && weekNumber <= 4) {
        daysOfWeek.forEach((fullDay, index) => {
          // Backend stores with full day names ('Monday', 'Tuesday', etc.)
          // Try both full day name and short day name for compatibility
          // Edited to trigger Codacy CLI analysis
          const dayData =
            weekData[fullDay] ||
            weekData[fullDay.substring(0, 3).toLowerCase()] ||
            {};

          // Debug: Log the dayData structure to understand nutrition data
          console.log(`🔍 DEBUG: Day data for ${fullDay}:`, {
            day: fullDay,
            breakfast: dayData.breakfast,
            lunch: dayData.lunch,
            dinner: dayData.dinner,
          });

          weeklyMealPlan[weekNumber].push({
            day: fullDay,
            breakfast: dayData.breakfast?.title || "Breakfast not specified",
            lunch: dayData.lunch?.title || "Lunch not specified",
            dinner: dayData.dinner?.title || "Dinner not specified",
            remark: dayData.remark || dayData.dailyComment || "No remarks",
            breakfastImage: dayData.breakfast?.imageUrl,
            lunchImage: dayData.lunch?.imageUrl,
            dinnerImage: dayData.dinner?.imageUrl,
            breakfastDescription: dayData.breakfast?.description || "",
            lunchDescription: dayData.lunch?.description || "",
            dinnerDescription: dayData.dinner?.description || "",
            // Add nutrition data for each meal
            breakfastNutrition:
              dayData.breakfast?.nutrition ||
              dayData.breakfast?.nutritionInfo ||
              null,
            lunchNutrition:
              dayData.lunch?.nutrition || dayData.lunch?.nutritionInfo || null,
            dinnerNutrition:
              dayData.dinner?.nutrition ||
              dayData.dinner?.nutritionInfo ||
              null,
          });
        });
      }
    });

    return weeklyMealPlan;
  };

  // Helper function to get meal image
  const getMealImage = (weekKey, day, mealType) => {
    if (!mealPlanDetails || !mealPlanDetails.mealImages) {
      console.log(
        "❌ No meal images data available or mealPlanDetails is null/undefined"
      );
      return null;
    }

    const mealImages = mealPlanDetails.mealImages || {}; // Ensure mealImages is an object

    // Try different formats for meal image keys
    const possibleKeys = [
      `${weekKey}_${day}_${mealType}`,
      `${weekKey}_${day.substring(0, 3).toLowerCase()}_${mealType}`,
      `${weekKey}_${day}_${mealType.toLowerCase()}`,
      `${weekKey}_${day
        .substring(0, 3)
        .toLowerCase()}_${mealType.toLowerCase()}`,
    ];

    console.log(`🔍 Looking for meal image: ${weekKey}, ${day}, ${mealType}`);
    console.log("🔑 Trying keys:", possibleKeys);
    console.log("📦 Available keys:", Object.keys(mealImages));

    for (const key of possibleKeys) {
      if (mealImages[key]) {
        console.log(`✅ Found image for key: ${key} -> ${mealImages[key]}`);
        return mealImages[key];
      }
    }

    console.log("❌ No image found for:", weekKey, day, mealType);
    return null;
  };

  // Fallback meal plan data (same as before but abbreviated for space)
  const getFallbackMealPlan = () => {
    return {
      1: [
        {
          day: "Monday",
          breakfast: "Oatmeal + milk + banana",
          lunch: "Grilled chicken + brown rice + vegetables",
          dinner: "Fish stew + plantain",
          remark: "High protein day",
        },
        // ... other days abbreviated for space
      ],
      // ... other weeks
    };
  };

  // Get admin-configured plan features
  const adminPlanFeatures =
    mealPlanDetails?.planFeatures || bundle?.planFeatures || [];

  // If admin configured features, use those; otherwise use defaults
  const features =
    adminPlanFeatures.length > 0
      ? adminPlanFeatures.map((feature) => ({
          title: feature,
          description: "",
          icon: "checkmark-circle-outline",
        }))
      : mealPlanDetails?.features ||
        bundle?.features || [
          {
            title: "Fresh Ingredients",
            description: "Daily fresh sourcing",
            icon: "leaf-outline",
          },
          {
            title: "Balanced Nutrition",
            description: "Expert-designed meals",
            icon: "fitness-outline",
          },
          {
            title: "Local Flavors",
            description: "Nigerian cuisine focus",
            icon: "location-outline",
          },
          {
            title: "Flexible Options",
            description: "Customize to preferences",
            icon: "options-outline",
          },
        ];

  const normalizedFeatures = features.map((feature, index) => {
    if (typeof feature === "string") {
      return {
        title: feature,
        description: "Feature included",
        icon: "checkmark-circle-outline",
      };
    }
    return {
      title: feature.title || `Feature ${index + 1}`,
      description: feature.description || "Feature included",
      icon: feature.icon || "checkmark-circle-outline",
    };
  });

  const renderMealRow = (icon, label, description, image) => (
    <View style={styles(colors).mealItem}>
      <View style={styles(colors).mealHeader}>
        <Text style={styles(colors).mealLabel}>
          {icon} {label}
        </Text>
        {image && (
          <TouchableOpacity
            onPress={() => openImageGallery(image, `${label} Image`)}
          >
            <Image
              source={{ uri: image }}
              style={styles(colors).mealThumbnail}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles(colors).mealText}>{description}</Text>
    </View>
  );

  // Enhanced meal card for horizontal slider - memoized
  const renderMealSliderCard = useCallback(
    (meal) => {
      const defaultImage = require("../../assets/images/meal-plans/fitfuel.jpg");
      const imageSource = meal.image
        ? typeof meal.image === "string"
          ? { uri: meal.image }
          : meal.image
        : defaultImage;

      return (
        <TouchableOpacity
          style={styles(colors).mealSliderCard}
          onPress={() => {
            // Find the meal index for the modal
            const dayMeals = [
              {
                icon: "🌅",
                label: "Breakfast",
                description: meal.description,
                image: meal.image,
              },
              {
                icon: "☀️",
                label: "Lunch",
                description: meal.description,
                image: meal.image,
              },
              {
                icon: "🌙",
                label: "Dinner",
                description: meal.description,
                image: meal.image,
              },
            ];
            const mealIndex = dayMeals.findIndex((m) => m.label === meal.label);
            openMealModal(dayMeals, mealIndex);
          }}
          activeOpacity={0.8}
        >
          <View style={styles(colors).mealSliderImageContainer}>
            <Image
              source={imageSource}
              style={styles(colors).mealSliderImage}
              defaultSource={defaultImage}
            />
            {/* Discount pill on meal image - show if discount applies to this meal plan */}
            {discountInfo && discountInfo.discountPercent > 0 && (
              <View style={styles(colors).mealDiscountPill}>
                <Ionicons name="gift-outline" size={14} color="#333" />
                <Text style={styles(colors).mealDiscountPillText}>
                  {discountInfo.discountPercent}% Off
                </Text>
              </View>
            )}
          </View>

          {/* Content Overlay with Gradient */}
          <LinearGradient
            colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.85)"]}
            style={styles(colors).mealSliderContent}
          >
            <View style={styles(colors).mealSliderInfo}>
              <Text style={styles(colors).mealSliderIcon}>{meal.icon}</Text>
              <Text style={styles(colors).mealSliderLabel}>{meal.label}</Text>
              <Text
                style={styles(colors).mealSliderDescription}
                numberOfLines={2}
              >
                {meal.description}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [colors, discountInfo, openMealModal]
  );

  // Toggle day expansion with smooth animation - memoized
  const toggleDayExpansion = useCallback(
    (day) => {
      const isExpanding = expandedDay !== day;

      if (!animationValues[day]) {
        animationValues[day] = new Animated.Value(0);
      }

      setExpandedDay(isExpanding ? day : null);

      // Enhanced spring animation for smoother expand/collapse
      Animated.spring(animationValues[day], {
        toValue: isExpanding ? 1 : 0,
        useNativeDriver: false,
        tension: 120, // Increased tension for snappier feel
        friction: 9, // Slightly increased friction for better control
        overshootClamping: false, // Allow slight bounce
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }).start();
    },
    [expandedDay, animationValues]
  );

  const renderDayCard = useCallback(
    (dayData) => {
      if (
        dayData.breakfast === "Breakfast not specified" &&
        dayData.lunch === "Lunch not specified" &&
        dayData.dinner === "Dinner not specified"
      ) {
        return null;
      }
      const animationValue =
        animationValues[dayData.day] || new Animated.Value(0);

      // Get available meal types from actual day data (filter out "not specified")
      const getAllAvailableMealTypes = () => {
        const mealTypeMap = {
          breakfast: {
            icon: "🌅",
            label: "Breakfast",
            name: dayData.breakfast,
            description: dayData.breakfastDescription,
            image: dayData.breakfastImage,
            nutrition: dayData.breakfastNutrition,
          },
          lunch: {
            icon: "☀️",
            label: "Lunch",
            name: dayData.lunch,
            description: dayData.lunchDescription,
            image: dayData.lunchImage,
            nutrition: dayData.lunchNutrition,
          },
          dinner: {
            icon: "🌙",
            label: "Dinner",
            name: dayData.dinner,
            description: dayData.dinnerDescription,
            image: dayData.dinnerImage,
            nutrition: dayData.dinnerNutrition,
          },
          snack: {
            icon: "🥜",
            label: "Snack",
            name: dayData.snack,
            description: dayData.snackDescription,
            image: dayData.snackImage,
            nutrition: dayData.snackNutrition,
          },
        };

        // Filter out meal types that are not specified or missing
        return Object.entries(mealTypeMap)
          .filter(([mealType, mealData]) => {
            return (
              mealData.name &&
              mealData.name !== `${mealData.label} not specified` &&
              mealData.name.trim() !== ""
            );
          })
          .map(([mealType, mealData]) => mealData);
      };

      // Prepare meal data for horizontal slider (only available meals)
      const meals = getAllAvailableMealTypes();

      return (
        <View
          key={dayData.day}
          style={[
            styles(colors).dayCard,
            expandedDay === dayData.day && styles(colors).dayCardExpanded,
          ]}
        >
          <TouchableOpacity
            style={styles(colors).dayHeader}
            onPress={() => toggleDayExpansion(dayData.day)}
            activeOpacity={0.7}
            accessibilityLabel={`${dayData.day} meals`}
            accessibilityHint={`Tap to ${expandedDay === dayData.day ? "collapse" : "expand"} meal details for ${dayData.day}`}
            accessibilityRole="button"
            accessible={true}
          >
            <Text style={styles(colors).dayName}>{dayData.day}</Text>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Animated expandable content - restructured for better touch handling */}
          <Animated.View
            style={[
              styles(colors).dayExpandableContent,
              {
                opacity: animationValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0, 1],
                }),
                maxHeight: animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 300], // Dynamic height instead of scaleY
                }),
              },
            ]}
            pointerEvents={expandedDay === dayData.day ? "auto" : "none"}
          >
            {expandedDay === dayData.day && (
              <View style={styles(colors).dayContent}>
                {/* Horizontal Meal Slider */}
                <View style={styles(colors).mealSliderWrapper}>
                  <FlatList
                    horizontal={meals.length > 1}
                    data={meals}
                    keyExtractor={(item) => item.label}
                    renderItem={({ item, index }) => (
                      <View
                        style={[
                          styles(colors).mealCardWrapper,
                          meals.length === 1 &&
                            styles(colors).mealCardWrapperSingle,
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles(colors).mealSliderCard,
                            meals.length === 1 &&
                              styles(colors).mealSliderCardSingle,
                          ]}
                          onPress={() => openMealModal(meals, index)}
                          activeOpacity={0.8}
                          accessibilityLabel={`${item.label}: ${item.name}`}
                          accessibilityHint={`Tap to view details about ${item.label}`}
                          accessibilityRole="button"
                          accessible={true}
                        >
                          <View style={styles(colors).mealSliderImageContainer}>
                            <Image
                              source={
                                item.image
                                  ? { uri: item.image }
                                  : require("../../assets/images/meal-plans/fitfuel.jpg")
                              }
                              style={styles(colors).mealSliderImage}
                              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                            />
                            {discountInfo &&
                              discountInfo.discountPercent > 0 && (
                                <View style={styles(colors).mealDiscountPill}>
                                  <Ionicons
                                    name="gift-outline"
                                    size={14}
                                    color="#333"
                                  />
                                  <Text
                                    style={styles(colors).mealDiscountPillText}
                                  >
                                    {discountInfo.discountPercent}% Off
                                  </Text>
                                </View>
                              )}
                          </View>
                          <LinearGradient
                            colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.85)"]}
                            style={styles(colors).mealSliderContent}
                          >
                            <View style={styles(colors).mealSliderInfo}>
                              <Text style={styles(colors).mealSliderIcon}>
                                {item.icon}
                              </Text>
                              <Text style={styles(colors).mealSliderLabel}>
                                {item.label}
                              </Text>
                              <Text
                                style={styles(colors).mealSliderDescription}
                                numberOfLines={2}
                              >
                                {item.description}
                              </Text>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles(colors).mealSliderContainer}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={true}
                    pagingEnabled={false}
                    removeClippedSubviews={true}
                    initialNumToRender={2}
                    maxToRenderPerBatch={2}
                    windowSize={10}
                    getItemLayout={(data, index) => ({
                      length: 130,
                      offset: 130 * index,
                      index,
                    })}
                    nestedScrollEnabled={true}
                  />
                </View>
                {/* Note section remains below slider */}
                {dayData.remark && dayData.remark !== "No remarks" && (
                  <View style={styles(colors).remarkContainer}>
                    <Text style={styles(colors).remarkLabel}>💡 Note:</Text>
                    <Text style={styles(colors).remarkText}>
                      {dayData.remark}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          {/* Collapsed preview (dynamic meal types based on available data) - Clickable to expand */}
          {expandedDay !== dayData.day && (
            <TouchableOpacity
              style={styles(colors).mealPreviewContainer}
              onPress={() => toggleDayExpansion(dayData.day)}
              activeOpacity={0.9}
              accessibilityLabel={`${dayData.day} meal preview`}
              accessibilityHint={`Tap to expand and view detailed meal information for ${dayData.day}`}
              accessibilityRole="button"
              accessible={true}
            >
              {meals.map((meal, index) => (
                <View
                  key={`${dayData.day}-${meal.label}-${index}`}
                  style={[
                    styles(colors).mealPreview,
                    meals.length === 1 && styles(colors).mealPreviewSingle,
                  ]}
                >
                  <Text style={styles(colors).mealIcon}>{meal.icon}</Text>
                  <Text
                    style={[
                      styles(colors).mealPreviewText,
                      meals.length === 1 &&
                        styles(colors).mealPreviewTextSingle,
                    ]}
                    numberOfLines={1}
                  >
                    {meal.name}
                  </Text>
                  {meal.image && (
                    <View style={styles(colors).mealPreviewImageContainer}>
                      <Image
                        source={{ uri: meal.image }}
                        style={styles(colors).mealPreviewImage}
                      />
                    </View>
                  )}
                </View>
              ))}
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [
      animationValues,
      expandedDay,
      toggleDayExpansion,
      openMealModal,
      colors,
      discountInfo,
    ]
  );

  const renderWeekTabs = useCallback(() => {
    const availableWeeks = Object.keys(weeklyMealPlan)
      .map((weekNum) => parseInt(weekNum))
      .filter(
        (weekNum) =>
          weeklyMealPlan[weekNum] &&
          weeklyMealPlan[weekNum].some(
            (day) =>
              day.breakfast !== "Breakfast not specified" ||
              day.lunch !== "Lunch not specified" ||
              day.dinner !== "Dinner not specified"
          )
      );

    if (availableWeeks.length === 0) {
      return null; // Don't render tabs if no weeks have meals
    }

    return (
      <View style={styles(colors).weekTabs}>
        {availableWeeks.map((week) => (
          <TouchableOpacity
            key={week}
            style={[
              styles(colors).weekTab,
              selectedWeek === week && styles(colors).weekTabActive,
            ]}
            onPress={() => {
              setSelectedWeek(week);
              setExpandedDay(null);
            }}
            accessibilityLabel={`Week ${week}`}
            accessibilityHint={`Tap to view meal plan for week ${week}`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedWeek === week }}
            accessible={true}
          >
            <Text
              style={[
                styles(colors).weekTabText,
                selectedWeek === week && styles(colors).weekTabTextActive,
              ]}
            >
              Week {week}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [weeklyMealPlan, selectedWeek, setSelectedWeek, setExpandedDay, colors]);

  const renderFeature = useCallback(
    (feature) => (
      <View key={feature.title} style={styles(colors).featureItem}>
        <View style={styles(colors).featureIcon}>
          <Ionicons name={feature.icon} size={24} color={colors.primary} />
        </View>
        <View style={styles(colors).featureText}>
          <Text style={styles(colors).featureTitle}>{feature.title}</Text>
          <Text style={styles(colors).featureDescription}>
            {feature.description}
          </Text>
        </View>
      </View>
    ),
    [colors]
  );

  const weeklyMealPlan = getWeeklyMealPlan();

  if (loading) {
    return <MealPlanDetailSkeleton />;
  }

  // Error state with retry option
  if (error && !mealPlanDetails) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StandardHeader
          title="Details"
          onBackPress={() => navigation.goBack()}
          showRightIcon={false}
        />
        <View style={styles(colors).errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.error}
          />
          <Text style={styles(colors).errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text style={styles(colors).errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles(colors).retryButton}
            accessibilityLabel="Retry loading meal plan"
            accessibilityHint="Tap to try loading the meal plan details again"
            accessibilityRole="button"
            accessible={true}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Re-trigger the useEffect by updating a dependency
              const fetchMealPlanDetails = async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const mealPlanId = bundle.planId || bundle._id || bundle.id;
                  const result =
                    await apiService.getMealPlanDetails(mealPlanId);
                  if (result.success && result.mealPlan) {
                    setMealPlanDetails(result.mealPlan);
                  } else {
                    setError("Failed to load meal plan details");
                    setMealPlanDetails(bundle);
                  }
                } catch (error) {
                  setError(error.message || "An error occurred");
                  setMealPlanDetails(bundle);
                } finally {
                  setLoading(false);
                }
              };
              fetchMealPlanDetails();
            }}
          >
            <Ionicons name="refresh" size={20} color={colors.white} />
            <Text style={styles(colors).retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <StandardHeader
        title="Details"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles(colors).heroContainer}>
          {/* Loading overlay for hero image */}
          {imageLoadingStates["hero"] === "loading" && (
            <View style={styles(colors).imageLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          <Image
            source={
              mealPlanDetails?.planImageUrl
                ? { uri: mealPlanDetails.planImageUrl }
                : require("../../assets/images/meal-plans/fitfuel.jpg")
            }
            style={styles(colors).heroImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
            onLoadStart={() => handleImageLoadStart("hero")}
            onLoad={() => handleImageLoad("hero")}
            onError={() => handleImageError("hero")}
          />

          {/* Quantity Controls */}
          <View style={styles(colors).quantityControls}>
            <TouchableOpacity
              style={styles(colors).quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              accessibilityLabel="Decrease quantity"
              accessibilityHint="Tap to reduce the number of meal plans"
              accessibilityRole="button"
              disabled={quantity <= 1}
              accessible={true}
            >
              <Ionicons name="remove" size={20} color={"#FFFFFF"} />
            </TouchableOpacity>
            <Text
              style={styles(colors).quantityText}
              accessibilityLabel={`Quantity: ${quantity}`}
              accessibilityRole="text"
              accessible={true}
            >
              {quantity}
            </Text>
            <TouchableOpacity
              style={styles(colors).quantityButton}
              onPress={() => setQuantity(quantity + 1)}
              accessibilityLabel="Increase quantity"
              accessibilityHint="Tap to add more meal plans"
              accessibilityRole="button"
              accessible={true}
            >
              <Ionicons name="add" size={20} color={"#FFFFFF"} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles(colors).bookmarkButton}
            accessibilityLabel="Add to favorites"
            accessibilityHint="Tap to save this meal plan to your favorites"
            accessibilityRole="button"
            accessible={true}
          >
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Plan Info */}
        <View style={styles(colors).planInfo}>
          <Text style={styles(colors).planTitle}>
            {mealPlanDetails?.planName || bundle?.name || "Meal Plan"}
          </Text>
          <Text style={styles(colors).planDescription}>
            {mealPlanDetails?.description ||
              bundle?.description ||
              "Comprehensive meal plan designed for your health and wellness goals."}
          </Text>

          <View style={styles(colors).planMeta}>
            <View style={styles(colors).metaItem}>
              <Ionicons name="star" size={16} color={colors.rating} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.avgRating || bundle?.rating || 4.5}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.durationWeeks
                  ? `${mealPlanDetails.durationWeeks} week${
                      mealPlanDetails.durationWeeks !== 1 ? "s" : ""
                    }`
                  : mealPlanDetails?.planDuration ||
                    bundle?.duration ||
                    "4 weeks"}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <Ionicons
                name="restaurant"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.mealTypes
                  ? `${mealPlanDetails.mealTypes.length * 7} meals/week`
                  : mealPlanDetails?.mealsPerWeek ||
                    bundle?.mealsPerWeek ||
                    21}{" "}
              </Text>
            </View>

            {/* Display admin-configured meal types */}
            {mealPlanDetails?.mealTypes &&
              mealPlanDetails.mealTypes.length > 0 && (
                <View style={styles(colors).metaItem}>
                  <Ionicons
                    name="list"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles(colors).metaText}>
                    {mealPlanDetails.mealTypes
                      .map(
                        (type) => type.charAt(0).toUpperCase() + type.slice(1)
                      )
                      .join(", ")}
                  </Text>
                </View>
              )}
          </View>

          <View style={styles(colors).priceContainer}>
            {discountLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : discountInfo && discountInfo.discountPercent > 0 ? (
              <>
                <Text style={styles(colors).currentPrice}>
                  ₦{discountInfo.discountedPrice.toLocaleString()}
                </Text>
                <Text style={styles(colors).originalPrice}>
                  ₦{discountInfo.originalPrice.toLocaleString()}
                </Text>
                <View style={styles(colors).discountPill}>
                  <Ionicons
                    name="gift-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles(colors).discountPillText}>
                    Up to {discountInfo.discountPercent}% Off
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles(colors).currentPrice}>
                ₦
                {(
                  mealPlanDetails?.basePrice ||
                  bundle?.price ||
                  25000
                ).toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles(colors).featuresSection}>
          <Text style={styles(colors).sectionTitle}>What's Included</Text>
          <View style={styles(colors).featuresList}>
            {normalizedFeatures.map(renderFeature)}
          </View>
        </View>

        {/* Weekly Meal Plan Section */}
        <View style={styles(colors).mealPlanSection}>
          <Text style={styles(colors).sectionTitle}>Weekly Meal Plan</Text>
          {renderWeekTabs()}

          <View style={styles(colors).weekContent}>
            {weeklyMealPlan[selectedWeek]?.map(renderDayCard)}
          </View>
        </View>

        {/* Premium Nutrition Info */}
        {mealPlanDetails?.nutritionInfo && (
          <View style={styles(colors).nutritionSection}>
            <Text style={styles(colors).sectionTitle}>
              Nutrition Information
            </Text>

            {/* Calories Overview Cards */}
            <View style={styles(colors).nutritionOverviewRow}>
              <View
                style={[
                  styles(colors).nutritionOverviewCard,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <View
                  style={[
                    styles(colors).nutritionOverviewIcon,
                    { backgroundColor: colors.primary + "25" },
                  ]}
                >
                  <Text style={styles(colors).nutritionOverviewEmoji}>🔥</Text>
                </View>
                <Text style={styles(colors).nutritionOverviewValue}>
                  {formatCalories(
                    mealPlanDetails.nutritionInfo.totalCalories
                  ) || "N/A"}
                </Text>
                <Text style={styles(colors).nutritionOverviewLabel}>
                  Total Calories
                </Text>
              </View>

              <View
                style={[
                  styles(colors).nutritionOverviewCard,
                  {
                    backgroundColor: colors.secondary + "15",
                    borderWidth: 1,
                    borderColor: colors.primary + "30",
                  },
                ]}
              >
                <View
                  style={[
                    styles(colors).nutritionOverviewIcon,
                    { backgroundColor: colors.secondary + "25" },
                  ]}
                >
                  <Text style={styles(colors).nutritionOverviewEmoji}>👌</Text>
                </View>
                <Text style={styles(colors).nutritionOverviewValue}>
                  {formatCalories(
                    mealPlanDetails.nutritionInfo.avgCaloriesPerDay
                  ) || "N/A"}
                </Text>
                <Text style={styles(colors).nutritionOverviewLabel}>
                  Avg. Cal/Day
                </Text>
              </View>
            </View>

            {/* Daily Nutrition Cards */}
            <Text style={styles(colors).nutritionSubtitle}>Daily Average</Text>
            <View style={styles(colors).nutritionCardsContainer}>
              <View style={styles(colors).nutritionCard}>
                <View
                  style={[
                    styles(colors).nutritionCardIcon,
                    { backgroundColor: "#FF6B6B20" },
                  ]}
                >
                  <Text style={styles(colors).nutritionCardEmoji}>🥩</Text>
                </View>
                <View style={styles(colors).nutritionCardContent}>
                  <Text style={styles(colors).nutritionCardValue}>
                    {mealPlanDetails.nutritionInfo.totalProtein
                      ? formatNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalProtein /
                              (mealPlanDetails.durationWeeks * 7)
                          )
                        ) + "g"
                      : "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionCardLabel}>Protein</Text>
                </View>
              </View>

              <View style={styles(colors).nutritionCard}>
                <View
                  style={[
                    styles(colors).nutritionCardIcon,
                    { backgroundColor: "#4ECDC420" },
                  ]}
                >
                  <Text style={styles(colors).nutritionCardEmoji}>🌽</Text>
                </View>
                <View style={styles(colors).nutritionCardContent}>
                  <Text style={styles(colors).nutritionCardValue}>
                    {mealPlanDetails.nutritionInfo.totalCarbs
                      ? formatNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalCarbs /
                              (mealPlanDetails.durationWeeks * 7)
                          )
                        ) + "g"
                      : "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionCardLabel}>Carbs</Text>
                </View>
              </View>

              <View style={styles(colors).nutritionCard}>
                <View
                  style={[
                    styles(colors).nutritionCardIcon,
                    { backgroundColor: "#FFE66D20" },
                  ]}
                >
                  <Text style={styles(colors).nutritionCardEmoji}>🥑</Text>
                </View>
                <View style={styles(colors).nutritionCardContent}>
                  <Text style={styles(colors).nutritionCardValue}>
                    {mealPlanDetails.nutritionInfo.totalFat
                      ? formatNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalFat /
                              (mealPlanDetails.durationWeeks * 7)
                          )
                        ) + "g"
                      : "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionCardLabel}>Fat</Text>
                </View>
              </View>

              <View style={styles(colors).nutritionCard}>
                <View
                  style={[
                    styles(colors).nutritionCardIcon,
                    { backgroundColor: "#95E1D320" },
                  ]}
                >
                  <Text style={styles(colors).nutritionCardEmoji}>🥗</Text>
                </View>
                <View style={styles(colors).nutritionCardContent}>
                  <Text style={styles(colors).nutritionCardValue}>
                    {mealPlanDetails.nutritionInfo.totalFiber
                      ? formatNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalFiber /
                              (mealPlanDetails.durationWeeks * 7)
                          )
                        ) + "g"
                      : "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionCardLabel}>Fiber</Text>
                </View>
              </View>
            </View>

            {/* Total Values Summary */}
            <Text style={styles(colors).nutritionSubtitle}>
              Total Plan Values
            </Text>
            <View style={styles(colors).nutritionSummaryCard}>
              <View style={styles(colors).nutritionSummaryRow}>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatNutritionValue(
                      mealPlanDetails.nutritionInfo.totalProtein
                    ) || "N/A"}
                    g
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>
                    Protein
                  </Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatNutritionValue(
                      mealPlanDetails.nutritionInfo.totalCarbs
                    ) || "N/A"}
                    g
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>
                    Carbs
                  </Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatNutritionValue(
                      mealPlanDetails.nutritionInfo.totalFat
                    ) || "N/A"}
                    g
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>Fat</Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatNutritionValue(
                      mealPlanDetails.nutritionInfo.totalFiber
                    ) || "N/A"}
                    g
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>
                    Fiber
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Admin Notes Section */}
        {mealPlanDetails?.adminNotes && mealPlanDetails.adminNotes.trim() && (
          <View style={styles(colors).adminNotesSection}>
            <Text style={styles(colors).sectionTitle}>
              Additional Information
            </Text>
            <View style={styles(colors).adminNotesContainer}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles(colors).adminNotesText}>
                {mealPlanDetails.adminNotes}
              </Text>
            </View>
          </View>
        )}

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles(colors).bottomActions}>
        <TouchableOpacity
          style={styles(colors).customizeButton}
          onPress={() => navigation.navigate("Customize", { bundle })}
          accessibilityLabel="Customize meal plan"
          accessibilityHint="Tap to customize this meal plan to your preferences"
          accessibilityRole="button"
          accessible={true}
        >
          <Ionicons name="options" size={20} color={colors.border2} />
          <Text style={styles(colors).customizeText}></Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).addToCartButton}
          onPress={() => {
            navigation.navigate("Checkout", {
              mealPlan: mealPlanDetails || bundle,
              mealPlanId:
                (mealPlanDetails &&
                  (mealPlanDetails.id || mealPlanDetails._id)) ||
                bundle?.planId ||
                bundle?.id,
            });
          }}
          accessibilityLabel={`Add ${quantity} meal plan${quantity > 1 ? "s" : ""} to subscription`}
          accessibilityHint="Tap to proceed to checkout with this meal plan"
          accessibilityRole="button"
          accessible={true}
        >
          <Text style={styles(colors).addToCartText}>
            {width < 375
              ? `ADD PLAN (${quantity})`
              : `Add to Subscription (${quantity})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Meal Detail Modal */}
      <MealDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        meals={currentDayMeals}
        initialIndex={selectedMealIndex}
      />
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    moreButton: {
      padding: 5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 100,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
      textAlign: "center",
    },
    errorMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 24,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      gap: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.black,
    },
    heroContainer: {
      position: "relative",
      margin: 15,
      borderRadius: 30,
      overflow: "hidden",
      height: 400,
      borderWidth: 1,
      borderColor: colors.border2,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    imageLoadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.cardBackground,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
      borderRadius: 30,
    },
    imageGradientOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 100,
    },
    quantityControls: {
      position: "absolute",
      bottom: 15,
      left: 15,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1b1b1b",
      borderRadius: THEME.borderRadius.xxl,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    quantityButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "#1b1b1b",
      justifyContent: "center",
      alignItems: "center",
    },
    quantityText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
      marginHorizontal: 15,
    },
    bookmarkButton: {
      position: "absolute",
      bottom: 15,
      right: 15,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#1b1b1b",
      justifyContent: "center",
      alignItems: "center",
    },
    planInfo: {
      padding: 20,
    },
    planTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 12,
    },
    planMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 16,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 20,
      marginBottom: 8,
      flexShrink: 1,
      minWidth: 0,
    },
    metaText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
      fontWeight: "500",
      flexShrink: 1,
      minWidth: 0,
    },
    planDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: 20,
    },
    sizeSection: {
      marginBottom: 20,
    },
    sizeTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    sizeOptions: {
      flexDirection: "row",
      gap: 12,
    },
    sizeOption: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sizeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sizeOptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    sizeOptionTextActive: {
      color: colors.black,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
    },
    currentPrice: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginRight: 12,
    },
    originalPrice: {
      fontSize: 16,
      color: colors.textMuted,
      textDecorationLine: "line-through",
      marginRight: 12,
    },
    // Discount Pill Design
    discountPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryDark2,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 25, // Fully rounded pill shape
      alignSelf: "flex-start",
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border2,
    },
    discountPillText: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.primary,
      marginLeft: 6,
    },
    featuresSection: {
      // padding: 20,
      // backgroundColor: "#F3E9DF",
      marginHorizontal: 20,
      borderRadius: THEME.borderRadius.large,
      marginBottom: 20,
    },
    featuresList: {
      gap: 16,
      padding: 20,
      borderRadius: THEME.borderRadius.large,
      borderWidth: 1,
      borderColor: `${colors.border2}50`,
      // backgroundColor: "#F3E9DF",
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    mealPlanSection: {
      padding: 20,
    },
    weekTabs: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.xxl,
      padding: 4,
      marginBottom: 20,
    },
    weekTab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.xxl,
      alignItems: "center",
    },
    weekTabActive: {
      backgroundColor: colors.primary,
    },
    weekTabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    weekTabTextActive: {
      color: colors.black,
    },
    weekContent: {
      gap: 12,
    },
    dayCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayCardExpanded: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    dayName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    dayContent: {
      gap: 12,
    },
    mealItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    mealLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      flex: 1,
    },
    mealThumbnail: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginLeft: 8,
    },
    mealText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    remarkContainer: {
      backgroundColor: `${colors.rating}20`,
      padding: 12,
      borderRadius: THEME.borderRadius.small,
      borderLeftWidth: 4,
      borderLeftColor: colors.rating,
    },
    remarkLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.rating,
      marginBottom: 4,
    },
    remarkText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: "italic",
    },
    mealPreviewContainer: {
      gap: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    mealPreview: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    mealPreviewSingle: {
      width: "100%",
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mealIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    mealPreviewText: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    mealPreviewTextSingle: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    mealPreviewImageContainer: {
      position: "relative",
      marginLeft: 8,
    },
    mealPreviewImage: {
      width: 40,
      height: 30,
      borderRadius: 4,
    },
    nutritionSection: {
      padding: 20,
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      borderRadius: THEME.borderRadius.large,
      marginBottom: 20,
    },
    nutritionSubtitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    // Overview Cards (Calories)
    nutritionOverviewRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    nutritionOverviewCard: {
      flex: 1,
      padding: 20,
      borderRadius: THEME.borderRadius.large,
      alignItems: "center",
    },
    nutritionOverviewIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    nutritionOverviewEmoji: {
      fontSize: 24,
    },
    nutritionOverviewValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    nutritionOverviewLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Daily Nutrition Cards
    nutritionCardsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 5,
    },
    nutritionCard: {
      width: (width - 90) / 2, // Two cards per row with margins
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      elevation: 1,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    nutritionCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    nutritionCardEmoji: {
      fontSize: 18,
    },
    nutritionCardContent: {
      flex: 1,
    },
    nutritionCardValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 2,
    },
    nutritionCardLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Summary Card
    nutritionSummaryCard: {
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
      padding: 20,
      elevation: 1,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    nutritionSummaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    nutritionSummaryItem: {
      alignItems: "center",
      flex: 1,
    },
    nutritionSummaryValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4,
    },
    nutritionSummaryLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Legacy styles (keeping for compatibility)
    nutritionGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: colors.background,
      padding: 20,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 12,
    },
    nutritionItem: {
      alignItems: "center",
    },
    nutritionValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4,
    },
    nutritionLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Admin Notes Styles
    adminNotesSection: {
      padding: 20,
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      borderRadius: THEME.borderRadius.large,
      marginBottom: 20,
    },
    adminNotesContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: `${colors.primaryLight}20`,
      padding: 15,
      borderRadius: THEME.borderRadius.medium,
    },
    adminNotesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginLeft: 10,
      flex: 1,
    },
    customizeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      paddingHorizontal: width < 375 ? 12 : 20, // Adaptive padding for small screens
      borderRadius: 70,
      borderWidth: 1.5,
      borderColor: colors.border2,
      backgroundColor: colors.background,
      minWidth: width < 375 ? 100 : 120, // Minimum width based on screen size
      maxWidth: width < 375 ? 140 : 180, // Maximum width to prevent overflow
      flex: 0.4, // Takes 40% of available space
    },
    aboutSection: {
      padding: 20,
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      borderRadius: THEME.borderRadius.large,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    aboutText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    bottomPadding: {
      height: 20,
    },
    bottomActions: {
      flexDirection: "row",
      padding: width < 375 ? 15 : 20, // Less padding on small screens
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: width < 375 ? 10 : 15, // Smaller gap on small screens
      alignItems: "center",
      justifyContent: "space-between",
    },
    addToCartButton: {
      flex: 0.6, // Takes 60% of available space (was flex: 1)
      backgroundColor: colors.primary,
      borderRadius: 70,
      paddingVertical: 16,
      paddingHorizontal: width < 375 ? 8 : 12, // Adaptive horizontal padding
      justifyContent: "center",
      alignItems: "center",
      minWidth: width < 375 ? 180 : 200, // Minimum width for button
      maxWidth: width < 375 ? 220 : 280, // Maximum width to prevent overflow
    },
    addToCartText: {
      fontSize: width < 375 ? 13 : 16, // Smaller font on small screens
      fontWeight: "bold",
      color: colors.black,
      textAlign: "center",
      numberOfLines: 1, // Prevent text wrapping
      adjustsFontSizeToFit: true, // Auto-adjust font size to fit
      minimumFontScale: 0.8, // Minimum scale for font size
    },
    // Enhanced Meal Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      width: width,
      height: height * 0.95,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 15,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 18,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.error,
      justifyContent: "center",
      alignItems: "center",
    },
    modalScrollView: {
      flex: 1,
    },
    fullImageContainer: {
      width: "100%",
      height: height * 0.4,
      position: "relative",
      paddingHorizontal: 10,
    },
    fullMealImage: {
      width: "100%",
      height: "100%",
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      borderWidth: 1,
      borderColor: colors.border2,
      marginBottom: 10,
    },
    imageGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 50,
    },
    mealDetailsSection: {
      padding: 20,
      gap: 15,
    },
    detailCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    mealDescriptionText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    modalActions: {
      flexDirection: "row",
      gap: 15,
      marginTop: 10,
    },
    shareButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: THEME.borderRadius.medium,
      gap: 8,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    actionButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.medium,
      minWidth: 0,
      flexShrink: 1,
    },
    actionText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 8,
      flexShrink: 1,
      minWidth: 0,
    },

    // New styles for enhanced meal slider
    dayExpandableContent: {
      overflow: "hidden",
      backgroundColor: "transparent",
    },
    mealSliderWrapper: {
      height: 140, // Fixed height to ensure proper scrolling
      marginVertical: 10,
      width: "100%",
      backgroundColor: "transparent",
    },
    mealSliderList: {
      flexGrow: 0,
      height: "100%",
    },
    mealSliderContainer: {
      paddingHorizontal: 15,
      // paddingVertical: 15,
      alignItems: "center",
    },
    mealCardWrapper: {
      marginRight: 15,
    },
    mealCardWrapperSingle: {
      marginRight: 0,
      width: "100%",
    },
    mealSliderCard: {
      width: 130,
      height: 140,
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      backgroundColor: colors.cardBackground,
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    mealSliderCardSingle: {
      width: "100%",
      height: 125,
      flexDirection: "row",
      // alignItems: "center",
    },
    mealSliderImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    mealSliderImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    mealSliderContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: "flex-end",
    },
    mealSliderInfo: {
      alignItems: "flex-start",
    },
    mealSliderIcon: {
      fontSize: 16,
      marginBottom: 2,
    },
    mealSliderLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.white,
      flexShrink: 1,
      minWidth: 0,
      marginBottom: 1,
    },
    mealSliderDescription: {
      fontSize: 14,
      color: colors.white,
      marginTop: 5,
      fontWeight: 300,
      flexShrink: 1,
      minWidth: 0,
    },
  });

export default MealPlanDetailScreen;
