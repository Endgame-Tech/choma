// App.js - Choma Driver Mobile App (Production Version)
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import CustomIcon from "./src/components/ui/CustomIcon";
import { View, Text } from "react-native";

// Font system imports
import { loadFonts } from "./src/utils/fontLoader";
import { applyDefaultFont } from "./src/utils/fontUtils";

// Providers
import {
  DriverAuthProvider,
  useDriverAuth,
} from "./src/contexts/DriverAuthContext";
import { LocationProvider } from "./src/contexts/LocationContext";
import { AlertProvider } from "./src/contexts/AlertContext";
import { ToastProvider } from "./src/contexts/ToastContext";
import { ThemeProvider } from "./src/styles/theme";

// Auth Screens
import LoginScreen from "./src/screens/auth/LoginScreen";
import EmailInputScreen from "./src/screens/auth/EmailInputScreen";
import EmailVerificationScreen from "./src/screens/auth/EmailVerificationScreen";
import DriverRegistrationScreen from "./src/screens/auth/DriverRegistrationScreen";
import DocumentUploadScreen from "./src/screens/auth/DocumentUploadScreen";

// Main Screens
import DashboardScreen from "./src/screens/dashboard/DashboardScreen";
import DeliveryDetailScreen from "./src/screens/deliveries/DeliveryDetailScreen";
import DeliveriesScreen from "./src/screens/deliveries/DeliveriesScreen";
import EarningsScreen from "./src/screens/earnings/EarningsScreen";
import ProfileScreen from "./src/screens/profile/ProfileScreen";

// Theme
import { useTheme } from "./src/styles/theme";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard") {
            iconName = focused ? "overview-filled" : "overview";
          } else if (route.name === "Deliveries") {
            iconName = focused ? "delivery-man-filled" : "delivery-man";
          } else if (route.name === "Earnings") {
            iconName = focused ? "wallet-filled" : "wallet";
          } else if (route.name === "Profile") {
            iconName = focused ? "profile-filled" : "profile";
          }

          return <CustomIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{ tabBarLabel: "Deliveries" }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ tabBarLabel: "Earnings" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

// Placeholder screen for tabs we haven't built yet
function PlaceholderScreen({ route }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 20,
      }}
    >
      <Ionicons name="construct" size={64} color={colors.textSecondary} />
      <Text
        style={{
          fontSize: 18,
          color: colors.text,
          marginTop: 16,
          fontWeight: "600",
        }}
      >
        {route.name} Screen
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        This screen will be implemented next.{"\n"}
        Navigation and basic structure is ready!
      </Text>
    </View>
  );
}

// Auth-aware Navigation Component with Theme Support
function ThemedAppNavigator() {
  const { colors, isDark } = useTheme();

  // Create custom navigation theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AppNavigator />
    </NavigationContainer>
  );
}

// Auth-aware Navigation Component
function AppNavigator() {
  const { isAuthenticated, isLoading } = useDriverAuth();

  if (isLoading) {
    // Show loading screen while checking auth status
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      {isAuthenticated ? (
        // User is logged in, show main app
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="DeliveryDetail"
            component={DeliveryDetailScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
        </>
      ) : (
        // User is not logged in, show auth flow
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="EmailInput" component={EmailInputScreen} />
          <Stack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
          />
          <Stack.Screen name="Register" component={DriverRegistrationScreen} />
          <Stack.Screen
            name="DocumentUpload"
            component={DocumentUploadScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        console.log("🔄 Initializing Driver Mobile App...");

        // Load DM Sans fonts
        await loadFonts();

        // Apply font overrides
        applyDefaultFont();

        console.log("✅ Driver Mobile App initialized successfully");
        setFontsReady(true);
      } catch (error) {
        console.error("❌ Error initializing app:", error);
        // Continue anyway with system fonts
        setFontsReady(true);
      }
    }

    initializeApp();
  }, []);

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading Choma Driver...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <DriverAuthProvider>
        <LocationProvider>
          <AlertProvider>
            <ToastProvider>
              <ThemedAppNavigator />
            </ToastProvider>
          </AlertProvider>
        </LocationProvider>
      </DriverAuthProvider>
    </ThemeProvider>
  );
}
