import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import NotificationIcon from "../../components/ui/NotificationIcon";
import { useNotification } from "../../context/NotificationContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const StandardHeader = ({
  title,
  onBackPress,
  rightIcon = "help-circle-outline",
  onRightPress,
  showRightIcon = true,
  navigation,
  rightComponent,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles(colors).header}>
      {/* Left side - Back button */}
      <TouchableOpacity style={styles(colors).backButton} onPress={onBackPress}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Center - Title */}
      <View style={styles(colors).headerContent}>
        <Text style={styles(colors).headerTitle}>{title}</Text>
      </View>

      {/* Right side - Icons */}
      <View style={styles(colors).rightSection}>
        {navigation && (
          <View style={styles(colors).notificationContainer}>
            <NotificationIcon navigation={navigation} />
          </View>
        )}

        {showRightIcon &&
          (rightComponent ? (
            rightComponent
          ) : (
            <TouchableOpacity
              style={styles(colors).rightButton}
              onPress={onRightPress}
            >
              <Ionicons
                name={rightIcon}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      zIndex: 1,
    },
    headerContent: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 0,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    rightSection: {
      flexDirection: "row",
      alignItems: "center",
      zIndex: 1,
    },
    rightButton: {
      padding: 8,
      marginLeft: 12,
    },
    notificationContainer: {
      marginRight: 12,
    },
  });

export default StandardHeader;
