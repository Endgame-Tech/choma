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
  Dimensions,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
// import { COLORS, THEME } from "../../utils/colors";
import { useTheme } from "../../styles/theme";
import BiometricLogin from "../../components/auth/BiometricLogin";
import ChomaLogo from "../../components/ui/ChomaLogo";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

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

  // Animation for smooth keyboard transitions
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [topSectionOffset] = useState(new Animated.Value(0));

  const { login, storeBiometricCredentials } = useAuth();

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
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>It's been a minute!</Text>
            </View>

            {/* Form inputs */}
            <View style={styles.form}>
              {/* General error message */}
              {errors.general && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#dc3545" />
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
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
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
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
                  placeholderTextColor={errors.password ? "#dc3545" : "#999"}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={errors.password ? "#dc3545" : "#999"}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.fieldErrorContainer}>
                  <Text style={styles.fieldErrorText}>{errors.password}</Text>
                </View>
              )}

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

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password</Text>
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
    opacity: 0.8, // Subtle pattern overlay
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
  bottomSection: {
    flex: 0.75,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 30, // More space for overlapping food image
    minHeight: height * 0.1,
    zIndex: 3,
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
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
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
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#E6B17A",
    fontSize: 14,
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
  bottomPadding: {
    height: 30,
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
});

export default LoginScreen;
