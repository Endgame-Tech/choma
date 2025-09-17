// src/navigation/AppNavigator.js - Modern Dark Theme Update
import React, { useEffect, useRef } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import CustomNavigationIcon from "../components/ui/CustomNavigationIcon";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../styles/theme";
// import { THEME } from '../utils/colors';
import { createStylesWithDMSans } from "../utils/fontUtils";

// Import all screen components
import HomeScreen from "../screens/home/HomeScreen1";
import WelcomeScreen from "../screens/home/WelcomeScreen";

// Removed SwipeableTabNavigator - using default navigation

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import EmailInputScreen from "../screens/auth/EmailInputScreen";
import EmailVerificationScreen from "../screens/auth/EmailVerificationScreen";
import CompleteSignupScreen from "../screens/auth/CompleteSignupScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";

// Meal Plans screens
import MealPlansScreen from "../screens/meal-plans/MealPlansScreen";
import MealPlanDetailScreen from "../screens/meal-plans/MealPlanDetailScreen";
import BundleDetailScreen from "../screens/meal-plans/BundleDetailScreen";
import CustomizeScreen from "../screens/meal-plans/CustomizeScreen";

// Subscription screens
import SubscriptionScreen from "../screens/subscription/SubscriptionScreen";
import CheckoutScreen from "../screens/subscription/CheckoutScreen";
import PaymentScreen from "../screens/subscription/PaymentScreen";
import SubscriptionSuccessScreen from "../screens/subscription/SubscriptionSuccessScreen";
import SubscriptionDetailsScreen from "../screens/subscription/SubscriptionDetailsScreen";
import SubscriptionTrackingScreen from "../screens/subscription/SubscriptionTrackingScreen";

// Dashboard screens
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import OrdersScreen from "../screens/dashboard/OrdersScreen";
import OrderDetailScreen from "../screens/dashboard/OrderDetailScreen";
import ProfileScreen from "../screens/dashboard/ProfileScreen";
import WalletScreen from "../screens/dashboard/WalletScreen";
import AddMoneyScreen from "../screens/dashboard/AddMoneyScreen";
import AddCardScreen from "../screens/dashboard/AddCardScreen";

// Delivery screens
import { TrackingScreen } from "../screens/delivery/TrackingScreen";
import MapTrackingScreen from "../screens/tracking/MapTrackingScreen";
import EnhancedTrackingScreen from "../screens/tracking/EnhancedTrackingScreen";

// Search screens
import SearchScreen from "../screens/search/SearchScreen";

// Notification screens
import NotificationScreen from "../screens/notifications/NotificationScreen";
import NotificationDetailScreen from "../screens/notifications/NotificationDetailScreen";

// Settings screens
import SettingsScreen from "../screens/settings/SettingsScreen";

// Help screens
import HelpCenterScreen from "../screens/help/HelpCenterScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Animated Tab Icon Component with smooth transitions
const TabIcon = ({ focused, route, color, size, colors }) => {
  const scaleValue = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const opacityValue = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const backgroundOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const backgroundScale = useRef(new Animated.Value(focused ? 1 : 0.3)).current;

  let iconName;

  if (route.name === "Home") {
    iconName = focused ? "home" : "home-outline";
  } else if (route.name === "Search") {
    iconName = focused ? "search" : "search-outline";
  } else if (route.name === "Orders") {
    iconName = focused ? "bag" : "bag-outline";
  } else if (route.name === "Profile") {
    iconName = focused ? "person-circle" : "person-circle-outline";
  }

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

    // Background animations (JS driver to avoid conflicts)
    Animated.parallel([
      Animated.spring(backgroundScale, {
        toValue: focused ? 1 : 0.3,
        useNativeDriver: false, // Use JS driver to match opacity animation
        tension: 120,
        friction: 7,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false, // backgroundColor doesn't support native driver
      }),
    ]).start();
  }, [focused, scaleValue, opacityValue, backgroundOpacity, backgroundScale]);

  return (
    <Animated.View
      style={{
        width: 55,
        height: 55,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ scale: scaleValue }],
        opacity: opacityValue,
        ...(focused && {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 6,
        }),
      }}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: 50,
          backgroundColor: colors.white,
          opacity: backgroundOpacity,
          transform: [{ scale: backgroundScale }],
        }}
      />
      <Ionicons
        name={iconName}
        size={size}
        color={focused ? colors.background : color}
      />
    </Animated.View>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EmailInput" component={EmailInputScreen} />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="CompleteSignup" component={CompleteSignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

// Animated Screen Wrapper for subtle screen transitions
const AnimatedScreenWrapper = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    };
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};

