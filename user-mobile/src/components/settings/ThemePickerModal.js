import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../styles/theme';
import CustomIcon from '../ui/CustomIcon';

const ThemePickerModal = ({ isVisible, onClose }) => {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  const themeOptions = [
    {
      key: 'light',
      title: 'Light',
      icon: 'sunny',
    },
    {
      key: 'dark',
      title: 'Dark',
      icon: 'moon',
    },
    {
      key: 'system',
      title: 'System',
      icon: 'phone-portrait',
      subtitle: isDark ? 'Currently: Dark' : 'Currently: Light',
    },
  ];

  const handleSelectTheme = (mode) => {
    setThemeMode(mode);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles(colors).modalOverlay}>
        <TouchableOpacity
          style={styles(colors).overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles(colors).modalContainer}>
          <Text style={styles(colors).headerTitle}>Display Theme</Text>
          <View style={styles(colors).optionsContainer}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles(colors).option,
                  themeMode === option.key && styles(colors).selectedOption,
                ]}
                onPress={() => handleSelectTheme(option.key)}
              >
                <CustomIcon
                  name={option.icon}
                  size={22}
                  color={
                    themeMode === option.key ? colors.primary : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles(colors).optionText,
                    themeMode === option.key && styles(colors).selectedText,
                  ]}
                >
                  {option.title}
                </Text>
                {option.subtitle && themeMode === option.key && (
                  <Text style={styles(colors).subtitleText}>
                    {option.subtitle}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTouchable: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 15,
      padding: 20,
      width: '80%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    headerTitle: {
      fontSize: 18, // Reduced size
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 15, // Added margin
    },
    optionsContainer: {
      flexDirection: 'row', // Horizontal layout
      justifyContent: 'space-around', // Space out options
    },
    option: {
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      width: 80, // Fixed width for each option
    },
    selectedOption: {
      backgroundColor: colors.primary + '20',
    },
    optionText: {
      fontSize: 14, // Reduced size
      color: colors.textSecondary,
      marginTop: 8, // Spacing between icon and text
    },
    selectedText: {
      color: colors.primary,
      fontWeight: '600',
    },
    subtitleText: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
  });

export default ThemePickerModal;