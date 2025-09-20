import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import ChomaLogo from "../../components/ui/ChomaLogo";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import ErrorBoundary from "../../components/ErrorBoundary";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const CompleteSignupScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { userData } = route.params || {};

  const handleCompleteSignup = async () => {
    if (!userData || !userData.emailVerified) {
      showError("Error", "Email verification is required");
      navigation.goBack();
      return;
    }

    try {
      setIsLoading(true);

      const result = await signup({
        ...userData,
        emailVerified: true,
        verificationToken: userData.verificationToken,
      });

      if (result.success) {
        // Account created successfully and user is now authenticated
        showSuccess("Welcome!", "Your account has been created successfully");

        // Small delay to ensure state is properly updated before navigation
        setTimeout(() => {
          // The AuthContext will handle navigation to the appropriate screen
          // based on authentication state
        }, 1000);
      } else {
        showError(
          "Registration Error",
          result.message || "Unable to create your account. Please try again."
        );
      }
    } catch (error) {
      console.error("Complete signup error:", error);
      showError(
        "Registration Error",
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={60} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Something went wrong</Text>
          <Text style={styles(colors).errorText}>
            Registration data is missing. Please start the registration process
            again.
          </Text>
          <TouchableOpacity
            style={styles(colors).errorButton}
            onPress={() => navigation.navigate("Signup")}
          >
            <Text style={styles(colors).errorButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={styles(colors).container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles(colors).scrollContainer}>
          <View style={styles(colors).content}>
            <View style={styles(colors).logoContainer}>
              <View style={styles(colors).logoBackground}>
                <ChomaLogo width={100} height={60} />
              </View>
              <Text style={styles(colors).title}>Almost Done!</Text>
              <Text style={styles(colors).subtitle}>
                Your email has been verified. Ready to complete your
                registration?
              </Text>
            </View>

            <View style={styles(colors).summaryCard}>
              <View style={styles(colors).summaryHeader}>
                <Ionicons
                  name="person-circle"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles(colors).summaryTitle}>Account Summary</Text>
              </View>

              <View style={styles(colors).summaryItem}>
                <Text style={styles(colors).summaryLabel}>Name</Text>
                <Text style={styles(colors).summaryValue}>
                  {userData.firstName} {userData.lastName}
                </Text>
              </View>

              <View style={styles(colors).summaryItem}>
                <Text style={styles(colors).summaryLabel}>Email</Text>
                <View style={styles(colors).emailContainer}>
                  <Text style={styles(colors).summaryValue}>
                    {userData.email}
                  </Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success}
                  />
                </View>
              </View>

              <View style={styles(colors).summaryItem}>
                <Text style={styles(colors).summaryLabel}>Phone</Text>
                <Text style={styles(colors).summaryValue}>
                  {userData.phone}
                </Text>
              </View>

              <View style={styles(colors).summaryItem}>
                <Text style={styles(colors).summaryLabel}>
                  Delivery Address
                </Text>
                <Text style={styles(colors).summaryValue}>
                  {userData.deliveryAddress}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles(colors).completeButton,
                isLoading && styles(colors).completeButtonDisabled,
              ]}
              onPress={handleCompleteSignup}
              disabled={isLoading}
            >
              <LinearGradient
                colors={
                  isLoading
                    ? [colors.textMuted, colors.textMuted]
                    : ["#652815", "#652815"]
                }
                style={styles(colors).buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles(colors).completeButtonText}>
                    Complete Registration
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles(colors).footer}>
              <Text style={styles(colors).footerText}>
                By completing registration, you agree to our{" "}
              </Text>
              <TouchableOpacity>
                <Text style={styles(colors).footerLink}>
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: "center",
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 40,
    },
    logoBackground: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      marginBottom: 30,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 12,
    },
    summaryItem: {
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    emailContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    completeButton: {
      borderRadius: THEME.borderRadius.medium,
      overflow: "hidden",
      marginBottom: 20,
    },
    buttonGradient: {
      height: 50,
      justifyContent: "center",
      alignItems: "center",
    },
    completeButtonDisabled: {
      opacity: 0.6,
    },
    completeButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    footer: {
      alignItems: "center",
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    footerLink: {
      fontSize: 12,
      color: colors.primary,
      textDecorationLine: "underline",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 30,
    },
    errorButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: THEME.borderRadius.medium,
    },
    errorButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default CompleteSignupScreen;
