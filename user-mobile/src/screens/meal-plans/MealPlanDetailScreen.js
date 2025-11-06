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
import CustomIcon from "../../components/ui/CustomIcon";
import { LinearGradient } from "expo-linear-gradient";
import apiService from "../../services/api";
import discountService from "../../services/discountService";
import { useTheme } from "../../styles/theme";
import { useAuth } from "../../hooks/useAuth";
import {
  formatNumber,
  formatCalories,
  formatNutritionValue,
  formatApproximateNumber,
  formatApproximateCalories,
  formatApproximateNutritionValue,
} from "../../utils/numberUtils";
import { THEME } from "../../utils/colors";
import MealPlanDetailSkeleton from "../../components/meal-plans/MealPlanDetailSkeleton";
import BlendSvg from "../../../assets/blend.svg";
import StandardHeader from "../../components/layout/Header";
import MealDetailModal from "../../components/modals/MealDetailModal";
import RatingModal from "../../components/rating/RatingModal";
import RatingDisplay from "../../components/rating/RatingDisplay";
import { ratingApi } from "../../services/ratingApi";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const MealPlanDetailScreen = ({ route, navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { bundle } = route.params;
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Fetch ratings for this meal plan
  const fetchRatings = useCallback(async () => {
    console.log("🚀 fetchRatings called - entry point", {
      mealPlanDetailsInside: !!mealPlanDetails,
      mealPlanDetailsId: mealPlanDetails?._id,
      bundleId: bundle?._id,
    });

    if (!mealPlanDetails) {
      console.log("❌ fetchRatings: no mealPlanDetails, returning early", {
        mealPlanDetailsType: typeof mealPlanDetails,
        mealPlanDetailsValue: mealPlanDetails,
      });
      return;
    }

    console.log("🔄 fetchRatings: starting execution", {
      mealPlanDetailsId: mealPlanDetails._id,
      bundleId: bundle?._id,
      hasRatingApi: !!ratingApi,
    });

    try {
      setRatingsLoading(true);
      const mealPlanId =
        mealPlanDetails._id ||
        mealPlanDetails.planId ||
        bundle._id ||
        bundle.planId;

      // Get rating statistics
      console.log("📊 About to call ratingApi.getEntityStats with:", {
        entityType: "meal_plan",
        mealPlanId: mealPlanId,
      });

      const statsResponse = await ratingApi.getEntityStats(
        "meal_plan",
        mealPlanId
      );

      console.log("📊 Rating stats API response:", {
        success: statsResponse?.success,
        hasData: !!statsResponse?.data,
        responseKeys: Object.keys(statsResponse || {}),
      });
      if (statsResponse.success) {
        console.log("📊 Rating stats fetched:", statsResponse.data);
        console.log(
          "   totalRatings:",
          statsResponse.data?.overallStats?.totalRatings
        );
        console.log(
          "   averageRating:",
          statsResponse.data?.overallStats?.averageRating
        );
        setRatingStats(statsResponse.data);
      } else {
        console.log("❌ Failed to fetch rating stats:", statsResponse);
        setRatingStats(null);
      }

      // Get existing ratings (first page for display)
      const ratingsResponse = await ratingApi.getEntityRatings(
        "meal_plan",
        mealPlanId,
        {
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
        }
      );
      if (ratingsResponse.success) {
        console.log(
          "📝 Existing ratings fetched:",
          ratingsResponse.data.ratings?.length || 0
        );
        console.log(
          "   ratings details:",
          ratingsResponse.data.ratings?.map((r) => ({
            id: r._id,
            overallRating: r.overallRating,
            comment: r.comment,
            ratedBy: r.ratedBy?.name || r.ratedBy,
          }))
        );
        setExistingRatings(ratingsResponse.data.ratings || []);
      } else {
        console.log("❌ Failed to fetch existing ratings:", ratingsResponse);
      }

      // Check if current user has already rated this meal plan
      const userRatingsResponse = await ratingApi.getMyRatings({
        entityType: "meal_plan",
        ratingType: "meal_plan",
      });
      if (userRatingsResponse.success) {
        console.log("🔍 Looking for existing user rating:");
        console.log("   mealPlanId:", mealPlanId);
        console.log(
          "   all user ratings:",
          userRatingsResponse.data.ratings?.map((r) => ({
            id: r._id,
            ratedEntity: r.ratedEntity,
            overallRating: r.overallRating,
          }))
        );

        const userMealPlanRating = userRatingsResponse.data.ratings?.find(
          (rating) => rating.ratedEntity === mealPlanId
        );

        console.log("   found existing rating:", !!userMealPlanRating);
        if (userMealPlanRating) {
          console.log("   existing rating details:", {
            id: userMealPlanRating._id,
            overallRating: userMealPlanRating.overallRating,
            comment: userMealPlanRating.comment,
          });
        }

        setUserRating(userMealPlanRating || null);
      }
    } catch (error) {
      console.error("❌ Error in fetchRatings:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } finally {
      setRatingsLoading(false);
    }
  }, [mealPlanDetails, bundle]);

  // Handle rating submission
  const handleRatingSubmit = async (ratingData) => {
    try {
      console.log("🔍 Rating submission debug:");
      console.log("   userRating exists:", !!userRating);
      console.log("   userRating._id:", userRating?._id);

      if (userRating) {
        // Update existing rating
        console.log("📝 Updating existing rating:", userRating._id);
        await ratingApi.updateRating(userRating._id, ratingData);
      } else {
        // Create new rating
        console.log("➕ Creating new rating");
        await ratingApi.createRating(ratingData);
      }

      // Refresh ratings after submission
      console.log("🔄 Refreshing ratings and stats after submission...");
      await fetchRatings();

      // Force a delay to ensure backend processing is complete
      setTimeout(async () => {
        console.log("🔄 Secondary refresh of ratings after delay...");
        await fetchRatings();
      }, 2000);

      // Refresh meal plan details to get updated avgRating
      const planId =
        mealPlanDetails._id ||
        mealPlanDetails.planId ||
        bundle._id ||
        bundle.planId;
      if (planId) {
        try {
          const response = await apiService.request(`/mealplans/${planId}`);
          if (response.success && response.data) {
            setMealPlanDetails(response.data);
            console.log("✅ Meal plan details refreshed with updated rating");
          }
        } catch (refreshError) {
          console.error("Error refreshing meal plan details:", refreshError);
          // Don't show error to user as rating submission was successful
        }
      }

      // Subtle success feedback without intrusive popup
      console.log("✅ Rating submitted successfully");
      // Could add a toast notification or update UI to show success
    } catch (error) {
      console.error("Error submitting rating:", error);

      // Better error handling with specific messages
      let errorMessage = "Failed to submit rating. Please try again.";

      if (error.message && error.message.includes("already rated")) {
        // This means the rating was already created, try to update it instead
        console.log(
          "⚠️ Rating already exists, attempting to find and update it"
        );
        try {
          // Refresh ratings to get the latest user rating
          await fetchRatings();
          // The error suggests the rating exists but our frontend didn't detect it
          errorMessage = "Your rating has been recorded successfully.";
          Alert.alert("Rating Updated", errorMessage, [{ text: "OK" }]);
          return; // Don't show the error, treat as success
        } catch (fetchError) {
          console.error("Error fetching updated ratings:", fetchError);
        }
        errorMessage =
          "You have already rated this meal plan. Your rating has been updated.";
      } else if (error.message && error.message.includes("not found")) {
        errorMessage = "This meal plan is no longer available for rating.";
      } else if (error.message && error.message.includes("unauthorized")) {
        errorMessage = "Please log in to rate this meal plan.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Rating Error", errorMessage, [{ text: "OK" }]);
    }
  };
  const [expandedDays, setExpandedDays] = useState([]);
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

  // Rating state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [existingRatings, setExistingRatings] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Animation states for smooth expand/collapse
  const animationValues = useRef({}).current;

  // Scroll animation values for meal sliders
  const mealScrollValues = useRef({}).current;

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
        ? mealPlanDetails.isFiveWorkingDays
          ? `${mealPlanDetails.durationWeeks * 5} Days Plan`
          : `${mealPlanDetails.durationWeeks} week${
              mealPlanDetails.durationWeeks !== 1 ? "s" : ""
            }`
        : "4 weeks";
      const price = mealPlanDetails?.basePrice || bundle?.price || 25000;
      const calories = mealPlanDetails?.nutritionInfo?.avgCaloriesPerDay
        ? formatApproximateCalories(
            mealPlanDetails.nutritionInfo.avgCaloriesPerDay
          )
        : "N/A";
      const totalDays = mealPlanDetails?.isFiveWorkingDays
        ? mealPlanDetails.durationWeeks * 5
        : mealPlanDetails.durationWeeks * 7;
      const protein = mealPlanDetails?.nutritionInfo?.totalProtein
        ? formatApproximateNutritionValue(
            Math.round(mealPlanDetails.nutritionInfo.totalProtein / totalDays),
            "g"
          )
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

        // Priority: Use the meal plan's own ID first, then fall back to planId reference
        // This ensures duplicated meal plans show their own details, not the original's
        const mealPlanId = bundle._id || bundle.id || bundle.planId;

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

        // Extract meal plan ID with multiple fallbacks
        const mealPlanId =
          mealPlanDetails._id ||
          mealPlanDetails.id ||
          mealPlanDetails.planId ||
          bundle._id ||
          bundle.id ||
          bundle.planId;

        console.log("💰 Meal plan ID:", mealPlanId);
        console.log(
          "💰 DEBUG - mealPlanDetails keys:",
          Object.keys(mealPlanDetails || {})
        );

        if (!mealPlanId) {
          console.error("❌ No meal plan ID found in any expected field");
          setDiscountInfo({
            discountPercent: 0,
            discountAmount: 0,
            reason: "No meal plan ID available",
          });
          setDiscountLoading(false);
          return;
        }

        // Create a meal plan object with guaranteed ID for discount calculation
        const mealPlanForDiscount = {
          ...mealPlanDetails,
          _id: mealPlanId,
          id: mealPlanId,
        };

        const discount = await discountService.calculateDiscount(
          user,
          mealPlanForDiscount
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

  // Debug mealPlanDetails changes
  useEffect(() => {
    console.log("🎯 mealPlanDetails changed:", {
      hasMealPlanDetails: !!mealPlanDetails,
      mealPlanId: mealPlanDetails?._id || mealPlanDetails?.planId,
      planName: mealPlanDetails?.planName,
      fetchRatingsExists: typeof fetchRatings === "function",
    });
  }, [mealPlanDetails]);

  // Fetch ratings when meal plan details are loaded
  useEffect(() => {
    console.log("🎯 Rating useEffect triggered:", {
      mealPlanDetails: !!mealPlanDetails,
      mealPlanId: mealPlanDetails?._id || mealPlanDetails?.planId,
      fetchRatingsType: typeof fetchRatings,
    });

    if (mealPlanDetails) {
      console.log("🔄 Calling fetchRatings directly from useEffect...");

      // Call fetchRatings directly to avoid closure issues
      const fetchRatingsDirectly = async () => {
        console.log("🚀 fetchRatingsDirectly - entry point", {
          mealPlanDetailsInside: !!mealPlanDetails,
          mealPlanDetailsId: mealPlanDetails?._id,
        });

        try {
          setRatingsLoading(true);
          const mealPlanId =
            mealPlanDetails._id ||
            mealPlanDetails.planId ||
            bundle._id ||
            bundle.planId;

          console.log("📊 About to call ratingApi.getEntityStats with:", {
            entityType: "meal_plan",
            mealPlanId: mealPlanId,
          });

          const statsResponse = await ratingApi.getEntityStats(
            "meal_plan",
            mealPlanId
          );

          console.log("📊 Rating stats API response:", {
            success: statsResponse?.success,
            hasData: !!statsResponse?.data,
            responseKeys: Object.keys(statsResponse || {}),
          });

          if (statsResponse.success) {
            console.log("📊 Rating stats fetched:", statsResponse.data);
            setRatingStats(statsResponse.data);
          } else {
            console.log("❌ Failed to fetch rating stats:", statsResponse);
            setRatingStats(null);
          }

          // Get existing ratings
          const ratingsResponse = await ratingApi.getEntityRatings(
            "meal_plan",
            mealPlanId,
            {
              limit: 5,
              sortBy: "createdAt",
              sortOrder: "desc",
            }
          );

          console.log("📝 Ratings API full response:", {
            success: ratingsResponse?.success,
            hasData: !!ratingsResponse?.data,
            dataKeys: Object.keys(ratingsResponse?.data || {}),
            ratingsArray: ratingsResponse?.data?.ratings,
            ratingsLength: ratingsResponse?.data?.ratings?.length,
            totalCount: ratingsResponse?.data?.totalCount,
            pagination: ratingsResponse?.data?.pagination,
            fullData: ratingsResponse?.data,
            isDataArray: Array.isArray(ratingsResponse?.data),
            dataLength: Array.isArray(ratingsResponse?.data)
              ? ratingsResponse.data.length
              : 0,
          });

          if (ratingsResponse.success) {
            // The actual structure is: response.data.data.ratings
            const ratingsArray =
              ratingsResponse.data?.data?.ratings ||
              ratingsResponse.data?.ratings ||
              (Array.isArray(ratingsResponse.data) ? ratingsResponse.data : []);

            console.log("📝 Existing ratings fetched:", ratingsArray.length);
            console.log(
              "📝 Rating comments:",
              ratingsArray.map((r) => ({
                id: r._id,
                overallRating: r.overallRating,
                comment: r.comment,
                hasComment: !!r.comment,
                commentLength: r.comment?.length || 0,
                ratedBy: r.ratedBy?.name || r.ratedBy,
              }))
            );
            setExistingRatings(ratingsArray);
          } else {
            console.log(
              "❌ Failed to fetch existing ratings:",
              ratingsResponse
            );
          }
        } catch (error) {
          console.error("❌ Error in fetchRatingsDirectly:", error);
        } finally {
          setRatingsLoading(false);
        }
      };

      fetchRatingsDirectly();
    } else {
      console.log("❌ Skipping fetchRatings - no mealPlanDetails");
    }
  }, [mealPlanDetails]);

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

    // Initialize weeks dynamically based on durationWeeks
    const totalWeeks = mealPlanDetails.durationWeeks || 4;
    Array.from({ length: totalWeeks }, (_, i) => i + 1).forEach((week) => {
      weeklyMealPlan[week] = [];
    });

    Object.keys(mealPlanDetails.weeklyMeals).forEach((weekKey) => {
      const weekNumber = parseInt(weekKey.replace("week", ""));
      const weekData = mealPlanDetails.weeklyMeals[weekKey];

      if (weekNumber >= 1 && weekNumber <= totalWeeks) {
        daysOfWeek.forEach((fullDay, index) => {
          // Backend stores with full day names ('Monday', 'Tuesday', etc.)
          // Try both full day name and short day name for compatibility
          // Edited to trigger Codacy CLI analysis
          const dayData =
            weekData[fullDay] ||
            weekData[fullDay.substring(0, 3).toLowerCase()] ||
            {};

          // Debug: Log the dayData structure to understand nutrition data
          // Commented out to prevent excessive logging on every render
          // console.log(`🔍 DEBUG: Day data for ${fullDay}:`, {
          //   day: fullDay,
          //   breakfast: dayData.breakfast,
          //   lunch: dayData.lunch,
          //   dinner: dayData.dinner,
          // });

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
        icon: "list",
      };
    }
    return {
      title: feature.title || `Feature ${index + 1}`,
      description: feature.description || "Feature included",
      icon: feature.icon || "list",
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
          activeOpacity={0.9}
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
                <CustomIcon name="gift" size={14} color="#333" />
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
      const isCurrentlyExpanded = expandedDays.includes(day);
      const isExpanding = !isCurrentlyExpanded;

      if (!animationValues[day]) {
        animationValues[day] = new Animated.Value(isCurrentlyExpanded ? 1 : 0);
      }

      setExpandedDays((prev) =>
        isExpanding ? [...prev, day] : prev.filter((d) => d !== day)
      );

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
    [expandedDays, animationValues]
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
            label: "Breakfast",
            name: dayData.breakfast,
            description: dayData.breakfastDescription,
            image: dayData.breakfastImage,
            nutrition: dayData.breakfastNutrition,
          },
          lunch: {
            label: "Lunch",
            name: dayData.lunch,
            description: dayData.lunchDescription,
            image: dayData.lunchImage,
            nutrition: dayData.lunchNutrition,
          },
          dinner: {
            label: "Dinner",
            name: dayData.dinner,
            description: dayData.dinnerDescription,
            image: dayData.dinnerImage,
            nutrition: dayData.dinnerNutrition,
          },
          snack: {
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

      // Debug logging
      console.log(
        "🍽️ Meals for",
        dayData.day,
        ":",
        meals.map((m) => ({
          label: m.label,
          name: m.name,
          hasImage: !!m.image,
          image: m.image,
        }))
      );

      return (
        <View
          key={dayData.day}
          style={[
            styles(colors).dayCard,
            expandedDays.includes(dayData.day) &&
              styles(colors).dayCardExpanded,
          ]}
        >
          <TouchableOpacity
            style={styles(colors).dayHeader}
            onPress={() => toggleDayExpansion(dayData.day)}
            activeOpacity={0.9}
            accessibilityLabel={`${dayData.day} meals`}
            accessibilityHint={`Tap to ${
              expandedDays.includes(dayData.day) ? "collapse" : "expand"
            } meal details for ${dayData.day}`}
            accessibilityRole="button"
            accessible={true}
          >
            <Text style={styles(colors).dayName}>{dayData.day}</Text>
            {!expandedDays.includes(dayData.day) && (
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
                <CustomIcon
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </Animated.View>
            )}
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
            pointerEvents={expandedDays.includes(dayData.day) ? "auto" : "none"}
          >
            {expandedDays.includes(dayData.day) && (
              <View style={styles(colors).dayContent}>
                {/* Horizontal Meal Slider */}
                <View style={styles(colors).mealSliderWrapper}>
                  {(() => {
                    // Initialize scroll animation value for this day
                    if (!mealScrollValues[dayData.day]) {
                      mealScrollValues[dayData.day] = new Animated.Value(0);
                    }
                    const scrollX = mealScrollValues[dayData.day];
                    const CARD_WIDTH = 200;
                    const CARD_SPACING = 15;

                    return (
                      <Animated.FlatList
                        horizontal={meals.length > 1}
                        data={meals}
                        keyExtractor={(item) => item.label}
                        renderItem={({ item, index }) => {
                          // Calculate animation for this card
                          const inputRange = [
                            (index - 1) * (CARD_WIDTH + CARD_SPACING),
                            index * (CARD_WIDTH + CARD_SPACING),
                            (index + 1) * (CARD_WIDTH + CARD_SPACING),
                          ];

                          const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.9, 1, 0.9],
                            extrapolate: "clamp",
                          });

                          const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.9, 1, 0.9],
                            extrapolate: "clamp",
                          });

                          return (
                            <Animated.View
                              style={[
                                styles(colors).mealCardWrapper,
                                meals.length === 1 &&
                                  styles(colors).mealCardWrapperSingle,
                                {
                                  transform: [{ scale }],
                                  opacity,
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={[
                                  styles(colors).mealSliderCard,
                                  meals.length === 1 &&
                                    styles(colors).mealSliderCardSingle,
                                ]}
                                onPress={() => openMealModal(meals, index)}
                                activeOpacity={1}
                                accessibilityLabel={`${item.label}: ${item.name}`}
                                accessibilityHint={`Tap to view details about ${item.label}`}
                                accessibilityRole="button"
                                accessible={true}
                              >
                                <View
                                  style={
                                    styles(colors).mealSliderImageContainer
                                  }
                                >
                                  <Image
                                    source={
                                      item.image
                                        ? { uri: item.image }
                                        : require("../../assets/images/meal-plans/fitfuel.jpg")
                                    }
                                    style={styles(colors).mealSliderImage}
                                    defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                                    onError={(error) => {
                                      console.log(
                                        "Image load error:",
                                        error.nativeEvent.error
                                      );
                                      console.log("Image URI:", item.image);
                                    }}
                                    onLoad={() => {
                                      console.log(
                                        "Image loaded successfully:",
                                        item.label
                                      );
                                    }}
                                  />
                                  {/* Meal Type Badge - Top Left */}
                                  <View style={styles(colors).mealTypeBadge}>
                                    <Text
                                      style={styles(colors).mealTypeBadgeText}
                                    >
                                      {item.label}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles(colors).mealSliderInfo}>
                                  <Text style={styles(colors).mealSliderLabel}>
                                    {item.name || item.description}
                                  </Text>
                                  <Text
                                    style={styles(colors).mealSliderDescription}
                                    numberOfLines={2}
                                  >
                                    {item.description}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        }}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={
                          styles(colors).mealSliderContainer
                        }
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        bounces={true}
                        snapToInterval={CARD_WIDTH + CARD_SPACING}
                        snapToAlignment="start"
                        pagingEnabled={false}
                        removeClippedSubviews={true}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={10}
                        getItemLayout={(data, index) => ({
                          length: CARD_WIDTH + CARD_SPACING,
                          offset: (CARD_WIDTH + CARD_SPACING) * index,
                          index,
                        })}
                        nestedScrollEnabled={true}
                        onScroll={Animated.event(
                          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                          { useNativeDriver: true }
                        )}
                      />
                    );
                  })()}
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
          {!expandedDays.includes(dayData.day) && (
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
                  <Text style={styles(colors).mealIcon}>{meal.label}</Text>
                  <Text
                    style={[
                      styles(colors).mealPreviewText,
                      meals.length === 1 &&
                        styles(colors).mealPreviewTextSingle,
                    ]}
                    numberOfLines={1}
                  >
                    {meal.name || meal.description}
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
      expandedDays,
      toggleDayExpansion,
      openMealModal,
      colors,
      discountInfo,
    ]
  );

  const renderWeekTabs = useCallback(() => {
    // Show all weeks based on durationWeeks, not just weeks with meals assigned
    const totalWeeks = mealPlanDetails?.durationWeeks || 4;
    const availableWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    if (availableWeeks.length === 0) {
      return null; // Don't render tabs if no weeks
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
              setExpandedDays([]);
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
  }, [mealPlanDetails?.durationWeeks, selectedWeek, setSelectedWeek, setExpandedDays, colors]);

  const renderFeature = useCallback(
    (feature) => (
      <View key={feature.title} style={styles(colors).featureItem}>
        <View style={styles(colors).featureIcon}>
          <CustomIcon name="list" size={24} color={colors.primary} />
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

  const weeklyMealPlan = useMemo(() => getWeeklyMealPlan(), [mealPlanDetails]);

  // Calculate total days based on 5-day or full week plan
  const totalPlanDays = useMemo(() => {
    if (!mealPlanDetails?.durationWeeks) return 28; // Default 4 weeks
    return mealPlanDetails.isFiveWorkingDays
      ? mealPlanDetails.durationWeeks * 5
      : mealPlanDetails.durationWeeks * 7;
  }, [mealPlanDetails?.durationWeeks, mealPlanDetails?.isFiveWorkingDays]);

  useEffect(() => {
    if (weeklyMealPlan && weeklyMealPlan[selectedWeek]) {
      const allDaysInWeek = weeklyMealPlan[selectedWeek]
        .filter(
          (dayData) =>
            dayData.breakfast !== "Breakfast not specified" ||
            dayData.lunch !== "Lunch not specified" ||
            dayData.dinner !== "Dinner not specified"
        )
        .map((dayData) => dayData.day);

      setExpandedDays(allDaysInWeek);

      allDaysInWeek.forEach((day) => {
        if (!animationValues[day]) {
          animationValues[day] = new Animated.Value(1);
        } else {
          animationValues[day].setValue(1);
        }
      });
    }
  }, [weeklyMealPlan, selectedWeek, animationValues]);

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
          <CustomIcon
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
                  const result = await apiService.getMealPlanDetails(
                    mealPlanId
                  );
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
            <CustomIcon name="refresh" size={20} color={colors.white} />
            <Text style={styles(colors).retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Animated Sticky Header */}
      <Animated.View
        style={[styles(colors).animatedHeader, { opacity: headerOpacity }]}
      >
        <View style={styles(colors).animatedHeaderContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <CustomIcon name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles(colors).animatedHeaderTitle} numberOfLines={1}>
            {mealPlanDetails?.planName || bundle?.planName || "Details"}
          </Text>
          <View style={{ width: 20 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section (TagScreen-style) */}
        <View style={styles(colors).heroWrapper}>
          <LinearGradient
            colors={["#004432", "#7A2E18"]}
            style={styles(colors).heroBackground}
          >
            {/* Loading overlay for hero image */}
            {imageLoadingStates["hero"] === "loading" && (
              <View style={styles(colors).imageLoadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {/* Background hero image */}
            <Image
              source={
                mealPlanDetails?.planImageUrl
                  ? { uri: mealPlanDetails.planImageUrl }
                  : require("../../assets/images/meal-plans/fitfuel.jpg")
              }
              style={styles(colors).heroBackgroundImage}
              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
              resizeMode="cover"
              onLoadStart={() => handleImageLoadStart("hero")}
              onLoad={() => handleImageLoad("hero")}
              onError={() => handleImageError("hero")}
            />

            {/* Blend transition at bottom */}
            <View style={styles(colors).blendTransition}>
              <BlendSvg
                width="100%"
                height={60}
                fill={colors.background}
                preserveAspectRatio="none"
                style={styles(colors).blendSvg}
              />
            </View>
          </LinearGradient>

          {/* Quantity Controls */}
          {/* <View style={styles(colors).quantityControls}>
            <TouchableOpacity
              style={styles(colors).quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              accessibilityLabel="Decrease quantity"
              accessibilityHint="Tap to reduce the number of meal plans"
              accessibilityRole="button"
              disabled={quantity <= 1}
              accessible={true}
            >
              <CustomIcon name="remove" size={20} color={"#F8FFFC"} />
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
              <CustomIcon name="add" size={20} color={"#F8FFFC"} />
            </TouchableOpacity>
          </View> */}

          {/* Bookmark/Favorite */}
          {/* <TouchableOpacity
            style={styles(colors).bookmarkButton}
            accessibilityLabel="Add to favorites"
            accessibilityHint="Tap to save this meal plan to your favorites"
            accessibilityRole="button"
            accessible={true}
          >
            <CustomIcon name="heart" size={24} color={colors.primary} />
          </TouchableOpacity> */}
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
              <CustomIcon name="star-filled" size={14} color={colors.rating} />
              <Text style={styles(colors).metaText2}>
                {mealPlanDetails?.avgRating || bundle?.rating || 4.5}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <CustomIcon name="time" size={16} color={colors.text} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.durationWeeks
                  ? mealPlanDetails.isFiveWorkingDays
                    ? `${mealPlanDetails.durationWeeks * 5} Days Plan`
                    : `~${mealPlanDetails.durationWeeks} week${
                        mealPlanDetails.durationWeeks !== 1 ? "s" : ""
                      }`
                  : mealPlanDetails?.planDuration ||
                    bundle?.duration ||
                    "4 weeks"}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <CustomIcon name="food" size={16} color={colors.text} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.mealTypes
                  ? mealPlanDetails.isFiveWorkingDays
                    ? `${mealPlanDetails.mealTypes.length * 5} meals/week`
                    : `${mealPlanDetails.mealTypes.length * 7} meals/week`
                  : mealPlanDetails?.mealsPerWeek ||
                    bundle?.mealsPerWeek ||
                    21}{" "}
              </Text>
            </View>

            {/* Display admin-configured meal types */}
            {mealPlanDetails?.mealTypes &&
              mealPlanDetails.mealTypes.length > 0 && (
                <View style={styles(colors).metaItem}>
                  <CustomIcon name="list" size={16} color={colors.text} />
                  <Text style={styles(colors).metaText}>
                    {mealPlanDetails.mealTypes
                      .sort((a, b) => {
                        // Define the correct order
                        const order = ["breakfast", "lunch", "dinner", "snack"];
                        return (
                          order.indexOf(a.toLowerCase()) -
                          order.indexOf(b.toLowerCase())
                        );
                      })
                      .map(
                        (type) => type.charAt(0).toUpperCase() + type.slice(1)
                      )
                      .join(", ")}
                  </Text>
                </View>
              )}

            {/* Display delivery schedule */}
            {mealPlanDetails?.isFiveWorkingDays && (
              <View style={styles(colors).metaItem}>
                <CustomIcon name="calendar" size={16} color={colors.text} />
                <Text style={styles(colors).metaText}>
                  Mon-Fri delivery only
                </Text>
              </View>
            )}
          </View>

          <View style={styles(colors).priceContainer}>
            {discountLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : discountInfo && discountInfo.discountPercent > 0 ? (
              <>
                {/* Struck-through price */}
                <Text style={styles(colors).originalPrice}>
                  ₦
                  {discountInfo.discountType === "ad"
                    ? discountInfo.counterValue?.toLocaleString()
                    : discountInfo.originalPrice?.toLocaleString()}
                </Text>

                {/* Current price with discount badge */}
                <View style={styles(colors).priceRow}>
                  <Text style={styles(colors).currentPrice}>
                    ₦
                    {discountInfo.discountType === "ad"
                      ? discountInfo.originalPrice?.toLocaleString()
                      : discountInfo.discountedPrice?.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={styles(colors).discountPill}
                    onPress={() => setDiscountModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <CustomIcon name="gift" size={14} color={colors.primary} />
                    <Text style={styles(colors).discountPillText}>
                      {discountInfo.discountPercent}% Off
                    </Text>
                  </TouchableOpacity>
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
          <View style={styles(colors).mealPlanHeader}>
            <Text style={styles(colors).sectionTitle}>Weekly Meal Plan</Text>
          </View>
          <View style={styles(colors).weekTabsWrapper}>{renderWeekTabs()}</View>

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
                  {formatApproximateCalories(
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
                  {formatApproximateCalories(
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
                      ? formatApproximateNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalProtein /
                              totalPlanDays
                          ),
                          "g"
                        )
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
                      ? formatApproximateNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalCarbs /
                              totalPlanDays
                          ),
                          "g"
                        )
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
                      ? formatApproximateNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalFat /
                              totalPlanDays
                          ),
                          "g"
                        )
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
                      ? formatApproximateNutritionValue(
                          Math.round(
                            mealPlanDetails.nutritionInfo.totalFiber /
                              (mealPlanDetails.durationWeeks * 7)
                          ),
                          "g"
                        )
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
                    {formatApproximateNutritionValue(
                      mealPlanDetails.nutritionInfo.totalProtein,
                      "g"
                    ) || "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>
                    Protein
                  </Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatApproximateNutritionValue(
                      mealPlanDetails.nutritionInfo.totalCarbs,
                      "g"
                    ) || "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>
                    Carbs
                  </Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatApproximateNutritionValue(
                      mealPlanDetails.nutritionInfo.totalFat,
                      "g"
                    ) || "N/A"}
                  </Text>
                  <Text style={styles(colors).nutritionSummaryLabel}>Fat</Text>
                </View>
                <View style={styles(colors).nutritionSummaryItem}>
                  <Text style={styles(colors).nutritionSummaryValue}>
                    {formatApproximateNutritionValue(
                      mealPlanDetails.nutritionInfo.totalFiber,
                      "g"
                    ) || "N/A"}
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
              <CustomIcon
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

        {/* Ratings Section */}
        <View style={styles(colors).ratingsSection}>
          <View style={styles(colors).ratingsSectionHeader}>
            <Text style={styles(colors).sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity
              style={styles(colors).rateButton}
              onPress={() => setRatingModalVisible(true)}
              accessibilityLabel={
                userRating ? "Update your rating" : "Rate this meal plan"
              }
              accessibilityHint="Tap to rate this meal plan"
              accessibilityRole="button"
            >
              <CustomIcon name="star" size={16} color={colors.background} />
              <Text style={styles(colors).rateButtonText}>
                {userRating ? "Update Rating" : "Rate Plan"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rating Statistics */}
          {(() => {
            const hasRatingStats = !!ratingStats;
            const totalRatings =
              ratingStats?.data?.overallStats?.totalRatings || 0;
            const averageRating =
              ratingStats?.data?.overallStats?.averageRating || 0;
            const shouldShowRatings = hasRatingStats && totalRatings > 0;

            // Commented out to prevent excessive logging on every render
            // console.log("🎯 Rating display condition check:");
            // console.log("   hasRatingStats:", hasRatingStats);
            // console.log("   totalRatings:", totalRatings);
            // console.log("   shouldShowRatings:", shouldShowRatings);
            // console.log("   existingRatings.length:", existingRatings.length);

            // Show ratings if we have rating stats OR if we have existing ratings
            const finalShouldShow =
              shouldShowRatings || existingRatings.length > 0;
            // console.log("   finalShouldShow:", finalShouldShow);

            return finalShouldShow;
          })() ? (
            <View style={styles(colors).ratingStatsContainer}>
              <View style={styles(colors).ratingOverview}>
                <View style={styles(colors).averageRatingContainer}>
                  <Text style={styles(colors).averageRatingNumber}>
                    {ratingStats?.data?.overallStats?.averageRating
                      ? ratingStats.data.overallStats.averageRating.toFixed(1)
                      : existingRatings.length > 0
                      ? (
                          existingRatings.reduce(
                            (sum, r) => sum + r.overallRating,
                            0
                          ) / existingRatings.length
                        ).toFixed(1)
                      : "0.0"}
                  </Text>
                  <View style={styles(colors).starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <CustomIcon
                        key={star}
                        name={
                          star <=
                          Math.round(
                            ratingStats?.data?.overallStats?.averageRating ||
                              (existingRatings.length > 0
                                ? existingRatings.reduce(
                                    (sum, r) => sum + r.overallRating,
                                    0
                                  ) / existingRatings.length
                                : 0)
                          )
                            ? "star-filled"
                            : "star"
                        }
                        size={14}
                        color={
                          star <=
                          Math.round(
                            ratingStats?.data?.overallStats?.averageRating ||
                              (existingRatings.length > 0
                                ? existingRatings.reduce(
                                    (sum, r) => sum + r.overallRating,
                                    0
                                  ) / existingRatings.length
                                : 0)
                          )
                            ? colors.rating
                            : colors.textMuted
                        }
                      />
                    ))}
                  </View>
                  <Text style={styles(colors).totalRatingsText}>
                    {formatApproximateNumber(
                      ratingStats?.data?.overallStats?.totalRatings ||
                        existingRatings.length ||
                        0
                    )}{" "}
                    rating
                    {(ratingStats?.data?.overallStats?.totalRatings ||
                      existingRatings.length ||
                      0) !== 1
                      ? "s"
                      : ""}
                  </Text>
                </View>

                {/* Rating Distribution */}
                <View style={styles(colors).ratingDistribution}>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count =
                      ratingStats?.data?.overallStats?.ratingCounts?.[
                        rating.toString()
                      ] || 0;
                    const percentage =
                      (ratingStats?.data?.overallStats?.totalRatings || 0) > 0
                        ? (count /
                            (ratingStats?.data?.overallStats?.totalRatings ||
                              1)) *
                          100
                        : 0;

                    return (
                      <View
                        key={rating}
                        style={styles(colors).ratingDistributionRow}
                      >
                        <Text style={styles(colors).ratingDistributionStar}>
                          {rating}
                        </Text>
                        <CustomIcon
                          name="star-filled"
                          size={10}
                          color={colors.rating}
                        />
                        <View style={styles(colors).ratingDistributionBar}>
                          <View
                            style={[
                              styles(colors).ratingDistributionFill,
                              { width: `${percentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles(colors).ratingDistributionCount}>
                          {formatApproximateNumber(count)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles(colors).noRatingsContainer}>
              <CustomIcon name="star" size={32} color={colors.textMuted} />
              <Text style={styles(colors).noRatingsText}>No ratings yet</Text>
              <Text style={styles(colors).noRatingsSubtext}>
                Be the first to rate this meal plan!
              </Text>
            </View>
          )}

          {/* Recent Reviews */}
          {existingRatings.length > 0 && (
            <View style={styles(colors).recentReviewsContainer}>
              <Text style={styles(colors).recentReviewsTitle}>
                Recent Reviews
              </Text>
              {existingRatings.slice(0, 3).map((rating) => {
                console.log("🔍 Rendering RatingDisplay for rating:", {
                  id: rating._id,
                  overallRating: rating.overallRating,
                  hasComment: !!rating.comment,
                  comment: rating.comment,
                  commentPreview:
                    rating.comment?.substring(0, 50) +
                    (rating.comment?.length > 50 ? "..." : ""),
                });

                return (
                  <RatingDisplay
                    key={rating._id}
                    ratings={[rating]}
                    showSummary={false}
                    showAspects={false}
                    style={styles(colors).reviewItem}
                  />
                );
              })}
              {existingRatings.length > 3 && (
                <TouchableOpacity style={styles(colors).viewAllReviewsButton}>
                  <Text style={styles(colors).viewAllReviewsText}>
                    View all{" "}
                    {ratingStats?.data?.overallStats?.totalRatings ||
                      existingRatings.length}{" "}
                    reviews
                  </Text>
                  <CustomIcon
                    name="chevron-right"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles(colors).bottomPadding} />
      </Animated.ScrollView>

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
          <CustomIcon name="filter" size={20} color={colors.border2} />
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
          accessibilityLabel={`Add ${quantity} meal plan${
            quantity > 1 ? "s" : ""
          } to subscription`}
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

      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleRatingSubmit}
        ratingType="meal_plan"
        entityType="meal_plan"
        entityId={
          mealPlanDetails?._id ||
          mealPlanDetails?.planId ||
          bundle?._id ||
          bundle?.planId
        }
        entityName={mealPlanDetails?.planName || bundle?.name || "Meal Plan"}
        existingRating={userRating}
        contextData={{
          mealPlanId:
            mealPlanDetails?._id ||
            mealPlanDetails?.planId ||
            bundle?._id ||
            bundle?.planId,
          platform: "mobile",
        }}
        title="Rate this Meal Plan"
        description="Share your experience with this meal plan to help others make better choices"
      />

      {/* Discount Info Modal */}
      {discountInfo && discountInfo.discountPercent > 0 && (
        <Modal
          visible={discountModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDiscountModalVisible(false)}
        >
          <TouchableOpacity
            style={styles(colors).discountModalOverlay}
            activeOpacity={1}
            onPress={() => setDiscountModalVisible(false)}
          >
            <View style={styles(colors).discountModalContent}>
              <View style={styles(colors).discountModalHeader}>
                <CustomIcon name="gift" size={28} color={colors.primary} />
                <Text style={styles(colors).discountModalTitle}>
                  Discount Details
                </Text>
              </View>
              <View style={styles(colors).discountModalBody}>
                <Text style={styles(colors).discountModalName}>
                  {discountInfo.reason || "Special Offer"}
                </Text>
                {discountInfo.eligibilityReason && (
                  <Text style={styles(colors).discountModalDescription}>
                    {discountInfo.eligibilityReason}
                  </Text>
                )}
                <View style={styles(colors).discountModalBadge}>
                  <Text style={styles(colors).discountModalBadgeText}>
                    {discountInfo.discountPercent}% OFF
                  </Text>
                </View>
                {discountInfo.isLimitedTime && discountInfo.validUntil && (
                  <Text style={styles(colors).discountModalLimitedTime}>
                    ⏰ Valid until{" "}
                    {new Date(discountInfo.validUntil).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles(colors).discountModalCloseButton}
                onPress={() => setDiscountModalVisible(false)}
              >
                <Text style={styles(colors).discountModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Animated Sticky Header
    animatedHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    animatedHeaderContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      paddingTop: 55, // Account for status bar
    },
    animatedHeaderTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginHorizontal: 20,
    },
    // TagScreen-like hero styles
    heroWrapper: {
      position: "relative",
      backgroundColor: "#004432",
      height: 350,
      overflow: "hidden",
    },
    heroBackground: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingHorizontal: 0,
      position: "relative",
      height: "100%",
      minHeight: 250,
    },
    heroBackgroundImage: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      minHeight: 250,
    },
    blendTransition: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      width: "100%",
      height: 60,
      zIndex: 2,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    blendSvg: {
      width: "100%",
      height: "100%",
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
      borderWidth: 1,
      borderColor: colors.border2,
      // Remove old hero container styles (replaced by heroWrapper)
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
      bottom: 24,
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
      bottom: 24,
      borderRadius: 20,
      backgroundColor: "#1b1b1b",
      justifyContent: "center",
      alignItems: "center",
    },
    planInfo: {
      paddingHorizontal: 20,
    },
    planTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      // marginBottom: 6,
    },
    planMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      // marginBottom: 16,
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
      color: colors.text,
      marginLeft: 4,
      fontWeight: "500",
      flexShrink: 1,
      minWidth: 0,
    },
    metaText2: {
      fontSize: 14,
      color: colors.rating,
      marginLeft: 4,
      fontWeight: "bold",
      flexShrink: 1,
      minWidth: 0,
    },
    planDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: 4,
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
      flexDirection: "column",
      alignItems: "flex-start",
      marginTop: 5,
      marginBottom: 20,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    currentPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.rating,
      marginRight: 0,
    },
    originalPrice: {
      fontSize: 13,
      color: colors.textMuted,
      textDecorationLine: "line-through",
      marginRight: 12,
    },
    // Discount Pill Design
    discountPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary2,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 25, // Fully rounded pill shape
      alignSelf: "flex-start",
      marginTop: 0,
      borderWidth: 1,
      borderColor: colors.border2,
    },
    discountPillText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.text2,
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
      // padding: 20,
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
      // Remove padding to allow carousel to extend full width
    },
    mealPlanHeader: {
      paddingHorizontal: 20,
    },
    weekTabsWrapper: {
      paddingHorizontal: 20,
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
      color: "colors.textSecondary",
    },
    weekTabTextActive: {
      fontWeight: "bold",
      color: "#004432",
    },
    weekContent: {
      // gap: 12,
    },
    dayCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      marginBottom: 12,
    },
    dayCardExpanded: {
      // No special styling for expanded state
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // marginBottom: 8,
      paddingHorizontal: 20,
      paddingTop: 12,
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
      // marginLeft: 8,
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
      paddingHorizontal: 20,
      borderRadius: 6,
    },
    mealPreview: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    mealPreviewSingle: {
      width: "100%",
      // paddingTop: 8,
      // paddingHorizontal: 12,
    },
    mealIcon: {
      fontSize: 12,
      marginRight: 8,
      color: colors.textMuted,
    },
    mealPreviewText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "bold",
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
      width: 60, // Increased from 40 to 60 for better visibility
      height: 45, // Increased from 30 to 45 to maintain aspect ratio
      borderRadius: 6,
    },
    nutritionSection: {
      padding: 20,
      backgroundColor: colors.cardBackground,
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    aboutText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    // Rating section styles
    ratingsSection: {
      // margin: 15,
      backgroundColor: colors.cardBackground,
      overflow: "hidden",
      borderRadius: 20,
    },
    ratingsSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
    },
    rateButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary2,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: THEME.borderRadius.xxl,
      gap: 6,
    },
    rateButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.background,
    },
    ratingStatsContainer: {
      padding: 20,
    },
    ratingOverview: {
      flexDirection: "row",
      gap: 20,
    },
    averageRatingContainer: {
      alignItems: "center",
      flex: 1,
    },
    averageRatingNumber: {
      fontSize: 36,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 5,
    },
    starsContainer: {
      flexDirection: "row",
      gap: 2,
      marginBottom: 5,
    },
    totalRatingsText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    ratingDistribution: {
      flex: 2,
      gap: 8,
    },
    ratingDistributionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    ratingDistributionStar: {
      fontSize: 12,
      color: colors.text,
      width: 12,
    },
    ratingDistributionBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
    },
    ratingDistributionFill: {
      height: "100%",
      backgroundColor: colors.rating,
      borderRadius: 4,
    },
    ratingDistributionCount: {
      fontSize: 12,
      color: colors.textMuted,
      width: 20,
      textAlign: "right",
    },
    noRatingsContainer: {
      alignItems: "center",
      padding: 40,
    },
    noRatingsText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 10,
      marginBottom: 5,
    },
    noRatingsSubtext: {
      fontSize: 14,
      color: colors.textMuted,
    },
    recentReviewsContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    recentReviewsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    reviewItem: {
      marginBottom: 15,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "30",
    },
    viewAllReviewsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 15,
      gap: 8,
    },
    viewAllReviewsText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.primary,
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
      color: "#004432",
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
      height: 240, // Fixed height to ensure proper scrolling
      marginVertical: 10,
      width: "100%",
      backgroundColor: "transparent",
    },
    mealSliderList: {
      flexGrow: 0,
      height: "100%",
      width: "100%",
    },
    mealSliderContainer: {
      paddingHorizontal: 15,
      // paddingVertical: 15,
      alignItems: "center",
    },
    mealCardWrapper: {
      // marginRight: 15,
    },
    mealCardWrapperSingle: {
      width: "100%",
      // marginHorizontal: 22,
    },
    mealSliderCard: {
      width: 270,
      height: 220,
      borderRadius: 17,
      overflow: "hidden",
      backgroundColor: colors.cardBackground,
      padding: 5,
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    mealSliderCardSingle: {
      width: 320,
      height: 220,
    },
    mealSliderImageContainer: {
      width: "100%",
      height: 140,
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 4,
    },
    mealSliderImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    mealTypeBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      backgroundColor: "#004432",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    mealTypeBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.white,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    mealDiscountPill: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFD700",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    mealDiscountPillText: {
      fontSize: 10,
      fontWeight: "600",
      color: "#333",
      marginLeft: 4,
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
      paddingHorizontal: 10,
      paddingTop: 5,
      paddingBottom: 8,
    },
    mealSliderIcon: {
      fontSize: 16,
      marginBottom: 2,
    },
    mealSliderLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    mealSliderDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    priceRowWithInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginRight: 12,
    },
    // Discount Modal Styles
    discountModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    discountModalContent: {
      backgroundColor: colors.background,
      borderRadius: 24,
      padding: 28,
      width: "100%",
      maxWidth: 420,
      borderWidth: 1,
      borderColor: colors.border,
    },
    discountModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    discountModalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
    },
    discountModalBody: {
      gap: 14,
    },
    discountModalName: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
    },
    discountModalDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    discountModalBadge: {
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
      alignSelf: "flex-start",
    },
    discountModalBadgeText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },
    discountModalLimitedTime: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: "italic",
    },
    discountModalCloseButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 24,
      alignItems: "center",
    },
    discountModalCloseText: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.white,
    },
  });

export default MealPlanDetailScreen;
