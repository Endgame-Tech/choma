import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useNotification } from "../../context/NotificationContext";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const NotificationIcon = ({ size = 24, color }) => {
  const { unreadCount, loadNotifications } = useNotification();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Debug logging
  // console.log("📱 NotificationIcon - unreadCount:", unreadCount);

  // Refresh notifications on mount to ensure unread count is current
  React.useEffect(() => {
    loadNotifications().catch(() => {
      console.log("📱 NotificationIcon - failed to load notifications");
    });
  }, []);

  // Use provided color, or fallback to theme-aware color
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity
      style={styles(colors).container}
      onPress={() => navigation.navigate("Notifications")}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={size} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles(colors).badge}>
          <Text style={styles(colors).badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      position: "relative",
      padding: 5,
    },
    badge: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: colors.error || "#FF6B47",
      borderRadius: 10,
      minWidth: 15,
      height: 15,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 12,
      color: "#FFFFFF",
      fontWeight: "bold",
    },
  });

export default NotificationIcon;
