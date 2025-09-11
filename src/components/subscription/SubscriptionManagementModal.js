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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import apiService from "../../services/api";

const { width } = Dimensions.get("window");

const SubscriptionManagementModal = ({
  visible,
  onClose,
  subscription,
  onSubscriptionUpdate,
}) => {
  const { isDark, colors } = useTheme();
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
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).headerSection}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles(colors).gradientHeader}
              >
                <View style={styles(colors).headerContent}>
                  <Ionicons
                    name="information-circle"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={styles(colors).gradientTitle}>
                    Subscription Overview
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles(colors).infoCard}>
              <View style={styles(colors).infoSection}>
                <View style={styles(colors).infoIconContainer}>
                  <Ionicons
                    name="restaurant"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles(colors).infoContent}>
                  <Text style={styles(colors).infoLabel}>Plan</Text>
                  <Text style={styles(colors).infoValue}>
                    {subscription?.mealPlanId?.planName || "Unknown Plan"}
                  </Text>
                </View>
              </View>

              <View style={styles(colors).infoSection}>
                <View style={styles(colors).infoIconContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={
                      subscription?.status === "active"
                        ? colors.success
                        : colors.warning
                    }
                  />
                </View>
                <View style={styles(colors).infoContent}>
                  <Text style={styles(colors).infoLabel}>Status</Text>
                  <Text
                    style={[
                      styles(colors).infoValue,
                      {
                        color:
                          subscription?.status === "active"
                            ? colors.success
                            : colors.warning,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {subscription?.status?.charAt(0)?.toUpperCase() +
                      (subscription?.status?.slice(1) || "")}
                  </Text>
                </View>
              </View>

              <View style={styles(colors).infoSection}>
                <View style={styles(colors).infoIconContainer}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <View style={styles(colors).infoContent}>
                  <Text style={styles(colors).infoLabel}>Next Delivery</Text>
                  <Text style={styles(colors).infoValue}>
                    {subscription?.recurringDelivery?.nextScheduledDelivery
                      ?.date
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
              </View>

              <View
                style={[styles(colors).infoSection, { borderBottomWidth: 0 }]}
              >
                <View style={styles(colors).infoIconContainer}>
                  <Ionicons
                    name="stats-chart"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles(colors).infoContent}>
                  <Text style={styles(colors).infoLabel}>Progress</Text>
                  <Text style={styles(colors).infoValue}>
                    {subscription?.metrics?.completedMeals || 0} of{" "}
                    {subscription?.metrics?.totalMeals || 0} meals delivered
                  </Text>
                  <View style={styles(colors).progressBar}>
                    <View
                      style={[
                        styles(colors).progressFill,
                        {
                          width: `${Math.min(
                            ((subscription?.metrics?.completedMeals || 0) /
                              Math.max(
                                subscription?.metrics?.totalMeals || 1,
                                1
                              )) *
                              100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case "pause":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).headerSection}>
              <LinearGradient
                colors={[colors.warning, "#FF8C00"]}
                style={styles(colors).gradientHeader}
              >
                <View style={styles(colors).headerContent}>
                  <Ionicons
                    name="pause-circle"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={styles(colors).gradientTitle}>
                    Pause Subscription
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles(colors).descriptionCard}>
              <Text style={styles(colors).tabDescription}>
                Temporarily pause your meal deliveries. You can resume anytime
                from your subscription dashboard.
              </Text>
            </View>

            <View style={styles(colors).inputCard}>
              <View style={styles(colors).inputSection}>
                <Text style={styles(colors).inputLabel}>
                  Reason for pausing
                </Text>
                <TextInput
                  style={[
                    styles(colors).textInput,
                    { height: 80, textAlignVertical: "top" },
                  ]}
                  placeholder="e.g., Going on vacation, diet change, temporary relocation..."
                  placeholderTextColor={colors.textMuted}
                  value={pauseReason}
                  onChangeText={setPauseReason}
                  multiline
                  maxLength={200}
                />
                <Text style={styles(colors).characterCount}>
                  {pauseReason.length}/200
                </Text>
              </View>

              <View style={styles(colors).inputSection}>
                <Text style={styles(colors).inputLabel}>Pause Duration</Text>
                <View style={styles(colors).optionsGrid}>
                  {[
                    {
                      value: "1_week",
                      label: "1 Week",
                      icon: "calendar-outline",
                    },
                    { value: "2_weeks", label: "2 Weeks", icon: "calendar" },
                    {
                      value: "1_month",
                      label: "1 Month",
                      icon: "calendar-sharp",
                    },
                    {
                      value: "indefinite",
                      label: "Indefinite",
                      icon: "infinite-outline",
                    },
                  ].map((duration) => (
                    <TouchableOpacity
                      key={duration.value}
                      style={[
                        styles(colors).optionCard,
                        pauseDuration === duration.value &&
                          styles(colors).selectedOptionCard,
                      ]}
                      onPress={() => setPauseDuration(duration.value)}
                    >
                      <Ionicons
                        name={duration.icon}
                        size={24}
                        color={
                          pauseDuration === duration.value
                            ? colors.primary
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles(colors).optionText,
                          pauseDuration === duration.value &&
                            styles(colors).selectedOptionText,
                        ]}
                      >
                        {duration.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles(colors).actionButton,
                { backgroundColor: colors.warning },
                loading && styles(colors).disabledButton,
              ]}
              onPress={handlePauseSubscription}
              disabled={loading}
            >
              <Ionicons name="pause" size={20} color={colors.white} />
              <Text style={styles(colors).actionButtonText}>
                {loading ? "Pausing..." : "Pause Subscription"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "skip":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).headerSection}>
              <LinearGradient
                colors={[colors.info, "#1565C0"]}
                style={styles(colors).gradientHeader}
              >
                <View style={styles(colors).headerContent}>
                  <Ionicons
                    name="play-forward-circle"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={styles(colors).gradientTitle}>
                    Skip Meal Delivery
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles(colors).descriptionCard}>
              <Text style={styles(colors).tabDescription}>
                Skip a specific meal delivery while keeping your subscription
                active. Your next scheduled meal will continue as planned.
              </Text>
            </View>

            <View style={styles(colors).inputCard}>
              <View style={styles(colors).inputSection}>
                <Text style={styles(colors).inputLabel}>Date to Skip</Text>
                <View style={styles(colors).dateInputContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <TextInput
                    style={styles(colors).dateInput}
                    placeholder="YYYY-MM-DD (e.g., 2025-09-15)"
                    placeholderTextColor={colors.textMuted}
                    value={skipDate}
                    onChangeText={setSkipDate}
                  />
                </View>
              </View>

              <View style={styles(colors).inputSection}>
                <Text style={styles(colors).inputLabel}>
                  Reason for Skipping
                </Text>
                <TextInput
                  style={[
                    styles(colors).textInput,
                    { height: 80, textAlignVertical: "top" },
                  ]}
                  placeholder="Please explain why you're skipping this delivery..."
                  placeholderTextColor={colors.textMuted}
                  value={skipReason}
                  onChangeText={setSkipReason}
                  multiline
                  maxLength={200}
                />
                <Text style={styles(colors).characterCount}>
                  {skipReason.length}/200
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles(colors).actionButton,
                { backgroundColor: colors.info },
                loading && styles(colors).disabledButton,
              ]}
              onPress={handleSkipMeal}
              disabled={loading}
            >
              <Ionicons name="play-forward" size={20} color={colors.white} />
              <Text style={styles(colors).actionButtonText}>
                {loading ? "Skipping..." : "Skip This Meal"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "chef":
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).headerSection}>
              <LinearGradient
                colors={[colors.accent, "#E65100"]}
                style={styles(colors).gradientHeader}
              >
                <View style={styles(colors).headerContent}>
                  <Ionicons
                    name="person-circle"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={styles(colors).gradientTitle}>
                    Chef Management
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles(colors).descriptionCard}>
              <Text style={styles(colors).tabDescription}>
                Request a different chef for your subscription meals. Our team
                will review your request and assign a new chef based on
                availability.
              </Text>
            </View>

            <View style={styles(colors).inputCard}>
              <View style={styles(colors).currentChefSection}>
                <View style={styles(colors).chefInfoHeader}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                  <Text style={styles(colors).chefInfoLabel}>Current Chef</Text>
                </View>
                <View style={styles(colors).chefInfoCard}>
                  <Text style={styles(colors).chefName}>
                    {subscription?.assignedChef?.name || "Not assigned yet"}
                  </Text>
                  {subscription?.assignedChef?.specialties && (
                    <Text style={styles(colors).chefSpecialties}>
                      Specialties:{" "}
                      {subscription.assignedChef.specialties.join(", ")}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles(colors).inputSection}>
                <Text style={styles(colors).inputLabel}>
                  Reason for Chef Change
                </Text>
                <TextInput
                  style={[
                    styles(colors).textInput,
                    { height: 100, textAlignVertical: "top" },
                  ]}
                  placeholder="Please explain why you'd like a different chef (e.g., dietary preferences, cooking style, availability...)..."
                  placeholderTextColor={colors.textMuted}
                  value={reassignReason}
                  onChangeText={setReassignReason}
                  multiline
                  maxLength={300}
                />
                <Text style={styles(colors).characterCount}>
                  {reassignReason.length}/300
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles(colors).actionButton,
                { backgroundColor: colors.accent },
                loading && styles(colors).disabledButton,
              ]}
              onPress={handleRequestChefReassignment}
              disabled={loading}
            >
              <Ionicons name="person-add" size={20} color={colors.white} />
              <Text style={styles(colors).actionButtonText}>
                {loading ? "Submitting..." : "Request Chef Change"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles(colors).tabContent}>
            <View style={styles(colors).headerSection}>
              <LinearGradient
                colors={[colors.textMuted, "#666666"]}
                style={styles(colors).gradientHeader}
              >
                <View style={styles(colors).headerContent}>
                  <Ionicons name="construct" size={24} color={colors.white} />
                  <Text style={styles(colors).gradientTitle}>Coming Soon</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles(colors).descriptionCard}>
              <View style={styles(colors).comingSoonContainer}>
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={styles(colors).comingSoonTitle}>
                  Feature In Development
                </Text>
                <Text style={styles(colors).tabDescription}>
                  This feature is currently being developed and will be
                  available in an upcoming update. Stay tuned!
                </Text>
              </View>
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
      <SafeAreaView style={styles(colors).container}>
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles(colors).closeButton}
          >
            <View style={styles(colors).closeButtonBackground}>
              <Ionicons name="close" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles(colors).headerTitle}>Manage Subscription</Text>
          <View style={styles(colors).headerSpacer} />
        </View>

        {/* Menu tabs */}
        <View style={styles(colors).menuContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles(colors).menuScroll}
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
                    styles(colors).menuTabIconContainer,
                    activeTab === option.id &&
                      styles(colors).activeMenuTabIconContainer,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      activeTab === option.id ? colors.white : colors.textMuted
                    }
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
        <ScrollView
          style={styles(colors).contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(colors).contentContainerStyle}
        >
          {renderTabContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
      ...THEME.shadows.light,
    },
    closeButton: {
      padding: THEME.spacing.xs,
    },
    closeButtonBackground: {
      width: 32,
      height: 32,
      borderRadius: THEME.borderRadius.medium,
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.3,
    },
    headerSpacer: {
      width: 40,
    },
    menuContainer: {
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuScroll: {
      flexGrow: 0,
    },
    menuContent: {
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      gap: THEME.spacing.sm,
    },
    menuTab: {
      alignItems: "center",
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      borderRadius: THEME.borderRadius.medium,
      minWidth: 80,
    },
    activeMenuTab: {
      backgroundColor: colors.primary,
      ...THEME.shadows.light,
    },
    menuTabIconContainer: {
      width: 36,
      height: 36,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: THEME.spacing.xs,
    },
    activeMenuTabIconContainer: {
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    menuTabText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textMuted,
      textAlign: "center",
    },
    activeMenuTabText: {
      color: colors.white,
      fontWeight: "600",
    },
    contentContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainerStyle: {
      paddingBottom: THEME.spacing.xl,
    },
    tabContent: {
      padding: THEME.spacing.lg,
    },

    // Header sections
    headerSection: {
      marginBottom: THEME.spacing.lg,
    },
    gradientHeader: {
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      ...THEME.shadows.medium,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: THEME.spacing.lg,
      gap: THEME.spacing.md,
    },
    gradientTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.white,
      flex: 1,
    },

    // Cards
    descriptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: THEME.spacing.lg,
      marginBottom: THEME.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...THEME.shadows.light,
    },
    infoCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: THEME.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...THEME.shadows.light,
    },
    inputCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: THEME.spacing.lg,
      marginBottom: THEME.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...THEME.shadows.light,
    },

    // Info sections
    infoSection: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: THEME.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    infoIconContainer: {
      width: 40,
      height: 40,
      borderRadius: THEME.borderRadius.medium,
      backgroundColor: `${colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: THEME.spacing.md,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textMuted,
      marginBottom: THEME.spacing.xs,
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 22,
    },

    // Progress bar
    progressBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginTop: THEME.spacing.sm,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 3,
    },

    // Text and descriptions
    tabDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: "center",
    },

    // Input sections
    inputSection: {
      marginBottom: THEME.spacing.lg,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: THEME.spacing.sm,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
      padding: THEME.spacing.md,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
      minHeight: 48,
      ...THEME.shadows.light,
    },
    characterCount: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "right",
      marginTop: THEME.spacing.xs,
    },

    // Date input
    dateInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
      backgroundColor: colors.background,
      paddingHorizontal: THEME.spacing.md,
      ...THEME.shadows.light,
    },
    dateInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: THEME.spacing.md,
      marginLeft: THEME.spacing.sm,
    },

    // Options
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: THEME.spacing.sm,
    },
    optionCard: {
      flex: 1,
      minWidth: (width - THEME.spacing.lg * 3) / 2,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
      padding: THEME.spacing.md,
      alignItems: "center",
      ...THEME.shadows.light,
    },
    selectedOptionCard: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
      ...THEME.shadows.medium,
    },
    optionText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
      marginTop: THEME.spacing.xs,
      textAlign: "center",
    },
    selectedOptionText: {
      color: colors.primary,
      fontWeight: "600",
    },

    // Chef section
    currentChefSection: {
      marginBottom: THEME.spacing.lg,
    },
    chefInfoHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: THEME.spacing.md,
      gap: THEME.spacing.sm,
    },
    chefInfoLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    chefInfoCard: {
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
      padding: THEME.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chefName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: THEME.spacing.xs,
    },
    chefSpecialties: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: "italic",
    },

    // Coming soon
    comingSoonContainer: {
      alignItems: "center",
      paddingVertical: THEME.spacing.xl,
    },
    comingSoonTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: THEME.spacing.md,
      marginBottom: THEME.spacing.sm,
    },

    // Action button
    actionButton: {
      backgroundColor: colors.primary,
      paddingVertical: THEME.spacing.md,
      paddingHorizontal: THEME.spacing.lg,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: THEME.spacing.sm,
      marginTop: THEME.spacing.lg,
      ...THEME.shadows.medium,
    },
    disabledButton: {
      backgroundColor: colors.textMuted,
      opacity: 0.6,
    },
    actionButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default SubscriptionManagementModal;
