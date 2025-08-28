import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  ImageBackground,
  Dimensions,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import ChomaLogo from "../../components/ui/ChomaLogo";
import { useAlert } from "../../contexts/AlertContext";
import apiService from "../../services/api";

const { width, height } = Dimensions.get("window");

const EmailVerificationScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const {
    email,
    purpose = "customer_registration",
    userData,
    fromEmailInput,
  } = route.params || {};

  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Refs for input focus management
  const inputRefs = useRef([]);

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

  useEffect(() => {
    if (!email) {
      showError("Error", "Email address is required");
      navigation.goBack();
      return;
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email]);

  // Handle code input change
  const handleCodeChange = (text, index) => {
    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all fields are filled
    if (newCode.every((digit) => digit !== "") && !isLoading) {
      handleVerifyCode(newCode.join(""));
    }
  };

  // Handle backspace to previous input
  const handleKeyPress = (key, index) => {
    if (key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify the email with the code
  const handleVerifyCode = async (code = null) => {
    const codeToVerify = code || verificationCode.join("");

    if (codeToVerify.length !== 6) {
      showError("Error", "Please enter the complete 6-digit code");
      return;
    }

    try {
      setIsLoading(true);

      const response = await apiService.verifyEmail({
        email,
        verificationCode: codeToVerify,
        purpose,
      });

      if (response.success) {
        showSuccess("Success", "Email verified successfully!");

        // Navigate based on where we came from
        if (fromEmailInput) {
          // Coming from EmailInputScreen - go to signup form
          navigation.navigate("Signup", {
            verifiedEmail: email,
            verificationToken: response.data.token,
          });
        } else if (purpose === "customer_registration" && userData) {
          // Coming from SignupScreen - complete registration
          navigation.navigate("CompleteSignup", {
            userData: {
              ...userData,
              emailVerified: true,
              verificationToken: response.data.token,
            },
          });
        } else {
          // Just go back or to appropriate screen
          navigation.goBack();
        }
      } else {
        showError(
          "Verification Failed",
          response.message || "Invalid verification code"
        );
        // Clear the code inputs on error
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Email verification error:", error);
      showError("Error", "Failed to verify email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (!canResend || isResending) return;

    try {
      setIsResending(true);

      const response = await apiService.resendVerificationCode({
        email,
        purpose,
      });

      if (response.success) {
        showSuccess("Code Sent", "New verification code sent to your email");
        setCountdown(60);
        setCanResend(false);
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        showError("Error", response.message || "Failed to resend code");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      showError("Error", "Failed to resend verification code");
    } finally {
      setIsResending(false);
    }
  };

  // Format countdown time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            {/* Header with back button */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Welcome text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Verify Your Email</Text>
              <Text style={styles.welcomeSubtitle}>We've sent a 6-digit code to</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Form inputs */}
            <View style={styles.form}>
              <View style={styles.codeContainer}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.codeInput,
                      digit && styles.codeInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(text) =>
                      handleCodeChange(text.replace(/[^0-9]/g, ""), index)
                    }
                    onKeyPress={({ nativeEvent: { key } }) =>
                      handleKeyPress(key, index)
                    }
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (isLoading || verificationCode.some((digit) => !digit)) &&
                    styles.verifyButtonDisabled,
                ]}
                onPress={() => handleVerifyCode()}
                disabled={isLoading || verificationCode.some((digit) => !digit)}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code?{" "}
                </Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={!canResend || isResending}
                  style={styles.resendButton}
                >
                  <Text
                    style={[
                      styles.resendButtonText,
                      (!canResend || isResending) &&
                        styles.resendButtonDisabled,
                    ]}
                  >
                    {isResending
                      ? "Sending..."
                      : canResend
                      ? "Resend Code"
                      : `Resend in ${formatTime(countdown)}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Check your spam folder if you don't see the email
              </Text>
            </View>

            {/* Add some bottom padding for better scrolling */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
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
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: "#E6B17A",
    fontWeight: "600",
    textAlign: "center",
  },
  form: {
    width: "100%",
    marginBottom: 30,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  codeInputFilled: {
    borderColor: "#E6B17A",
    backgroundColor: "#E6B17A10",
  },
  verifyButton: {
    backgroundColor: "#652815",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
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
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendButton: {
    padding: 4,
  },
  resendButtonText: {
    fontSize: 14,
    color: "#E6B17A",
    fontWeight: "600",
  },
  resendButtonDisabled: {
    color: "#999",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
  bottomPadding: {
    height: 30,
  },
});

export default EmailVerificationScreen;
