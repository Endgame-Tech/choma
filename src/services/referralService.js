import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

class ReferralService {
  constructor() {
    this.userReferralCode = null;
    this.referralHistory = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.loadReferralCode();
      await this.loadReferralHistory();
      this.initialized = true;
      console.log('🔗 Referral service initialized');
    } catch (error) {
      console.error('Error initializing referral service:', error);
    }
  }

  async loadReferralCode() {
    try {
      const storedCode = await AsyncStorage.getItem('userReferralCode');
      if (storedCode) {
        this.userReferralCode = storedCode;
      }
    } catch (error) {
      console.error('Error loading referral code:', error);
    }
  }

  async generateReferralCode(userId) {
    try {
      const response = await apiService.generateReferralCode(userId);
      if (response.success) {
        this.userReferralCode = response.data.referralCode;
        await AsyncStorage.setItem('userReferralCode', this.userReferralCode);
        return this.userReferralCode;
      }
      throw new Error(response.error || 'Failed to generate referral code');
    } catch (error) {
      console.error('Error generating referral code:', error);
      throw error;
    }
  }

  async validateReferralCode(referralCode) {
    try {
      const response = await apiService.validateReferralCode(referralCode);
      return response.success;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    }
  }

  async applyReferralCode(referralCode) {
    try {
      const response = await apiService.applyReferralCode(referralCode);
      if (response.success) {
        return {
          success: true,
          reward: response.data.reward,
          referrerReward: response.data.referrerReward,
        };
      }
      return {
        success: false,
        error: response.error || 'Failed to apply referral code',
      };
    } catch (error) {
      console.error('Error applying referral code:', error);
      return {
        success: false,
        error: error.message || 'Failed to apply referral code',
      };
    }
  }

  async getReferralHistory() {
    try {
      const response = await apiService.getReferralHistory();
      if (response.success) {
        this.referralHistory = response.data;
        await AsyncStorage.setItem('referralHistory', JSON.stringify(this.referralHistory));
        return this.referralHistory;
      }
      return [];
    } catch (error) {
      console.error('Error getting referral history:', error);
      return this.referralHistory;
    }
  }

  async loadReferralHistory() {
    try {
      const storedHistory = await AsyncStorage.getItem('referralHistory');
      if (storedHistory) {
        this.referralHistory = JSON.parse(storedHistory);
      }
    } catch (error) {
      console.error('Error loading referral history:', error);
    }
  }

  async shareReferral() {
    try {
      if (!this.userReferralCode) {
        throw new Error('No referral code available');
      }

      const shareMessage = `Join choma and get ₦500 off your first order! Use my referral code: ${this.userReferralCode}\n\nDownload the app: https://choma.com/download`;
      
      // In a real app, you'd use Share API
      return {
        success: true,
        message: shareMessage,
        referralCode: this.userReferralCode,
      };
    } catch (error) {
      console.error('Error sharing referral:', error);
      throw error;
    }
  }

  getReferralStats() {
    const totalReferrals = this.referralHistory.length;
    const successfulReferrals = this.referralHistory.filter(r => r.status === 'completed').length;
    const totalEarnings = this.referralHistory
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.reward || 0), 0);

    return {
      totalReferrals,
      successfulReferrals,
      totalEarnings,
      pendingReferrals: totalReferrals - successfulReferrals,
    };
  }

  getUserReferralCode() {
    return this.userReferralCode;
  }

  async clearReferralData() {
    try {
      await AsyncStorage.removeItem('userReferralCode');
      await AsyncStorage.removeItem('referralHistory');
      this.userReferralCode = null;
      this.referralHistory = [];
    } catch (error) {
      console.error('Error clearing referral data:', error);
    }
  }
}

export default new ReferralService();