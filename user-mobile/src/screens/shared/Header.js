import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const Header = () => {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation();

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const navigateToScreen = (screen) => {
    setMenuVisible(false);
    navigation.navigate(screen);
  };

  return (
    <View style={styles(colors).headerContainer}>
      <TouchableOpacity onPress={toggleMenu} style={styles(colors).menuIcon}>
        <Ionicons name="menu" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles(colors).headerTitle}>choma</Text>
      {menuVisible && (
        <View style={styles(colors).menuContainer}>
          <TouchableOpacity
            onPress={() => navigateToScreen("Settings")}
            style={styles(colors).menuItem}
          >
            <Text style={styles(colors).menuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigateToScreen("Help")}
            style={styles(colors).menuItem}
          >
            <Text style={styles(colors).menuText}>Help</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: colors.background,
    },
    menuIcon: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    menuContainer: {
      position: "absolute",
      top: 56,
      right: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    menuItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuText: {
      fontSize: 16,
      color: colors.text,
    },
  });
