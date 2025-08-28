import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import StandardHeader from '../../components/layout/Header';
import OrderTrackingCard from '../../components/orders/OrderTrackingCard';
import apiService from '../../services/api';

const OrderTrackingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Try to get regular orders, assigned orders, and subscription-based orders
      const [ordersResult, assignedOrdersResult, subscriptionsResult] = await Promise.all([
        apiService.getUserOrders().catch(err => ({ success: false, error: err })),
        apiService.get('/orders/assigned').catch(err => ({ success: false, error: err })),
        apiService.getUserSubscriptions().catch(err => ({ success: false, error: err }))
      ]);

      let allActiveOrders = [];

      // Process regular orders
      if (ordersResult.success) {
        const orders = ordersResult.data?.data || ordersResult.data || ordersResult.orders || [];
        const regularActiveOrders = Array.isArray(orders) ? orders.filter(order => {
          // Check both 'status' and 'orderStatus' fields
          const status = (order.status || order.orderStatus || '').toLowerCase();
          return status && !['delivered', 'cancelled', 'completed'].includes(status);
        }) : [];
        
        allActiveOrders = [...regularActiveOrders];
      }

      // Process assigned orders (orders with chefs that are in progress)
      if (assignedOrdersResult.success) {
        const assignedOrders = assignedOrdersResult.data?.data || assignedOrdersResult.data || assignedOrdersResult.orders || [];
        const activeAssignedOrders = Array.isArray(assignedOrders) ? assignedOrders.filter(order => {
          // Check both 'status' and 'orderStatus' fields
          const status = (order.status || order.orderStatus || '').toLowerCase();
          return status && !['delivered', 'cancelled', 'completed'].includes(status);
        }) : [];
        
        allActiveOrders = [...allActiveOrders, ...activeAssignedOrders];
      }

      // Process subscription-based orders (create virtual order from subscription)
      if (subscriptionsResult.success && !allActiveOrders.length) {
        const subscriptions = subscriptionsResult.data?.data || subscriptionsResult.data || subscriptionsResult.subscriptions || [];
        const activeSubscriptions = Array.isArray(subscriptions) ? subscriptions.filter((sub) => {
          const status = sub.status?.toLowerCase();
          return status === "active" || status === "paid" || sub.paymentStatus === "Paid";
        }) : [];

        // Convert active subscriptions to virtual orders for tracking
        const subscriptionOrders = activeSubscriptions.map(subscription => ({
          _id: `sub_${subscription._id}`,
          orderNumber: subscription.subscriptionId || `SUB${subscription._id?.slice(-8)}`,
          status: 'preparing', // Default status for active subscriptions
          orderStatus: 'Preparing', // For display
          mealPlan: subscription.mealPlanId || { name: 'Subscription Meal Plan' },
          orderItems: { planName: subscription.mealPlanId?.planName || 'Subscription Meal Plan' },
          totalAmount: subscription.totalPrice || subscription.price,
          createdAt: subscription.startDate || subscription.createdAt,
          estimatedDelivery: subscription.nextDelivery,
          deliveryAddress: subscription.deliveryAddress || 'Your delivery address',
          paymentMethod: subscription.paymentMethod || 'Subscription payment',
          paymentStatus: subscription.paymentStatus || 'Paid',
          instructions: 'Subscription delivery',
          quantity: 1,
          isSubscriptionOrder: true
        }));

        allActiveOrders = [...allActiveOrders, ...subscriptionOrders];
      }
      
      setActiveOrders(allActiveOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setActiveOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefresh = () => {
    loadOrders(true);
  };

  const handleContactSupport = () => {
    navigation.navigate('Support');
  };

  const handleReorder = (order) => {
    // Navigate to meal plan detail for reordering
    if (order.mealPlan || order.orderItems?.mealPlan) {
      navigation.navigate('MealPlanDetail', { 
        bundle: order.mealPlan || { _id: order.orderItems?.mealPlan } 
      });
    }
  };

  const handleCancelOrder = (orderId) => {
    // Handle order cancellation
    console.log('Cancel order:', orderId);
    // You can implement the cancellation logic here
  };

  const handleRateOrder = (order) => {
    // Navigate to rating screen or show rating modal
    console.log('Rate order:', order._id);
  };

  const handleTrackDriver = (driver) => {
    // Handle driver tracking
    console.log('Track driver:', driver);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StandardHeader
          title="Order Tracking"
          onBackPress={() => navigation.goBack()}
          showRightIcon={false}
        />
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StandardHeader
        title="Order Tracking"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />
      
      <ScrollView 
        style={styles(colors).scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {activeOrders.length > 0 ? (
          <View style={styles(colors).ordersContainer}>
            <Text style={styles(colors).sectionTitle}>
              Active Orders ({activeOrders.length})
            </Text>
            
            {activeOrders.map((order) => (
              <OrderTrackingCard
                key={order._id || order.id}
                order={order}
                onContactSupport={handleContactSupport}
                onReorder={handleReorder}
                onCancelOrder={handleCancelOrder}
                onRateOrder={handleRateOrder}
                onTrackDriver={handleTrackDriver}
              />
            ))}
          </View>
        ) : (
          <View style={styles(colors).emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={colors.textMuted} />
            <Text style={styles(colors).emptyTitle}>No Active Orders</Text>
            <Text style={styles(colors).emptyText}>
              You don't have any active orders at the moment. 
              Browse our meal plans to place a new order!
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  ordersContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OrderTrackingScreen;