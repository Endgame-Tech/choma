// src/navigation/AppNavigator.js - Modern Dark Theme Update
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../styles/theme';
import { THEME } from '../utils/colors';

// Import all screen components
import HomeScreen from '../screens/home/HomeScreen';
import WelcomeScreen from '../screens/home/WelcomeScreen';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import OnboardingScreen  from '../screens/onboarding/OnboardingScreen';

// Meal Plans screens
import MealPlansScreen from '../screens/meal-plans/MealPlansScreen';
import MealPlanDetailScreen from '../screens/meal-plans/MealPlanDetailScreen';
import BundleDetailScreen from '../screens/meal-plans/BundleDetailScreen';
import CustomizeScreen from '../screens/meal-plans/CustomizeScreen';

// Subscription screens
import SubscriptionScreen from '../screens/subscription/SubscriptionScreen';
import CheckoutScreen from '../screens/subscription/CheckoutScreen';
import PaymentScreen from '../screens/subscription/PaymentScreen';
import SubscriptionSuccessScreen from '../screens/subscription/SubscriptionSuccessScreen';
import SubscriptionDetailsScreen from '../screens/subscription/SubscriptionDetailsScreen';

// Dashboard screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import OrdersScreen from '../screens/dashboard/OrdersScreen';
import OrderDetailScreen from '../screens/dashboard/OrderDetailScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';

// Search screens
import SearchScreen from '../screens/search/SearchScreen';

// Notification screens
import NotificationScreen from '../screens/notifications/NotificationScreen';
import NotificationDetailScreen from '../screens/notifications/NotificationDetailScreen';

// Settings screens
import SettingsScreen from '../screens/settings/SettingsScreen';

// Help screens
import HelpCenterScreen from '../screens/help/HelpCenterScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Simple Tab Icon Component without conflicting animations
const TabIcon = ({ focused, route, color, size, colors }) => {
  let iconName;

  if (route.name === 'Home') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === 'Search') {
    iconName = focused ? 'search' : 'search-outline';
  } else if (route.name === 'Orders') {
    iconName = focused ? 'bag' : 'bag-outline';
  } else if (route.name === 'Profile') {
    iconName = focused ? 'person-circle' : 'person-circle-outline';
  }

  return (
    <View style={{
      width: 55,
      height: 55,
      borderRadius: 50,
      backgroundColor: focused ? colors.white : 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ scale: focused ? 1 : 0.85 }],
      opacity: focused ? 1 : 0.7,
      ...focused && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }
    }}>
      <Ionicons 
        name={iconName} 
        size={size} 
        color={focused ? colors.primary : color} 
      />
    </View>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};


// Main Tab Navigator with Modern Design
const TabNavigator = () => {
  const { isDark, colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Add smooth screen transition for tab changes
        animationEnabled: true,
        gestureEnabled: false,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color, size }) => (
          <TabIcon 
            focused={focused} 
            route={route} 
            color={color} 
            size={size} 
            colors={colors}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark === true ? '#f3f1f1ff' : colors.textMuted,
        tabBarStyle: {
          backgroundColor: isDark === true ? '#1a1a1af6' : 'rgba(255, 255, 255, 0.8)', // Ensure background is semi-transparent
          borderTopWidth: 0, // Remove top border
          paddingBottom: 8,
          paddingTop: 17,
          height: 80,
          marginHorizontal: 20,
          marginBottom: 40,
          borderRadius: 50,
          position: 'absolute',
          borderWidth: 1,
          borderColor: isDark === true ? 'rgba(255, 255, 255, 0.53)' : 'rgba(0, 0, 0, 0.1)',
          elevation: 0, // Crucial for Android to see through
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
      tabBarBackground={() => (
        <View style={styles.tabBarBackgroundContainer}>
          <BlurView
            tint={isDark === true ? "dark" : "light"}
            intensity={80}
            style={styles.blurView}
          />
        </View>
      )}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};
const styles = StyleSheet.create({
  tabBarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    overflow: 'hidden', // This is key to contain the blur within the rounded corners
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.61)', // A subtle border can help define the tab bar
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
});

// Wrapped Onboarding Screen to handle completion
const OnboardingWrapper = ({ onOnboardingComplete }) => {
  return (
    <OnboardingScreen 
      onComplete={onOnboardingComplete}
    />
  );
};

// Main App Navigator with Dark Theme
const AppNavigator = ({ isFirstLaunch, onOnboardingComplete }) => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  const defaultScreenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    gestureResponseDistance: 150,
    transitionSpec: {
      open: {
        animation: 'spring',
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
        animation: 'timing',
        config: {
          duration: 250,
          easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94),
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
                extrapolate: 'clamp',
              }),
            },
            {
              scale: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.85, 0.95, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
          }),
        },
        overlayStyle: {
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
            extrapolate: 'clamp',
          }),
          backgroundColor: 'black',
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
      fontWeight: '600',
    },
  };

  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      {isFirstLaunch ? (
        // Onboarding flow
        <Stack.Screen name="Onboarding">
          {() => <OnboardingWrapper onOnboardingComplete={onOnboardingComplete} />}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        // Auth flow
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        // Main app flow
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
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
              headerTitle: 'Bundle Details',
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
              headerTitle: 'Subscription',
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
            name="Dashboard" 
            component={DashboardScreen}
            options={{
              ...standardHeaderOptions,
              headerTitle: 'Dashboard',
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
