// src/styles/theme.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { Appearance, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../utils/colors";
import { Typography, DEFAULT_FONT_FAMILY } from "../constants/fonts";

export const ThemeContext = createContext({
  isDark: true,
  colors: darkColors,
  themeMode: "dark",
  typography: Typography,
  defaultFontFamily: DEFAULT_FONT_FAMILY,
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState("system"); // 'light', 'dark', or 'system' - Default is 'system'
  const [isDark, setIsDark] = useState(() => {
    // Initialize with system theme
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === "dark";
  });

  // Helper function to get current system theme
  const getSystemTheme = () => {
    const colorScheme = Appearance.getColorScheme();
    console.log("📱 Current system color scheme detected:", colorScheme);
    console.log("📱 Will use theme:", colorScheme === "dark" ? "dark" : "light");
    console.log("📱 Note: If this doesn't match your phone, check:");
    console.log("   1. Android Settings → Display → Dark theme");
    console.log("   2. Try restarting the app");
    console.log("   3. Check if the app has force-light-mode in AndroidManifest.xml");
    return colorScheme === "dark";
  };

  // Update theme based on current mode
  const updateTheme = useCallback(() => {
    if (themeMode === "system") {
      const systemIsDark = getSystemTheme();
      console.log("Setting theme to system:", systemIsDark ? "dark" : "light");
      setIsDark(systemIsDark);
    } else {
      console.log("Setting theme to:", themeMode);
      setIsDark(themeMode === "dark");
    }
  }, [themeMode]);

  // Load saved theme mode from storage
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem("themeMode");
        console.log("📱 Loaded theme mode from storage:", savedThemeMode);
        if (savedThemeMode) {
          setThemeMode(savedThemeMode);
        } else {
          // If no saved theme, default to system mode to follow phone's theme
          console.log("📱 No saved theme found, defaulting to 'system' mode");
          const systemIsDark = getSystemTheme();
          console.log("📱 System theme detected as:", systemIsDark ? "dark" : "light");
          setThemeMode("system");
          setIsDark(systemIsDark);
          await AsyncStorage.setItem("themeMode", "system");
        }
      } catch (error) {
        console.error("Failed to load themeMode from storage", error);
      }
    };
    loadThemeMode();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log("System theme changed to:", colorScheme);
      if (themeMode === "system") {
        setIsDark(colorScheme === "dark");
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  // Listen for app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && themeMode === "system") {
        console.log("App became active, refreshing system theme");
        updateTheme();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [themeMode, updateTheme]);

  // Update theme based on mode
  useEffect(() => {
    console.log("Theme mode changed to:", themeMode);
    updateTheme();
  }, [themeMode, updateTheme]);

  const handleSetThemeMode = async (mode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode);
      setThemeMode(mode);
    } catch (error) {
      console.error("Failed to save themeMode to storage", error);
    }
  };

  const theme = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    typography: Typography,
    defaultFontFamily: DEFAULT_FONT_FAMILY,
    themeMode,
    setThemeMode: handleSetThemeMode,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
