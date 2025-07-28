// src/utils/profileConstants.js

// Dietary preferences options
export const DIETARY_PREFERENCES = [
  'Vegetarian',
  'Vegan',
  'Keto',
  'Paleo',
  'Gluten-Free',
  'Dairy-Free',
  'Pescatarian',
  'Low-Carb',
  'Mediterranean',
  'Halal',
  'Kosher',
  'No Nuts'
];

// Profile image config
export const PROFILE_IMAGE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png'],
  dimensions: {
    width: 300,
    height: 300
  }
};

// Profile form validation
export const VALIDATION = {
  fullName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    errorMessage: 'Full name is required (3-50 characters)'
  },
  phone: {
    required: false,
    pattern: /^[0-9+\-\s]{7,15}$/,
    errorMessage: 'Please enter a valid phone number'
  },
  address: {
    required: false,
    minLength: 5,
    maxLength: 200,
    errorMessage: 'Address should be 5-200 characters'
  },
  allergies: {
    required: false,
    maxLength: 200,
    errorMessage: 'Allergies description is too long (max 200 characters)'
  }
};
