import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const SubscriptionManagementModal = ({
  visible,
  onClose,
  subscription,
  onSubscriptionUpdate,
  initialTab = "overview",
}) => {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [pauseReason, setPauseReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState("1_week");
  const [skipDate, setSkipDate] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Schedule management states
  const [mealTimeline, setMealTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Delivery preferences states
  const [deliveryTime, setDeliveryTime] = useState(
    subscription?.deliveryPreferences?.timeSlot || "morning"
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    subscription?.deliveryPreferences?.instructions || ""
  );
  const [contactlessDelivery, setContactlessDelivery] = useState(
    subscription?.deliveryPreferences?.contactless || false
  );

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab || "overview");
    }
  }, [visible, initialTab]);

  // Fetch meal timeline when schedule tab is activated
  useEffect(() => {
    if (activeTab === "schedule" && subscription?._id) {
      fetchMealTimeline();
    }
  }, [activeTab, subscription?._id]);

  // Early return after hooks - check if subscription data is missing
  if (!subscription) {
    return null;
  }

  const menuOptions = [
    {
      id: "overview",
      title: "Overview",
      icon: "information-circle-outline",
    },
    {
      id: "schedule",
      title: "Schedule",
      icon: "calendar-outline",
    },
    {
      id: "pause",
      title: "Pause",
      icon: "pause-outline",
    },
    {
      id: "skip",
      title: "Skip Meal",
      icon: "play-forward-outline",
    },
    {
      id: "modify",
      title: "Modify",
      icon: "create-outline",
    },
    {
      id: "chef",
      title: "Chef",
      icon: "person-outline",
    },
  ];

  const handlePauseSubscription = async () => {
    if (!pauseReason.trim()) {
      Alert.alert(
        "Error",
        "Please provide a reason for pausing your subscription."
      );
      return;
    }

    if (!subscription?._id) {
      Alert.alert("Error", "Unable to pause subscription. Please try again.");
      return;
    }

    try {
      setLoading(true);

      // Use the proper pause subscription API method
      const result = await apiService.updateSubscription(subscription._id, {
        status: "paused",
        pauseReason: pauseReason.trim(),
        pauseDuration,
        pausedAt: new Date().toISOString(),
      });

      if (result.success) {
        Alert.alert(
          "Subscription Paused",
          `Your subscription has been paused successfully${
            pauseDuration !== "indefinite"
              ? ` for ${pauseDuration.replace("_", " ")}`
              : ""
          }.`,
          [
            {
              text: "OK",
              onPress: () => {
                onSubscriptionUpdate?.(result.data);
                setPauseReason("");
                setPauseDuration("1_week");
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          result.message || result.error || "Failed to pause subscription"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while pausing your subscription");
      console.error("❌ Error pausing subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMeal = async () => {
    if (!skipDate || !skipReason.trim()) {
      Alert.alert(
        "Error",
        "Please select a date and provide a reason for skipping."
      );
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(skipDate)) {
      Alert.alert(
        "Invalid Date",
        "Please enter the date in YYYY-MM-DD format (e.g., 2024-12-25)."
      );
      return;
    }

    // Check if date is in the future
    const skipDateObj = new Date(skipDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (skipDateObj < today) {
      Alert.alert("Invalid Date", "You can only skip future meal deliveries.");
      return;
    }

    if (!subscription?._id) {
      Alert.alert("Error", "Unable to skip meal. Please try again.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.skipMealDelivery(
        subscription._id,
        skipDate,
        skipReason.trim()
      );

      if (result.success) {
        Alert.alert(
          "Meal Skipped",
          `Your meal delivery for ${new Date(skipDate).toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              month: "long",
              day: "numeric",
            }
          )} has been skipped successfully.`,
          [
            {
              text: "OK",
              onPress: () => {
                setSkipDate("");
                setSkipReason("");
                onSubscriptionUpdate?.(result.data);
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          result.message || result.error || "Failed to skip meal"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while skipping the meal");
      console.error("❌ Error skipping meal:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch meal timeline for schedule tab
  const fetchMealTimeline = async () => {
    if (!subscription?._id) return;

    try {
      setLoadingTimeline(true);
      const result = await apiService.getSubscriptionMealTimeline(
        subscription._id,
        14
      ); // Next 14 days

      if (result.success) {
        setMealTimeline(result.data || []);
      } else {
        console.error("Failed to fetch meal timeline:", result.message);
      }
    } catch (error) {
      console.error("❌ Error fetching meal timeline:", error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Update delivery preferences
  const handleUpdateDeliveryPreferences = async () => {
    if (!subscription?._id) {
      Alert.alert("Error", "Unable to update preferences. Please try again.");
      return;
    }

    try {
      setLoading(true);
      const preferences = {
        timeSlot: deliveryTime,
        instructions: deliveryInstructions.trim(),
        contactless: contactlessDelivery,
        updatedAt: new Date().toISOString(),
      };

      const result = await apiService.updateDeliveryPreferences(
        subscription._id,
        preferences
      );

      if (result.success) {
        Alert.alert(
          "Preferences Updated",
          "Your delivery preferences have been updated successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                onSubscriptionUpdate?.(result.data);
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          result.message || result.error || "Failed to update preferences"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating your preferences");
      console.error("❌ Error updating delivery preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChefReassignment = async () => {
    if (!reassignReason.trim()) {
      Alert.alert(
        "Error",
        "Please provide a reason for requesting chef reassignment."
      );
      return;
    }

    if (!subscription?._id) {
      Alert.alert(
        "Error",
        "Unable to request chef reassignment. Please try again."
      );
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.requestChefReassignment(
        subscription._id,
        reassignReason.trim()
      );

      if (result.success) {
        Alert.alert(
          "Request Submitted",
          "Your chef reassignment request has been submitted successfully. Our team will review it within 24-48 hours and get back to you with available options.",
          [
            {
              text: "OK",
              onPress: () => {
                setReassignReason("");
                onSubscriptionUpdate?.(result.data);
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          result.message || result.error || "Failed to submit request"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while submitting your request");
      console.error("❌ Error requesting chef reassignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="analytics-outline"
                size={24}
                color={colors.white}
              />
              <Text style={styles(colors).tabTitle}>Subscription Overview</Text>
            </View>

            <View style={styles(colors).overviewCard}>
              <LinearGradient
                colors={[colors.primary + "10", colors.primary + "05"]}
                style={styles(colors).gradientCard}
              >
                <View style={styles(colors).infoRow}>
                  <View style={styles(colors).infoIconContainer}>
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View style={styles(colors).infoContent}>
                    <Text style={styles(colors).infoLabel}>Plan</Text>
                    <Text style={styles(colors).infoValue}>
                      {subscription?.mealPlanId?.planName || "Unknown Plan"}
                    </Text>
                  </View>
                </View>

                <View style={styles(colors).infoRow}>
                  <View style={styles(colors).infoIconContainer}>
                    <Ionicons
                      name={
                        subscription?.status === "active"
                          ? "checkmark-circle"
                          : "pause-circle"
                      }
                      size={20}
                      color={
                        subscription?.status === "active"
                          ? colors.primary
                          : "#FF9500"
                      }
                    />
                  </View>
                  <View style={styles(colors).infoContent}>
                    <Text style={styles(colors).infoLabel}>Status</Text>
                    <Text
                      style={[
                        styles(colors).infoValue,
                        styles(colors).statusText,
                        {
                          color:
                            subscription?.status === "active"
                              ? colors.primary
                              : "#FF9500",
                        },
                      ]}
                    >
                      {subscription?.status?.charAt(0)?.toUpperCase() +
                        (subscription?.status?.slice(1) || "")}
                    </Text>
                  </View>
                </View>

                <View style={styles(colors).infoRow}>
                  <View style={styles(colors).infoIconContainer}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View style={styles(colors).infoContent}>
                    <Text style={styles(colors).infoLabel}>Next Delivery</Text>
                    <Text style={styles(colors).infoValue}>
                      {subscription?.recurringDelivery?.nextScheduledDelivery
                        ?.date
                        ? new Date(
                            subscription.recurringDelivery.nextScheduledDelivery.date
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "Not scheduled"}
                    </Text>
                  </View>
                </View>

                <View style={styles(colors).infoRow}>
                  <View style={styles(colors).infoIconContainer}>
                    <Ionicons
                      name="stats-chart-outline"
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View style={styles(colors).infoContent}>
                    <Text style={styles(colors).infoLabel}>Progress</Text>
                    <View style={styles(colors).progressContainer}>
                      <Text style={styles(colors).infoValue}>
                        {subscription?.metrics?.completedMeals || 0} of{" "}
                        {subscription?.metrics?.totalMeals || 0} meals
                      </Text>
                      <View style={styles(colors).progressBar}>
                        <View
                          style={[
                            styles(colors).progressFill,
                            {
                              width: `${
                                ((subscription?.metrics?.completedMeals || 0) /
                                  (subscription?.metrics?.totalMeals || 1)) *
                                100
                              }%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        );

      case "schedule":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={colors.white}
              />
              <Text style={styles(colors).tabTitle}>Meal Schedule</Text>
            </View>
            <Text style={styles(colors).tabDescription}>
              View your upcoming meal deliveries and timeline.
            </Text>

            {loadingTimeline ? (
              <View style={styles(colors).loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles(colors).loadingText}>
                  Loading schedule...
                </Text>
              </View>
            ) : (
              <LinearGradient
                colors={[colors.primary + "10", colors.primary + "05"]}
                style={styles(colors).gradientCard}
              >
                <View style={styles(colors).formCard}>
                  <TouchableOpacity
                    style={styles(colors).refreshButton}
                    onPress={fetchMealTimeline}
                  >
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles(colors).refreshButtonText}>
                      Refresh Schedule
                    </Text>
                  </TouchableOpacity>

                  {mealTimeline.length > 0 ? (
                    <ScrollView style={styles(colors).timelineContainer}>
                      {mealTimeline.map((meal, index) => (
                        <View
                          key={meal._id || index}
                          style={styles(colors).timelineItem}
                        >
                          <View style={styles(colors).timelineDate}>
                            <Text style={styles(colors).timelineDayText}>
                              {new Date(meal.deliveryDate).toLocaleDateString(
                                "en-US",
                                { weekday: "short" }
                              )}
                            </Text>
                            <Text style={styles(colors).timelineDateText}>
                              {new Date(meal.deliveryDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </Text>
                          </View>
                          <View style={styles(colors).timelineContent}>
                            <View style={styles(colors).mealInfo}>
                              <Text style={styles(colors).mealName}>
                                {meal.mealName || "Scheduled Meal"}
                              </Text>
                              <Text style={styles(colors).mealTime}>
                                {meal.deliveryTime ||
                                  subscription?.deliveryPreferences?.timeSlot ||
                                  "Morning"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles(colors).statusBadge,
                                meal.status === "scheduled" &&
                                  styles(colors).scheduledBadge,
                                meal.status === "preparing" &&
                                  styles(colors).preparingBadge,
                                meal.status === "delivered" &&
                                  styles(colors).deliveredBadge,
                              ]}
                            >
                              <Text style={styles(colors).statusText}>
                                {meal.status?.charAt(0)?.toUpperCase() +
                                  (meal.status?.slice(1) || "")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles(colors).emptyState}>
                      <Ionicons
                        name="calendar-outline"
                        size={48}
                        color={colors.textSecondary}
                      />
                      <Text style={styles(colors).emptyStateTitle}>
                        No upcoming meals
                      </Text>
                      <Text style={styles(colors).emptyStateDescription}>
                        Your meal schedule will appear here once deliveries are
                        planned.
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            )}
          </View>
        );

      case "pause":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="pause-circle-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles(colors).tabTitle}>Pause Subscription</Text>
            </View>
            <Text style={styles(colors).tabDescription}>
              Temporarily pause your meal deliveries. You can resume anytime.
            </Text>

            <LinearGradient
              colors={[colors.primary + "10", colors.primary + "05"]}
              style={styles(colors).gradientCard}
            >
              <View style={styles(colors).formCard}>
                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Reason for pausing
                  </Text>
                  <TextInput
                    style={styles(colors).textInput}
                    placeholder="e.g., Going on vacation, diet change..."
                    placeholderTextColor={colors.textSecondary + "80"}
                    value={pauseReason}
                    onChangeText={setPauseReason}
                    multiline
                    maxLength={200}
                  />
                  <Text style={styles(colors).charCount}>
                    {pauseReason.length}/200
                  </Text>
                </View>

                <LinearGradient
                  colors={[colors.primary + "10", colors.primary + "05"]}
                  style={styles(colors).gradientCard}
                >
                  <View style={styles(colors).inputSection}>
                    <Text style={styles(colors).inputLabel}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={colors.textSecondary}
                      />{" "}
                      Duration
                    </Text>
                    <View style={styles(colors).optionsGrid}>
                      {[
                        {
                          key: "1_week",
                          label: "1 Week",
                          icon: "calendar-outline",
                        },
                        {
                          key: "2_weeks",
                          label: "2 Weeks",
                          icon: "calendar-outline",
                        },
                        {
                          key: "1_month",
                          label: "1 Month",
                          icon: "calendar-outline",
                        },
                        {
                          key: "indefinite",
                          label: "Indefinite",
                          icon: "infinite-outline",
                        },
                      ].map((duration) => (
                        <TouchableOpacity
                          key={duration.key}
                          style={[
                            styles(colors).optionCard,
                            pauseDuration === duration.key &&
                              styles(colors).selectedOptionCard,
                          ]}
                          onPress={() => setPauseDuration(duration.key)}
                        >
                          <Ionicons
                            name={duration.icon}
                            size={20}
                            color={
                              pauseDuration === duration.key
                                ? colors.primary
                                : colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles(colors).optionText,
                              pauseDuration === duration.key &&
                                styles(colors).selectedOptionText,
                            ]}
                          >
                            {duration.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </LinearGradient>

                <TouchableOpacity
                  style={[
                    styles(colors).actionButton,
                    loading && styles(colors).disabledButton,
                  ]}
                  onPress={handlePauseSubscription}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      loading
                        ? ["#CCCCCC", "#AAAAAA"]
                        : [colors.primary, colors.accent]
                    }
                    style={styles(colors).buttonGradient}
                  >
                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color="#F8FFFC"
                        style={styles(colors).buttonLoader}
                      />
                    )}
                    <Ionicons name="pause" size={20} color="#F8FFFC" />
                    <Text style={styles(colors).actionButtonText}>
                      {loading ? "Pausing..." : "Pause Subscription"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        );

      case "skip":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="play-forward-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles(colors).tabTitle}>Skip Meal Delivery</Text>
            </View>
            <Text style={styles(colors).tabDescription}>
              Skip a specific meal delivery. Your subscription will continue
              with the next meal.
            </Text>

            <LinearGradient
              colors={[colors.primary + "10", colors.primary + "05"]}
              style={styles(colors).gradientCard}
            >
              <View style={styles(colors).formCard}>
                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Date to skip
                  </Text>
                  <TextInput
                    style={styles(colors).textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary + "80"}
                    value={skipDate}
                    onChangeText={setSkipDate}
                  />
                </View>

                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Reason
                  </Text>
                  <TextInput
                    style={styles(colors).textInput}
                    placeholder="Why are you skipping this meal?"
                    placeholderTextColor={colors.textSecondary + "80"}
                    value={skipReason}
                    onChangeText={setSkipReason}
                    multiline
                    maxLength={200}
                  />
                  <Text style={styles(colors).charCount}>
                    {skipReason.length}/200
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles(colors).actionButton,
                    loading && styles(colors).disabledButton,
                  ]}
                  onPress={handleSkipMeal}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      loading
                        ? ["#CCCCCC", "#AAAAAA"]
                        : [colors.primary, colors.accent]
                    }
                    style={styles(colors).buttonGradient}
                  >
                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color="#F8FFFC"
                        style={styles(colors).buttonLoader}
                      />
                    )}
                    <Ionicons name="play-forward" size={20} color="#F8FFFC" />
                    <Text style={styles(colors).actionButtonText}>
                      {loading ? "Skipping..." : "Skip Meal"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        );

      case "modify":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="create-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles(colors).tabTitle}>Modify Delivery</Text>
            </View>
            <Text style={styles(colors).tabDescription}>
              Update your delivery preferences and instructions.
            </Text>

            <LinearGradient
              colors={[colors.primary + "10", colors.primary + "05"]}
              style={styles(colors).gradientCard}
            >
              <View style={styles(colors).formCard}>
                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Preferred Delivery Time
                  </Text>
                  <View style={styles(colors).optionsGrid}>
                    {[
                      {
                        key: "morning",
                        label: "Morning",
                        icon: "sunny-outline",
                        time: "8AM - 12PM",
                      },
                      {
                        key: "afternoon",
                        label: "Afternoon",
                        icon: "partly-sunny-outline",
                        time: "12PM - 4PM",
                      },
                      {
                        key: "evening",
                        label: "Evening",
                        icon: "moon-outline",
                        time: "4PM - 8PM",
                      },
                    ].map((timeSlot) => (
                      <TouchableOpacity
                        key={timeSlot.key}
                        style={[
                          styles(colors).timeSlotCard,
                          deliveryTime === timeSlot.key &&
                            styles(colors).selectedOptionCard,
                        ]}
                        onPress={() => setDeliveryTime(timeSlot.key)}
                      >
                        <Ionicons
                          name={timeSlot.icon}
                          size={24}
                          color={
                            deliveryTime === timeSlot.key
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles(colors).timeSlotLabel,
                            deliveryTime === timeSlot.key &&
                              styles(colors).selectedOptionText,
                          ]}
                        >
                          {timeSlot.label}
                        </Text>
                        <Text style={styles(colors).timeSlotTime}>
                          {timeSlot.time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Delivery Instructions
                  </Text>
                  <TextInput
                    style={styles(colors).textInput}
                    placeholder="e.g., Leave at front door, Ring doorbell, etc."
                    placeholderTextColor={colors.textSecondary + "80"}
                    value={deliveryInstructions}
                    onChangeText={setDeliveryInstructions}
                    multiline
                    maxLength={250}
                  />
                  <Text style={styles(colors).charCount}>
                    {deliveryInstructions.length}/250
                  </Text>
                </View>

                <View style={styles(colors).inputSection}>
                  <TouchableOpacity
                    style={styles(colors).checkboxRow}
                    onPress={() => setContactlessDelivery(!contactlessDelivery)}
                  >
                    <View style={styles(colors).checkboxContainer}>
                      <Ionicons
                        name={
                          contactlessDelivery ? "checkbox" : "square-outline"
                        }
                        size={24}
                        color={
                          contactlessDelivery
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles(colors).checkboxContent}>
                      <Text style={styles(colors).checkboxLabel}>
                        Contactless Delivery
                      </Text>
                      <Text style={styles(colors).checkboxDescription}>
                        Driver will leave your meal at the designated location
                        without direct contact
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles(colors).actionButton,
                    loading && styles(colors).disabledButton,
                  ]}
                  onPress={handleUpdateDeliveryPreferences}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      loading
                        ? ["#CCCCCC", "#AAAAAA"]
                        : [colors.primary, colors.accent]
                    }
                    style={styles(colors).buttonGradient}
                  >
                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color="#F8FFFC"
                        style={styles(colors).buttonLoader}
                      />
                    )}
                    <Ionicons name="save" size={20} color="#F8FFFC" />
                    <Text style={styles(colors).actionButtonText}>
                      {loading ? "Updating..." : "Update Preferences"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        );

      case "chef":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).tabHeader}>
              <Ionicons
                name="person-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles(colors).tabTitle}>Chef Management</Text>
            </View>
            <Text style={styles(colors).tabDescription}>
              Request a different chef for your subscription meals.
            </Text>

            <LinearGradient
              colors={[colors.primary + "10", colors.primary + "05"]}
              style={styles(colors).gradientCard}
            >
              <View style={styles(colors).formCard}>
                {/* <View style={styles(colors).currentChefCard}>
                <View style={styles(colors).chefIconContainer}>
                  <Ionicons name="person" size={32} color={colors.primary} />
                </View>
                <View style={styles(colors).chefInfo}>
                  <Text style={styles(colors).chefLabel}>Current Chef</Text>
                  <Text style={styles(colors).chefName}>
                    {subscription?.assignedChef?.name || "Not assigned yet"}
                  </Text>
                </View>
              </View> */}

                <View style={styles(colors).inputSection}>
                  <Text style={styles(colors).inputLabel}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.textSecondary}
                    />{" "}
                    Reason for change
                  </Text>
                  <TextInput
                    style={styles(colors).textInput}
                    placeholder="Please explain why you'd like a different chef..."
                    placeholderTextColor={colors.textSecondary + "80"}
                    value={reassignReason}
                    onChangeText={setReassignReason}
                    multiline
                    maxLength={300}
                  />
                  <Text style={styles(colors).charCount}>
                    {reassignReason.length}/300
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles(colors).actionButton,
                    loading && styles(colors).disabledButton,
                  ]}
                  onPress={handleRequestChefReassignment}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      loading
                        ? ["#CCCCCC", "#AAAAAA"]
                        : [colors.primary, colors.accent]
                    }
                    style={styles(colors).buttonGradient}
                  >
                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color="#F8FFFC"
                        style={styles(colors).buttonLoader}
                      />
                    )}
                    <Ionicons
                      name="swap-horizontal"
                      size={20}
                      color="#F8FFFC"
                    />
                    <Text style={styles(colors).actionButtonText}>
                      {loading ? "Submitting..." : "Request Chef Change"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        );

      default:
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).comingSoonContainer}>
              <View style={styles(colors).comingSoonIcon}>
                <Ionicons
                  name="construct-outline"
                  size={48}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles(colors).comingSoonTitle}>Coming Soon</Text>
              <Text style={styles(colors).comingSoonDescription}>
                This feature will be available in an upcoming update. Stay
                tuned!
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles(colors).container}
      >
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles(colors).closeButton}
          >
            <View style={styles(colors).closeButtonContainer}>
              <Ionicons name="close" size={24} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={[styles(colors).headerTitle, { color: colors.white }]}>
            Manage Subscription
          </Text>
          <View style={styles(colors).headerSpacer} />
        </View>

        {/* Menu tabs */}
        <View style={styles(colors).menuContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles(colors).menuContent}
          >
            {menuOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles(colors).menuTab,
                  activeTab === option.id && styles(colors).activeMenuTab,
                ]}
                onPress={() => setActiveTab(option.id)}
              >
                <View
                  style={[
                    styles(colors).menuIconContainer,
                    activeTab === option.id &&
                      styles(colors).activeMenuIconContainer,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={activeTab === option.id ? "#F8FFFC" : "#002119"}
                  />
                </View>
                <Text
                  style={[
                    styles(colors).menuTabText,
                    activeTab === option.id && styles(colors).activeMenuTabText,
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles(colors).contentContainer}>
          {renderTabContent()}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-start",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    closeButton: {
      padding: 4,
    },
    closeButtonContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "700",
      marginHorizontal: 16,
    },
    headerSpacer: {
      width: 44,
    },
    menuContainer: {
      backgroundColor: "rgba(0, 0, 0, 0.15)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
      paddingVertical: 5,
    },
    menuContent: {
      paddingHorizontal: 10,
    },
    menuTab: {
      flexDirection: "column",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginRight: 2,
      borderRadius: 16,
      // minWidth: 80,
    },
    activeMenuTab: {
      backgroundColor: `transparent`,
    },
    menuIconContainer: {
      width: 70,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    activeMenuIconContainer: {
      backgroundColor: colors.primary,
    },
    menuTabText: {
      fontSize: 12,
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
    },
    activeMenuTabText: {
      color: colors.white,
      fontWeight: "600",
    },
    contentContainer: {
      flex: 1,
    },
    tabContent: {
      padding: 20,
    },
    tabHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    tabTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.white,
      marginLeft: 12,
      flex: 1,
    },
    tabDescription: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.7)",
      marginBottom: 24,
      lineHeight: 22,
    },

    // Overview styles
    overviewCard: {
      marginTop: 16,
    },
    gradientCard: {
      borderRadius: 16,
      padding: 20,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "20",
    },
    infoIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.6)",
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
    },
    statusText: {
      fontWeight: "700",
    },
    progressContainer: {
      marginTop: 4,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginTop: 8,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 3,
    },

    // Form styles
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      // padding: 20,
      // shadowColor: "#000",
      // shadowOffset: {
      //   width: 0,
      //   height: 2,
      // },
      // shadowOpacity: 0.1,
      // shadowRadius: 8,
      // elevation: 4,
    },
    inputSection: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    textInput: {
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.9)",
      minHeight: 56,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    charCount: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "right",
      marginTop: 8,
    },

    // Options grid for pause duration
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -6,
    },
    optionCard: {
      flex: 1,
      minWidth: (width - 80) / 2,
      margin: 6,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignItems: "center",
    },
    selectedOptionCard: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    optionText: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
      fontWeight: "500",
      marginTop: 8,
      textAlign: "center",
    },
    selectedOptionText: {
      color: colors.primary,
      fontWeight: "600",
    },

    // Time slot styles (for modify tab)
    timeSlotCard: {
      flex: 1,
      minWidth: (width - 80) / 3,
      margin: 6,
      paddingVertical: 20,
      paddingHorizontal: 12,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignItems: "center",
    },
    timeSlotLabel: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
    },
    timeSlotTime: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.6)",
      marginTop: 4,
      textAlign: "center",
    },

    // Checkbox styles (for modify tab)
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    checkboxContainer: {
      marginRight: 16,
      marginTop: 2,
    },
    checkboxContent: {
      flex: 1,
    },
    checkboxLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: 4,
    },
    checkboxDescription: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.7)",
      lineHeight: 20,
    },

    // Chef card styles
    currentChefCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    chefIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    chefInfo: {
      flex: 1,
    },
    chefLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.6)",
      marginBottom: 4,
    },
    chefName: {
      fontSize: 18,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
    },

    // Button styles
    actionButton: {
      borderRadius: 12,
      marginTop: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    buttonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
      borderRadius: 12,
    },
    buttonLoader: {
      marginRight: 8,
    },
    actionButtonText: {
      color: "#F8FFFC",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },

    // Timeline styles (for schedule tab)
    timelineContainer: {
      maxHeight: 400,
      marginTop: 16,
    },
    timelineItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border + "20",
    },
    timelineDate: {
      alignItems: "center",
      marginRight: 16,
      minWidth: 60,
    },
    timelineDayText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      textTransform: "uppercase",
    },
    timelineDateText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },
    timelineContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    mealInfo: {
      flex: 1,
    },
    mealName: {
      fontSize: 16,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: 4,
    },
    mealTime: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.6)",
      textTransform: "capitalize",
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    scheduledBadge: {
      backgroundColor: colors.primary + "20",
    },
    preparingBadge: {
      backgroundColor: colors.primary + "20",
    },
    deliveredBadge: {
      backgroundColor: colors.primary + "20",
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
    },

    // Refresh button
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "15",
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    refreshButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 8,
    },

    // Loading container
    loadingContainer: {
      alignItems: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.7)",
      marginTop: 16,
    },

    // Empty state
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateDescription: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 20,
    },

    // Coming soon styles
    comingSoonContainer: {
      alignItems: "center",
      paddingVertical: 60,
    },
    comingSoonIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    comingSoonTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: 12,
    },
    comingSoonDescription: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 20,
    },
  });

export default SubscriptionManagementModal;
