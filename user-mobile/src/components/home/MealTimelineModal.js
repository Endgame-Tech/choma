import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import MealProgressionTimeline from "../subscription/MealProgressionTimeline";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const MealTimelineModal = ({
  visible = false,
  onClose,
  selectedSubscription,
  onMealPress,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles(colors).container}>
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            style={styles(colors).closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles(colors).headerTitle}>Meal Timeline</Text>
          <View style={styles(colors).placeholder} />
        </View>

        {/* Timeline Content */}
        {selectedSubscription && (
          <MealProgressionTimeline
            subscriptionId={selectedSubscription._id}
            onMealPress={onMealPress}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    placeholder: {
      width: 32,
    },
  });

export default MealTimelineModal;
