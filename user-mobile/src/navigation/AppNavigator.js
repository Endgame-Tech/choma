// src/navigation/AppNavigator.js - Modern Dark Theme Update
import React from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomNavigationIcon from "../components/ui/CustomNavigationIcon";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../styles/theme";

// Import custom transitions
import {
  TransitionPresets,
  ScreenTransitions,
  CustomCardStyleInterpolators,
  TransitionSpecs,
} from "./transitions/CustomTransitions";

// Import custom tab bar wrapper
import ScreenWithTabBar from "../components/navigation/ScreenWithTabBar";

// Import all screen components
import HomeScreen from "../screens/home/HomeScreen";
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
import CustomMealPlanScreen from "../screens/meal-plans/CustomMealPlanScreen";
import CustomMealPlanDetailScreen from "../screens/meal-plans/CustomMealPlanDetailScreen";

// Subscription screens
import SubscriptionScreen from "../screens/subscription/SubscriptionScreen";
import CheckoutScreen from "../screens/subscription/CheckoutScreen";
import PaymentScreen from "../screens/subscription/PaymentScreen";
import SubscriptionSuccessScreen from "../screens/subscription/SubscriptionSuccessScreen";
import SubscriptionDetailsScreen from "../screens/subscription/SubscriptionDetailsScreen";
import SubscriptionTrackingScreen from "../screens/subscription/SubscriptionTrackingScreen";
import AwaitingFirstDeliveryScreen from "../screens/subscription/AwaitingFirstDeliveryScreen";
import TodayMealScreen from "../components/home/TodayMealScreen";
import MyPlanScreen from "../screens/subscription/MyPlanScreen";
import MealTimelineScreen from "../screens/subscription/MealTimelineScreen";

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

// Tag screens
import TagScreen from "../screens/tag/TagScreen";
import DurationSelectionScreen from "../screens/duration/DurationSelectionScreen";
import MealPlanListingScreen from "../screens/mealplan/MealPlanListingScreen";

// Notification screens
import NotificationScreen from "../screens/notifications/NotificationScreen";
import NotificationDetailScreen from "../screens/notifications/NotificationDetailScreen";

// Settings screens
import SettingsScreen from "../screens/settings/SettingsScreen";

// Help screens
import HelpCenterScreen from "../screens/help/HelpCenterScreen";

const Stack = createStackNavigator();
// Auth Stack Navigator
const AuthStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#00553E" },
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

// Circular reveal transition config for main screens
const circularRevealTransition = {
  headerShown: false,
  animationEnabled: true,
  transitionSpec: {
    open: TransitionSpecs.slowTiming,
    close: TransitionSpecs.timing,
  },
  cardStyleInterpolator: CustomCardStyleInterpolators.forCircularReveal,
  gestureEnabled: false, // Disable swipe-back gesture on main screens
};

// Wrapped Onboarding Screen to handle completion
const OnboardingWrapper = ({ onOnboardingComplete }) => {
  return <OnboardingScreen onComplete={onOnboardingComplete} />;
};

// Main App Navigator with Dark Theme
const AppNavigator = ({ isFirstLaunch, onOnboardingComplete }) => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  // Default screen options - minimal to avoid conflicts
  const defaultScreenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
    // Enable animations explicitly
    animationEnabled: true,
    // Use platform default transition timing with native driver
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 250,
          useNativeDriver: true,
        },
      },
      close: {
        animation: "timing",
        config: {
          duration: 200,
          useNativeDriver: true,
        },
      },
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
          {/* Main Stack Screens with Circular Reveal and Tab Bar */}
          <Stack.Screen name="Home" options={circularRevealTransition}>
            {(props) => (
              <ScreenWithTabBar showTabBar={false}>
                <HomeScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
          <Stack.Screen name="Orders" options={circularRevealTransition}>
            {(props) => (
              <ScreenWithTabBar>
                <OrdersScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
          <Stack.Screen name="Profile" options={circularRevealTransition}>
            {(props) => (
              <ScreenWithTabBar>
                <ProfileScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
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
            name="SearchScreen"
            options={{
              headerShown: false,
              animationEnabled: true,
              // Apply circular reveal transition for search
              transitionSpec: {
                open: TransitionSpecs.slowTiming,
                close: TransitionSpecs.timing,
              },
              cardStyleInterpolator:
                CustomCardStyleInterpolators.forCircularReveal,
              gestureEnabled: false, // Disable swipe-back gesture
            }}
          >
            {(props) => (
              <ScreenWithTabBar>
                <SearchScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="DurationSelectionScreen"
            component={DurationSelectionScreen}
            options={{
              headerShown: false,
              animationEnabled: true,
              transitionSpec: {
                open: TransitionSpecs.slowTiming,
                close: TransitionSpecs.timing,
              },
              cardStyleInterpolator:
                CustomCardStyleInterpolators.forCircularReveal,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="MealPlanListingScreen"
            options={{
              headerShown: false,
              animationEnabled: true,
              transitionSpec: {
                open: {
                  animation: "timing",
                  config: {
                    duration: 300,
                    useNativeDriver: true,
                  },
                },
                close: {
                  animation: "timing",
                  config: {
                    duration: 250,
                    useNativeDriver: true,
                  },
                },
              },
              cardStyleInterpolator: ({ current }) => {
                return {
                  cardStyle: {
                    opacity: current.progress,
                  },
                };
              },
              gestureEnabled: false,
              gestureDirection: "vertical",
            }}
          >
            {(props) => (
              <ScreenWithTabBar>
                <MealPlanListingScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="TagScreen"
            options={{
              headerShown: false,
              animationEnabled: true,
              // Apply circular reveal transition explicitly
              transitionSpec: {
                open: TransitionSpecs.slowTiming,
                close: TransitionSpecs.timing,
              },
              cardStyleInterpolator:
                CustomCardStyleInterpolators.forCircularReveal,
              gestureEnabled: false,
              gestureDirection: "horizontal",
              gestureResponseDistance: 150,
            }}
          >
            {(props) => (
              <ScreenWithTabBar>
                <TagScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
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
            name="CustomMealPlan"
            component={CustomMealPlanScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CustomMealPlanDetail"
            component={CustomMealPlanDetailScreen}
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
              ...ScreenTransitions.Checkout, // Modal transition
              gestureEnabled: false, // Disable swipe down to dismiss
            }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              headerShown: false,
              ...ScreenTransitions.Payment, // Scale transition
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
            name="MyPlan"
            options={{
              headerShown: false,
            }}
          >
            {(props) => (
              <ScreenWithTabBar>
                <MyPlanScreen {...props} />
              </ScreenWithTabBar>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="MealTimeline"
            component={MealTimelineScreen}
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
            name="TodayMeal"
            component={TodayMealScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AwaitingFirstDelivery"
            component={AwaitingFirstDeliveryScreen}
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
              ...ScreenTransitions.Wallet, // Modal transition
            }}
          />
          <Stack.Screen
            name="AddMoneyScreen"
            component={AddMoneyScreen}
            options={{
              headerShown: false,
              ...ScreenTransitions.AddMoneyScreen, // Modal transition
            }}
          />
          <Stack.Screen
            name="AddCardScreen"
            component={AddCardScreen}
            options={{
              headerShown: false,
              ...ScreenTransitions.AddCardScreen, // Modal transition
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
              ...ScreenTransitions.Settings, // Modal transition
              gestureEnabled: false,
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
