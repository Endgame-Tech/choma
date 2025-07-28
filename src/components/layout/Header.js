import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import NotificationIcon from '../../components/ui/NotificationIcon';
import { useNotification } from '../../context/NotificationContext';

const StandardHeader = ({ 
  title, 
  onBackPress, 
  rightIcon = "help-circle-outline", 
  onRightPress,
  showRightIcon = true,
  navigation 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles(colors).header}>
      <TouchableOpacity
        style={styles(colors).backButton}
        onPress={onBackPress}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <View style={styles(colors).headerContent}>
        <Text style={styles(colors).headerTitle}>{title}</Text>
      </View>

        <View style={styles(colors).notificationContainer}>
          <NotificationIcon navigation={navigation} />
        </View>


      
      {showRightIcon && (
        <TouchableOpacity style={styles(colors).rightButton} onPress={onRightPress}>
          <Ionicons name={rightIcon} size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  rightButton: {
    padding: 8,
    marginLeft: 12,
  },
  notificationContainer: {
    // Added for consistency
  },
});

export default StandardHeader;