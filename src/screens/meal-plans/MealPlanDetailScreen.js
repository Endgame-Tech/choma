// src/screens/meal-plans/MealPlanDetailScreen.js - Modern Dark Theme Update
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../services/api';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import MealPlanDetailSkeleton from '../../components/meal-plans/MealPlanDetailSkeleton';
import StandardHeader from '../../components/layout/Header';

const { width, height } = Dimensions.get('window');

const MealPlanDetailScreen = ({ route, navigation }) => {
  const { isDark, colors } = useTheme();
  const { bundle } = route.params;
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [mealPlanDetails, setMealPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState('');
  
  // Animation states for smooth expand/collapse
  const animationValues = useRef({}).current;

  // Open image gallery
  const openImageGallery = (imageUri, mealName) => {
    setSelectedImage(imageUri);
    setSelectedImageName(mealName || 'Meal Image');
    setImageModalVisible(true);
  };

  // Fetch detailed meal plan data from backend
  useEffect(() => {
    const fetchMealPlanDetails = async () => {
      try {
        setLoading(true);
        const result = await apiService.getMealPlanDetails(bundle.planId || bundle.id);
        
        if (result.success && result.mealPlan) {
          console.log('✅ Meal plan details received:', JSON.stringify(result.mealPlan, null, 2));
          console.log('📋 Weekly meals data:', JSON.stringify(result.mealPlan.weeklyMeals, null, 2));
          console.log('🖼️ Meal images data:', JSON.stringify(result.mealPlan.mealImages, null, 2));
          setMealPlanDetails(result.mealPlan);
        } else {
          console.error('Failed to fetch meal plan details:', result.message);
          // Fallback to the bundle data if API call fails
          setMealPlanDetails(bundle);
        }
      } catch (error) {
        console.error('Error fetching meal plan details:', error);
        // Fallback to the bundle data on exception
        setMealPlanDetails(bundle);
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlanDetails();
  }, [bundle]);

  // Transform backend weekly meals data to display format
  const getWeeklyMealPlan = () => {
    if (!mealPlanDetails || !mealPlanDetails.weeklyMeals) {
      return getFallbackMealPlan();
    }

    const weeklyMealPlan = {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Initialize weeks
    [1, 2, 3, 4].forEach(week => {
      weeklyMealPlan[week] = [];
    });

    Object.keys(mealPlanDetails.weeklyMeals).forEach(weekKey => {
      const weekNumber = parseInt(weekKey.replace('week', ''));
      const weekData = mealPlanDetails.weeklyMeals[weekKey];
      
      if (weekNumber >= 1 && weekNumber <= 4) {
        daysOfWeek.forEach((fullDay, index) => {
          // Backend stores with full day names ('Monday', 'Tuesday', etc.)
          // Try both full day name and short day name for compatibility
          const dayData = weekData[fullDay] || weekData[fullDay.substring(0, 3).toLowerCase()] || {};
          
          weeklyMealPlan[weekNumber].push({
            day: fullDay,
            breakfast: dayData.breakfast?.title || 'Breakfast not specified',
            lunch: dayData.lunch?.title || 'Lunch not specified',
            dinner: dayData.dinner?.title || 'Dinner not specified',
            remark: dayData.remark || dayData.dailyComment || 'No remarks',
            breakfastImage: dayData.breakfast?.imageUrl,
            lunchImage: dayData.lunch?.imageUrl,
            dinnerImage: dayData.dinner?.imageUrl,
            breakfastDescription: dayData.breakfast?.description || '',
            lunchDescription: dayData.lunch?.description || '',
            dinnerDescription: dayData.dinner?.description || ''
          });
        });
      }
    });

    return weeklyMealPlan;
  };

  // Helper function to get meal image
  const getMealImage = (weekKey, day, mealType) => {
    if (!mealPlanDetails || !mealPlanDetails.mealImages) {
      console.log('❌ No meal images data available or mealPlanDetails is null/undefined');
      return null;
    }
    
    const mealImages = mealPlanDetails.mealImages || {}; // Ensure mealImages is an object

    // Try different formats for meal image keys
    const possibleKeys = [
      `${weekKey}_${day}_${mealType}`,
      `${weekKey}_${day.substring(0, 3).toLowerCase()}_${mealType}`,
      `${weekKey}_${day}_${mealType.toLowerCase()}`,
      `${weekKey}_${day.substring(0, 3).toLowerCase()}_${mealType.toLowerCase()}`
    ];
    
    console.log(`🔍 Looking for meal image: ${weekKey}, ${day}, ${mealType}`);
    console.log('🔑 Trying keys:', possibleKeys);
    console.log('📦 Available keys:', Object.keys(mealImages));
    
    for (const key of possibleKeys) {
      if (mealImages[key]) {
        console.log(`✅ Found image for key: ${key} -> ${mealImages[key]}`);
        return mealImages[key];
      }
    }
    
    console.log('❌ No image found for:', weekKey, day, mealType);
    return null;
  };

  // Fallback meal plan data (same as before but abbreviated for space)
  const getFallbackMealPlan = () => {
    return {
      1: [
        {
          day: 'Monday',
          breakfast: 'Oatmeal + milk + banana',
          lunch: 'Grilled chicken + brown rice + vegetables',
          dinner: 'Fish stew + plantain',
          remark: 'High protein day'
        },
        // ... other days abbreviated for space
      ],
      // ... other weeks
    };
  };

  const features = mealPlanDetails?.features || bundle?.features || [
    { title: 'Fresh Ingredients', description: 'Daily fresh sourcing', icon: 'leaf-outline' },
    { title: 'Balanced Nutrition', description: 'Expert-designed meals', icon: 'fitness-outline' },
    { title: 'Local Flavors', description: 'Nigerian cuisine focus', icon: 'location-outline' },
    { title: 'Flexible Options', description: 'Customize to preferences', icon: 'options-outline' }
  ];

  const normalizedFeatures = features.map((feature, index) => {
    if (typeof feature === 'string') {
      return {
        title: feature,
        description: 'Feature included',
        icon: 'checkmark-circle-outline'
      };
    }
    return {
      title: feature.title || `Feature ${index + 1}`,
      description: feature.description || 'Feature included',
      icon: feature.icon || 'checkmark-circle-outline'
    };
  });

  const renderMealRow = (icon, label, description, image) => (
    <View style={styles(colors).mealItem}>
      <View style={styles(colors).mealHeader}>
        <Text style={styles(colors).mealLabel}>{icon} {label}</Text>
        {image && (
          <TouchableOpacity onPress={() => openImageGallery(image, `${label} Image`)}>
            <Image source={{ uri: image }} style={styles(colors).mealThumbnail} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles(colors).mealText}>{description}</Text>
    </View>
  );

  // Enhanced meal card for horizontal slider (similar to popular meal plans)
  const renderMealSliderCard = (meal) => {
    const defaultImage = require('../../assets/images/meal-plans/fitfuel.jpg');
    const imageSource = meal.image 
      ? (typeof meal.image === 'string' ? { uri: meal.image } : meal.image)
      : defaultImage;

    return (
      <TouchableOpacity 
        style={styles(colors).mealSliderCard}
        onPress={() => openImageGallery(meal.image, meal.label)}
        activeOpacity={0.8}
      >
        <View style={styles(colors).mealSliderImageContainer}>
          <Image 
            source={imageSource} 
            style={styles(colors).mealSliderImage}
            defaultSource={defaultImage}
          />
        </View>
        
        {/* Content Overlay with Gradient */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.85)']}
          style={styles(colors).mealSliderContent}
        >
          <View style={styles(colors).mealSliderInfo}>
            <Text style={styles(colors).mealSliderIcon}>{meal.icon}</Text>
            <Text style={styles(colors).mealSliderLabel}>{meal.label}</Text>
            <Text style={styles(colors).mealSliderDescription} numberOfLines={2}>
              {meal.description}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Toggle day expansion with smooth animation
  const toggleDayExpansion = (day) => {
    const isExpanding = expandedDay !== day;
    
    if (!animationValues[day]) {
      animationValues[day] = new Animated.Value(0);
    }
    
    setExpandedDay(isExpanding ? day : null);
    
    Animated.spring(animationValues[day], {
      toValue: isExpanding ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const renderDayCard = (dayData) => {
    if (dayData.breakfast === 'Breakfast not specified' && dayData.lunch === 'Lunch not specified' && dayData.dinner === 'Dinner not specified') {
      return null;
    }
    const animationValue = animationValues[dayData.day] || new Animated.Value(0);
    
    // Prepare meal data for horizontal slider
    const meals = [
      {
        icon: '🌅',
        label: 'Breakfast',
        description: dayData.breakfastDescription || dayData.breakfast,
        image: dayData.breakfastImage
      },
      {
        icon: '☀️',
        label: 'Lunch', 
        description: dayData.lunchDescription || dayData.lunch,
        image: dayData.lunchImage
      },
      {
        icon: '🌙',
        label: 'Dinner',
        description: dayData.dinnerDescription || dayData.dinner,
        image: dayData.dinnerImage
      }
    ];

    return (
      <View
        key={dayData.day}
        style={[
          styles(colors).dayCard,
          expandedDay === dayData.day && styles(colors).dayCardExpanded
        ]}
      >
        <TouchableOpacity 
          style={styles(colors).dayHeader}
          onPress={() => toggleDayExpansion(dayData.day)}
          activeOpacity={0.7}
        >
          <Text style={styles(colors).dayName}>{dayData.day}</Text>
          <Animated.View
            style={{
              transform: [{
                rotate: animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                })
              }]
            }}
          >
            <Ionicons 
              name="chevron-down"
              size={20} 
              color={colors.textSecondary} 
            />
          </Animated.View>
        </TouchableOpacity>
        
        {/* Animated expandable content - restructured for better touch handling */}
        <Animated.View
          style={[
            styles(colors).dayExpandableContent,
            {
              opacity: animationValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0, 1],
              }),
              maxHeight: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 300], // Dynamic height instead of scaleY
              }),
            }
          ]}
          pointerEvents={expandedDay === dayData.day ? 'auto' : 'none'}
        >
          {expandedDay === dayData.day && (
            <View style={styles(colors).dayContent}>
              {/* Horizontal Meal Slider */}
              <View style={styles(colors).mealSliderWrapper}>
                <FlatList
                  horizontal
                  data={meals}
                  keyExtractor={(item) => item.label}
                  renderItem={({ item }) => (
                    <View style={styles(colors).mealCardWrapper}>
                      {renderMealSliderCard(item)}
                    </View>
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles(colors).mealSliderContainer}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  bounces={true}
                  pagingEnabled={false}
                  removeClippedSubviews={false}
                  initialNumToRender={3}
                  maxToRenderPerBatch={3}
                  windowSize={30}
                  nestedScrollEnabled={true}
                  getItemLayout={(data, index) => ({
                    length: 195, // 180 width + 15 margin
                    offset: 195 * index,
                    index,
                  })}
                />
              </View>
              
              {/* Note section remains below slider */}
              {dayData.remark && dayData.remark !== 'No remarks' && (
                <View style={styles(colors).remarkContainer}>
                  <Text style={styles(colors).remarkLabel}>💡 Note:</Text>
                  <Text style={styles(colors).remarkText}>{dayData.remark}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      
        {/* Collapsed preview (keeps the original compact view when closed) */}
        {expandedDay !== dayData.day && (
          <View style={styles(colors).mealPreviewContainer}>
            {dayData.breakfast !== 'Breakfast not specified' && (
              <View style={styles(colors).mealPreview}>
                <Text style={styles(colors).mealIcon}>🌅</Text>
                <Text style={styles(colors).mealPreviewText} numberOfLines={1}>
                  {dayData.breakfast}
                </Text>
                {dayData.breakfastImage && (
                  <Image source={{ uri: dayData.breakfastImage }} style={styles(colors).mealPreviewImage} />
                )}
              </View>
            )}
            {dayData.lunch !== 'Lunch not specified' && (
              <View style={styles(colors).mealPreview}>
                <Text style={styles(colors).mealIcon}>☀️</Text>
                <Text style={styles(colors).mealPreviewText} numberOfLines={1}>
                  {dayData.lunch}
                </Text>
                {dayData.lunchImage && (
                  <Image source={{ uri: dayData.lunchImage }} style={styles(colors).mealPreviewImage} />
                )}
              </View>
            )}
            {dayData.dinner !== 'Dinner not specified' && (
              <View style={styles(colors).mealPreview}>
                <Text style={styles(colors).mealIcon}>🌙</Text>
                <Text style={styles(colors).mealPreviewText} numberOfLines={1}>
                  {dayData.dinner}
                </Text>
                {dayData.dinnerImage && (
                  <Image source={{ uri: dayData.dinnerImage }} style={styles(colors).mealPreviewImage} />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderWeekTabs = () => {
    const availableWeeks = Object.keys(weeklyMealPlan)
      .map(weekNum => parseInt(weekNum))
      .filter(weekNum => weeklyMealPlan[weekNum] && weeklyMealPlan[weekNum].some(day => day.breakfast !== 'Breakfast not specified' || day.lunch !== 'Lunch not specified' || day.dinner !== 'Dinner not specified'));

    if (availableWeeks.length === 0) {
      return null; // Don't render tabs if no weeks have meals
    }

    return (
      <View style={styles(colors).weekTabs}>
        {availableWeeks.map((week) => (
          <TouchableOpacity
            key={week}
            style={[
              styles(colors).weekTab,
              selectedWeek === week && styles(colors).weekTabActive
            ]}
            onPress={() => {
              setSelectedWeek(week);
              setExpandedDay(null);
            }}
          >
            <Text style={[
              styles(colors).weekTabText,
              selectedWeek === week && styles(colors).weekTabTextActive
            ]}>
              Week {week}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFeature = (feature) => (
    <View key={feature.title} style={styles(colors).featureItem}>
      <View style={styles(colors).featureIcon}>
        <Ionicons name={feature.icon} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).featureText}>
        <Text style={styles(colors).featureTitle}>{feature.title}</Text>
        <Text style={styles(colors).featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );

  const weeklyMealPlan = getWeeklyMealPlan();

  if (loading) {
    return <MealPlanDetailSkeleton />;
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <StandardHeader 
        title="Details"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView 
        style={styles(colors).scrollView} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles(colors).heroContainer}>
          <Image 
            source={
              mealPlanDetails?.planImageUrl 
                ? { uri: mealPlanDetails.planImageUrl }
                : require('../../assets/images/meal-plans/fitfuel.jpg')
            }
            style={styles(colors).heroImage}
            defaultSource={require('../../assets/images/meal-plans/fitfuel.jpg')}
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles(colors).imageGradientOverlay}
          />
          
          {/* Quantity Controls */}
          <View style={styles(colors).quantityControls}>
            <TouchableOpacity 
              style={styles(colors).quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles(colors).quantityText}>{quantity}</Text>
            <TouchableOpacity 
              style={styles(colors).quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles(colors).bookmarkButton}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Plan Info */}
        <View style={styles(colors).planInfo}>
          <Text style={styles(colors).planTitle}>
            {mealPlanDetails?.planName || bundle?.name || 'Meal Plan'}
          </Text>
          <Text style={styles(colors).planDescription}>
            {mealPlanDetails?.description || bundle?.description || 'Comprehensive meal plan designed for your health and wellness goals.'}
          </Text>
          
          <View style={styles(colors).planMeta}>
            <View style={styles(colors).metaItem}>
              <Ionicons name="star" size={16} color={colors.rating} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.avgRating || bundle?.rating || 4.5}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.planDuration || bundle?.duration || '4 weeks'}
              </Text>
            </View>
            <View style={styles(colors).metaItem}>
              <Ionicons name="restaurant" size={16} color={colors.textSecondary} />
              <Text style={styles(colors).metaText}>
                {mealPlanDetails?.mealsPerWeek || bundle?.mealsPerWeek || 21} meals/week
              </Text>
            </View>
          </View>

          <View style={styles(colors).priceContainer}>
            <Text style={styles(colors).currentPrice}>
              ₦{(mealPlanDetails?.basePrice || bundle?.price || 25000).toLocaleString()}
            </Text>
            <Text style={styles(colors).originalPrice}>
              ₦{Math.round((mealPlanDetails?.basePrice || bundle?.price || 25000) * 1.2).toLocaleString()}
            </Text>
            <Text style={styles(colors).discountBadge}>20% OFF</Text>
          </View>

          {/* Size Options */}
          <View style={styles(colors).sizeSection}>
            <Text style={styles(colors).sizeTitle}>Size</Text>
            <View style={styles(colors).sizeOptions}>
              {['Individual', 'Family', 'Group'].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles(colors).sizeOption,
                    size === 'Medium' && styles(colors).sizeOptionActive
                  ]}
                >
                  <Text style={[
                    styles(colors).sizeOptionText,
                    size === 'Medium' && styles(colors).sizeOptionTextActive
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles(colors).featuresSection}>
          <Text style={styles(colors).sectionTitle}>What's Included</Text>
          <View style={styles(colors).featuresList}>
            {normalizedFeatures.map(renderFeature)}
          </View>
        </View>

        {/* Weekly Meal Plan Section */}
        <View style={styles(colors).mealPlanSection}>
          <Text style={styles(colors).sectionTitle}>Weekly Meal Plan</Text>
          {renderWeekTabs()}
          
          <View style={styles(colors).weekContent}>
            {weeklyMealPlan[selectedWeek]?.map(renderDayCard)}
          </View>
        </View>

        {/* Nutrition Info */}
        {(mealPlanDetails?.nutritionInfo) && (
          <View style={styles(colors).nutritionSection}>
            <Text style={styles(colors).sectionTitle}>Nutrition Information</Text>
            <View style={styles(colors).nutritionGrid}>
              <View style={styles(colors).nutritionItem}>
                <Text style={styles(colors).nutritionValue}>
                  {mealPlanDetails.nutritionInfo.totalCalories || 'N/A'}
                </Text>
                <Text style={styles(colors).nutritionLabel}>Total Calories</Text>
              </View>
              <View style={styles(colors).nutritionItem}>
                <Text style={styles(colors).nutritionValue}>
                  {mealPlanDetails.nutritionInfo.avgCaloriesPerDay || 'N/A'}
                </Text>
                <Text style={styles(colors).nutritionLabel}>Avg. Cal/Day</Text>
              </View>
              <View style={styles(colors).nutritionItem}>
                <Text style={styles(colors).nutritionValue}>
                  {mealPlanDetails.nutritionInfo.totalProtein || 'N/A'}g
                </Text>
                <Text style={styles(colors).nutritionLabel}>Protein</Text>
              </View>
              <View style={styles(colors).nutritionItem}>
                <Text style={styles(colors).nutritionValue}>
                  {mealPlanDetails.nutritionInfo.totalCarbs || 'N/A'}g
                </Text>
                <Text style={styles(colors).nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles(colors).nutritionItem}>
                <Text style={styles(colors).nutritionValue}>
                  {mealPlanDetails.nutritionInfo.totalFat || 'N/A'}g
                </Text>
                <Text style={styles(colors).nutritionLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles(colors).bottomActions}>
        <TouchableOpacity 
          style={styles(colors).customizeButton}
          onPress={() => navigation.navigate('Customize', { bundle })}
        >
          <Ionicons name="options" size={20} color={colors.primary} />
          <Text style={styles(colors).customizeText}>Customize</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles(colors).addToCartButton}
          onPress={() => {
            navigation.navigate('Checkout', { mealPlan: bundle });
          }}
        >
          <Text style={styles(colors).addToCartText}>
            ADD TO SUBSCRIPTION ({quantity})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Gallery Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            {/* Header */}
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>{selectedImageName}</Text>
              <TouchableOpacity 
                style={styles(colors).closeButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
            
            {/* Image */}
            <View style={styles(colors).imageContainer}>
              <Image 
                source={{ uri: selectedImage }} 
                style={styles(colors).fullScreenImage}
                resizeMode="contain"
              />
            </View>
            
            {/* Actions */}
            <View style={styles(colors).modalActions}>
              <TouchableOpacity 
                style={styles(colors).actionButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Ionicons name="share" size={20} color={colors.primary} />
                <Text style={styles(colors).actionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles(colors).actionButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Ionicons name="download" size={20} color={colors.primary} />
                <Text style={styles(colors).actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  moreButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    margin: 20,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    height: 300,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  quantityControls: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: THEME.borderRadius.large,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planInfo: {
    padding: 20,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  planDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  sizeSection: {
    marginBottom: 20,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.large,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sizeOptionTextActive: {
    color: colors.black,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: colors.primary,
    color: colors.black,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xl,
  },
  featuresSection: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: THEME.borderRadius.large,
    marginBottom: 20,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mealPlanSection: {
    padding: 20,
  },
  weekTabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.xl,
    padding: 4,
    marginBottom: 20,
  },
  weekTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.xl,
    alignItems: 'center',
  },
  weekTabActive: {
    backgroundColor: colors.primary,
  },
  weekTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekTabTextActive: {
    color: colors.black,
  },
  weekContent: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCardExpanded: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayContent: {
    gap: 12,
  },
  mealItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  mealThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
  },
  mealText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  remarkContainer: {
    backgroundColor: `${colors.rating}20`,
    padding: 12,
    borderRadius: THEME.borderRadius.small,
    borderLeftWidth: 4,
    borderLeftColor: colors.rating,
  },
  remarkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.rating,
    marginBottom: 4,
  },
  remarkText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  mealPreviewContainer: {
    gap: 8,
  },
  mealPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  mealPreviewText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  mealPreviewImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginLeft: 8,
  },
  nutritionSection: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: THEME.borderRadius.large,
    marginBottom: 20,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: THEME.borderRadius.medium,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  customizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  aboutSection: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: THEME.borderRadius.large,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bottomPadding: {
    height: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 15,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 70,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },
  // Image Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenImage: {
    width: width - 40,
    height: height - 200,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.medium,
    minWidth: 80,
  },
  actionText: {
    fontSize: 14,
    color: colors.white,
    marginTop: 5,
    fontWeight: '500',
  },

  // New styles for enhanced meal slider
  dayExpandableContent: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  mealSliderWrapper: {
    height: 140, // Fixed height to ensure proper scrolling
    marginVertical: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
  mealSliderList: {
    flexGrow: 0,
    height: '100%',
  },
  mealSliderContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  mealCardWrapper: {
    marginRight: 15,
  },
  mealSliderCard: {
    width: 180,
    height: 140,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mealSliderImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mealSliderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mealSliderContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'flex-end',
  },
  mealSliderInfo: {
    alignItems: 'flex-start',
  },
  mealSliderIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  mealSliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  mealSliderDescription: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 14,
  },
});

export default MealPlanDetailScreen;