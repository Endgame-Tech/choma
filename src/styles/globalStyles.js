// src/styles/globalStyles.js
import { StyleSheet } from "react-native";
import { Typography, DEFAULT_FONT_FAMILY } from "../constants/fonts";

// Global text styles using DM Sans
export const globalTextStyles = StyleSheet.create({
  // Default text style - apply this to Text components
  defaultText: {
    fontFamily: DEFAULT_FONT_FAMILY,
    color: "#000000", // Will be overridden by theme colors
  },

  // Heading styles
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  h4: Typography.h4,
  h5: Typography.h5,
  h6: Typography.h6,

  // Body text styles
  bodyLarge: Typography.bodyLarge,
  body: Typography.body,
  bodySmall: Typography.bodySmall,

  // UI text styles
  label: Typography.label,
  labelSmall: Typography.labelSmall,
  caption: Typography.caption,
  overline: Typography.overline,

  // Button text styles
  button: Typography.button,
  buttonLarge: Typography.buttonLarge,
});

// Global container styles
export const globalContainerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff", // Will be overridden by theme colors
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff", // Will be overridden by theme colors
  },
  paddedContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff", // Will be overridden by theme colors
  },
});

// Global input styles with DM Sans
export const globalInputStyles = StyleSheet.create({
  textInput: {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  textInputFocused: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  textInputLabel: {
    ...Typography.label,
    marginBottom: 8,
    color: "#333333",
  },
});

// Global button styles with DM Sans
export const globalButtonStyles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#007AFF",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  buttonText: {
    ...Typography.button,
    color: "#ffffff",
  },
  buttonTextSecondary: {
    ...Typography.button,
    color: "#007AFF",
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonLargeText: {
    ...Typography.buttonLarge,
    color: "#ffffff",
  },
});

// Helper function to get text style with theme colors
export const getTextStyle = (styleKey, colors) => ({
  ...globalTextStyles[styleKey],
  color: colors?.text || "#000000",
});

// Helper function to get container style with theme colors
export const getContainerStyle = (styleKey, colors) => ({
  ...globalContainerStyles[styleKey],
  backgroundColor: colors?.background || "#ffffff",
});

// Helper function to get input style with theme colors
export const getInputStyle = (styleKey, colors, isFocused = false) => {
  const baseStyle = globalInputStyles[styleKey];
  const focusedStyle = isFocused ? globalInputStyles.textInputFocused : {};

  return {
    ...baseStyle,
    ...focusedStyle,
    backgroundColor: colors?.surface || "#ffffff",
    borderColor: isFocused
      ? colors?.primary || "#007AFF"
      : colors?.border || "#E5E5E5",
    color: colors?.text || "#000000",
  };
};

// Helper function to get button style with theme colors
export const getButtonStyle = (styleKey, colors, variant = "primary") => {
  const baseStyle = globalButtonStyles[styleKey];
  const variantStyle =
    variant === "secondary"
      ? globalButtonStyles.buttonSecondary
      : globalButtonStyles.buttonPrimary;

  return {
    ...baseStyle,
    ...variantStyle,
    backgroundColor:
      variant === "secondary" ? "transparent" : colors?.primary || "#007AFF",
    borderColor: colors?.primary || "#007AFF",
  };
};

// Export all styles
export default {
  text: globalTextStyles,
  container: globalContainerStyles,
  input: globalInputStyles,
  button: globalButtonStyles,
  getTextStyle,
  getContainerStyle,
  getInputStyle,
  getButtonStyle,
};
