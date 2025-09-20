import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '../../styles/theme';
import { createStylesWithDMSans } from '../../utils/fontUtils';
import CustomText from '../ui/CustomText';
import { DELIVERY_STATUSES } from '../../utils/constants';

const DeliveryCard = ({
  delivery,
  onPress,
  style = {},
}) => {
  const { colors } = useTheme();

  const getStatusColor = (status) => {
    switch (status) {
      case DELIVERY_STATUSES.ASSIGNED:
        return colors.warning;
      case DELIVERY_STATUSES.ACCEPTED:
        return colors.info;
      case DELIVERY_STATUSES.PICKED_UP:
      case DELIVERY_STATUSES.IN_TRANSIT:
        return colors.primary;
      case DELIVERY_STATUSES.DELIVERED:
        return colors.success;
      case DELIVERY_STATUSES.CANCELLED:
      case DELIVERY_STATUSES.FAILED:
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  return (
    <TouchableOpacity
      style={[styles(colors).container, style]}
      onPress={() => onPress(delivery)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles(colors).header}>
        <View style={styles(colors).orderInfo}>
          <CustomText style={styles(colors).orderId}>
            #{delivery.orderId || delivery.id}
          </CustomText>
          <CustomText style={styles(colors).orderTime}>
            {formatTime(delivery.createdAt)}
          </CustomText>
        </View>
        <View style={[
          styles(colors).statusBadge,
          { backgroundColor: getStatusColor(delivery.status) }
        ]}>
          <CustomText style={styles(colors).statusText}>
            {delivery.status?.replace('_', ' ').toUpperCase()}
          </CustomText>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles(colors).customerInfo}>
        <CustomText style={styles(colors).customerName}>
          {delivery.customerName || 'Customer'}
        </CustomText>
        <CustomText style={styles(colors).deliveryAddress} numberOfLines={2}>
          📍 {delivery.deliveryAddress}
        </CustomText>
      </View>

      {/* Delivery Details */}
      <View style={styles(colors).deliveryDetails}>
        <View style={styles(colors).detailItem}>
          <CustomText style={styles(colors).detailLabel}>Distance</CustomText>
          <CustomText style={styles(colors).detailValue}>
            {formatDistance(delivery.distance)}
          </CustomText>
        </View>
        <View style={styles(colors).detailItem}>
          <CustomText style={styles(colors).detailLabel}>Earnings</CustomText>
          <CustomText style={styles(colors).detailValue}>
            ₦{delivery.earnings || '0'}
          </CustomText>
        </View>
        <View style={styles(colors).detailItem}>
          <CustomText style={styles(colors).detailLabel}>Items</CustomText>
          <CustomText style={styles(colors).detailValue}>
            {delivery.itemCount || 1}
          </CustomText>
        </View>
      </View>

      {/* Action Indicator */}
      {delivery.status === DELIVERY_STATUSES.ASSIGNED && (
        <View style={styles(colors).actionIndicator}>
          <CustomText style={styles(colors).actionText}>
            Tap to Accept
          </CustomText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      marginHorizontal: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderInfo: {
      flex: 1,
    },
    orderId: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    orderTime: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.white,
    },
    customerInfo: {
      marginBottom: 12,
    },
    customerName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    deliveryAddress: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    deliveryDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailItem: {
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    actionIndicator: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingVertical: 6,
      alignItems: 'center',
      marginTop: 8,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
  });

export default DeliveryCard;