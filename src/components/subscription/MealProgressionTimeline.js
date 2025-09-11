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
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";

const MealProgressionTimeline = ({ subscriptionId, onMealPress }) => {
  const { colors } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [selectedDeliveryCode, setSelectedDeliveryCode] = useState("");
  const [mealDetailModalVisible, setMealDetailModalVisible] = useState(false);
  const [selectedDayMeals, setSelectedDayMeals] = useState([]);

  useEffect(() => {
    loadTimeline();
    loadOrders();
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
        let timelineData = Array.isArray(result.data.data)
          ? result.data.data
          : [];

        console.log("📈 Raw timeline data:", timelineData);

        // Handle new backend response format
        console.log("📈 Backend response data:", timelineData);

        // The backend now returns days grouped by date with meals array
        const processedTimeline = timelineData.map((dayItem, index) => {
          console.log(`🔍 Processing day ${index}:`, {
            date: dayItem.date,
            dayName: dayItem.dayName,
            mealCount: dayItem.mealCount,
            meals: dayItem.meals
          });

          // Convert backend meals format to frontend format
          const convertedMeals = dayItem.meals?.map((meal, mealIndex) => ({
            date: dayItem.date.split("T")[0], // Normalize date
            mealAssignment: {
              _id: `${dayItem.dayName}-${meal.mealTime}-${mealIndex}`,
              customTitle: meal.title,
              title: meal.title,
              description: meal.description,
              imageUrl: meal.imageUrl,
              mealTime: meal.mealTime,
              meals: meal.meals, // Individual meal names
              weekNumber: dayItem.weekNumber,
              dayOfWeek: dayItem.dayOfWeek
            }
          })) || [];

          return {
            date: dayItem.date.split("T")[0], // Normalize date
            dayName: dayItem.dayName,
            weekNumber: dayItem.weekNumber,
            dayOfWeek: dayItem.dayOfWeek,
            meals: convertedMeals,
            dayIndex: index,
            mealCount: dayItem.mealCount
          };
        });

        console.log("📈 Setting processed timeline data:", processedTimeline);
        setTimeline(processedTimeline);
      } else {
        console.log("⚠️ No timeline data available, creating fallback data");
        // Create fallback data when API fails
        const fallbackData = [
          {
            date: new Date().toISOString().split("T")[0],
            meals: [
              {
                date: new Date().toISOString().split("T")[0],
                mealAssignment: {
                  imageUrl:
                    "https://via.placeholder.com/60x40/F7AE1A/FFFFFF?text=Today",
                  title: "Today's Special",
                  customTitle: "Mixed Meal",
                  mealTime: "lunch",
                  calories: 420,
                  description: "Delicious daily special",
                },
              },
            ],
            dayIndex: 0,
          },
        ];
        setTimeline(fallbackData);
      }
    } catch (error) {
      console.error("❌ Error loading meal timeline:", error);
      // Create fallback data when there's an error
      const fallbackData = [
        {
          date: new Date().toISOString().split("T")[0],
          meals: [
            {
              date: new Date().toISOString().split("T")[0],
              mealAssignment: {
                imageUrl:
                  "https://via.placeholder.com/60x40/FF3B30/FFFFFF?text=Error",
                title: "Sample Meal",
                customTitle: "Demo Meal",
                mealTime: "lunch",
                calories: 350,
                description: "Sample meal data",
              },
            },
          ],
          dayIndex: 0,
        },
      ];
      setTimeline(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const result = await apiService.getUserOrders();
      if (result.success && result.data) {
        const ordersData = Array.isArray(result.data.data)
          ? result.data.data
          : Array.isArray(result.data)
          ? result.data
          : [];
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("❌ Error loading orders:", error);
      setOrders([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTimeline(), loadOrders()]);
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

  // Get dynamic order status for timeline item
  const getOrderStatus = (timelineItem) => {
    // Find matching order for this timeline item
    const matchingOrder = orders.find((order) => {
      const orderDate = new Date(order.createdAt || order.deliveryDate);
      const timelineDate = new Date(timelineItem.date);

      // Check if dates match (within same day)
      return (
        orderDate.toDateString() === timelineDate.toDateString() &&
        order.subscription?._id === subscriptionId
      );
    });

    if (!matchingOrder) {
      // No order exists yet - determine if it should be created
      const itemDate = new Date(timelineItem.date);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (itemDate.toDateString() === today.toDateString()) {
        return {
          status: "ready_to_order",
          title: "Ready to Order",
          color: "#34C759",
          icon: "checkmark-circle",
          description: "Tap to place your order",
        };
      } else if (itemDate > tomorrow) {
        return {
          status: "scheduled",
          title: "Scheduled",
          color: "#8E8E93",
          icon: "calendar-outline",
          description: "Meal scheduled",
        };
      } else {
        return {
          status: "pending",
          title: "Pending",
          color: "#FF9500",
          icon: "time-outline",
          description: "Order pending",
        };
      }
    }

    // Order exists - return actual order status
    const orderStatus = (
      matchingOrder.status ||
      matchingOrder.orderStatus ||
      ""
    ).toLowerCase();

    switch (orderStatus) {
      case "delivered":
        return {
          status: "delivered",
          title: "Delivered",
          color: "#34C759",
          icon: "checkmark-circle",
          description: "Meal delivered successfully",
          order: matchingOrder,
        };
      case "out for delivery":
        return {
          status: "out_for_delivery",
          title: "Out for Delivery",
          color: "#007AFF",
          icon: "car",
          description: "Driver is on the way",
          order: matchingOrder,
          showCode: true,
        };
      case "preparing":
      case "confirmed":
        return {
          status: "preparing",
          title: "Preparing",
          color: "#FF9500",
          icon: "restaurant",
          description: "Meal being prepared",
          order: matchingOrder,
        };
      case "cancelled":
        return {
          status: "cancelled",
          title: "Cancelled",
          color: "#FF3B30",
          icon: "close-circle",
          description: "Order was cancelled",
          order: matchingOrder,
        };
      default:
        return {
          status: "confirmed",
          title: "Confirmed",
          color: "#34C759",
          icon: "checkmark",
          description: "Order confirmed",
          order: matchingOrder,
        };
    }
  };

  const showDeliveryCode = (order) => {
    const code =
      order?.confirmationCode ||
      order?.deliveryCode ||
      order?.pickupCode ||
      "CODE123";
    setSelectedDeliveryCode(code);
    setConfirmationModalVisible(true);
  };

  const showAllMealsForDay = (dayMeals) => {
    setSelectedDayMeals(dayMeals);
    setMealDetailModalVisible(true);
  };

  const getProgressPercentage = (status) => {
    switch (status) {
      case "scheduled":
        return 0;
      case "ready_to_order":
        return 10;
      case "confirmed":
        return 25;
      case "preparing":
        return 50;
      case "out_for_delivery":
        return 80;
      case "delivered":
        return 100;
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading meal timeline...
        </Text>
      </View>
    );
  }

  // Ensure timeline is always an array to prevent map() errors
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  if (safeTimeline.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <Ionicons
          name="calendar-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Meals Scheduled
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Your meal timeline will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Meal Timeline
      </Text>

      {safeTimeline.map((dayItem, index) => {
        const { date, meals = [] } = dayItem;
        const isToday = formatDate(date) === "Today";

        console.log(`🍽️ Rendering day ${index}:`, {
          date,
          mealsCount: meals.length,
          meals,
        });

        // For display, show the first meal's status or aggregate status
        const primaryMeal = meals[0];
        const orderStatus = primaryMeal
          ? getOrderStatus(primaryMeal)
          : {
              status: "scheduled",
              title: "Scheduled",
              color: colors.textSecondary,
              icon: "calendar-outline",
              description: "Meals scheduled",
            };

        const progress = getProgressPercentage(orderStatus.status);

        return (
          <TouchableOpacity
            key={`${date}-${index}`}
            style={[
              styles.timelineItem,
              isToday && styles.todayItem,
              index === safeTimeline.length - 1 && styles.lastItem,
            ]}
            onPress={() => {
              if (orderStatus.status === "ready_to_order") {
                console.log("Ready to place order for:", primaryMeal);
              } else if (onMealPress && primaryMeal) {
                // If multiple meals, show modal; if single meal, call onMealPress directly
                if (meals.length > 1) {
                  showAllMealsForDay(meals);
                } else {
                  onMealPress(primaryMeal.mealAssignment);
                }
              }
            }}
            activeOpacity={0.7}
          >
            {/* Timeline connector */}
            {index < safeTimeline.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      orderStatus.status === "delivered"
                        ? orderStatus.color
                        : colors.border,
                  },
                ]}
              />
            )}

            {/* Enhanced Timeline dot with progress */}
            <View style={styles.timelineDotContainer}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    borderColor: orderStatus.color,
                    backgroundColor: colors.cardBackground,
                  },
                  orderStatus.status === "delivered" && {
                    backgroundColor: orderStatus.color,
                  },
                ]}
              >
                <Ionicons
                  name={orderStatus.icon}
                  size={16}
                  color={
                    orderStatus.status === "delivered"
                      ? "#FFFFFF"
                      : orderStatus.color
                  }
                />
              </View>

              {/* Progress ring for active orders */}
              {progress > 0 && progress < 100 && (
                <View style={styles.progressRing}>
                  <View
                    style={[
                      styles.progressArc,
                      {
                        backgroundColor: orderStatus.color,
                        transform: [{ rotate: `${(progress / 100) * 360}deg` }],
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* Enhanced Content */}
            <View
              style={[
                styles.content,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
                isToday && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                  backgroundColor: colors.primary + "15",
                },
                orderStatus.status === "delivered" && {
                  backgroundColor: "#34C759" + "15",
                  borderColor: "#34C759",
                },
              ]}
            >
              {/* Date header with status */}
              <View style={styles.dateHeader}>
                <Text
                  style={[
                    styles.dateText,
                    { color: colors.text },
                    isToday && {
                      color: colors.primary,
                      fontSize: 17,
                      fontWeight: "700",
                    },
                    orderStatus.status === "delivered" && { color: "#34C759" },
                  ]}
                >
                  {formatDate(date)}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: orderStatus.color + "20" },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: orderStatus.color },
                    ]}
                  />
                  <Text
                    style={[styles.statusText, { color: orderStatus.color }]}
                  >
                    {orderStatus.title}
                  </Text>
                </View>
              </View>

              {/* Meals preview */}
              <View style={styles.mealInfo}>
                {meals.length > 0 ? (
                  // Sort meals by meal time order (breakfast, lunch, dinner)
                  meals
                    .sort((a, b) => {
                      const order = { breakfast: 1, lunch: 2, dinner: 3 };
                      const aOrder =
                        order[a.mealAssignment?.mealTime?.toLowerCase()] || 999;
                      const bOrder =
                        order[b.mealAssignment?.mealTime?.toLowerCase()] || 999;
                      return aOrder - bOrder;
                    })
                    // Show ALL meals for the day (no slice limit)
                    .map((meal, mealIndex) => (
                      <View
                        key={mealIndex}
                        style={[
                          styles.mealHeader,
                          mealIndex > 0 && { marginTop: 8 },
                        ]}
                      >
                        <Image
                          source={{
                            uri:
                              meal.mealAssignment?.imageUrl ||
                              `https://via.placeholder.com/60x40/F7AE1A/FFFFFF?text=${
                                meal.mealAssignment?.mealTime
                                  ?.charAt(0)
                                  .toUpperCase() || "M"
                              }`,
                          }}
                          style={styles.mealImage}
                          defaultSource={require("../../assets/images/daily-meals.jpg")}
                        />
                        <View style={styles.mealDetails}>
                          <Text
                            style={[styles.mealTitle, { color: colors.text }]}
                          >
                            {meal.mealAssignment?.customTitle ||
                              meal.mealAssignment?.title ||
                              meal.mealAssignment?.mealTime
                                ?.charAt(0)
                                .toUpperCase() +
                                meal.mealAssignment?.mealTime?.slice(1) ||
                              `Meal ${mealIndex + 1}`}
                          </Text>
                          <Text
                            style={[
                              styles.mealSubtitle,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {meal.mealAssignment?.mealTime
                              ?.charAt(0)
                              .toUpperCase() +
                              meal.mealAssignment?.mealTime?.slice(1) ||
                              "Meal"}{" "}
                            •{" "}
                            {mealIndex === 0
                              ? orderStatus.description
                              : "Scheduled"}
                          </Text>
                          <Text
                            style={[
                              styles.mealCount,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {meal.mealAssignment?.calories || "---"} cal
                          </Text>
                        </View>

                        {/* Meal type icon */}
                        <View
                          style={[
                            styles.mealTypeIcon,
                            { backgroundColor: colors.primary + "20" },
                          ]}
                        >
                          <Ionicons
                            name={getMealTypeIcon(
                              meal.mealAssignment?.mealTime
                            )}
                            size={16}
                            color={colors.primary}
                          />
                        </View>

                        {/* Action button for specific statuses */}
                        {mealIndex === 0 && orderStatus.showCode && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: colors.primary },
                            ]}
                            onPress={() => showDeliveryCode(orderStatus.order)}
                          >
                            <Ionicons name="key" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                ) : (
                  // Fallback when no meals data
                  <View style={styles.mealHeader}>
                    <Image
                      source={{
                        uri: "https://via.placeholder.com/60x40/F7AE1A/FFFFFF?text=Meal",
                      }}
                      style={styles.mealImage}
                      defaultSource={require("../../assets/images/daily-meals.jpg")}
                    />
                    <View style={styles.mealDetails}>
                      <Text style={[styles.mealTitle, { color: colors.text }]}>
                        Scheduled Meal
                      </Text>
                      <Text
                        style={[
                          styles.mealSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {orderStatus.description}
                      </Text>
                      <Text
                        style={[
                          styles.mealCount,
                          { color: colors.textSecondary },
                        ]}
                      >
                        --- cal
                      </Text>
                    </View>
                  </View>
                )}

                {/* Show total meals count if more than 1 */}
                {meals.length > 1 && (
                  <View style={styles.moreMealsIndicator}>
                    <Text
                      style={[styles.moreMealsText, { color: colors.primary }]}
                    >
                      Total: {meals.length} meal{meals.length !== 1 ? "s" : ""} for this day
                    </Text>
                  </View>
                )}
              </View>

              {/* Order details for active orders */}
              {orderStatus.order && (
                <View
                  style={[
                    styles.orderDetails,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.orderNumber,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Order #{orderStatus.order.orderNumber || "CHM001"}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Confirmation Code Modal */}
      <Modal
        visible={confirmationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.modalBackground },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Delivery Code
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.codeDisplay}>
                <Text
                  style={[styles.codeLabel, { color: colors.textSecondary }]}
                >
                  Show this code to your driver:
                </Text>
                <View
                  style={[
                    styles.codeContainer,
                    {
                      backgroundColor: colors.primary + "15",
                      borderColor: colors.primary + "30",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confirmationCodeText,
                      { color: colors.primary },
                    ]}
                  >
                    {selectedDeliveryCode}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalOkButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={styles.modalOkButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* All Meals for Day Modal */}
      <Modal
        visible={mealDetailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMealDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.fullModalContainer,
              { backgroundColor: colors.modalBackground },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                All Meals ({selectedDayMeals.length} items)
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setMealDetailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedDayMeals}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              keyExtractor={(item, index) => `meal-${index}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.mealDetailCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setMealDetailModalVisible(false);
                    if (onMealPress) {
                      onMealPress(item.mealAssignment);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{
                      uri:
                        item.mealAssignment?.imageUrl ||
                        "https://via.placeholder.com/100x80",
                    }}
                    style={styles.mealDetailImage}
                    defaultSource={require("../../assets/images/daily-meals.jpg")}
                  />

                  <View style={styles.mealDetailInfo}>
                    <Text
                      style={[styles.mealDetailTitle, { color: colors.text }]}
                    >
                      {item.mealAssignment?.customTitle ||
                        item.mealAssignment?.title ||
                        `${
                          item.mealAssignment?.mealTime
                            ?.charAt(0)
                            .toUpperCase() +
                            item.mealAssignment?.mealTime?.slice(1) || "Meal"
                        } ${index + 1}`}
                    </Text>

                    <Text
                      style={[
                        styles.mealDetailDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.mealAssignment?.description ||
                        "Delicious and nutritious meal"}
                    </Text>

                    <View style={styles.mealDetailMeta}>
                      <View style={styles.mealMetaItem}>
                        <Ionicons
                          name="flame"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.mealMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.mealAssignment?.calories || "---"} cal
                        </Text>
                      </View>

                      <View style={styles.mealMetaItem}>
                        <Ionicons
                          name="time"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.mealMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.mealAssignment?.prepTime || "15"} mins
                        </Text>
                      </View>

                      <View style={styles.mealMetaItem}>
                        <Ionicons
                          name="restaurant"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.mealMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.mealAssignment?.mealTime || "Meal"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  sectionTitle: {
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
  todayItem: {
    // Enhanced styling for today's item
  },
  lastItem: {
    marginBottom: 12,
  },
  connector: {
    position: "absolute",
    left: 19,
    top: 50,
    width: 2,
    height: 40,
  },
  timelineDotContainer: {
    position: "relative",
    marginRight: 12,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  progressRing: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  progressArc: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    transformOrigin: "right center",
  },
  content: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
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
    borderRadius: 8,
    marginRight: 12,
  },
  mealDetails: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  mealSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  mealCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  mealTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginRight: 4,
  },
  moreMealsIndicator: {
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  moreMealsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: "500",
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fullModalContainer: {
    borderRadius: 16,
    width: "100%",
    height: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  codeDisplay: {
    alignItems: "center",
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  codeContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  confirmationCodeText: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  modalOkButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalOkButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Meal detail modal styles
  mealDetailCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mealDetailImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  mealDetailInfo: {
    flex: 1,
  },
  mealDetailTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  mealDetailDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  mealDetailMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  mealMetaText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "500",
  },
});

export default MealProgressionTimeline;
