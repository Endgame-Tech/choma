import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const ToastNotification = ({
  notification,
  visible,
  onPress,
  onDismiss,
  duration = 4000,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        hideNotification();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_confirmed":
      case "payment_success":
        return "checkmark-circle";
      case "order_delivered":
        return "car";
      case "subscription_created":
        return "calendar";
      case "welcome":
        return "hand-left";
      case "payment_failed":
        return "alert-circle";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "order_confirmed":
      case "payment_success":
      case "order_delivered":
        return "#34C759";
      case "payment_failed":
        return "#FF6B47";
      case "subscription_created":
        return colors.primary;
      case "welcome":
        return "#007AFF";
      default:
        return colors.primary;
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles(colors).container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles(colors).notificationCard}
        onPress={() => {
          hideNotification();
          onPress?.(notification);
        }}
        activeOpacity={0.9}
      >
        <View style={styles(colors).content}>
          <View
            style={[
              styles(colors).iconContainer,
              {
                backgroundColor: `${getNotificationColor(notification.type)}15`,
              },
            ]}
          >
            <Ionicons
              name={getNotificationIcon(notification.type)}
              size={24}
              color={getNotificationColor(notification.type)}
            />
          </View>

          <View style={styles(colors).textContainer}>
            <Text style={styles(colors).title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles(colors).message} numberOfLines={2}>
              {notification.body || notification.message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles(colors).closeButton}
            onPress={hideNotification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      top: 60,
      left: 16,
      right: 16,
      zIndex: 9999,
    },
    notificationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
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
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    closeButton: {
      padding: 4,
    },
  });

export default ToastNotification;
