// src/screens/profile/ProfileScreen.js - Driver profile and settings
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import CustomText from "../../components/ui/CustomText";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const ProfileScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { driver, logout } = useDriverAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const profileSections = [
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          title: "Personal Information",
          subtitle: "Update your details",
          onPress: () => console.log("Personal Info"),
        },
        {
          icon: "card-outline",
          title: "Bank Details",
          subtitle: "Manage payout information",
          onPress: () => console.log("Bank Details"),
        },
        {
          icon: "document-text-outline",
          title: "Documents",
          subtitle: "Upload and verify documents",
          onPress: () => console.log("Documents"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications-outline",
          title: "Push Notifications",
          subtitle: "Delivery and order alerts",
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: "location-outline",
          title: "Location Services",
          subtitle: "Share location for deliveries",
          toggle: true,
          value: locationEnabled,
          onToggle: setLocationEnabled,
        },
        {
          icon: "moon-outline",
          title: "Dark Mode",
          subtitle: "Switch app appearance",
          toggle: true,
          value: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle-outline",
          title: "Help Center",
          subtitle: "FAQs and support articles",
          onPress: () => console.log("Help Center"),
        },
        {
          icon: "chatbubble-outline",
          title: "Contact Support",
          subtitle: "Get help from our team",
          onPress: () => console.log("Contact Support"),
        },
        {
          icon: "star-outline",
          title: "Rate App",
          subtitle: "Share your feedback",
          onPress: () => console.log("Rate App"),
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          icon: "document-outline",
          title: "Terms of Service",
          subtitle: "Read our terms",
          onPress: () => console.log("Terms"),
        },
        {
          icon: "shield-outline",
          title: "Privacy Policy",
          subtitle: "How we protect your data",
          onPress: () => console.log("Privacy"),
        },
        {
          icon: "information-circle-outline",
          title: "About",
          subtitle: "App version and info",
          onPress: () => console.log("About"),
        },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const getDriverInitials = () => {
    if (!driver?.name) return "DR";
    return driver.name
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDriverStatus = () => {
    switch (driver?.status) {
      case "active":
        return { text: "Active Driver", color: colors.success };
      case "pending":
        return { text: "Pending Verification", color: colors.warning };
      case "suspended":
        return { text: "Account Suspended", color: colors.error };
      default:
        return { text: "Driver", color: colors.textSecondary };
    }
  };

  const renderSectionItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles(colors).sectionItem}
      onPress={item.onPress}
      disabled={item.toggle}
    >
      <View style={styles(colors).itemLeft}>
        <View style={styles(colors).itemIcon}>
          <Ionicons name={item.icon} size={20} color={colors.primary} />
        </View>
        <View style={styles(colors).itemContent}>
          <CustomText style={styles(colors).itemTitle}>{item.title}</CustomText>
          <CustomText style={styles(colors).itemSubtitle}>
            {item.subtitle}
          </CustomText>
        </View>
      </View>

      {item.toggle ? (
        item.title === "Dark Mode" ? (
          <ThemeToggle size="small" />
        ) : (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: colors.primary + "30" }}
            thumbColor={item.value ? colors.primary : colors.textSecondary}
          />
        )
      ) : (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  const driverStatus = getDriverStatus();

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <View style={styles(colors).profileHeader}>
          <View style={styles(colors).avatarContainer}>
            {driver?.profileImage ? (
              <Image
                source={{ uri: driver.profileImage }}
                style={styles(colors).avatar}
              />
            ) : (
              <View style={styles(colors).avatarPlaceholder}>
                <CustomText style={styles(colors).avatarText}>
                  {getDriverInitials()}
                </CustomText>
              </View>
            )}
            <TouchableOpacity style={styles(colors).editAvatarButton}>
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles(colors).profileInfo}>
            <CustomText style={styles(colors).driverName}>
              {driver?.name || "Driver Name"}
            </CustomText>
            <CustomText style={styles(colors).driverEmail}>
              {driver?.email || "driver@example.com"}
            </CustomText>
            <View style={styles(colors).statusContainer}>
              <View
                style={[
                  styles(colors).statusDot,
                  { backgroundColor: driverStatus.color },
                ]}
              />
              <CustomText
                style={[
                  styles(colors).statusText,
                  { color: driverStatus.color },
                ]}
              >
                {driverStatus.text}
              </CustomText>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles(colors).statsCard}>
          <View style={styles(colors).statItem}>
            <CustomText style={styles(colors).statValue}>156</CustomText>
            <CustomText style={styles(colors).statLabel}>
              Total Deliveries
            </CustomText>
          </View>
          <View style={styles(colors).statDivider} />
          <View style={styles(colors).statItem}>
            <CustomText style={styles(colors).statValue}>4.8</CustomText>
            <CustomText style={styles(colors).statLabel}>Rating</CustomText>
          </View>
          <View style={styles(colors).statDivider} />
          <View style={styles(colors).statItem}>
            <CustomText style={styles(colors).statValue}>98%</CustomText>
            <CustomText style={styles(colors).statLabel}>
              On-time Rate
            </CustomText>
          </View>
        </View>

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles(colors).section}>
            <CustomText style={styles(colors).sectionTitle}>
              {section.title}
            </CustomText>
            <View style={styles(colors).sectionContent}>
              {section.items.map((item, itemIndex) =>
                renderSectionItem(item, itemIndex)
              )}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles(colors).logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <CustomText style={styles(colors).logoutText}>Logout</CustomText>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles(colors).versionContainer}>
          <CustomText style={styles(colors).versionText}>
            Choma Driver v1.0.0
          </CustomText>
        </View>
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
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarContainer: {
      position: "relative",
      marginRight: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.primary,
    },
    editAvatarButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    profileInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    driverEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    sectionContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    itemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    itemSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.error + "30",
    },
    logoutText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.error,
      marginLeft: 8,
    },
    versionContainer: {
      alignItems: "center",
      paddingBottom: 20,
    },
    versionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default ProfileScreen;
