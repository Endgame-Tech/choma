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
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const EmailInputScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check email verification status when email changes
  const checkEmailStatus = async (emailToCheck) => {
    if (!emailToCheck || !validateEmail(emailToCheck)) {
      setIsAlreadyVerified(false);
      return;
    }

    try {
      setIsCheckingStatus(true);
      const statusResponse = await apiService.checkVerificationStatus(
        emailToCheck.trim(),
        "customer_registration"
      );

      // Handle nested response structure from API service
      const verificationData =
        statusResponse?.data?.data || statusResponse?.data;

      if (
        statusResponse &&
        statusResponse.success &&
        verificationData?.verified
      ) {
        setIsAlreadyVerified(true);
      } else {
        setIsAlreadyVerified(false);
      }
    } catch (error) {
      console.log("Status check failed:", error);
      setIsAlreadyVerified(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Debounce email status check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkEmailStatus(email);
    }, 1000); // Check status 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSendVerification = async () => {
    if (!email.trim()) {
      showError("Error", "Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      showError("Error", "Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Checking verification status for:", email.trim());

      // First check if email is already verified
      const statusResponse = await apiService.checkVerificationStatus(
        email.trim(),
        "customer_registration"
      );

      console.log(
        "Status check response:",
        JSON.stringify(statusResponse, null, 2)
      );

      // Handle nested response structure from API service
      const verificationData =
        statusResponse?.data?.data || statusResponse?.data;

      if (
        statusResponse &&
        statusResponse.success &&
        verificationData?.verified
      ) {
        console.log("Email already verified, navigating directly to signup");
        // showSuccess(
        //   "Email Already Verified",
        //   "Your email is verified. Proceeding to account creation."
        // );

        // Navigate directly to signup with verified email
        navigation.navigate("Signup", {
          verifiedEmail: email.trim(),
          verificationToken: verificationData.token,
        });
        return;
      }

      console.log(
        "Email not verified, sending verification code to:",
        email.trim()
      );

      const verificationResponse = await apiService.sendVerificationCode({
        email: email.trim(),
        purpose: "customer_registration",
      });

      console.log("Verification response:", verificationResponse);

      if (verificationResponse && verificationResponse.success) {
        showSuccess(
          "Verification Email Sent",
          "Please check your email for the verification code"
        );

        // Navigate to email verification screen
        console.log("Navigating to EmailVerification screen");
        navigation.navigate("EmailVerification", {
          email: email.trim(),
          purpose: "customer_registration",
          fromEmailInput: true,
        });
      } else {
        console.error("Verification failed:", verificationResponse);

        // TEMPORARY: For development/testing - navigate anyway
        console.log(
          "API failed, but navigating to EmailVerification for testing"
        );
        showError(
          "Development Mode",
          "Email service not available, but proceeding for testing"
        );

        navigation.navigate("EmailVerification", {
          email: email.trim(),
          purpose: "customer_registration",
          fromEmailInput: true,
        });
      }
    } catch (verificationError) {
      console.error("Verification API call failed:", verificationError);

      // TEMPORARY: For development/testing - navigate anyway
      console.log(
        "API call failed, but navigating to EmailVerification for testing"
      );
      showError(
        "Development Mode",
        "Connection failed, but proceeding for testing"
      );

      navigation.navigate("EmailVerification", {
        email: email.trim(),
        purpose: "customer_registration",
        fromEmailInput: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004432" />

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
              <Text style={styles.welcomeTitle}>Create Your Account</Text>
              <Text style={styles.welcomeSubtitle}>
                First lets verify your email address to
              </Text>
              <Text style={styles.welcomeSubtitle}>secure your account</Text>
            </View>

            {/* Form inputs */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#999"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
              </View>

              {/* Send Verification Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (isLoading || !email.trim()) && styles.verifyButtonDisabled,
                  isAlreadyVerified && styles.verifyButtonVerified,
                ]}
                onPress={handleSendVerification}
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : isCheckingStatus ? (
                  <View style={styles.buttonRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.verifyButtonText}>Checking...</Text>
                  </View>
                ) : isAlreadyVerified ? (
                  <View style={styles.buttonRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.verifyButtonText}>
                      Continue to Signup
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.verifyButtonText}>
                    Send Verification Code
                  </Text>
                )}
              </TouchableOpacity>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                {isAlreadyVerified ? (
                  <>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#4CAF50"
                      />
                      <Text style={[styles.infoText, { color: "#4CAF50" }]}>
                        Email already verified
                      </Text>
                    </View>
                    <Text style={styles.infoText}>
                      Ready to create your account
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.infoText}>
                      We'll send a 6-digit verification code
                    </Text>
                    <Text style={styles.infoText}>
                      Your email will be kept secure and private
                    </Text>
                    <Text style={styles.infoText}>
                      Code expires in 5 minutes for security
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: "#004432",
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
  },
  form: {
    width: "100%",
    marginBottom: 30,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  verifyButton: {
    backgroundColor: "#004432",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
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
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonVerified: {
    backgroundColor: "#4CAF50",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  loginLink: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 30,
  },
});

export default EmailInputScreen;
