import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import referralService from '../../services/referralService';
import { useAuth } from '../../context/AuthContext';

const ReferralCard = ({ style }) => {
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    initializeReferral();
  }, []);

  const initializeReferral = async () => {
    try {
      setLoading(true);
      
      await referralService.initialize();
      
      let code = referralService.getUserReferralCode();
      if (!code && user) {
        code = await referralService.generateReferralCode(user.id);
      }
      
      setReferralCode(code || '');
      
      await referralService.getReferralHistory();
      const referralStats = referralService.getReferralStats();
      setStats(referralStats);
      
    } catch (error) {
      console.error('Error initializing referral:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = await referralService.shareReferral();
      
      if (shareData.success) {
        await Share.share({
          message: shareData.message,
          title: 'Join choma',
        });
      }
    } catch (error) {
      console.error('Error sharing referral:', error);
      Alert.alert('Error', 'Failed to share referral. Please try again.');
    }
  };

  const copyReferralCode = async () => {
    if (referralCode) {
      await Clipboard.setString(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#4CAF50" />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#4CAF50', '#45A049']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Ionicons name="gift" size={24} color="#FFFFFF" />
          <Text style={styles.title}>Refer & Earn</Text>
        </View>
        
        <Text style={styles.description}>
          Share choma with friends and earn ₦500 for each successful referral!
        </Text>
        
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Referral Code:</Text>
          <TouchableOpacity
            style={styles.codeButton}
            onPress={copyReferralCode}
            activeOpacity={0.7}
          >
            <Text style={styles.codeText}>{referralCode || 'Loading...'}</Text>
            <Ionicons name="copy" size={16} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share" size={20} color="#4CAF50" />
          <Text style={styles.shareButtonText}>Share Now</Text>
        </TouchableOpacity>
      </LinearGradient>
      
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.successfulReferrals || 0}</Text>
            <Text style={styles.statLabel}>Successful</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>₦{stats.totalEarnings || 0}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 20,
  },
  codeContainer: {
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
});

export default ReferralCard;