import "react-native-get-random-values"; // Must be first import for crypto polyfill
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { LogBox } from "react-native";

// Suppress development warnings in Expo Go
if (__DEV__) {
  LogBox.ignoreLogs([
    "Warning: The provided value 'ms-stream' is not a valid 'responseType'.",
    "Warning: AsyncStorage has been extracted from react-native",
    "Setting a timer for a long period of time",
    "Remote debugger is in a background tab",
    "Possible Unhandled Promise Rejection",
    "VirtualizedLists should never be nested",
    "Failed to get push token",
    "Default FirebaseApp is not initialized",
    "componentWillReceiveProps has been renamed",
    "componentWillMount has been renamed",
  ]);
}
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { PaystackProvider } from "react-native-paystack-webview";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Context Providers
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { BookmarkProvider } from "./src/context/BookmarkContext";
import { OfflineProvider } from "./src/context/OfflineContext";
import { ThemeProvider } from "./src/styles/theme";
import { AlertProvider } from "./src/contexts/AlertContext";
import { ToastProvider } from "./src/contexts/ToastContext";

// Navigation
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/onboarding/OnboardingScreen";

// Services
import deepLinking from "./src/services/deepLinking";

// Error Boundary
import ErrorBoundary from "./src/components/ErrorBoundary";

// Utils
import { APP_CONFIG } from "./src/utils/constants";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = React.useRef();

  useEffect(() => {
    checkFirstLaunch();
    registerForPushNotifications();
    setupNotificationListeners();

    // Initialize deep linking
    deepLinking.initialize(navigationRef);

    // Development logging removed for production
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        "onboardingCompleted"
      );
      if (onboardingCompleted === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error("Error checking first launch:", error);
      setIsFirstLaunch(false);
    } finally {
      setIsLoading(false);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      // Allow push notifications in development for testing
      console.log("🔥 Setting up push notifications...");

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      // Skip token generation in Expo Go
      if (!Constants.appOwnership) {
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await AsyncStorage.setItem("pushToken", token);

      // Register token with backend when user logs in
    } catch (error) {
      // Silently handle push notification errors in production
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Handle foreground notification display
      }
    );

    // Handle notification tapped
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  };

  const handleNotificationResponse = (response) => {
    const { notification } = response;
    const { data } = notification.request.content;

    // Handle deep linking based on notification data
    if (data?.type === "order_update") {
      // Navigate to order details
    } else if (data?.type === "meal_plan") {
      // Navigate to meal plan
    } else if (data?.type === "subscription") {
      // Navigate to subscription
    }
  };

  if (isLoading) {
    return null;
  }

  // Use the key from APP_CONFIG or fallback to hardcoded
  const paystackPublicKey =
    APP_CONFIG.PAYSTACK_PUBLIC_KEY ||
    "pk_test_c90af10dcc748a6c4e3cf481230abadd819037c1";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaystackProvider
        publicKey={paystackPublicKey} // FIXED: Use 'publicKey' not 'paystackKey' for v5
        currency="NGN" // FIXED: Simplified props for v5
        debug={__DEV__} // FIXED: Use __DEV__ boolean for debug
        onGlobalSuccess={(res) => {
          /* Handle success */
        }}
        onGlobalCancel={() => {
          /* Handle cancel */
        }}
        // REMOVED: Old v4 props that don't exist in v5
        // billingEmail, channels, onGlobalError, refParams are not v5 props
      >
        <SafeAreaProvider>
          <ErrorBoundary>
            <OfflineProvider>
              <AuthProvider>
                <CartProvider>
                  <ToastProvider>
                    {({ showNotificationToast }) => (
                      <NotificationProvider
                        showToastNotification={showNotificationToast}
                      >
                        <BookmarkProvider>
                          <ThemeProvider>
                            <AlertProvider>
                              <NavigationContainer ref={navigationRef}>
                                <StatusBar style="auto" />
                                <AppNavigator
                                  isFirstLaunch={isFirstLaunch}
                                  onOnboardingComplete={() =>
                                    setIsFirstLaunch(false)
                                  }
                                />
                              </NavigationContainer>
                            </AlertProvider>
                          </ThemeProvider>
                        </BookmarkProvider>
                      </NotificationProvider>
                    )}
                  </ToastProvider>
                </CartProvider>
              </AuthProvider>
            </OfflineProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </PaystackProvider>
    </GestureHandlerRootView>
  );
}
