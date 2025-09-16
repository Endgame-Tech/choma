import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useOffline } from "../../context/OfflineContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const OfflineStatusBanner = () => {
  const { isOffline, isConnected, syncInProgress, queuedRequests } =
    useOffline();
  const [slideAnim] = useState(new Animated.Value(-50));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOffline || syncInProgress || queuedRequests.length > 0) {
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isOffline, syncInProgress, queuedRequests, slideAnim]);

  if (!visible) return null;

  const getBannerContent = () => {
    if (syncInProgress) {
      return {
        text: "Syncing data...",
        backgroundColor: "#FF9800",
        textColor: "#FFFFFF",
      };
    }

    if (queuedRequests.length > 0 && isConnected) {
      return {
        text: `Processing ${queuedRequests.length} pending requests...`,
        backgroundColor: "#2196F3",
        textColor: "#FFFFFF",
      };
    }

    if (isOffline) {
      return {
        text: "You are offline. Some features may be limited.",
        backgroundColor: "#757575",
        textColor: "#FFFFFF",
      };
    }

    return {
      text: "Connected",
      backgroundColor: "#4CAF50",
      textColor: "#FFFFFF",
    };
  };

  const { text, backgroundColor, textColor } = getBannerContent();

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={[styles.bannerText, { color: textColor }]}>{text}</Text>
    </Animated.View>
  );
};

const styles = createStylesWithDMSans({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default OfflineStatusBanner;
