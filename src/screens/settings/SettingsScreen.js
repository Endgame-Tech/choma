import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { useNotification } from "../../context/NotificationContext";
import biometricAuthService from "../../services/biometricAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/api";
import SettingsService from "../../services/settingsService";
import PrivacyService from "../../services/privacyService";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
  const { showError, showInfo, showConfirm, showAlert } = useAlert();
  const { preferences, updateNotificationPreferences } = useNotification();

  const [settings, setSettings] = useState({
    notifications: true,
    biometricAuth: false,
    autoDownload: true,
    dataCollection: false,
  });

  // Rating preferences state
  const [ratingPreferences, setRatingPreferences] = useState({
    promptFrequency: "after_every_order",
    orderCompletionPrompts: true,
    subscriptionMilestonePrompts: true,
    deliveryRatingPrompts: true,
    optOut: false,
  });
  const [loading, setLoading] = useState(false);

  // Initialize settings from storage and services
  useEffect(() => {
    loadSettings();
    loadRatingPreferences();
  }, []);

  const loadSettings = async () => {
    try {
      // Load biometric auth status with fallback
      let biometricEnabled = false;
      try {
        biometricEnabled = await biometricAuthService.isBiometricEnabled();
      } catch (biometricError) {
        console.warn("Could not load biometric settings:", biometricError);
      }

      // Load other settings using SettingsService with fallbacks
      const notifications = await SettingsService.getSetting(
        "NOTIFICATIONS",
        true
      );
      const autoDownload = await SettingsService.getSetting(
        "AUTO_DOWNLOAD",
        true
      );
      const dataCollection = await SettingsService.getSetting(
        "DATA_COLLECTION",
        false
      );

      setSettings({
        notifications,
        biometricAuth: biometricEnabled,
        autoDownload,
        dataCollection,
      });
    } catch (error) {
      console.error("Error loading settings:", error);
      // Set default values if everything fails
      setSettings({
        notifications: true,
        biometricAuth: false,
        autoDownload: true,
        dataCollection: false,
      });
    }
  };

  const loadRatingPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem("ratingPreferences");
      if (savedPreferences) {
        setRatingPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.warn("Could not load rating preferences:", error);
    }
  };

  const handleSettingToggle = async (setting) => {
    if (loading) return;

    setLoading(true);

    try {
      if (setting === "darkMode") {
        toggleTheme();
      } else if (setting === "biometricAuth") {
        await handleBiometricToggle();
      } else if (setting === "notifications") {
        await handleNotificationsToggle();
      } else if (setting === "dataCollection") {
        await handleDataCollectionToggle();
      } else if (setting === "autoDownload") {
        await handleAutoDownloadToggle();
      }
    } catch (error) {
      console.error("Error toggling setting:", error);
      showError("Error", "Failed to update setting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async () => {
    const currentValue = settings.biometricAuth;

    if (!currentValue) {
      // Enabling biometric auth
      const availability = await biometricAuthService.isAvailable();

      if (!availability.available) {
        showError("Biometric Authentication", availability.reason);
        return;
      }

      // Test biometric authentication
      const authResult = await biometricAuthService.authenticateForSettings();

      if (authResult.success) {
        await biometricAuthService.setBiometricEnabled(true);
        setSettings((prev) => ({ ...prev, biometricAuth: true }));
        showInfo("Success", "Biometric authentication enabled successfully!");
      } else {
        showError("Authentication Failed", authResult.error);
      }
    } else {
      // Disabling biometric auth
      showConfirm(
        "Disable Biometric Authentication",
        "Are you sure you want to disable biometric authentication?",
        async () => {
          await biometricAuthService.setBiometricEnabled(false);
          setSettings((prev) => ({ ...prev, biometricAuth: false }));
          showInfo("Success", "Biometric authentication disabled.");
        }
      );
    }
  };

  const handleNotificationsToggle = async () => {
    const newValue = !settings.notifications;

    try {
      // Update notification preferences
      const result = await updateNotificationPreferences({
        ...preferences,
        pushNotifications: newValue,
        orderUpdates: newValue,
        deliveryReminders: newValue,
      });

      if (result.success) {
        setSettings((prev) => ({ ...prev, notifications: newValue }));
        await SettingsService.setSetting("NOTIFICATIONS", newValue);

        showInfo(
          "Notifications " + (newValue ? "Enabled" : "Disabled"),
          newValue
            ? "You'll receive push notifications for orders and updates."
            : "Push notifications have been disabled."
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showError("Error", "Failed to update notification settings.");
    }
  };

  const handleDataCollectionToggle = async () => {
    const newValue = !settings.dataCollection;

    showConfirm(
      newValue ? "Enable Data Collection" : "Disable Data Collection",
      newValue
        ? "Allow us to collect anonymous usage data to improve the app experience?"
        : "Are you sure you want to disable data collection? This may limit our ability to improve the app.",
      async () => {
        try {
          // Update privacy settings using PrivacyService
          const result = await PrivacyService.updatePrivacySettings({
            allowDataCollection: newValue,
          });

          if (result.success) {
            setSettings((prev) => ({ ...prev, dataCollection: newValue }));
            await SettingsService.setSetting("DATA_COLLECTION", newValue);

            // Log privacy action
            await PrivacyService.logPrivacyAction(
              newValue ? "data_collection_enabled" : "data_collection_disabled",
              { source: "settings_screen" }
            );

            showInfo(
              "Data Collection " + (newValue ? "Enabled" : "Disabled"),
              newValue
                ? "Thank you for helping us improve the app!"
                : "Data collection has been disabled."
            );
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          showError("Error", "Failed to update data collection settings.");
        }
      }
    );
  };

  const handleAutoDownloadToggle = async () => {
    const newValue = !settings.autoDownload;

    setSettings((prev) => ({ ...prev, autoDownload: newValue }));
    await SettingsService.setSetting("AUTO_DOWNLOAD", newValue);

    showInfo(
      "Auto-download " + (newValue ? "Enabled" : "Disabled"),
      newValue
        ? "Images will be automatically downloaded on WiFi."
        : "Images will only be downloaded when you tap them."
    );
  };

  const handleRatingPreferenceToggle = async (preference) => {
    if (loading) return;
    setLoading(true);

    try {
      let updatedPreferences;

      if (preference === "promptFrequency") {
        // Cycle through frequency options
        const frequencies = [
          "after_every_order",
          "after_delivery",
          "weekly",
          "monthly",
        ];
        const currentIndex = frequencies.indexOf(
          ratingPreferences.promptFrequency
        );
        const nextIndex = (currentIndex + 1) % frequencies.length;
        updatedPreferences = {
          ...ratingPreferences,
          promptFrequency: frequencies[nextIndex],
        };
      } else {
        // Toggle boolean preferences
        updatedPreferences = {
          ...ratingPreferences,
          [preference]: !ratingPreferences[preference],
        };
      }

      setRatingPreferences(updatedPreferences);
      await AsyncStorage.setItem(
        "ratingPreferences",
        JSON.stringify(updatedPreferences)
      );

      if (preference === "optOut") {
        showInfo(
          updatedPreferences.optOut
            ? "Rating Prompts Disabled"
            : "Rating Prompts Enabled",
          updatedPreferences.optOut
            ? "You won't receive rating prompts anymore."
            : "You'll receive rating prompts based on your preferences."
        );
      }
    } catch (error) {
      console.error("Error updating rating preferences:", error);
      showError("Error", "Failed to update rating preferences.");
    } finally {
      setLoading(false);
    }
  };

  // Sign out logic
  const handleSignOut = async () => {
    try {
      const result = await logout();
      if (result.success) {
        // AuthContext will handle the state change and navigation
        // The AppNavigator will automatically switch to AuthStack
        console.log("User signed out successfully");
      } else {
        showError("Sign Out Failed", "Unable to sign out. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      showError("Sign Out Failed", "Unable to sign out. Please try again.");
    }
  };

  const handleAbout = () => {
    showInfo(
      "About Choma",
      "Version 1.0.0\nBuilt with ❤️ for food lovers\n\n© 2024 Choma. All rights reserved.",
      [{ text: "OK", style: "default" }]
    );
  };

  const handlePrivacy = () => {
    showAlert({
      title: "Privacy Policy",
      message:
        "This will take you out of the app to view our complete Privacy Policy on our website.\n\nYour privacy is important to us. We collect only necessary data to provide you with the best experience.\n\nWould you like to:",
      type: "info",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "View Privacy Policy",
          onPress: () => {
            const privacyUrl = PrivacyService.getPrivacyPolicyUrl();
            Linking.openURL(privacyUrl).catch(() => {
              showInfo(
                "Privacy Policy",
                "Visit our privacy policy at: " + privacyUrl
              );
            });
          },
        },
        {
          text: "Privacy Settings",
          onPress: () => {
            try {
              navigation.navigate("PrivacySecurity");
            } catch {
              // If PrivacySecurity screen doesn't exist, show info
              showInfo(
                "Privacy Settings",
                "• Data Collection: " +
                  (settings.dataCollection ? "Enabled" : "Disabled") +
                  "\n• Notifications: " +
                  (settings.allowNotifications ? "Enabled" : "Disabled") +
                  "\n• Marketing: " +
                  (settings.allowMarketing ? "Enabled" : "Disabled")
              );
            }
          },
        },
      ],
    });
  };

  const handleTerms = () => {
    showAlert({
      title: "Terms of Service",
      message:
        "This will take you out of the app to view our complete Terms of Service on our website.\n\nBy using Choma, you agree to our terms and conditions.",
      type: "info",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "View Terms",
          onPress: () => {
            const termsUrl = PrivacyService.getTermsOfServiceUrl();
            Linking.openURL(termsUrl).catch(() => {
              showInfo("Terms of Service", "Visit our terms at: " + termsUrl);
            });
          },
        },
        {
          text: "App Info",
          onPress: () => {
            showInfo(
              "App Information",
              "Choma - Healthy Meal Delivery\nVersion 1.0.0\n\nFor terms and conditions, visit our website.\n\n© 2024 Choma. All rights reserved."
            );
          },
        },
      ],
    });
  };

  const handleHelpCenter = () => {
    // Navigate to help center
    navigation.navigate("HelpCenter");
  };

  const handleContactUs = () => {
    showConfirm("Contact Us", "How would you like to get in touch?", () => {}, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Email",
        onPress: () => Linking.openURL("mailto:support@choma.app"),
      },
      {
        text: "Phone",
        onPress: () => Linking.openURL("tel:+2341234567890"),
      },
      {
        text: "WhatsApp",
        onPress: () => Linking.openURL("https://wa.me/2341234567890"),
      },
    ]);
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: "https://apps.apple.com/app/choma/id1234567890",
      android: "https://play.google.com/store/apps/details?id=com.getchoma.app",
      default: "https://choma.app",
    });

    Linking.openURL(storeUrl).catch(() => {
      showInfo(
        "Rate Choma",
        "Thank you for using Choma! Please search for 'Choma' in your app store to rate us."
      );
    });
  };

  const handleCheckUpdates = async () => {
    showInfo(
      "Updates",
      "You have the latest version of Choma!\n\nVersion 1.0.0"
    );
  };

  const renderSettingItem = (
    icon,
    title,
    subtitle,
    value,
    onToggle,
    isSwitch = true
  ) => (
    <View style={styles(colors).settingItem}>
      <View style={styles(colors).settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles(colors).settingContent}>
        <Text style={styles(colors).settingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles(colors).settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
          disabled={loading}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
  );

  const renderFrequencyItem = (
    icon,
    title,
    subtitle,
    currentValue,
    onPress
  ) => (
    <TouchableOpacity style={styles(colors).actionItem} onPress={onPress}>
      <View style={styles(colors).settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles(colors).settingContent}>
        <Text style={styles(colors).settingTitle}>{title}</Text>
        <Text style={styles(colors).settingSubtitle}>
          {subtitle} • Current: {currentValue.replace("_", " ").toUpperCase()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderActionItem = (
    icon,
    title,
    subtitle,
    onPress,
    color = colors.text
  ) => (
    <TouchableOpacity style={styles(colors).actionItem} onPress={onPress}>
      <View style={styles(colors).settingIcon}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles(colors).settingContent}>
        <Text style={[styles(colors).settingTitle, { color }]}>{title}</Text>
        {subtitle && (
          <Text style={styles(colors).settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark === true ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Settings</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* App Settings */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>App Settings</Text>

          <View style={styles(colors).settingsGroup}>
            {renderSettingItem(
              "notifications",
              "Push Notifications",
              "Receive order updates and promotions",
              settings.notifications,
              () => handleSettingToggle("notifications")
            )}

            {renderSettingItem(
              "moon",
              "Dark Mode",
              "Switch to dark theme",
              isDark,
              () => handleSettingToggle("darkMode")
            )}

            {renderSettingItem(
              "finger-print",
              "Biometric Authentication",
              "Use fingerprint or face ID for quick access",
              settings.biometricAuth,
              () => handleSettingToggle("biometricAuth")
            )}

            {renderSettingItem(
              "download",
              "Auto-download Images",
              "Automatically download meal images",
              settings.autoDownload,
              () => handleSettingToggle("autoDownload")
            )}
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Privacy & Security</Text>

          <View style={styles(colors).settingsGroup}>
            {renderSettingItem(
              "analytics",
              "Data Collection",
              "Help improve app with anonymous usage data",
              settings.dataCollection,
              () => handleSettingToggle("dataCollection")
            )}

            {renderActionItem(
              "shield-checkmark",
              "Privacy Policy",
              "Learn how we protect your data",
              handlePrivacy
            )}

            {renderActionItem(
              "document-text",
              "Terms of Service",
              "Read our terms and conditions",
              handleTerms
            )}
          </View>
        </View>

        {/* Rating Preferences */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Rating Preferences</Text>

          <View style={styles(colors).settingsGroup}>
            {renderFrequencyItem(
              "time",
              "Prompt Frequency",
              "How often you want to be asked for ratings",
              ratingPreferences.promptFrequency,
              () => handleRatingPreferenceToggle("promptFrequency")
            )}

            {renderSettingItem(
              "checkmark-circle",
              "Order Completion Prompts",
              "Ask for ratings when orders are completed",
              ratingPreferences.orderCompletionPrompts,
              () => handleRatingPreferenceToggle("orderCompletionPrompts")
            )}

            {renderSettingItem(
              "calendar",
              "Subscription Milestone Prompts",
              "Ask for ratings at subscription milestones",
              ratingPreferences.subscriptionMilestonePrompts,
              () => handleRatingPreferenceToggle("subscriptionMilestonePrompts")
            )}

            {renderSettingItem(
              "car",
              "Delivery Rating Prompts",
              "Ask for ratings after deliveries",
              ratingPreferences.deliveryRatingPrompts,
              () => handleRatingPreferenceToggle("deliveryRatingPrompts")
            )}

            {renderSettingItem(
              "close-circle",
              "Opt Out of All Rating Prompts",
              "Disable all rating prompts completely",
              ratingPreferences.optOut,
              () => handleRatingPreferenceToggle("optOut")
            )}
          </View>
        </View>

        {/* Support */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Support</Text>

          <View style={styles(colors).settingsGroup}>
            {renderActionItem(
              "help-circle",
              "Help Center",
              "Get answers to common questions",
              handleHelpCenter
            )}

            {renderActionItem(
              "mail",
              "Contact Us",
              "Send us your feedback or questions",
              handleContactUs
            )}

            {renderActionItem(
              "star",
              "Rate Choma",
              "Help others discover our app",
              handleRateApp
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>About</Text>

          <View style={styles(colors).settingsGroup}>
            {renderActionItem(
              "information-circle",
              "About Choma",
              "Version, legal info, and more",
              handleAbout
            )}

            {renderActionItem(
              "refresh",
              "Check for Updates",
              "Make sure you have the latest version",
              handleCheckUpdates
            )}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles(colors).section}>
          <Text
            style={[styles(colors).sectionTitle, styles(colors).dangerTitle]}
          >
            Account
          </Text>

          <View style={styles(colors).settingsGroup}>
            {renderActionItem(
              "log-out",
              "Sign Out",
              "Sign out of your account",
              () =>
                showConfirm(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  handleSignOut
                ),
              colors.error
            )}

            {renderActionItem(
              "trash",
              "Delete Account",
              "Permanently delete your account and data",
              () =>
                showConfirm(
                  "Delete Account",
                  "This action cannot be undone. All your data will be permanently deleted.",
                  () => {}
                ),
              colors.error
            )}
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    placeholder: {
      width: 34,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    dangerTitle: {
      color: colors.error,
    },
    settingsGroup: {
      backgroundColor: `${colors.cardBackground}20`,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 15,
    },
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 15,
    },
    settingIcon: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    settingContent: {
      flex: 1,
      marginLeft: 10,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    bottomPadding: {
      height: 120,
    },
  });

export default SettingsScreen;
