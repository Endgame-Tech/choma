// src/screens/subscription/SubscriptionDetailsScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import apiService from "../../services/api";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const SubscriptionDetailsScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { subscriptionId, subscription: subscriptionParam } =
    route.params || {};

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If a full subscription object was provided via navigation, use it directly.
    if (subscriptionParam) {
      setSubscription(subscriptionParam);
      setLoading(false);
      return;
    }

    // Otherwise, fetch by id when available
    if (subscriptionId) {
      fetchSubscriptionDetails();
    } else {
      setError("Subscription ID is missing");
      setLoading(false);
    }
  }, [subscriptionId, subscriptionParam]);

  const fetchSubscriptionDetails = async () => {
    if (!subscriptionId) {
      setError("Subscription ID is missing");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Fetch subscription details with mealPlanSnapshot
      const result = await apiService.getSubscriptionById(subscriptionId);

      if (result.success && result.data) {
        // Check if result.data has nested structure
        const actualSubscriptionData = result.data.data || result.data;
        setSubscription(actualSubscriptionData);
      } else {
        setError("Failed to load subscription details");
      }
    } catch (err) {
      console.error("Error fetching subscription details:", err);
      setError("An error occurred while loading subscription details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription? This action cannot be undone.",
      [
        {
          text: "No, Keep It",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const idToCancel =
                (subscription && (subscription._id || subscription.id)) ||
                subscriptionId ||
                (subscriptionParam &&
                  (subscriptionParam._id || subscriptionParam.id));
              const result = await apiService.cancelSubscription(idToCancel);

              if (result.success) {
                Alert.alert(
                  "Subscription Cancelled",
                  "Your subscription has been cancelled successfully.",
                  [
                    {
                      text: "OK",
                      onPress: () => navigation.navigate("Subscriptions"),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to cancel subscription"
                );
              }
            } catch (error) {
              console.error("Error cancelling subscription:", error);
              Alert.alert(
                "Error",
                "An error occurred while cancelling your subscription"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return colors.success;
      case "pending":
        return colors.warning;
      case "cancelled":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return status || "Unknown";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading subscription details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !subscription) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />
        <View style={styles(colors).errorContainer}>
          <Ionicons
            name="calendar-outline"
            size={80}
            color={colors.textMuted}
          />
          <Text style={styles(colors).errorTitle}>No Subscription Found</Text>
          <Text style={styles(colors).errorText}>
            You don't have any active subscriptions yet. Start by browsing our
            meal plans to get healthy, delicious meals delivered to your door!
          </Text>
          <TouchableOpacity
            style={styles(colors).button}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles(colors).buttonText}>Browse Meal Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles(colors).button, styles(colors).secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text
              style={[
                styles(colors).buttonText,
                styles(colors).secondaryButtonText,
              ]}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Subscription Details</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription Status */}
        <View style={styles(colors).statusCard}>
          <View style={styles(colors).statusContainer}>
            <View
              style={[
                styles(colors).statusIndicator,
                { backgroundColor: getStatusColor(subscription.status) },
              ]}
            />
            <Text
              style={[
                styles(colors).statusText,
                { color: getStatusColor(subscription.status) },
              ]}
            >
              {subscription.status ||
                subscription.subscriptionStatus ||
                "Active"}
            </Text>
          </View>

          <View style={styles(colors).subscriptionIdContainer}>
            <Text style={styles(colors).subscriptionIdLabel}>
              Subscription ID:
            </Text>
            <Text style={styles(colors).subscriptionIdValue}>
              {subscription.subscriptionId || "N/A"}
            </Text>
          </View>
        </View>

        {/* Meal Plan Details */}
        {subscription.mealPlanSnapshot && (
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Meal Plan</Text>

            <View style={styles(colors).mealPlanCard}>
              {subscription.mealPlanSnapshot.coverImage ? (
                <Image
                  source={{ uri: subscription.mealPlanSnapshot.coverImage }}
                  style={styles(colors).mealPlanImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles(colors).mealPlanImage,
                    {
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: colors.cardBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                </View>
              )}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles(colors).imageGradient}
              />
              <View style={styles(colors).mealPlanOverlay}>
                <Text style={styles(colors).mealPlanName}>
                  {subscription.mealPlanSnapshot?.planName ||
                    subscription.planName ||
                    subscription.mealPlanName ||
                    subscription.subscriptionName ||
                    subscription.plan?.name ||
                    "Healthy Meal Plan"}
                </Text>
                <Text style={styles(colors).mealPlanSubtitle}>
                  {subscription.mealPlanSnapshot?.planDescription ||
                    subscription.planDescription ||
                    subscription.description ||
                    "Delicious meals delivered to you"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Subscription Details */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Subscription Details</Text>

          <View style={styles(colors).detailsCard}>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Meal Selection</Text>
              <Text style={styles(colors).detailValue}>
                {(() => {
                  const mealTypes = subscription.selectedMealTypes || ["lunch"];
                  if (mealTypes.includes("all"))
                    return "Breakfast, Lunch & Dinner";
                  return mealTypes
                    .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
                    .join(", ");
                })()}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Duration</Text>
              <Text style={styles(colors).detailValue}>
                {subscription.durationWeeks
                  ? subscription.mealPlanSnapshot?.isFiveWorkingDays ||
                    subscription.isFiveWorkingDays
                    ? `${
                        subscription.durationWeeks * 5
                      } Days (5 Working Days Plan)`
                    : `${subscription.durationWeeks} ${
                        subscription.durationWeeks === 1 ? "week" : "weeks"
                      }`
                  : "N/A"}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Start Date</Text>
              <Text style={styles(colors).detailValue}>
                {(subscription.startDate &&
                  formatDate(subscription.startDate)) ||
                  (subscription.createdAt &&
                    formatDate(subscription.createdAt)) ||
                  "Recently Started"}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>End Date</Text>
              <Text style={styles(colors).detailValue}>
                {(subscription.endDate && formatDate(subscription.endDate)) ||
                  (subscription.status === "Active" ? "Ongoing" : "N/A")}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Payment Details</Text>

          <View style={styles(colors).detailsCard}>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Payment Status</Text>
              <Text
                style={[
                  styles(colors).detailValue,
                  {
                    color: getStatusColor(subscription.paymentStatus || "paid"),
                  },
                ]}
              >
                {getPaymentStatusLabel(subscription.paymentStatus || "paid")}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Subscription ID</Text>
              <Text style={styles(colors).detailValue}>
                {subscription.subscriptionId || "N/A"}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Transaction ID</Text>
              <Text style={styles(colors).detailValue}>
                {subscription.transactionId || "N/A"}
              </Text>
            </View>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Amount Paid</Text>
              <Text style={styles(colors).detailValue}>
                ₦
                {(
                  subscription.totalPrice ||
                  subscription.price ||
                  0
                ).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Delivery Information</Text>

          <View style={styles(colors).detailsCard}>
            <View style={styles(colors).detailRow}>
              <Text style={styles(colors).detailLabel}>Address</Text>
              <Text style={styles(colors).detailValue}>
                {subscription.deliveryAddress ||
                  subscription.address ||
                  subscription.shippingAddress ||
                  subscription.location ||
                  subscription.deliveryLocation ||
                  "Home delivery"}
              </Text>
            </View>
            {subscription.specialInstructions && (
              <View style={styles(colors).detailRow}>
                <Text style={styles(colors).detailLabel}>
                  Special Instructions
                </Text>
                <Text style={styles(colors).detailValue}>
                  {subscription.specialInstructions}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Actions */}
      {(subscription.status?.toLowerCase() === "active" ||
        subscription.subscriptionStatus?.toLowerCase() === "active" ||
        !subscription.status) && (
        <View style={styles(colors).footer}>
          <TouchableOpacity
            style={[styles(colors).button, styles(colors).cancelButton]}
            onPress={handleCancelSubscription}
          >
            <Text
              style={[
                styles(colors).buttonText,
                styles(colors).cancelButtonText,
              ]}
            >
              Cancel Subscription
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      backgroundColor: colors.background,
      borderRadius: THEME.borderRadius.medium,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.text,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 24,
    },
    statusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    statusText: {
      fontSize: 16,
      fontWeight: "600",
    },
    subscriptionIdContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    subscriptionIdLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 5,
    },
    subscriptionIdValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    mealPlanCard: {
      position: "relative",
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      height: 160,
    },
    mealPlanImage: {
      width: "100%",
      height: "100%",
    },
    imageGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "70%",
    },
    mealPlanOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
    },
    mealPlanName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    mealPlanSubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
    },
    detailsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailRow: {
      marginBottom: 15,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    bottomPadding: {
      height: 20,
    },
    footer: {
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.xxl,
      alignItems: "center",
      marginBottom: 10,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.error,
    },
    cancelButtonText: {
      color: colors.error,
    },
  });

export default SubscriptionDetailsScreen;
