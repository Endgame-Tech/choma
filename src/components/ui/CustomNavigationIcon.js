import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

// Import your custom SVG icons directly using react-native-svg-transformer
import HomeFilled from "../../../assets/images/icons/navigation/home-filled.svg";
import HomeOutline from "../../../assets/images/icons/navigation/home-outline.svg";
import SearchFilled from "../../../assets/images/icons/navigation/search-filled.svg";
import SearchOutline from "../../../assets/images/icons/navigation/search-outline.svg";
import CartFilled from "../../../assets/images/icons/navigation/cart-filled.svg";
import CartOutline from "../../../assets/images/icons/navigation/cart-outline.svg";
import ProfileFilled from "../../../assets/images/icons/navigation/profile-filled.svg";
import ProfileOutline from "../../../assets/images/icons/navigation/profile-outline.svg";

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
      width: size,
      height: size,
      fill: focused ? colors?.background || "#1a1a1a" : color,
    };

    switch (route.name) {
      case "Home":
        return focused ? (
          <HomeFilled {...iconProps} />
        ) : (
          <HomeOutline {...iconProps} />
        );
      case "Search":
        return focused ? (
          <SearchFilled {...iconProps} />
        ) : (
          <SearchOutline {...iconProps} />
        );
      case "Orders":
        return focused ? (
          <CartFilled {...iconProps} />
        ) : (
          <CartOutline {...iconProps} />
        );
      case "Profile":
        return focused ? (
          <ProfileFilled {...iconProps} />
        ) : (
          <ProfileOutline {...iconProps} />
        );
      default:
        return null;
    }
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

const styles = StyleSheet.create({
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
