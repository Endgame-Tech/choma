// src/components/ui/UserAvatar.js - Reusable User Avatar Component
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../styles/theme';

const UserAvatar = ({ 
  user, 
  size = 60, 
  fontSize = 24, 
  imageUri = null,
  style = {} 
}) => {
  const { colors } = useTheme();
  
  const avatarSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  
  const textSize = {
    fontSize: fontSize,
  };
  
  // Priority: imageUri prop > user.profileImage > user.avatar > fallback to initials
  const profileImageSource = imageUri || user?.profileImage || user?.avatar;
  
  if (profileImageSource) {
    return (
      <View style={[styles.container, avatarSize, style]}>
        <Image 
          source={{ uri: profileImageSource }} 
          style={[styles.image, avatarSize]}
          onError={() => {
            // Handle image loading error by falling back to initials
            console.log('Failed to load profile image, falling back to initials');
          }}
        />
      </View>
    );
  }
  
  // Fallback to initials
  const initials = user?.fullName 
    ? user.fullName.split(' ').map(name => name.charAt(0)).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
  
  return (
    <View style={[styles.container, avatarSize, style]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.gradient, avatarSize]}
      >
        <Text style={[styles.initials, textSize, { color: colors.white }]}>
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UserAvatar;