import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import biometricAuth from "../../services/biometricAuth";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const BiometricLogin = ({ onSuccess, onError, style }) => {
  const { isDark, colors } = useTheme();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  const { loginWithBiometric } = useAuth();
  const { showError } = useAlert();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      setLoading(true);

      const canUse = await biometricAuth.canUseBiometricLogin();
      setIsAvailable(canUse);

      if (canUse) {
        const enabled = await biometricAuth.isBiometricEnabled();
        setIsEnabled(enabled);

        const type = biometricAuth.getBiometricTypeString();
        setBiometricType(type);
      }
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (authenticating) return;

    try {
      setAuthenticating(true);

      const result = await biometricAuth.authenticateForLogin();

      if (result.success) {
        if (loginWithBiometric) {
          const loginResult = await loginWithBiometric();
          if (loginResult.success) {
            onSuccess && onSuccess();
          } else {
            onError && onError(loginResult.error || "Login failed");
            showError(
              "Login Failed",
              loginResult.error ||
                "Failed to log in with biometric authentication."
            );
          }
        } else {
          // Fallback if loginWithBiometric is not available
          onSuccess && onSuccess();
        }
      } else {
        onError && onError(result.error);

        if (result.errorCode !== "user_cancel") {
          showError(
            "Authentication Failed",
            result.error || "Biometric authentication failed. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error during biometric login:", error);
      onError && onError(error.message);
      showError(
        "Error",
        "An error occurred during biometric authentication. Please try again."
      );
    } finally {
      setAuthenticating(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType.includes("Face")) {
      return "face-recognition";
    } else if (
      biometricType.includes("Touch") ||
      biometricType.includes("Fingerprint")
    ) {
      return "finger-print";
    } else if (biometricType.includes("Iris")) {
      return "eye";
    }
    return "shield-checkmark";
  };

  if (loading) {
    return (
      <View style={[styles(colors).container, style]}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles(colors).loadingText}>
          Checking biometric availability...
        </Text>
      </View>
    );
  }

  if (!isAvailable || !isEnabled) {
    return null;
  }

  return (
    <View style={[styles(colors).container, style]}>
      <Text style={styles(colors).orText}>or</Text>
      <TouchableOpacity
        style={[
          styles(colors).biometricButton,
          authenticating && styles(colors).buttonDisabled,
        ]}
        onPress={handleBiometricLogin}
        disabled={authenticating}
        activeOpacity={0.9}
      >
        {authenticating ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons
            name={getBiometricIcon()}
            size={35}
            color={colors.primary}
          />
        )}
      </TouchableOpacity>
      <Text style={styles(colors).biometricText}>
        Sign in with {biometricType}
      </Text>
    </View>
  );
};
const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      alignItems: "center",
      marginVertical: 20,
    },
    biometricButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBackground || "#ffffff40",
      paddingVertical: 20,
      paddingHorizontal: 25,
      borderRadius: 80,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.primaryLight || "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    orText: {
      fontSize: 14,
      color: colors.textSecondary || "#666666",
      textAlign: "center",
      marginBottom: 12,
    },
    biometricText: {
      fontSize: 12,
      color: colors.textSecondary || "#666666",
      textAlign: "center",
      marginTop: 8,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary || "#666666",
      marginLeft: 8,
    },
  });

export default BiometricLogin;
