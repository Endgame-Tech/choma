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
import CustomIcon from "../../components/ui/CustomIcon";
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
import ThemePickerModal from "../../components/settings/ThemePickerModal";

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { showError, showInfo, showConfirm, showAlert } = useAlert();
  const { preferences, updateNotificationPreferences } = useNotification();

  const [isThemePickerVisible, setThemePickerVisible] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    biometricAuth: false,
    autoDownload: true,
    dataCollection: false,
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await SettingsService.loadSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSettingToggle = async (settingName) => {
    try {
      const newSettings = {
        ...settings,
        [settingName]: !settings[settingName],
      };
      
      setSettings(newSettings);
      await SettingsService.saveSettings(newSettings);

      // Handle specific setting actions
      if (settingName === "biometricAuth") {
        if (newSettings.biometricAuth) {
          await enableBiometricAuth();
        } else {
          await disableBiometricAuth();
        }
      }

      showInfo(`${settingName.replace(/([A-Z])/g, ' $1').toLowerCase()} ${newSettings[settingName] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Error toggling ${settingName}:`, error);
      showError(`Failed to update ${settingName}`);
      // Revert the toggle on error
      setSettings(prev => ({ ...prev, [settingName]: !prev[settingName] }));
    }
  };

  const enableBiometricAuth = async () => {
    try {
      const isAvailable = await biometricAuthService.isBiometricAuthAvailable();
      if (!isAvailable) {
        showError("Biometric authentication is not available on this device");
        setSettings(prev => ({ ...prev, biometricAuth: false }));
        return;
      }

      const success = await biometricAuthService.setupBiometricAuth();
      if (!success) {
        setSettings(prev => ({ ...prev, biometricAuth: false }));
      }
    } catch (error) {
      console.error("Error enabling biometric auth:", error);
      setSettings(prev => ({ ...prev, biometricAuth: false }));
    }
  };

  const disableBiometricAuth = async () => {
    try {
      await biometricAuthService.removeBiometricAuth();
    } catch (error) {
      console.error("Error disabling biometric auth:", error);
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://yourapp.com/privacy");
  };

  const handleTermsOfService = () => {
    Linking.openURL("https://yourapp.com/terms");
  };

  const handleDeleteAccount = () => {
    showConfirm(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      "Delete",
      "Cancel",
      async () => {
        try {
          await PrivacyService.deleteAccountData();
          await logout();
          showInfo("Account deleted successfully");
        } catch (error) {
          console.error("Error deleting account:", error);
          showError("Failed to delete account");
        }
      }
    );
  };

  const handleExportData = async () => {
    try {
      showInfo("Exporting your data...");
      const data = await PrivacyService.exportUserData();
      // Here you would typically share or save the data
      showInfo("Data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      showError("Failed to export data");
    }
  };

  const renderSettingItem = (iconName, title, subtitle, value, onToggle) => (
    <TouchableOpacity
      style={styles(colors).settingItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles(colors).settingIcon}>
        <CustomIcon name={iconName} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).settingContent}>
        <Text style={styles(colors).settingTitle}>{title}</Text>
        <Text style={styles(colors).settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.cardBackground}
      />
    </TouchableOpacity>
  );

  const renderActionItem = (iconName, title, subtitle, onPress) => (
    <TouchableOpacity
      style={styles(colors).actionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles(colors).settingIcon}>
        <CustomIcon name={iconName} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).settingContent}>
        <Text style={styles(colors).settingTitle}>{title}</Text>
        <Text style={styles(colors).settingSubtitle}>{subtitle}</Text>
      </View>
      <CustomIcon name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles(colors).container} edges={["top"]}>
      <StatusBar barStyle={themeMode === "dark" ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <CustomIcon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Settings</Text>
        <View style={styles(colors).placeholder} />
      </View>

      <ScrollView style={styles(colors).scrollView}>
        {/* Preferences Section */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Preferences</Text>
          <View style={styles(colors).settingsGroup}>
            {renderSettingItem(
              "notifications",
              "Push Notifications",
              "Receive order updates and promotions",
              settings.notifications,
              () => handleSettingToggle("notifications")
            )}

            {renderActionItem(
              "color-palette",
              "Theme",
              themeMode === 'system'
                ? `System (${isDark ? 'Dark' : 'Light'})`
                : themeMode.charAt(0).toUpperCase() + themeMode.slice(1),
              () => setThemePickerVisible(true)
            )}

            {renderSettingItem(
              "biometric",
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

        {/* Privacy Section */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Privacy & Data</Text>
          <View style={styles(colors).settingsGroup}>
            {renderActionItem(
              "shield",
              "Privacy Policy",
              "Learn how we protect your data",
              handlePrivacyPolicy
            )}

            {renderActionItem(
              "list",
              "Terms of Service",
              "Read our terms and conditions",
              handleTermsOfService
            )}

            {renderActionItem(
              "data",
              "Export Data",
              "Download a copy of your data",
              handleExportData
            )}
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles(colors).section}>
          <Text style={[styles(colors).sectionTitle, styles(colors).dangerTitle]}>
            Danger Zone
          </Text>
          <View style={styles(colors).settingsGroup}>
            {renderActionItem(
              "sign-out",
              "Sign Out",
              "Log out of your account",
              () => showConfirm(
                "Sign Out",
                "Are you sure you want to sign out?",
                logout
              )
            )}

            {renderActionItem(
              "remove",
              "Delete Account",
              "Permanently delete your account and data",
              handleDeleteAccount
            )}
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      <ThemePickerModal
        isVisible={isThemePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
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
      height: 10,
    },
  });

export default SettingsScreen;