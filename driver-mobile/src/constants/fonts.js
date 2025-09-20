/**
 * DM Sans Font Family Constants - Choma Driver App
 * (copied from customer app for consistency)
 *
 * This file contains all the DM Sans font family definitions.
 * Use these constants throughout your app for consistent typography.
 */

// Standard DM Sans fonts (variable font sizes)
export const DMSansFonts = {
  // Weights
  thin: "DMSans-Thin",
  thinItalic: "DMSans-ThinItalic",
  extraLight: "DMSans-ExtraLight",
  extraLightItalic: "DMSans-ExtraLightItalic",
  light: "DMSans-Light",
  lightItalic: "DMSans-LightItalic",
  regular: "DMSans-Regular",
  italic: "DMSans-Italic",
  medium: "DMSans-Medium",
  mediumItalic: "DMSans-MediumItalic",
  semiBold: "DMSans-SemiBold",
  semiBoldItalic: "DMSans-SemiBoldItalic",
  bold: "DMSans-Bold",
  boldItalic: "DMSans-BoldItalic",
  extraBold: "DMSans-ExtraBold",
  extraBoldItalic: "DMSans-ExtraBoldItalic",
  black: "DMSans-Black",
  blackItalic: "DMSans-BlackItalic",
};

// 18pt DM Sans fonts (optimized for 18pt size)
export const DMSans18ptFonts = {
  thin: "DMSans_18pt-Thin",
  thinItalic: "DMSans_18pt-ThinItalic",
  extraLight: "DMSans_18pt-ExtraLight",
  extraLightItalic: "DMSans_18pt-ExtraLightItalic",
  light: "DMSans_18pt-Light",
  lightItalic: "DMSans_18pt-LightItalic",
  regular: "DMSans_18pt-Regular",
  italic: "DMSans_18pt-Italic",
  medium: "DMSans_18pt-Medium",
  mediumItalic: "DMSans_18pt-MediumItalic",
  semiBold: "DMSans_18pt-SemiBold",
  semiBoldItalic: "DMSans_18pt-SemiBoldItalic",
  bold: "DMSans_18pt-Bold",
  boldItalic: "DMSans_18pt-BoldItalic",
  extraBold: "DMSans_18pt-ExtraBold",
  extraBoldItalic: "DMSans_18pt-ExtraBoldItalic",
  black: "DMSans_18pt-Black",
  blackItalic: "DMSans_18pt-BlackItalic",
};

// 24pt DM Sans fonts (optimized for 24pt size)
export const DMSans24ptFonts = {
  thin: "DMSans_24pt-Thin",
  thinItalic: "DMSans_24pt-ThinItalic",
  extraLight: "DMSans_24pt-ExtraLight",
  extraLightItalic: "DMSans_24pt-ExtraLightItalic",
  light: "DMSans_24pt-Light",
  lightItalic: "DMSans_24pt-LightItalic",
  regular: "DMSans_24pt-Regular",
  italic: "DMSans_24pt-Italic",
  medium: "DMSans_24pt-Medium",
  mediumItalic: "DMSans_24pt-MediumItalic",
  semiBold: "DMSans_24pt-SemiBold",
  semiBoldItalic: "DMSans_24pt-SemiBoldItalic",
  bold: "DMSans_24pt-Bold",
  boldItalic: "DMSans_24pt-BoldItalic",
  extraBold: "DMSans_24pt-ExtraBold",
  extraBoldItalic: "DMSans_24pt-ExtraBoldItalic",
  black: "DMSans_24pt-Black",
  blackItalic: "DMSans_24pt-BlackItalic",
};

// 36pt DM Sans fonts (optimized for 36pt size)
export const DMSans36ptFonts = {
  thin: "DMSans_36pt-Thin",
  thinItalic: "DMSans_36pt-ThinItalic",
  extraLight: "DMSans_36pt-ExtraLight",
  extraLightItalic: "DMSans_36pt-ExtraLightItalic",
  light: "DMSans_36pt-Light",
  lightItalic: "DMSans_36pt-LightItalic",
  regular: "DMSans_36pt-Regular",
  italic: "DMSans_36pt-Italic",
  medium: "DMSans_36pt-Medium",
  mediumItalic: "DMSans_36pt-MediumItalic",
  semiBold: "DMSans_36pt-SemiBold",
  semiBoldItalic: "DMSans_36pt-SemiBoldItalic",
  bold: "DMSans_36pt-Bold",
  boldItalic: "DMSans_36pt-BoldItalic",
  extraBold: "DMSans_36pt-ExtraBold",
  extraBoldItalic: "DMSans_36pt-ExtraBoldItalic",
  black: "DMSans_36pt-Black",
  blackItalic: "DMSans_36pt-BlackItalic",
};

// Convenience export for the most commonly used fonts
export const Fonts = DMSansFonts;

// Typography system with semantic names
export const Typography = {
  // Headlines
  h1: {
    fontFamily: DMSans36ptFonts.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: DMSans24ptFonts.bold,
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontFamily: DMSans24ptFonts.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: DMSans18ptFonts.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  h5: {
    fontFamily: DMSansFonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  h6: {
    fontFamily: DMSansFonts.medium,
    fontSize: 16,
    lineHeight: 24,
  },

  // Body text
  bodyLarge: {
    fontFamily: DMSansFonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: DMSansFonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: DMSansFonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  // Labels and UI text
  label: {
    fontFamily: DMSansFonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  labelSmall: {
    fontFamily: DMSansFonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },

  // Special cases
  caption: {
    fontFamily: DMSansFonts.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  overline: {
    fontFamily: DMSansFonts.medium,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Buttons
  button: {
    fontFamily: DMSansFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonLarge: {
    fontFamily: DMSansFonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
  },
};

// Default font family for the app
export const DEFAULT_FONT_FAMILY = DMSansFonts.regular;
