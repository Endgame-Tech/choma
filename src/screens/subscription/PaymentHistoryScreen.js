// src/screens/subscription/PaymentHistoryScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import paymentService from "../../services/paymentService";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../styles/theme";
import { APP_CONFIG } from "../../utils/constants";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const PaymentHistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPayments([]);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const result = await paymentService.getPaymentHistory(pageNum, 10);

      if (result.success) {
        const newPayments = result.data.payments || [];

        if (isRefresh || pageNum === 1) {
          setPayments(newPayments);
        } else {
          setPayments((prev) => [...prev, ...newPayments]);
        }

        setHasMore(result.data.pagination.hasNext);
        setPage(pageNum);
      } else {
        Alert.alert("Error", result.error || "Failed to load payment history");
      }
    } catch (error) {
      console.error("Payment history error:", error);
      Alert.alert("Error", "Failed to load payment history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPaymentHistory(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadPaymentHistory(page + 1);
    }
  };

  const handleRefundRequest = async (payment) => {
    Alert.alert(
      "Request Refund",
      `Are you sure you want to request a refund for ${paymentService.formatCurrency(payment.totalAmount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Refund",
          style: "destructive",
          onPress: () => processRefund(payment),
        },
      ]
    );
  };

  const processRefund = async (payment) => {
    try {
      const result = await paymentService.requestRefund({
        reference: payment.paymentReference,
        amount: payment.totalAmount,
        reason: "Customer requested refund",
      });

      if (result.success) {
        Alert.alert("Success", "Refund request submitted successfully");
        handleRefresh(); // Refresh the list
      } else {
        Alert.alert("Error", result.error || "Failed to request refund");
      }
    } catch (error) {
      console.error("Refund error:", error);
      Alert.alert("Error", "Failed to request refund");
    }
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles(colors).paymentItem}>
      <View style={styles(colors).paymentHeader}>
        <View style={styles(colors).paymentInfo}>
          <Text style={styles(colors).paymentAmount}>
            {paymentService.formatCurrency(item.totalAmount)}
          </Text>
          <Text style={styles(colors).paymentDate}>
            {new Date(item.createdDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <View
          style={[
            styles(colors).statusBadge,
            styles(colors)[`status${item.paymentStatus}`],
          ]}
        >
          <Text
            style={[
              styles(colors).statusText,
              styles(colors)[`statusText${item.paymentStatus}`],
            ]}
          >
            {item.paymentStatus}
          </Text>
        </View>
      </View>

      <View style={styles(colors).paymentDetails}>
        <Text style={styles(colors).orderDetails}>
          Order #{item._id?.slice(-6) || "N/A"}
        </Text>
        {item.subscription?.mealPlan && (
          <Text style={styles(colors).mealPlanName}>
            {item.subscription.mealPlan.planName}
          </Text>
        )}
        <Text style={styles(colors).paymentMethod}>
          Payment Method: {item.paymentMethod || "Card"}
        </Text>
        {item.paymentReference && (
          <Text style={styles(colors).referenceText}>
            Ref: {item.paymentReference}
          </Text>
        )}
      </View>

      <View style={styles(colors).paymentActions}>
        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={() =>
            navigation.navigate("OrderDetails", { orderId: item._id })
          }
        >
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.paymentStatus === "Paid" && (
          <TouchableOpacity
            style={[styles(colors).actionButton, styles(colors).refundButton]}
            onPress={() => handleRefundRequest(item)}
          >
            <Ionicons name="return-up-back" size={16} color={colors.error} />
            <Text
              style={[
                styles(colors).actionButtonText,
                styles(colors).refundButtonText,
              ]}
            >
              Request Refund
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles(colors).emptyState}>
      <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
      <Text style={styles(colors).emptyTitle}>No Payment History</Text>
      <Text style={styles(colors).emptyText}>
        Your payment history will appear here once you make your first order.
      </Text>
      <TouchableOpacity
        style={styles(colors).exploreButton}
        onPress={() => navigation.navigate("Search")}
      >
        <Text style={styles(colors).exploreButtonText}>Explore Meal Plans</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles(colors).loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading && payments.length === 0) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).header}>
          <TouchableOpacity
            style={styles(colors).backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles(colors).headerTitle}>Payment History</Text>
        </View>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading payment history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Payment History</Text>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles(colors).listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
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
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
    },
    listContainer: {
      padding: 16,
      flexGrow: 1,
    },
    paymentItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    paymentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentAmount: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    paymentDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusPaid: {
      backgroundColor: colors.successLight,
    },
    statusFailed: {
      backgroundColor: colors.errorLight,
    },
    statusPending: {
      backgroundColor: colors.warningLight,
    },
    statusRefunded: {
      backgroundColor: colors.infoLight,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    statusTextPaid: {
      color: colors.success,
    },
    statusTextFailed: {
      color: colors.error,
    },
    statusTextPending: {
      color: colors.warning,
    },
    statusTextRefunded: {
      color: colors.info,
    },
    paymentDetails: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginBottom: 12,
    },
    orderDetails: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    mealPlanName: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    paymentMethod: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    referenceText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: "monospace",
    },
    paymentActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      flex: 1,
      marginRight: 8,
    },
    refundButton: {
      backgroundColor: colors.errorLight,
      marginRight: 0,
      marginLeft: 8,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.primary,
      marginLeft: 4,
    },
    refundButtonText: {
      color: colors.error,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    loadingFooter: {
      padding: 20,
      alignItems: "center",
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
    },
    exploreButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
    },
    exploreButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
  });
