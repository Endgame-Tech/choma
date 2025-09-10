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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import apiService from "../../services/api";

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
      const result = await apiService.getSubscriptionMealTimeline(
        subscriptionId,
        7
      );

      console.log("📊 Timeline API result:", result);

      if (result.success && result.data) {
        // Ensure result.data is an array
        const timelineData = Array.isArray(result.data) ? result.data : [];
        console.log("📈 Setting timeline data:", timelineData.length, "items");
        setTimeline(timelineData);
      } else {
        console.log("⚠️ No timeline data available, setting empty array");
        setTimeline([]);
      }
    } catch (error) {
      console.error("❌ Error loading meal timeline:", error);
      // Set empty array on error to prevent map() errors
      setTimeline([]);
    } finally {
      setLoading(false);
    }
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

    if (dateObj.toDateString() === today.toDateString()) {
      return "Today";
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getMealTypeIcon = (mealTime) => {
    switch (mealTime) {
      case "breakfast":
        return "sunny-outline";
      case "lunch":
        return "partly-sunny-outline";
      case "dinner":
        return "moon-outline";
      default:
        return "restaurant-outline";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading meal timeline...</Text>
      </View>
    );
  }

  // Ensure timeline is always an array to prevent map() errors
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  if (safeTimeline.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="calendar-outline"
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.emptyTitle}>No Meals Scheduled</Text>
        <Text style={styles.emptySubtitle}>
          Your meal timeline will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>Upcoming Meals</Text>

      {safeTimeline.map((item, index) => (
        <TouchableOpacity
          key={`${item.date}-${item.dayIndex}`}
          style={[
            styles.timelineItem,
            index === 0 && styles.currentMeal,
            index === safeTimeline.length - 1 && styles.lastItem,
          ]}
          onPress={() => onMealPress && onMealPress(item.mealAssignment)}
          activeOpacity={0.7}
        >
          {/* Timeline connector */}
          {index < safeTimeline.length - 1 && <View style={styles.connector} />}

          {/* Timeline dot */}
          <View style={[styles.timelineDot, index === 0 && styles.currentDot]}>
            <Ionicons
              name={getMealTypeIcon(item.mealAssignment?.mealTime)}
              size={16}
              color={index === 0 ? "#FFFFFF" : COLORS.primary}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Date header */}
            <View style={styles.dateHeader}>
              <Text
                style={[styles.dateText, index === 0 && styles.currentDateText]}
              >
                {formatDate(item.date)}
              </Text>
              {index === 0 && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </View>

            {/* Meal info */}
            <View style={styles.mealInfo}>
              <View style={styles.mealHeader}>
                <Image
                  source={{
                    uri:
                      item.mealAssignment?.imageUrl ||
                      "https://via.placeholder.com/60x40",
                  }}
                  style={styles.mealImage}
                  defaultSource={require("../../assets/images/daily-meals.jpg")}
                />
                <View style={styles.mealDetails}>
                  <Text style={styles.mealTitle}>
                    {item.mealAssignment?.customTitle ||
                      item.mealAssignment?.mealTime?.charAt(0).toUpperCase() +
                        item.mealAssignment?.mealTime?.slice(1)}
                  </Text>
                  <Text style={styles.mealSubtitle}>
                    {item.mealAssignment?.customDescription ||
                      `Week ${item.mealAssignment?.weekNumber}, Day ${item.mealAssignment?.dayOfWeek}`}
                  </Text>
                  <Text style={styles.mealCount}>
                    {item.mealAssignment?.meals?.length || 0} item
                    {(item.mealAssignment?.meals?.length || 0) !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* Status indicator for current meal */}
            {index === 0 && (
              <View style={styles.statusSection}>
                <View style={styles.statusIndicator}>
                  <View
                    style={[styles.statusDot, { backgroundColor: "#34C759" }]}
                  />
                  <Text style={styles.statusText}>Ready to order</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* View more button */}
      <TouchableOpacity style={styles.viewMoreButton}>
        <Text style={styles.viewMoreText}>View Full Timeline</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
    position: "relative",
  },
  currentMeal: {
    // Current meal styling handled by dot and text colors
  },
  lastItem: {
    marginBottom: 12,
  },
  connector: {
    position: "absolute",
    left: 19,
    top: 40,
    width: 2,
    height: 40,
    backgroundColor: COLORS.border,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  currentDot: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  currentDateText: {
    color: COLORS.primary,
  },
  currentBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  mealInfo: {
    marginBottom: 8,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealImage: {
    width: 60,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  mealDetails: {
    flex: 1,
  },
  mealTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  mealSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  mealCount: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  statusSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  viewMoreText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
});

export default MealProgressionTimeline;
