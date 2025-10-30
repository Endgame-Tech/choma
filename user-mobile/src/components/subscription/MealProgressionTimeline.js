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
import { formatDateRelative } from "../../utils/dateUtils";

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
  const [realTimeUpdateInterval, setRealTimeUpdateInterval] = useState(null);
  const [viewMode, setViewMode] = useState("vertical"); // Only 'vertical' mode available
  const [currentMealIndex, setCurrentMealIndex] = useState({}); // Track current meal index for each day
  const timelineRef = useRef(null);

  useEffect(() => {
    loadTimeline();
  }, [subscriptionId]);

  // Silent update function that only updates status without refreshing UI
  const silentTimelineUpdate = async () => {
    try {
      if (!subscriptionId) {
        console.log("Silent timeline update: No subscription ID");
        return;
      }

      const result = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        14 // Show 2 weeks instead of 7 days
      );

      // Enhanced error checking
      if (!result) {
        console.log("Silent timeline update: No response received");
        return;
      }

      if (!result.success) {
        console.log("Silent timeline update: API returned success: false");
        return;
      }

      if (!result.data) {
        console.log("Silent timeline update: No data received");
        return;
      }

      // Handle different possible data structures
      let timelineData = [];
      if (Array.isArray(result.data)) {
        timelineData = result.data;
      } else if (Array.isArray(result.data.data)) {
        timelineData = result.data.data;
      } else if (result.data.timeline && Array.isArray(result.data.timeline)) {
        timelineData = result.data.timeline;
      }

      if (timelineData.length === 0) {
        console.log("Silent timeline update: No timeline data available");
        return;
      }

      // Group meals by day
      const groupedByDay = groupMealsByDay(timelineData);

      setTimeline((prevTimeline) => {
        const newTimeline = [...prevTimeline];
        let hasChanges = false;

        // Update status for existing timeline items without triggering refresh
        groupedByDay.forEach((newItem) => {
          const existingIndex = newTimeline.findIndex(
            (item) =>
              new Date(item.date).toDateString() ===
              new Date(newItem.date).toDateString()
          );

          if (existingIndex !== -1) {
            const existing = newTimeline[existingIndex];
            const newOrder =
              newItem.order || newItem.mealAssignment?.order || {};
            const newStatus =
              newOrder.orderStatus ||
              newOrder.status ||
              newOrder.delegationStatus;
            const existingOrder =
              existing.order || existing.mealAssignment?.order || {};
            const existingStatus =
              existingOrder.orderStatus ||
              existingOrder.status ||
              existingOrder.delegationStatus;

            // Only update if status has actually changed
            if (newStatus && newStatus !== existingStatus) {
              console.log(
                `📱 Meal status update for ${newItem.date}: ${existingStatus} → ${newStatus}`
              );
              newTimeline[existingIndex] = { ...existing, ...newItem };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? newTimeline : prevTimeline;
      });
    } catch (error) {
      console.log("Silent timeline update failed:", error.message);
      // Don't show error to user for silent updates
    }
  };

  // Set up intelligent real-time updates for active meals
  useEffect(() => {
    // Clear any existing interval
    if (realTimeUpdateInterval) {
      clearInterval(realTimeUpdateInterval);
      setRealTimeUpdateInterval(null);
    }

    // Only set up real-time updates if we have timeline data and active/current meals
    const hasActiveMeals = timeline.some((item) => {
      const order = item.order || item.mealAssignment?.order || {};
      const status = (
        order.delegationStatus ||
        order.status ||
        order.orderStatus ||
        ""
      ).toLowerCase();
      return (
        (status && !["cancelled", "delivered"].includes(status)) ||
        item.dayType === "current"
      );
    });

    if (hasActiveMeals && timeline.length > 0 && subscriptionId) {
      console.log("🔄 Starting intelligent meal timeline status updates...");
      const interval = setInterval(async () => {
        console.log("🔄 Checking for meal timeline status updates...");
        await silentTimelineUpdate(); // Silent updates for status changes only
      }, 30000); // Check every 30 seconds for status changes only

      setRealTimeUpdateInterval(interval);
    }

    return () => {
      if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, [timeline.length, subscriptionId]); // Add subscriptionId to dependencies

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      console.log("🔄 Loading timeline for subscription:", subscriptionId);

      if (!subscriptionId) {
        console.log("⚠️ No subscription ID provided");
        setTimeline([]);
        return;
      }

      // ✨ FIRST: Try to get subscription with mealPlanSnapshot (like MyPlanScreen)
      const subscriptionResult = await apiService.getSubscriptionById(
        subscriptionId
      );
      console.log("📊 Subscription result:", subscriptionResult);

      if (subscriptionResult.success && subscriptionResult.data) {
        const subscription =
          subscriptionResult.data.data || subscriptionResult.data;

        // Check if subscription has mealPlanSnapshot (the CORRECT source)
        if (subscription.mealPlanSnapshot?.mealSchedule) {
          console.log(
            "✅ Found mealPlanSnapshot with",
            subscription.mealPlanSnapshot.mealSchedule.length,
            "meal slots"
          );

          // Convert mealSchedule to timeline format (CORRECT approach)
          const timelineFromSnapshot =
            subscription.mealPlanSnapshot.mealSchedule.map((slot, index) => {
              // ✨ CRITICAL: Use slot.deliveryStatus to determine actual status
              const isDelivered = slot.deliveryStatus === "delivered";

              // Calculate actual date from scheduledDeliveryDate
              const slotDate = new Date(
                slot.scheduledDeliveryDate || subscription.startDate
              );
              const today = new Date();
              const isToday = slotDate.toDateString() === today.toDateString();
              const isPast = slotDate < today && !isToday;

              // ✨ CORRECT dayType logic: Based on delivery status FIRST, then date
              let dayType;
              if (isDelivered) {
                dayType = "past"; // Delivered meals are always past
              } else if (isToday) {
                dayType = "current"; // Today's undelivered meals are current
              } else if (isPast) {
                dayType = "past"; // Past undelivered meals (missed/skipped)
              } else {
                dayType = "future"; // Future scheduled meals
              }

              return {
                date: slot.scheduledDeliveryDate || slotDate.toISOString(),
                dayIndex: index,
                dayName:
                  slot.dayName ||
                  slotDate.toLocaleDateString("en-US", { weekday: "long" }),
                weekNumber: slot.weekNumber || 1,
                dayOfWeek: slot.dayOfWeek || 1,
                dayType: dayType,
                deliveryStatus: slot.deliveryStatus || "scheduled",
                isDelivered: isDelivered,
                // Include the full slot data as mealAssignment
                mealAssignment: {
                  ...slot,
                  delivered: isDelivered,
                },
                meals: [
                  {
                    mealTime: slot.mealTime || "lunch",
                    title: slot.customTitle || slot.title || "Meal",
                    customTitle: slot.customTitle,
                    description: slot.customDescription || "",
                    meals: slot.meals || [],
                    imageUrl: slot.imageUrl,
                    deliveryStatus: slot.deliveryStatus,
                  },
                ],
                order: slot.order || null,
              };
            });

          console.log("✅ Timeline from mealPlanSnapshot:", {
            totalSlots: timelineFromSnapshot.length,
            delivered: timelineFromSnapshot.filter((item) => item.isDelivered)
              .length,
            current: timelineFromSnapshot.filter(
              (item) => item.dayType === "current"
            ).length,
            future: timelineFromSnapshot.filter(
              (item) => item.dayType === "future"
            ).length,
          });

          setTimeline(timelineFromSnapshot);
          return;
        } else {
          console.log(
            "⚠️ No mealPlanSnapshot found, falling back to API timeline"
          );
        }
      }

      // FALLBACK: Use the original API approach
      const result = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        14 // Show 2 weeks
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
        setTimeline([]);
      }
    } finally {
      // Track last update time for smart refresh
      global.lastTimelineUpdate = Date.now();
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

      // ✨ CORRECT: Use delivery status to determine actual dayType
      const isDelivered = day.meals.some(
        (meal) =>
          meal.deliveryStatus === "delivered" ||
          meal.mealAssignment?.deliveryStatus === "delivered"
      );

      let calculatedDayType;
      if (isDelivered) {
        calculatedDayType = "past"; // Any delivered meal makes the day "past"
      } else {
        const today = new Date();
        const dayDate = new Date(day.date);
        const isToday = dayDate.toDateString() === today.toDateString();
        const isPast = dayDate < today && !isToday;
        calculatedDayType = isPast ? "past" : isToday ? "current" : "future";
      }
      return {
        ...day,
        dayType: calculatedDayType, // Use corrected dayType calculation
        isDelivered: isDelivered, // Add delivery status flag
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

      // Generate timeline from start date to show full subscription period
      const planDuration = subscription.duration || 30; // Default to 30 days if not specified
      for (let i = 0; i < planDuration; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today && !isToday;
        const dayType = isPast ? "past" : isToday ? "current" : "future";

        // Calculate week and day numbers properly
        const weekNumber = Math.ceil((i + 1) / 7);
        const dayOfWeek = (i % 7) + 1;

        // Generate meal for each day (assuming one meal per day)
        const mealTime = "lunch"; // Default to lunch, can be customized based on plan

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
                ? "preparing"
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
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Track last update time for smart refresh
    global.lastTimelineUpdate = Date.now();
    await loadTimeline();
    setRefreshing(false);
  };

  const handleViewFullTimeline = () => {
    if (onViewFullTimeline) {
      onViewFullTimeline();
    }
    // Horizontal view mode removed - only vertical mode available
  };

  const scrollToToday = () => {
    if (timelineRef.current && safeTimeline.length > 0) {
      const today = new Date();
      const todayIndex = safeTimeline.findIndex((item) => {
        const itemDate = new Date(item.date);
        return itemDate.toDateString() === today.toDateString();
      });

      if (todayIndex >= 0) {
        const cardHeight = 180; // More accurate card height estimate
        const headerHeight = 120; // Account for header and progress bar
        timelineRef.current.scrollTo({
          y: Math.max(0, todayIndex * cardHeight - headerHeight),
          animated: true,
        });
      } else {
        // If no exact match for today, scroll to first current item
        const currentIndex = safeTimeline.findIndex(
          (item) => item.dayType === "current"
        );
        if (currentIndex >= 0) {
          const cardHeight = 180;
          const headerHeight = 120;
          timelineRef.current.scrollTo({
            y: Math.max(0, currentIndex * cardHeight - headerHeight),
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
    // Use theme colors for consistency
    if (dayType === "past") {
      return [colors.textMuted, colors.border]; // Muted for delivered meals
    } else if (dayType === "current") {
      // Bright colors for current meal
      switch (mealTime) {
        case "breakfast":
          return [colors.primary, "#FF8C42"];
        case "lunch":
          return [colors.primary2, "#44A08D"];
        case "dinner":
          return [colors.accent, "#764ba2"];
        default:
          return [colors.primary, colors.primary2];
      }
    } else {
      // Muted colors for future meals
      switch (mealTime) {
        case "breakfast":
          return ["#FFD6A3", colors.primary];
        case "lunch":
          return ["#A3E4DB", colors.primary2];
        case "dinner":
          return ["#B3BDF5", colors.accent];
        default:
          return [colors.border, colors.textMuted];
      }
    }
  };

  const getMealStatusInfo = (item) => {
    // ✨ CORRECT: Use actual delivery status from the item
    const isDelivered = item.isDelivered || item.deliveryStatus === "delivered";
    const dayType = item.dayType || "future";

    if (isDelivered) {
      return {
        statusText: "Delivered",
        statusIcon: "checkmark-circle",
        statusColor: colors.primary2,
        bgColor: `${colors.primary2}15`, // Add transparency
      };
    }

    switch (dayType) {
      case "current":
        return {
          statusText: "Ready Now",
          statusIcon: "time",
          statusColor: colors.primary,
          bgColor: `${colors.primary}15`,
        };
      case "past":
        return {
          statusText: "Missed",
          statusIcon: "alert-circle",
          statusColor: colors.error || "#FF6B6B",
          bgColor: `${colors.error || "#FF6B6B"}15`,
        };
      default:
        return {
          statusText: "Scheduled",
          statusIcon: "calendar",
          statusColor: colors.accent,
          bgColor: `${colors.accent}15`,
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
      return { completed: 0, total: 0, remaining: 0, current: 0 };

    let completed = 0;
    let current = 0;
    let remaining = 0;

    safeTimeline.forEach((item) => {
      // ✨ CORRECT logic: Use actual delivery status, not just date comparison
      const isDelivered =
        item.isDelivered || item.deliveryStatus === "delivered";
      const dayType = item.dayType;

      if (isDelivered) {
        completed++; // Actually delivered meals
      } else if (dayType === "current") {
        current++; // Today's undelivered meals
      } else {
        remaining++; // Future scheduled meals
      }
    });

    return {
      completed,
      current,
      remaining,
      total: safeTimeline.length,
    };
  };

  // Helper function to get order status using the same 7-step flow as CompactOrderCard
  const getOrderStatus = (item) => {
    const order = item.order || item.mealAssignment?.order || {};
    const orderStatus = order?.orderStatus || order?.status;
    const delegationStatus = order?.delegationStatus;

    // Use the same logic as CompactOrderCard - prioritize delegationStatus first (chef updates), then fallback
    const rawFinalStatus = delegationStatus || orderStatus || "";

    // Enhanced 7-step order flow mapping (same as OrdersScreen and CompactOrderCard)
    const statusMap = {
      // Step 1: Order Placed
      pending: "Order Placed",
      "order placed": "Order Placed",

      // Step 2: Admin assigns chef
      "pending assignment": "Pending Assignment",
      "not assigned": "Pending Assignment",

      // Step 3: Chef accepts order
      assigned: "Order Confirmed",
      accepted: "Order Confirmed",
      confirmed: "Order Confirmed",

      // Step 4: Chef prepares food
      "in progress": "Preparing",
      preparing: "Preparing",
      "preparing food": "Preparing",
      inprogress: "Preparing",

      // Step 5: Quality check and ready
      ready: "Ready",
      "food ready": "Ready",
      "quality check": "Quality Check",
      qualitycheck: "Quality Check",

      // Step 6: Out for delivery
      delivering: "Out for Delivery",
      "out for delivery": "Out for Delivery",
      outfordelivery: "Out for Delivery",

      // Step 7: Delivered
      delivered: "Delivered",
      completed: "Delivered",

      // Cancellation
      cancelled: "Cancelled",
    };

    const normalizedStatus = rawFinalStatus.toLowerCase();
    const mappedStatus =
      statusMap[normalizedStatus] || rawFinalStatus || "Processing";

    // Debug logging to track status mapping
    if (rawFinalStatus) {
      console.log(
        `📊 Timeline status mapping: "${rawFinalStatus}" → "${mappedStatus}"`
      );
    }

    return mappedStatus;
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

  const renderTimelineCard = (item, index) => {
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

    // Vertical card layout
    return (
      <TouchableOpacity
        key={`${item.date}-${item.dayIndex || index}`}
        style={[
          styles.timelineCard,
          { backgroundColor: isDark ? "#1A1A1A" : colors.cardBackground },
        ]}
        onPress={() => onMealPress && onMealPress(currentMeal)}
        activeOpacity={0.9}
      >
        {/* Order Status Badge */}
        {/* <View style={styles.orderStatusContainer}>
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
        </View> */}

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
                  {`${
                    allMeals.length - (currentMealIndex[dayIndex] || 0)
                  } more meal${
                    allMeals.length - (currentMealIndex[dayIndex] || 0) !== 1
                      ? "s"
                      : ""
                  }`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        {safeTimeline.map((item, index) => renderTimelineCard(item, index))}
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
            borderBottomColor: "rgba(255, 255, 255, 0.1)",
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.white }]}>
            Meal Progress
          </Text>
          <Text
            style={[
              styles.progressSummary,
              { color: "rgba(255, 255, 255, 0.7)" },
            ]}
          >
            {progressInfo.completed} delivered • {progressInfo.remaining}{" "}
            remaining
          </Text>
        </View>

        <View
          style={[
            styles.progressBar,
            { backgroundColor: "rgba(255, 255, 255, 0.15)" },
          ]}
        >
          <View
            style={[styles.progressFill, { width: `${completedPercentage}%` }]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <View
              style={[styles.statDot, { backgroundColor: colors.primary2 }]}
            />
            <Text
              style={[styles.statText, { color: "rgba(255, 255, 255, 0.8)" }]}
            >
              {progressInfo.completed} Delivered
            </Text>
          </View>

          {progressInfo.current > 0 && (
            <View style={styles.progressStat}>
              <View
                style={[styles.statDot, { backgroundColor: colors.primary }]}
              />
              <Text
                style={[styles.statText, { color: "rgba(255, 255, 255, 0.8)" }]}
              >
                {progressInfo.current} Ready
              </Text>
            </View>
          )}

          <View style={styles.progressStat}>
            <View
              style={[styles.statDot, { backgroundColor: colors.accent }]}
            />
            <Text
              style={[styles.statText, { color: "rgba(255, 255, 255, 0.8)" }]}
            >
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
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.backgroundGradient}
      >
        {renderProgressBar()}

        {renderVerticalTimeline()}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
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
    backgroundColor: "rgba(0, 0, 0, 0.2)",
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
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 14,
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
    marginRight: 14,
    alignItems: "center",
  },
  rightSection: {
    flex: 1,
  },

  // Date and Time Section
  todayText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
    marginTop: 8,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "400",
    marginBottom: 8,
  },

  // Meal Image Container
  verticalImageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  verticalMealImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },

  // Meal Info Section
  mealInfoSection: {
    alignItems: "flex-start",
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 3,
  },
  mealNameText: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Navigation Arrows
  arrowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 48,
    marginVertical: 6,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 32,
    marginTop: 6,
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

  // New styles for enhanced functionality
  arrowButton: {
    padding: 4,
    borderRadius: 12,
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
