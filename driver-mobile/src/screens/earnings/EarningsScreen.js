// src/screens/earnings/EarningsScreen.js - Driver earnings and financial overview
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { useDriverAuth } from '../../contexts/DriverAuthContext';
import CustomText from '../../components/ui/CustomText';
import EarningsCard from '../../components/delivery/EarningsCard';
import StatusMessage from '../../components/ui/StatusMessage';
import { createStylesWithDMSans } from '../../utils/fontUtils';

const EarningsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { driver } = useDriverAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockData = {
        totalEarnings: 125000,
        deliveryCount: 28,
        averagePerDelivery: 4464,
        bonusEarnings: 15000,
        weeklyBreakdown: [
          { day: 'Mon', amount: 18000 },
          { day: 'Tue', amount: 22000 },
          { day: 'Wed', amount: 15000 },
          { day: 'Thu', amount: 25000 },
          { day: 'Fri', amount: 28000 },
          { day: 'Sat', amount: 12000 },
          { day: 'Sun', amount: 5000 },
        ],
        recentDeliveries: [
          { id: '1', amount: 3500, date: '2024-01-15', customer: 'John Doe' },
          { id: '2', amount: 4200, date: '2024-01-15', customer: 'Jane Smith' },
          { id: '3', amount: 2800, date: '2024-01-14', customer: 'Mike Johnson' },
        ]
      };
      
      setEarningsData(mockData);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const periods = [
    { key: 'week', title: 'This Week' },
    { key: 'month', title: 'This Month' },
    { key: 'year', title: 'This Year' },
  ];

  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };

  const renderPeriodButton = (period) => {
    const isActive = selectedPeriod === period.key;
    return (
      <TouchableOpacity
        key={period.key}
        style={[
          styles(colors).periodButton,
          { 
            backgroundColor: isActive ? colors.primary : 'transparent',
            borderColor: colors.primary 
          }
        ]}
        onPress={() => setSelectedPeriod(period.key)}
      >
        <CustomText style={[
          styles(colors).periodText,
          { color: isActive ? 'white' : colors.primary }
        ]}>
          {period.title}
        </CustomText>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={styles(colors).loadingText}>
            Loading earnings data...
          </CustomText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <View style={styles(colors).headerContent}>
          <CustomText style={styles(colors).headerTitle}>Earnings</CustomText>
          <CustomText style={styles(colors).headerSubtitle}>
            Track your delivery income
          </CustomText>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selection */}
      <View style={styles(colors).periodContainer}>
        {periods.map(renderPeriodButton)}
      </View>

      <ScrollView
        style={styles(colors).content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Total Earnings Card */}
        <View style={styles(colors).totalCard}>
          <View style={styles(colors).totalHeader}>
            <Ionicons name="wallet" size={32} color={colors.primary} />
            <View style={styles(colors).totalInfo}>
              <CustomText style={styles(colors).totalLabel}>Total Earnings</CustomText>
              <CustomText style={styles(colors).totalAmount}>
                {formatCurrency(earningsData?.totalEarnings)}
              </CustomText>
            </View>
          </View>
          
          <View style={styles(colors).statsRow}>
            <View style={styles(colors).statItem}>
              <CustomText style={styles(colors).statValue}>
                {earningsData?.deliveryCount || 0}
              </CustomText>
              <CustomText style={styles(colors).statLabel}>Deliveries</CustomText>
            </View>
            <View style={styles(colors).statItem}>
              <CustomText style={styles(colors).statValue}>
                {formatCurrency(earningsData?.averagePerDelivery)}
              </CustomText>
              <CustomText style={styles(colors).statLabel}>Average</CustomText>
            </View>
            <View style={styles(colors).statItem}>
              <CustomText style={styles(colors).statValue}>
                {formatCurrency(earningsData?.bonusEarnings)}
              </CustomText>
              <CustomText style={styles(colors).statLabel}>Bonuses</CustomText>
            </View>
          </View>
        </View>

        {/* Weekly Breakdown */}
        <View style={styles(colors).breakdownCard}>
          <CustomText style={styles(colors).sectionTitle}>Weekly Breakdown</CustomText>
          <View style={styles(colors).chartContainer}>
            {earningsData?.weeklyBreakdown?.map((day, index) => (
              <View key={index} style={styles(colors).chartBar}>
                <View
                  style={[
                    styles(colors).bar,
                    {
                      height: Math.max((day.amount / 30000) * 80, 10),
                      backgroundColor: colors.primary,
                    }
                  ]}
                />
                <CustomText style={styles(colors).dayLabel}>{day.day}</CustomText>
                <CustomText style={styles(colors).dayAmount}>
                  ₦{(day.amount / 1000).toFixed(0)}k
                </CustomText>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Deliveries */}
        <View style={styles(colors).recentCard}>
          <View style={styles(colors).sectionHeader}>
            <CustomText style={styles(colors).sectionTitle}>Recent Deliveries</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
              <CustomText style={styles(colors).viewAllText}>View All</CustomText>
            </TouchableOpacity>
          </View>
          
          {earningsData?.recentDeliveries?.map((delivery, index) => (
            <View key={delivery.id} style={styles(colors).deliveryItem}>
              <View style={styles(colors).deliveryIcon}>
                <Ionicons name="car" size={20} color={colors.primary} />
              </View>
              <View style={styles(colors).deliveryInfo}>
                <CustomText style={styles(colors).deliveryCustomer}>
                  {delivery.customer}
                </CustomText>
                <CustomText style={styles(colors).deliveryDate}>
                  {new Date(delivery.date).toLocaleDateString()}
                </CustomText>
              </View>
              <CustomText style={styles(colors).deliveryAmount}>
                {formatCurrency(delivery.amount)}
              </CustomText>
            </View>
          ))}
        </View>

        {/* Payout Information */}
        <View style={styles(colors).payoutCard}>
          <CustomText style={styles(colors).sectionTitle}>💳 Payout Information</CustomText>
          <View style={styles(colors).payoutContent}>
            <View style={styles(colors).payoutRow}>
              <CustomText style={styles(colors).payoutLabel}>Next Payout</CustomText>
              <CustomText style={styles(colors).payoutValue}>Friday, Jan 19</CustomText>
            </View>
            <View style={styles(colors).payoutRow}>
              <CustomText style={styles(colors).payoutLabel}>Pending Amount</CustomText>
              <CustomText style={styles(colors).payoutValue}>
                {formatCurrency(earningsData?.totalEarnings)}
              </CustomText>
            </View>
            <TouchableOpacity style={styles(colors).payoutButton}>
              <Ionicons name="card" size={16} color={colors.primary} />
              <CustomText style={styles(colors).payoutButtonText}>
                Update Bank Details
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    periodContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    periodButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    periodText: {
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    totalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    totalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    totalInfo: {
      marginLeft: 16,
      flex: 1,
    },
    totalLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    totalAmount: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    breakdownCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    viewAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    chartContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 120,
      paddingBottom: 20,
    },
    chartBar: {
      alignItems: 'center',
      flex: 1,
    },
    bar: {
      width: 20,
      borderRadius: 4,
      marginBottom: 8,
    },
    dayLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    dayAmount: {
      fontSize: 10,
      color: colors.text,
      fontWeight: '600',
    },
    recentCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    deliveryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    deliveryInfo: {
      flex: 1,
    },
    deliveryCustomer: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    deliveryDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    deliveryAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    payoutCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    payoutContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    payoutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    payoutLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    payoutValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    payoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    payoutButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
  });

export default EarningsScreen;