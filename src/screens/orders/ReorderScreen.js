// src/screens/orders/ReorderScreen.js - Reorder Previous Orders
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import apiService from '../../services/api';
import StandardHeader from '../../components/layout/Header';

const ReorderScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(null);

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    try {
      setLoading(true);
      const result = await apiService.getUserOrders();
      
      if (result.success) {
        // Get completed orders from last 30 days for reordering
        const completedOrders = (result.data || [])
          .filter(order => order && ['completed', 'delivered'].includes(order.status))
          .sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate))
          .slice(0, 10); // Show last 10 completed orders
        
        setRecentOrders(completedOrders);
      } else {
        console.error('Failed to load recent orders:', result.error);
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (order) => {
    try {
      setReordering(order._id || order.id);
      
      // Create reorder data
      const reorderData = {
        originalOrderId: order._id || order.id,
        mealPlanId: order.mealPlan?._id || order.mealPlanId,
        quantity: order.quantity || 1,
        customizations: order.customizations || [],
        deliveryAddress: order.deliveryAddress,
        notes: `Reorder from ${new Date(order.createdAt || order.orderDate).toLocaleDateString()}`
      };

      const result = await apiService.createOrder(reorderData);
      
      if (result.success) {
        // Log activity
        await logActivity('reorder', `Reordered "${order.planName || order.mealPlan?.planName}"`);
        
        Alert.alert(
          'Order Placed!',
          'Your reorder has been placed successfully. You can track it in your orders.',
          [
            { text: 'View Orders', onPress: () => navigation.navigate('Orders') },
            { text: 'Continue Shopping', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert('Reorder Failed', result.error || 'Unable to place reorder. Please try again.');
      }
    } catch (error) {
      console.error('Reorder error:', error);
      Alert.alert('Error', 'Unable to place reorder. Please try again.');
    } finally {
      setReordering(null);
    }
  };

  const logActivity = async (action, description) => {
    try {
      await apiService.logUserActivity?.({
        action,
        description,
        timestamp: new Date().toISOString(),
        metadata: { screen: 'ReorderScreen' }
      });
    } catch (error) {
      console.log('Activity logging failed:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderOrderCard = (order) => (
    <View key={order._id || order.id} style={styles(colors).orderCard}>
      <View style={styles(colors).orderHeader}>
        <Image 
          source={order.image || order.mealPlan?.image ? 
            { uri: order.image || order.mealPlan?.image } : 
            require('../../assets/images/meal-plans/fitfuel.jpg')
          }
          style={styles(colors).orderImage}
        />
        
        <View style={styles(colors).orderInfo}>
          <Text style={styles(colors).orderTitle}>
            {order.planName || order.mealPlan?.planName || 'Meal Plan'}
          </Text>
          <Text style={styles(colors).orderDate}>
            Ordered on {formatDate(order.createdAt || order.orderDate)}
          </Text>
          <Text style={styles(colors).orderPrice}>
            ₦{((order.totalAmount || order.price || 0)).toLocaleString()}
          </Text>
          {order.quantity && order.quantity > 1 && (
            <Text style={styles(colors).orderQuantity}>
              Quantity: {order.quantity}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles(colors).reorderButton, reordering === (order._id || order.id) && styles(colors).reorderButtonDisabled]}
        onPress={() => handleReorder(order)}
        disabled={reordering === (order._id || order.id)}
      >
        <LinearGradient
          colors={reordering === (order._id || order.id) ? 
            [colors.textMuted, colors.textMuted] : 
            [colors.primary, colors.primaryDark]
          }
          style={styles(colors).reorderButtonGradient}
        >
          {reordering === (order._id || order.id) ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="repeat" size={20} color={colors.white} />
              <Text style={styles(colors).reorderButtonText}>Reorder</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <StandardHeader 
        title="Reorder"
        subtitle="Order your favorites again"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView style={styles(colors).scrollView} contentContainerStyle={styles(colors).scrollContent}>
        {loading ? (
          <View style={styles(colors).loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading your recent orders...</Text>
          </View>
        ) : recentOrders.length > 0 ? (
          <View style={styles(colors).ordersContainer}>
            <Text style={styles(colors).sectionTitle}>Recent Orders</Text>
            <Text style={styles(colors).sectionSubtitle}>
              Tap "Reorder" to place the same order again
            </Text>
            {recentOrders.map(renderOrderCard)}
          </View>
        ) : (
          <View style={styles(colors).emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={colors.textMuted} />
            <Text style={styles(colors).emptyTitle}>No Recent Orders</Text>
            <Text style={styles(colors).emptyText}>
              You don't have any completed orders to reorder yet.
            </Text>
            <TouchableOpacity 
              style={styles(colors).browseMealsButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles(colors).browseMealsButtonText}>Browse Meal Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textSecondary,
  },
  ordersContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 25,
  },
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...THEME.shadows.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.medium,
    marginRight: 15,
  },
  orderInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  orderQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reorderButton: {
    borderRadius: THEME.borderRadius.medium,
    overflow: 'hidden',
  },
  reorderButtonDisabled: {
    opacity: 0.6,
  },
  reorderButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  reorderButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  browseMealsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.large,
  },
  browseMealsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});