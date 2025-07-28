// src/screens/dashboard/ProfileScreen.js - Enhanced with Dark Theme
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Image,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { DIETARY_PREFERENCES, VALIDATION } from '../../utils/profileConstants';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';
import { Linking, Share } from 'react-native';
import UserAvatar from '../../components/ui/UserAvatar';
import CloudStorageService from '../../services/cloudStorage';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user, isOffline, logout, updateProfile, updateUserProfile, deleteAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableUser, setEditableUser] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Real user stats data
  const [userStats, setUserStats] = useState({
    ordersThisMonth: 0,
    totalOrdersCompleted: 0,
    favoriteCategory: '',
    streakDays: 0,
    nextDelivery: null,
    activeSubscriptions: 0,
    totalSaved: 0,
    nutritionScore: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState({
    orderUpdates: true,
    deliveryReminders: true,
    promotions: false,
    newMealPlans: true,
    achievements: true
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setEditableUser({
        fullName: user.fullName,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        dietaryPreferences: user.dietaryPreferences || [],
        allergies: user.allergies || ''
      });
      fetchUserStats();
      fetchUserSubscriptions();
      fetchUserActivity();
      fetchUserAchievements();
      fetchNotificationPreferences();
    }
    loadProfileImage();
  }, [user]);

  const loadProfileImage = async () => {
    try {
      // First check if user has a profile image from registration
      if (user?.profileImage) {
        setProfileImage(user.profileImage);
        return;
      }
      
      // Fall back to AsyncStorage for locally stored images
      const storedImage = await AsyncStorage.getItem('profileImage');
      if (storedImage) {
        setProfileImage(storedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      setStatsLoading(true);
      console.log('🔄 Fetching user stats...');
      const response = await apiService.getUserStats();
      
      console.log('📊 Stats API response:', response);
      
      if (response.success && response.data) {
        setUserStats(response.data);
        console.log('✅ User stats loaded:', response.data);
      } else {
        console.log('❌ Stats API failed, using realistic data for active user');
        // Generate realistic data for a user without active subscription
        const realisticStats = {
          ordersThisMonth: 0,
          totalOrdersCompleted: 0,
          favoriteCategory: '',
          streakDays: 0,
          nextDelivery: null,
          activeSubscriptions: 0, // No active subscription
          totalSaved: 0,
          nutritionScore: 0
        };
        setUserStats(realisticStats);
        console.log('🔄 Using realistic stats for active user:', realisticStats);
      }
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      // Fallback data for user without subscription
      setUserStats({
        ordersThisMonth: 0,
        totalOrdersCompleted: 0,
        favoriteCategory: '',
        streakDays: 0,
        nextDelivery: null,
        activeSubscriptions: 0,
        totalSaved: 0,
        nutritionScore: 0
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      console.log('🔄 Fetching user subscriptions...');
      const response = await apiService.getUserSubscriptions();
      
      console.log('📋 Subscription API response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('📊 Subscription data count:', response.data.length);
        console.log('📝 Subscription data details:', JSON.stringify(response.data, null, 2));
        
        // Transform the data to match the expected format
        const transformedSubscriptions = response.data.map(sub => ({
          _id: sub._id,
          mealPlan: {
            planName: sub.mealPlanId?.planName || 'Unknown Plan',
            planId: sub.mealPlanId?._id || sub.mealPlanId
          },
          frequency: sub.frequency || 'Weekly',
          duration: sub.duration || '4 weeks',
          status: sub.status,
          nextDelivery: sub.nextDelivery,
          startDate: sub.startDate,
          currentWeek: Math.ceil((Date.now() - new Date(sub.startDate)) / (7 * 24 * 60 * 60 * 1000)) || 1,
          totalWeeks: 4,
          mealsPerWeek: 21,
          price: sub.price || sub.totalPrice
        }));
        
        setUserSubscriptions(transformedSubscriptions);
        console.log('✅ User subscriptions loaded and transformed:', transformedSubscriptions);
      } else {
        console.log('❌ No subscriptions found from API, showing empty state');
        // Don't create fake subscription data - show empty state instead
        setUserSubscriptions([]);
        console.log('🔄 No active subscriptions to display');
      }
    } catch (error) {
      console.error('❌ Error fetching user subscriptions:', error);
      // On error, show empty state instead of fake data
      setUserSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true);
      console.log('🔄 Fetching user activity...');
      const response = await apiService.getUserActivity();
      
      console.log('📋 Activity API response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        setRecentActivity(response.data);
        console.log('✅ User activity loaded:', response.data);
      } else {
        console.log('❌ No activity data found, showing limited activity for user without subscription');
        // Generate minimal activity for a user without subscription
        const recentUserActivity = [
          {
            id: 'activity_1',
            title: 'Profile completed',
            date: '6 days ago',
            icon: 'person',
            color: colors.textSecondary,
            type: 'profile'
          },
          {
            id: 'activity_2',
            title: 'Account created',
            date: '1 week ago',
            icon: 'checkmark-circle',
            color: colors.success,
            type: 'account'
          }
        ];
        setRecentActivity(recentUserActivity);
        console.log('🔄 Using realistic activity for active user:', recentUserActivity);
      }
    } catch (error) {
      console.error('❌ Error fetching user activity:', error);
      // Fallback activity for user without subscription
      setRecentActivity([
        {
          id: 'activity_1',
          title: 'Profile completed',
          date: '6 days ago',
          icon: 'person',
          color: colors.textSecondary,
          type: 'profile'
        }
      ]);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      setAchievementsLoading(true);
      console.log('🔄 Fetching user achievements...');
      const response = await apiService.getUserAchievements();
      
      console.log('🏆 Achievements API response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        setAchievements(response.data);
        console.log('✅ User achievements loaded:', response.data);
      } else {
        console.log('❌ No achievements data found, using basic achievements for new user');
        // Generate basic achievements for a user without subscription
        const userAchievements = [
          {
            id: 'ach_1',
            title: 'Welcome Aboard!',
            description: 'Successfully signed up for choma',
            icon: 'ribbon',
            earned: true,
            claimed: true,
            progress: 1,
            target: 1,
            reward: 'Welcome bonus',
            claimedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'ach_2',
            title: 'First Subscription',
            description: 'Subscribe to your first meal plan',
            icon: 'star',
            earned: false,
            claimed: false,
            progress: 0,
            target: 1,
            reward: '₦1000 bonus',
            hint: 'Subscribe to any meal plan to unlock!'
          },
          {
            id: 'ach_3',
            title: 'Health Explorer',
            description: 'Try 5 different meal categories',
            icon: 'leaf',
            earned: false,
            claimed: false,
            progress: 0,
            target: 5,
            hint: 'Start exploring meal plans to unlock'
          },
          {
            id: 'ach_4',
            title: 'Streak Master',
            description: 'Maintain a 7-day meal streak',
            icon: 'flame',
            earned: false,
            claimed: false,
            progress: 0,
            target: 7,
            hint: 'Get a subscription to start tracking streaks!'
          }
        ];
        setAchievements(userAchievements);
        console.log('🔄 Using realistic achievements for active user:', userAchievements);
      }
    } catch (error) {
      console.error('❌ Error fetching user achievements:', error);
      // Fallback achievements for new user
      setAchievements([
        {
          id: 'ach_1',
          title: 'Welcome Aboard!',
          description: 'Successfully signed up for choma',
          icon: 'ribbon',
          earned: true,
          claimed: true,
          progress: 1,
          target: 1,
          reward: 'Welcome bonus'
        },
        {
          id: 'ach_2',
          title: 'First Subscription',
          description: 'Subscribe to your first meal plan',
          icon: 'star',
          earned: false,
          claimed: false,
          progress: 0,
          target: 1,
          reward: '₦1000 bonus',
          hint: 'Subscribe to any meal plan to unlock!'
        }
      ]);
    } finally {
      setAchievementsLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      setNotificationsLoading(true);
      const response = await apiService.getNotificationPreferences();
      
      if (response.success) {
        setNotificationPreferences(response.data);
      } else {
        console.error('Failed to fetch notification preferences:', response.error);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const updateNotificationPreference = async (key, value) => {
    try {
      const updatedPreferences = { ...notificationPreferences, [key]: value };
      setNotificationPreferences(updatedPreferences);
      
      const response = await apiService.updateNotificationPreferences(updatedPreferences);
      
      if (!response.success) {
        // Revert on failure
        setNotificationPreferences(notificationPreferences);
        Alert.alert('Error', 'Failed to update notification preferences');
      }
    } catch (error) {
      // Revert on error
      setNotificationPreferences(notificationPreferences);
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  // Quick Action Handlers
  const handleReorder = async () => {
    // Log activity
    try {
      await apiService.logUserActivity?.({
        action: 'navigate_reorder',
        description: 'Accessed orders for reordering from profile',
        timestamp: new Date().toISOString(),
        metadata: { screen: 'ProfileScreen' }
      });
    } catch (error) {
      console.log('Activity logging failed:', error);
    }
    
    // Navigate to Orders screen where user can reorder previous orders
    navigation.navigate('Orders');
  };

  const handleInviteFriends = async () => {
    try {
      const shareMessage = `🍽️ Join me on choma - the best meal delivery service! \n\nGet healthy, delicious meals delivered to your door. Use my referral link to get started!\n\n📱 Download the app now and use code: ${user?.customerId || 'FRIEND'}\n\n#choma #HealthyEating #FoodDelivery`;
      
      const result = await Share.share({
        message: shareMessage,
        title: 'Join choma!',
      });

      if (result.action === Share.sharedAction) {
        // TODO: Track referral in backend
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Unable to share at the moment');
    }
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How can we help you?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Support', 
          onPress: () => Linking.openURL('tel:+2348000000000')
        },
        { 
          text: 'Email Support', 
          onPress: () => Linking.openURL('mailto:support@choma.ng?subject=Support Request')
        },
        { 
          text: 'Help Center', 
          onPress: () => navigation.navigate('HelpCenter')
        }
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate choma',
      'Loving the app? Please take a moment to rate us on the app store!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { 
          text: 'Rate Now', 
          onPress: () => {
            // For development - replace with actual app store URLs
            const appStoreUrl = Platform.OS === 'ios' 
              ? 'https://apps.apple.com/app/choma' 
              : 'https://play.google.com/store/apps/details?id=com.choma';
            
            Linking.openURL(appStoreUrl).catch(() => {
              Alert.alert('Error', 'Unable to open app store');
            });
          }
        }
      ]
    );
  };

  const handleWalletPress = () => {
    Alert.alert(
      '💰 Your Savings',
      `Total Saved: ₦${userStats.totalSaved.toLocaleString()}\n\n` +
      `This Month: ₦${Math.floor(userStats.totalSaved / 3).toLocaleString()}\n` +
      `Rewards Earned: ₦${Math.floor(userStats.totalSaved * 0.1).toLocaleString()}\n` +
      `Referral Bonus: ₦${Math.floor(userStats.totalSaved * 0.05).toLocaleString()}\n\n` +
      `Keep ordering to save more!`,
      [
        { text: 'Got it!', style: 'default' },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('WalletScreen') // TODO: Create WalletScreen
        }
      ]
    );
  };

  const handleNutritionScorePress = () => {
    Alert.alert(
      '🥗 Nutrition Score',
      `Your Score: ${userStats.nutritionScore}/100\n\n` +
      `This score is based on:\n` +
      `• Meal variety (${Math.floor(userStats.nutritionScore * 0.3)}/30)\n` +
      `• Nutrient balance (${Math.floor(userStats.nutritionScore * 0.4)}/40)\n` +
      `• Healthy choices (${Math.floor(userStats.nutritionScore * 0.3)}/30)\n\n` +
      `Tips to improve:\n` +
      `• Try more vegetable-rich meals\n` +
      `• Include more protein sources\n` +
      `• Choose whole grain options`,
      [
        { text: 'Got it!', style: 'default' },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('NutritionScreen') // TODO: Create NutritionScreen
        }
      ]
    );
  };

  const handleActivityItemPress = (activity) => {
    let message = `${activity.title}\n\n${activity.date}`;
    
    if (activity.type === 'delivery') {
      message += '\n\nOrder delivered successfully! Rate your experience?';
    } else if (activity.type === 'achievement') {
      message += '\n\nCongratulations on your achievement!';
    } else if (activity.type === 'meal_plan') {
      message += '\n\nYour meal plan has been updated with fresh options.';
    }
    
    Alert.alert(
      'Activity Details',
      message,
      [
        { text: 'Close', style: 'cancel' },
        ...(activity.type === 'delivery' ? [
          { text: 'Rate Order', onPress: () => navigation.navigate('RateOrderScreen', { orderId: activity.id }) }
        ] : [])
      ]
    );
  };

  useEffect(() => {
    if (isEditing || saveAttempted) {
      validateForm();
    }
  }, [editableUser, saveAttempted]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!editableUser.fullName || editableUser.fullName.trim().length < VALIDATION.fullName.minLength) {
      newErrors.fullName = VALIDATION.fullName.errorMessage;
    }
    
    if (editableUser.phone && !VALIDATION.phone.pattern.test(editableUser.phone)) {
      newErrors.phone = VALIDATION.phone.errorMessage;
    }
    
    if (editableUser.address && 
        (editableUser.address.length < VALIDATION.address.minLength || 
         editableUser.address.length > VALIDATION.address.maxLength)) {
      newErrors.address = VALIDATION.address.errorMessage;
    }
    
    if (editableUser.allergies && editableUser.allergies.length > VALIDATION.allergies.maxLength) {
      newErrors.allergies = VALIDATION.allergies.errorMessage;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    setSaveAttempted(true);
    
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form before saving.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Log activity
      await apiService.logUserActivity?.({
        action: 'profile_update',
        description: 'Updated profile information',
        timestamp: new Date().toISOString(),
        metadata: { 
          screen: 'ProfileScreen',
          fields_updated: Object.keys(editableUser).join(', ')
        }
      });

      const result = await updateUserProfile(editableUser);
      
      if (result.success) {
        setIsEditing(false);
        setSaveAttempted(false);
        Alert.alert('Success', 'Your profile has been updated successfully!');
        
        // Refresh profile data
        await updateProfile();
      } else {
        Alert.alert('Update Failed', result.message || 'Unable to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Unable to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => {
            // Reset to original user data
            setEditableUser({
              fullName: user.fullName,
              phone: user.phone || '',
              address: user.address || '',
              city: user.city || '',
              dietaryPreferences: user.dietaryPreferences || [],
              allergies: user.allergies || ''
            });
            setIsEditing(false);
            setSaveAttempted(false);
            setErrors({});
          }
        }
      ]
    );
  };

  const toggleDietaryPreference = (preference) => {
    setEditableUser(prev => ({
      ...prev,
      dietaryPreferences: (prev.dietaryPreferences || []).includes(preference)
        ? (prev.dietaryPreferences || []).filter(p => p !== preference)
        : [...(prev.dietaryPreferences || []), preference]
    }));
  };

  const handleAchievementPress = async (achievement) => {
    if (achievement.earned && !achievement.claimed) {
      // Claim the achievement
      try {
        const result = await apiService.claimAchievement(achievement.id);
        
        if (result.success) {
          Alert.alert(
            '🎉 Achievement Claimed!',
            `Congratulations! You've claimed "${achievement.title}"\n\nReward: ${achievement.reward || 'Special recognition'}`,
            [{ text: 'Awesome!', onPress: () => fetchUserAchievements() }]
          );
          
          // Log activity
          await apiService.logUserActivity?.({
            action: 'achievement_claimed',
            description: `Claimed achievement: ${achievement.title}`,
            timestamp: new Date().toISOString(),
            metadata: { 
              screen: 'ProfileScreen',
              achievementId: achievement.id,
              achievementTitle: achievement.title
            }
          });
        } else {
          Alert.alert('Claim Failed', 'Unable to claim this achievement. Please try again.');
        }
      } catch (error) {
        console.error('Achievement claim error:', error);
        Alert.alert('Error', 'Failed to claim achievement.');
      }
    } else if (!achievement.earned) {
      // Show achievement details and progress
      Alert.alert(
        achievement.title,
        `${achievement.description}\n\nProgress: ${achievement.progress || 0}/${achievement.target || 100}\n\n${achievement.hint || 'Keep going to unlock this achievement!'}`,
        [{ text: 'Got it!' }]
      );
    } else {
      // Already claimed - show details
      Alert.alert(
        `🏆 ${achievement.title}`,
        `${achievement.description}\n\nClaimed on: ${new Date(achievement.claimedAt).toLocaleDateString()}\n\nReward: ${achievement.reward || 'Special recognition'}`,
        [{ text: 'Nice!' }]
      );
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const result = await apiService.checkAchievements();
      
      if (result.success && result.data && result.data.newAchievements.length > 0) {
        const newAchievements = result.data.newAchievements;
        
        // Show achievement notification
        Alert.alert(
          '🎉 New Achievement Unlocked!',
          `You've unlocked ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}:\n\n${newAchievements.map(a => `• ${a.title}`).join('\n')}\n\nCheck your profile to claim your rewards!`,
          [{ text: 'View Achievements', onPress: () => fetchUserAchievements() }]
        );
      }
    } catch (error) {
      console.log('Achievement check failed:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      updateProfile(),
      fetchUserStats(),
      fetchUserSubscriptions(),
      fetchUserActivity(),
      fetchUserAchievements(),
      fetchNotificationPreferences()
    ]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            await logout();
            setIsLoading(false);
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Immediately show the image locally for better UX
        setProfileImage(imageUri);
        
        try {
          // Upload to cloud storage
          console.log('Uploading profile image to cloud storage...');
          // For development, use mock upload
          const cloudImageUrl = await CloudStorageService.mockUpload(imageUri, user.email);
          
          // Update user profile with cloud URL
          await updateUserProfile({ profileImage: cloudImageUrl });
          
          // Save cloud URL locally as well
          await AsyncStorage.setItem('profileImage', cloudImageUrl);
          
          console.log('Profile image updated successfully');
          
        } catch (error) {
          console.error('Error uploading profile image:', error);
          Alert.alert(
            'Upload Failed',
            'Failed to upload profile image. The image will be saved locally only.',
            [{ text: 'OK' }]
          );
          
          // Fallback to local storage
          try {
            await AsyncStorage.setItem('profileImage', imageUri);
          } catch (storageError) {
            console.error('Error saving profile image locally:', storageError);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const renderTabBar = () => (
    <View style={styles(colors).tabBar}>
      {[
        { id: 'overview', label: 'Overview', icon: 'grid-outline' },
        { id: 'activity', label: 'Activity', icon: 'pulse-outline' },
        { id: 'profile', label: 'Profile', icon: 'person-outline' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles(colors).tabItem, selectedTab === tab.id && styles(colors).tabItemActive]}
          onPress={() => setSelectedTab(tab.id)}
        >
          <Ionicons 
            name={tab.icon} 
            size={20} 
            color={selectedTab === tab.id ? colors.primary : colors.textMuted} 
          />
          <Text style={[
            styles(colors).tabLabel,
            selectedTab === tab.id && styles(colors).tabLabelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Quick Stats */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Quick Stats</Text>
        <View style={styles(colors).statsGrid}>
          <View style={styles(colors).statCard}>
            <Ionicons name="bag-outline" size={24} color={colors.primary} />
            {statsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <Text style={styles(colors).statValue}>{userStats.ordersThisMonth}</Text>
            )}
            <Text style={styles(colors).statLabel}>This Month</Text>
          </View>
          <View style={styles(colors).statCard}>
            <Ionicons name="flame" size={24} color={colors.rating} />
            {statsLoading ? (
              <ActivityIndicator size="small" color={colors.rating} style={{ marginVertical: 10 }} />
            ) : (
              <Text style={styles(colors).statValue}>{userStats.streakDays}</Text>
            )}
            <Text style={styles(colors).statLabel}>Day Streak</Text>
          </View>
          <View style={styles(colors).statCard}>
            <Ionicons name="trophy" size={24} color={colors.success} />
            {statsLoading ? (
              <ActivityIndicator size="small" color={colors.success} style={{ marginVertical: 10 }} />
            ) : (
              <Text style={styles(colors).statValue}>{userStats.totalOrdersCompleted}</Text>
            )}
            <Text style={styles(colors).statLabel}>Completed</Text>
          </View>
          <TouchableOpacity style={styles(colors).statCard} onPress={handleWalletPress} activeOpacity={0.7}>
            <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            {statsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <Text style={styles(colors).statValue}>₦{(userStats.totalSaved / 1000).toFixed(0)}k</Text>
            )}
            <Text style={styles(colors).statLabel}>Saved</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Subscriptions */}
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Active Subscriptions</Text>
          {userSubscriptions.length > 1 && (
            <TouchableOpacity onPress={() => navigation.navigate('SubscriptionDetails', { subscriptionId: 'all' })}>
              <Text style={styles(colors).seeAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {subscriptionsLoading ? (
          <View style={styles(colors).subscriptionCard}>
            <View style={[styles(colors).subscriptionGradient, { padding: 40 }]}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          </View>
        ) : userSubscriptions.length > 0 ? (
          userSubscriptions.slice(0, 1).map((subscription) => (
            <View key={subscription._id} style={styles(colors).subscriptionCard}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles(colors).subscriptionGradient}
              >
                <View style={styles(colors).subscriptionContent}>
                  <View>
                    <Text style={styles(colors).subscriptionTitle}>
                      {subscription.mealPlan?.planName || 'Meal Plan'}
                    </Text>
                    <Text style={styles(colors).subscriptionSubtitle}>
                      {subscription.frequency} • {subscription.duration}
                    </Text>
                    <Text style={styles(colors).subscriptionNext}>
                      Next delivery: {formatDeliveryDate(subscription.nextDelivery)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles(colors).manageButton}
                    onPress={() => navigation.navigate('SubscriptionDetails', { subscriptionId: subscription._id })}
                  >
                    <Text style={styles(colors).manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        ) : (
          <View style={styles(colors).emptySubscriptionCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={styles(colors).emptySubscriptionTitle}>No Active Subscriptions</Text>
            <Text style={styles(colors).emptySubscriptionText}>Start a meal plan to see it here</Text>
            <TouchableOpacity 
              style={styles(colors).startSubscriptionButton}
              onPress={() => navigation.navigate('MealPlansScreen')}
            >
              <Text style={styles(colors).startSubscriptionButtonText}>Browse Meal Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Achievements */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Achievements</Text>
        {achievementsLoading ? (
          <View style={styles(colors).achievementsLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading achievements...</Text>
          </View>
        ) : achievements.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).achievementsScroll}>
            {achievements.map((achievement) => (
              <TouchableOpacity 
                key={achievement.id} 
                style={[styles(colors).achievementCard, !achievement.earned && styles(colors).achievementCardLocked]}
                onPress={() => handleAchievementPress(achievement)}
                activeOpacity={0.8}
              >
                <View style={[styles(colors).achievementIcon, !achievement.earned && styles(colors).achievementIconLocked]}>
                  <Ionicons 
                    name={achievement.icon} 
                    size={24} 
                    color={achievement.earned ? colors.primary : colors.textMuted} 
                  />
                  {achievement.earned && !achievement.claimed && (
                    <View style={styles(colors).achievementClaimBadge}>
                      <Ionicons name="gift" size={12} color={colors.white} />
                    </View>
                  )}
                  {achievement.earned && achievement.claimed && (
                    <View style={styles(colors).achievementEarnedBadge}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    </View>
                  )}
                </View>
                <Text style={[styles(colors).achievementTitle, !achievement.earned && styles(colors).achievementTitleLocked]}>
                  {achievement.title}
                </Text>
                <Text style={styles(colors).achievementDescription}>
                  {achievement.description}
                </Text>
                {!achievement.earned && achievement.progress !== undefined && (
                  <View style={styles(colors).achievementProgress}>
                    <Text style={styles(colors).achievementProgressText}>
                      {achievement.progress}/{achievement.target}
                    </Text>
                    <View style={styles(colors).achievementProgressBar}>
                      <View 
                        style={[
                          styles(colors).achievementProgressFill, 
                          { width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` }
                        ]} 
                      />
                    </View>
                  </View>
                )}
                {achievement.earned && !achievement.claimed && (
                  <Text style={styles(colors).achievementClaimText}>Tap to claim!</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles(colors).emptyAchievementsContainer}>
            <Ionicons name="trophy-outline" size={40} color={colors.textMuted} />
            <Text style={styles(colors).emptyAchievementsTitle}>No Achievements Yet</Text>
            <Text style={styles(colors).emptyAchievementsText}>Start ordering to earn your first achievement!</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
        <View style={styles(colors).quickActionsGrid}>
          <TouchableOpacity style={styles(colors).quickActionCard} onPress={handleReorder}>
            <Ionicons name="refresh" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Reorder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles(colors).quickActionCard} onPress={handleInviteFriends}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Invite Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles(colors).quickActionCard} onPress={handleSupport}>
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles(colors).quickActionCard} onPress={handleRateApp}>
            <Ionicons name="star" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Rate App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Nutrition Score */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Nutrition Score</Text>
        <TouchableOpacity style={styles(colors).nutritionCard} onPress={handleNutritionScorePress} activeOpacity={0.8}>
          {statsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles(colors).nutritionScoreContainer}>
                <Text style={styles(colors).nutritionScore}>{userStats.nutritionScore}</Text>
                <Text style={styles(colors).nutritionScoreMax}>/100</Text>
              </View>
              <Text style={styles(colors).nutritionLabel}>
                {userStats.nutritionScore >= 80 ? 'Excellent! Keep it up' : 
                 userStats.nutritionScore >= 60 ? 'Great job! Keep it up' :
                 userStats.nutritionScore >= 40 ? 'Good progress!' :
                 'Let\'s improve together!'}
              </Text>
              <View style={styles(colors).nutritionProgress}>
                <View style={[styles(colors).nutritionProgressFill, { width: `${userStats.nutritionScore}%` }]} />
              </View>
              <Text style={styles(colors).tapToViewDetails}>Tap to view details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Recent Activity</Text>
        {activityLoading ? (
          <View style={styles(colors).activityLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading activity...</Text>
          </View>
        ) : recentActivity.length > 0 ? (
          <View style={styles(colors).activityList}>
            {recentActivity.map((activity) => (
              <TouchableOpacity 
                key={activity.id} 
                style={styles(colors).activityItem}
                onPress={() => handleActivityItemPress(activity)}
                activeOpacity={0.7}
              >
                <View style={[styles(colors).activityIcon, { backgroundColor: `${activity.color}20` }]}>
                  <Ionicons name={activity.icon} size={20} color={activity.color} />
                </View>
                <View style={styles(colors).activityContent}>
                  <Text style={styles(colors).activityTitle}>{activity.title}</Text>
                  <Text style={styles(colors).activityDate}>{activity.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles(colors).emptyActivityContainer}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles(colors).emptyActivityTitle}>No Recent Activity</Text>
            <Text style={styles(colors).emptyActivityText}>Your recent orders and activities will appear here</Text>
          </View>
        )}
      </View>

      {/* Dietary Preferences */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Dietary Preferences</Text>
        {user.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
          <View style={styles(colors).preferencesContainer}>
            {user.dietaryPreferences.map((preference, index) => (
              <View key={index} style={styles(colors).preferenceTag}>
                <Text style={styles(colors).preferenceTagText}>{preference}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles(colors).emptyText}>No dietary preferences set</Text>
        )}
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Account Information */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Account Information</Text>
        
        <View style={styles(colors).infoCard}>
          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="mail" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Email</Text>
              <Text style={styles(colors).infoValue}>{user.email}</Text>
            </View>
          </View>
          
          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="call" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Phone</Text>
              <Text style={styles(colors).infoValue}>{user.phone || 'Not provided'}</Text>
            </View>
          </View>
          
          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Address</Text>
              <Text style={styles(colors).infoValue}>{user.address || 'Not provided'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Dietary Preferences */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Dietary Preferences</Text>
        {user.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
          <View style={styles(colors).preferencesContainer}>
            {user.dietaryPreferences.map((preference, index) => (
              <View key={index} style={styles(colors).preferenceTag}>
                <Text style={styles(colors).preferenceTagText}>{preference}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles(colors).emptyText}>No dietary preferences set</Text>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity style={styles(colors).actionButton} onPress={() => setIsEditing(true)}>
          <Ionicons name="pencil" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles(colors).actionButton}
          onPress={() => Share.share({
            message: `Check out choma - the best meal planning app! Get personalized meal plans delivered to your door.`,
            url: 'https://choma.app'
          })}
        >
          <Ionicons name="share" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Share App</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles(colors).actionButton}
          onPress={() => navigation.navigate('HelpCenter')}
        >
          <Ionicons name="help-circle" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity 
          style={styles(colors).avatarContainer} 
          onPress={isEditing ? pickImage : null}
          activeOpacity={isEditing ? 0.7 : 1}
        >
          <UserAvatar 
            user={user} 
            size={60} 
            fontSize={24} 
            imageUri={profileImage}
          />
          {isOffline && (
            <View style={styles(colors).offlineBadge}>
              <Ionicons name="cloud-offline" size={12} color={colors.white} />
            </View>
          )}
          {isEditing && (
            <View style={styles(colors).editImageBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles(colors).headerInfo}>
          <Text style={styles(colors).name}>{user.fullName}</Text>
          <Text style={styles(colors).subtitle}>{user.email}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles(colors).settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {renderTabBar()}

      <ScrollView 
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'activity' && renderActivityTab()}
        {selectedTab === 'profile' && renderProfileTab()}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles(colors).editModalContainer}>
          <View style={styles(colors).editHeader}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Text style={styles(colors).editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles(colors).editTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isLoading}>
              <Text style={[styles(colors).editSaveText, isLoading && styles(colors).editSaveTextDisabled]}>
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles(colors).editScrollView} contentContainerStyle={styles(colors).editScrollContent}>
            {/* Full Name */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Full Name *</Text>
              <TextInput
                style={[styles(colors).editInput, errors.fullName && styles(colors).editInputError]}
                value={editableUser.fullName}
                onChangeText={(text) => setEditableUser(prev => ({...prev, fullName: text}))}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />
              {errors.fullName && <Text style={styles(colors).editErrorText}>{errors.fullName}</Text>}
            </View>

            {/* Phone */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Phone Number</Text>
              <TextInput
                style={[styles(colors).editInput, errors.phone && styles(colors).editInputError]}
                value={editableUser.phone}
                onChangeText={(text) => setEditableUser(prev => ({...prev, phone: text}))}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles(colors).editErrorText}>{errors.phone}</Text>}
            </View>

            {/* Address */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Address</Text>
              <TextInput
                style={[styles(colors).editInput, styles(colors).editTextArea, errors.address && styles(colors).editInputError]}
                value={editableUser.address}
                onChangeText={(text) => setEditableUser(prev => ({...prev, address: text}))}
                placeholder="Enter your delivery address"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
              {errors.address && <Text style={styles(colors).editErrorText}>{errors.address}</Text>}
            </View>

            {/* City */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>City</Text>
              <TextInput
                style={styles(colors).editInput}
                value={editableUser.city}
                onChangeText={(text) => setEditableUser(prev => ({...prev, city: text}))}
                placeholder="Enter your city"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Dietary Preferences */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Dietary Preferences</Text>
              <View style={styles(colors).editPreferencesContainer}>
                {DIETARY_PREFERENCES.map((preference) => (
                  <TouchableOpacity
                    key={preference}
                    style={[
                      styles(colors).editPreferenceTag,
                      (editableUser.dietaryPreferences || []).includes(preference) && styles(colors).editPreferenceTagActive
                    ]}
                    onPress={() => toggleDietaryPreference(preference)}
                  >
                    <Text style={[
                      styles(colors).editPreferenceTagText,
                      (editableUser.dietaryPreferences || []).includes(preference) && styles(colors).editPreferenceTagTextActive
                    ]}>
                      {preference}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Allergies */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Allergies & Restrictions</Text>
              <TextInput
                style={[styles(colors).editInput, styles(colors).editTextArea, errors.allergies && styles(colors).editInputError]}
                value={editableUser.allergies}
                onChangeText={(text) => setEditableUser(prev => ({...prev, allergies: text}))}
                placeholder="List any food allergies or restrictions"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
              {errors.allergies && <Text style={styles(colors).editErrorText}>{errors.allergies}</Text>}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
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
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  offlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.warning,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingsButton: {
    padding: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: THEME.borderRadius.medium,
  },
  tabItemActive: {
    backgroundColor: `${colors.primary}20`,
  },
  tabLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for floating tab bar
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statCard: {
    width: (width - 55) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subscriptionCard: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
  },
  subscriptionGradient: {
    padding: 20,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  subscriptionNext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  manageButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.medium,
  },
  manageButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  achievementsScroll: {
    paddingRight: 20,
    gap: 15,
  },
  achievementCard: {
    width: 120,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementCardLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementIconLocked: {
    backgroundColor: `${colors.textMuted}20`,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  achievementTitleLocked: {
    color: colors.textMuted,
  },
  achievementDescription: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  quickActionCard: {
    width: (width - 55) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
    fontWeight: '500',
  },
  nutritionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutritionScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  nutritionScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nutritionScoreMax: {
    fontSize: 24,
    color: colors.textSecondary,
    marginLeft: 5,
  },
  nutritionLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  nutritionProgress: {
    width: '100%',
    height: 8,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nutritionProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  tapToViewDetails: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
  activityList: {
    gap: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: THEME.borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  preferencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  preferenceTag: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.medium,
  },
  preferenceTagText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: THEME.borderRadius.medium,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginLeft: 15,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  logoutText: {
    color: colors.error,
  },
  emptySubscriptionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptySubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubscriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  startSubscriptionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.medium,
  },
  startSubscriptionButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '600',
  },
  activityLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyActivityContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyActivityText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  achievementsLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  achievementEarnedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.success,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementClaimBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.warning,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementClaimText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },
  achievementProgress: {
    marginTop: 8,
    alignItems: 'center',
  },
  achievementProgressText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  achievementProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: `${colors.textMuted}30`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  emptyAchievementsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyAchievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyAchievementsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  notificationsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  // Edit Profile Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  editCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  editSaveText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  editSaveTextDisabled: {
    color: colors.textMuted,
  },
  editScrollView: {
    flex: 1,
  },
  editScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  editFieldContainer: {
    marginBottom: 20,
  },
    editFieldLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
  });

  export default ProfileScreen;