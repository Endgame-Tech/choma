import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomIcon from "./CustomIcon";

const { width: screenWidth } = Dimensions.get("window");

const CustomAlert = ({
  visible,
  title,
  message,
  buttons = [],
  type = "info", // 'success', 'error', 'warning', 'info', 'confirm'
  onDismiss,
  icon,
}) => {
  const { colors } = useTheme();

  const getIconAndColors = () => {
    if (icon)
      return {
        icon,
        backgroundColor: colors.primary + "20",
        iconColor: colors.primary,
      };

    switch (type) {
      case "success":
        return {
          icon: "star-filled", // Using star-filled as success icon
          backgroundColor: "#10B981" + "20",
          iconColor: "#10B981",
        };
      case "error":
        return {
          icon: "shield", // Using shield as error/danger icon
          backgroundColor: "#EF4444" + "20",
          iconColor: "#EF4444",
        };
      case "warning":
        return {
          icon: "notification-filled", // Using notification-filled as warning icon
          backgroundColor: "#F59E0B" + "20",
          iconColor: "#F59E0B",
        };
      case "confirm":
        return {
          icon: "details", // Using details as help/question icon
          backgroundColor: "#3B82F6" + "20",
          iconColor: "#3B82F6",
        };
      default:
        return {
          icon: "details", // Using details as info icon
          backgroundColor: "#3B82F6" + "20",
          iconColor: "#3B82F6",
        };
    }
  };

  const { icon: iconName, backgroundColor, iconColor } = getIconAndColors();

  const defaultButtons =
    buttons.length > 0
      ? buttons
      : [
          {
            text: "OK",
            style: "primary",
            onPress: onDismiss || (() => {}),
          },
        ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles(colors).overlay}>
        <View style={styles(colors).container}>
          {/* Close button */}
          <TouchableOpacity
            style={styles(colors).closeButton}
            onPress={onDismiss}
          >
            <CustomIcon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles(colors).content}>
            {/* Icon */}
            <View style={[styles(colors).iconContainer, { backgroundColor }]}>
              <CustomIcon name={iconName} size={32} color={iconColor} />
            </View>

            {/* Title */}
            {title && <Text style={styles(colors).title}>{title}</Text>}

            {/* Message */}
            {message && <Text style={styles(colors).message}>{message}</Text>}

            {/* Buttons */}
            <View
              style={[
                styles(colors).buttonContainer,
                defaultButtons.length > 2 &&
                  styles(colors).verticalButtonContainer,
              ]}
            >
              {defaultButtons.map((button, index) => {
                const isDestructive = button.style === "destructive";
                const isPrimary =
                  button.style === "primary" || button.style === "default";
                const isCancel = button.style === "cancel";

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles(colors).button,
                      isPrimary && styles(colors).primaryButton,
                      isDestructive && styles(colors).destructiveButton,
                      isCancel && styles(colors).cancelButton,
                      defaultButtons.length === 1 &&
                        styles(colors).singleButton,
                      defaultButtons.length > 2 &&
                        styles(colors).verticalButton,
                    ]}
                    onPress={() => {
                      if (button.onPress) button.onPress();
                      if (onDismiss) onDismiss();
                    }}
                  >
                    {isDestructive && (
                      <CustomIcon
                        name="remove"
                        size={18}
                        color="#F8FFFC"
                        style={styles(colors).buttonIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles(colors).buttonText,
                        isPrimary && styles(colors).primaryButtonText,
                        isDestructive && styles(colors).destructiveButtonText,
                        isCancel && styles(colors).cancelButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    container: {
      backgroundColor: colors.cardBackground || "#F8FFFC",
      borderRadius: 20,
      maxWidth: screenWidth - 40,
      width: "100%",
      position: "relative",
      ...THEME.shadows.heavy,
    },
    closeButton: {
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.inputBackground || "#F3F4F6",
    },
    content: {
      padding: 32,
      alignItems: "center",
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text || "#1F2937",
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "DMSans-Bold",
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary || "#6B7280",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
      fontFamily: "DMSans-Regular",
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
      gap: 12,
    },
    verticalButtonContainer: {
      flexDirection: "column",
      gap: 12,
    },
    button: {
      borderRadius: 12,
      overflow: "hidden",
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },
    singleButton: {
      minWidth: 200,
      flex: 0,
    },
    verticalButton: {
      flex: 0,
      width: "100%",
    },
    primaryButton: {
      backgroundColor: "#000000",
      flex: 1,
    },
    destructiveButton: {
      backgroundColor: "#EF4444",
      flex: 1,
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border || "#E5E7EB",
      flex: 1,
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "DMSans-Medium",
    },
    primaryButtonText: {
      color: "#F8FFFC",
    },
    destructiveButtonText: {
      color: "#F8FFFC",
    },
    cancelButtonText: {
      color: colors.textSecondary || "#6B7280",
    },
  });

export default CustomAlert;
