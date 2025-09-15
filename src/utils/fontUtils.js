// src/utils/fontUtils.js
import { Text, TextInput } from "react-native";
import { DEFAULT_FONT_FAMILY } from "../constants/fonts";
import { areFontsLoaded, getFallbackFont } from "./fontLoader";

// Function to apply default font to all Text components (now works with loaded fonts)
export const applyDefaultFont = () => {
  const originalTextRender = Text.render;
  const originalTextInputRender = TextInput.render;

  // Override Text component render to include default font
  Text.render = function (props, ref) {
    const style = Array.isArray(props.style) ? props.style : [props.style];
    const hasFont = style.some((s) => s && s.fontFamily);

    if (!hasFont) {
      // Use loaded font or fallback
      const fontFamily = areFontsLoaded() ? DEFAULT_FONT_FAMILY : getFallbackFont();
      style.push({ fontFamily });
    }

    return originalTextRender.call(this, { ...props, style }, ref);
  };

  // Override TextInput component render to include default font
  TextInput.render = function (props, ref) {
    const style = Array.isArray(props.style) ? props.style : [props.style];
    const hasFont = style.some((s) => s && s.fontFamily);

    if (!hasFont) {
      // Use loaded font or fallback
      const fontFamily = areFontsLoaded() ? DEFAULT_FONT_FAMILY : getFallbackFont();
      style.push({ fontFamily });
    }

    return originalTextInputRender.call(this, { ...props, style }, ref);
  };

  console.log('✅ Font overrides applied - using', areFontsLoaded() ? 'DM Sans' : 'system fonts');
};

// Function to get text style with default font
export const getTextStyleWithFont = (customStyle = {}) => ({
  fontFamily: DEFAULT_FONT_FAMILY,
  ...customStyle,
});

export default {
  applyDefaultFont,
  getTextStyleWithFont,
};
