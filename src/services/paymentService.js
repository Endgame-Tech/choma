// src/services/paymentService.js - Payment Service for Paystack Integration
import apiService from './api';
import { APP_CONFIG } from '../utils/constants';

class PaymentService {
  constructor() {
    this.paystackPublicKey = APP_CONFIG.PAYSTACK_PUBLIC_KEY;
  }

  // Initialize payment with backend
  async initializePayment(paymentData) {
    try {
      const { amount, email, subscriptionId, orderData } = paymentData;
      
      const result = await apiService.request('/payments/initialize', {
        method: 'POST',
        body: {
          amount,
          email,
          subscriptionId,
          orderData
        }
      });

      if (result.success) {
        return {
          success: true,
          data: {
            ...result.data,
            publicKey: this.paystackPublicKey
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      return {
        success: false,
        error: error.message || 'Payment initialization failed'
      };
    }
  }

  // Verify payment with backend
  async verifyPayment(reference) {
    try {
      const result = await apiService.request(`/payments/verify/${reference}`);
      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message || 'Payment verification failed'
      };
    }
  }

  // Get payment history
  async getPaymentHistory(page = 1, limit = 10) {
    try {
      const result = await apiService.request(`/payments/history?page=${page}&limit=${limit}`);
      return result;
    } catch (error) {
      console.error('Payment history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment history'
      };
    }
  }

  // Request refund
  async requestRefund(refundData) {
    try {
      const { reference, amount, reason } = refundData;
      
      const result = await apiService.request('/payments/refund', {
        method: 'POST',
        body: {
          reference,
          amount,
          reason
        }
      });

      return result;
    } catch (error) {
      console.error('Refund request error:', error);
      return {
        success: false,
        error: error.message || 'Refund request failed'
      };
    }
  }

  // Calculate payment amounts
  calculatePaymentAmounts(subtotal) {
    const deliveryFee = subtotal >= APP_CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : 1000;
    const tax = Math.round(subtotal * APP_CONFIG.TAX_RATE);
    const total = subtotal + deliveryFee + tax;

    return {
      subtotal,
      deliveryFee,
      tax,
      total,
      formattedSubtotal: `${APP_CONFIG.CURRENCY_SYMBOL}${subtotal.toLocaleString()}`,
      formattedDeliveryFee: deliveryFee === 0 ? 'Free' : `${APP_CONFIG.CURRENCY_SYMBOL}${deliveryFee.toLocaleString()}`,
      formattedTax: `${APP_CONFIG.CURRENCY_SYMBOL}${tax.toLocaleString()}`,
      formattedTotal: `${APP_CONFIG.CURRENCY_SYMBOL}${total.toLocaleString()}`
    };
  }

  // Validate payment data
  validatePaymentData(paymentData) {
    const { amount, email, subscriptionId } = paymentData;
    
    const errors = [];
    
    if (!amount || amount <= 0) {
      errors.push('Invalid payment amount');
    }
    
    if (!email || !this.isValidEmail(email)) {
      errors.push('Valid email is required');
    }
    
    if (!subscriptionId) {
      errors.push('Subscription ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Email validation helper
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Format currency
  formatCurrency(amount) {
    return `${APP_CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString()}`;
  }

  // Get Paystack public key
  getPublicKey() {
    return this.paystackPublicKey;
  }
}

// Create and export singleton instance
const paymentService = new PaymentService();
export default paymentService;
