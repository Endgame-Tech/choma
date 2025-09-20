import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import CustomText from '../ui/CustomText';
import { DELIVERY_STATUSES, DRIVER_STATUSES } from '../../utils/constants';

const DeliveryStatusBadge = ({
  status,
  type = 'delivery', // 'delivery' or 'driver'
  size = 'medium', // 'small', 'medium', 'large'
  style = {},
}) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    if (type === 'driver') {
      switch (status) {
        case DRIVER_STATUSES.ONLINE:
          return {
            backgroundColor: colors.success,
            textColor: colors.white,
            icon: '🟢',
            text: 'Online',
          };
        case DRIVER_STATUSES.OFFLINE:
          return {
            backgroundColor: colors.error,
            textColor: colors.white,
            icon: '🔴',
            text: 'Offline',
          };
        case DRIVER_STATUSES.BUSY:
          return {
            backgroundColor: colors.warning,
            textColor: colors.white,
            icon: '🟡',
            text: 'Busy',
          };
        case DRIVER_STATUSES.ON_BREAK:
          return {
            backgroundColor: colors.info,
            textColor: colors.white,
            icon: '⏸️',
            text: 'On Break',
          };
        case DRIVER_STATUSES.DELIVERING:
          return {
            backgroundColor: colors.primary,
            textColor: colors.white,
            icon: '🚚',
            text: 'Delivering',
          };
        default:
          return {
            backgroundColor: colors.backgroundSecondary,
            textColor: colors.textSecondary,
            icon: '⚪',
            text: 'Unknown',
          };
      }
    } else {
      // Delivery status
      switch (status) {
        case DELIVERY_STATUSES.ASSIGNED:
          return {
            backgroundColor: colors.warning,
            textColor: colors.white,
            icon: '📋',
            text: 'Assigned',
          };
        case DELIVERY_STATUSES.ACCEPTED:
          return {
            backgroundColor: colors.info,
            textColor: colors.white,
            icon: '✅',
            text: 'Accepted',
          };
        case DELIVERY_STATUSES.PICKED_UP:
          return {
            backgroundColor: colors.primary,
            textColor: colors.white,
            icon: '📦',
            text: 'Picked Up',
          };
        case DELIVERY_STATUSES.IN_TRANSIT:
          return {
            backgroundColor: colors.primary,
            textColor: colors.white,
            icon: '🚚',
            text: 'In Transit',
          };
        case DELIVERY_STATUSES.DELIVERED:
          return {
            backgroundColor: colors.success,
            textColor: colors.white,
            icon: '✅',
            text: 'Delivered',
          };
        case DELIVERY_STATUSES.CANCELLED:
          return {
            backgroundColor: colors.error,
            textColor: colors.white,
            icon: '❌',
            text: 'Cancelled',
          };
        case DELIVERY_STATUSES.FAILED:
          return {
            backgroundColor: colors.error,
            textColor: colors.white,
            icon: '⚠️',
            text: 'Failed',
          };
        default:
          return {
            backgroundColor: colors.backgroundSecondary,
            textColor: colors.textSecondary,
            icon: '❓',
            text: 'Unknown',
          };
      }
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 10,
          iconSize: 8,
        };
      case 'large':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 14,
          iconSize: 16,
        };
      default: // medium
        return {
          paddingHorizontal: 10,
          paddingVertical: 4,
          fontSize: 12,
          iconSize: 12,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles(colors).container,
        {
          backgroundColor: statusConfig.backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        style,
      ]}
    >
      <CustomText
        style={[
          styles(colors).icon,
          { fontSize: sizeStyles.iconSize },
        ]}
      >
        {statusConfig.icon}
      </CustomText>
      <CustomText
        style={[
          styles(colors).text,
          {
            color: statusConfig.textColor,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {statusConfig.text}
      </CustomText>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    icon: {
      marginRight: 4,
    },
    text: {
      fontWeight: '600',
    },
  });

export default DeliveryStatusBadge;