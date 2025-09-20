// App-full.js - Complete Driver Mobile App
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

// Providers
import { DriverAuthProvider } from './src/contexts/DriverAuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { ToastProvider } from './src/contexts/ToastContext';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import DriverRegistrationScreen from './src/screens/auth/DriverRegistrationScreen';
import DocumentUploadScreen from './src/screens/auth/DocumentUploadScreen';

// Main Screens
import DashboardScreen from './src/screens/dashboard/DashboardScreen';

// Theme
import { useTheme } from './src/styles/theme';

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

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Deliveries') {
            iconName = focused ? 'bicycle' : 'bicycle-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
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
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Deliveries" 
        component={PlaceholderScreen}
        options={{ tabBarLabel: 'Deliveries' }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={PlaceholderScreen}
        options={{ tabBarLabel: 'Earnings' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={PlaceholderScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Placeholder screen for tabs we haven't built yet
function PlaceholderScreen({ route }) {
  const { colors } = useTheme();
  
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20
    }}>
      <Ionicons name="construct" size={64} color={colors.textSecondary} />
      <Text style={{ 
        fontSize: 18, 
        color: colors.text, 
        marginTop: 16,
        fontWeight: '600'
      }}>
        {route.name} Screen
      </Text>
      <Text style={{ 
        fontSize: 14, 
        color: colors.textSecondary, 
        marginTop: 8,
        textAlign: 'center'
      }}>
        This screen will be implemented next.{'\n'}
        Navigation and basic structure is ready!
      </Text>
    </View>
  );
}

// Main App Component
export default function App() {
  return (
    <DriverAuthProvider>
      <LocationProvider>
        <AlertProvider>
          <ToastProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <Stack.Navigator
                initialRouteName="Login"
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
                {/* Auth Stack */}
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={DriverRegistrationScreen} />
                <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
                
                {/* Main App Stack */}
                <Stack.Screen name="Main" component={MainTabNavigator} />
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </AlertProvider>
      </LocationProvider>
    </DriverAuthProvider>
  );
}