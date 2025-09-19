import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

class LoyaltyService {
  constructor() {
    this.loyaltyPoints = 0;
    this.loyaltyLevel = 'Bronze';
    this.rewards = [];
    this.pointsHistory = [];
    this.initialized = false;
    
    this.loyaltyLevels = {
      Bronze: { minPoints: 0, multiplier: 1, color: '#CD7F32' },
      Silver: { minPoints: 1000, multiplier: 1.2, color: '#C0C0C0' },
      Gold: { minPoints: 2500, multiplier: 1.5, color: '#FFD700' },
      Platinum: { minPoints: 5000, multiplier: 2, color: '#E5E4E2' },
    };
  }

  async initialize() {
    try {
      await this.loadLoyaltyData();
      await this.loadRewards();
      this.initialized = true;
      console.log('🏆 Loyalty service initialized');
    } catch (error) {
      console.error('Error initializing loyalty service:', error);
    }
  }

  async loadLoyaltyData() {
    try {
      const response = await apiService.getLoyaltyData();
      if (response.success) {
        this.loyaltyPoints = response.data.points || 0;
        this.loyaltyLevel = response.data.level || 'Bronze';
        this.pointsHistory = response.data.history || [];
        await this.saveLoyaltyData();
      } else {
        // Load from local storage if API fails
        await this.loadStoredLoyaltyData();
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      await this.loadStoredLoyaltyData();
    }
  }

  async loadStoredLoyaltyData() {
    try {
      const storedData = await AsyncStorage.getItem('loyaltyData');
      if (storedData) {
        const data = JSON.parse(storedData);
        this.loyaltyPoints = data.points || 0;
        this.loyaltyLevel = data.level || 'Bronze';
        this.pointsHistory = data.history || [];
      }
    } catch (error) {
      console.error('Error loading stored loyalty data:', error);
    }
  }

  async saveLoyaltyData() {
    try {
      const data = {
        points: this.loyaltyPoints,
        level: this.loyaltyLevel,
        history: this.pointsHistory,
      };
      await AsyncStorage.setItem('loyaltyData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving loyalty data:', error);
    }
  }

  async loadRewards() {
    try {
      const response = await apiService.getAvailableRewards();
      if (response.success) {
        this.rewards = response.data;
        await AsyncStorage.setItem('availableRewards', JSON.stringify(this.rewards));
      } else {
        // Load from local storage if API fails
        const storedRewards = await AsyncStorage.getItem('availableRewards');
        if (storedRewards) {
          this.rewards = JSON.parse(storedRewards);
        } else {
          this.rewards = this.getDefaultRewards();
        }
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      this.rewards = this.getDefaultRewards();
    }
  }

  getDefaultRewards() {
    return [
      {
        id: '1',
        name: 'Free Delivery',
        description: 'Get free delivery on your next order',
        pointsCost: 200,
        type: 'delivery',
        icon: 'bicycle',
      },
      {
        id: '2',
        name: '10% Discount',
        description: '10% off your next meal order',
        pointsCost: 500,
        type: 'discount',
        icon: 'pricetag',
      },
      {
        id: '3',
        name: 'Free Meal',
        description: 'Get a free meal worth up to ₦2000',
        pointsCost: 1000,
        type: 'meal',
        icon: 'restaurant',
      },
      {
        id: '4',
        name: 'VIP Access',
        description: 'Priority delivery and exclusive meals',
        pointsCost: 2000,
        type: 'vip',
        icon: 'star',
      },
    ];
  }

  async earnPoints(orderValue, action = 'order') {
    try {
      let pointsEarned = 0;
      
      switch (action) {
        case 'order':
          pointsEarned = Math.floor(orderValue * 0.1); // 10% of order value
          break;
        case 'referral':
          pointsEarned = 500;
          break;
        case 'review':
          pointsEarned = 50;
          break;
        case 'social_share':
          pointsEarned = 25;
          break;
        case 'birthday':
          pointsEarned = 200;
          break;
        default:
          pointsEarned = 0;
      }

      // Apply loyalty level multiplier
      const levelData = this.loyaltyLevels[this.loyaltyLevel];
      pointsEarned = Math.floor(pointsEarned * levelData.multiplier);

      this.loyaltyPoints += pointsEarned;
      
      // Add to history
      this.pointsHistory.unshift({
        id: Date.now().toString(),
        action,
        points: pointsEarned,
        timestamp: new Date().toISOString(),
        description: this.getActionDescription(action, pointsEarned),
      });

      // Check for level up
      const newLevel = this.calculateLoyaltyLevel();
      const leveledUp = newLevel !== this.loyaltyLevel;
      this.loyaltyLevel = newLevel;

      await this.saveLoyaltyData();
      
      // Sync with backend
      try {
        await apiService.updateLoyaltyPoints(this.loyaltyPoints, action, pointsEarned);
      } catch (error) {
        console.error('Error syncing loyalty points:', error);
      }

      return {
        pointsEarned,
        totalPoints: this.loyaltyPoints,
        leveledUp,
        newLevel: this.loyaltyLevel,
      };
    } catch (error) {
      console.error('Error earning points:', error);
      throw error;
    }
  }

  getActionDescription(action, points) {
    const descriptions = {
      order: `Earned ${points} points from order`,
      referral: `Earned ${points} points from referral`,
      review: `Earned ${points} points from review`,
      social_share: `Earned ${points} points from sharing`,
      birthday: `Earned ${points} birthday bonus points`,
    };
    return descriptions[action] || `Earned ${points} points`;
  }

  calculateLoyaltyLevel() {
    const levels = Object.keys(this.loyaltyLevels).reverse();
    for (const level of levels) {
      if (this.loyaltyPoints >= this.loyaltyLevels[level].minPoints) {
        return level;
      }
    }
    return 'Bronze';
  }

  async redeemReward(rewardId) {
    try {
      const reward = this.rewards.find(r => r.id === rewardId);
      if (!reward) {
        throw new Error('Reward not found');
      }

      if (this.loyaltyPoints < reward.pointsCost) {
        throw new Error('Insufficient points');
      }

      this.loyaltyPoints -= reward.pointsCost;
      
      // Add to history
      this.pointsHistory.unshift({
        id: Date.now().toString(),
        action: 'redeem',
        points: -reward.pointsCost,
        timestamp: new Date().toISOString(),
        description: `Redeemed ${reward.name}`,
        rewardId: reward.id,
      });

      await this.saveLoyaltyData();
      
      // Sync with backend
      try {
        const response = await apiService.redeemReward(rewardId);
        if (response.success) {
          return {
            success: true,
            reward,
            remainingPoints: this.loyaltyPoints,
            redemptionCode: response.data.redemptionCode,
          };
        } else {
          throw new Error(response.error || 'Failed to redeem reward');
        }
      } catch (error) {
        // Revert points if backend fails
        this.loyaltyPoints += reward.pointsCost;
        this.pointsHistory.shift();
        await this.saveLoyaltyData();
        throw error;
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  getLoyaltyStats() {
    const currentLevel = this.loyaltyLevels[this.loyaltyLevel];
    const nextLevelName = this.getNextLevel();
    const nextLevel = nextLevelName ? this.loyaltyLevels[nextLevelName] : null;
    
    const pointsToNextLevel = nextLevel ? 
      nextLevel.minPoints - this.loyaltyPoints : 0;
    
    const progressPercentage = nextLevel ? 
      ((this.loyaltyPoints - currentLevel.minPoints) / 
       (nextLevel.minPoints - currentLevel.minPoints)) * 100 : 100;

    return {
      currentPoints: this.loyaltyPoints,
      currentLevel: this.loyaltyLevel,
      nextLevel: nextLevelName,
      pointsToNextLevel,
      progressPercentage: Math.min(progressPercentage, 100),
      levelColor: currentLevel.color,
      multiplier: currentLevel.multiplier,
    };
  }

  getNextLevel() {
    const levels = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const currentIndex = levels.indexOf(this.loyaltyLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  getAvailableRewards() {
    return this.rewards.filter(reward => this.loyaltyPoints >= reward.pointsCost);
  }

  getAllRewards() {
    return this.rewards;
  }

  getPointsHistory() {
    return this.pointsHistory;
  }

  async clearLoyaltyData() {
    try {
      await AsyncStorage.removeItem('loyaltyData');
      await AsyncStorage.removeItem('availableRewards');
      this.loyaltyPoints = 0;
      this.loyaltyLevel = 'Bronze';
      this.rewards = [];
      this.pointsHistory = [];
    } catch (error) {
      console.error('Error clearing loyalty data:', error);
    }
  }
}

export default new LoyaltyService();