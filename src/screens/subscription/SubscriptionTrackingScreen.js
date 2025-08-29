import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";

const { width } = Dimensions.get("window");

const SubscriptionTrackingScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { subscription: initialSubscription } = route.params || {};
  
  const [subscription, setSubscription] = useState(initialSubscription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFullSubscriptionData();
  }, []);

  const loadFullSubscriptionData = async () => {
    if (!subscription?.mealPlanId?._id) return;
    
    try {
      setLoading(true);
      const mealPlanResult = await apiService.getMealPlanById(subscription.mealPlanId._id);
      
      if (mealPlanResult.success && mealPlanResult.data) {
        setSubscription(prev => ({
          ...prev,
          mealPlanId: mealPlanResult.data
        }));
      }
    } catch (error) {
      console.error('Error loading meal plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTodaysMeals = () => {
    if (!subscription?.mealPlanId?.weeklyMeals) return null;

    // Calculate current day
    const today = new Date();
    const startDate = new Date(subscription.startDate);
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const subscriptionDay = Math.max(1, daysDiff + 1);
    const weekNumber = Math.ceil(subscriptionDay / 7);
    const currentWeekNumber = Math.max(1, Math.min(weekNumber, 4));
    const dayInWeek = ((subscriptionDay - 1) % 7) + 1;
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayName = dayNames[dayInWeek - 1];

    const weeklyMeals = subscription.mealPlanId.weeklyMeals || {};
    const currentWeek = weeklyMeals[`week${currentWeekNumber}`] || {};
    const todaysMealsData = currentWeek[dayName] || {};

    // Helper to get meal data
    const getMealData = (mealType) => {
      const lowercaseMealType = mealType.toLowerCase();
      const mealData = todaysMealsData[lowercaseMealType];
      
      if (mealData && mealData.title) {
        return {
          name: mealData.title,
          description: mealData.description,
          image: mealData.imageUrl ? { uri: mealData.imageUrl } : 
                 subscription.mealPlanId.planImageUrl ? { uri: subscription.mealPlanId.planImageUrl } :
                 require("../../assets/images/meal-plans/fitfuel.jpg"),
          time: mealType === 'breakfast' ? '8:00 AM' : 
                mealType === 'lunch' ? '1:00 PM' : '7:00 PM'
        };
      }
      return null;
    };

    const breakfast = getMealData('breakfast');
    const lunch = getMealData('lunch');
    const dinner = getMealData('dinner');

    const availableMeals = [
      ...(breakfast ? [{ type: 'Breakfast', data: breakfast }] : []),
      ...(lunch ? [{ type: 'Lunch', data: lunch }] : []),
      ...(dinner ? [{ type: 'Dinner', data: dinner }] : [])
    ];

    if (availableMeals.length === 0) {
      return (
        <View style={styles(colors).noMealsContainer}>
          <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
          <Text style={styles(colors).noMealsText}>No meals scheduled for today</Text>
        </View>
      );
    }

    return (
      <View style={styles(colors).mealsSection}>
        <Text style={styles(colors).sectionTitle}>
          Today's Meals - Day {subscriptionDay}
        </Text>
        
        {availableMeals.length === 1 ? (
          // Single meal - full width
          <TouchableOpacity style={styles(colors).fullWidthMealCard}>
            <View style={styles(colors).mealImageContainer}>
              <Image source={availableMeals[0].data.image} style={styles(colors).mealImage} />
              <LinearGradient
                colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                style={styles(colors).mealOverlay}
              >
                <Text style={styles(colors).mealType}>{availableMeals[0].type}</Text>
                <Text style={styles(colors).mealName}>{availableMeals[0].data.name}</Text>
                <Text style={styles(colors).mealTime}>{availableMeals[0].data.time}</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ) : (
          // Multiple meals - scroll
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableMeals.map((meal, index) => (
              <TouchableOpacity key={meal.type} style={styles(colors).mealCard}>
                <View style={styles(colors).mealImageContainer}>
                  <Image source={meal.data.image} style={styles(colors).mealImage} />
                  <LinearGradient
                    colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                    style={styles(colors).mealOverlay}
                  >
                    <Text style={styles(colors).mealType}>{meal.type}</Text>
                    <Text style={styles(colors).mealName}>{meal.data.name}</Text>
                    <Text style={styles(colors).mealTime}>{meal.data.time}</Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderProgress = () => {
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    const currentDate = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const progressPercentage = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

    return (
      <View style={styles(colors).progressSection}>
        <Text style={styles(colors).sectionTitle}>Your Progress</Text>
        
        <View style={styles(colors).progressCard}>
          <View style={styles(colors).progressHeader}>
            <Text style={styles(colors).progressTitle}>
              {subscription.mealPlanId?.planName || subscription.mealPlanId?.name}
            </Text>
            <Text style={styles(colors).progressDays}>
              {daysRemaining} days remaining
            </Text>
          </View>
          
          <View style={styles(colors).progressBarContainer}>
            <View style={styles(colors).progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={[styles(colors).progressFill, { width: `${progressPercentage}%` }]}
              />
            </View>
            <Text style={styles(colors).progressPercent}>{Math.round(progressPercentage)}%</Text>
          </View>
        </View>

        <View style={styles(colors).statsGrid}>
          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>
              {subscription.metrics?.totalMealsDelivered || 0}
            </Text>
            <Text style={styles(colors).statLabel}>Meals Delivered</Text>
          </View>
          
          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>
              ₦{(subscription.totalPrice || subscription.price || 0).toLocaleString()}
            </Text>
            <Text style={styles(colors).statLabel}>Plan Value</Text>
          </View>
          
          <View style={styles(colors).statCard}>
            <Text style={styles(colors).statNumber}>
              {subscription.metrics?.consecutiveDays || 0}
            </Text>
            <Text style={styles(colors).statLabel}>Streak Days</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <Text style={styles(colors).headerTitle}>
          {subscription?.mealPlanId?.planName || subscription?.mealPlanId?.name || "Subscription"}
        </Text>
        
        <TouchableOpacity style={styles(colors).menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
        {/* Today's Meals */}
        {renderTodaysMeals()}

        {/* Progress */}
        {renderProgress()}

        {/* Quick Actions */}
        <View style={styles(colors).actionsSection}>
          <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
          <View style={styles(colors).actionButtons}>
            <TouchableOpacity style={styles(colors).actionButton}>
              <Ionicons name="pause-circle-outline" size={24} color={colors.warning} />
              <Text style={styles(colors).actionButtonText}>Pause Plan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles(colors).actionButton}>
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <Text style={styles(colors).actionButtonText}>Customize</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles(colors).actionButton}>
              <Ionicons name="headset-outline" size={24} color={colors.secondary} />
              <Text style={styles(colors).actionButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
    flex: 1,
    textAlign: "center",
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Meals Section
  mealsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 15,
  },
  fullWidthMealCard: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  mealCard: {
    width: 160,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 15,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealImageContainer: {
    flex: 1,
    position: "relative",
  },
  mealImage: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background,
  },
  mealOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  mealType: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
    opacity: 0.9,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    marginVertical: 4,
  },
  mealTime: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  // Progress Section
  progressSection: {
    padding: 20,
  },
  progressCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  progressDays: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  // Actions Section
  actionsSection: {
    padding: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    textAlign: "center",
  },
  // No Meals State
  noMealsContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noMealsText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
  },
});

export default SubscriptionTrackingScreen;