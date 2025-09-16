import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomIcon, { ICON_SETS } from "./CustomIcon";

const CustomNavigationIcon = ({ route, focused, color, size = 24, colors }) => {
  // Animation values
  const scaleValue = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const opacityValue = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const backgroundOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const backgroundScale = useRef(new Animated.Value(focused ? 1 : 0.3)).current;

  // Animate on focus change
  useEffect(() => {
    // Smooth scale animation for the icon
    Animated.spring(scaleValue, {
      toValue: focused ? 1 : 0.85,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Smooth opacity animation
    Animated.timing(opacityValue, {
      toValue: focused ? 1 : 0.7,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Background animations
    Animated.parallel([
      Animated.spring(backgroundScale, {
        toValue: focused ? 1 : 0.3,
        useNativeDriver: false,
        tension: 120,
        friction: 7,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused, scaleValue, opacityValue, backgroundOpacity, backgroundScale]);

  const getIconComponent = () => {
    const iconProps = {
      size: size,
      color: focused ? colors?.background || "#1a1a1a" : color,
    };

    // Route name to icon mapping
    const routeIconMap = {
      "Home": "home",
      "Search": "search", 
      "Orders": "cart",
      "Profile": "profile",
    };

    const iconBaseName = routeIconMap[route.name];
    if (!iconBaseName) {
      console.warn(`CustomNavigationIcon: No icon mapping found for route "${route.name}"`);
      return null;
    }

    // Get the appropriate icon (filled for focused, outline for unfocused)
    const iconName = focused ? `${iconBaseName}-filled` : `${iconBaseName}-outline`;
    
    return <CustomIcon name={iconName} {...iconProps} />;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleValue }],
          opacity: opacityValue,
          ...(focused && {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 6,
          }),
        },
      ]}
    >
      {/* Background circle for focused state */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.background,
          {
            backgroundColor: colors?.white || "#ffffff",
            opacity: backgroundOpacity,
            transform: [{ scale: backgroundScale }],
          },
        ]}
      />

      {/* Icon */}
      {getIconComponent()}
    </Animated.View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    width: 55,
    height: 55,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    borderRadius: 50,
  },
});

export default CustomNavigationIcon;
