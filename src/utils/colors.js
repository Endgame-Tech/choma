// src/utils/colors.js - Modern Dark Theme Colors

export const lightColors = {
  // Primary Colors
  primary: '#F7AE1A',
  primaryDark: '#D96800',
  primaryLight: '#FF9A3F',
  
  // Background Colors
  background: '#FFF6E8',
  cardBackground: '#FFFFFF',
  modalBackground: '#FFFFFF',
  
  // Text Colors
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // UI Colors
  border: '#EAEAEA',
  separator: '#F0F0F0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Status Colors
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',
  
  // Rating/Accent
  rating: '#FFD700',
  accent: '#FF6B35',

  // Common
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  // Primary Colors
  primary: '#F7AE1A', // Orange accent color from the image
  primaryDark: '#b6c530ff',
  primaryLight: '#f0fb8ee0',
  
  // Background Colors
  background: '#111111ff', // Dark background
  cardBackground: '#2A2A2A', // Card background
  modalBackground: '#333333',
  
  // Text Colors
  text: '#FFFFFF', // Primary white text
  textSecondary: '#B0B0B0', // Secondary gray text
  textMuted: '#808080', // Muted text
  
  // UI Colors
  border: '#3A3A3A',
  separator: '#404040',
  overlay: 'rgba(0, 0, 0, 0.8)',
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#F44336',
  info: '#2196F3',
  
  // Rating/Accent
  rating: '#FFD700',
  accent: '#FF6B35',
  
  // Common
  white: '#FFFFFF',
  black: '#000000',
};



// Default COLORS export (using lightColors for backward compatibility)
export const COLORS = lightColors;

// Theme configuration
export const THEME = {
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    }
  }
};
