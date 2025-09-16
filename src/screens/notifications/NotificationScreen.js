// src/screens/notifications/NotificationScreen.js - Modern Dark Theme
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotification } from "../../context/NotificationContext";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import StandardHeader from "../../components/layout/Header";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const NotificationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    deleteNotification,
  } = useNotification();
  const [refreshing, setRefreshing] = React.useState(false);

  // Load notifications when screen mounts
  useEffect(() => {
    refreshNotifications();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } catch (error) {
      console.error("Failed to refresh notifications:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      // Payment notifications
      case "payment_success":
        return "card-outline";
      case "payment_failed":
        return "alert-circle-outline";
      case "refund_processed":
        return "cash-outline";

      // User notifications
      case "welcome":
        return "hand-left-outline";
      case "profile_incomplete":
        return "person-outline";

      // Subscription notifications
      case "subscription_created":
      case "subscription_renewed":
        return "checkmark-circle-outline";
      case "subscription_expiring":
        return "time-outline";
      case "subscription_paused":
        return "pause-circle-outline";
      case "subscription_cancelled":
        return "close-circle-outline";

      // Order notifications
      case "order_confirmed":
        return "cube-outline";
      case "order_preparing":
        return "restaurant-outline";
      case "order_ready":
        return "checkmark-circle-outline";
      case "order_out_for_delivery":
        return "car-outline";
      case "order_delivered":
        return "checkmark-done-outline";
      case "order_cancelled":
        return "close-circle-outline";

      // Chef notifications
      case "chef_assigned":
      case "chef_changed":
        return "person-outline";

      // Promotional notifications
      case "new_meal_plans":
        return "restaurant-outline";
      case "special_offer":
        return "pricetag-outline";
      case "seasonal_menu":
        return "star-outline";

      default:
        return "notifications-outline";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      // Payment notifications
      case "payment_success":
      case "refund_processed":
        return colors.success;
      case "payment_failed":
        return colors.error;

      // Subscription notifications
      case "subscription_created":
      case "subscription_renewed":
      case "order_delivered":
      case "order_ready":
        return colors.success;
      case "subscription_expiring":
      case "order_preparing":
        return colors.warning;
      case "subscription_cancelled":
      case "order_cancelled":
        return colors.error;
      case "subscription_paused":
        return colors.textMuted;

      // Order notifications
      case "order_confirmed":
      case "order_out_for_delivery":
        return colors.primary;

      // Promotional notifications
      case "special_offer":
      case "new_meal_plans":
      case "seasonal_menu":
        return colors.warning;

      // User notifications
      case "welcome":
        return colors.success;
      case "profile_incomplete":
        return colors.info;

      default:
        return colors.textMuted;
    }
  };

  const formatTime = (timestamp) => {
    try {
      const now = new Date();
      const date = new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Now";
      }

      const diff = now - date;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) {
        return "Now";
      } else if (minutes < 60) {
        return `${minutes}m ago`;
      } else if (hours < 24) {
        return `${hours}h ago`;
      } else if (days < 30) {
        return `${days}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Recently";
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    navigation.navigate("NotificationDetail", { notification });
  };

  const renderNotificationItem = (notification) => (
    <TouchableOpacity
      key={notification._id}
      style={[
        styles(colors).notificationItem,
        !notification.isRead && styles(colors).unreadItem,
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.8}
    >
      <View style={styles(colors).notificationContent}>
        <View
          style={[
            styles(colors).iconContainer,
            { backgroundColor: getNotificationColor(notification.type) + "20" },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(notification.type)}
            size={24}
            color={getNotificationColor(notification.type)}
          />
        </View>

        <View style={styles(colors).textContainer}>
          <View style={styles(colors).titleRow}>
            <Text
              style={[
                styles(colors).notificationTitle,
                !notification.isRead && styles(colors).unreadTitle,
              ]}
            >
              {notification.title}
            </Text>
            <Text style={styles(colors).timeText}>
              {notification.timeAgo || formatTime(notification.createdAt)}
            </Text>
          </View>

          <Text style={styles(colors).notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        {!notification.read && <View style={styles(colors).unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <StandardHeader
        title="Notifications"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
        navigation={null}
        rightComponent={
          unreadCount > 0 && (
            <TouchableOpacity
              style={styles(colors).markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles(colors).markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )
        }
      />

      <ScrollView
        style={styles(colors).scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && notifications.length === 0 ? (
          <View style={styles(colors).emptyState}>
            <Ionicons
              name="hourglass-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyTitle}>
              Loading Notifications...
            </Text>
          </View>
        ) : error && notifications.length === 0 ? (
          <View style={styles(colors).emptyState}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={colors.error}
            />
            <Text style={styles(colors).emptyTitle}>Failed to Load</Text>
            <Text style={styles(colors).emptyMessage}>{error}</Text>
            <TouchableOpacity
              style={styles(colors).retryButton}
              onPress={onRefresh}
            >
              <Text style={styles(colors).retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles(colors).emptyState}>
            <Ionicons
              name="notifications-off"
              size={64}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyTitle}>No Notifications</Text>
            <Text style={styles(colors).emptyMessage}>
              You'll see updates about your orders and special offers here.
            </Text>
          </View>
        ) : (
          <View style={styles(colors).notificationsList}>
            {notifications.map(renderNotificationItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: THEME.borderRadius.medium,
      backgroundColor: colors.primary,
    },
    markAllText: {
      fontSize: 12,
      color: colors.white,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    notificationsList: {
      paddingTop: 10,
    },
    notificationItem: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadItem: {
      backgroundColor: `${colors.primary}10`,
      borderColor: colors.primary,
    },
    notificationContent: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    unreadTitle: {
      fontWeight: "bold",
    },
    timeText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    notificationMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginLeft: 8,
      marginTop: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 16,
    },
    retryText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default NotificationScreen;
