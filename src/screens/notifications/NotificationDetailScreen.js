// src/screens/notifications/NotificationDetailScreen.js - Modern Dark Theme
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import StandardHeader from '../../components/layout/Header';

const NotificationDetailScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { notification } = route.params;

  const getNotificationIcon = (type) => {
    switch (type) {
      // Payment notifications
      case 'payment_success':
        return 'card-outline';
      case 'payment_failed':
        return 'alert-circle-outline';
      case 'refund_processed':
        return 'cash-outline';
      
      // User notifications
      case 'welcome':
        return 'hand-left-outline';
      case 'profile_incomplete':
        return 'person-outline';
      
      // Subscription notifications
      case 'subscription_created':
      case 'subscription_renewed':
        return 'checkmark-circle-outline';
      case 'subscription_expiring':
        return 'time-outline';
      case 'subscription_paused':
        return 'pause-circle-outline';
      case 'subscription_cancelled':
        return 'close-circle-outline';
      
      // Order notifications
      case 'order_confirmed':
        return 'cube-outline';
      case 'order_preparing':
        return 'restaurant-outline';
      case 'order_ready':
        return 'checkmark-circle-outline';
      case 'order_out_for_delivery':
        return 'car-outline';
      case 'order_delivered':
        return 'checkmark-done-outline';
      case 'order_cancelled':
        return 'close-circle-outline';
      
      // Chef notifications
      case 'chef_assigned':
      case 'chef_changed':
        return 'person-outline';
      
      // Promotional notifications
      case 'new_meal_plans':
        return 'restaurant-outline';
      case 'special_offer':
        return 'pricetag-outline';
      case 'seasonal_menu':
        return 'star-outline';
      
      // Legacy types
      case 'order':
        return 'bag-check';
      case 'delivery':
        return 'car';
      case 'promotion':
        return 'pricetag';
      case 'menu':
        return 'restaurant';
      
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      // Payment notifications
      case 'payment_success':
      case 'refund_processed':
        return colors.success;
      case 'payment_failed':
        return colors.error;
      
      // Subscription notifications
      case 'subscription_created':
      case 'subscription_renewed':
      case 'order_delivered':
      case 'order_ready':
        return colors.success;
      case 'subscription_expiring':
      case 'order_preparing':
        return colors.warning;
      case 'subscription_cancelled':
      case 'order_cancelled':
        return colors.error;
      case 'subscription_paused':
        return colors.textMuted;
      
      // Order notifications
      case 'order_confirmed':
      case 'order_out_for_delivery':
        return colors.primary;
      
      // Promotional notifications
      case 'special_offer':
      case 'new_meal_plans':
      case 'seasonal_menu':
        return colors.warning;
      
      // User notifications
      case 'welcome':
        return colors.success;
      case 'profile_incomplete':
        return colors.info;
      
      // Legacy types
      case 'order':
        return colors.success;
      case 'delivery':
        return colors.primary;
      case 'promotion':
        return colors.warning;
      case 'menu':
        return colors.info;
      
      default:
        return colors.textMuted;
    }
  };

  const formatFullDate = (timestamp) => {
    try {
      if (!timestamp) {
        return 'Unknown date';
      }
      
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };

  const handleActionPress = () => {
    switch (notification.type) {
      case 'order':
      case 'delivery':
        if (notification.orderId) {
          navigation.navigate('OrderDetail', { orderId: notification.orderId });
        } else {
          navigation.navigate('Orders');
        }
        break;
      case 'promotion':
        navigation.navigate('MealPlans');
        break;
      case 'menu':
        navigation.navigate('MealPlans');
        break;
      default:
        navigation.goBack();
    }
  };

  const getActionText = (type) => {
    switch (type) {
      case 'order':
      case 'delivery':
        return 'View Order';
      case 'promotion':
        return 'Browse Meal Plans';
      case 'menu':
        return 'View Menu';
      default:
        return 'Close';
    }
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <StandardHeader 
        title="Notification" 
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles(colors).scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles(colors).content}>
          {/* Icon and Title */}
          <View style={styles(colors).iconSection}>
            <LinearGradient
              colors={[getNotificationColor(notification.type), `${getNotificationColor(notification.type)}80`]}
              style={styles(colors).iconContainer}
            >
              <Ionicons
                name={getNotificationIcon(notification.type)}
                size={48}
                color={colors.white}
              />
            </LinearGradient>
          </View>

          <Text style={styles(colors).title}>{notification.title}</Text>
          
          <Text style={styles(colors).timestamp}>
            {formatFullDate(notification.createdAt || notification.timestamp)}
          </Text>

          {/* Message */}
          <View style={styles(colors).messageSection}>
            <Text style={styles(colors).message}>{notification.message}</Text>
          </View>

          {/* Additional Details based on type */}
          {notification.type === 'order' && notification.orderId && (
            <View style={styles(colors).detailsSection}>
              <Text style={styles(colors).detailsTitle}>Order Details</Text>
              <View style={styles(colors).detailRow}>
                <Text style={styles(colors).detailLabel}>Order ID:</Text>
                <Text style={styles(colors).detailValue}>{notification.orderId}</Text>
              </View>
            </View>
          )}

          {notification.type === 'delivery' && notification.orderId && (
            <View style={styles(colors).detailsSection}>
              <Text style={styles(colors).detailsTitle}>Delivery Information</Text>
              <View style={styles(colors).detailRow}>
                <Text style={styles(colors).detailLabel}>Status:</Text>
                <Text style={styles(colors).detailValue}>Out for Delivery</Text>
              </View>
            </View>
          )}

          {notification.type === 'promotion' && (
            <View style={styles(colors).detailsSection}>
              <Text style={styles(colors).detailsTitle}>Special Offer</Text>
              <Text style={styles(colors).promoDescription}>
                Don't miss out on this limited-time offer! Browse our meal plans 
                and use the discount code during checkout.
              </Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={styles(colors).actionButton}
            onPress={handleActionPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[getNotificationColor(notification.type), `${getNotificationColor(notification.type)}CC`]}
              style={styles(colors).actionButtonGradient}
            >
              <Text style={styles(colors).actionButtonText}>
                {getActionText(notification.type)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
  },
  messageSection: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: THEME.borderRadius.large,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  detailsSection: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    marginBottom: 30,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  promoDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    marginTop: 20,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default NotificationDetailScreen;