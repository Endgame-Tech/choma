// src/utils/fontUtils.js
import { Text, TextInput, StyleSheet } from "react-native";

// Fallback imports with try/catch to prevent errors
let DMSansFonts = {};
let DEFAULT_FONT_FAMILY = "System";
let areFontsLoaded = () => false;
let getFallbackFont = () => "System";

try {
  const fontsModule = require("../constants/fonts");
  DMSansFonts = fontsModule.DMSansFonts || {};
  DEFAULT_FONT_FAMILY = fontsModule.DEFAULT_FONT_FAMILY || "System";
} catch (error) {
  console.warn("Could not load font constants, using fallback");
}

try {
  const fontLoaderModule = require("./fontLoader");
  areFontsLoaded = fontLoaderModule.areFontsLoaded || (() => false);
  getFallbackFont = fontLoaderModule.getFallbackFont || (() => "System");
} catch (error) {
  console.warn("Could not load font loader, using fallback");
}

/**
 * Maps numeric and string font weights to DM Sans font families
 */
const FONT_WEIGHT_MAP = {
  // Numeric weights
  100: DMSansFonts.thin,
  200: DMSansFonts.extraLight,
  300: DMSansFonts.light,
  400: DMSansFonts.regular,
  500: DMSansFonts.medium,
  600: DMSansFonts.semiBold,
  700: DMSansFonts.bold,
  800: DMSansFonts.extraBold,
  900: DMSansFonts.black,

  // String weights
  thin: DMSansFonts.thin,
  extralight: DMSansFonts.extraLight,
  light: DMSansFonts.light,
  normal: DMSansFonts.regular,
  regular: DMSansFonts.regular,
  medium: DMSansFonts.medium,
  semibold: DMSansFonts.semiBold,
  bold: DMSansFonts.bold,
  extrabold: DMSansFonts.extraBold,
  black: DMSansFonts.black,

  // React Native standard weights
  100: DMSansFonts.thin,
  200: DMSansFonts.extraLight,
  300: DMSansFonts.light,
  400: DMSansFonts.regular,
  500: DMSansFonts.medium,
  600: DMSansFonts.semiBold,
  700: DMSansFonts.bold,
  800: DMSansFonts.extraBold,
  900: DMSansFonts.black,
};

/**
 * Convert fontWeight to appropriate DM Sans fontFamily
 * @param {string|number} fontWeight - The font weight to convert
 * @returns {string} - The appropriate DM Sans font family
 */
export const mapFontWeight = (fontWeight) => {
  try {
    if (!fontWeight) return DEFAULT_FONT_FAMILY;

    const weight =
      typeof fontWeight === "string" ? fontWeight.toLowerCase() : fontWeight;
    return FONT_WEIGHT_MAP[weight] || DEFAULT_FONT_FAMILY;
  } catch (error) {
    console.warn("Error mapping font weight:", error);
    return DEFAULT_FONT_FAMILY;
  }
};

/**
 * Transform a style object to use DM Sans fonts instead of fontWeight
 * @param {object} style - The style object to transform
 * @returns {object} - Transformed style object
 */
export const transformStyleWithDMSans = (style) => {
  if (!style || typeof style !== "object") return style;

  try {
    const transformedStyle = { ...style };

    // If fontWeight is specified but no fontFamily, map it to DM Sans
    if (transformedStyle.fontWeight && !transformedStyle.fontFamily) {
      const mappedFont = mapFontWeight(transformedStyle.fontWeight);
      if (mappedFont) {
        transformedStyle.fontFamily = mappedFont;
        // Remove fontWeight since we're using explicit fontFamily
        delete transformedStyle.fontWeight;
      }
    }

    // If no fontFamily is specified at all, use default DM Sans
    if (
      !transformedStyle.fontFamily &&
      !transformedStyle.fontWeight &&
      DEFAULT_FONT_FAMILY
    ) {
      transformedStyle.fontFamily = DEFAULT_FONT_FAMILY;
    }

    return transformedStyle;
  } catch (error) {
    console.warn("Error transforming style with DM Sans:", error);
    return style;
  }
};

/**
 * Enhanced StyleSheet.create that automatically maps fontWeight to DM Sans
 * @param {object} styles - Style definitions
 * @returns {object} - StyleSheet with DM Sans fonts applied
 */
export const createStylesWithDMSans = (styles) => {
  if (!styles || typeof styles !== "object") {
    return StyleSheet.create(styles || {});
  }

  try {
    const transformedStyles = {};

    Object.keys(styles).forEach((key) => {
      const style = styles[key];

      if (Array.isArray(style)) {
        // Handle array of styles
        transformedStyles[key] = style.map(transformStyleWithDMSans);
      } else if (style && typeof style === "object") {
        // Handle single style object
        transformedStyles[key] = transformStyleWithDMSans(style);
      } else {
        // Keep non-object values as is
        transformedStyles[key] = style;
      }
    });

    return StyleSheet.create(transformedStyles);
  } catch (error) {
    console.warn(
      "Error creating styles with DM Sans, falling back to regular StyleSheet:",
      error
    );
    return StyleSheet.create(styles);
  }
};

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
      const fontFamily = areFontsLoaded()
        ? DEFAULT_FONT_FAMILY
        : getFallbackFont();
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
      const fontFamily = areFontsLoaded()
        ? DEFAULT_FONT_FAMILY
        : getFallbackFont();
      style.push({ fontFamily });
    }

    return originalTextInputRender.call(this, { ...props, style }, ref);
  };

  console.log(
    "✅ Font overrides applied - using",
    areFontsLoaded() ? "DM Sans" : "system fonts"
  );
};

// Function to get text style with default font
export const getTextStyleWithFont = (customStyle = {}) => ({
  fontFamily: DEFAULT_FONT_FAMILY,
  ...customStyle,
});

export default {
  mapFontWeight,
  transformStyleWithDMSans,
  createStylesWithDMSans,
  applyDefaultFont,
  getTextStyleWithFont,
};
