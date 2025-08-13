// src/screens/auth/LoginScreen.js - Modern Dark Theme Update
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { COLORS, THEME } from "../../utils/colors";
import { useTheme } from "../../styles/theme";
import BiometricLogin from "../../components/auth/BiometricLogin";
import ChomaLogo from "../../components/ui/ChomaLogo";

const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(true);

  const { login, storeBiometricCredentials } = useAuth();

  // Check if we can go back when component mounts
  useEffect(() => {
    setCanGoBack(navigation.canGoBack());
  }, [navigation]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);

      console.log("Attempting login with:", { email: email.trim() });

      const result = await login({ email: email.trim(), password });

      if (result.success) {
        // Store credentials for biometric login
        await storeBiometricCredentials({ email: email.trim(), password });
        Alert.alert("Success", "Login successful!");
      } else {
        Alert.alert("Login Failed", result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      Alert.alert("Demo Login", "Successfully logged in as demo user!", [
        {
          text: "OK",
          onPress: () => {
            // The AppNavigator will automatically switch to Main when authenticated
            // No need to manually navigate
          },
        },
      ]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={styles(colors).container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles(colors).scrollContainer}>
          <View style={styles(colors).header}>
            {canGoBack && (
              <TouchableOpacity
                style={styles(colors).backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles(colors).content}>
            <View style={styles(colors).logoContainer}>
              <View style={styles(colors).logoBackground}>
                <ChomaLogo width={60} height={33} />
              </View>
              <Text style={styles(colors).title}>Welcome Back</Text>
              <Text style={styles(colors).subtitle}>
                Sign in to your Choma account
              </Text>
            </View>

            <BiometricLogin
              onSuccess={() => {
                // Biometric login successful
                console.log("Biometric login successful");
              }}
              onError={(error) => {
                console.error("Biometric login error:", error);
              }}
            />

            <View style={styles(colors).form}>
              <View style={styles(colors).inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles(colors).inputIcon}
                />
                <TextInput
                  style={styles(colors).input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles(colors).inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles(colors).inputIcon}
                />
                <TextInput
                  style={styles(colors).input}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles(colors).eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles(colors).loginButton,
                  isLoading && styles(colors).loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={
                    isLoading
                      ? [colors.textMuted, colors.textMuted]
                      : [colors.primary, colors.primaryDark]
                  }
                  style={styles(colors).buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles(colors).loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles(colors).optionsRow}>
                <TouchableOpacity 
                  style={styles(colors).forgotPassword}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles(colors).forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles(colors).footer}>
              <Text style={styles(colors).footerText}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles(colors).signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    backButton: {
      padding: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
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
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    form: {
      marginBottom: 30,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 16,
      color: colors.text,
    },
    eyeIcon: {
      padding: 4,
    },
    loginButton: {
      borderRadius: THEME.borderRadius.medium,
      overflow: "hidden",
      marginTop: 20,
    },
    buttonGradient: {
      height: 50,
      justifyContent: "center",
      alignItems: "center",
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: "600",
    },
    demoButton: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    demoButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "500",
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 16,
    },
    forgotPassword: {
      marginTop: 16,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    signupLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
  });

export default LoginScreen;
