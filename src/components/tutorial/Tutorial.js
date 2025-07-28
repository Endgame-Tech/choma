// src/components/tutorial/Tutorial.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';

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

  return (
    <Modal transparent visible={isVisible} onRequestClose={onDismiss}>
      <View style={styles(colors).overlay}>
        <View style={[styles(colors).tooltipContainer, { top: currentStep.y, left: currentStep.x }]}>
          <Text style={styles(colors).title}>{currentStep.title}</Text>
          <Text style={styles(colors).description}>{currentStep.description}</Text>
          <View style={styles(colors).buttonsContainer}>
            {currentStepIndex > 0 && (
              <TouchableOpacity onPress={handlePrevious} style={styles(colors).button}>
                <Text style={styles(colors).buttonText}>Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleNext} style={[styles(colors).button, styles(colors).primaryButton]}>
              <Text style={styles(colors).primaryButtonText}>
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tooltipContainer: {
    position: 'absolute',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    width: 300,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.borderRadius.medium,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Tutorial;
