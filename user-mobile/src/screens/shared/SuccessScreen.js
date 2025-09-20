// src/screens/shared/SuccessScreen.js - Success/Completion States
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const SuccessScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { type, title, subtitle, buttonText, navigateTo } = route.params || {};

  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderIllustration = () => {
    if (type === "order_completed") {
      return (
        <View style={styles(colors).illustrationContainer}>
          {/* Meditation Person with Food Icons */}
          <View style={styles(colors).personContainer}>
            <View style={styles(colors).personBody}>
              <View style={styles(colors).personHead} />
              <View style={styles(colors).personTorso} />
              <View style={styles(colors).personLegs} />
            </View>

            {/* Floating Food Icons */}
            <View style={[styles(colors).foodIcon, styles(colors).foodIcon1]}>
              <Ionicons name="restaurant" size={20} color={colors.error} />
            </View>
            <View style={[styles(colors).foodIcon, styles(colors).foodIcon2]}>
              <Ionicons name="pizza" size={18} color={colors.primary} />
            </View>
            <View style={[styles(colors).foodIcon, styles(colors).foodIcon3]}>
              <Ionicons name="cafe" size={16} color={colors.warning} />
            </View>
            <View style={[styles(colors).foodIcon, styles(colors).foodIcon4]}>
              <Ionicons name="wine" size={18} color={colors.secondary} />
            </View>
          </View>

          {/* Couch */}
          <View style={styles(colors).couch} />
        </View>
      );
    } else if (type === "order_cancelled") {
      return (
        <View style={styles(colors).illustrationContainer}>
          {/* Person with Food Delivery Icons */}
          <View style={styles(colors).deliveryPersonContainer}>
            <View style={styles(colors).deliveryPerson}>
              <View style={styles(colors).deliveryHead} />
              <View style={styles(colors).deliveryBody} />
              <View style={styles(colors).deliveryArm1} />
              <View style={styles(colors).deliveryArm2} />
            </View>

            {/* Floating Delivery Icons */}
            <View
              style={[
                styles(colors).deliveryIcon,
                styles(colors).deliveryIcon1,
              ]}
            >
              <Ionicons name="fast-food" size={24} color={colors.error} />
            </View>
            <View
              style={[
                styles(colors).deliveryIcon,
                styles(colors).deliveryIcon2,
              ]}
            >
              <Ionicons name="receipt" size={20} color={colors.primary} />
            </View>
            <View
              style={[
                styles(colors).deliveryIcon,
                styles(colors).deliveryIcon3,
              ]}
            >
              <Ionicons name="card" size={18} color={colors.warning} />
            </View>
          </View>
        </View>
      );
    }

    // Default success illustration
    return (
      <View style={styles(colors).defaultIllustration}>
        <View style={styles(colors).checkmarkContainer}>
          <Ionicons name="checkmark-circle" size={100} color={colors.primary} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles(colors).content}>
        {/* Illustration */}
        <Animated.View
          style={[
            styles(colors).illustrationWrapper,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {renderIllustration()}
        </Animated.View>

        {/* Text Content */}
        <Animated.View
          style={[styles(colors).textContent, { opacity: fadeAnim }]}
        >
          <Text style={styles(colors).title}>{title || "Yeay! Completed"}</Text>
          <Text style={styles(colors).subtitle}>
            {subtitle ||
              "Now you are able to order some foods as a self-reward"}
          </Text>
        </Animated.View>

        {/* Action Button */}
        <Animated.View
          style={[styles(colors).buttonContainer, { opacity: fadeAnim }]}
        >
          <TouchableOpacity
            style={styles(colors).actionButton}
            onPress={() => {
              if (navigateTo) {
                navigation.navigate(navigateTo);
              } else {
                // Navigate to the Main tab navigator and then to Home
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Main", params: { screen: "Home" } }],
                });
              }
            }}
          >
            <Text style={styles(colors).actionButtonText}>
              {buttonText || "Find Foods"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom Indicator */}
      <View style={styles(colors).bottomIndicator} />
    </SafeAreaView>
  );
};

// Usage examples for different success states:
export const OrderCompletedScreen = ({ navigation }) => (
  <SuccessScreen
    route={{
      params: {
        type: "order_completed",
        title: "Yeay! Completed",
        subtitle: "Now you are able to order some foods as a self-reward",
        buttonText: "Find Foods",
        navigateTo: "Home",
      },
    }}
    navigation={navigation}
  />
);

