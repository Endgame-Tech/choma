import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../utils/colors";
import apiService from "../../services/api";

const { width } = Dimensions.get("window");

const MealProgressionTimeline = ({ subscriptionId, onMealPress }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        setTimeline(groupedByDay);
      } else {
        console.log(
          "⚠️ No timeline data available:",
          result.message || "Unknown error"
        );
        setTimeline([]);
      }
    } catch (error) {
      console.error("❌ Error loading meal timeline:", error);
      // If API fails, try to load mock data for development
      if (__DEV__) {
        console.log("🔧 Loading mock timeline data for development");
        const mockData = getMockTimelineData();
        const groupedMock = groupMealsByDay(mockData);
        setTimeline(groupedMock);
      } else {
        setTimeline([]);
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
    switch (mealTime) {
      case "breakfast":
        return "sunny";
      case "lunch":
        return "partly-sunny";
      case "dinner":
        return "moon";
      default:
        return "restaurant";
    }
  };

  const getMealProgress = (index, totalItems) => {
    return ((index + 1) / totalItems) * 100;
  };

  // Ensure timeline is always an array to prevent map() errors
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

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

  const renderProgressBar = () => {
    if (safeTimeline.length === 0) return null;

    const progressInfo = getProgressInfo();
    const completedPercentage =
      progressInfo.total > 0
        ? (progressInfo.completed / progressInfo.total) * 100
        : 0;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Meal Progress</Text>
          <Text style={styles.progressSummary}>
            {progressInfo.completed} delivered • {progressInfo.remaining}{" "}
            remaining
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${completedPercentage}%` }]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#27AE60" }]} />
            <Text style={styles.statText}>
              {progressInfo.completed} Delivered
            </Text>
          </View>

          {progressInfo.current > 0 && (
            <View style={styles.progressStat}>
              <View style={[styles.statDot, { backgroundColor: "#F39C12" }]} />
              <Text style={styles.statText}>{progressInfo.current} Ready</Text>
            </View>
          )}

          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#3498DB" }]} />
            <Text style={styles.statText}>
              {progressInfo.remaining} Upcoming
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading meal timeline...</Text>
      </View>
    );
  }

  if (safeTimeline.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={["#f8f9fa", "#e9ecef"]}
          style={styles.emptyGradient}
        >
          <Ionicons
            name="calendar-outline"
            size={64}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Meals Scheduled</Text>
          <Text style={styles.emptySubtitle}>
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
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Meal Timeline</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={16} color={COLORS.primary} />
          <Text style={styles.filterText}>7 Days</Text>
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {safeTimeline.map((item, index) => {
          const dateInfo = formatDate(item.date);
          const dayType = item.dayType || "future";
          const mealAssignment = item.mealAssignment || item.meals?.[0] || {};
          const mealTime =
            mealAssignment.mealTime || item.meals?.[0]?.mealTime || "lunch";
          const mealColors = getMealTypeColor(mealTime, dayType);
          const statusInfo = getMealStatusInfo(item);
          const isCurrentDay = dayType === "current";
          const isPastDay = dayType === "past";

          return (
            <TouchableOpacity
              key={`${item.date}-${item.dayIndex || index}`}
              style={[
                styles.timelineCard,
                isCurrentDay && styles.todayCard,
                isPastDay && styles.pastCard,
              ]}
              onPress={() => onMealPress && onMealPress(mealAssignment)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isCurrentDay
                    ? mealColors
                    : isPastDay
                    ? ["#f8f9fa", "#e9ecef"]
                    : ["#ffffff", "#ffffff"]
                }
                style={[
                  styles.cardGradient,
                  isCurrentDay && styles.todayGradient,
                  isPastDay && styles.pastGradient,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Timeline connector */}
                {index < safeTimeline.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      isCurrentDay && styles.activeConnector,
                    ]}
                  />
                )}

                {/* Left side - Date and icon */}
                <View style={styles.leftSection}>
                  <View
                    style={[
                      styles.iconContainer,
                      isCurrentDay && styles.todayIcon,
                      isPastDay && styles.pastIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        isPastDay
                          ? "checkmark-circle"
                          : getMealTypeIcon(mealTime)
                      }
                      size={24}
                      color={
                        isCurrentDay
                          ? "#FFFFFF"
                          : isPastDay
                          ? "#27AE60"
                          : mealColors[0]
                      }
                    />
                  </View>

                  <View style={styles.dateSection}>
                    <Text
                      style={[
                        styles.primaryDate,
                        isCurrentDay && styles.todayText,
                        isPastDay && styles.pastText,
                      ]}
                    >
                      {dateInfo.primary}
                    </Text>
                    <Text
                      style={[
                        styles.secondaryDate,
                        isCurrentDay && styles.todaySubText,
                        isPastDay && styles.pastSubText,
                      ]}
                    >
                      {dateInfo.secondary}
                    </Text>
                  </View>
                </View>

                {/* Right side - Meal details */}
                <View style={styles.rightSection}>
                  <View style={styles.mealImageContainer}>
                    <Image
                      source={{
                        uri:
                          mealAssignment.imageUrl ||
                          item.imageUrl ||
                          item.meals?.[0]?.imageUrl ||
                          "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
                      }}
                      style={[
                        styles.mealImage,
                        isPastDay && styles.pastMealImage,
                      ]}
                      defaultSource={require("../../assets/images/daily-meals.jpg")}
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.mealCount}>
                        {mealAssignment.meals?.length ||
                          item.meals?.length ||
                          item.mealCount ||
                          3}
                      </Text>
                    </View>

                    {/* Delivery status overlay */}
                    {isPastDay && (
                      <View style={styles.deliveredBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.mealDetailsSection}>
                    <Text
                      style={[
                        styles.mealTitle,
                        isCurrentDay && styles.todayText,
                        isPastDay && styles.pastText,
                      ]}
                    >
                      {mealAssignment.customTitle ||
                        mealAssignment.title ||
                        item.dayTitle ||
                        `${
                          mealTime?.charAt(0).toUpperCase() + mealTime?.slice(1)
                        } Meal`}
                    </Text>

                    <Text
                      style={[
                        styles.mealDescription,
                        isCurrentDay && styles.todaySubText,
                        isPastDay && styles.pastSubText,
                      ]}
                    >
                      {mealAssignment.customDescription ||
                        mealAssignment.description ||
                        item.meals?.[0]?.description ||
                        `Week ${item.weekNumber || 1} • Day ${
                          item.dayOfWeek || 1
                        }`}
                    </Text>

                    {/* Status badges */}
                    <View style={styles.badgeContainer}>
                      {/* Delivery status badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusInfo.bgColor },
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.statusIcon}
                          size={12}
                          color={statusInfo.statusColor}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: statusInfo.statusColor },
                          ]}
                        >
                          {statusInfo.statusText}
                        </Text>
                      </View>

                      {/* Meal count badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isCurrentDay
                              ? "rgba(255,255,255,0.2)"
                              : isPastDay
                              ? "rgba(39, 174, 96, 0.1)"
                              : "#f0f0f0",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: isCurrentDay
                                ? "#FFFFFF"
                                : isPastDay
                                ? "#27AE60"
                                : COLORS.textSecondary,
                            },
                          ]}
                        >
                          {mealAssignment.meals?.length ||
                            item.meals?.length ||
                            item.mealCount ||
                            3}{" "}
                          items
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action arrow */}
                <View style={styles.actionSection}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      isCurrentDay
                        ? "#FFFFFF"
                        : isPastDay
                        ? "#27AE60"
                        : COLORS.textSecondary
                    }
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        {/* View more section */}
        <TouchableOpacity style={styles.viewMoreSection}>
          <LinearGradient
            colors={["#f8f9fa", "#e9ecef"]}
            style={styles.viewMoreGradient}
          >
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <Text style={styles.viewMoreTitle}>View Full Timeline</Text>
            <Text style={styles.viewMoreSubtitle}>
              See all upcoming meals and plan ahead
            </Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
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
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
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
    color: COLORS.textPrimary,
  },
  progressSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e9ecef",
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
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
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
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
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
  timelineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  todayCard: {
    elevation: 6,
    shadowOpacity: 0.2,
  },
  pastCard: {
    opacity: 0.8,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 100,
  },
  todayGradient: {
    // Gradient colors handled by LinearGradient component
  },
  pastGradient: {
    // Gradient colors handled by LinearGradient component
  },
  connector: {
    position: "absolute",
    left: 45,
    top: 100,
    width: 3,
    height: 32,
    backgroundColor: "#e9ecef",
    zIndex: 1,
  },
  activeConnector: {
    backgroundColor: COLORS.primary,
  },
  leftSection: {
    alignItems: "center",
    marginRight: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  todayIcon: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dateSection: {
    alignItems: "center",
  },
  primaryDate: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  secondaryDate: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  todayText: {
    color: "#ffffff",
  },
  todaySubText: {
    color: "rgba(255,255,255,0.8)",
  },
  pastIcon: {
    backgroundColor: "rgba(39, 174, 96, 0.1)",
  },
  pastText: {
    color: "#27AE60",
  },
  pastSubText: {
    color: "rgba(39, 174, 96, 0.8)",
  },
  pastMealImage: {
    opacity: 0.8,
  },
  deliveredBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#27AE60",
    borderRadius: 8,
    padding: 2,
  },
  rightSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mealImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  mealImage: {
    width: 80,
    height: 60,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealCount: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  mealDetailsSection: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  actionSection: {
    marginLeft: 12,
  },
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
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  viewMoreSubtitle: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
});

export default MealProgressionTimeline;
