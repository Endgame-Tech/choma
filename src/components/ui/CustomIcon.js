// src/components/ui/CustomIcon.js
import React from "react";
import { View } from "react-native";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Navigation Icons
import HomeFilled from "../../../assets/images/icons/navigation/home-filled.svg";
import HomeOutline from "../../../assets/images/icons/navigation/home-outline.svg";
import SearchFilled from "../../../assets/images/icons/navigation/search-filled.svg";
import SearchOutline from "../../../assets/images/icons/navigation/search-outline.svg";
import CartFilled from "../../../assets/images/icons/navigation/cart-filled.svg";
import CartOutline from "../../../assets/images/icons/navigation/cart-outline.svg";
import ProfileFilled from "../../../assets/images/icons/navigation/profile-filled.svg";
import ProfileOutline from "../../../assets/images/icons/navigation/profile-outline.svg";

// UI Icons
import DailyCalendar from "../../../assets/images/icons/ui/daily-calendar.svg";

// Icon mapping object for easy access
const ICON_MAP = {
  // Navigation Icons - Filled
  "home-filled": HomeFilled,
  "search-filled": SearchFilled,
  "cart-filled": CartFilled,
  "profile-filled": ProfileFilled,
  
  // Navigation Icons - Outline
  "home-outline": HomeOutline,
  "search-outline": SearchOutline,
  "cart-outline": CartOutline,
  "profile-outline": ProfileOutline,
  
  // UI Icons
  "daily-calendar": DailyCalendar,
  "calendar": DailyCalendar, // Alias
  
  // Common aliases for easier usage
  "home": HomeOutline,
  "search": SearchOutline,
  "cart": CartOutline,
  "bag": CartOutline,
  "profile": ProfileOutline,
  "person": ProfileOutline,
  "user": ProfileOutline,
};

/**
 * CustomIcon Component
 * 
 * A centralized icon component that handles all custom SVG icons in the app.
 * Falls back to a default view if icon is not found.
 * 
 * @param {string} name - Icon name (e.g., "home-filled", "search-outline")
 * @param {number} size - Icon size (default: 24)
 * @param {string} color - Icon color (default: "#000")
 * @param {object} style - Additional styling
 * @param {object} ...props - Additional props passed to the icon component
 */
const CustomIcon = ({ 
  name, 
  size = 24, 
  color = "#000", 
  style, 
  ...props 
}) => {
  // Get the icon component from the map
  const IconComponent = ICON_MAP[name];
  
  // If icon doesn't exist, return a placeholder
  if (!IconComponent) {
    console.warn(`CustomIcon: Icon "${name}" not found. Available icons:`, Object.keys(ICON_MAP));
    return (
      <View 
        style={[
          styles.placeholder, 
          { width: size, height: size },
          style
        ]}
        {...props}
      />
    );
  }

  // Common props for all icons
  const iconProps = {
    width: size,
    height: size,
    fill: color,
    style,
    ...props,
  };

  return <IconComponent {...iconProps} />;
};

/**
 * Helper function to get available icon names
 * Useful for development and debugging
 */
export const getAvailableIcons = () => Object.keys(ICON_MAP);

/**
 * Helper function to check if an icon exists
 */
export const iconExists = (name) => Boolean(ICON_MAP[name]);

/**
 * Predefined icon sets for common usage patterns
 */
export const ICON_SETS = {
  navigation: {
    home: { filled: "home-filled", outline: "home-outline" },
    search: { filled: "search-filled", outline: "search-outline" },
    cart: { filled: "cart-filled", outline: "cart-outline" },
    profile: { filled: "profile-filled", outline: "profile-outline" },
  },
  ui: {
    calendar: "daily-calendar",
  },
};

const styles = createStylesWithDMSans({
  placeholder: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CustomIcon;