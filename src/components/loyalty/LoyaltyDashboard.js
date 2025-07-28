import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import loyaltyService from '../../services/loyaltyService';

const LoyaltyDashboard = ({ style }) => {
  const [loyaltyStats, setLoyaltyStats] = useState({});
  const [availableRewards, setAvailableRewards] = useState([]);
  const [allRewards, setAllRewards] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    initializeLoyalty();
  }, []);

  const initializeLoyalty = async () => {
    try {
      setLoading(true);
      
      await loyaltyService.initialize();
      
      const stats = loyaltyService.getLoyaltyStats();
      setLoyaltyStats(stats);
      
      const available = loyaltyService.getAvailableRewards();
      setAvailableRewards(available);
      
      const all = loyaltyService.getAllRewards();
      setAllRewards(all);
      
      const history = loyaltyService.getPointsHistory();
      setPointsHistory(history.slice(0, 10)); // Show last 10 transactions
      
    } catch (error) {
      console.error('Error initializing loyalty:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId) => {
    try {
      setRedeeming(rewardId);
      
      const result = await loyaltyService.redeemReward(rewardId);
      
      if (result.success) {
        Alert.alert(
          'Reward Redeemed!',
          `${result.reward.name} has been redeemed successfully!\n\nRedemption Code: ${result.redemptionCode}`,
          [{ text: 'OK' }]
        );
        
        // Refresh data
        await initializeLoyalty();
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      Alert.alert(
        'Redemption Failed',
        error.message || 'Failed to redeem reward. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRedeeming(null);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#4CAF50" size="large" />
        <Text style={styles.loadingText}>Loading loyalty data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Loyalty Level Card */}
      <LinearGradient
        colors={[loyaltyStats.levelColor || '#CD7F32', '#000000']}
        style={styles.levelCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.levelHeader}>
          <Ionicons name="trophy" size={32} color="#FFFFFF" />
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>{loyaltyStats.currentLevel} Member</Text>
            <Text style={styles.pointsText}>{loyaltyStats.currentPoints} Points</Text>
          </View>
        </View>
        
        {loyaltyStats.nextLevel && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${loyaltyStats.progressPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {loyaltyStats.pointsToNextLevel} points to {loyaltyStats.nextLevel}
            </Text>
          </View>
        )}
        
        <View style={styles.multiplierContainer}>
          <Text style={styles.multiplierText}>
            Earning {loyaltyStats.multiplier}x points on all orders
          </Text>
        </View>
      </LinearGradient>

      {/* Available Rewards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Rewards</Text>
        {availableRewards.length > 0 ? (
          availableRewards.map((reward) => (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardIcon}>
                <Ionicons name={reward.icon} size={24} color="#4CAF50" />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDescription}>{reward.description}</Text>
                <Text style={styles.rewardPoints}>{reward.pointsCost} points</Text>
              </View>
              <TouchableOpacity
                style={styles.redeemButton}
                onPress={() => handleRedeemReward(reward.id)}
                disabled={redeeming === reward.id}
              >
                {redeeming === reward.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.redeemButtonText}>Redeem</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noRewardsText}>
            No rewards available yet. Keep earning points!
          </Text>
        )}
      </View>

      {/* All Rewards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Rewards</Text>
        {allRewards.map((reward) => {
          const canRedeem = loyaltyStats.currentPoints >= reward.pointsCost;
          return (
            <View key={reward.id} style={[styles.rewardCard, !canRedeem && styles.lockedReward]}>
              <View style={styles.rewardIcon}>
                <Ionicons 
                  name={reward.icon} 
                  size={24} 
                  color={canRedeem ? "#4CAF50" : "#CCCCCC"} 
                />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardName, !canRedeem && styles.lockedText]}>
                  {reward.name}
                </Text>
                <Text style={[styles.rewardDescription, !canRedeem && styles.lockedText]}>
                  {reward.description}
                </Text>
                <Text style={[styles.rewardPoints, !canRedeem && styles.lockedText]}>
                  {reward.pointsCost} points
                </Text>
              </View>
              {!canRedeem && (
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed" size={20} color="#CCCCCC" />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Points History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {pointsHistory.length > 0 ? (
          pointsHistory.map((transaction) => (
            <View key={transaction.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons 
                  name={transaction.points > 0 ? "add-circle" : "remove-circle"} 
                  size={20} 
                  color={transaction.points > 0 ? "#4CAF50" : "#F44336"} 
                />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDescription}>{transaction.description}</Text>
                <Text style={styles.historyDate}>{formatDate(transaction.timestamp)}</Text>
              </View>
              <Text style={[
                styles.historyPoints,
                { color: transaction.points > 0 ? "#4CAF50" : "#F44336" }
              ]}>
                {transaction.points > 0 ? '+' : ''}{transaction.points}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noHistoryText}>No activity yet</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  levelCard: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelInfo: {
    marginLeft: 16,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  multiplierContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  multiplierText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedReward: {
    opacity: 0.6,
  },
  rewardIcon: {
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  lockedText: {
    color: '#CCCCCC',
  },
  lockIcon: {
    marginLeft: 8,
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noRewardsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyIcon: {
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#666666',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: '600',
  },
  noHistoryText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

export default LoyaltyDashboard;