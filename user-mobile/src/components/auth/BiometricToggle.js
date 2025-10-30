import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import biometricAuth from "../../services/biometricAuth";
import { useAlert } from "../../contexts/AlertContext";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const BiometricToggle = ({ style }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");
  const [loading, setLoading] = useState(true);
  const [securityLevel, setSecurityLevel] = useState("NONE");
  const { showError, showSuccess, showConfirm } = useAlert();

  useEffect(() => {
    initializeBiometric();
  }, []);

  const initializeBiometric = async () => {
    try {
      setLoading(true);

      const availability = await biometricAuth.isAvailable();
      setIsAvailable(availability.available);

      if (availability.available) {
        const enabled = await biometricAuth.isBiometricEnabled();
        setIsEnabled(enabled);

        const type = biometricAuth.getBiometricTypeString();
        setBiometricType(type);

        const level = await biometricAuth.getSecurityLevel();
        setSecurityLevel(level);
      }
    } catch (error) {
      console.error("Error initializing biometric:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (value) => {
    if (value) {
      // Enable biometric authentication
      const result = await biometricAuth.authenticateForSettings();

      if (result.success) {
        const success = await biometricAuth.setBiometricEnabled(true);
        if (success) {
          setIsEnabled(true);
          showSuccess(
            "Success",
            `${biometricType} authentication has been enabled for choma.`
          );
        } else {
          showError(
            "Error",
            "Failed to enable biometric authentication. Please try again."
          );
        }
      } else {
        showError(
          "Authentication Failed",
          result.error || "Biometric authentication failed. Please try again."
        );
      }
    } else {
      // Disable biometric authentication
      showConfirm(
        "Disable Biometric Authentication",
        `Are you sure you want to disable ${biometricType} authentication?`,
        async () => {
          const success = await biometricAuth.setBiometricEnabled(false);
          if (success) {
            setIsEnabled(false);
          } else {
            showError(
              "Error",
              "Failed to disable biometric authentication. Please try again."
            );
          }
        }
      );
    }
  };

  const getSecurityLevelText = () => {
    switch (securityLevel) {
      case "BIOMETRIC_STRONG":
        return "Strong";
      case "BIOMETRIC_WEAK":
        return "Weak";
      case "SECRET":
        return "Secret";
      default:
        return "None";
    }
  };

  const getSecurityLevelColor = () => {
    switch (securityLevel) {
      case "BIOMETRIC_STRONG":
        return "#4CAF50";
      case "BIOMETRIC_WEAK":
        return "#FF9800";
      case "SECRET":
        return "#2196F3";
      default:
        return "#757575";
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
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#4CAF50" />
        <Text style={styles.loadingText}>
          Checking biometric availability...
        </Text>
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#757575" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Biometric Authentication</Text>
          <Text style={styles.subtitle}>Not available on this device</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={getBiometricIcon()}
          size={24}
          color={isEnabled ? "#4CAF50" : "#757575"}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{biometricType} Authentication</Text>
        <Text style={styles.subtitle}>
          {isEnabled ? "Enabled" : "Disabled"} • Security:{" "}
          {getSecurityLevelText()}
        </Text>
      </View>

      <View style={styles.switchContainer}>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: "#767577", true: "#4CAF50" }}
          thumbColor={isEnabled ? "#F8FFFC" : "#f4f3f4"}
        />
      </View>
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#F8FFFC",
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
  },
  switchContainer: {
    marginLeft: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666666",
  },
});

export default BiometricToggle;
