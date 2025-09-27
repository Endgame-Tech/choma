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
  // Simple animation values
  const backgroundOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  // Simple fade animation
  useEffect(() => {
    console.log('Animation triggered:', { focused, route: route.name });

    Animated.timing(backgroundOpacity, {
      toValue: focused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start((finished) => {
      console.log('Animation finished:', { finished, focused, route: route.name });
    });
  }, [focused, backgroundOpacity, route.name]);

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
    <View style={styles.container}>
      {/* Background circle for focused state */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.background,
          {
            backgroundColor: colors?.white || "#ffffff",
            opacity: backgroundOpacity,
          },
        ]}
      />

      {/* Icon */}
      {getIconComponent()}
    </View>
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
