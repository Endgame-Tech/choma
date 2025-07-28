// src/screens/dashboard/OrdersScreen.js - Production Ready with Real API
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../styles/theme';
import { COLORS, THEME } from '../../utils/colors';
import apiService from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import NotificationIcon from '../../components/ui/NotificationIcon';
import OrderCardSkeleton from '../../components/dashboard/OrderCardSkeleton';
import { useNotification } from '../../context/NotificationContext';

const { width } = Dimensions.get('window');

const OrdersScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [selectedTab, setSelectedTab] = useState('active');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Dynamic tabs based on actual order counts
  const [tabs, setTabs] = useState([
    { id: 'active', label: 'Active Orders', count: 0 },
    { id: 'completed', label: 'Completed', count: 0 },
    { id: 'cancelled', label: 'Cancelled', count: 0 },
  ]);

  // Load orders on component mount
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getUserOrders();
      
      if (result.success) {
        // Ensure we always have an array, even if the API returns null/undefined
        let ordersData = result.data;
        
        // Handle different possible response structures
        if (!Array.isArray(ordersData)) {
          console.warn('API returned non-array data:', ordersData);
          ordersData = [];
        }
        
        setOrders(ordersData);
        
        // Update tab counts based on real data
        const activeCounts = ordersData.filter(order => 
          order && !['completed', 'cancelled', 'delivered'].includes(order.status)
        ).length;
        const completedCount = ordersData.filter(order => 
          order && ['completed', 'delivered'].includes(order.status)
        ).length;
        const cancelledCount = ordersData.filter(order => 
          order && order.status === 'cancelled'
        ).length;
        
        setTabs([
          { id: 'active', label: 'Active Orders', count: activeCounts },
          { id: 'completed', label: 'Completed', count: completedCount },
          { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
        ]);
        
        console.log(`✅ Loaded ${ordersData.length} orders`);
      } else {
        setError(result.error || 'Failed to load orders');
        console.error('❌ Failed to load orders:', result.error);
        setOrders([]); // Ensure orders is always an array
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('❌ Orders loading error:', err);
      setOrders([]); // Ensure orders is always an array
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Get status styling based on order status
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return { color: colors.success, text: 'Delivered' };
      case 'confirmed':
      case 'preparing':
        return { color: colors.warning, text: 'Preparing' };
      case 'ready':
      case 'out_for_delivery':
        return { color: colors.primary, text: 'Out for Delivery' };
      case 'cancelled':
        return { color: colors.error, text: 'Cancelled' };
      case 'pending':
      default:
        return { color: colors.textSecondary, text: 'Pending' };
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setCancelModalVisible(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      setCancelModalVisible(false);
      
      // Call API to cancel order
      const result = await apiService.cancelOrder(selectedOrder._id || selectedOrder.orderId);
      
      if (result.success) {
        Alert.alert('Order Cancelled', 'Your order has been cancelled successfully');
        // Refresh orders list
        await loadOrders();
      } else {
        Alert.alert('Cancellation Failed', result.error || 'Unable to cancel order at this time');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to cancel order. Please try again.');
      console.error('Cancel order error:', error);
    }
    
    setSelectedOrder(null);
  };

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.id}
      style={styles(colors).orderCard}
      onPress={() => navigation.navigate('OrderDetail', { order })}
      activeOpacity={0.9}
    >
      {/* Order Header */}
      <View style={styles(colors).orderHeader}>
        <Text style={styles(colors).orderTitle}>Your Orders</Text>
        <View style={[styles(colors).statusBadge, { backgroundColor: order.statusColor }]}>
          <Text style={styles(colors).statusText}>{order.statusText}</Text>
        </View>
      </View>

      {/* Order Item */}
      <View style={styles(colors).orderItem}>
        <Image source={order.image} style={styles(colors).orderImage} />
        <View style={styles(colors).orderItemInfo}>
          <Text style={styles(colors).orderItemName}>{order.planName}</Text>
          <View style={styles(colors).orderItemMeta}>
            <Text style={styles(colors).orderItemPrice}>₦{order.price.toLocaleString()}</Text>
            <Text style={styles(colors).orderItemCount}>{order.items} Items</Text>
          </View>
          <View style={styles(colors).ratingContainer}>
            <Ionicons name="star" size={14} color={colors.rating} />
            <Text style={styles(colors).ratingText}>4.8</Text>
          </View>
        </View>
        <TouchableOpacity style={styles(colors).reorderButton}>
          <Ionicons name="repeat" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Order Summary */}
      <View style={styles(colors).orderSummary}>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Order Date</Text>
          <Text style={styles(colors).summaryValue}>{order.orderDate}</Text>
        </View>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Total Amount</Text>
          <Text style={styles(colors).summaryValue}>₦{order.transaction.total.toLocaleString()}</Text>
        </View>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Order ID</Text>
          <Text style={styles(colors).summaryValue}>#{order.id}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles(colors).actionButtons}>
        {order.status === 'paid' && (
          <TouchableOpacity 
            style={styles(colors).primaryButton}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Text style={styles(colors).primaryButtonText}>Rate & Review</Text>
          </TouchableOpacity>
        )}
        
        {(order.status === 'wait' || order.status === 'processing') && (
          <>
            <TouchableOpacity 
              style={styles(colors).secondaryButton}
              onPress={() => handleCancelOrder(order)}
            >
              <Text style={styles(colors).secondaryButtonText}>Cancel Order</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles(colors).primaryButton}>
              <Text style={styles(colors).primaryButtonText}>Track Order</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTabButton = (tab) => (
    <TouchableOpacity
      key={tab.id}
      style={[
        styles(colors).tabButton,
        selectedTab === tab.id && styles(colors).tabButtonActive
      ]}
      onPress={() => setSelectedTab(tab.id)}
    >
      <Text style={[
        styles(colors).tabText,
        selectedTab === tab.id && styles(colors).tabTextActive
      ]}>
        {tab.label}
      </Text>
      {tab.count > 0 && (
        <View style={[
          styles(colors).tabBadge,
          selectedTab === tab.id && styles(colors).tabBadgeActive
        ]}>
          <Text style={[
            styles(colors).tabBadgeText,
            selectedTab === tab.id && styles(colors).tabBadgeTextActive
          ]}>
            {tab.count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    if (!order) return false; // Skip null/undefined orders
    if (selectedTab === 'active') return order.status !== 'cancelled' && order.status !== 'completed';
    if (selectedTab === 'completed') return order.status === 'completed';
    if (selectedTab === 'cancelled') return order.status === 'cancelled';
    return true;
  }) : [];

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle={isDark === true ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity 
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>My Orders</Text>
          <Text style={styles(colors).headerSubtitle}>You deserve better meal</Text>
        </View>
        
        {/* <TouchableOpacity style={styles(colors).notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles(colors).notificationBadge}>
            <Text style={styles(colors).notificationBadgeText}>2</Text>
          </View>
        </TouchableOpacity> */}
        <View style={styles(colors).notificationContainer}>
          <NotificationIcon navigation={navigation} />
        </View>

      </View>

      {/* Tabs */}
      <View style={styles(colors).tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles(colors).tabsContent}
        >
          {tabs.map(renderTabButton)}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView 
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {loading ? (
          <View style={styles(colors).ordersContainer}>
            {[...Array(3)].map((_, index) => <OrderCardSkeleton key={index} />)}
          </View>
        ) : filteredOrders.length > 0 ? (
          <View style={styles(colors).ordersContainer}>
            {filteredOrders.map(renderOrderCard)}
          </View>
        ) : (
          <View style={styles(colors).emptyState}>
            <Ionicons name="receipt-outline" size={80} color={colors.textMuted} />
            <Text style={styles(colors).emptyStateTitle}>No orders found</Text>
            <Text style={styles(colors).emptyStateText}>
              {selectedTab === 'active' && "You don't have any active orders right now."}
              {selectedTab === 'completed' && "You haven't completed any orders yet."}
              {selectedTab === 'cancelled' && "You don't have any cancelled orders."}
            </Text>
            <TouchableOpacity 
              style={styles(colors).emptyStateButton}
              onPress={() => navigation.navigate('MealPlans')}
            >
              <Text style={styles(colors).emptyStateButtonText}>Browse Meal Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Cancel Order Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalIcon}>
              <Ionicons name="warning" size={40} color={colors.warning} />
            </View>
            
            <Text style={styles(colors).modalTitle}>Cancel Order</Text>
            <Text style={styles(colors).modalMessage}>
              Oh no! Are you sure you want to cancel this order?
            </Text>
            
            <View style={styles(colors).modalButtons}>
              <TouchableOpacity 
                style={styles(colors).modalCancelButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles(colors).modalCancelText}>No!</Text>
                <Text style={styles(colors).modalCancelSubtext}>I change my mind</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles(colors).modalConfirmButton}
                onPress={confirmCancelOrder}
              >
                <Text style={styles(colors).modalConfirmText}>Yes!</Text>
                <Text style={styles(colors).modalConfirmSubtext}>Please cancel my order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    padding: 5,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },
  tabsContainer: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.large,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.black,
  },
  tabBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.background,
  },
  tabBadgeTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for floating tab bar
  },
  ordersContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...THEME.shadows.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.medium,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderImage: {
    width: 70,
    height: 70,
    borderRadius: THEME.borderRadius.medium,
    marginRight: 15,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  orderItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  orderItemCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  reorderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderSummary: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  secondaryButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.large,
  },
  emptyStateButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 25,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.warning}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  modalCancelSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.medium,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  modalConfirmSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});

export default OrdersScreen;