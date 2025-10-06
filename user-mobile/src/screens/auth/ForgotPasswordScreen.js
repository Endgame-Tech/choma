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
  Image,
  Dimensions,
  Animated,
  Easing,
  Keyboard,
  SafeAreaView,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { APP_CONFIG } from "../../utils/constants";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import ChomaLogo from "../../components/ui/ChomaLogo";
import LoginCurve from "../../components/ui/LoginCurve";

const { width, height } = Dimensions.get("window");

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code, 3: New password
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSendCode = async () => {
    if (!email.trim()) {
      showError("Error", "Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      showError("Error", "Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStep(2);
        showSuccess("Success", "Reset code sent to your email address");
      } else {
        showError("Error", data.message || "Failed to send reset code");
      }
    } catch (error) {
      console.error("Send code error:", error);
      showError("Error", "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!resetCode.trim()) {
      showError("Error", "Please enter the reset code");
      return;
    }

    if (resetCode.length !== 6) {
      showError("Error", "Reset code must be 6 digits");
      return;
    }

    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showError("Error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      showError("Error", "Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Error", "Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            resetCode: resetCode.trim(),
            newPassword: newPassword.trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        showSuccess(
          "Success",
          "Password reset successfully. You can now login with your new password.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
      } else {
        showError("Error", data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      showError("Error", "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a reset code
        </Text>
      </View>

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
            placeholder="Email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoading && styles.actionButtonDisabled,
          ]}
          onPress={handleSendCode}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              Send Reset Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Enter Reset Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to {email}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="key-outline"
            size={20}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#999"
            value={resetCode}
            onChangeText={setResetCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleVerifyCode}
        >
          <Text style={styles.actionButtonText}>Verify Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.linkButtonText}>
            Change email address
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoading && styles.actionButtonDisabled,
          ]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              Reset Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

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
          {/* <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity> */}

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
          <LoginCurve />
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
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signInLink}>Sign In</Text>
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
    paddingTop: Platform.OS === "ios" ? 30 : 30,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    position: "absolute",
    top: 70,
    left: 20,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    // marginBottom: 10,
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
    // borderRadius: 130,
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
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
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
  eyeIcon: {
    padding: 8,
  },
  actionButton: {
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
  buttonGradient: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "500",
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
  signInLink: {
    color: "#E6B17A",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 30,
  },
});

export default ForgotPasswordScreen;
