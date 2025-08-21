import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNotification } from "../../context/NotificationContext";
import { useBookmarks } from "../../context/BookmarkContext";
import NotificationIcon from "../../components/ui/NotificationIcon";
import { useMealPlans } from "../../hooks/useMealPlans";
import { useTheme } from "../../styles/theme";
import { COLORS, THEME } from "../../utils/colors";
import apiService from "../../services/api";
import MealCardSkeleton from "../../components/meal-plans/MealCardSkeleton";
import Tutorial from "../../components/tutorial/Tutorial";
import { homeScreenTutorialSteps } from "../../utils/tutorialSteps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationService from "../../services/notificationService";

const { width } = Dimensions.get("window");

const HomeScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("All Plans");
  const [currentPopularIndex, setCurrentPopularIndex] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const popularScrollRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const { mealPlans, loading, error, refreshing, refreshMealPlans } =
    useMealPlans();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState("1_week");
  const [showBrowseMode, setShowBrowseMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        setShowTutorial(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      }
    };
    checkFirstLaunch();
  }, []);

  // ... (rest of the component logic remains the same)

  // Handle promo banner button press
  const handlePromoBannerPress = async (banner) => {
    try {
      // Track banner click
      if (banner._id) {
        await apiService.trackBannerClick(banner._id);
      }

      // Navigate based on CTA destination
      switch (banner.ctaDestination) {
        case "Search":
          navigation.navigate("Search");
          break;
        case "MealPlans":
          navigation.navigate("Search");
          break;
        case "MealPlanDetail":
          if (banner.ctaParams?.planId) {
            // Find the meal plan by planId
            const plan = mealPlans.find(
              (p) => p.planId === banner.ctaParams.planId
            );
            if (plan) {
              navigation.navigate("MealPlanDetail", { bundle: plan });
            } else {
              navigation.navigate("Search");
            }
          } else {
            navigation.navigate("Search");
          }
          break;
        case "Profile":
          navigation.navigate("Profile");
          break;
        case "Orders":
          navigation.navigate("OrderTracking");
          break;
        case "Support":
          navigation.navigate("Support");
          break;
        case "External":
          if (banner.externalUrl) {
            await Linking.openURL(banner.externalUrl);
          }
          break;
        default:
          navigation.navigate("Search");
      }
    } catch (error) {
      console.error("Error handling banner press:", error);
      // Still navigate even if tracking fails
      navigation.navigate("Search");
    }
  };

  const categories = [
    { id: "All Plans", label: "All Plans" },
    { id: "Fitness", label: "Fitness" },
    { id: "Professional", label: "Professional" },
    { id: "Family", label: "Family" },
    { id: "Wellness", label: "Wellness" },
  ];

  // Sort mealPlans so that newest appear first and determine which are "new"
  const displayPlans = React.useMemo(() => {
    const sortedPlans = [...mealPlans].sort((a, b) => {
      const dateA = new Date(a.createdAt || "2024-01-01");
      const dateB = new Date(b.createdAt || "2024-01-01");
      return dateB - dateA; // Newest first
    });

    // Mark plans as "new" if created within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return sortedPlans.map((plan) => ({
      ...plan,
      isNew: new Date(plan.createdAt || "2024-01-01") > sevenDaysAgo,
    }));
  }, [mealPlans]);

  // Load banners and subscription from backend
  useEffect(() => {
    loadBanners();
    loadActiveSubscription();
  }, []);

  const loadBanners = async () => {
    try {
      setBannersLoading(true);
      const result = await apiService.getActiveBanners();

      console.log("🔍 Banner API result:", JSON.stringify(result, null, 2));

      if (result.success) {
        // Handle nested response structure: result.data.data contains the actual banners array
        const bannersData = Array.isArray(result.data?.data)
          ? result.data.data
          : Array.isArray(result.data)
          ? result.data
          : [];
        setBanners(bannersData);
        console.log(`✅ Loaded ${bannersData.length} banners`);
      } else {
        console.error("❌ Failed to load banners:", result.error);
        setBanners([]);
      }
    } catch (error) {
      console.error("❌ Banners loading error:", error);
      setBanners([]);
    } finally {
      setBannersLoading(false);
    }
  };

  // Subscription action handlers
  const handlePauseSubscription = () => {
    setShowPauseModal(true);
  };

  const confirmPauseSubscription = async () => {
    if (!activeSubscription || !pauseReason) return;

    try {
      // Update subscription status
      const result = await apiService.updateSubscription(
        activeSubscription._id,
        {
          status: "paused",
          pauseReason,
          pauseDuration,
          pausedAt: new Date().toISOString(),
        }
      );

      if (result.success) {
        setActiveSubscription({ ...activeSubscription, status: "paused" });

        // Send notifications to all stakeholders
        await NotificationService.notifySubscriptionPause(
          activeSubscription._id,
          pauseReason,
          pauseDuration,
          {
            id: activeSubscription.userId,
            name: "User", // You might want to get actual user name
          }
        );

        setShowPauseModal(false);
        setPauseReason("");
        console.log("✅ Subscription paused and notifications sent");
      }
    } catch (error) {
      console.error("❌ Error pausing subscription:", error);
    }
  };

  const handleModifySubscription = async () => {
    if (!activeSubscription) return;

    // Navigate to subscription modification screen
    navigation.navigate("MealPlanDetail", {
      bundle: activeSubscription.mealPlanId,
      subscriptionId: activeSubscription._id,
      isModification: true,
    });

    // Send notification about modification attempt
    await NotificationService.notifySubscriptionModification(
      activeSubscription._id,
      { action: "modification_started" },
      {
        id: activeSubscription.userId,
        name: "User",
      }
    );
  };

  const handleScheduleSubscription = async () => {
    if (!activeSubscription) return;

    // Navigate to scheduling screen
    navigation.navigate("Profile", {
      tab: "schedule",
      subscriptionId: activeSubscription._id,
    });

    // Send notification about schedule change attempt
    await NotificationService.notifyScheduleChange(
      activeSubscription._id,
      { action: "schedule_modification_started" },
      {
        id: activeSubscription.userId,
        name: "User",
      }
    );
  };

  // Meatball menu options
  const menuOptions = [
    {
      icon: "information-circle",
      title: "View Details",
      subtitle: "See subscription details",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "subscriptions" });
      },
    },
    {
      icon: "location",
      title: "Change Address",
      subtitle: "Update delivery address",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "address" });
      },
    },
    {
      icon: "nutrition",
      title: "Dietary Preferences",
      subtitle: "Update food preferences",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "preferences" });
      },
    },
    {
      icon: "close-circle",
      title: "Cancel Subscription",
      subtitle: "End your subscription",
      onPress: () => {
        setShowSubscriptionMenu(false);
        // Handle cancellation
        handleCancelSubscription();
      },
      danger: true,
    },
    {
      icon: "help-circle",
      title: "Contact Support",
      subtitle: "Get help with your subscription",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Support");
      },
    },
  ];

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;

    // Show confirmation dialog first
    // For now, just log
    console.log("Cancel subscription requested");
  };

  const loadActiveSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const result = await apiService.getUserSubscriptions();

      if (result.success) {
        // Handle different response structures - API returns nested data
        const subscriptions =
          result.data?.data || result.data || result.subscriptions || [];

        // Ensure subscriptions is an array
        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
          // Find the first active subscription (check for multiple status variations)
          const activeSubscriptions = subscriptions.filter((sub) => {
            const status = sub.status?.toLowerCase();
            return (
              status === "active" ||
              status === "paid" ||
              sub.paymentStatus === "Paid"
            );
          });

          if (activeSubscriptions.length > 0) {
            const subscription = activeSubscriptions[0];
            setActiveSubscription(subscription);
          } else {
            setActiveSubscription(null);
          }
        } else if (!Array.isArray(subscriptions)) {
          // If it's a single subscription object
          const status = subscriptions?.status?.toLowerCase();
          if (
            subscriptions &&
            (status === "active" ||
              status === "paid" ||
              subscriptions.paymentStatus === "Paid")
          ) {
            setActiveSubscription(subscriptions);
          } else {
            setActiveSubscription(null);
          }
        } else {
          setActiveSubscription(null);
        }
      } else {
        setActiveSubscription(null);
      }
    } catch (error) {
      setActiveSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Auto-slide effect for banner
  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const bannerInterval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        return nextIndex;
      });
    }, 6000);

    return () => clearInterval(bannerInterval);
  }, [banners?.length]);

  // Subscription-focused UI components
  const renderTodaysMeals = () => {
    if (!activeSubscription?.mealPlanId) return null;

    // Calculate subscription day based on start date
    const today = new Date();
    const startDate = new Date(activeSubscription.startDate);

    // Calculate how many days into the subscription we are (starting from day 1)
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const subscriptionDay = daysDiff + 1; // Day 1, 2, 3, etc.

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

    // Get today's meals from the subscription's meal plan
    const weeklyMeals = activeSubscription.mealPlanId.weeklyMeals || {};
    const currentWeek = weeklyMeals[`week${currentWeekNumber}`] || {};
    const todaysMealsData = currentWeek[dayName] || {};

    // Debug today's meals
    console.log("\n=== TODAY'S MEALS DEBUG ===");
    console.log("Subscription start date:", startDate.toDateString());
    console.log("Today's date:", today.toDateString());
    console.log("Days since subscription started:", daysDiff);
    console.log("Current subscription day:", subscriptionDay);
    console.log(
      "Week number:",
      weekNumber,
      "-> Mapped to week:",
      currentWeekNumber
    );
    console.log("Day in week:", dayInWeek);
    console.log(
      "Looking for meals in: week" + currentWeekNumber + "." + dayName
    );
    console.log(
      "Weekly meals structure:",
      JSON.stringify(weeklyMeals, null, 2)
    );
    console.log("Current week data:", JSON.stringify(currentWeek, null, 2));
    console.log(
      "Today's meals data:",
      JSON.stringify(todaysMealsData, null, 2)
    );
    console.log("=== END TODAY'S MEALS DEBUG ===\n");

    // Get meal images from the meal plan
    const mealImages = activeSubscription.mealPlanId.mealImages || {};
    const todayMealImages = mealImages[dayName] || {};

    // Debug meal images structure
    console.log("\n=== MEAL IMAGES DEBUG ===");
    console.log(
      "Full meal images structure:",
      JSON.stringify(mealImages, null, 2)
    );
    console.log(
      "Today meal images for",
      dayName,
      ":",
      JSON.stringify(todayMealImages, null, 2)
    );
    console.log("Plan image URL:", activeSubscription.mealPlanId.planImageUrl);
    console.log("=== END MEAL IMAGES DEBUG ===\n");

    // Helper function to get meal image
    const getMealImage = (mealType) => {
      // Capitalize meal type to match database structure
      const capitalizedMealType =
        mealType.charAt(0).toUpperCase() + mealType.slice(1);

      // Create the full image key: week{N}_{DayName}_{MealType}
      const imageKey = `week${currentWeekNumber}_${dayName}_${capitalizedMealType}`;

      console.log("Looking for image for:", mealType);
      console.log("Image key to look for:", imageKey);

      // Look for the specific meal image using the full key
      if (mealImages[imageKey]) {
        console.log("Found specific meal image:", mealImages[imageKey]);
        return { uri: mealImages[imageKey] };
      }

      // Fallback to plan image if specific meal image not found
      if (activeSubscription.mealPlanId.planImageUrl) {
        console.log(
          "Using plan image URL as fallback:",
          activeSubscription.mealPlanId.planImageUrl
        );
        return { uri: activeSubscription.mealPlanId.planImageUrl };
      }

      console.log("Using default image fallback");
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    };

    // Helper function to get actual meal name (no fallback to template)
    const getMealName = (mealType) => {
      // Database uses capitalized meal types: Breakfast, Lunch, Dinner
      const capitalizedMealType =
        mealType.charAt(0).toUpperCase() + mealType.slice(1);
      const mealData = todaysMealsData[capitalizedMealType];

      if (mealData) {
        // Try different possible field names for meal name
        // Support both string values and object with name property
        if (typeof mealData === "string") {
          return mealData;
        } else if (typeof mealData === "object") {
          return (
            mealData.name ||
            mealData.meal ||
            mealData.title ||
            mealData.description
          );
        }
      }
      return null;
    };

    // Helper function to get actual meal calories
    const getMealCalories = (mealType) => {
      // Database uses capitalized meal types: Breakfast, Lunch, Dinner
      const capitalizedMealType =
        mealType.charAt(0).toUpperCase() + mealType.slice(1);
      const mealData = todaysMealsData[capitalizedMealType];

      if (mealData && typeof mealData === "object" && mealData.calories) {
        return mealData.calories;
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

    // Filter out meals that don't have actual data (no template fallbacks)
    const availableMeals = Object.entries(todaysMeals).filter(
      ([_, meal]) => meal.name
    );

    console.log(
      "Available meals for today:",
      availableMeals.map(([type, meal]) => `${type}: ${meal.name}`)
    );

    // If no meals are available for today, show a message
    if (availableMeals.length === 0) {
      return (
        <View style={styles(colors).todaysMealsSection}>
          <Text style={styles(colors).sectionTitle}>
            Today's Meals - Day {subscriptionDay}
          </Text>
          <View style={styles(colors).noMealsContainer}>
            <Ionicons
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
    const nextDelivery = new Date(activeSubscription.nextDelivery);
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
          Today's Meals - Day {subscriptionDay}
        </Text>
        <Text style={styles(colors).deliveryStatus}>{deliveryStatus}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles(colors).mealsScroll}
        >
          {Object.entries(todaysMeals).map(([mealType, meal]) => (
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
                    {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                  </Text>
                  <Text style={styles(colors).todayMealName} numberOfLines={2}>
                    {meal.name}
                  </Text>
                  <Text style={styles(colors).mealCalories}>
                    {meal.calories} cal
                  </Text>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSubscriptionStatus = () => {
    if (!activeSubscription) return null;

    // Calculate real days remaining and progress
    const startDate = new Date(activeSubscription.startDate);
    const endDate = new Date(activeSubscription.endDate);
    const currentDate = new Date();

    const totalDuration = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
      (currentDate - startDate) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24))
    );

    const progressPercentage =
      totalDuration > 0
        ? Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100))
        : 0;

    return (
      <View style={styles(colors).subscriptionSection}>
        <View style={styles(colors).subscriptionCard}>
          <LinearGradient
            colors={[colors.primary, "#FFB347"]}
            style={styles(colors).subscriptionGradient}
          >
            <View style={styles(colors).subscriptionHeader}>
              <View>
                <Text style={styles(colors).subscriptionPlanName}>
                  {activeSubscription.mealPlanId?.planName || "Your Meal Plan"}
                </Text>
                <Text style={styles(colors).subscriptionDuration}>
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining`
                    : "Plan completed"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles(colors).subscriptionMenuButton}
                onPress={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles(colors).progressContainer}>
              <View style={styles(colors).progressBar}>
                <View
                  style={[
                    styles(colors).progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles(colors).progressText}>
                {Math.round(progressPercentage)}% completed
              </Text>
            </View>

            <View style={styles(colors).subscriptionActions}>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handlePauseSubscription}
                activeOpacity={0.7}
              >
                <Ionicons name="pause" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handleModifySubscription}
                activeOpacity={0.7}
              >
                <Ionicons name="settings" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Modify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handleScheduleSubscription}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Subscription Menu Dropdown */}
        {showSubscriptionMenu && (
          <View style={styles(colors).menuDropdown}>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles(colors).menuOption,
                  option.danger && styles(colors).menuOptionDanger,
                  index === menuOptions.length - 1 &&
                    styles(colors).menuOptionLast,
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.danger ? colors.error : colors.text}
                />
                <View style={styles(colors).menuOptionText}>
                  <Text
                    style={[
                      styles(colors).menuOptionTitle,
                      option.danger && styles(colors).menuOptionTitleDanger,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles(colors).menuOptionSubtitle}>
                    {option.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Pause Modal Component
  const renderPauseModal = () => {
    return (
      <Modal
        visible={showPauseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).pauseModal}>
            <Text style={styles(colors).modalTitle}>Pause Subscription</Text>
            <Text style={styles(colors).modalSubtitle}>
              Tell us why you're pausing and for how long
            </Text>

            {/* Pause Reason */}
            <Text style={styles(colors).inputLabel}>Reason for pausing:</Text>
            <TextInput
              style={styles(colors).textInput}
              placeholder="e.g., Going on vacation, financial reasons..."
              value={pauseReason}
              onChangeText={setPauseReason}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />

            {/* Pause Duration */}
            <Text style={styles(colors).inputLabel}>Pause duration:</Text>
            <View style={styles(colors).durationOptions}>
              {[
                { value: "1_week", label: "1 Week" },
                { value: "2_weeks", label: "2 Weeks" },
                { value: "1_month", label: "1 Month" },
                { value: "2_months", label: "2 Months" },
              ].map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles(colors).durationOption,
                    pauseDuration === duration.value &&
                      styles(colors).durationOptionSelected,
                  ]}
                  onPress={() => setPauseDuration(duration.value)}
                >
                  <Text
                    style={[
                      styles(colors).durationOptionText,
                      pauseDuration === duration.value &&
                        styles(colors).durationOptionTextSelected,
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles(colors).modalActions}>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).modalButtonSecondary,
                ]}
                onPress={() => setShowPauseModal(false)}
              >
                <Text style={styles(colors).modalButtonTextSecondary}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).modalButtonPrimary,
                  !pauseReason && styles(colors).modalButtonDisabled,
                ]}
                onPress={confirmPauseSubscription}
                disabled={!pauseReason}
              >
                <Text style={styles(colors).modalButtonTextPrimary}>
                  Pause Subscription
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCategoryTab = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles(colors).categoryTab,
        selectedCategory === category.id && styles(colors).categoryTabActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles(colors).categoryText,
          selectedCategory === category.id && styles(colors).categoryTextActive,
        ]}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  const renderPopularFoodCard = (plan, index) => {
    const imageSource = plan.image
      ? typeof plan.image === "string"
        ? { uri: plan.image }
        : plan.image
      : require("../../assets/images/meal-plans/fitfuel.jpg");

    return (
      <TouchableOpacity
        key={plan.id || plan._id}
        style={styles(colors).popularPlanCard}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        activeOpacity={0.8}
      >
        <View style={styles(colors).popularCardImageContainer}>
          <Image
            source={imageSource}
            style={styles(colors).popularCardImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />
        </View>

        {/* Content Overlay with Gradient */}
        <LinearGradient
          colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 1)"]}
          locations={[0, 0.6, 1]} // Example: stays fully transparent up to 60% of the gradient's height/width
          style={styles(colors).popularCardContent}
        >
          {/* Heart Button positioned above title */}
          <TouchableOpacity
            style={styles(colors).popularHeartButton}
            onPress={() => toggleBookmark(plan.id || plan._id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                isBookmarked(plan.id || plan._id) ? "heart" : "heart-outline"
              }
              size={20}
              color={
                isBookmarked(plan.id || plan._id) ? colors.error : colors.black
              }
            />
          </TouchableOpacity>

          <Text style={styles(colors).popularCardTitle} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={styles(colors).popularCardDescription} numberOfLines={2}>
            {plan.description ||
              "Delicious and nutritious meal plan crafted for your healthy lifestyle"}
          </Text>
          <Text style={styles(colors).popularCardPrice}>
            ₦{plan.price?.toLocaleString()}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderMealplanCard = (plan, index) => {
    const imageSource = plan.image
      ? typeof plan.image === "string"
        ? { uri: plan.image }
        : plan.image
      : require("../../assets/images/meal-plans/fitfuel.jpg");

    return (
      <TouchableOpacity
        key={plan.id || plan._id}
        style={styles(colors).mealplanCard}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        activeOpacity={0.8}
      >
        {/* Large Image Container */}
        <View style={styles(colors).mealplanImageContainer}>
          <Image
            source={imageSource}
            style={styles(colors).mealplanImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />

          {/* Heart Button positioned on top-right of image */}
          <TouchableOpacity
            style={styles(colors).mealplanHeartButton}
            onPress={() => toggleBookmark(plan.id || plan._id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                isBookmarked(plan.id || plan._id) ? "heart" : "heart-outline"
              }
              size={20}
              color={
                isBookmarked(plan.id || plan._id) ? colors.error : colors.black
              }
            />
          </TouchableOpacity>

          {/* New Badge positioned on top-left of image - only show for new meals */}
          {plan.isNew && (
            <View style={styles(colors).newBadge}>
              <Text style={styles(colors).newBadgeText}>New</Text>
            </View>
          )}

          {/* Content Overlay with Gradient */}
          <LinearGradient
            colors={[
              "rgba(0, 0, 0, 0)",
              "rgba(0, 0, 0, 0)",
              "rgba(0, 0, 0, 0.9)",
            ]}
            locations={[0, 0.4, 1]} // Example: stays fully transparent up to 60% of the gradient's height/width
            style={styles(colors).popularCardContent}
          >
            <Text style={styles(colors).mealplanTitle} numberOfLines={1}>
              {plan.name}
            </Text>
            <Text style={styles(colors).mealplanDescription} numberOfLines={2}>
              {plan.description ||
                "Satisfy your junk food cravings with fast, delicious, and effortless delivery."}
            </Text>
            <Text style={styles(colors).mealplanPrice}>
              ₦{plan.price?.toLocaleString()}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPromoBanners = () => {
    if (bannersLoading) {
      return (
        <View style={styles(colors).heroBannerContainer}>
          <View
            style={[
              styles(colors).heroBanner,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <ActivityIndicator size="large" color={colors.white} />
            <Text
              style={[
                styles(colors).heroSubtitle,
                { marginTop: 10, textAlign: "center" },
              ]}
            >
              Loading promotions...
            </Text>
          </View>
        </View>
      );
    }

    if (!banners || banners.length === 0) {
      // Fallback to default banner when no banners are available
      return (
        <View style={styles(colors).heroBannerContainer}>
          <View style={styles(colors).heroBanner}>
            <View style={styles(colors).heroContent}>
              <View style={styles(colors).heroTextSection}>
                <Text style={styles(colors).heroTitle}>Welcome to Choma</Text>
                <Text style={styles(colors).heroSubtitle}>
                  Discover delicious and healthy meal plans crafted just for
                  you!
                </Text>
                <TouchableOpacity
                  style={styles(colors).heroButton}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("Search")}
                >
                  <Text style={styles(colors).heroButtonText}>
                    Explore Meals
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#000"
                    style={styles(colors).heroButtonIcon}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles(colors).heroImageSection}>
                <Image
                  source={require("../../assets/images/meal-plans/fitfuel.jpg")}
                  style={styles(colors).heroImage}
                />
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Show dynamic banners
    return (
      <View style={styles(colors).heroBannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentBannerIndex(slideIndex);
          }}
        >
          {banners.map((banner, index) => (
            <TouchableOpacity
              key={banner._id || index}
              style={styles(colors).bannerSlide}
              activeOpacity={0.8}
              onPress={() => handlePromoBannerPress(banner)}
            >
              <View style={styles(colors).promoBannerContainer}>
                {/* Full-size banner image */}
                <Image
                  source={{
                    uri: banner.imageUrl,
                    cache: "default",
                  }}
                  style={styles(colors).promoBannerImage}
                  defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                  onError={(error) => {
                    console.log(
                      "🖼️ Banner image error:",
                      error.nativeEvent.error
                    );
                    console.log("🖼️ Image URL:", banner.imageUrl);
                  }}
                  onLoad={() => {
                    console.log("🖼️ Banner image loaded successfully");
                  }}
                  resizeMode="cover"
                />
                
                {/* CTA Button Overlay - Visual only, banner handles the press */}
                <View style={styles(colors).promoBannerCTA}>
                  <Text style={styles(colors).promoBannerCTAText}>
                    {banner.ctaText}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#000"
                    style={styles(colors).promoBannerCTAIcon}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner Indicators */}
        {banners.length > 1 && (
          <View style={styles(colors).bannerIndicators}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles(colors).bannerIndicator,
                  currentBannerIndex === index &&
                    styles(colors).bannerIndicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark === true ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles(colors).header}>
        <Text style={styles(colors).headerTitle}>Choma</Text>

        <View style={styles(colors).notificationContainer}>
          <NotificationIcon navigation={navigation} />
        </View>
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || subscriptionLoading}
            onRefresh={() => {
              refreshMealPlans();
              loadActiveSubscription();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Conditional Content Based on Subscription Status */}
        {(() => {
          // If browse mode is enabled, show regular home screen
          if (showBrowseMode) {
            return (
              <>
                {/* Back to My Plan Button */}
                <View style={styles(colors).backToPlanSection}>
                  <TouchableOpacity
                    style={styles(colors).backToPlanButton}
                    onPress={() => setShowBrowseMode(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).backToPlanText}>
                      Back to My Plan
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Regular browsing UI */}
                {/* Promo Banners */}
                {renderPromoBanners()}

                {/* Popular Food Section */}
                <View style={styles(colors).section}>
                  <View style={styles(colors).sectionHeader}>
                    <Text style={styles(colors).sectionTitle}>
                      Popular plans
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Search")}
                    ></TouchableOpacity>
                  </View>

                  {/* Loading State */}
                  {loading && !refreshing && (
                    <View style={styles(colors).mealplansGrid}>
                      {[...Array(4)].map((_, index) => (
                        <MealCardSkeleton key={index} />
                      ))}
                    </View>
                  )}

                  {/* Error State */}
                  {error && !loading && (
                    <View style={styles(colors).errorContainer}>
                      <Ionicons
                        name="alert-circle"
                        size={48}
                        color={colors.error}
                      />
                      <Text style={styles(colors).errorTitle}>
                        Oops! Something went wrong
                      </Text>
                      <Text style={styles(colors).errorText}>{error}</Text>
                      <TouchableOpacity
                        style={styles(colors).retryButton}
                        onPress={refreshMealPlans}
                      >
                        <Text style={styles(colors).retryButtonText}>
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Popular Food Slider */}
                  {!loading && !error && (
                    <View style={styles(colors).popularFoodContainer}>
                      {displayPlans.length > 0 ? (
                        <ScrollView
                          ref={popularScrollRef}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={
                            styles(colors).popularFoodScrollContent
                          }
                          scrollEventThrottle={16}
                          decelerationRate="fast"
                        >
                          {displayPlans.map((plan, index) =>
                            renderPopularFoodCard(plan, index)
                          )}
                        </ScrollView>
                      ) : (
                        <View style={styles(colors).emptyContainer}>
                          <Ionicons
                            name="restaurant"
                            size={48}
                            color={colors.textMuted}
                          />
                          <Text style={styles(colors).emptyTitle}>
                            No meal plans found
                          </Text>
                          <Text style={styles(colors).emptyText}>
                            Try selecting a different category or refresh to
                            load plans.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Our Mealplans Section */}
                <View style={styles(colors).section}>
                  <Text style={styles(colors).sectionTitle}>Our Mealplans</Text>

                  {!loading && !error && (
                    <View style={styles(colors).mealplansGrid}>
                      {displayPlans
                        .slice(0, 4)
                        .map((plan, index) => renderMealplanCard(plan, index))}
                    </View>
                  )}
                </View>
              </>
            );
          }

          // Calculate subscription progress for use in multiple components
          if (!subscriptionLoading && activeSubscription) {
            const startDate = new Date(activeSubscription.startDate);
            const endDate = new Date(activeSubscription.endDate);
            const currentDate = new Date();
            const daysElapsed = Math.ceil(
              (currentDate - startDate) / (1000 * 60 * 60 * 24)
            );

            return (
              // Subscription-focused UI
              <>
                {/* Today's Meals Section */}
                {renderTodaysMeals()}

                {/* Subscription Status Card */}
                {renderSubscriptionStatus()}

                {/* Quick Stats */}
                <View style={styles(colors).quickStatsSection}>
                  <Text style={styles(colors).sectionTitle}>Your Progress</Text>
                  <View style={styles(colors).statsGrid}>
                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statNumber}>
                        {activeSubscription.metrics?.totalMealsDelivered || 0}
                      </Text>
                      <Text style={styles(colors).statLabel}>
                        Meals Delivered
                      </Text>
                    </View>
                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statNumber}>
                        ₦
                        {(
                          activeSubscription.metrics?.totalSpent ||
                          activeSubscription.totalPrice ||
                          0
                        ).toLocaleString()}
                      </Text>
                      <Text style={styles(colors).statLabel}>Total Spent</Text>
                    </View>
                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statNumber}>
                        {activeSubscription.metrics?.consecutiveDays ||
                          Math.max(0, daysElapsed)}
                      </Text>
                      <Text style={styles(colors).statLabel}>Day Streak</Text>
                    </View>
                  </View>
                </View>

                {/* Browse Meal Plans Button */}
                <View style={styles(colors).browseSection}>
                  <TouchableOpacity
                    style={styles(colors).browseMealPlansButton}
                    onPress={() => setShowBrowseMode(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="restaurant"
                      size={20}
                      color={colors.white}
                    />
                    <Text style={styles(colors).browseMealPlansText}>
                      Browse Meal Plans
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                </View>
              </>
            );
          } else {
            return (
              // Regular browsing UI
              <>
                {/* Promo Banners */}
                {renderPromoBanners()}

                {/* Popular Food Section */}
                <View style={styles(colors).section}>
                  <View style={styles(colors).sectionHeader}>
                    <Text style={styles(colors).sectionTitle}>
                      Popular plans
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Search")}
                    ></TouchableOpacity>
                  </View>

                  {/* Loading State */}
                  {loading && !refreshing && (
                    <View style={styles(colors).loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles(colors).loadingText}>
                        Loading meal plans...
                      </Text>
                    </View>
                  )}

                  {/* Error State */}
                  {error && !loading && (
                    <View style={styles(colors).errorContainer}>
                      <Ionicons
                        name="alert-circle"
                        size={48}
                        color={colors.error}
                      />
                      <Text style={styles(colors).errorTitle}>
                        Oops! Something went wrong
                      </Text>
                      <Text style={styles(colors).errorText}>{error}</Text>
                      <TouchableOpacity
                        style={styles(colors).retryButton}
                        onPress={refreshMealPlans}
                      >
                        <Text style={styles(colors).retryButtonText}>
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Popular Food Slider */}
                  {!loading && !error && (
                    <View style={styles(colors).popularFoodContainer}>
                      {displayPlans.length > 0 ? (
                        <ScrollView
                          ref={popularScrollRef}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={
                            styles(colors).popularFoodScrollContent
                          }
                          scrollEventThrottle={16}
                          decelerationRate="fast"
                        >
                          {displayPlans.map((plan, index) =>
                            renderPopularFoodCard(plan, index)
                          )}
                        </ScrollView>
                      ) : (
                        <View style={styles(colors).emptyContainer}>
                          <Ionicons
                            name="restaurant"
                            size={48}
                            color={colors.textMuted}
                          />
                          <Text style={styles(colors).emptyTitle}>
                            No meal plans found
                          </Text>
                          <Text style={styles(colors).emptyText}>
                            Try selecting a different category or refresh to
                            load plans.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Our Mealplans Section */}
                <View style={styles(colors).section}>
                  <Text style={styles(colors).sectionTitle}>Our Mealplans</Text>

                  {!loading && !error && (
                    <View style={styles(colors).mealplansGrid}>
                      {displayPlans
                        .slice(0, 4)
                        .map((plan, index) => renderMealplanCard(plan, index))}
                    </View>
                  )}
                </View>
              </>
            );
          }
        })()}

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Pause Modal */}
      {renderPauseModal()}

      <Tutorial
        steps={homeScreenTutorialSteps}
        isVisible={showTutorial}
        onDismiss={() => setShowTutorial(false)}
      />
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.background,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    locationText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
      fontWeight: "500",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
    },
    notificationContainer: {
      flex: 1,
      alignItems: "flex-end",
    },
    scrollView: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      // backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    filterButton: {
      padding: 4,
    },
    heroBannerContainer: {
      marginBottom: 20,
    },
    heroBanner: {
      backgroundColor: colors.primary,
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      minHeight: 120,
      maxHeight: 130,
    },
    heroContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroTextSection: {
      flex: 1,
      paddingHorizontal: 20,
      // paddingTop: 5,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.black,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      color: "#333",
      marginBottom: 16,
      lineHeight: 20,
    },
    heroButton: {
      backgroundColor: colors.black,
      paddingHorizontal: 15,
      paddingVertical: 7,
      borderRadius: THEME.borderRadius.xxl,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
    },
    heroButtonText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "600",
      marginRight: 4,
    },
    heroButtonIcon: {
      marginLeft: 4,
      color: colors.primary,
    },
    heroImageSection: {
      width: 150,
      height: 130,
      paddingRight: 15,
      // paddingLeft: 5,
      overflow: "hidden",
    },
    heroImage: {
      width: "100%",
      height: "150%",
      borderRadius: THEME.borderRadius.medium,
    },
    categoriesSection: {
      paddingVertical: 15,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // marginBottom: 15,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 15,
      opacity: 0.7,
      color: colors.text,
    },
    seeAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    categoriesContainer: {
      paddingVertical: 10,
    },
    categoriesScroll: {
      flexGrow: 0,
    },
    categoriesContent: {
      paddingHorizontal: 20,
    },
    categoryTab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginRight: 15,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: colors.white,
    },
    popularFoodContainer: {
      marginTop: 5,
    },
    popularFoodScrollContent: {
      paddingLeft: 10,
      paddingRight: 10,
    },
    popularFoodCard: {
      width: width * 0.8,
      height: 400,
      marginRight: 20,
      borderRadius: 30,
      overflow: "hidden",
      // ...THEME.shadows.medium,
    },
    popularImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    popularImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    priceBadgeContainer: {
      position: "absolute",
      top: 12,
      left: 12,
      borderWeight: 2,
      borderWhite: "#ffffff",
      borderRadius: 20,
      overflow: "hidden",
      ...THEME.shadows.light,
    },
    priceBadge: {
      paddingHorizontal: 10,
      paddingVertical: 13,
      justifyContent: "center",
      alignItems: "center",
    },
    priceBadgeText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#000000ff",
    },
    heartButton: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(0, 0, 0, 1)",
      justifyContent: "center",
      alignItems: "center",
      ...THEME.shadows.light,
    },
    popularFoodInfo: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    popularInfoGradient: {
      height: "100%",
      justifyContent: "flex-end",
      padding: 15,
    },
    popularFoodName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.white,
      textAlign: "left",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    bottomPadding: {
      height: 120, // Extra padding for floating tab bar
    },
    // New Popular Plans Styles
    popularPlanCard: {
      width: width * 0.75,
      height: 400,
      marginRight: 20,
      borderRadius: 20,
      overflow: "hidden",
      position: "relative",
      backgroundColor: colors.cardBackground,
    },
    popularCardImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    popularCardImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    popularHeartButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.51)",
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    popularCardContent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      justifyContent: "flex-end",
    },
    popularCardTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 8,
    },
    popularCardDescription: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
      marginBottom: 12,
      lineHeight: 20,
    },
    popularCardPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    // Mealplans Grid Styles
    mealplansGrid: {
      flexDirection: "column",
      paddingHorizontal: 0,
      gap: 20, // Uniform spacing between cards
    },
    mealplanCard: {
      width: "100%",
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 0, // Remove margin as gap handles spacing
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    mealplanImageContainer: {
      position: "relative",
      height: 200, // Much larger image height
      width: "100%",
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    mealplanHeartButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 1)",
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    newBadge: {
      position: "absolute",
      top: 16,
      left: 16,
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    newBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "bold",
    },
    mealplanContentOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingTop: 90, // Extra padding for gradient effect
    },
    mealplanTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 6,
    },
    mealplanDescription: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
      marginBottom: 8,
      lineHeight: 20,
    },
    mealplanPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    // Subscription-focused UI Styles
    todaysMealsSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    deliveryStatus: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 15,
      fontStyle: "italic",
    },
    mealsScroll: {
      marginTop: 5,
    },
    todayMealCard: {
      width: 200,
      height: 280,
      marginRight: 15,
      borderRadius: 20,
      overflow: "hidden",
    },
    todayMealImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    todayMealImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    todayMealOverlay: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      padding: 15,
      justifyContent: "space-between",
    },
    mealTimeContainer: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      paddingHorizontal: 12,
      paddingVertical: 2,
      borderRadius: 15,
    },
    mealTime: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.black,
    },
    mealType: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    todayMealName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    mealCalories: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    subscriptionCard: {
      borderRadius: 20,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    subscriptionGradient: {
      padding: 20,
    },
    subscriptionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    subscriptionPlanName: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    subscriptionDuration: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionMenuButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    progressContainer: {
      marginBottom: 20,
    },
    progressBar: {
      width: "100%",
      height: 8,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 4,
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.white,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flex: 1,
      marginHorizontal: 4,
      justifyContent: "center",
    },
    actionButtonText: {
      fontSize: 12,
      color: colors.white,
      fontWeight: "600",
      marginLeft: 4,
    },
    quickStatsSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Browse section styles
    browseSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    browseMealPlansButton: {
      backgroundColor: colors.textSecondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 15,
      gap: 8,
    },
    browseMealPlansText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
      flex: 1,
      textAlign: "center",
    },
    // Menu dropdown styles
    menuDropdown: {
      position: "absolute",
      top: 60,
      right: 16,
      backgroundColor: colors.white,
      borderRadius: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 1000,
      minWidth: 250,
    },
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuOptionLast: {
      borderBottomWidth: 0,
    },
    menuOptionDanger: {
      backgroundColor: "rgba(255, 0, 0, 0.05)",
    },
    menuOptionText: {
      marginLeft: 12,
      flex: 1,
    },
    menuOptionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    menuOptionTitleDanger: {
      color: colors.error,
    },
    menuOptionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Pause modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    pauseModal: {
      backgroundColor: colors.white,
      borderRadius: 20,
      padding: 24,
      width: "100%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      marginTop: 16,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      textAlignVertical: "top",
      backgroundColor: colors.cardBackground,
    },
    durationOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 8,
    },
    durationOption: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    durationOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    durationOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    durationOptionTextSelected: {
      color: colors.white,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    modalButtonSecondary: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonDisabled: {
      backgroundColor: colors.textMuted,
      opacity: 0.6,
    },
    modalButtonTextSecondary: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    modalButtonTextPrimary: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    // No meals container styles
    noMealsContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    noMealsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noMealsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 20,
    },
    contactSupportButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    contactSupportText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    // Back to plan styles
    backToPlanSection: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    backToPlanButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "rgba(255, 193, 7, 0.1)",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    backToPlanText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    // Banner slide styles
    bannerSlide: {
      width: width,
      paddingHorizontal: 20,
    },
    promoBannerContainer: {
      position: 'relative',
      borderRadius: THEME.borderRadius.large,
      overflow: 'hidden',
      minHeight: 140,
      maxHeight: 140,
    },
    promoBannerImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
    },
    promoBannerCTA: {
      position: 'absolute',
      bottom: 15,
      right: 15,
      backgroundColor: colors.white,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: THEME.borderRadius.xxl,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      // Visual indicator - not interactive since whole banner is clickable
      opacity: 0.95,
    },
    promoBannerCTAText: {
      color: colors.black,
      fontSize: 12,
      fontWeight: '600',
      marginRight: 4,
    },
    promoBannerCTAIcon: {
      marginLeft: 4,
      color: colors.black,
    },
    bannerIndicators: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 15,
      gap: 8,
    },
    bannerIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
      opacity: 0.5,
    },
    bannerIndicatorActive: {
      backgroundColor: colors.primary,
      opacity: 1,
    },
  });

export default HomeScreen;
