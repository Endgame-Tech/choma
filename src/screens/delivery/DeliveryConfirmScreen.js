// src/screens/delivery/DeliveryConfirmScreen.js - Enhanced Delivery Confirmation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { useTheme } from '../../styles/theme';

export const DeliveryConfirmScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { orderId, trackingId } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  const loadOrderData = async () => {
    setLoading(true);
    try {
      const result = await ApiService.getOrderById(orderId);
      if (result.success) {
        setOrderData(result.data);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackDelivery = () => {
    if (trackingId) {
      navigation.navigate('EnhancedTracking', { 
        trackingId, 
        orderId,
        order: route.params?.order 
      });
    } else {
      Alert.alert('Info', 'Tracking information will be available soon');
    }
  };

  const reorderMeal = () => {
    // Navigate to meal plans or reorder flow
    navigation.navigate('Main', { 
      screen: 'MealPlans',
      params: { reorderFrom: orderId }
    });
  };

  const contactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to reach us?',
      [
        { text: 'Call', onPress: () => Linking.openURL('tel:+2348131930599') },
        { text: 'Email', onPress: () => Linking.openURL('mailto:support@choma.ng') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles(colors).header}
      >
        <TouchableOpacity 
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={styles(colors).closeButton}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Order Confirmed!</Text>
          <Text style={styles(colors).headerSubtitle}>Your delicious meal is on its way</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
        {/* Success Animation/Icon */}
        <View style={styles(colors).successContainer}>
          <View style={styles(colors).successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
          </View>
          <Text style={styles(colors).successTitle}>Order Confirmed! 🎉</Text>
          <Text style={styles(colors).successMessage}>
            Thank you for choosing choma! Your order has been received and we're preparing your delicious meal.
          </Text>
        </View>

        {/* Order Summary */}
        {loading ? (
          <View style={styles(colors).loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading order details...</Text>
          </View>
        ) : orderData ? (
          <View style={styles(colors).orderSummary}>
            <Text style={styles(colors).sectionTitle}>Order Summary</Text>
            
            <View style={styles(colors).orderCard}>
              <View style={styles(colors).orderHeader}>
                <Text style={styles(colors).orderId}>Order #{orderData._id?.slice(-6)}</Text>
                <View style={[styles(colors).statusBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles(colors).statusText}>{orderData.orderStatus}</Text>
                </View>
              </View>
              
              <View style={styles(colors).orderDetails}>
                <View style={styles(colors).detailRow}>
                  <Text style={styles(colors).detailLabel}>Total Amount:</Text>
                  <Text style={styles(colors).detailValue}>₦{orderData.totalAmount?.toLocaleString()}</Text>
                </View>
                
                <View style={styles(colors).detailRow}>
                  <Text style={styles(colors).detailLabel}>Payment Status:</Text>
                  <Text style={[styles(colors).detailValue, { color: colors.primary }]}>
                    {orderData.paymentStatus}
                  </Text>
                </View>
                
                <View style={styles(colors).detailRow}>
                  <Text style={styles(colors).detailLabel}>Delivery Address:</Text>
                  <Text style={styles(colors).detailValue}>{orderData.deliveryAddress}</Text>
                </View>
                
                {orderData.deliveryDate && (
                  <View style={styles(colors).detailRow}>
                    <Text style={styles(colors).detailLabel}>Expected Delivery:</Text>
                    <Text style={styles(colors).detailValue}>
                      {new Date(orderData.deliveryDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles(colors).fallbackInfo}>
            <Text style={styles(colors).sectionTitle}>What's Next?</Text>
            <Text style={styles(colors).fallbackText}>
              You'll receive a confirmation email shortly with your order details and tracking information.
            </Text>
          </View>
        )}

        {/* Next Steps */}
        <View style={styles(colors).nextSteps}>
          <Text style={styles(colors).sectionTitle}>What happens next?</Text>
          
          <View style={styles(colors).stepsList}>
            <View style={styles(colors).stepItem}>
              <View style={styles(colors).stepIcon}>
                <Ionicons name="restaurant-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles(colors).stepContent}>
                <Text style={styles(colors).stepTitle}>Kitchen Preparation</Text>
                <Text style={styles(colors).stepDescription}>
                  Our chefs are preparing your fresh meal with love and care
                </Text>
              </View>
            </View>
            
            <View style={styles(colors).stepItem}>
              <View style={styles(colors).stepIcon}>
                <Ionicons name="car-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles(colors).stepContent}>
                <Text style={styles(colors).stepTitle}>Driver Assignment</Text>
                <Text style={styles(colors).stepDescription}>
                  A delivery driver will be assigned to bring your meal to you
                </Text>
              </View>
            </View>
            
            <View style={styles(colors).stepItem}>
              <View style={styles(colors).stepIcon}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles(colors).stepContent}>
                <Text style={styles(colors).stepTitle}>Real-time Tracking</Text>
                <Text style={styles(colors).stepDescription}>
                  Track your delivery in real-time once it's on the way
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles(colors).actionButtons}>
          <TouchableOpacity 
            style={styles(colors).primaryButton}
            onPress={trackDelivery}
          >
            <Ionicons name="location-outline" size={20} color="white" style={styles(colors).buttonIcon} />
            <Text style={styles(colors).primaryButtonText}>Track Delivery</Text>
          </TouchableOpacity>
          
          <View style={styles(colors).secondaryButtons}>
            <TouchableOpacity 
              style={styles(colors).secondaryButton}
              onPress={reorderMeal}
            >
              <Ionicons name="repeat-outline" size={20} color={colors.primary} />
              <Text style={styles(colors).secondaryButtonText}>Reorder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles(colors).secondaryButton}
              onPress={contactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={styles(colors).secondaryButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promotional Banner */}
        <View style={styles(colors).promoBanner}>
          <LinearGradient
            colors={[colors.secondary, colors.secondaryDark]}
            style={styles(colors).promoGradient}
          >
            <View style={styles(colors).promoContent}>
              <Ionicons name="gift-outline" size={24} color={colors.warning} />
              <Text style={styles(colors).promoText}>
                Refer a friend and get ₦500 off your next order!
              </Text>
            </View>
          </LinearGradient>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  orderSummary: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  orderDetails: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fallbackInfo: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  fallbackText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  nextSteps: {
    marginBottom: 32,
  },
  stepsList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  promoBanner: {
    marginBottom: 20,
  },
  promoGradient: {
    borderRadius: 12,
    padding: 16,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 12,
  },
});