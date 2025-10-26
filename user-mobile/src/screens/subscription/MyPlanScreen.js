import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  ImageBackground,
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

  const [loading, setLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [currentMeal, setCurrentMeal] = useState(null);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementModalTab, setManagementModalTab] = useState("overview");

  useEffect(() => {
    loadPlanData();
  }, []);

  const loadPlanData = async () => {
    try {
      setLoading(true);

      // Use subscription from params or fetch active subscription
      if (subscriptionParam) {
        setActiveSubscription(subscriptionParam);
        // Still need to fetch meals for param-provided subscription
        await loadTodaysMeals(subscriptionParam);
      } else {
        // ✨ NEW: Use unified meal dashboard endpoint
        const dashboardResult = await apiService.getMealDashboard();
        console.log("📋 Unified dashboard result in MyPlan:", dashboardResult);

        if (dashboardResult?.success && dashboardResult?.data) {
          const data = dashboardResult.data;

          if (data.hasActiveSubscription && data.activeSubscription) {
            console.log("✅ Setting active subscription:", data.activeSubscription.planName);
            setActiveSubscription(data.activeSubscription);

            // Set current meal (already fetched by unified endpoint)
            if (data.currentMeal) {
              setCurrentMeal(data.currentMeal);
              console.log("🍽️ Current meal:", data.currentMeal.customTitle);
            }

            // Set timeline meals (already fetched by unified endpoint)
            if (data.mealTimeline && data.mealTimeline.length > 0) {
              // Filter for today's meals
              const todayMeals = data.mealTimeline.filter((meal) => meal.isToday);
              setTodaysMeals(todayMeals);
              console.log("📅 Today's meals from timeline:", todayMeals.length);
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
      }

      // Get meal timeline for today's meals
      const timelineResult = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        1 // Just get today
      );

      console.log("📅 Timeline result:", timelineResult);
      if (timelineResult?.success && timelineResult?.data) {
        // Handle nested data structure
        const timelineData = timelineResult.data.data || timelineResult.data;
        const timeline = Array.isArray(timelineData) ? timelineData : [];
        console.log("📅 Timeline array:", timeline);

        // Filter for today's meals (dayType === 'current')
        const todayMeals = timeline.filter((day) => day.dayType === "current");
        console.log("🍽️ Today's meals:", todayMeals);
        setTodaysMeals(todayMeals);
      }
    } catch (error) {
      console.error("Error loading today's meals:", error);
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

    const highlightedMeal = currentMeal || todaysMeals[0] || {};
    console.log("🎨 Highlighted meal for hero:", highlightedMeal);

    const mealPlan =
      activeSubscription.mealPlanId || activeSubscription.mealPlan || {};

    // Extract image from the backend structure
    const heroImageSource = (() => {
      // For currentMeal (from getCurrentMeal API)
      if (highlightedMeal?.imageUrl) {
        return {
          uri: highlightedMeal.imageUrl?.uri || highlightedMeal.imageUrl,
        };
      }
      // For todaysMeals (from timeline API - day object)
      if (highlightedMeal?.meals?.[0]?.imageUrl) {
        return { uri: highlightedMeal.meals[0].imageUrl };
      }
      // For meal plan fallback
      if (highlightedMeal?.meals?.[0]?.image) {
        return { uri: highlightedMeal.meals[0].image };
      }
      if (mealPlan?.planImageUrl) return { uri: mealPlan.planImageUrl };
      if (mealPlan?.image) return { uri: mealPlan.image };
      if (mealPlan?.coverImage) return { uri: mealPlan.coverImage };
      return require("../../../assets/authImage.png");
    })();

    // Extract meal title from the backend structure
    const mealTitle =
      highlightedMeal?.customTitle || // From getCurrentMeal
      highlightedMeal?.meals?.[0]?.title || // From timeline day object
      highlightedMeal?.meals?.[0]?.name || // From timeline day object
      highlightedMeal?.dayTitle || // From timeline day object
      "Today's Special";

    console.log("📝 Meal title for hero:", mealTitle);
    console.log("🖼️ Hero image source:", heroImageSource);

    const planName = getPlanDisplayName(activeSubscription);

    const subscriptionId = activeSubscription._id || activeSubscription.id;

    return (
      <View style={styles(colors).heroSection}>
        <View style={styles(colors).heroCard}>
          <Image
            source={heroImageSource}
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

        <View style={styles(colors).heroButtonsGroup}>
          <TouchableOpacity
            style={styles(colors).heroPrimaryButton}
            activeOpacity={0.9}
            onPress={() => {
              const subscriptionId =
                activeSubscription._id || activeSubscription.id;
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
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primary2}
        />
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
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primary2}
        />
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
    <LinearGradient
      colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
      locations={[0, 0.4, 0.7, 1]}
      style={styles(colors).container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

      {/* Pattern overlay on gradient */}
      <ImageBackground
        source={require("../../../assets/patternchoma.png")}
        resizeMode="repeat"
        style={styles(colors).backgroundPattern}
        imageStyle={styles(colors).backgroundImageStyle}
      />

      {/* Hero Header with Gold Gradient */}
      <LinearGradient
        colors={[PRIMARY_GOLD, PRIMARY_GOLD_DARK]}
        style={styles(colors).heroHeader}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles(colors).headerRow}>
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={() => navigation.goBack()}
            >
              <CustomIcon name="chevron-back" size={20} color={colors.primary2} />
            </TouchableOpacity>
            <Text style={styles(colors).heroTitle}>My Meal Plan</Text>
            <View style={styles(colors).placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

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
    </LinearGradient>
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
    // Hero Header Styles
    heroHeader: {
      //   paddingBottom: 32,
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
    },
    heroSection: {
      marginTop: 30,
      paddingHorizontal: 20,
    },
    heroCard: {
      height: 240,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 10,
      backgroundColor: "#000",
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
      marginTop: 20,
      paddingHorizontal: 35,
    },
    heroPrimaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
      marginBottom: 12,
    },
    heroPrimaryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary2,
      letterSpacing: 0.2,
      textTransform: "none",
    },
    heroSecondaryButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: PRIMARY_GOLD,
      borderRadius: 32,
      paddingVertical: 13,
      paddingHorizontal: 16,
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
    // Section Styles
    section: {
      paddingHorizontal: 20,
      marginTop: 32,
    },
    sectionTitle: {
      fontSize: 18,
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
