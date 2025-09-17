// Number formatting utilities

/**
 * Format number to readable format with K/M suffixes
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Formatted string (e.g., "1.2K", "3.5M")
 */
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }

  const num = Number(value);

  if (num === 0) return "0";

  // Less than 1000 - show as is
  if (Math.abs(num) < 1000) {
    return num.toString();
  }

  // 1000 to 999,999 - show as K
  if (Math.abs(num) < 1000000) {
    const formatted = (num / 1000).toFixed(decimals);
    return `${parseFloat(formatted)}K`;
  }

  // 1,000,000 and above - show as M
  const formatted = (num / 1000000).toFixed(decimals);
  return `${parseFloat(formatted)}M`;
};

/**
 * Format nutrition value with unit suffix
 * @param {number} value - The nutrition value
 * @param {string} unit - The unit (e.g., "g", "mg", "")
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted string with unit
 */
export const formatNutritionValue = (value, unit = "", decimals = 1) => {
  const formattedNumber = formatNumber(value, decimals);
  return unit ? `${formattedNumber}${unit}` : formattedNumber;
};

/**
 * Format calories specifically (no unit, but with K/M formatting)
 * @param {number} calories - The calorie value
 * @returns {string} - Formatted calories
 */
export const formatCalories = (calories) => {
  return formatNumber(calories, 0); // No decimals for calories
};

/**
 * Format weight/grams with appropriate unit
 * @param {number} grams - Weight in grams
 * @returns {string} - Formatted weight with unit
 */
export const formatWeight = (grams) => {
  if (!grams || grams === 0) return "0g";

  // Convert to kg if over 1000g
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }

  return `${grams}g`;
};
