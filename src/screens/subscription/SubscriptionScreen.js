// src/screens/subscription/SubscriptionScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const SubscriptionScreen = ({ navigation }) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles(colors).container}>
      <View style={styles(colors).content}>
        <Ionicons name="card" size={80} color={colors.primary} />
        <Text style={styles(colors).title}>Subscription Manager</Text>
        <Text style={styles(colors).subtitle}>
          Subscription flow coming in Week 1!
        </Text>

        <TouchableOpacity
          style={styles(colors).button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles(colors).buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export default SubscriptionScreen;
