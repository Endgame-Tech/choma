import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import apiService from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// Country codes with flags and ISO codes
const COUNTRIES = [
  {
    code: "+1",
    name: "United States",
    flag: "🇺🇸",
    format: "(###) ###-####",
    iso: "US",
  },
  {
    code: "+1",
    name: "Canada",
    flag: "🇨🇦",
    format: "(###) ###-####",
    iso: "CA",
  },
  {
    code: "+234",
    name: "Nigeria",
    flag: "🇳🇬",
    format: "### ### ####",
    iso: "NG",
  },
  {
    code: "+44",
    name: "United Kingdom",
    flag: "🇬🇧",
    format: "#### ######",
    iso: "GB",
  },
  {
    code: "+91",
    name: "India",
    flag: "🇮🇳",
    format: "##### #####",
    iso: "IN",
  },
  {
    code: "+86",
    name: "China",
    flag: "🇨🇳",
    format: "### #### ####",
    iso: "CN",
  },
  {
    code: "+81",
    name: "Japan",
    flag: "🇯🇵",
    format: "## #### ####",
    iso: "JP",
  },
  {
    code: "+49",
    name: "Germany",
    flag: "🇩🇪",
    format: "### ########",
    iso: "DE",
  },
  {
    code: "+33",
    name: "France",
    flag: "🇫🇷",
    format: "# ## ## ## ##",
    iso: "FR",
  },
  {
    code: "+39",
    name: "Italy",
    flag: "🇮🇹",
    format: "### ### ####",
    iso: "IT",
  },
  {
    code: "+34",
    name: "Spain",
    flag: "🇪🇸",
    format: "### ### ###",
    iso: "ES",
  },
  {
    code: "+61",
    name: "Australia",
    flag: "🇦🇺",
    format: "### ### ###",
    iso: "AU",
  },
  {
    code: "+55",
    name: "Brazil",
    flag: "🇧🇷",
    format: "## #####-####",
    iso: "BR",
  },
  {
    code: "+27",
    name: "South Africa",
    flag: "🇿🇦",
    format: "## ### ####",
    iso: "ZA",
  },
  {
    code: "+254",
    name: "Kenya",
    flag: "🇰🇪",
    format: "### ######",
    iso: "KE",
  },
  {
    code: "+233",
    name: "Ghana",
    flag: "🇬🇭",
    format: "### ### ####",
    iso: "GH",
  },
];

const AddPhoneNumberScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { setUser, setIsAuthenticated } = useAuth();

  // Get user data from route params (passed from Google Sign-In)
  const { userData, skipable = false } = route?.params || {};

  // Check if user already has phone (updating) or not (adding)
  const isUpdating = userData?.phone || userData?.phoneNumber;

  // Detect user's country and set as default
  const detectUserCountry = () => {
    try {
      // Get device's region code (e.g., "US", "NG", "GB")
      const regionCode = Localization.region;
      console.log("🌍 Detected region:", regionCode);

      // Find matching country in our list
      const detectedCountry = COUNTRIES.find(
        (country) => country.iso === regionCode
      );

      if (detectedCountry) {
        console.log("✅ Auto-selected country:", detectedCountry.name);
        return detectedCountry;
      }

      console.log("⚠️ Country not in list, using default (US)");
      return COUNTRIES[0]; // Default to US if not found
    } catch (error) {
      console.error("❌ Error detecting country:", error);
      return COUNTRIES[0]; // Default to US on error
    }
  };

  const [selectedCountry, setSelectedCountry] = useState(detectUserCountry());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const phoneInputRef = useRef(null);

  const isValidPhoneNumber = () => {
    // Basic validation: phone number should be at least 10 digits
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    return cleanedNumber.length >= 10;
  };

  const handleContinue = async () => {
    if (!isValidPhoneNumber()) {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number");
      return;
    }

    setLoading(true);

    try {
      const fullPhoneNumber = `${selectedCountry.code}${phoneNumber}`;

      console.log("📱 Updating phone number:", fullPhoneNumber);

      // Update user profile with phone number
      const response = await apiService.updateProfile({
        phoneNumber: fullPhoneNumber,
      });

      console.log("📱 Update response:", response);

      if (response.success) {
        // Update user data with phone number
        const updatedUserData = {
          ...userData,
          phoneNumber: fullPhoneNumber,
          phone: fullPhoneNumber,
        };

        console.log("✅ Phone number updated");

        // Update auth state with new phone number
        setUser(updatedUserData);

        // Check if this is a new Google signup or updating existing user
        // For new signups from Google, userData will exist and we need to complete auth
        // For existing users from Checkout/Profile, we just go back
        // We can tell if it's a new signup by checking if skipable is true (means they're in onboarding flow)
        const isNewGoogleSignup =
          userData && !userData.phoneNumber && !userData.phone && skipable;

        if (isNewGoogleSignup) {
          // New user from Google Sign-In, complete authentication
          console.log(
            "📱 New Google signup - Setting auth state and navigating to Home"
          );
          setIsAuthenticated(true);
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        } else {
          // User is already logged in, just go back to previous screen
          console.log("📱 Existing user - Going back to previous screen");
          navigation.goBack();
        }
      } else {
        throw new Error(response.message || "Failed to update phone number");
      }
    } catch (error) {
      console.error("Error updating phone number:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add phone number. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (skipable) {
      // Navigate to main app without phone number
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, "");

    // Format as user types (e.g., (123) 456-7890)
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(
        3,
        6
      )}-${cleaned.slice(6, 10)}`;
    }

    return formatted;
  };

  const handlePhoneChange = (text) => {
    // Remove formatting for storage
    const cleaned = text.replace(/\D/g, "");
    setPhoneNumber(cleaned);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.wrapper}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (skipable) {
                handleSkip();
              } else {
                Alert.alert(
                  "Phone Number Required",
                  "A phone number is required for delivery notifications and order updates."
                );
              }
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {isUpdating ? "Update phone number" : "Add phone number"}
          </Text>
          <Text style={styles.subtitle}>
            {isUpdating
              ? "Update the phone number for your account"
              : "Input a phone number you'd like to add to your account"}
          </Text>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputLabels}>
              <Text style={styles.inputLabel}>Country</Text>
              <Text style={styles.inputLabel}>Phone</Text>
            </View>

            <View style={styles.inputRow}>
              {/* Country Selector */}
              <TouchableOpacity
                style={styles.countryCodeContainer}
                onPress={() => setCountryModalVisible(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCodeText}>
                  {selectedCountry.code}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {/* Phone Number Input */}
              <View style={styles.phoneInputContainer}>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.phoneInput}
                  value={formatPhoneNumber(phoneNumber)}
                  onChangeText={handlePhoneChange}
                  placeholder="Your phone number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={14} // Formatted length
                  autoFocus={true}
                />
              </View>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.privacyText}>
              Your phone number is used for delivery updates and order
              notifications only
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Section - stays at bottom */}
        <View style={styles.bottomSection}>
          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !isValidPhoneNumber() && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isValidPhoneNumber() || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          {/* Skip Button (if allowed) */}
          {skipable && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}

          {/* reCAPTCHA Notice */}
          <Text style={styles.recaptchaText}>
            This site is protected by reCAPTCHA and the Google{" "}
            <Text style={styles.recaptchaLink}>Privacy Policy</Text> and{" "}
            <Text style={styles.recaptchaLink}>Terms of Service</Text> apply.
          </Text>
        </View>
      </View>

      {/* Country Selector Modal */}
      <Modal
        visible={countryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => setCountryModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRIES}
              keyExtractor={(item, index) => `${item.code}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry.code === item.code &&
                      selectedCountry.name === item.name &&
                      styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.code}</Text>
                  </View>
                  {selectedCountry.code === item.code &&
                    selectedCountry.name === item.name && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    wrapper: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    closeButton: {
      padding: 8,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 22,
    },
    inputSection: {
      marginBottom: 24,
    },
    inputLabels: {
      flexDirection: "row",
      marginBottom: 12,
      paddingLeft: 4,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginRight: 90,
    },
    inputRow: {
      flexDirection: "row",
      gap: 12,
    },
    countryCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
      //   width: 120,
      height: 56,
      borderWidth: 2,
      borderColor: colors.textMuted,
      borderRadius: 22,
      paddingHorizontal: 12,
      gap: 6,
      backgroundColor: colors.cardBackground,
    },
    countryFlag: {
      fontSize: 18,
    },
    countryCodeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      //   flex: 1,
    },
    phoneInputContainer: {
      flex: 1,
      height: 56,
      borderWidth: 2,
      borderColor: colors.textMuted,
      borderRadius: 22,
      justifyContent: "center",
      paddingHorizontal: 8,
      backgroundColor: colors.cardBackground,
    },
    phoneInput: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    privacyNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.primary + "10",
      padding: 12,
      borderRadius: 8,
      gap: 8,
    },
    privacyText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    bottomSection: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 20,
      gap: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    continueButton: {
      backgroundColor: colors.text,
      paddingVertical: 16,
      borderRadius: 52,
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    continueButtonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.background,
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    recaptchaText: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 16,
    },
    recaptchaLink: {
      textDecorationLine: "underline",
      color: colors.primary,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "80%",
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    countryItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "30",
    },
    countryItemSelected: {
      backgroundColor: colors.primary + "10",
    },
    countryItemFlag: {
      fontSize: 32,
    },
    countryItemInfo: {
      flex: 1,
    },
    countryItemName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    countryItemCode: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

export default AddPhoneNumberScreen;
