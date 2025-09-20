import React from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import CustomText from '../ui/CustomText';

const EarningsCard = ({
  title = "Today's Earnings",
  amount = 0,
  currency = "₦",
  subtitle,
  trend,
  onPress,
  style = {},
}) => {
  const { colors } = useTheme();

  const formatAmount = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const getTrendColor = () => {
    if (!trend) return colors.textSecondary;
    return trend > 0 ? colors.success : trend < 0 ? colors.error : colors.textSecondary;
  };

  const getTrendIcon = () => {
    if (!trend) return '';
    return trend > 0 ? '↗️' : trend < 0 ? '↘️' : '➡️';
  };

  return (
    <TouchableOpacity
      style={[styles(colors).container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles(colors).header}>
        <CustomText style={styles(colors).title}>{title}</CustomText>
        {trend !== undefined && (
          <View style={styles(colors).trendContainer}>
            <CustomText style={[styles(colors).trendIcon]}>
              {getTrendIcon()}
            </CustomText>
            <CustomText style={[styles(colors).trendText, { color: getTrendColor() }]}>
              {Math.abs(trend)}%
            </CustomText>
          </View>
        )}
      </View>

      {/* Amount */}
      <View style={styles(colors).amountContainer}>
        <CustomText style={styles(colors).currency}>{currency}</CustomText>
        <CustomText style={styles(colors).amount}>{formatAmount(amount)}</CustomText>
      </View>

      {/* Subtitle */}
      {subtitle && (
        <CustomText style={styles(colors).subtitle}>{subtitle}</CustomText>
      )}

      {/* Progress Indicator */}
      <View style={styles(colors).progressContainer}>
        <View style={styles(colors).progressBar}>
          <View 
            style={[
              styles(colors).progressFill,
              { width: `${Math.min((amount / 50000) * 100, 100)}%` } // Assuming daily target of ₦50,000
            ]}
          />
        </View>
        <CustomText style={styles(colors).progressText}>
          {Math.min(Math.round((amount / 50000) * 100), 100)}% of daily target
        </CustomText>
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginVertical: 8,
      marginHorizontal: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    trendIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    trendText: {
      fontSize: 12,
      fontWeight: '600',
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 8,
    },
    currency: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
      marginRight: 4,
    },
    amount: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    progressContainer: {
      marginTop: 8,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

export default EarningsCard;