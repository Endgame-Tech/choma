// src/screens/meal-plans/CustomMealPlanDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomIcon from '../../components/ui/CustomIcon';
import apiService from '../../services/api';
import { useTheme } from '../../styles/theme';
import { useAuth } from '../../hooks/useAuth';
import StandardHeader from '../../components/layout/Header';
import { THEME } from '../../utils/colors';

const { width } = Dimensions.get('window');

const CustomMealPlanDetailScreen = ({ route, navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { planId } = route.params;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch plan details
  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const result = await apiService.getCustomMealPlanById(planId);

      if (result.success) {
        setPlan(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load plan details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    Alert.alert(
      'Purchase Plan',
      `Total Cost: ₦${plan.totalCost?.toLocaleString()}\n\nProceed to checkout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              setPurchasing(true);
              // Navigate to payment screen with plan details
              navigation.navigate('CheckoutScreen', {
                planType: 'custom',
                planId: plan._id,
                planData: plan,
              });
            } catch (error) {
              console.error('Error initiating purchase:', error);
              Alert.alert('Error', 'Failed to initiate purchase');
            } finally {
              setPurchasing(false);
            }
          }
        }
      ]
    );
  };

  // Handle regenerate
  const handleRegenerate = async () => {
    Alert.alert(
      'Regenerate Plan',
      'This will create a new plan with different meal combinations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await apiService.regenerateCustomMealPlan(planId);

              if (result.success) {
                setPlan(result.data);
                Alert.alert('Success', 'Plan regenerated with new meals!');
              } else {
                Alert.alert('Error', result.error || 'Failed to regenerate plan');
              }
            } catch (error) {
              console.error('Error regenerating plan:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Render day tab
  const renderDayTab = ({ item, index }) => {
    const isSelected = selectedDay === index;
    const dayMeals = plan?.mealSchedule[index];

    return (
      <TouchableOpacity
        style={[
          styles.dayTab,
          isSelected && styles.dayTabActive,
          { borderColor: colors.border }
        ]}
        onPress={() => setSelectedDay(index)}
      >
        <Text style={[
          styles.dayTabLabel,
          { color: isSelected ? '#fff' : colors.textSecondary }
        ]}>
          Day {index + 1}
        </Text>
        <Text style={[
          styles.dayTabDate,
          { color: isSelected ? '#fff' : colors.textSecondary }
        ]}>
          {dayMeals?.date ? new Date(dayMeals.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }) : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render meal card
  const renderMealCard = (meal, index) => (
    <View key={index} style={[styles.mealCard, { backgroundColor: colors.card }]}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleContainer}>
          <CustomIcon
            name={getMealIcon(meal.mealType)}
            size={20}
            color={THEME.PRIMARY}
          />
          <Text style={[styles.mealType, { color: colors.text }]}>
            {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
          </Text>
        </View>
        <Text style={[styles.mealTime, { color: colors.textSecondary }]}>
          {meal.recommendedTime}
        </Text>
      </View>

      <Text style={[styles.mealName, { color: colors.text }]}>
        {meal.customMeal?.name || 'Custom Meal'}
      </Text>

      {/* Nutrition Info */}
      <View style={styles.nutritionContainer}>
        <View style={styles.nutritionItem}>
          <Text style={[styles.nutritionValue, { color: colors.text }]}>
            {meal.nutrition?.calories || 0}
          </Text>
          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
            cal
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={[styles.nutritionValue, { color: colors.text }]}>
            {meal.nutrition?.protein || 0}g
          </Text>
          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
            protein
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={[styles.nutritionValue, { color: colors.text }]}>
            {meal.nutrition?.carbs || 0}g
          </Text>
          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
            carbs
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={[styles.nutritionValue, { color: colors.text }]}>
            {meal.nutrition?.fat || 0}g
          </Text>
          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
            fat
          </Text>
        </View>
      </View>

      {/* Dietary Tags */}
      {meal.customMeal?.dietaryTags && meal.customMeal.dietaryTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {meal.customMeal.dietaryTags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: THEME.PRIMARY + '20' }]}>
              <Text style={[styles.tagText, { color: THEME.PRIMARY }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Get icon for meal type
  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: 'coffee',
      lunch: 'utensils',
      dinner: 'moon',
      snack: 'cookie'
    };
    return icons[mealType] || 'utensils';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StandardHeader
          title="Custom Meal Plan"
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your plan...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return null;
  }

  const currentDayMeals = plan.mealSchedule?.[selectedDay]?.meals || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <StandardHeader
        title="Custom Meal Plan"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Plan Header */}
        <View style={[styles.headerSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.planTitle, { color: colors.text }]}>
            {plan.duration}-Day Custom Plan
          </Text>
          <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
            {plan.totalMeals} meals • {plan.preferences?.mealsPerDay || 3} meals/day
          </Text>

          {/* Health Goals */}
          {plan.preferences?.healthGoals && plan.preferences.healthGoals.length > 0 && (
            <View style={styles.goalsContainer}>
              {plan.preferences.healthGoals.map((goal, index) => (
                <View key={index} style={[styles.goalBadge, { backgroundColor: THEME.PRIMARY + '20' }]}>
                  <Text style={[styles.goalText, { color: THEME.PRIMARY }]}>
                    {goal.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <CustomIcon name="fire" size={24} color={THEME.PRIMARY} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {plan.avgCaloriesPerDay}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg Cal/Day
              </Text>
            </View>
            <View style={styles.statBox}>
              <CustomIcon name="dumbbell" size={24} color={THEME.PRIMARY} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {plan.avgProteinPerDay}g
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg Protein
              </Text>
            </View>
            <View style={styles.statBox}>
              <CustomIcon name="wallet" size={24} color={THEME.PRIMARY} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                ₦{plan.totalCost?.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Cost
              </Text>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelector}>
          <FlatList
            data={Array.from({ length: plan.duration }, (_, i) => i)}
            renderItem={renderDayTab}
            keyExtractor={(item) => item.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContainer}
          />
        </View>

        {/* Day Details */}
        <View style={styles.dayDetails}>
          <Text style={[styles.dayTitle, { color: colors.text }]}>
            Day {selectedDay + 1} Meals
          </Text>
          {currentDayMeals.map((meal, index) => renderMealCard(meal, index))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {plan.status === 'draft' && (
            <>
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchase}
                disabled={purchasing}
              >
                <LinearGradient
                  colors={[THEME.PRIMARY, THEME.SECONDARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.purchaseButtonGradient}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CustomIcon name="shopping-cart" size={20} color="#fff" />
                      <Text style={styles.purchaseButtonText}>
                        Purchase Plan - ₦{plan.totalCost?.toLocaleString()}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleRegenerate}
              >
                <CustomIcon name="refresh" size={20} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Regenerate with Different Meals
                </Text>
              </TouchableOpacity>
            </>
          )}

          {plan.status === 'purchased' && (
            <View style={[styles.purchasedBanner, { backgroundColor: THEME.SUCCESS + '20' }]}>
              <CustomIcon name="check-circle" size={24} color={THEME.SUCCESS} />
              <Text style={[styles.purchasedText, { color: THEME.SUCCESS }]}>
                Plan Purchased - Preparing Your Meals!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerSection: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  goalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  daySelector: {
    marginVertical: 16,
  },
  dayTabsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dayTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  dayTabActive: {
    backgroundColor: THEME.PRIMARY,
    borderColor: THEME.PRIMARY,
  },
  dayTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayTabDate: {
    fontSize: 11,
  },
  dayDetails: {
    paddingHorizontal: 16,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  mealCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTime: {
    fontSize: 12,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  purchasedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  purchasedText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomMealPlanDetailScreen;