// Main Tab Navigator with Modern Design - Always Dark Mode
const TabNavigator = () => {
  const { colors } = useTheme();

  // Fixed dark mode colors for tab bar
  const darkTabColors = {
    background: "#1a1a1a",
    white: "#ffffff",
    primary: "#4ECDC4", // Your primary color
    textMuted: "#f3f1f1ff",
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={({ route }) => ({
        // Add smooth transitions
        animationEnabled: true,
        headerShown: false,
        tabBarShowLabel: false,
        // Enable lazy loading for smoother performance
        lazy: true,
        // Add transition animation type
        animationTypeForReplace: "push",
        tabBarIcon: ({ focused, color, size }) => (
          <CustomNavigationIcon
            route={route}
            focused={focused}
            color={focused ? colors.background : color}
            size={size}
          />
        ),
        tabBarActiveTintColor: darkTabColors.primary,
        tabBarInactiveTintColor: darkTabColors.textMuted,
        tabBarStyle: {
          backgroundColor: "#1a1a1af6", // Always dark
          borderTopWidth: 0, // Remove top border
          paddingBottom: 8,
          paddingTop: 17,
          height: 80,
          marginHorizontal: 20,
          bottom: 70,
          borderRadius: 50,
          position: "absolute",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.53)", // Always dark border
          elevation: 6, // Crucial for Android to see through
        },
        // Add smooth tab press animation
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={0.9}
            style={[
              props.style,
              {
                borderRadius: 50,
              },
            ]}
            onPress={(e) => {
              // Add haptic feedback if available
              if (Platform.OS === "ios") {
                require("react-native").Haptics?.impactAsync?.(
                  require("react-native").Haptics?.ImpactFeedbackStyle?.Light
                );
              }
              props.onPress?.(e);
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
      tabBarBackground={() => (
        <View style={styles.tabBarBackgroundContainer}>
          <BlurView
            tint="dark" // Always dark blur
            intensity={80}
            style={styles.blurView}
          />
        </View>
      )}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: "Search",
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: "Orders",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
    </Tab.Navigator>
  );
};
const styles = StyleSheet.create({
  tabBarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    overflow: "hidden", // This is key to contain the blur within the rounded corners
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.61)", // A subtle border can help define the tab bar
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
});

// Wrapped Onboarding Screen to handle completion
const OnboardingWrapper = ({ onOnboardingComplete }) => {
  return <OnboardingScreen onComplete={onOnboardingComplete} />;
};

// Main App Navigator with Dark Theme
const AppNavigator = ({ isFirstLaunch, onOnboardingComplete }) => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  const defaultScreenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    gestureResponseDistance: 150,
    transitionSpec: {
      open: {
        animation: "spring",
        config: {
          stiffness: 300,
          damping: 30,
          mass: 1,
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
      close: {
        animation: "timing",
        config: {
          duration: 250,
          easing: require("react-native").Easing.bezier(0.25, 0.46, 0.45, 0.94),
        },
      },
    },
    cardStyleInterpolator: ({ current, next, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
                extrapolate: "clamp",
              }),
            },
            {
              scale: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.85, 0.95, 1],
                extrapolate: "clamp",
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: "clamp",
          }),
        },
        overlayStyle: {
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
            extrapolate: "clamp",
          }),
          backgroundColor: "black",
        },
      };
    },
  };

  const standardHeaderOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: colors.text,
    headerBackTitleVisible: false,
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: "600",
    },
  };

  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      {isFirstLaunch ? (
        // Onboarding flow
        <Stack.Screen name="Onboarding">
          {() => (
            <OnboardingWrapper onOnboardingComplete={onOnboardingComplete} />
          )}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        // Auth flow
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        // Main app flow
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="MealPlans"
            component={MealPlansScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MealPlanDetail"
            component={MealPlanDetailScreen}
            options={{
              headerShown: false,
              gestureEnabled: false, // Disable swipe back to prevent conflicts with horizontal meal scroll
            }}
          />
          <Stack.Screen
            name="BundleDetail"
            component={BundleDetailScreen}
            options={{
              ...standardHeaderOptions,
              headerTitle: "Bundle Details",
            }}
          />
          <Stack.Screen
            name="Customize"
            component={CustomizeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              ...standardHeaderOptions,
              headerTitle: "Subscription",
            }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SubscriptionSuccess"
            component={SubscriptionSuccessScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="SubscriptionDetails"
            component={SubscriptionDetailsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SubscriptionTracking"
            component={SubscriptionTrackingScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              ...standardHeaderOptions,
              headerTitle: "Dashboard",
            }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddMoneyScreen"
            component={AddMoneyScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddCardScreen"
            component={AddCardScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="TrackingScreen"
            component={TrackingScreen}
            options={{
              headerShown: true,
              headerTitle: "Track Order",
            }}
          />
          <Stack.Screen
            name="MapTracking"
            component={MapTrackingScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="EnhancedTracking"
            component={EnhancedTrackingScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="NotificationDetail"
            component={NotificationDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="HelpCenter"
            component={HelpCenterScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
