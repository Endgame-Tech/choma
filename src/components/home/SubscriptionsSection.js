import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import SubscriptionCard from "../dashboard/SubscriptionCard";

const SubscriptionsSection = ({
  subscriptions = [],
  loading = false,
  navigation,
  onSubscriptionPress,
  onSubscriptionMenuPress,
}) => {
  const { colors } = useTheme();

  const renderSubscriptionCard = (subscription, index) => {
    return (
      <SubscriptionCard
        key={subscription._id || subscription.id || index}
        subscription={subscription}
        onPress={() => onSubscriptionPress && onSubscriptionPress(subscription)}
        onMenuPress={() => onSubscriptionMenuPress && onSubscriptionMenuPress(subscription)}
        style={styles(colors).subscriptionCard}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Your Subscriptions</Text>
        </View>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading your subscriptions...</Text>
        </View>
      </View>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Your Subscriptions</Text>
        </View>
        <View style={styles(colors).emptyContainer}>
          <Ionicons name="repeat-outline" size={60} color={colors.textMuted} />
          <Text style={styles(colors).emptyTitle}>No Active Subscriptions</Text>
          <Text style={styles(colors).emptySubtitle}>
            Subscribe to a meal plan to get regular deliveries and save money
          </Text>
          <TouchableOpacity
            style={styles(colors).subscribeButton}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={styles(colors).subscribeButtonText}>Find Subscription Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles(colors).section}>
      <View style={styles(colors).sectionHeader}>
        <Text style={styles(colors).sectionTitle}>Your Subscriptions</Text>
        {subscriptions.length > 1 && (
          <TouchableOpacity
            onPress={() => navigation.navigate("SubscriptionDashboard")}
            style={styles(colors).seeAllButton}
          >
            <Text style={styles(colors).seeAllText}>Manage All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContainer}
      >
        {subscriptions.map(renderSubscriptionCard)}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles(colors).quickActions}>
        <TouchableOpacity
          style={styles(colors).quickActionButton}
          onPress={() => navigation.navigate("Search")}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles(colors).quickActionText}>Add Subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).quickActionButton}
          onPress={() => navigation.navigate("SubscriptionDashboard")}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles(colors).quickActionText}>Manage Plans</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginRight: 4,
    },
    scrollContainer: {
      paddingLeft: 20,
      paddingRight: 20,
    },
    subscriptionCard: {
      marginRight: 16,
      width: 320,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    subscribeButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
    },
    subscribeButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.background,
    },
    quickActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    quickActionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.primary,
      marginLeft: 8,
    },
  });

export default SubscriptionsSection;