// src/screens/deliveries/DeliveryHistoryScreen.js - Driver delivery history
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Services
import driverApiService from "../../services/driverApi";

const DeliveryHistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError } = useAlert();
  
  // State
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all'); // all, delivered, cancelled

  useEffect(() => {
    loadDeliveryHistory();
  }, [filter]);

  const loadDeliveryHistory = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setDeliveries([]);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const response = await driverApiService.getDeliveryHistory(pageNum, 20, filter);
      
      if (response.success) {
        const newDeliveries = response.data.deliveries || [];

        if (isRefresh || pageNum === 1) {
          setDeliveries(newDeliveries);
        } else {
          setDeliveries(prev => [...prev, ...newDeliveries]);
        }

        setHasMore(response.data.pagination?.hasNext || false);
        setPage(pageNum);
      } else {
        showError('Failed to load delivery history');
      }
    } catch (error) {
      console.error('Delivery history error:', error);
      showError('Failed to load delivery history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDeliveryHistory(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadDeliveryHistory(page + 1);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setDeliveries([]);
    setPage(1);
    setHasMore(true);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      delivered: colors.success,
      cancelled: colors.error,
      assigned: colors.warning,
      picked_up: colors.primary,
      en_route: colors.info,
    };
    return statusColors[status] || colors.textMuted;
  };

  const getStatusDisplayName = (status) => {
    const statusNames = {
      delivered: 'Delivered',
      cancelled: 'Cancelled', 
      assigned: 'Assigned',
      picked_up: 'Picked Up',
      en_route: 'En Route',
    };
    return statusNames[status] || status;
  };

  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDeliveryItem = ({ item }) => (
    <TouchableOpacity
      style={styles(colors).deliveryItem}
      onPress={() => navigation.navigate('DeliveryDetail', { delivery: item })}
    >
      <View style={styles(colors).deliveryHeader}>
        <View style={styles(colors).deliveryInfo}>
          <Text style={styles(colors).deliveryAmount}>
            {formatCurrency(item.totalEarnings)}
          </Text>
          <Text style={styles(colors).deliveryDate}>
            {formatDate(item.completedAt || item.createdAt)}
          </Text>
        </View>
        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}
        >
          <Text
            style={[
              styles(colors).statusText,
              { color: getStatusColor(item.status) }
            ]}
          >
            {getStatusDisplayName(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles(colors).deliveryDetails}>
        <Text style={styles(colors).orderDetails}>
          Order #{item.orderNumber || item._id?.slice(-6) || 'N/A'}
        </Text>
        <Text style={styles(colors).mealPlanName}>
          {item.mealPlan?.name || item.orderItems?.planName || 'Meal Delivery'}
        </Text>
        <View style={styles(colors).locationInfo}>
          <View style={styles(colors).locationItem}>
            <Ionicons name="restaurant" size={12} color={colors.warning} />
            <Text style={styles(colors).locationText} numberOfLines={1}>
              From: {item.pickupLocation?.address || item.chef?.kitchenAddress || 'Kitchen'}
            </Text>
          </View>
          <View style={styles(colors).locationItem}>
            <Ionicons name="location" size={12} color={colors.success} />
            <Text style={styles(colors).locationText} numberOfLines={1}>
              To: {item.deliveryLocation?.address || item.customer?.address || 'Customer'}
            </Text>
          </View>
        </View>
        <View style={styles(colors).timeDistance}>
          <Text style={styles(colors).timeText}>
            {formatTime(item.completedAt || item.createdAt)} • {item.estimatedDistance || '5.2'} km
          </Text>
        </View>
      </View>

      <View style={styles(colors).deliveryActions}>
        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={() => navigation.navigate('DeliveryDetail', { delivery: item })}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.status === 'delivered' && (
          <TouchableOpacity
            style={styles(colors).actionButton}
            onPress={() => Alert.alert(
              'Rate Customer',
              'Would you like to rate this customer experience?',
              [
                { text: 'Later', style: 'cancel' },
                { text: 'Rate Now', onPress: () => {/* Navigate to rating */} }
              ]
            )}
          >
            <Ionicons name="star-outline" size={16} color={colors.warning} />
            <Text style={styles(colors).actionButtonText}>Rate</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles(colors).emptyState}>
      <Ionicons name="car-outline" size={80} color={colors.textMuted} />
      <Text style={styles(colors).emptyTitle}>No Delivery History</Text>
      <Text style={styles(colors).emptyText}>
        Your completed deliveries will appear here. Start accepting deliveries to build your history!
      </Text>
      <TouchableOpacity
        style={styles(colors).exploreButton}
        onPress={() => navigation.navigate('AvailableDeliveries')}
      >
        <Text style={styles(colors).exploreButtonText}>Find Deliveries</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles(colors).loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles(colors).filterContainer}>
      {[
        { key: 'all', label: 'All', count: deliveries.length },
        { key: 'delivered', label: 'Delivered', count: deliveries.filter(d => d.status === 'delivered').length },
        { key: 'cancelled', label: 'Cancelled', count: deliveries.filter(d => d.status === 'cancelled').length },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles(colors).filterTab,
            filter === tab.key && styles(colors).activeFilterTab
          ]}
          onPress={() => handleFilterChange(tab.key)}
        >
          <Text
            style={[
              styles(colors).filterTabText,
              filter === tab.key && styles(colors).activeFilterTabText
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading && deliveries.length === 0) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).header}>
          <TouchableOpacity
            style={styles(colors).backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles(colors).headerTitle}>Delivery History</Text>
        </View>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading delivery history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).headerTitle}>Delivery History</Text>
      </View>

      {renderFilterTabs()}

      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles(colors).listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginHorizontal: 4,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    activeFilterTab: {
      backgroundColor: colors.primary,
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    activeFilterTabText: {
      color: colors.white,
    },
    listContainer: {
      padding: 16,
      flexGrow: 1,
    },
    deliveryItem: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    deliveryInfo: {
      flex: 1,
    },
    deliveryAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    deliveryDate: {
      fontSize: 14,
      color: colors.textMuted,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    deliveryDetails: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginBottom: 12,
    },
    orderDetails: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    mealPlanName: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 8,
    },
    locationInfo: {
      marginBottom: 8,
    },
    locationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    locationText: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 6,
      flex: 1,
    },
    timeDistance: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timeText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    deliveryActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.background,
      flex: 1,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginLeft: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 12,
    },
    loadingFooter: {
      padding: 20,
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    exploreButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
    },
    exploreButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
  });

export default DeliveryHistoryScreen;