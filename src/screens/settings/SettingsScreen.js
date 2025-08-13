import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../styles/theme";

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();

  const [settings, setSettings] = useState({
    notifications: true,
    biometricAuth: false,
    autoDownload: true,
    dataCollection: false,
  });

  const handleSettingToggle = (setting) => {
    if (setting === "darkMode") {
      toggleTheme();
    } else {
      setSettings((prev) => ({
        ...prev,
        [setting]: !prev[setting],
      }));
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
        Alert.alert("Sign Out Failed", "Unable to sign out. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Sign Out Failed", "Unable to sign out. Please try again.");
    }
  };

  const handleAbout = () => {
    Alert.alert(
      "About Choma",
      "Version 1.0.0\nBuilt with ❤️ for food lovers\n\n© 2024 Choma. All rights reserved.",
      [{ text: "OK", style: "default" }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Policy",
      "Your privacy is important to us. We collect only necessary data to provide you with the best experience.",
      [
        { text: "Learn More", onPress: () => {} },
        { text: "OK", style: "default" },
      ]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      "Terms of Service",
      "By using Choma, you agree to our terms and conditions.",
      [
        { text: "Read Full Terms", onPress: () => {} },
        { text: "OK", style: "default" },
      ]
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
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
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

        {/* Privacy & Security */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Privacy & Security</Text>

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

        {/* Support */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Support</Text>

          {renderActionItem(
            "help-circle",
            "Help Center",
            "Get answers to common questions",
            () => navigation.navigate("HelpCenter")
          )}

          {renderActionItem(
            "mail",
            "Contact Us",
            "Send us your feedback or questions",
            () =>
              Alert.alert(
                "Contact Us",
                "Email: support@Choma.app\nPhone: +234 123 456 7890"
              )
          )}

          {renderActionItem(
            "star",
            "Rate Choma",
            "Help others discover our app",
            () =>
              Alert.alert(
                "Rate Choma",
                "Thank you for using Choma! Please rate us on the app store."
              )
          )}
        </View>

        {/* About */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>About</Text>

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
            () =>
              Alert.alert("Updates", "You have the latest version of Choma!")
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles(colors).section}>
          <Text
            style={[styles(colors).sectionTitle, styles(colors).dangerTitle]}
          >
            Account
          </Text>

          {renderActionItem(
            "log-out",
            "Sign Out",
            "Sign out of your account",
            () =>
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: handleSignOut,
                },
              ]),
            colors.error
          )}

          {renderActionItem(
            "trash",
            "Delete Account",
            "Permanently delete your account and data",
            () =>
              Alert.alert(
                "Delete Account",
                "This action cannot be undone. All your data will be permanently deleted.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => {} },
                ]
              ),
            colors.error
          )}
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
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
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 15,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 15,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
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
