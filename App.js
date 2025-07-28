import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { PaystackProvider } from 'react-native-paystack-webview';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { BookmarkProvider } from './src/context/BookmarkContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { ThemeProvider } from './src/styles/theme';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';

// Services
import deepLinking from './src/services/deepLinking';

// Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

// Utils
import { APP_CONFIG } from './src/utils/constants';

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
    
    // Log important app configuration 
    if (__DEV__) {
      console.log('=== APP CONFIGURATION ===');
      console.log('API Base URL:', APP_CONFIG.API_BASE_URL);
      console.log('Paystack Public Key:', APP_CONFIG.PAYSTACK_PUBLIC_KEY);
      console.log('=========================');
    }
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      if (onboardingCompleted === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(false);
    } finally {
      setIsLoading(false);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      // Skip push notifications in development to avoid errors
      if (__DEV__) {
        console.log('Skipping push notifications in development mode');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Check if running in Expo Go - skip token generation to avoid errors
      if (!Constants.appOwnership) {
        console.log('Running in Expo Go - skipping push token generation');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push notification token:', token);
      await AsyncStorage.setItem('pushToken', token);
      
      // TODO: Register token with backend when user logs in
    } catch (error) {
      console.log('Push notifications not available in development:', error.message);
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle foreground notification display
    });

    // Handle notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
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
    if (data?.type === 'order_update') {
      // Navigate to order details
      console.log('Navigate to order:', data.orderId);
    } else if (data?.type === 'meal_plan') {
      // Navigate to meal plan
      console.log('Navigate to meal plan:', data.mealPlanId);
    } else if (data?.type === 'subscription') {
      // Navigate to subscription
      console.log('Navigate to subscription');
    }
  };

  if (isLoading) {
    return null;
  }

  // Use the key from APP_CONFIG or fallback to hardcoded
  const paystackPublicKey = APP_CONFIG.PAYSTACK_PUBLIC_KEY || "pk_test_c90af10dcc748a6c4e3cf481230abadd819037c1";
  console.log('PaystackProvider v5 using publicKey:', paystackPublicKey);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaystackProvider
        publicKey={paystackPublicKey} // FIXED: Use 'publicKey' not 'paystackKey' for v5
        currency="NGN" // FIXED: Simplified props for v5
        debug={__DEV__} // FIXED: Use __DEV__ boolean for debug
        onGlobalSuccess={(res) => console.log('Global Paystack Success:', res)}
        onGlobalCancel={() => console.log('Global Paystack Cancel')}
        // REMOVED: Old v4 props that don't exist in v5
        // billingEmail, channels, onGlobalError, refParams are not v5 props
      >
        <SafeAreaProvider>
          <ErrorBoundary>
            <OfflineProvider>
              <AuthProvider>
                <CartProvider>
                  <NotificationProvider>
                    <BookmarkProvider>
                      <ThemeProvider>
                        <NavigationContainer ref={navigationRef}>
                          <StatusBar style="auto" />
                          <AppNavigator isFirstLaunch={isFirstLaunch} onOnboardingComplete={() => setIsFirstLaunch(false)} />
                        </NavigationContainer>
                      </ThemeProvider>
                    </BookmarkProvider>
                  </NotificationProvider>
                </CartProvider>
              </AuthProvider>
            </OfflineProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
    </PaystackProvider>
    </GestureHandlerRootView>
  );
}