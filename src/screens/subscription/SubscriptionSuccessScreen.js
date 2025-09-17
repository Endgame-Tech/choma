// src/screens/subscription/SubscriptionSuccessScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const SubscriptionSuccessScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { subscriptionId, mealPlan } = route.params || {};

  const handleViewSubscription = () => {
    navigation.navigate("SubscriptionDetails", { subscriptionId });
  };

  const handleGoHome = () => {
    // Navigate to the Main tab navigator and then to Home
    navigation.reset({
      index: 0,
      routes: [{ name: "Main", params: { screen: "Home" } }],
    });
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles(colors).content}
        contentContainerStyle={styles(colors).contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles(colors).animationContainer}>
          {/* Success icon */}
          <View style={styles(colors).successIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={100}
              color={colors.success}
            />
          </View>
        </View>

        <Text style={styles(colors).title}>Payment Successful!</Text>
        <Text style={styles(colors).subtitle}>
          Your subscription has been activated. You'll receive a confirmation
          email shortly.
        </Text>

        {mealPlan && (
          <View style={styles(colors).mealPlanCard}>
            <Image
              source={
                mealPlan.coverImage
                  ? { uri: mealPlan.coverImage }
                  : mealPlan.planImageUrl
                    ? { uri: mealPlan.planImageUrl }
                    : mealPlan.image
                      ? typeof mealPlan.image === "string"
                        ? { uri: mealPlan.image }
                        : mealPlan.image
                      : require("../../assets/images/meal-plans/fitfuel.jpg")
              }
              style={styles(colors).mealPlanImage}
              resizeMode="cover"
              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
              onError={(e) => {
                console.log("Image failed to load:", e.nativeEvent.error);
              }}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles(colors).imageGradient}
            />
            <View style={styles(colors).mealPlanOverlay}>
              <Text style={styles(colors).mealPlanName}>
                {mealPlan.planName || mealPlan.name || "Meal Plan"}
              </Text>
              <Text style={styles(colors).mealPlanSubtitle}>
                {mealPlan.description ||
                  mealPlan.subtitle ||
                  "Delicious meals delivered to you"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles(colors).infoCard}>
          <View style={styles(colors).infoRow}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles(colors).infoText}>
              Your first meal delivery will arrive soon! You can track
              deliveries in the app.
            </Text>
          </View>

          <View style={styles(colors).infoRow}>
            <Ionicons name="sync" size={24} color={colors.primary} />
            <Text style={styles(colors).infoText}>
              You can manage or cancel your subscription anytime from your
              profile.
            </Text>
          </View>

          <View style={styles(colors).infoRow}>
            <Ionicons name="notifications" size={24} color={colors.primary} />
            <Text style={styles(colors).infoText}>
              We'll send you notifications before each delivery.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles(colors).footer}>
        <TouchableOpacity
          style={[styles(colors).button, styles(colors).secondaryButton]}
          onPress={handleViewSubscription}
        >
          <Text
            style={[
              styles(colors).buttonText,
              styles(colors).secondaryButtonText,
            ]}
          >
            View Subscription
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).button} onPress={handleGoHome}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles(colors).buttonGradient}
          >
            <Text style={styles(colors).buttonText}>Go to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      alignItems: "center",
    },
    animationContainer: {
      marginVertical: 30,
      alignItems: "center",
    },
    successIconContainer: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: `${colors.success}15`,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 24,
    },
    mealPlanCard: {
      position: "relative",
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      height: 160,
      width: "100%",
      marginBottom: 25,
    },
    mealPlanImage: {
      width: "100%",
      height: "100%",
    },
    imageGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "70%",
    },
    mealPlanOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
    },
    mealPlanName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    mealPlanSubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
    },
    infoCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      width: "100%",
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      marginLeft: 15,
      lineHeight: 20,
    },
    footer: {
      padding: 20,
      gap: 10,
    },
    button: {
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
    },
    buttonGradient: {
      paddingVertical: 16,
      alignItems: "center",
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 16,
    },
    secondaryButtonText: {
      color: colors.primary,
    },
  });

export default SubscriptionSuccessScreen;
