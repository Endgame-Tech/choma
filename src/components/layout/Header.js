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
  navigation,
  rightComponent
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

        {navigation && (
          <View style={styles(colors).notificationContainer}>
            <NotificationIcon navigation={navigation} />
          </View>
        )}


      
      {showRightIcon && (
        rightComponent ? rightComponent : (
          <TouchableOpacity style={styles(colors).rightButton} onPress={onRightPress}>
            <Ionicons name={rightIcon} size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )
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
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    zIndex: 1,
  },
  headerContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  rightButton: {
    padding: 8,
    marginLeft: 12,
    zIndex: 1,
  },
  notificationContainer: {
    zIndex: 1,
  },
});

export default StandardHeader;