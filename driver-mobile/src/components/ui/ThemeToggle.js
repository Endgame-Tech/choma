// src/components/ui/ThemeToggle.js
import React from "react";
import { View, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const ThemeToggle = ({ size = "medium", style = {} }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const animatedValue = React.useRef(
    new Animated.Value(isDark ? 1 : 0)
  ).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [isDark, animatedValue]);

  const sizeConfig = {
    small: { width: 44, height: 24, iconSize: 14 },
    medium: { width: 60, height: 32, iconSize: 18 },
    large: { width: 76, height: 40, iconSize: 22 },
  };

  const config = sizeConfig[size];

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, config.width - config.height + 2],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <TouchableOpacity
      style={[styles(colors, config).container, style]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[styles(colors, config).track, { backgroundColor }]}
      >
        <Animated.View
          style={[
            styles(colors, config).thumb,
            { transform: [{ translateX }] },
          ]}
        >
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={config.iconSize}
            color={isDark ? colors.primary : "#FFA500"}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = (colors, config) =>
  createStylesWithDMSans({
    container: {
      justifyContent: "center",
      alignItems: "center",
    },
    track: {
      width: config.width,
      height: config.height,
      borderRadius: config.height / 2,
      justifyContent: "center",
      position: "relative",
    },
    thumb: {
      position: "absolute",
      width: config.height - 4,
      height: config.height - 4,
      borderRadius: (config.height - 4) / 2,
      backgroundColor: colors.white,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default ThemeToggle;
