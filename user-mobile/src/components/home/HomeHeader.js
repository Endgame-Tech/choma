import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import NotificationIcon from "../ui/NotificationIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const HomeHeader = ({
  user,
  navigation,
  onLocationPress,
  showBrowseMode = false,
  onToggleBrowseMode,
}) => {
  const { colors } = useTheme();

  if (!colors) {
    console.error("❌ HomeHeader: colors is undefined - theme context missing");
    return null;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatUserName = (name) => {
    if (!name) return "Guest";
    const firstName = name.split(" ")[0];
    return firstName.length > 12
      ? firstName.substring(0, 12) + "..."
      : firstName;
  };

  return (
    <View style={styles(colors).container}>
      {/* User Greeting Section */}
      <View style={styles(colors).greetingSection}>
        <View style={styles(colors).userInfo}>
          <Image
            source={
              user?.profilePicture
                ? { uri: user.profilePicture }
                : require("../../assets/images/avatar.jpg")
            }
            style={styles(colors).avatar}
          />
          <View style={styles(colors).textSection}>
            <Text style={styles(colors).greeting}>
              {getGreeting()}, {formatUserName(user?.name)}! 👋
            </Text>
            <TouchableOpacity
              style={styles(colors).locationContainer}
              onPress={onLocationPress}
              activeOpacity={0.9}
            >
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles(colors).location}>
                {user?.address?.slice(0, 30) || "Set delivery address"}
                {user?.address?.length > 30 && "..."}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles(colors).headerActions}>
          {/* Browse Mode Toggle */}
          {showBrowseMode && (
            <TouchableOpacity
              style={[
                styles(colors).browseButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={onToggleBrowseMode}
            >
              <Ionicons name="eye" size={16} color={colors.background} />
              <Text style={styles(colors).browseText}>Browse</Text>
            </TouchableOpacity>
          )}

          {/* Notification Icon */}
          <NotificationIcon navigation={navigation} />
        </View>
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 15,
    },
    greetingSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    userInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      marginRight: 12,
    },
    textSection: {
      flex: 1,
    },
    greeting: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    location: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 4,
      marginRight: 4,
      flex: 1,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    browseButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    browseText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.background,
    },
  });

export default HomeHeader;
