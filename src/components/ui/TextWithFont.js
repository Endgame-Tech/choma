// src/components/ui/TextWithFont.js
import React from "react";
import { Text } from "react-native";
import { useTheme } from "../../styles/theme";

// Wrapper component that applies DM Sans to all Text components
const TextWithFont = ({ style, ...props }) => {
  const { defaultFontFamily, colors } = useTheme();

  const defaultStyle = {
    fontFamily: defaultFontFamily,
    color: colors.text,
  };

  return <Text style={[defaultStyle, style]} {...props} />;
};

export default TextWithFont;
