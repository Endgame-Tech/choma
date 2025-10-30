// src/screens/auth/LoginScreen.js - New UI Design
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
// import { COLORS, THEME } from "../../utils/colors";
import { useTheme } from "../../styles/theme";
import BiometricLogin from "../../components/auth/BiometricLogin";

import ChomaLogo from "../../components/ui/ChomaLogo";
import LoginCurve from "../../components/ui/LoginCurve";
import CustomIcon from "../../components/ui/CustomIcon";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(true);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);

  // NEW: State to toggle between initial view and email form
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Animation for smooth keyboard transitions
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [topSectionOffset] = useState(new Animated.Value(0));

  const { login, storeBiometricCredentials } = useAuth();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

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

  // Check if we can go back when component mounts
  useEffect(() => {
    setCanGoBack(navigation.canGoBack());
  }, [navigation]);

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

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});

    // Validation
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      setLoginAttempts((prev) => prev + 1);

      console.log("Attempting login with:", { email: email.trim() });

      const result = await login({ email: email.trim(), password });

      if (result.success) {
        // Store credentials for biometric login
        await storeBiometricCredentials({ email: email.trim(), password });
        setErrors({});
        setLoginAttempts(0);
      } else {
        // Set specific error based on response
        const errorMessage = result.message || result.error || "Login failed";

        // Handle specific error cases
        if (
          errorMessage.toLowerCase().includes("deleted") ||
          errorMessage.toLowerCase().includes("deactivated") ||
          errorMessage.toLowerCase().includes("suspended")
        ) {
          setErrors({ general: errorMessage });
          showError("Account Issue", errorMessage);
        } else if (
          errorMessage.toLowerCase().includes("password") ||
          errorMessage.toLowerCase().includes("credential") ||
          errorMessage.toLowerCase().includes("invalid") ||
          result.statusCode === 401
        ) {
          setErrors({
            password:
              loginAttempts >= 2
                ? "Incorrect password. Check your password and try again."
                : "Incorrect password",
            general:
              loginAttempts >= 2
                ? "Multiple failed attempts. Please verify your credentials."
                : undefined,
          });

          // Show alert for multiple attempts
          if (loginAttempts >= 2) {
            showError(
              "Login Failed",
              "Multiple failed attempts. Please verify your email and password are correct."
            );
          }
        } else if (
          errorMessage.toLowerCase().includes("email") ||
          errorMessage.toLowerCase().includes("user not found")
        ) {
          setErrors({ email: "No account found with this email address" });
        } else if (
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("connection")
        ) {
          setErrors({
            general:
              "Network error. Please check your connection and try again.",
          });
        } else {
          // For any other specific error messages, show them directly
          setErrors({ general: errorMessage });

          // Show alert for serious errors or after multiple attempts
          if (loginAttempts >= 2 || result.statusCode >= 400) {
            showError("Login Failed", errorMessage);
          }
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        general:
          "Something went wrong. Please check your connection and try again.",
      });

      if (loginAttempts >= 2) {
        showError(
          "Connection Error",
          "Unable to connect to our servers. Please try again later."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log("🔘 Starting Google Sign-In...");
      const result = await signInWithGoogle();

      console.log("🔍 Google Sign-In result:", {
        success: result?.success,
        needsPhoneNumber: result?.needsPhoneNumber,
        hasUser: !!result?.user,
        userPhone: result?.user?.phoneNumber || result?.user?.phone,
      });

      if (result?.success) {
        console.log("✅ Google Sign-In successful");

        // Check if phone number is needed
        if (result.needsPhoneNumber) {
          console.log(
            "📱 Phone number required, navigating to AddPhoneNumber screen"
          );
          navigation.navigate("AddPhoneNumber", {
            userData: result.user,
            skipable: false, // Make it mandatory for new Google users
          });
          return; // Important: prevent further navigation
        } else {
          console.log("📱 Phone number exists, proceeding to main app");
          showSuccess(
            "Welcome!",
            `Signed in as ${result.user?.displayName || result.user?.email}`
          );
          // Navigation to main app will be handled by auth context
        }
      } else if (result?.cancelled) {
        console.log("🚫 Google Sign-In cancelled by user");
        // Don't show error for user cancellation
      } else {
        console.error("❌ Google Sign-In failed:", result?.error);
        showError(
          "Google Sign-In Failed",
          result?.error || "Unable to sign in with Google. Please try again."
        );
      }
    } catch (error) {
      console.error("❌ Google Sign-In Error:", error);
      showError(
        "Sign-In Error",
        "An unexpected error occurred. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

      {/* Background with gradient */}
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.backgroundContainer}
      >
        {/* Pattern overlay on gradient */}
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
          style={[{ transform: [{ translateY: keyboardOffset }] }]}
        >
          <LoginCurve style={styles.loginCurveCustom} />
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
              <Text style={styles.welcomeTitle}>
                {showEmailForm ? "Welcome Back" : "Welcome to \n getChoma"}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {showEmailForm
                  ? "It's been a minute!"
                  : "Sign in to get started"}
              </Text>
            </View>

            {/* Initial View: Google + Email buttons */}
            {!showEmailForm ? (
              <>
                {/* Continue With Google Button */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    googleLoading && styles.googleButtonDisabled,
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#333" size="small" />
                  ) : (
                    <>
                      <Image
                        source={require("../../../assets/Google Icon.png")}
                        style={styles.googleIcon}
                      />
                      <Text style={styles.googleButtonText}>
                        Continue With Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* OR Divider */}
                <View style={styles.orContainer}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Continue With Email Button */}
                <TouchableOpacity
                  style={styles.emailButton}
                  onPress={() => setShowEmailForm(true)}
                >
                  <CustomIcon
                    name="email"
                    size={20}
                    color="#004432"
                    style={styles.emailButtonIcon}
                  />
                  <Text style={styles.emailButtonText}>
                    Continue With Email
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>
                    I do not have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("EmailInput")}
                  >
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <BiometricLogin />
              </>
            ) : (
              <>
                {/* Back to Initial View Button */}
                <TouchableOpacity
                  style={styles.backToOptionsButton}
                  onPress={() => {
                    setShowEmailForm(false);
                    setErrors({});
                    setEmail("");
                    setPassword("");
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#004432" />
                  <Text style={styles.backToOptionsText}>
                    Back to sign in options
                  </Text>
                </TouchableOpacity>

                {/* Email Form View */}
                <>
                  {/* Form inputs */}
                  <View style={styles.form}>
                    {/* General error message */}
                    {errors.general && (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color="#dc3545"
                        />
                        <Text style={styles.errorText}>{errors.general}</Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.inputContainer,
                        errors.email && styles.inputContainerError,
                      ]}
                    >
                      <CustomIcon
                        name="email"
                        size={20}
                        color={errors.email ? "#dc3545" : "#999"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor={errors.email ? "#dc3545" : "#999"}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (errors.email) {
                            setErrors((prev) => ({ ...prev, email: null }));
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {errors.email && (
                      <View style={styles.fieldErrorContainer}>
                        <Text style={styles.fieldErrorText}>
                          {errors.email}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.inputContainer,
                        errors.password && styles.inputContainerError,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={errors.password ? "#dc3545" : "#999"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={
                          errors.password ? "#dc3545" : "#999"
                        }
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (errors.password) {
                            setErrors((prev) => ({
                              ...prev,
                              password: null,
                            }));
                          }
                        }}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color={errors.password ? "#dc3545" : "#999"}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <View style={styles.fieldErrorContainer}>
                        <Text style={styles.fieldErrorText}>
                          {errors.password}
                        </Text>
                      </View>
                    )}

                    {/* Forgot Password */}
                    <TouchableOpacity
                      style={styles.forgotPasswordContainer}
                      onPress={() => navigation.navigate("ForgotPassword")}
                    >
                      <Text style={styles.forgotPasswordText}>
                        Forgot Password
                      </Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                      style={[
                        styles.loginButton,
                        isLoading && styles.loginButtonDisabled,
                      ]}
                      onPress={handleLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <View style={styles.signupContainer}>
                      <Text style={styles.signupText}>
                        I do not have an account?{" "}
                      </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate("EmailInput")}
                      >
                        <Text style={styles.signupLink}>Sign Up</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <BiometricLogin />
                </>
              </>
            )}

            {/* Add some bottom padding for better scrolling */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flex: 1,
    backgroundColor: "#004432",
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
    opacity: 0.7, // Subtle pattern overlay
  },
  backgroundImageStyle: {
    opacity: 1,
    transform: [{ scale: 2.5 }], // Makes the pattern 2x bigger
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
    // marginBottom: 60, // More overlap with bottom section
    zIndex: 2,
  },
  foodImage: {
    width: 360,
    height: 350,
    borderRadius: 130,
  },
  loginCurveCustom: {
    // Push the curve down to reduce white space above the form
    bottom: -250, // Adjust this value: larger negative = curve goes down more
  },
  bottomSection: {
    flex: 0.55,
    backgroundColor: "#fff",
    // paddingTop: 30, // More space for overlapping food image
    // minHeight: height * 0.1,
    zIndex: 5, // Increased zIndex to be above the curve
    position: "relative", // Ensure positioning context
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    // paddingBottom: Platform.OS === "ios" ? 20 : 70, // Reduced padding for navigation bar
    paddingTop: 20,
    justifyContent: "flex-start", // Changed from center to top
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 8, // Reduced from 10
    marginTop: 0, // Reduced from 10
  },
  welcomeTitle: {
    fontSize: 22, // Reduced from 24
    fontWeight: "bold",
    color: "#333",
    lineHeight: 25,
    marginBottom: 5, // Reduced from 4
  },
  welcomeSubtitle: {
    fontSize: 13, // Reduced from 14
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 25,
    height: 48, // Reduced from 50
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // marginBottom: 12, // Added spacing
    marginHorizontal: 25, // Reduced from 30
    borderWidth: 1,
    borderColor: "#e8e8e8",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10, // Reduced from 12
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: "#333",
    fontSize: 15, // Reduced from 16
    fontWeight: "500",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12, // Reduced from 20
    marginHorizontal: 25, // Reduced from 30
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8e8e8",
  },
  orText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
    marginHorizontal: 16,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "#f8f8f8",
    borderRadius: 25,
    marginBottom: 16,
    paddingHorizontal: 20,
    height: 50,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  inputContainerError: {
    borderColor: "#dc3545",
    backgroundColor: "#fff5f5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: "#004432",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#004432",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 5,
    marginTop: -15,
    paddingHorizontal: 10,
  },
  forgotPasswordText: {
    color: "#1b1b1b",
    fontSize: 12,
    fontWeight: "500",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // marginTop: 10,
  },
  signupText: {
    color: "#666",
    fontSize: 14,
  },
  signupLink: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  fieldErrorContainer: {
    marginTop: -12,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  fieldErrorText: {
    color: "#dc3545",
    fontSize: 12,
    fontWeight: "500",
  },

  // NEW: Email button styles
  emailButton: {
    backgroundColor: "#fff",
    borderRadius: 25,
    height: 48, // Reduced from 50
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 25, // Reduced from 30
    marginBottom: 12, // Reduced from 20
    borderWidth: 2,
    borderColor: "#004432",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButtonIcon: {
    marginRight: 10, // Reduced from 12
  },
  emailButtonText: {
    color: "#004432",
    fontSize: 15, // Reduced from 16
    fontWeight: "600",
  },
  // NEW: Back to options button
  backToOptionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12, // Reduced from 20
    paddingVertical: 8, // Reduced from 10
  },
  backToOptionsText: {
    color: "#004432",
    fontSize: 13, // Reduced from 14
    fontWeight: "500",
    marginLeft: 6, // Reduced from 8
  },
});

export default LoginScreen;
