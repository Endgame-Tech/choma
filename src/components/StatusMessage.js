// src/components/StatusMessage.js - Status message component for rate limiting and connectivity
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const StatusMessage = ({ type, message, visible = true }) => {
  if (!visible) return null;

  const getStatusConfig = () => {
    switch (type) {
      case "rate-limited":
        return {
          icon: "time-outline",
          color: "#FF9500",
          backgroundColor: "#FFF3CD",
          borderColor: "#FFE69C",
          textColor: "#664D03",
        };
      case "offline":
        return {
          icon: "cloud-offline-outline",
          color: "#DC3545",
          backgroundColor: "#F8D7DA",
          borderColor: "#F5C2C7",
          textColor: "#721C24",
        };
      case "loading":
        return {
          icon: "refresh-outline",
          color: "#0D6EFD",
          backgroundColor: "#D1ECF1",
          borderColor: "#ABDDE5",
          textColor: "#055160",
        };
      case "success":
        return {
          icon: "checkmark-circle-outline",
          color: "#198754",
          backgroundColor: "#D1E7DD",
          borderColor: "#BADBCC",
          textColor: "#0F5132",
        };
      case "error":
        return {
          icon: "alert-circle-outline",
          color: "#DC3545",
          backgroundColor: "#F8D7DA",
          borderColor: "#F5C2C7",
          textColor: "#721C24",
        };
      default:
        return {
          icon: "information-circle-outline",
          color: "#0D6EFD",
          backgroundColor: "#D1ECF1",
          borderColor: "#ABDDE5",
          textColor: "#055160",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={20}
        color={config.color}
        style={styles.icon}
      />
      <Text style={[styles.message, { color: config.textColor }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default StatusMessage;
