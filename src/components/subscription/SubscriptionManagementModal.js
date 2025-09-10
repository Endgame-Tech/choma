import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import apiService from "../../services/api";

const SubscriptionManagementModal = ({
  visible,
  onClose,
  subscription,
  onSubscriptionUpdate,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [pauseReason, setPauseReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState("1_week");
  const [skipDate, setSkipDate] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Early return if no subscription data
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
      const result = await apiService.updateSubscription(subscription._id, {
        status: "paused",
        pauseReason: pauseReason.trim(),
        pauseDuration,
      });

      if (result.success) {
        Alert.alert(
          "Subscription Paused",
          "Your subscription has been paused successfully.",
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
        Alert.alert("Error", result.error || "Failed to pause subscription");
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
          "Your meal delivery has been skipped successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                setSkipDate("");
                setSkipReason("");
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to skip meal");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while skipping the meal");
      console.error("❌ Error skipping meal:", error);
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
          "Your chef reassignment request has been submitted. Our team will review it and get back to you.",
          [
            {
              text: "OK",
              onPress: () => {
                setReassignReason("");
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to submit request");
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
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Subscription Overview</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Plan:</Text>
              <Text style={styles.infoValue}>
                {subscription?.mealPlanId?.planName || "Unknown Plan"}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      subscription?.status === "active" ? "#34C759" : "#FF9500",
                  },
                ]}
              >
                {subscription?.status?.charAt(0)?.toUpperCase() +
                  (subscription?.status?.slice(1) || "")}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Next Delivery:</Text>
              <Text style={styles.infoValue}>
                {subscription?.recurringDelivery?.nextScheduledDelivery?.date
                  ? new Date(
                      subscription.recurringDelivery.nextScheduledDelivery.date
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not scheduled"}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Meals Delivered:</Text>
              <Text style={styles.infoValue}>
                {subscription?.metrics?.completedMeals || 0} of{" "}
                {subscription?.metrics?.totalMeals || 0}
              </Text>
            </View>
          </View>
        );

      case "pause":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Pause Subscription</Text>
            <Text style={styles.tabDescription}>
              Temporarily pause your meal deliveries. You can resume anytime.
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Reason for pausing:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Going on vacation, diet change..."
                value={pauseReason}
                onChangeText={setPauseReason}
                multiline
                maxLength={200}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Duration:</Text>
              {["1_week", "2_weeks", "1_month", "indefinite"].map(
                (duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.optionButton,
                      pauseDuration === duration && styles.selectedOption,
                    ]}
                    onPress={() => setPauseDuration(duration)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        pauseDuration === duration && styles.selectedOptionText,
                      ]}
                    >
                      {duration
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionButton, loading && styles.disabledButton]}
              onPress={handlePauseSubscription}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? "Pausing..." : "Pause Subscription"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "skip":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Skip Meal Delivery</Text>
            <Text style={styles.tabDescription}>
              Skip a specific meal delivery. Your subscription will continue
              with the next meal.
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Date to skip:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                value={skipDate}
                onChangeText={setSkipDate}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Reason:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Why are you skipping this meal?"
                value={skipReason}
                onChangeText={setSkipReason}
                multiline
                maxLength={200}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, loading && styles.disabledButton]}
              onPress={handleSkipMeal}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? "Skipping..." : "Skip Meal"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "chef":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Chef Management</Text>
            <Text style={styles.tabDescription}>
              Request a different chef for your subscription meals.
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Current Chef:</Text>
              <Text style={styles.infoValue}>
                {subscription?.assignedChef?.name || "Not assigned yet"}
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Reason for change:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Please explain why you'd like a different chef..."
                value={reassignReason}
                onChangeText={setReassignReason}
                multiline
                maxLength={300}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, loading && styles.disabledButton]}
              onPress={handleRequestChefReassignment}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? "Submitting..." : "Request Chef Change"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Coming Soon</Text>
            <Text style={styles.tabDescription}>
              This feature will be available in an upcoming update.
            </Text>
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Menu tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.menuContainer}
          contentContainerStyle={styles.menuContent}
        >
          {menuOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.menuTab,
                activeTab === option.id && styles.activeMenuTab,
              ]}
              onPress={() => setActiveTab(option.id)}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={
                  activeTab === option.id
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.menuTabText,
                  activeTab === option.id && styles.activeMenuTabText,
                ]}
              >
                {option.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <ScrollView style={styles.contentContainer}>
          {renderTabContent()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  menuContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuTab: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
    minWidth: 80,
  },
  activeMenuTab: {
    backgroundColor: `${COLORS.primary}15`,
  },
  menuTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  activeMenuTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  tabDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: "500",
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 44,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SubscriptionManagementModal;
