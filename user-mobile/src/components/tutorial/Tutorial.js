// src/components/tutorial/Tutorial.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const Tutorial = ({ steps, isVisible, onDismiss }) => {
  const { colors } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setCurrentStepIndex(0);
    }
  }, [isVisible]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onDismiss();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!isVisible || !steps || steps.length === 0) {
    return null;
  }

  const currentStep = steps[currentStepIndex];

  // Calculate smart positioning to keep tooltip visible
  const calculatePosition = () => {
    const tooltipWidth = 280;
    const tooltipHeight = 150; // Approximate height
    const margin = 20;

    let x = currentStep.x || screenWidth / 2 - tooltipWidth / 2;
    let y = currentStep.y || screenHeight / 2 - tooltipHeight / 2;

    // Ensure tooltip stays within screen bounds
    if (x + tooltipWidth > screenWidth - margin) {
      x = screenWidth - tooltipWidth - margin;
    }
    if (x < margin) {
      x = margin;
    }

    if (y + tooltipHeight > screenHeight - margin) {
      y = screenHeight - tooltipHeight - margin;
    }
    if (y < margin) {
      y = margin;
    }

    return { x, y };
  };

  const position = calculatePosition();

  return (
    <Modal transparent visible={isVisible} onRequestClose={onDismiss}>
      <View style={styles(colors).overlay}>
        <View
          style={[
            styles(colors).tooltipContainer,
            { top: position.y, left: position.x },
          ]}
        >
          <Text style={styles(colors).title}>{currentStep.title}</Text>
          <Text style={styles(colors).description}>
            {currentStep.description}
          </Text>

          {/* Progress indicator */}
          <View style={styles(colors).progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles(colors).progressDot,
                  index === currentStepIndex &&
                    styles(colors).progressDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles(colors).buttonsContainer}>
            {currentStepIndex > 0 && (
              <TouchableOpacity
                onPress={handlePrevious}
                style={styles(colors).button}
              >
                <Text style={styles(colors).buttonText}>Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles(colors).button, styles(colors).primaryButton]}
            >
              <Text style={styles(colors).primaryButtonText}>
                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)", // Less dark overlay
    },
    tooltipContainer: {
      position: "absolute",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16, // Smaller padding (was 20)
      width: 280, // Smaller width (was 300)
      maxWidth: "85%", // Responsive width
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: 16, // Smaller font (was 18)
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8, // Less margin (was 10)
    },
    description: {
      fontSize: 14, // Smaller font (was 16)
      color: colors.textSecondary,
      marginBottom: 16, // Less margin (was 20)
      lineHeight: 20,
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    button: {
      paddingVertical: 8, // Smaller padding (was 10)
      paddingHorizontal: 16, // Smaller padding (was 20)
      borderRadius: THEME.borderRadius.medium,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.text,
      fontSize: 14, // Smaller font (was 16)
    },
    primaryButtonText: {
      color: colors.black,
      fontSize: 14,
      fontWeight: "600",
    },
    progressContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      gap: 6,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
      width: 20,
      borderRadius: 4,
      fontWeight: "bold",
    },
  });

export default Tutorial;
