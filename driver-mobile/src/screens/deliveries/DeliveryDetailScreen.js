// src/screens/deliveries/DeliveryDetailScreen.js - Individual delivery details
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Services
import driverApiService from "../../services/driverApi";

const DeliveryDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { delivery, deliveryId } = route.params || {};
  
  // State
  const [deliveryDetails, setDeliveryDetails] = useState(delivery || null);
  const [loading, setLoading] = useState(!delivery);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!deliveryDetails && deliveryId) {
      loadDeliveryDetails();
    }
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      const response = await driverApiService.getDeliveryDetails(
        deliveryId || deliveryDetails?._id
      );
      
      if (response.success) {
        setDeliveryDetails(response.data);
      } else {
        showError('Failed to load delivery details');
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
      showError('Failed to load delivery details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveryDetails();
  };

  const openMapsNavigation = (destination) => {
    if (!destination) {
      showError('Address not available');
      return;
    }

    const encodedAddress = encodeURIComponent(destination);
    const mapsUrl = `https://maps.google.com/?daddr=${encodedAddress}`;
    
    Alert.alert(
      'Open Navigation',
      'This will open Google Maps for directions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Maps', 
          onPress: () => Linking.openURL(mapsUrl) 
        }
      ]
    );
  };

  const callContact = (phone, name) => {
    if (phone) {
      Alert.alert(
        `Call ${name}`,
        `Do you want to call ${name} at ${phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => Linking.openURL(`tel:${phone}`) 
          }
        ]
      );
    } else {
      showError(`${name} contact not available`);
    }
  };

  const getMealPlanImage = () => {
    if (deliveryDetails?.image) return { uri: deliveryDetails.image };
    if (deliveryDetails?.mealPlan?.image) return { uri: deliveryDetails.mealPlan.image };
    if (deliveryDetails?.orderItems?.image) return { uri: deliveryDetails.orderItems.image };

    const planName = (
      deliveryDetails?.orderItems?.planName ||
      deliveryDetails?.mealPlan?.name ||
      ""
    ).toLowerCase();

    if (planName.includes("fitfuel") || planName.includes("fit fuel")) {
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    } else if (planName.includes("wellness") || planName.includes("healthy")) {
      return require("../../assets/images/meal-plans/wellness-hub.jpg");
    } else if (planName.includes("recharge") || planName.includes("energy")) {
      return require("../../assets/images/meal-plans/recharge.jpg");
    } else if (planName.includes("family") || planName.includes("healthyfam")) {
      return require("../../assets/images/meal-plans/healthyfam.jpg");
    }

    return require("../../assets/images/meal-plans/fitfuel.jpg");
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

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading delivery details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deliveryDetails) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Delivery Not Found</Text>
          <Text style={styles(colors).errorSubtitle}>
            The delivery details could not be loaded
          </Text>
          <TouchableOpacity
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completedDateTime = formatDateTime(deliveryDetails.completedAt || deliveryDetails.updatedAt);
  
  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles(colors).header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles(colors).backButton}
        >
          <Ionicons name="chevron-back" size={20} color="white" />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Delivery Details</Text>
          <Text style={styles(colors).deliveryId}>
            #{deliveryDetails.orderNumber || deliveryDetails._id?.slice(-6)}
          </Text>
        </View>

        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: getStatusColor(deliveryDetails.status) }
          ]}
        >
          <Text style={styles(colors).statusBadgeText}>
            {getStatusDisplayName(deliveryDetails.status)}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles(colors).content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Meal Plan Card */}
        <View style={styles(colors).mealPlanCard}>
          <Image
            source={getMealPlanImage()}
            style={styles(colors).mealImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />
          <View style={styles(colors).mealInfo}>
            <Text style={styles(colors).mealTitle}>
              {deliveryDetails.mealPlan?.name || 
               deliveryDetails.orderItems?.planName || 
               'Delicious Meal'}
            </Text>
            <Text style={styles(colors).mealSubtitle}>
              Order Value: {formatCurrency(deliveryDetails.totalAmount || 25000)}
            </Text>
            <Text style={styles(colors).completedTime}>
              Completed: {completedDateTime.date} at {completedDateTime.time}
            </Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles(colors).earningsCard}>
          <Text style={styles(colors).sectionTitle}>💰 Your Earnings</Text>
          <View style={styles(colors).earningsContent}>
            <View style={styles(colors).earningsGrid}>
              <View style={styles(colors).earningsItem}>
                <Text style={styles(colors).earningsLabel}>Base Rate</Text>
                <Text style={styles(colors).earningsValue}>
                  {formatCurrency(deliveryDetails.baseRate || 2000)}
                </Text>
              </View>
              <View style={styles(colors).earningsItem}>
                <Text style={styles(colors).earningsLabel}>Distance Bonus</Text>
                <Text style={styles(colors).earningsValue}>
                  {formatCurrency(deliveryDetails.distanceBonus || 500)}
                </Text>
              </View>
              <View style={styles(colors).earningsItem}>
                <Text style={styles(colors).earningsLabel}>Time Bonus</Text>
                <Text style={styles(colors).earningsValue}>
                  {formatCurrency(deliveryDetails.timeBonus || 0)}
                </Text>
              </View>
              <View style={styles(colors).earningsItem}>
                <Text style={styles(colors).earningsLabel}>Tips</Text>
                <Text style={styles(colors).earningsValue}>
                  {formatCurrency(deliveryDetails.tip || 0)}
                </Text>
              </View>
            </View>
            <View style={styles(colors).totalEarnings}>
              <Text style={styles(colors).totalLabel}>Total Earned</Text>
              <Text style={styles(colors).totalValue}>
                {formatCurrency(deliveryDetails.totalEarnings || 2500)}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles(colors).routeCard}>
          <Text style={styles(colors).sectionTitle}>🗺️ Route Details</Text>
          
          {/* Pickup Location */}
          <View style={styles(colors).locationSection}>
            <View style={styles(colors).locationHeader}>
              <View style={[styles(colors).locationIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="restaurant" size={20} color={colors.warning} />
              </View>
              <Text style={styles(colors).locationTitle}>Pickup Location</Text>
            </View>
            <View style={styles(colors).locationDetails}>
              <Text style={styles(colors).locationAddress}>
                {deliveryDetails.pickupLocation?.address || 
                 deliveryDetails.chef?.kitchenAddress || 
                 'Kitchen Address'}
              </Text>
              <Text style={styles(colors).contactInfo}>
                Chef: {deliveryDetails.chef?.name || 'Kitchen Staff'}
              </Text>
              {deliveryDetails.chef?.phone && (
                <TouchableOpacity
                  style={styles(colors).contactButton}
                  onPress={() => callContact(deliveryDetails.chef.phone, 'Chef')}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text style={styles(colors).contactButtonText}>
                    {deliveryDetails.chef.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles(colors).directionButton}
              onPress={() => openMapsNavigation(
                deliveryDetails.pickupLocation?.address || deliveryDetails.chef?.kitchenAddress
              )}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={styles(colors).directionButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles(colors).routeConnector} />

          {/* Delivery Location */}
          <View style={styles(colors).locationSection}>
            <View style={styles(colors).locationHeader}>
              <View style={[styles(colors).locationIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="location" size={20} color={colors.success} />
              </View>
              <Text style={styles(colors).locationTitle}>Delivery Location</Text>
            </View>
            <View style={styles(colors).locationDetails}>
              <Text style={styles(colors).locationAddress}>
                {deliveryDetails.deliveryLocation?.address || 
                 deliveryDetails.deliveryAddress ||
                 deliveryDetails.customer?.address ||
                 'Customer Address'}
              </Text>
              <Text style={styles(colors).contactInfo}>
                Customer: {deliveryDetails.customer?.name || 'Customer'}
              </Text>
              {deliveryDetails.customer?.phone && (
                <TouchableOpacity
                  style={styles(colors).contactButton}
                  onPress={() => callContact(deliveryDetails.customer.phone, 'Customer')}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text style={styles(colors).contactButtonText}>
                    {deliveryDetails.customer.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles(colors).directionButton}
              onPress={() => openMapsNavigation(
                deliveryDetails.deliveryLocation?.address || 
                deliveryDetails.deliveryAddress ||
                deliveryDetails.customer?.address
              )}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={styles(colors).directionButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Stats */}
        <View style={styles(colors).statsCard}>
          <Text style={styles(colors).sectionTitle}>📊 Delivery Stats</Text>
          <View style={styles(colors).statsGrid}>
            <View style={styles(colors).statItem}>
              <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
              <Text style={styles(colors).statValue}>
                {deliveryDetails.estimatedDistance || '5.2'} km
              </Text>
              <Text style={styles(colors).statLabel}>Distance</Text>
            </View>
            <View style={styles(colors).statItem}>
              <Ionicons name="time-outline" size={24} color={colors.info} />
              <Text style={styles(colors).statValue}>
                {deliveryDetails.actualDuration || '25'} min
              </Text>
              <Text style={styles(colors).statLabel}>Duration</Text>
            </View>
            <View style={styles(colors).statItem}>
              <Ionicons name="car-outline" size={24} color={colors.success} />
              <Text style={styles(colors).statValue}>
                {deliveryDetails.vehicleType || 'Bike'}
              </Text>
              <Text style={styles(colors).statLabel}>Vehicle</Text>
            </View>
          </View>
        </View>

        {/* Special Instructions */}
        {deliveryDetails.instructions && (
          <View style={styles(colors).instructionsCard}>
            <Text style={styles(colors).sectionTitle}>📝 Special Instructions</Text>
            <View style={styles(colors).instructionsContent}>
              <Text style={styles(colors).instructionsText}>
                {deliveryDetails.instructions}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Notes */}
        {deliveryDetails.deliveryNotes && (
          <View style={styles(colors).notesCard}>
            <Text style={styles(colors).sectionTitle}>📋 Delivery Notes</Text>
            <View style={styles(colors).notesContent}>
              <Text style={styles(colors).notesText}>
                {deliveryDetails.deliveryNotes}
              </Text>
            </View>
          </View>
        )}
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
      color: colors.textMuted,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      color: colors.text,
    },
    errorSubtitle: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: 'white',
    },
    deliveryId: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    mealPlanCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    mealImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      marginRight: 16,
      backgroundColor: colors.background,
    },
    mealInfo: {
      flex: 1,
    },
    mealTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    mealSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 4,
    },
    completedTime: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    earningsCard: {
      backgroundColor: colors.cardBackground,
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
    earningsContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    earningsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    earningsItem: {
      width: '48%',
      alignItems: 'center',
      marginBottom: 12,
    },
    earningsLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    earningsValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    totalEarnings: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    totalValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.success,
    },
    routeCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    locationSection: {
      marginBottom: 16,
    },
    locationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    locationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    locationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    locationDetails: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    locationAddress: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    contactInfo: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contactButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
      marginLeft: 4,
    },
    directionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    directionButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    routeConnector: {
      width: 2,
      height: 20,
      backgroundColor: colors.border,
      marginLeft: 20,
      marginVertical: 8,
    },
    statsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    instructionsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    notesCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
    },
    notesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default DeliveryDetailScreen;