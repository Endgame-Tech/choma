import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import CustomNavigationIcon from "../ui/CustomNavigationIcon";
import { useTheme } from "../../styles/theme";

const CustomTabBar = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const circleAnimation = useRef(new Animated.Value(0)).current;

  // Get current route name
  const currentRoute = useNavigationState(state => {
    const route = state.routes[state.index];
    return route.name;
  });

  // Fixed dark mode colors for tab bar (from original TabNavigator)
  const darkTabColors = {
    background: "#1a1a1a",
    white: "#ffffff",
    primary: "#4ECDC4",
    textMuted: "#f3f1f1ff",
  };

  // Define tab routes
  const tabs = [
    { name: 'Home', key: 'home' },
    { name: 'SearchScreen', key: 'search' },
    { name: 'Orders', key: 'orders' },
    { name: 'Profile', key: 'profile' },
  ];

  const handleTabPress = (routeName) => {
    const isFocused = currentRoute === routeName;
    if (isFocused) return; // Don't navigate if already on this tab

    // Navigate immediately to update the tab indicator
    navigation.navigate(routeName);

    // Reset and start the animation
    circleAnimation.setValue(0); // Ensure animation starts from the beginning
    Animated.timing(circleAnimation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // After the circle has expanded, start shrinking it to reveal the new screen
      setTimeout(() => {
        Animated.timing(circleAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 100); // A short delay before revealing
    });
  };

  // Create route object for CustomNavigationIcon compatibility
  const createRouteObject = (tabName) => ({
    name: tabName === 'SearchScreen' ? 'Search' : tabName,
  });

  return (
    <>
      {/* Circular Reveal Animation - Never blocks touches */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circleBackground,
          {
            backgroundColor: colors.primary,
            transform: [
              {
                scale: circleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50],
                }),
              },
            ],
          },
        ]}
      />

      {/* Custom Tab Bar */}
      <View
        style={[
          styles.tabBarContainer,
          {
            bottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.tabBarBackgroundContainer}>
          <BlurView tint="dark" intensity={80} style={styles.blurView} />
        </View>

        <View style={styles.tabBarContent}>
          {tabs.map((tab) => {
            const isFocused = currentRoute === tab.name;
            const route = createRouteObject(tab.name);

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.9}
                onPress={() => handleTabPress(tab.name)}
                style={styles.tabButton}
              >
                <CustomNavigationIcon
                  route={route}
                  focused={isFocused}
                  color={
                    isFocused ? darkTabColors.primary : darkTabColors.textMuted
                  }
                  size={24}
                  colors={darkTabColors}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: "#1a1a1af6",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.53)",
    elevation: 6,
    overflow: "hidden",
  },
  tabBarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.61)",
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 50,
  },
  // Circular reveal animation background
  circleBackground: {
    position: "absolute",
    width: 60,
    height: 60,
    bottom: 100, // Position from the bottom like in HomeScreen
    left: "50%",
    marginLeft: -30,
    borderRadius: 30,
    zIndex: 10000,
  },
});

export default CustomTabBar;
