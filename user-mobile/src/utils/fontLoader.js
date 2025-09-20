// src/utils/fontLoader.js
import * as Font from 'expo-font';
import { Platform } from 'react-native';

// Font loading mapping for Expo
const fontMap = {
  // Standard DM Sans fonts (variable font sizes)
  'DMSans-Thin': require('../../assets/fonts/DMSans-Thin.ttf'),
  'DMSans-ThinItalic': require('../../assets/fonts/DMSans-ThinItalic.ttf'),
  'DMSans-ExtraLight': require('../../assets/fonts/DMSans-ExtraLight.ttf'),
  'DMSans-ExtraLightItalic': require('../../assets/fonts/DMSans-ExtraLightItalic.ttf'),
  'DMSans-Light': require('../../assets/fonts/DMSans-Light.ttf'),
  'DMSans-LightItalic': require('../../assets/fonts/DMSans-LightItalic.ttf'),
  'DMSans-Regular': require('../../assets/fonts/DMSans-Regular.ttf'),
  'DMSans-Italic': require('../../assets/fonts/DMSans-Italic.ttf'),
  'DMSans-Medium': require('../../assets/fonts/DMSans-Medium.ttf'),
  'DMSans-MediumItalic': require('../../assets/fonts/DMSans-MediumItalic.ttf'),
  'DMSans-SemiBold': require('../../assets/fonts/DMSans-SemiBold.ttf'),
  'DMSans-SemiBoldItalic': require('../../assets/fonts/DMSans-SemiBoldItalic.ttf'),
  'DMSans-Bold': require('../../assets/fonts/DMSans-Bold.ttf'),
  'DMSans-BoldItalic': require('../../assets/fonts/DMSans-BoldItalic.ttf'),
  'DMSans-ExtraBold': require('../../assets/fonts/DMSans-ExtraBold.ttf'),
  'DMSans-ExtraBoldItalic': require('../../assets/fonts/DMSans-ExtraBoldItalic.ttf'),
  'DMSans-Black': require('../../assets/fonts/DMSans-Black.ttf'),
  'DMSans-BlackItalic': require('../../assets/fonts/DMSans-BlackItalic.ttf'),

  // 18pt DM Sans fonts (optimized for 18pt size)
  'DMSans_18pt-Thin': require('../../assets/fonts/DMSans_18pt-Thin.ttf'),
  'DMSans_18pt-ThinItalic': require('../../assets/fonts/DMSans_18pt-ThinItalic.ttf'),
  'DMSans_18pt-ExtraLight': require('../../assets/fonts/DMSans_18pt-ExtraLight.ttf'),
  'DMSans_18pt-ExtraLightItalic': require('../../assets/fonts/DMSans_18pt-ExtraLightItalic.ttf'),
  'DMSans_18pt-Light': require('../../assets/fonts/DMSans_18pt-Light.ttf'),
  'DMSans_18pt-LightItalic': require('../../assets/fonts/DMSans_18pt-LightItalic.ttf'),
  'DMSans_18pt-Regular': require('../../assets/fonts/DMSans_18pt-Regular.ttf'),
  'DMSans_18pt-Italic': require('../../assets/fonts/DMSans_18pt-Italic.ttf'),
  'DMSans_18pt-Medium': require('../../assets/fonts/DMSans_18pt-Medium.ttf'),
  'DMSans_18pt-MediumItalic': require('../../assets/fonts/DMSans_18pt-MediumItalic.ttf'),
  'DMSans_18pt-SemiBold': require('../../assets/fonts/DMSans_18pt-SemiBold.ttf'),
  'DMSans_18pt-SemiBoldItalic': require('../../assets/fonts/DMSans_18pt-SemiBoldItalic.ttf'),
  'DMSans_18pt-Bold': require('../../assets/fonts/DMSans_18pt-Bold.ttf'),
  'DMSans_18pt-BoldItalic': require('../../assets/fonts/DMSans_18pt-BoldItalic.ttf'),
  'DMSans_18pt-ExtraBold': require('../../assets/fonts/DMSans_18pt-ExtraBold.ttf'),
  'DMSans_18pt-ExtraBoldItalic': require('../../assets/fonts/DMSans_18pt-ExtraBoldItalic.ttf'),
  'DMSans_18pt-Black': require('../../assets/fonts/DMSans_18pt-Black.ttf'),
  'DMSans_18pt-BlackItalic': require('../../assets/fonts/DMSans_18pt-BlackItalic.ttf'),

  // 24pt DM Sans fonts (optimized for 24pt size)
  'DMSans_24pt-Thin': require('../../assets/fonts/DMSans_24pt-Thin.ttf'),
  'DMSans_24pt-ThinItalic': require('../../assets/fonts/DMSans_24pt-ThinItalic.ttf'),
  'DMSans_24pt-ExtraLight': require('../../assets/fonts/DMSans_24pt-ExtraLight.ttf'),
  'DMSans_24pt-ExtraLightItalic': require('../../assets/fonts/DMSans_24pt-ExtraLightItalic.ttf'),
  'DMSans_24pt-Light': require('../../assets/fonts/DMSans_24pt-Light.ttf'),
  'DMSans_24pt-LightItalic': require('../../assets/fonts/DMSans_24pt-LightItalic.ttf'),
  'DMSans_24pt-Regular': require('../../assets/fonts/DMSans_24pt-Regular.ttf'),
  'DMSans_24pt-Italic': require('../../assets/fonts/DMSans_24pt-Italic.ttf'),
  'DMSans_24pt-Medium': require('../../assets/fonts/DMSans_24pt-Medium.ttf'),
  'DMSans_24pt-MediumItalic': require('../../assets/fonts/DMSans_24pt-MediumItalic.ttf'),
  'DMSans_24pt-SemiBold': require('../../assets/fonts/DMSans_24pt-SemiBold.ttf'),
  'DMSans_24pt-SemiBoldItalic': require('../../assets/fonts/DMSans_24pt-SemiBoldItalic.ttf'),
  'DMSans_24pt-Bold': require('../../assets/fonts/DMSans_24pt-Bold.ttf'),
  'DMSans_24pt-BoldItalic': require('../../assets/fonts/DMSans_24pt-BoldItalic.ttf'),
  'DMSans_24pt-ExtraBold': require('../../assets/fonts/DMSans_24pt-ExtraBold.ttf'),
  'DMSans_24pt-ExtraBoldItalic': require('../../assets/fonts/DMSans_24pt-ExtraBoldItalic.ttf'),
  'DMSans_24pt-Black': require('../../assets/fonts/DMSans_24pt-Black.ttf'),
  'DMSans_24pt-BlackItalic': require('../../assets/fonts/DMSans_24pt-BlackItalic.ttf'),

  // 36pt DM Sans fonts (optimized for 36pt size)
  'DMSans_36pt-Thin': require('../../assets/fonts/DMSans_36pt-Thin.ttf'),
  'DMSans_36pt-ThinItalic': require('../../assets/fonts/DMSans_36pt-ThinItalic.ttf'),
  'DMSans_36pt-ExtraLight': require('../../assets/fonts/DMSans_36pt-ExtraLight.ttf'),
  'DMSans_36pt-ExtraLightItalic': require('../../assets/fonts/DMSans_36pt-ExtraLightItalic.ttf'),
  'DMSans_36pt-Light': require('../../assets/fonts/DMSans_36pt-Light.ttf'),
  'DMSans_36pt-LightItalic': require('../../assets/fonts/DMSans_36pt-LightItalic.ttf'),
  'DMSans_36pt-Regular': require('../../assets/fonts/DMSans_36pt-Regular.ttf'),
  'DMSans_36pt-Italic': require('../../assets/fonts/DMSans_36pt-Italic.ttf'),
  'DMSans_36pt-Medium': require('../../assets/fonts/DMSans_36pt-Medium.ttf'),
  'DMSans_36pt-MediumItalic': require('../../assets/fonts/DMSans_36pt-MediumItalic.ttf'),
  'DMSans_36pt-SemiBold': require('../../assets/fonts/DMSans_36pt-SemiBold.ttf'),
  'DMSans_36pt-SemiBoldItalic': require('../../assets/fonts/DMSans_36pt-SemiBoldItalic.ttf'),
  'DMSans_36pt-Bold': require('../../assets/fonts/DMSans_36pt-Bold.ttf'),
  'DMSans_36pt-BoldItalic': require('../../assets/fonts/DMSans_36pt-BoldItalic.ttf'),
  'DMSans_36pt-ExtraBold': require('../../assets/fonts/DMSans_36pt-ExtraBold.ttf'),
  'DMSans_36pt-ExtraBoldItalic': require('../../assets/fonts/DMSans_36pt-ExtraBoldItalic.ttf'),
  'DMSans_36pt-Black': require('../../assets/fonts/DMSans_36pt-Black.ttf'),
  'DMSans_36pt-BlackItalic': require('../../assets/fonts/DMSans_36pt-BlackItalic.ttf'),
};

