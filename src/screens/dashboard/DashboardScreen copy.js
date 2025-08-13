// src/screens/dashboard/DashboardScreen.js - Modern Card-Based Dashboard
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    activeOrders: 2,
    totalSpent: 125650,
    mealsPlanCompleted: 8,
    nextDelivery: 'Tomorrow',
    recentActivity: [
      { id: 1, type: 'order', title: 'Order Delivered', time: '2 hours ago' },
      { id: 2, type: 'plan', title: 'New Meal Plan', time: '1 day ago' }
    ]
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const StatCard = ({ icon, title, value, subtitle, color, onPress }) => (
    <TouchableOpacity 
      style={styles(colors).statCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles(colors).statCardContent}>
        <View style={[styles(colors).statIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles(colors).statTextContainer}>
          <Text style={styles(colors).statValue}>{value}</Text>
          <Text style={styles(colors).statTitle}>{title}</Text>
          {subtitle && <Text style={styles(colors).statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ icon, title, subtitle, color, onPress }) => (
    <TouchableOpacity 
      style={styles(colors).actionCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        style={styles(colors).actionCardGradient}
      >
        <View style={[styles(colors).actionIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color={colors.white} />
        </View>
        <Text style={styles(colors).actionTitle}>{title}</Text>
        <Text style={styles(colors).actionSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const ActivityCard = ({ activity }) => (
    <View style={styles(colors).activityCard}>
      <View style={styles(colors).activityContent}>
        <View style={[
          styles(colors).activityIcon, 
          { backgroundColor: activity.type === 'order' ? `${colors.success}20` : `${colors.primary}20` }
        ]}>
          <Ionicons 
            name={activity.type === 'order' ? 'checkmark-circle' : 'restaurant'} 
            size={16} 
            color={activity.type === 'order' ? colors.success : colors.primary} 
          />
        </View>
        <View style={styles(colors).activityText}>
          <Text style={styles(colors).activityTitle}>{activity.title}</Text>
          <Text style={styles(colors).activityTime}>{activity.time}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <ScrollView 
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {/* Header */}
        <View style={styles(colors).header}>
          <View>
            <Text style={styles(colors).welcomeText}>Welcome back!</Text>
            <Text style={styles(colors).headerTitle}>Your Dashboard</Text>
          </View>
          <TouchableOpacity style={styles(colors).notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles(colors).statsSection}>
          <View style={styles(colors).statsRow}>
            <StatCard 
              icon="bag-check"
              title="Active Orders"
              value={dashboardData.activeOrders.toString()}
              color={colors.primary}
              onPress={() => navigation.navigate('Orders')}
            />
            <StatCard 
              icon="wallet"
              title="Total Spent"
              value={`₦${dashboardData.totalSpent.toLocaleString()}`}
              color={colors.success}
              onPress={() => {}}
            />
          </View>
          <View style={styles(colors).statsRow}>
            <StatCard 
              icon="restaurant"
              title="Meals Completed"
              value={dashboardData.mealsPlanCompleted.toString()}
              subtitle="This month"
              color={colors.warning}
              onPress={() => {}}
            />
            <StatCard 
              icon="time"
              title="Next Delivery"
              value={dashboardData.nextDelivery}
              subtitle="Premium Plan"
              color={colors.error}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
          <View style={styles(colors).actionsGrid}>
            <QuickActionCard 
              icon="add-circle"
              title="New Order"
              subtitle="Browse meal plans"
              color={colors.primary}
              onPress={() => navigation.navigate('Home')}
            />
            <QuickActionCard 
              icon="time"
              title="Track Order"
              subtitle="View delivery status"
              color={colors.success}
              onPress={() => navigation.navigate('Orders')}
            />
            <QuickActionCard 
              icon="settings"
              title="Preferences"
              subtitle="Update dietary info"
              color={colors.warning}
              onPress={() => navigation.navigate('Profile')}
            />
            <QuickActionCard 
              icon="help-circle"
              title="Support"
              subtitle="Get help & support"
              color={colors.error}
              onPress={() => navigation.navigate('HelpCenter')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Recent Activity</Text>
          <View style={styles(colors).activitySection}>
            {dashboardData.recentActivity.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for tab bar
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.text}08`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.text}05`,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  
  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  
  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 52) / 2, // Account for padding and gap
    marginBottom: 16,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Activity Section
  activitySection: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${colors.text}05`,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default DashboardScreen;