import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./StarRating";
import RatingModal from "./RatingModal";
import { ratingApi } from "../../services/ratingApi";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const RatingPrompt = ({
  promptData,
  onResponse,
  onDismiss,
  style,
  position = "bottom", // 'top', 'bottom', 'center'
}) => {
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (promptData) {
      setVisible(true);
      showPrompt();
    }
  }, [promptData]);

  const showPrompt = () => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hidePrompt = (callback) => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  const handleQuickRating = async (rating) => {
    if (isSubmitting) return;

    setQuickRating(rating);
    setIsSubmitting(true);

    try {
      // Create quick rating
      const ratingData = {
        ...promptData,
        overallRating: rating,
        comment:
          rating >= 4
            ? "Quick positive rating"
            : rating <= 2
            ? "Quick negative rating"
            : "Quick neutral rating",
      };

      const response = await ratingApi.createRating(ratingData);

      if (response.success) {
        hidePrompt(() => {
          onResponse?.("completed", promptData.triggerId, response.data._id);
        });
      } else {
        throw new Error(response.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting quick rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedRating = () => {
    setRatingModalVisible(true);
  };

  const handleModalSubmit = async (ratingData) => {
    try {
      const response = await ratingApi.createRating(ratingData);

      if (response.success) {
        setRatingModalVisible(false);
        hidePrompt(() => {
          onResponse?.("completed", promptData.triggerId, response.data._id);
        });
      } else {
        throw new Error(response.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting detailed rating:", error);
      throw error;
    }
  };

  const handleDismiss = () => {
    hidePrompt(() => {
      onResponse?.("dismissed", promptData.triggerId);
      onDismiss?.();
    });
  };

  const handlePostpone = () => {
    hidePrompt(() => {
      onResponse?.("postponed", promptData.triggerId);
      onDismiss?.();
    });
  };

  if (!visible || !promptData) {
    return null;
  }

  const getTransform = () => {
    if (position === "top") {
      return {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 0],
        }),
      };
    } else if (position === "center") {
      return {
        scale: slideAnim,
        opacity: slideAnim,
      };
    } else {
      // bottom
      return {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [200, 0],
        }),
      };
    }
  };

  const getContainerStyle = () => {
    const baseStyle = [styles.container];

    if (position === "top") {
      baseStyle.push(styles.topContainer);
    } else if (position === "center") {
      baseStyle.push(styles.centerContainer);
    } else {
      baseStyle.push(styles.bottomContainer);
    }

    return baseStyle;
  };

  return (
    <>
      <Animated.View
        style={[
          getContainerStyle(),
          {
            transform: [getTransform()],
          },
          style,
        ]}
      >
        <View style={styles.promptCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{promptData.title}</Text>
              <Text style={styles.description}>{promptData.description}</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Quick Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Quick rating:</Text>
            <StarRating
              value={quickRating}
              onChange={handleQuickRating}
              size={28}
              disabled={isSubmitting}
              style={styles.starRating}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleDetailedRating}
              style={styles.detailedButton}
              disabled={isSubmitting}
            >
              <Text style={styles.detailedButtonText}>Add Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePostpone}
              style={styles.postponeButton}
              disabled={isSubmitting}
            >
              <Text style={styles.postponeButtonText}>Later</Text>
            </TouchableOpacity>
          </View>

          {/* Trigger indicator (for debugging/testing) */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                {promptData.triggerType} • Score: {promptData.triggerScore}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Detailed Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleModalSubmit}
        ratingType={promptData.ratingType}
        entityType={promptData.entityType}
        entityId={promptData.entityId}
        entityName={promptData.entityName}
        contextData={promptData.contextData}
        title={promptData.title}
        description={promptData.description}
      />
    </>
  );
};

const styles = createStylesWithDMSans({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  topContainer: {
    top: 60,
  },
  bottomContainer: {
    bottom: 100,
  },
  centerContainer: {
    top: "50%",
    marginTop: -100,
  },
  promptCard: {
    backgroundColor: "#F8FFFC",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    fontWeight: "500",
  },
  starRating: {
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailedButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  detailedButtonText: {
    color: "#F8FFFC",
    fontSize: 14,
    fontWeight: "500",
  },
  postponeButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  postponeButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  debugInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  debugText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

export default RatingPrompt;
