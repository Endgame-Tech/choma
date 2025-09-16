import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const ETACard = ({ eta, colors, onPress }) => {
  if (!eta) return null;

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "on_time":
        return "#4CAF50";
      case "delayed":
        return "#FF9800";
      case "early":
        return "#2196F3";
      default:
        return COLORS.primary;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case "on_time":
        return "On time";
      case "delayed":
        return "Delayed";
      case "early":
        return "Arriving early";
      default:
        return "Estimated";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={24} color={COLORS.primary} />
          </View>

          <View style={styles.timeInfo}>
            <Text style={[styles.etaTime, { color: colors.text }]}>
              {formatTime(eta.estimatedMinutes)}
            </Text>
            <Text style={[styles.etaLabel, { color: colors.textSecondary }]}>
              Estimated arrival
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(eta.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(eta.status) }]}
          >
            {getStatusText(eta.status)}
          </Text>

          <View style={styles.distanceContainer}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text
              style={[styles.distanceText, { color: colors.textSecondary }]}
            >
              {eta.distance || "2.1 km"} away
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar if available */}
      {eta.progress !== undefined && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, eta.progress))}%`,
                  backgroundColor: COLORS.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Tap indicator */}
      <View style={styles.tapIndicator}>
        <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = createStylesWithDMSans({
  container: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timeInfo: {
    flex: 1,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  tapIndicator: {
    alignItems: "center",
    paddingBottom: 8,
  },
});

export default ETACard;
