// src/screens/meal-plans/CustomMealPlanScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
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

const CustomMealPlanScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();

  // Form state
  const [step, setStep] = useState(1); // 1: Preferences, 2: Review, 3: Generated Plan
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  // Preference state
  const [preferences, setPreferences] = useState({
    duration: 7, // days
    healthGoals: [],
    dietaryPreferences: [],
    allergens: [],
    caloriesPerDay: 2000,
    mealsPerDay: 3,
    budget: 'medium',
  });

  // Health goals options
  const healthGoalsOptions = [
    { id: 'weight_loss', label: 'Weight Loss', icon: 'scale' },
    { id: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness' },
    { id: 'maintenance', label: 'Maintenance', icon: 'heart' },
    { id: 'diabetes_management', label: 'Diabetes Management', icon: 'medical' },
    { id: 'heart_health', label: 'Heart Health', icon: 'heartbeat' },
  ];

  // Dietary preferences options
  const dietaryOptions = [
    { id: 'vegan', label: 'Vegan', icon: 'leaf' },
    { id: 'vegetarian', label: 'Vegetarian', icon: 'seedling' },
    { id: 'pescatarian', label: 'Pescatarian', icon: 'fish' },
    { id: 'halal', label: 'Halal', icon: 'check-circle' },
    { id: 'kosher', label: 'Kosher', icon: 'check-circle' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: 'ban' },
    { id: 'dairy-free', label: 'Dairy-Free', icon: 'ban' },
    { id: 'nut-free', label: 'Nut-Free', icon: 'ban' },
    { id: 'low-carb', label: 'Low-Carb', icon: 'chart-line-down' },
    { id: 'keto', label: 'Keto', icon: 'fire' },
    { id: 'paleo', label: 'Paleo', icon: 'drumstick-bite' },
  ];

  // Common allergens
  const allergenOptions = [
    'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Fish', 'Shellfish',
    'Soy', 'Wheat', 'Gluten', 'Sesame'
  ];

  // Budget options
  const budgetOptions = [
    { id: 'low', label: 'Budget-Friendly', description: '₦3,000 - ₦5,000/day' },
    { id: 'medium', label: 'Standard', description: '₦5,000 - ₦8,000/day' },
    { id: 'high', label: 'Premium', description: '₦8,000+/day' },
  ];

  // Toggle selection
  const toggleSelection = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  // Handle generate plan
  const handleGeneratePlan = async () => {
    // Validation
    if (preferences.healthGoals.length === 0) {
      Alert.alert('Required', 'Please select at least one health goal');
      return;
    }

    try {
      setLoading(true);
      console.log('🎨 Generating custom meal plan with preferences:', preferences);

      const result = await apiService.generateCustomMealPlan(preferences);

      if (result.success) {
        setGeneratedPlan(result.data);
        setStep(3);
        Alert.alert('Success', 'Your custom meal plan has been generated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Render step 1: Preferences selection
  const renderPreferencesStep = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Duration Selection */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Plan Duration
        </Text>
        <View style={styles.durationContainer}>
          {[7, 14, 21, 30].map(days => (
            <TouchableOpacity
              key={days}
              style={[
                styles.durationButton,
                preferences.duration === days && styles.durationButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setPreferences(prev => ({ ...prev, duration: days }))}
            >
              <Text style={[
                styles.durationButtonText,
                preferences.duration === days && styles.durationButtonTextActive,
                { color: preferences.duration === days ? '#fff' : colors.text }
              ]}>
                {days} Days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Health Goals */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Health Goals *
        </Text>
        <View style={styles.optionsGrid}>
          {healthGoalsOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                preferences.healthGoals.includes(option.id) && styles.optionCardActive,
                { borderColor: colors.border }
              ]}
              onPress={() => toggleSelection('healthGoals', option.id)}
            >
              <CustomIcon
                name={option.icon}
                size={24}
                color={preferences.healthGoals.includes(option.id) ? '#fff' : colors.text}
              />
              <Text style={[
                styles.optionText,
                { color: preferences.healthGoals.includes(option.id) ? '#fff' : colors.text }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dietary Preferences */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Dietary Preferences
        </Text>
        <View style={styles.optionsGrid}>
          {dietaryOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                preferences.dietaryPreferences.includes(option.id) && styles.optionCardActive,
                { borderColor: colors.border }
              ]}
              onPress={() => toggleSelection('dietaryPreferences', option.id)}
            >
              <CustomIcon
                name={option.icon}
                size={20}
                color={preferences.dietaryPreferences.includes(option.id) ? '#fff' : colors.text}
              />
              <Text style={[
                styles.optionText,
                { color: preferences.dietaryPreferences.includes(option.id) ? '#fff' : colors.text }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Allergens */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Allergens to Avoid
        </Text>
        <View style={styles.allergensList}>
          {allergenOptions.map(allergen => (
            <TouchableOpacity
              key={allergen}
              style={[
                styles.allergenChip,
                preferences.allergens.includes(allergen) && styles.allergenChipActive,
                { borderColor: colors.border }
              ]}
              onPress={() => toggleSelection('allergens', allergen)}
            >
              <Text style={[
                styles.allergenText,
                { color: preferences.allergens.includes(allergen) ? '#fff' : colors.text }
              ]}>
                {allergen}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Calories Per Day */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Target Calories Per Day
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={String(preferences.caloriesPerDay)}
          onChangeText={(text) => {
            const value = parseInt(text) || 0;
            setPreferences(prev => ({ ...prev, caloriesPerDay: value }));
          }}
          keyboardType="numeric"
          placeholder="e.g., 2000"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Meals Per Day */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Meals Per Day
        </Text>
        <View style={styles.durationContainer}>
          {[2, 3, 4, 5].map(meals => (
            <TouchableOpacity
              key={meals}
              style={[
                styles.durationButton,
                preferences.mealsPerDay === meals && styles.durationButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setPreferences(prev => ({ ...prev, mealsPerDay: meals }))}
            >
              <Text style={[
                styles.durationButtonText,
                preferences.mealsPerDay === meals && styles.durationButtonTextActive,
                { color: preferences.mealsPerDay === meals ? '#fff' : colors.text }
              ]}>
                {meals} Meals
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Budget */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Budget Range
        </Text>
        {budgetOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.budgetOption,
              preferences.budget === option.id && styles.budgetOptionActive,
              { borderColor: colors.border }
            ]}
            onPress={() => setPreferences(prev => ({ ...prev, budget: option.id }))}
          >
            <View style={styles.budgetContent}>
              <Text style={[
                styles.budgetLabel,
                { color: preferences.budget === option.id ? '#fff' : colors.text }
              ]}>
                {option.label}
              </Text>
              <Text style={[
                styles.budgetDescription,
                { color: preferences.budget === option.id ? '#fff' : colors.textSecondary }
              ]}>
                {option.description}
              </Text>
            </View>
            {preferences.budget === option.id && (
              <CustomIcon name="check-circle" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGeneratePlan}
        disabled={loading}
      >
        <LinearGradient
          colors={[THEME.PRIMARY, THEME.SECONDARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.generateButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CustomIcon name="magic" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate My Plan</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // Render step 3: Generated plan
  const renderGeneratedPlan = () => {
    if (!generatedPlan) return null;

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.planTitle, { color: colors.text }]}>
            Your Custom Meal Plan
          </Text>
          <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
            {generatedPlan.duration} Days • {generatedPlan.totalMeals} Meals
          </Text>

          {/* Plan Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                ₦{generatedPlan.totalCost?.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Cost
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {generatedPlan.avgCaloriesPerDay}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg Calories/Day
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {generatedPlan.avgProteinPerDay}g
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg Protein/Day
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CustomMealPlanDetail', { planId: generatedPlan._id })}
          >
            <LinearGradient
              colors={[THEME.PRIMARY, THEME.SECONDARY]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <CustomIcon name="eye" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>View Full Plan</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => {
              setStep(1);
              setGeneratedPlan(null);
            }}
          >
            <CustomIcon name="refresh" size={20} color={colors.text} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Generate Another Plan
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <StandardHeader
        title="Create Custom Plan"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Progress Indicator */}
      {step < 3 && (
        <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Step {step} of 2
          </Text>
        </View>
      )}

      {step === 1 && renderPreferencesStep()}
      {step === 3 && renderGeneratedPlan()}
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
  progressContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.PRIMARY,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: THEME.PRIMARY,
    borderColor: THEME.PRIMARY,
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: (width - 84) / 2,
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  optionCardActive: {
    backgroundColor: THEME.PRIMARY,
    borderColor: THEME.PRIMARY,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  allergensList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  allergenChipActive: {
    backgroundColor: THEME.PRIMARY,
    borderColor: THEME.PRIMARY,
  },
  allergenText: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  budgetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
  },
  budgetOptionActive: {
    backgroundColor: THEME.PRIMARY,
    borderColor: THEME.PRIMARY,
  },
  budgetContent: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetDescription: {
    fontSize: 12,
  },
  generateButton: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  planSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
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
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomMealPlanScreen;