export const OrderCancelledScreen = ({ navigation }) => (
  <SuccessScreen
    route={{
      params: {
        type: "order_cancelled",
        title: "Okay! Your Order Has Been Canceled",
        subtitle: "Let's find another food for you to enjoy today!",
        buttonText: "Find Foods",
        navigateTo: "MealPlans",
      },
    }}
    navigation={navigation}
  />
);

export const SubscriptionSuccessScreen = ({ navigation }) => (
  <SuccessScreen
    route={{
      params: {
        type: "subscription_success",
        title: "Welcome to choma!",
        subtitle:
          "Your subscription is now active. Get ready for delicious, healthy meals!",
        buttonText: "View My Plan",
        navigateTo: "Dashboard",
      },
    }}
    navigation={navigation}
  />
);

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    illustrationWrapper: {
      marginBottom: 60,
    },
    illustrationContainer: {
      width: 280,
      height: 200,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      position: "relative",
    },

    // Meditation Person (Order Completed)
    personContainer: {
      position: "relative",
      marginBottom: 20,
    },
    personBody: {
      alignItems: "center",
    },
    personHead: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      marginBottom: 5,
    },
    personTorso: {
      width: 50,
      height: 60,
      backgroundColor: colors.error,
      borderRadius: 25,
      marginBottom: 5,
    },
    personLegs: {
      width: 60,
      height: 40,
      backgroundColor: colors.warning,
      borderRadius: 20,
    },
    couch: {
      width: 120,
      height: 30,
      backgroundColor: colors.info,
      borderRadius: 15,
      position: "absolute",
      bottom: 20,
    },
    foodIcon: {
      position: "absolute",
      width: 35,
      height: 35,
      borderRadius: 17.5,
      backgroundColor: colors.white,
      justifyContent: "center",
      alignItems: "center",
      elevation: 3,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    foodIcon1: {
      top: 10,
      left: 20,
    },
    foodIcon2: {
      top: 30,
      right: 15,
    },
    foodIcon3: {
      bottom: 60,
      left: 10,
    },
    foodIcon4: {
      bottom: 40,
      right: 25,
    },

    // Delivery Person (Order Cancelled)
    deliveryPersonContainer: {
      position: "relative",
      backgroundColor: colors.successLight,
      borderRadius: 20,
      padding: 20,
    },
    deliveryPerson: {
      alignItems: "center",
    },
    deliveryHead: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
      backgroundColor: colors.secondary,
      marginBottom: 5,
    },
    deliveryBody: {
      width: 45,
      height: 55,
      backgroundColor: colors.success,
      borderRadius: 22.5,
      marginBottom: 5,
    },
    deliveryArm1: {
      position: "absolute",
      top: 40,
      left: -10,
      width: 25,
      height: 8,
      backgroundColor: colors.secondary,
      borderRadius: 4,
      transform: [{ rotate: "45deg" }],
    },
    deliveryArm2: {
      position: "absolute",
      top: 40,
      right: -10,
      width: 25,
      height: 8,
      backgroundColor: colors.secondary,
      borderRadius: 4,
      transform: [{ rotate: "-45deg" }],
    },
    deliveryIcon: {
      position: "absolute",
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      justifyContent: "center",
      alignItems: "center",
      elevation: 3,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    deliveryIcon1: {
      top: -10,
      left: 30,
    },
    deliveryIcon2: {
      top: 20,
      right: -10,
    },
    deliveryIcon3: {
      bottom: 10,
      left: -5,
    },

    // Default Success
    defaultIllustration: {
      width: 200,
      height: 200,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.successLight,
      borderRadius: 100,
    },
    checkmarkContainer: {
      justifyContent: "center",
      alignItems: "center",
    },

    // Text Content
    textContent: {
      alignItems: "center",
      marginBottom: 50,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 15,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 10,
    },

    // Button
    buttonContainer: {
      width: "100%",
    },
    actionButton: {
      backgroundColor: colors.textMuted,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      width: "100%",
    },
    actionButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },

    // Bottom Indicator
    bottomIndicator: {
      width: 134,
      height: 5,
      backgroundColor: colors.text,
      borderRadius: 2.5,
      alignSelf: "center",
      marginBottom: 20,
    },
  });
