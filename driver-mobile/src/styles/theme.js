// src/styles/theme.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../utils/colors";
import { Typography, DEFAULT_FONT_FAMILY } from "../constants/fonts";

export const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  typography: Typography,
  defaultFontFamily: DEFAULT_FONT_FAMILY,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const colorScheme = Appearance.getColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === "dark");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme !== null) {
          setIsDark(savedTheme === "dark");
        }
      } catch (error) {
        console.error("Failed to load theme from storage", error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      await AsyncStorage.setItem("theme", newIsDark ? "dark" : "light");
    } catch (error) {
      console.error("Failed to save theme to storage", error);
    }
  };

  const theme = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    typography: Typography,
    defaultFontFamily: DEFAULT_FONT_FAMILY,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
