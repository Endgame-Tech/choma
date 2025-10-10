import React, { useState, useEffect, useRef } from "react";
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
  ImageBackground,
  Image,
  Dimensions,
  Animated,
  Easing,
  Keyboard,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import ChomaLogo from "../../components/ui/ChomaLogo";
import LoginCurve from "../../components/ui/LoginCurve";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import ErrorBoundary from "../../components/ErrorBoundary";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const CompleteSignupScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { userData } = route.params || {};

  // Animation for smooth keyboard transitions
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [topSectionOffset] = useState(new Animated.Value(0));

  // Rotation animation for the food image (slow spin)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000, // 20 seconds per full rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [rotateAnim]);

  // Smooth keyboard animation listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        // White form section - move up more (original amount)
        Animated.timing(keyboardOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: -event.endCoordinates.height * 0.3, // Keep white form moving up by 30%
          useNativeDriver: false,
        }).start();

        // Top section (logo + food image) - move up less
        Animated.timing(topSectionOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: -event.endCoordinates.height * 0.1, // Logo and food image move up only 10%
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Reset both animations
        Animated.timing(keyboardOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: 0,
          useNativeDriver: false,
        }).start();

        Animated.timing(topSectionOffset, {
          duration: Platform.OS === "ios" ? 300 : 250,
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardOffset, topSectionOffset]);

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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#652815" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#dc3545" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            Registration data is missing. Please start the registration process
            again.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate("Signup")}
          >
            <Text style={styles.errorButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#652815" />

      {/* Background with brown color and pattern */}
      <View style={styles.backgroundContainer}>
        <ImageBackground
          source={require("../../../assets/patternchoma.png")}
          style={styles.backgroundPattern}
          resizeMode="repeat"
          imageStyle={styles.backgroundImageStyle}
        />

        {/* Top section with logo and food image */}
        <Animated.View
          style={[
            styles.topSection,
            { transform: [{ translateY: topSectionOffset }] },
          ]}
        >
          <View style={styles.logoContainer}>
            <ChomaLogo width={150} height={82} />
          </View>

          {/* Food Image (slow rotating) */}
          <View style={styles.foodImageContainer}>
            <Animated.Image
              source={require("../../../assets/authImage.png")}
              style={[
                styles.foodImage,
                { transform: [{ rotate: rotateInterpolate }] },
              ]}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Curved transition */}
        <Animated.View
          style={[{
            transform: [{ translateY: keyboardOffset }],
            zIndex: 4
          }]}
        >
          <LoginCurve style={{ zIndex: 4 }} />
        </Animated.View>

        {/* Bottom white section with form */}
        <Animated.View
          style={[
            styles.bottomSection,
            { transform: [{ translateY: keyboardOffset }] },
          ]}
        >
          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            enableOnAndroid={true}
            keyboardDismissMode="interactive"
          >
            {/* Welcome text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Almost Done!</Text>
              <Text style={styles.welcomeSubtitle}>
                Your email has been verified. Ready to complete your registration?
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="person-circle"
                  size={24}
                  color="#E6B17A"
                />
                <Text style={styles.summaryTitle}>Account Summary</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Name</Text>
                <Text style={styles.summaryValue}>
                  {userData.firstName} {userData.lastName}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Email</Text>
                <View style={styles.emailContainer}>
                  <Text style={styles.summaryValue}>
                    {userData.email}
                  </Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#4CAF50"
                  />
                </View>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Phone</Text>
                <Text style={styles.summaryValue}>
                  {userData.phone}
                </Text>
              </View>

              {userData.deliveryAddress && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>
                    Delivery Address
                  </Text>
                  <Text style={styles.summaryValue}>
                    {userData.deliveryAddress}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.completeButton,
                isLoading && styles.completeButtonDisabled,
              ]}
              onPress={handleCompleteSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>
                  Complete Registration
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By completing registration, you agree to our{" "}
              </Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add some bottom padding for better scrolling */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flex: 1,
    backgroundColor: "#652815",
  },
  backgroundContainer: {
    flex: 1,
    position: "relative",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#652815",
    opacity: 0.8,
  },
  backgroundImageStyle: {
    opacity: 1,
    transform: [{ scale: 2.5 }],
  },
  topSection: {
    flex: 0.5,
    paddingTop: Platform.OS === "ios" ? 30 : 70,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  foodImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  foodImage: {
    width: 360,
    height: 350,
    borderRadius: 130,
  },
  bottomSection: {
    flex: 0.75,
    backgroundColor: "#fff",
    minHeight: height * 0.1,
    zIndex: 5,
    position: "relative",
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 70,
    justifyContent: "center",
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  summaryCard: {
    // backgroundColor: "#f8f8f8",
    borderRadius: 25,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  summaryItem: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completeButton: {
    backgroundColor: "#652815",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#652815",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  footerLink: {
    fontSize: 12,
    color: "#E6B17A",
    textDecorationLine: "underline",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#652815",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
    opacity: 0.8,
  },
  errorButton: {
    backgroundColor: "#E6B17A",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  errorButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 30,
  },
});

export default CompleteSignupScreen;
