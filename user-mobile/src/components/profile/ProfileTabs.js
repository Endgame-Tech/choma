import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomIcon from "../ui/CustomIcon";

const ProfileTabs = ({ selectedTab, onTabChange }) => {
  const { colors } = useTheme();
  const tabs = [
    { id: "overview", label: "Overview", icon: "overview-filled" },
    { id: "activity", label: "Activity", icon: "activity-filled" },
    { id: "profile", label: "Profile", icon: "profile-filled" },
  ];

  return (
    <View style={styles(colors).container}>
      <View style={styles(colors).tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles(colors).tab,
              selectedTab === tab.id && styles(colors).activeTab,
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <CustomIcon
              name={tab.icon}
              size={18}
              color={selectedTab === tab.id ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles(colors).tabText,
                selectedTab === tab.id && styles(colors).activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      // paddingTop: 20,
      paddingBottom: 14,
      alignItems: "flex-start",
    },
    tabContainer: {
      flexDirection: "row",
      borderRadius: 30,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: "center",
      // width: "100%",
      maxWidth: 350,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 12, 
      borderRadius: 25,
      // flex: 1,
      minWidth: 0, // Allow flex shrinking
    },
    activeTab: {
      paddingHorizontal: 8,
      backgroundColor: colors.primary2,
    },
    tabText: {
      fontSize: 14,
      color: colors.textMuted,
      marginLeft: 6, // Reduced margin
      fontWeight: "500",
      flexShrink: 1, // Allow text to shrink if needed
      textAlign: "center",
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

export default ProfileTabs;
