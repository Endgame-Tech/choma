import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../utils/colors";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";

const { width } = Dimensions.get("window");

const MealProgressionTimeline = ({
  subscriptionId,
  onMealPress,
  onViewFullTimeline,
}) => {
  const { colors, isDark } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("vertical"); // 'vertical' or 'horizontal'
  const [currentMealIndex, setCurrentMealIndex] = useState({}); // Track current meal index for each day
  const timelineRef = useRef(null);

  useEffect(() => {
    loadTimeline();
  }, [subscriptionId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      console.log("🔄 Loading timeline for subscription:", subscriptionId);

      if (!subscriptionId) {
        console.log("⚠️ No subscription ID provided");
        setTimeline([]);
        return;
      }

      const result = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        14 // Show 2 weeks instead of 7 days
      );

      console.log("📊 Timeline API result:", result);

      if (result.success && result.data) {
        // Handle different possible data structures
        let timelineData = [];

        if (Array.isArray(result.data)) {
          timelineData = result.data;
        } else if (Array.isArray(result.data.data)) {
          timelineData = result.data.data;
        } else if (
          result.data.timeline &&
          Array.isArray(result.data.timeline)
        ) {
          timelineData = result.data.timeline;
        }

        // Group meals by day
        const groupedByDay = groupMealsByDay(timelineData);
        console.log(
          "📈 Setting grouped timeline data:",
          groupedByDay.length,
          "days"
        );
        console.log("📋 Grouped timeline:", groupedByDay);

        // If no timeline data from API, try to generate timeline from subscription details
        if (groupedByDay.length === 0) {
          console.log(
            "🔧 No meal assignments found, trying to generate basic timeline..."
          );
          const basicTimelineData = await generateBasicTimeline();
          setTimeline(basicTimelineData);
        } else {
          setTimeline(groupedByDay);
        }
      } else {
        console.log(
          "⚠️ No timeline data available:",
          result.message || "Unknown error"
        );
        console.log("🔧 Generating basic timeline...");
        const basicTimelineData = await generateBasicTimeline();
        setTimeline(basicTimelineData);
      }
    } catch (error) {
      console.error("❌ Error loading meal timeline:", error);

      // Try to generate basic timeline even on error
      console.log("🔧 API error, generating basic timeline...");
      try {
        const basicTimelineData = await generateBasicTimeline();
        setTimeline(basicTimelineData);
      } catch (fallbackError) {
        console.error("❌ Fallback timeline generation failed:", fallbackError);

        // Final fallback to mock data for development
        if (__DEV__) {
          console.log("🔧 Loading mock timeline data for development");
          const mockData = getMockTimelineData();
          const groupedMock = groupMealsByDay(mockData);
          setTimeline(groupedMock);
        } else {
          setTimeline([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Group meals by day to show all meals (breakfast, lunch, dinner) in one card per day
  const groupMealsByDay = (timelineData) => {
    if (!Array.isArray(timelineData) || timelineData.length === 0) {
      return [];
    }

    // Group by date
    const dayGroups = {};

    timelineData.forEach((item) => {
      const dateKey = new Date(item.date).toDateString();

      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = {
          date: item.date,
          dayIndex: item.dayIndex,
          dayName: item.dayName,
          weekNumber: item.weekNumber,
          dayOfWeek: item.dayOfWeek,
          dayType: item.dayType,
          meals: [],
          allMeals: [], // Combined meal details
        };
      }

      // Add all meals from this timeline item
      if (item.meals && Array.isArray(item.meals)) {
        dayGroups[dateKey].meals.push(...item.meals);
        dayGroups[dateKey].allMeals.push(...item.meals);
      } else if (item.mealAssignment) {
        // Handle single meal assignment
        dayGroups[dateKey].meals.push({
          mealTime: item.mealAssignment.mealTime,
          title: item.mealAssignment.customTitle || item.mealAssignment.title,
          description:
            item.mealAssignment.customDescription ||
            item.mealAssignment.description,
          meals: item.mealAssignment.meals,
          imageUrl: item.mealAssignment.imageUrl,
        });
        dayGroups[dateKey].allMeals.push(item.mealAssignment);
      }
    });

    // Convert to array and sort by date
    const groupedDays = Object.values(dayGroups).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Ensure each day has proper meal time ordering and combine meal details
    return groupedDays.map((day) => {
      const mealTimeOrder = ["breakfast", "lunch", "dinner"];
      const organizedMeals = {};

      // Organize meals by meal time
      day.meals.forEach((meal) => {
        const mealTime = meal.mealTime || "lunch";
        if (!organizedMeals[mealTime]) {
          organizedMeals[mealTime] = [];
        }
        organizedMeals[mealTime].push(meal);
      });

      // Create summary of available meals
      const availableMealTimes = mealTimeOrder.filter(
        (time) => organizedMeals[time] && organizedMeals[time].length > 0
      );
      const totalMealItems = day.meals.reduce(
        (total, meal) => total + (meal.meals?.length || 1),
        0
      );

      return {
        ...day,
        organizedMeals,
        availableMealTimes,
        totalMealItems,
        mealSummary: availableMealTimes
          .map((time) => time.charAt(0).toUpperCase() + time.slice(1))
          .join(", "),
        primaryImage: day.meals[0]?.imageUrl || null,
      };
    });
  };

  // Mock data for development/testing
  // Generate basic timeline from subscription data when API is not available
  const generateBasicTimeline = async () => {
    if (!subscriptionId) {
      console.log("⚠️ No subscription ID for basic timeline generation");
      return [];
    }

    try {
      // Try to get subscription details to generate timeline
      const subscriptionResult = await apiService.getSubscription(
        subscriptionId
      );
      const subscription = subscriptionResult?.data || {};

      console.log(
        "🔧 Generating basic timeline from subscription:",
        subscription
      );

      const today = new Date();
      const startDate = new Date(
        subscription.startDate || subscription.createdAt || today
      );
      const basicData = [];

      // Generate 14 days of timeline (2 weeks)
      for (let i = -3; i < 11; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today && !isToday;
        const dayType = isPast ? "past" : isToday ? "current" : "future";

        // Calculate week and day numbers
        const weekNumber = Math.ceil((i + 4) / 7);
        const dayOfWeek = ((i + 3) % 7) + 1;

        // Generate meal for each day
        const mealTypes = ["breakfast", "lunch", "dinner"];
        const mealTime = mealTypes[i % 3];

        basicData.push({
          date: date.toISOString(),
          dayIndex: i,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          weekNumber: weekNumber,
          dayOfWeek: dayOfWeek,
          dayType: dayType,
          mealAssignment: {
            customTitle: subscription.planName
              ? `${subscription.planName} ${mealTime}`
              : `${mealTime} meal`,
            customDescription: `Week ${weekNumber}, Day ${dayOfWeek}`,
            mealTime: mealTime,
            imageUrl:
              subscription.mealPlanId?.planImageUrl ||
              "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            meals: [
              { name: "Protein" },
              { name: "Vegetables" },
              { name: "Carbs" },
            ],
            weekNumber: weekNumber,
            dayOfWeek: dayOfWeek,
            delivered: dayType === "past",
            deliveryStatus:
              dayType === "past"
                ? "delivered"
                : dayType === "current"
                ? "ready"
                : "scheduled",
          },
          meals: [
            {
              mealTime: mealTime,
              title: `${
                mealTime.charAt(0).toUpperCase() + mealTime.slice(1)
              } Meal`,
              description: "Fresh ingredients prepared daily",
              meals: "Protein + Vegetables + Carbs",
              imageUrl:
                subscription.mealPlanId?.planImageUrl ||
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            },
          ],
        });
      }

      console.log(
        "✅ Generated basic timeline with",
        basicData.length,
        "entries"
      );
      return basicData;
    } catch (error) {
      console.error("❌ Error generating basic timeline:", error);
      return getMockTimelineData();
    }
  };

  const getMockTimelineData = () => {
    const today = new Date();
    const mockData = [];

    for (let i = -2; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayType = i < 0 ? "past" : i === 0 ? "current" : "future";

      mockData.push({
        date: date.toISOString(),
        dayIndex: i,
        dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
        weekNumber: 1,
        dayOfWeek: date.getDay() || 7, // Convert Sunday=0 to Sunday=7
        dayType: dayType,
        mealAssignment: {
          customTitle: `${
            dayType === "past"
              ? "Delivered"
              : dayType === "current"
              ? "Ready"
              : "Upcoming"
          } Meal`,
          customDescription: `Delicious ${
            i < 0 ? "delivered" : "prepared"
          } meal for ${date.toLocaleDateString()}`,
          mealTime:
            i % 3 === 0 ? "breakfast" : i % 3 === 1 ? "lunch" : "dinner",
          imageUrl:
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
          meals: [
            { name: "Grilled Chicken" },
            { name: "Steamed Vegetables" },
            { name: "Brown Rice" },
          ],
          weekNumber: 1,
          dayOfWeek: date.getDay() || 7,
          delivered: dayType === "past",
          deliveryStatus:
            dayType === "past"
              ? "delivered"
              : dayType === "current"
              ? "ready"
              : "scheduled",
        },
        meals: [
          {
            mealTime:
              i % 3 === 0 ? "breakfast" : i % 3 === 1 ? "lunch" : "dinner",
            title: `Meal ${i + 3}`,
            description: "Fresh ingredients prepared daily",
            meals: "Protein + Vegetables + Carbs",
            imageUrl:
              "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
          },
        ],
      });
    }

    return mockData;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimeline();
    setRefreshing(false);
  };

  const handleViewFullTimeline = () => {
    if (onViewFullTimeline) {
      onViewFullTimeline();
    } else {
      // Toggle between horizontal and vertical view modes
      setViewMode(viewMode === "vertical" ? "horizontal" : "vertical");
    }
  };

  const scrollToToday = () => {
    if (timelineRef.current && safeTimeline.length > 0) {
      const todayIndex = safeTimeline.findIndex(
        (item) => item.dayType === "current"
      );
      if (todayIndex >= 0) {
        if (viewMode === "horizontal") {
          timelineRef.current.scrollToIndex({
            index: todayIndex,
            animated: true,
            viewPosition: 0.5,
          });
        } else {
          timelineRef.current.scrollTo({
            y: todayIndex * 132, // Approximate card height
            animated: true,
          });
        }
      }
    }
  };

  const formatDate = (date) => {
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return {
        primary: "Today",
        secondary: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return {
        primary: "Tomorrow",
        secondary: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return {
        primary: "Yesterday",
        secondary: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    } else {
      return {
        primary: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        secondary: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    }
  };

  const getMealTypeColor = (mealTime, dayType) => {
    // Adjust colors based on day type
    if (dayType === "past") {
      return ["#95A5A6", "#7F8C8D"]; // Gray for delivered meals
    } else if (dayType === "current") {
      // Bright colors for current meal
      switch (mealTime) {
        case "breakfast":
          return ["#FFB347", "#FF8C42"];
        case "lunch":
          return ["#4ECDC4", "#44A08D"];
        case "dinner":
          return ["#667eea", "#764ba2"];
        default:
          return [COLORS.primary, COLORS.secondary];
      }
    } else {
      // Muted colors for future meals
      switch (mealTime) {
        case "breakfast":
          return ["#FFD6A3", "#FFB347"];
        case "lunch":
          return ["#A3E4DB", "#4ECDC4"];
        case "dinner":
          return ["#B3BDF5", "#667eea"];
        default:
          return ["#E8E8E8", "#D0D0D0"];
      }
    }
  };

  const getMealStatusInfo = (item) => {
    const dayType = item.dayType || "future";
    const mealAssignment = item.mealAssignment || item.meals?.[0];

    switch (dayType) {
      case "past":
        return {
          statusText: "Delivered",
          statusIcon: "checkmark-circle",
          statusColor: "#27AE60",
          bgColor: "rgba(39, 174, 96, 0.1)",
        };
      case "current":
        return {
          statusText: "Ready Now",
          statusIcon: "time",
          statusColor: "#F39C12",
          bgColor: "rgba(243, 156, 18, 0.1)",
        };
      default:
        return {
          statusText: "Scheduled",
          statusIcon: "calendar",
          statusColor: "#3498DB",
          bgColor: "rgba(52, 152, 219, 0.1)",
        };
    }
  };

  const getMealTypeIcon = (mealTime) => {
    const time = (mealTime || "").toLowerCase();
    switch (time) {
      case "breakfast":
        return "sunny-outline"; // sunrise
      case "lunch":
        return "sunny"; // sun
      case "dinner":
        return "moon"; // moon
      default:
        return "sunny"; // default to sun
    }
  };

  const getMealProgress = (index, totalItems) => {
    return ((index + 1) / totalItems) * 100;
  };

  // Helper function to get all meals for a day (for horizontal cards)
  const getAllMealsForDay = (item) => {
    if (item.meals && Array.isArray(item.meals)) {
      return item.meals;
    }
    // If no meals array, return the single meal assignment
    const mealAssignment = item.mealAssignment || {};
    return mealAssignment ? [mealAssignment] : [];
  };

  // Helper function to check if day has valid meals assigned
  const hasValidMeals = (item) => {
    const meals = getAllMealsForDay(item);

    // If no meals array, return false
    if (!meals || meals.length === 0) {
      return false;
    }

    // Check if any meal has actual content (similar to MealPlanDetailScreen pattern)
    return meals.some((meal) => {
      const title = meal.customTitle || meal.title || meal.name || "";
      const hasValidTitle =
        title &&
        title !== "not specified" &&
        title !== "Not specified" &&
        title !== "Meal not specified" &&
        title !== "Breakfast not specified" &&
        title !== "Lunch not specified" &&
        title !== "Dinner not specified" &&
        title.trim() !== "";

      const hasImage = meal.imageUrl && meal.imageUrl.trim() !== "";
      const hasDescription = meal.description && meal.description.trim() !== "";
      const hasMealTime = meal.mealTime && meal.mealTime.trim() !== "";

      // Consider meal valid if it has either a title, image, description, or meal time
      return hasValidTitle || hasImage || hasDescription || hasMealTime;
    });
  };

  // Ensure timeline is always an array to prevent map() errors
  // Filter timeline to only include days with valid meals assigned (similar to MealPlanDetailScreen pattern)
  const safeTimeline = Array.isArray(timeline)
    ? timeline.filter((item) => hasValidMeals(item))
    : [];

  const getProgressInfo = () => {
    if (safeTimeline.length === 0)
      return { completed: 0, total: 0, remaining: 0 };

    const pastMeals = safeTimeline.filter(
      (item) => item.dayType === "past"
    ).length;
    const currentMeals = safeTimeline.filter(
      (item) => item.dayType === "current"
    ).length;
    const futureMeals = safeTimeline.filter(
      (item) => item.dayType === "future"
    ).length;
    const totalMeals = safeTimeline.length;

    return {
      completed: pastMeals,
      current: currentMeals,
      remaining: futureMeals,
      total: totalMeals,
    };
  };

  // Helper function to get order status using the same logic as CompactOrderCard
  const getOrderStatus = (item) => {
    const order = item.order || item.mealAssignment?.order || {};
    const orderStatus = order?.orderStatus || order?.status;
    const delegationStatus = order?.delegationStatus;
    let rawFinalStatus;

    // Use the same logic as CompactOrderCard - prioritize orderStatus for final states
    if (
      orderStatus === "Delivered" ||
      orderStatus === "delivered" ||
      orderStatus === "Cancelled" ||
      orderStatus === "cancelled" ||
      orderStatus === "Out for Delivery" ||
      orderStatus === "out for delivery"
    ) {
      rawFinalStatus = orderStatus;
    } else {
      rawFinalStatus = delegationStatus || orderStatus || "";
    }

    // Map status to user-friendly display
    const statusMap = {
      pending: "Order Placed",
      confirmed: "Confirmed",
      preparing: "Preparing",
      "preparing food": "Preparing",
      ready: "Ready",
      "food ready": "Ready",
      delivering: "Out for Delivery",
      "out for delivery": "Out for Delivery",
      outfordelivery: "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      qualitycheck: "Quality Check",
      "quality check": "Quality Check",
      inprogress: "In Progress",
      "not assigned": "Pending Assignment",
      "pending assignment": "Pending Assignment",
    };

    const normalizedStatus = rawFinalStatus.toLowerCase();
    return statusMap[normalizedStatus] || rawFinalStatus || "Processing";
  };

  // Helper function to get current meal for a day
  const getCurrentMealForDay = (item, dayIndex) => {
    const meals = getAllMealsForDay(item);
    const currentIndex = currentMealIndex[dayIndex] || 0;
    return meals[currentIndex] || meals[0] || item.mealAssignment || {};
  };

  // Helper function to navigate between meals
  const navigateToMeal = (item, direction, dayIndex) => {
    const meals = getAllMealsForDay(item);
    if (meals.length <= 1) return;

    const currentIndex = currentMealIndex[dayIndex] || 0;
    let newIndex;

    if (direction === "next") {
      newIndex = currentIndex < meals.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : meals.length - 1;
    }

    setCurrentMealIndex((prev) => ({
      ...prev,
      [dayIndex]: newIndex,
    }));
  };

  const renderTimelineCard = (item, index, isHorizontal = false) => {
    // Early return if no valid meals are assigned to this day
    if (!hasValidMeals(item)) {
      return null;
    }

    const dateInfo = formatDate(item.date);
    const dayType = item.dayType || "future";
    const dayIndex = item.dayIndex || index;
    const currentMeal = getCurrentMealForDay(item, dayIndex);
    const mealTime =
      currentMeal.mealTime || item.meals?.[0]?.mealTime || "lunch";
    const isCurrentDay = dayType === "current";
    const isPastDay = dayType === "past";
    const orderStatus = getOrderStatus(item);
    const allMeals = getAllMealsForDay(item);

    if (isHorizontal) {
      return (
        <TouchableOpacity
          key={`${item.date}-${item.dayIndex || index}`}
          style={[
            styles.horizontalCard,
            { backgroundColor: isDark ? "#1A1A1A" : colors.cardBackground },
          ]}
          onPress={() => onMealPress && onMealPress(currentMeal)}
          activeOpacity={0.8}
        >
          {/* Order Status Badge */}
          <View style={styles.orderStatusContainer}>
            <Text
              style={[
                styles.orderStatusLabel,
                { color: isDark ? "#FFF" : colors.text },
              ]}
            >
              Order Status
            </Text>
            <View style={styles.orderCheckBadge}>
              <Text style={styles.orderCheckText}>{orderStatus}</Text>
            </View>
          </View>

          {/* Date and Time Section */}
          <View style={styles.dateTimeSection}>
            <View style={styles.sunIcon}>
              <Ionicons
                name={getMealTypeIcon(mealTime)}
                size={32}
                color={isDark ? "#FFF" : "#FFB347"}
              />
            </View>
            <View style={styles.dateTextContainer}>
              <Text
                style={[
                  styles.todayText,
                  { color: isDark ? "#FFF" : colors.text },
                ]}
              >
                {dateInfo.primary}
              </Text>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isDark
                      ? "rgba(255, 255, 255, 0.7)"
                      : colors.textSecondary,
                  },
                ]}
              >
                {dateInfo.secondary}
              </Text>
            </View>
          </View>

          {/* Main Meal Image */}
          <View style={styles.horizontalImageContainer}>
            <Image
              source={{
                uri:
                  currentMeal.imageUrl ||
                  item.imageUrl ||
                  item.meals?.[0]?.imageUrl ||
                  "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
              }}
              style={styles.horizontalMealImage}
              defaultSource={require("../../assets/images/daily-meals.jpg")}
            />
          </View>

          {/* Meal Info Section */}
          <View style={styles.mealInfoSection}>
            <Text
              style={[
                styles.mealTypeText,
                {
                  color: isDark
                    ? "rgba(255, 255, 255, 0.7)"
                    : colors.textSecondary,
                },
              ]}
            >
              {allMeals.length > 1
                ? `${allMeals.length} Meals`
                : mealTime || "breakfast"}
            </Text>
            <Text
              style={[
                styles.mealNameText,
                { color: isDark ? "#FFF" : colors.text },
              ]}
            >
              {allMeals.length > 1
                ? allMeals
                    .map((meal) => meal.customTitle || meal.title || meal.name)
                    .join(", ")
                : currentMeal.customTitle ||
                  currentMeal.title ||
                  currentMeal.name ||
                  item.dayTitle ||
                  "Today's Meal"}
            </Text>
            {allMeals.length > 1 && (
              <ScrollView
                horizontal
                style={styles.horizontalMealList}
                showsHorizontalScrollIndicator={false}
              >
                {allMeals.map((meal, mealIndex) => (
                  <TouchableOpacity
                    key={`meal-${mealIndex}`}
                    style={styles.mealChip}
                    onPress={() => onMealPress && onMealPress(meal)}
                  >
                    <Text
                      style={[
                        styles.mealChipText,
                        { color: isDark ? "#FFF" : colors.text },
                      ]}
                    >
                      {meal.mealTime || "lunch"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Vertical card layout
    return (
      <TouchableOpacity
        key={`${item.date}-${item.dayIndex || index}`}
        style={[
          styles.timelineCard,
          { backgroundColor: isDark ? "#1A1A1A" : colors.cardBackground },
        ]}
        onPress={() => onMealPress && onMealPress(currentMeal)}
        activeOpacity={0.8}
      >
        {/* Order Status Badge */}
        <View style={styles.orderStatusContainer}>
          <Text
            style={[
              styles.orderStatusLabel,
              { color: isDark ? "#FFF" : colors.text },
            ]}
          >
            Order Status
          </Text>
          <View style={styles.orderCheckBadge}>
            <Text style={styles.orderCheckText}>{orderStatus}</Text>
          </View>
        </View>

        <View style={styles.verticalCardContainer}>
          {/* Left Stack (Date, Icon, Arrows, Step Indicator) */}
          <View style={styles.leftStack}>
            {/* Daytime Indicator Icon */}
            <View style={styles.sunIcon}>
              <Ionicons
                name={getMealTypeIcon(mealTime)}
                size={28}
                color={isDark ? "#FFF" : "#FFB347"}
              />
            </View>

            {/* Date */}
            <Text
              style={[
                styles.todayText,
                { color: isDark ? "#FFF" : colors.text },
              ]}
            >
              {dateInfo.primary}
            </Text>
            <Text
              style={[
                styles.dayText,
                {
                  color: isDark
                    ? "rgba(255, 255, 255, 0.7)"
                    : colors.textSecondary,
                },
              ]}
            >
              {dateInfo.secondary}
            </Text>

            {/* Navigation Arrows */}
            <View style={styles.arrowContainer}>
              <TouchableOpacity
                onPress={() => {
                  navigateToMeal(item, "prev", dayIndex);
                }}
                disabled={allMeals.length <= 1}
                style={[
                  styles.arrowButton,
                  { opacity: allMeals.length <= 1 ? 0.3 : 1 },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={isDark ? "#FFF" : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  navigateToMeal(item, "next", dayIndex);
                }}
                disabled={allMeals.length <= 1}
                style={[
                  styles.arrowButton,
                  { opacity: allMeals.length <= 1 ? 0.3 : 1 },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#FFF" : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Step Indicator (Dots) */}
            <View style={styles.stepIndicator}>
              {allMeals.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        dotIndex === (currentMealIndex[dayIndex] || 0)
                          ? COLORS.primary
                          : "#D0D0D0",
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Right Section (Image and Text) */}
          <View style={styles.rightSection}>
            {/* Main Meal Image */}
            <View style={styles.verticalImageContainer}>
              <Image
                source={{
                  uri:
                    currentMeal.imageUrl ||
                    item.imageUrl ||
                    item.meals?.[0]?.imageUrl ||
                    "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
                }}
                style={styles.verticalMealImage}
                defaultSource={require("../../assets/images/daily-meals.jpg")}
              />
            </View>

            {/* Meal Info Section */}
            <View style={styles.mealInfoSection}>
              <Text
                style={[
                  styles.mealTypeText,
                  {
                    color: isDark
                      ? "rgba(255, 255, 255, 0.7)"
                      : colors.textSecondary,
                  },
                ]}
              >
                {allMeals.length > 1
                  ? `${allMeals.length} Meals`
                  : mealTime || "breakfast"}
              </Text>
              <Text
                style={[
                  styles.mealNameText,
                  { color: isDark ? "#FFF" : colors.text },
                ]}
              >
                {currentMeal.customTitle ||
                  currentMeal.title ||
                  currentMeal.name ||
                  item.dayTitle ||
                  "Today's Meal"}
              </Text>
              {allMeals.length > 1 && (
                <Text
                  style={[
                    styles.mealSubText,
                    {
                      color: isDark
                        ? "rgba(255, 255, 255, 0.5)"
                        : colors.textSecondary,
                    },
                  ]}
                >
                  Use arrows to navigate between meals
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHorizontalTimeline = () => {
    return (
      <FlatList
        ref={timelineRef}
        data={safeTimeline}
        renderItem={({ item, index }) => renderTimelineCard(item, index, true)}
        keyExtractor={(item, index) => `${item.date}-${item.dayIndex || index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={() => (
          <TouchableOpacity
            style={[
              styles.viewMoreHorizontalSection,
              { backgroundColor: colors.cardBackground },
            ]}
            onPress={handleViewFullTimeline}
          >
            <LinearGradient
              colors={[colors.inputBackground, colors.border]}
              style={styles.viewMoreHorizontalGradient}
            >
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text
                style={[styles.viewMoreHorizontalTitle, { color: colors.text }]}
              >
                View Full
              </Text>
              <Text
                style={[
                  styles.viewMoreHorizontalSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Timeline
              </Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderVerticalTimeline = () => {
    return (
      <ScrollView
        ref={timelineRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {safeTimeline.map((item, index) =>
          renderTimelineCard(item, index, false)
        )}

        {/* View more section */}
        <TouchableOpacity
          style={[
            styles.viewMoreSection,
            { backgroundColor: colors.cardBackground },
          ]}
          onPress={handleViewFullTimeline}
        >
          <LinearGradient
            colors={[colors.inputBackground, colors.border]}
            style={styles.viewMoreGradient}
          >
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <Text style={[styles.viewMoreTitle, { color: colors.text }]}>
              View Full Timeline
            </Text>
            <Text
              style={[styles.viewMoreSubtitle, { color: colors.textSecondary }]}
            >
              See all upcoming meals and plan ahead
            </Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderProgressBar = () => {
    if (safeTimeline.length === 0) return null;

    const progressInfo = getProgressInfo();
    const completedPercentage =
      progressInfo.total > 0
        ? (progressInfo.completed / progressInfo.total) * 100
        : 0;

    return (
      <View
        style={[
          styles.progressContainer,
          {
            backgroundColor: colors.cardBackground,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>
            Meal Progress
          </Text>
          <Text
            style={[styles.progressSummary, { color: colors.textSecondary }]}
          >
            {progressInfo.completed} delivered • {progressInfo.remaining}{" "}
            remaining
          </Text>
        </View>

        <View
          style={[
            styles.progressBar,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <View
            style={[styles.progressFill, { width: `${completedPercentage}%` }]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#27AE60" }]} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {progressInfo.completed} Delivered
            </Text>
          </View>

          {progressInfo.current > 0 && (
            <View style={styles.progressStat}>
              <View style={[styles.statDot, { backgroundColor: "#F39C12" }]} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {progressInfo.current} Ready
              </Text>
            </View>
          )}

          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#3498DB" }]} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {progressInfo.remaining} Upcoming
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading meal timeline...
        </Text>
      </View>
    );
  }

  if (safeTimeline.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <LinearGradient
          colors={[colors.cardBackground, colors.inputBackground]}
          style={styles.emptyGradient}
        >
          <Ionicons
            name="calendar-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Meals Scheduled
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your upcoming meal timeline will appear here once you have an active
            subscription
          </Text>
          <TouchableOpacity style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Browse Meal Plans</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Meal Timeline
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.inputBackground },
            ]}
            onPress={scrollToToday}
          >
            <Ionicons name="today" size={16} color={COLORS.primary} />
            <Text style={styles.filterText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.inputBackground, marginLeft: 8 },
            ]}
            onPress={() =>
              setViewMode(viewMode === "vertical" ? "horizontal" : "vertical")
            }
          >
            <Ionicons
              name={
                viewMode === "vertical" ? "swap-horizontal" : "swap-vertical"
              }
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.filterText}>
              {viewMode === "vertical" ? "Horizontal" : "Vertical"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderProgressBar()}

      {viewMode === "horizontal"
        ? renderHorizontalTimeline()
        : renderVerticalTimeline()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressSummary: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStat: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scrollContainer: {
    flex: 1,
    paddingTop: 16,
  },
  horizontalScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Vertical Timeline Styles
  timelineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },

  // Horizontal Timeline Styles
  horizontalCard: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },

  // Order Status Section
  orderStatusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  orderStatusLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  orderCheckBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  orderCheckText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Vertical Card Layout
  verticalCardContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  leftStack: {
    marginRight: 20,
    alignItems: "left",
  },
  rightSection: {
    flex: 1,
  },

  // Date and Time Section
  todayText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    // textAlign: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "400",
    // textAlign: "center",
  },

  // Meal Image Containers
  horizontalImageContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  verticalImageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  horizontalMealImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  verticalMealImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },

  // Meal Info Section
  mealInfoSection: {
    alignItems: "flex-start",
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 4,
  },
  mealNameText: {
    fontSize: 24,
    fontWeight: "600",
  },

  // Navigation Arrows
  arrowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 50,
    marginVertical: 8,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 35,
    marginTop: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // View More Styles
  viewMoreSection: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  viewMoreGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  viewMoreTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },
  viewMoreSubtitle: {
    flex: 1,
    fontSize: 12,
    marginLeft: 12,
  },
  viewMoreHorizontalSection: {
    width: width * 0.3,
    borderRadius: 16,
    overflow: "hidden",
    marginLeft: 12,
  },
  viewMoreHorizontalGradient: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    minHeight: 120,
  },
  viewMoreHorizontalTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  viewMoreHorizontalSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },

  // New styles for enhanced functionality
  arrowButton: {
    padding: 4,
    borderRadius: 12,
  },
  horizontalMealList: {
    marginTop: 8,
  },
  mealChip: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  mealChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mealSubText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default MealProgressionTimeline;
