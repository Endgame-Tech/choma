// src/styles/theme.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../utils/colors";
import { Typography, DEFAULT_FONT_FAMILY } from "../constants/fonts";

export const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  themeMode: 'system',
  typography: Typography,
  defaultFontFamily: DEFAULT_FONT_FAMILY,
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");

  // Load saved theme mode from storage
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem("themeMode");
        if (savedThemeMode) {
          setThemeMode(savedThemeMode);
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
      if (themeMode === 'system') {
        setIsDark(colorScheme === "dark");
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  // Update theme based on mode
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

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