// src/screens/subscription/PaymentScreen.js - Fixed for Paystack v5
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// NEW: Use the v5 hook instead of component
import { usePaystack } from "react-native-paystack-webview";

import apiService from "../../services/api";
import paymentService from "../../services/paymentService";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../styles/theme";
import { APP_CONFIG } from "../../utils/constants";
import { THEME } from "../../utils/colors";
import StandardHeader from "../../components/layout/Header";
import { useAlert } from "../../contexts/AlertContext";
import discountService from "../../services/discountService";

const PaymentScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showInfo, showSuccess } = useAlert();
  const { subscriptionData, mealPlan } = route.params || {};
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // NEW: Use the Paystack v5 hook
  const { popup } = usePaystack();

  // Use the already calculated amounts from CheckoutScreen
  const originalPrice = subscriptionData?.originalBasePlanPrice || 0;
  const discountedPrice = subscriptionData?.basePlanPrice || 0;
  const deliveryFee = subscriptionData?.deliveryFee || 0;
  const discount = subscriptionData?.discount || null;
  const totalPrice = subscriptionData?.totalPrice || 0;

  // Apply discount code
  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      showError("Invalid Code", "Please enter a discount code");
      return;
    }

    setIsApplyingDiscount(true);
    try {
      // Check if it's an automatic discount based on user activity
      const discount = await discountService.calculateDiscount(user, mealPlan);

      if (discount.discountPercent > 0) {
        setAppliedDiscount(discount);
        showSuccess(
          "Discount Applied!",
          `${discount.discountPercent}% discount applied - ${discount.reason}`
        );
      } else {
        showError(
          "Invalid Code",
          "This discount code is not valid or has expired"
        );
      }
    } catch (error) {
      console.error("Error applying discount:", error);
      showError("Error", "Failed to apply discount code");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Remove applied discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    showInfo("Discount Removed", "Discount has been removed from your order");
  };

  const initializePayment = async () => {
    if (!subscriptionData || !user) {
      showError("Error", "Missing payment information");
      return;
    }

    setIsLoading(true);

    try {
      // Generate a reference
      const reference = `choma-${Date.now()}-${Math.floor(
        Math.random() * 1000000
      )}`;
      const subscriptionId = `SUB-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`;

      // First create the subscription with pending status
      const subscriptionResult = await apiService.createSubscription({
        ...subscriptionData,
        subscriptionId: subscriptionId,
        paymentStatus: "Pending",
        paymentReference: reference,
      });

      if (!subscriptionResult.success) {
        console.error(
          "Subscription creation failed:",
          subscriptionResult.error
        );
        throw new Error(
          subscriptionResult.error || "Failed to create subscription"
        );
      }

      console.log(
        "Subscription created successfully:",
        subscriptionResult.data
      );

      // Extract and validate subscription ID - check for nested data structure
      const createdSubscriptionId =
        subscriptionResult.data.data?._id ||
        subscriptionResult.data.data?.id ||
        subscriptionResult.data._id ||
        subscriptionResult.data.id;
      console.log("Extracted subscription ID:", createdSubscriptionId);

      if (!createdSubscriptionId) {
        console.error(
          "No subscription ID found in result:",
          subscriptionResult.data
        );
        throw new Error(
          "Failed to get subscription ID from created subscription"
        );
      }

      // Initialize payment using payment service
      const paymentResult = await paymentService.initializePayment({
        amount: totalPrice,
        email: user.email,
        subscriptionId: createdSubscriptionId,
        reference,
        orderData: {
          mealPlan: mealPlan,
          subscription: subscriptionData,
        },
      });

      if (paymentResult.success) {
        // NEW: Use the v5 popup.checkout() method
        popup.checkout({
          email: user.email,
          amount: totalPrice, // v5 expects amount in Naira, not kobo
          reference: reference,
          metadata: {
            customer_id: user.id,
            subscription_id: createdSubscriptionId,
            meal_plan: mealPlan.planName || mealPlan.name,
            frequency: subscriptionData.frequency,
            duration: subscriptionData.duration,
          },
          onSuccess: (res) => handlePaymentSuccess(res, createdSubscriptionId),
          onCancel: () => handlePaymentCancel(),
          onError: (error) => handlePaymentError(error),
          onLoad: (res) => console.log("Paystack WebView loaded:", res),
        });
      } else {
        throw new Error(paymentResult.error || "Payment initialization failed");
      }
    } catch (error) {
      console.error("Payment initialization error:", error);

      // Enhanced error message handling
      let errorMessage = "Failed to initialize payment";

      // Check for network connectivity issues
      if (error.message && error.message.includes("Unable to connect")) {
        errorMessage =
          "Unable to connect to the payment server. Please check your internet connection and try again.";
      }
      // Check for Paystack API errors
      else if (error.response) {
        const { status, data } = error.response;

        // Handle specific HTTP status codes
        if (status === 401) {
          errorMessage =
            "Payment service authentication failed. Please contact support.";
          console.error(
            "Paystack API Authentication error:",
            data?.message || "Invalid API key"
          );
        } else if (status === 400) {
          errorMessage = `Payment validation error: ${
            data?.message || "Invalid payment data"
          }`;
        } else if (status >= 500) {
          errorMessage =
            "Payment service is currently unavailable. Please try again later.";
        } else {
          errorMessage =
            data?.message || error.message || "Payment initialization failed";
        }
      } else {
        errorMessage = error.message || "Failed to initialize payment";
      }

      showError("Payment Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (res, subscriptionId) => {
    console.log("Payment successful:", res);
    console.log("Subscription ID for update:", subscriptionId);

    if (!subscriptionId) {
      console.error(
        "ERROR: No subscription ID provided to handlePaymentSuccess"
      );
      showError("Error", "Missing subscription information for update");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Verify payment with backend using payment service
      const verifyResult = await paymentService.verifyPayment(res.reference);

      if (verifyResult.success) {
        console.log("About to update subscription with ID:", subscriptionId);

        // Update subscription status
        const updateResult = await apiService.updateSubscription(
          subscriptionId,
          {
            paymentStatus: "Paid",
            paymentDate: new Date().toISOString(),
            transactionReference: res.reference,
          }
        );

        if (!updateResult.success) {
          console.warn("Subscription update warning:", updateResult.error);
        }

        // Navigate to success screen instead of showing an alert
        navigation.replace("SubscriptionSuccess", {
          subscriptionId: subscriptionId,
          mealPlan: mealPlan,
        });
      } else {
        showError(
          "Verification Error",
          "Payment successful but verification failed"
        );
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      showError(
        "Verification Error",
        "Payment completed but verification failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentCancel = () => {
    console.log("Payment cancelled");
    showInfo("Payment Cancelled", "Your payment was cancelled");
  };

  // Enhanced error handler for all payment errors
  const handlePaymentError = (error) => {
    console.error("Payment error:", error);

    let errorMessage = "An error occurred during payment processing";

    // Handle specific error responses from our API
    if (error.response) {
      const { status, data } = error.response;

      if (data?.code === "INVALID_API_KEY") {
        errorMessage =
          "Payment service is currently unavailable. Please try again later or contact support.";
        console.error(
          "CRITICAL: Paystack API key is invalid. Backend needs configuration update."
        );
      } else if (status === 401) {
        errorMessage =
          "Authentication failed. Please try again or contact support.";
      } else if (status === 400) {
        errorMessage = data?.error || data?.message || "Invalid payment data";
      } else {
        errorMessage =
          data?.message || error.message || "Payment processing failed";
      }
    } else if (error.message) {
      if (error.message.includes("Network Error")) {
        errorMessage =
          "Network connection error. Please check your internet connection and try again.";
      } else {
        errorMessage = error.message;
      }
    }

    setPaymentStatus("Failed");
    showError("Payment Failed", errorMessage);
  };

  if (!subscriptionData || !mealPlan) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>
            Payment Information Missing
          </Text>
          <Text style={styles(colors).errorText}>
            Missing subscription or meal plan data. Please go back and try
            again.
          </Text>
          <TouchableOpacity
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <StandardHeader
        title="Payment"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Order Summary</Text>

          <View style={styles(colors).orderCard}>
            <Image
              source={
                mealPlan.image
                  ? typeof mealPlan.image === "string"
                    ? { uri: mealPlan.image }
                    : mealPlan.image
                  : mealPlan.planImageUrl
                  ? { uri: mealPlan.planImageUrl }
                  : require("../../assets/images/meal-plans/fitfuel.jpg")
              }
              style={styles(colors).mealPlanImage}
              resizeMode="cover"
              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles(colors).imageGradient}
            />
            <View style={styles(colors).orderOverlay}>
              <Text style={styles(colors).mealPlanName}>
                {mealPlan.planName || mealPlan.name}
              </Text>
              <Text style={styles(colors).mealPlanSubtitle}>
                {mealPlan.description || mealPlan.subtitle}
              </Text>
              <View style={styles(colors).orderMeta}>
                <Text style={styles(colors).orderMetaText}>
                  {subscriptionData.frequency} • {subscriptionData.duration}
                </Text>
                <Text style={styles(colors).orderMetaText}>
                  Starts:{" "}
                  {new Date(subscriptionData.startDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Delivery Information</Text>

          <View style={styles(colors).deliveryCard}>
            <View style={styles(colors).deliveryRow}>
              <View style={styles(colors).deliveryIconContainer}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles(colors).deliveryContent}>
                <Text style={styles(colors).deliveryLabel}>Customer</Text>
                <Text style={styles(colors).deliveryText}>{user.fullName}</Text>
              </View>
            </View>

            <View style={styles(colors).deliveryRow}>
              <View style={styles(colors).deliveryIconContainer}>
                <Ionicons name="call" size={20} color={colors.primary} />
              </View>
              <View style={styles(colors).deliveryContent}>
                <Text style={styles(colors).deliveryLabel}>Phone</Text>
                <Text style={styles(colors).deliveryText}>{user.phone}</Text>
              </View>
            </View>

            <View style={styles(colors).deliveryRow}>
              <View style={styles(colors).deliveryIconContainer}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles(colors).deliveryContent}>
                <Text style={styles(colors).deliveryLabel}>Address</Text>
                <Text style={styles(colors).deliveryText}>
                  {subscriptionData.deliveryAddress || user.address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Discount Code */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Discount Code</Text>

          {!appliedDiscount ? (
            <View style={styles(colors).discountInputContainer}>
              <TextInput
                style={styles(colors).discountInput}
                value={discountCode}
                onChangeText={setDiscountCode}
                placeholder="Enter discount code"
                placeholderTextColor={colors.textMuted}
                editable={!isApplyingDiscount}
              />
              <TouchableOpacity
                style={styles(colors).applyButton}
                onPress={applyDiscountCode}
                disabled={isApplyingDiscount || !discountCode.trim()}
              >
                {isApplyingDiscount ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles(colors).applyButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles(colors).appliedDiscountContainer}>
              <View style={styles(colors).discountBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles(colors).discountBadgeText}>
                  {appliedDiscount.discountPercent}% off applied
                </Text>
              </View>
              <TouchableOpacity onPress={removeDiscount}>
                <Ionicons name="close" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment Summary */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Payment Summary</Text>

          <View style={styles(colors).summaryCard}>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Plan Base Price</Text>
              <Text style={styles(colors).summaryValue}>
                ₦{originalPrice.toLocaleString()}
              </Text>
            </View>

            {/* Show discount from CheckoutScreen if available */}
            {discount && discount.discountPercent > 0 && (
              <View style={styles(colors).summaryRow}>
                <Text
                  style={[
                    styles(colors).summaryLabel,
                    styles(colors).discountText,
                  ]}
                >
                  {discount.reason} ({discount.discountPercent}% OFF)
                </Text>
                <Text
                  style={[
                    styles(colors).summaryValue,
                    styles(colors).discountText,
                  ]}
                >
                  -₦{discount.discountAmount.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Show discounted price if discount exists */}
            {discount && discount.discountPercent > 0 && (
              <View style={styles(colors).summaryRow}>
                <Text style={styles(colors).summaryLabel}>
                  Discounted Price
                </Text>
                <Text style={styles(colors).summaryValue}>
                  ₦{discountedPrice.toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>
                Delivery Fee{" "}
                {subscriptionData.selectedDeliveryZone
                  ? `(${subscriptionData.selectedDeliveryZone.area})`
                  : ""}
              </Text>
              <Text
                style={[
                  styles(colors).summaryValue,
                  deliveryFee === 0 && styles(colors).freeText,
                ]}
              >
                {deliveryFee === 0
                  ? "Free"
                  : `₦${deliveryFee.toLocaleString()}`}
              </Text>
            </View>

            <View style={[styles(colors).summaryRow, styles(colors).totalRow]}>
              <Text style={styles(colors).totalLabel}>Total</Text>
              <Text style={styles(colors).totalValue}>
                ₦{totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Payment Method</Text>

          <View style={styles(colors).paymentMethodCard}>
            <View style={styles(colors).paymentMethodRow}>
              <View style={styles(colors).paymentMethodIcon}>
                <Ionicons name="card" size={24} color={colors.primary} />
              </View>
              <View style={styles(colors).paymentMethodInfo}>
                <Text style={styles(colors).paymentMethodTitle}>
                  Card Payment
                </Text>
                <Text style={styles(colors).paymentMethodSubtitle}>
                  Secured by Paystack
                </Text>
              </View>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success}
              />
            </View>
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Pay Button */}
      <View style={styles(colors).footer}>
        <View style={styles(colors).totalSummary}>
          <Text style={styles(colors).totalSummaryLabel}>Total Amount</Text>
          <Text style={styles(colors).totalSummaryValue}>
            ₦{totalPrice.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles(colors).payButton,
            isLoading && styles(colors).payButtonDisabled,
          ]}
          onPress={initializePayment}
          disabled={isLoading}
        >
          <LinearGradient
            colors={
              isLoading
                ? [colors.textMuted, colors.textMuted]
                : [colors.primary, colors.primaryDark]
            }
            style={styles(colors).payButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={colors.black}
                />
                <Text style={styles(colors).payButtonText}>Pay Securely</Text>
                <Ionicons name="lock-closed" size={16} color={colors.black} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* NO MORE PAYSTACK COMPONENT - v5 uses popup.checkout() */}
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
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    orderCard: {
      position: "relative",
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      height: 360,
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
    orderOverlay: {
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
      marginBottom: 10,
    },
    orderMeta: {
      gap: 2,
    },
    orderMetaText: {
      fontSize: 15,
      fontWeight: "700",
      color: "rgba(255,255,255,0.8)",
    },
    deliveryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 15,
    },
    deliveryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    deliveryContent: {
      flex: 1,
    },
    deliveryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    deliveryText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
      lineHeight: 22,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    freeText: {
      color: colors.success,
      fontWeight: "600",
    },
    discountText: {
      color: colors.success,
      fontWeight: "600",
    },
    // Discount styles
    discountInputContainer: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 2,
      gap: 8,
    },
    discountInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    applyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 80,
    },
    applyButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 16,
    },
    appliedDiscountContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.success,
    },
    discountBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    discountBadgeText: {
      color: colors.success,
      fontWeight: "600",
      fontSize: 16,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 8,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    paymentMethodCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    paymentMethodRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    paymentMethodIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    paymentMethodInfo: {
      flex: 1,
    },
    paymentMethodTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    paymentMethodSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
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
    totalSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    totalSummaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    totalSummaryValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    payButton: {
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
    },
    payButtonDisabled: {
      opacity: 0.6,
    },
    payButtonGradient: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 16,
      gap: 10,
    },
    payButtonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: "600",
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
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.large,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default PaymentScreen;
