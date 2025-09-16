import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const TrackingStatusBar = ({ isConnected, trackingData, colors }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      // Start pulse animation for connected state
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected]);

  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        icon: "warning-outline",
        text: "Connecting to tracking service...",
        color: "#FF9800",
        backgroundColor: "rgba(255, 152, 0, 0.1)",
      };
    }

    if (trackingData?.lastUpdate) {
      const lastUpdateTime = new Date(trackingData.lastUpdate);
      const now = new Date();
      const timeDiff = Math.floor((now - lastUpdateTime) / 1000); // seconds

      if (timeDiff < 30) {
        return {
          icon: "radio-outline",
          text: "Live tracking active",
          color: "#4CAF50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
        };
      } else if (timeDiff < 120) {
        return {
          icon: "time-outline",
          text: `Last update ${timeDiff}s ago`,
          color: "#FF9800",
          backgroundColor: "rgba(255, 152, 0, 0.1)",
        };
      } else {
        return {
          icon: "alert-circle-outline",
          text: "Location updates delayed",
          color: "#F44336",
          backgroundColor: "rgba(244, 67, 54, 0.1)",
        };
      }
    }

    return {
      icon: "checkmark-circle-outline",
      text: "Connected to tracking service",
      color: "#4CAF50",
      backgroundColor: "rgba(76, 175, 80, 0.1)",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusInfo.backgroundColor,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: isConnected ? pulseAnim : 1 }] },
          ]}
        >
          <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
        </Animated.View>

        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>

        {trackingData?.speed !== undefined && (
          <View style={styles.speedContainer}>
            <Ionicons
              name="speedometer-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.speedText, { color: colors.textSecondary }]}>
              {Math.round(trackingData.speed)} km/h
            </Text>
          </View>
        )}
      </View>

      {/* Signal strength indicator */}
      {isConnected && (
        <View style={styles.signalBars}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              style={[
                styles.signalBar,
                {
                  height: bar * 3 + 2,
                  backgroundColor:
                    bar <= (trackingData?.signalStrength || 4)
                      ? statusInfo.color
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  speedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  speedText: {
    fontSize: 11,
    fontWeight: "500",
  },
  signalBars: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  signalBar: {
    width: 2,
    borderRadius: 1,
  },
});

export default TrackingStatusBar;
