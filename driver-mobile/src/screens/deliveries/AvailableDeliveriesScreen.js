// src/screens/deliveries/AvailableDeliveriesScreen.js - Available deliveries for drivers
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAlert } from "../../contexts/AlertContext";

// Components
import AvailableDeliveryCard from "../../components/delivery/AvailableDeliveryCard";
import StatusMessage from "../../components/ui/StatusMessage";

// Services
import driverApiService from "../../services/driverApi";

const AvailableDeliveriesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();

  // State
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [acceptingDeliveryId, setAcceptingDeliveryId] = useState(null);

  // Load available deliveries
  const loadDeliveries = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      
      const response = await driverApiService.getAvailableDeliveries();
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      showError('Failed to load available deliveries');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  // Accept delivery
  const handleAcceptDelivery = async (deliveryId) => {
    try {
      setAcceptingDeliveryId(deliveryId);
      
      const response = await driverApiService.acceptDelivery(deliveryId);
      
      // Remove accepted delivery from list
      setDeliveries(prev => prev.filter(d => d._id !== deliveryId && d.id !== deliveryId));
      
      showSuccess('Delivery accepted! Check Active Deliveries.');
      
      // Navigate to active delivery screen
      navigation.navigate('ActiveDelivery', { delivery: response.data.delivery });
    } catch (error) {
      console.error('Failed to accept delivery:', error);
      showError(error.message || 'Failed to accept delivery');
    } finally {
      setAcceptingDeliveryId(null);
    }
  };

  // Toggle online/offline status
  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      await driverApiService.updateStatus(newStatus ? 'online' : 'offline');
      setIsOnline(newStatus);
      
      if (newStatus) {
        showSuccess('You are now online and will receive delivery requests');
        loadDeliveries(true);
      } else {
        showSuccess('You are now offline and will not receive new requests');
        setDeliveries([]);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showError('Failed to update status');
    }
  };

  // Refresh deliveries
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDeliveries(false);
  };

  // Load deliveries on mount and when online
  useEffect(() => {
    if (isOnline) {
      loadDeliveries(true);
    }
  }, [isOnline, loadDeliveries]);

  // Auto-refresh every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      loadDeliveries(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, loadDeliveries]);

  // Render delivery item
  const renderDeliveryItem = ({ item }) => (
    <AvailableDeliveryCard
      delivery={item}
      onAcceptDelivery={handleAcceptDelivery}
      style={{ marginHorizontal: 16 }}
    />
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles(colors).emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).emptyText}>Loading deliveries...</Text>
        </View>
      );
    }

    if (!isOnline) {
      return (
        <StatusMessage
          type="info"
          message="You are offline"
          description="Go online to start receiving delivery requests"
          actionText="Go Online"
          onAction={toggleOnlineStatus}
        />
      );
    }

    return (
      <StatusMessage
        type="info"
        message="No deliveries available"
        description="New delivery requests will appear here automatically"
        actionText="Refresh"
        onAction={() => loadDeliveries(true)}
      />
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles(colors).header}>
      <View style={styles(colors).statusSection}>
        <View style={styles(colors).statusIndicator}>
          <View
            style={[
              styles(colors).statusDot,
              { backgroundColor: isOnline ? colors.success : colors.textMuted }
            ]}
          />
          <Text style={styles(colors).statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles(colors).toggleButton,
            { backgroundColor: isOnline ? colors.error : colors.success }
          ]}
          onPress={toggleOnlineStatus}
        >
          <Ionicons 
            name={isOnline ? "power" : "power"} 
            size={16} 
            color={colors.white} 
          />
          <Text style={styles(colors).toggleButtonText}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOnline && deliveries.length > 0 && (
        <View style={styles(colors).statsSection}>
          <View style={styles(colors).statItem}>
            <Text style={styles(colors).statValue}>{deliveries.length}</Text>
            <Text style={styles(colors).statLabel}>Available</Text>
          </View>
          <View style={styles(colors).statItem}>
            <Text style={styles(colors).statValue}>
              ₦{deliveries.reduce((sum, d) => sum + (d.estimatedEarnings || 2500), 0).toLocaleString()}
            </Text>
            <Text style={styles(colors).statLabel}>Potential Earnings</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).topHeader}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles(colors).title}>Available Deliveries</Text>
        <TouchableOpacity
          style={styles(colors).refreshButton}
          onPress={() => loadDeliveries(true)}
        >
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Delivery List */}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderDeliveryItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={deliveries.length === 0 && styles(colors).emptyList}
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
    
    // Top Header
    topHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
      textAlign: "center",
      marginHorizontal: 16,
    },
    refreshButton: {
      padding: 8,
    },

    // Header Content
    header: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 8,
    },
    
    // Status Section
    statusSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    statusIndicator: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    statusText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    toggleButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    toggleButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },

    // Stats Section
    statsSection: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
    },

    // Empty States
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 16,
      textAlign: "center",
    },
  });

export default AvailableDeliveriesScreen;