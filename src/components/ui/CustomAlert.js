import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

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

  const getIconForType = () => {
    if (icon) return icon;

    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: colors.success };
      case "error":
        return { name: "close-circle", color: colors.error };
      case "warning":
        return { name: "warning", color: colors.warning };
      case "confirm":
        return { name: "help-circle", color: colors.primary };
      default:
        return { name: "information-circle", color: colors.info };
    }
  };

  const iconConfig = getIconForType();

  const defaultButtons =
    buttons.length > 0
      ? buttons
      : [
          {
            text: "OK",
            style: "default",
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
          <View style={styles(colors).content}>
            {/* Icon */}
            <View style={styles(colors).iconContainer}>
              <Ionicons
                name={iconConfig.name}
                size={48}
                color={iconConfig.color}
              />
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
              {defaultButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles(colors).button,
                    button.style === "cancel" && styles(colors).cancelButton,
                    button.style === "destructive" &&
                      styles(colors).destructiveButton,
                    defaultButtons.length === 1 && styles(colors).singleButton,
                    defaultButtons.length > 2 && styles(colors).verticalButton,
                  ]}
                  onPress={() => {
                    if (button.onPress) button.onPress();
                    if (onDismiss) onDismiss();
                  }}
                >
                  {button.style === "default" ||
                  button.style === "destructive" ? (
                    <LinearGradient
                      colors={
                        button.style === "destructive"
                          ? [colors.error, "#C82333"]
                          : [colors.primary, colors.primaryDark]
                      }
                      style={styles(colors).buttonGradient}
                    >
                      <Text
                        style={[
                          styles(colors).buttonText,
                          button.style === "destructive" &&
                            styles(colors).destructiveButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles(colors).plainButton}>
                      <Text
                        style={[
                          styles(colors).buttonText,
                          styles(colors).cancelButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      maxWidth: screenWidth - 40,
      width: "100%",
      ...THEME.shadows.heavy,
    },
    content: {
      padding: 24,
      alignItems: "center",
    },
    iconContainer: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      gap: 12,
    },
    verticalButtonContainer: {
      flexDirection: "column",
      gap: 8,
    },
    button: {
      flex: 1,
      borderRadius: THEME.borderRadius.medium,
      overflow: "hidden",
    },
    singleButton: {
      minWidth: 120,
    },
    verticalButton: {
      flex: 0,
      width: "100%",
    },
    buttonGradient: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    plainButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.black,
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    destructiveButtonText: {
      color: colors.white,
    },
    cancelButton: {
      backgroundColor: "transparent",
    },
    destructiveButton: {
      backgroundColor: colors.error,
    },
  });

export default CustomAlert;
