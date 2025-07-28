// src/components/dashboard/OrderCardSkeleton.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../ui/Skeleton';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';

const OrderCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={styles(colors).orderCard}>
      <View style={styles(colors).orderHeader}>
        <Skeleton height={20} width={'40%'} />
        <Skeleton height={24} width={'30%'} />
      </View>
      <View style={styles(colors).orderItem}>
        <Skeleton height={70} width={70} style={{ borderRadius: THEME.borderRadius.medium }} />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Skeleton height={20} width={'80%'} style={{ marginBottom: 10 }} />
          <Skeleton height={16} width={'50%'} />
        </View>
      </View>
      <View style={styles(colors).orderSummary}>
        <Skeleton height={16} width={'100%'} style={{ marginBottom: 10 }} />
        <Skeleton height={16} width={'100%'} />
      </View>
      <View style={styles(colors).actionButtons}>
        <Skeleton height={40} style={{ flex: 1, borderRadius: THEME.borderRadius.medium }} />
        <Skeleton height={40} style={{ flex: 1, borderRadius: THEME.borderRadius.medium }} />
      </View>
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderSummary: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default OrderCardSkeleton;
