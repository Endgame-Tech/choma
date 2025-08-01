import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../styles/theme';

const NotificationIcon = ({ size = 24, color }) => {
  const { unreadCount } = useNotification();
  const { colors } = useTheme();
  const navigation = useNavigation();
  
  // Use provided color, or fallback to theme-aware color
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity 
      style={styles(colors).container}
      onPress={() => navigation.navigate('Notifications')}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={size} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles(colors).badge}>
          <Text style={styles(colors).badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error || '#FF6B47',
    borderRadius: 10,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default NotificationIcon;
