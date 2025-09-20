// src/components/ui/CustomText.js
import React from "react";
import { Text as RNText } from "react-native";
import { useTheme } from "../../styles/theme";
import { globalTextStyles } from "../../styles/globalStyles";

/**
 * Custom Text component that uses DM Sans font family by default
 * and integrates with the app's theme system.
 *
 * Usage:
 * <CustomText>Default text</CustomText>
 * <CustomText variant="h1">Heading</CustomText>
 * <CustomText variant="body" style={{color: 'red'}}>Custom styled text</CustomText>
 */
const CustomText = ({ children, variant = "body", style, color, ...props }) => {
  const { colors, defaultFontFamily } = useTheme();

  // Get the typography style based on variant
  const variantStyle = globalTextStyles[variant] || globalTextStyles.body;

  // Combine default font, variant style, theme colors, and custom styles
  const textStyle = [
    { fontFamily: defaultFontFamily },
    variantStyle,
    { color: color || colors?.text || "#000000" },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

export default CustomText;