// Essential fonts that must be loaded (reduced set for faster loading)
const essentialFonts = {
  'DMSans-Regular': fontMap['DMSans-Regular'],
  'DMSans-Medium': fontMap['DMSans-Medium'],
  'DMSans-SemiBold': fontMap['DMSans-SemiBold'],
  'DMSans-Bold': fontMap['DMSans-Bold'],
  'DMSans-Italic': fontMap['DMSans-Italic'],
};

let fontsLoaded = false;
let fontLoadingPromise = null;

/**
 * Load DM Sans fonts asynchronously
 * Returns a promise that resolves when fonts are loaded
 */
export const loadFonts = async (loadAllFonts = false) => {
  // Return existing promise if already loading
  if (fontLoadingPromise) {
    return fontLoadingPromise;
  }

  // Return immediately if already loaded
  if (fontsLoaded) {
    return Promise.resolve();
  }

  console.log('🔤 Loading DM Sans fonts...');

  fontLoadingPromise = Font.loadAsync(loadAllFonts ? fontMap : essentialFonts)
    .then(() => {
      fontsLoaded = true;
      console.log('✅ DM Sans fonts loaded successfully!');
      return true;
    })
    .catch((error) => {
      console.error('❌ Error loading DM Sans fonts:', error);
      console.warn('📝 Using system fonts as fallback');
      fontsLoaded = true; // Set to true to prevent further attempts
      return false;
    })
    .finally(() => {
      fontLoadingPromise = null;
    });

  return fontLoadingPromise;
};

/**
 * Load additional fonts lazily (for better performance)
 */
export const loadAllFonts = async () => {
  if (!fontsLoaded) {
    await loadFonts(false); // Load essential fonts first
  }
  
  // Load remaining fonts
  const remainingFonts = Object.keys(fontMap).reduce((acc, key) => {
    if (!essentialFonts[key]) {
      acc[key] = fontMap[key];
    }
    return acc;
  }, {});

  try {
    await Font.loadAsync(remainingFonts);
    console.log('✅ All DM Sans fonts loaded!');
  } catch (error) {
    console.warn('⚠️ Some additional fonts failed to load:', error.message);
  }
};

/**
 * Check if fonts are loaded
 */
export const areFontsLoaded = () => fontsLoaded;

/**
 * Get fallback font name for system default
 */
export const getFallbackFont = () => {
  if (fontsLoaded) {
    return 'DMSans-Regular';
  }
  // System default fonts
  return Platform.select({
    ios: 'San Francisco',
    android: 'Roboto',
    web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  });
};

export default {
  loadFonts,
  loadAllFonts,
  areFontsLoaded,
  getFallbackFont,
  fontMap,
  essentialFonts,
};