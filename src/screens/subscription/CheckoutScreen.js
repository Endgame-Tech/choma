// src/screens/subscription/CheckoutScreen.js - Modern Dark Theme Update
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';
import api from '../../services/api';
import StandardHeader from '../../components/layout/Header';
import { useAlert } from '../../contexts/AlertContext';

const CheckoutScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showInfo, showSuccess } = useAlert();
  const { mealPlanId, mealPlan: initialMealPlan } = route.params || {};
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(!!mealPlanId && !initialMealPlan);
  const [mealPlan, setMealPlan] = useState(initialMealPlan || null);
  const [error, setError] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addressSource, setAddressSource] = useState(user?.address ? 'saved' : 'manual'); // 'saved', 'current', 'manual'
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocationAddress, setCurrentLocationAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingDeliveryFee, setLoadingDeliveryFee] = useState(false);

  // Debounced function to fetch delivery price
  const debouncedFetchDeliveryPrice = useCallback(
    debounce(async (address) => {
      if (address && address.trim().length > 2) {
        setLoadingDeliveryFee(true);
        try {
          const result = await api.getDeliveryPrice(address);
          if (result.success && result.data) {
            setDeliveryFee(result.data.price);
          } else {
            setDeliveryFee(0);
          }
        } catch (err) {
          setDeliveryFee(0);
          console.error('Failed to fetch delivery price:', err);
        } finally {
          setLoadingDeliveryFee(false);
        }
      } else {
        setDeliveryFee(0);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    debouncedFetchDeliveryPrice(deliveryAddress);
  }, [deliveryAddress, debouncedFetchDeliveryPrice]);

  // Generate frequency options based on meal plan's mealTypes
  const getAvailableFrequencies = () => {
    if (!mealPlan?.mealTypes || mealPlan.mealTypes.length === 0) {
      return [{ id: 'all', label: 'All Meals', description: 'All meals in this plan', multiplier: 1 }];
    }

    const mealTypeOptions = [];
    
    // Add option for each individual meal type
    mealPlan.mealTypes.forEach(mealType => {
      mealTypeOptions.push({
        id: mealType,
        label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
        description: `${mealType} meals only`,
        multiplier: 1 / mealPlan.mealTypes.length // Proportional to number of meal types
      });
    });

    // Add option for all meal types if more than one
    if (mealPlan.mealTypes.length > 1) {
      mealTypeOptions.push({
        id: 'all',
        label: 'All Meals',
        description: `${mealPlan.mealTypes.join(', ')} meals`,
        multiplier: 1
      });
    }

    return mealTypeOptions;
  };

  // Generate duration options based on meal plan's durationWeeks
  const getAvailableDurations = () => {
    if (!mealPlan?.durationWeeks) {
      return [{ id: 1, label: '1 Week', description: '7 days of meals', multiplier: 1 }];
    }

    const maxWeeks = mealPlan.durationWeeks;
    const options = [];
    
    // Add weekly options up to the plan's duration
    for (let weeks = 1; weeks <= maxWeeks; weeks++) {
      options.push({
        id: weeks,
        label: weeks === 1 ? '1 Week' : `${weeks} Weeks`,
        description: `${weeks * 7} days of meals`,
        multiplier: weeks / maxWeeks // Proportional to full plan duration
      });
    }

    return options;
  };

  const frequencies = getAvailableFrequencies();
  const durations = getAvailableDurations();

  // Function to get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showError(
          'Permission Required',
          'Please grant location permission to use current location as delivery address.'
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const formattedAddress = [
          address.streetNumber,
          address.street,
          address.district,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');

        setCurrentLocationAddress(formattedAddress);
        setDeliveryAddress(formattedAddress);
        setAddressSource('current');
        
        showSuccess(
          'Location Found',
          `Current location set as delivery address: ${formattedAddress}`
        );
      } else {
        showError('Error', 'Unable to get address from current location. Please enter manually.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      showError(
        'Location Error', 
        'Unable to get current location. Please check your GPS and try again or enter address manually.'
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Function to handle address source change
  const handleAddressSourceChange = (source) => {
    setAddressSource(source);
    
    switch (source) {
      case 'saved':
        setDeliveryAddress(user?.address || '');
        break;
      case 'current':
        if (currentLocationAddress) {
          setDeliveryAddress(currentLocationAddress);
        } else {
          getCurrentLocation();
        }
        break;
      case 'manual':
        setDeliveryAddress('');
        break;
      default:
        break;
    }
  };

  // Fetch meal plan details if mealPlanId is provided but no initialMealPlan
  useEffect(() => {
    const fetchMealPlanDetails = async () => {
      if (mealPlanId && !initialMealPlan) {
        try {
          setLoading(true);
          const result = await api.getMealPlanById(mealPlanId);
          
          if (result.success && result.data) {
            setMealPlan(result.data);
          } else {
            setError('Failed to fetch meal plan details. Please try again.');
            console.error('Error fetching meal plan details:', result.error);
          }
        } catch (err) {
          setError('An unexpected error occurred. Please try again.');
          console.error('Error fetching meal plan details:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMealPlanDetails();
  }, [mealPlanId, initialMealPlan]);

  // Set default selections when meal plan is loaded
  useEffect(() => {
    if (mealPlan && !selectedFrequency && !selectedDuration) {
      // Default to all meals if multiple meal types, or the single meal type
      const defaultFrequency = mealPlan.mealTypes && mealPlan.mealTypes.length > 1 ? 'all' : mealPlan.mealTypes?.[0] || 'all';
      setSelectedFrequency(defaultFrequency);
      
      // Default to full duration
      setSelectedDuration(mealPlan.durationWeeks || 1);
    }
  }, [mealPlan, selectedFrequency, selectedDuration]);

  // Calculate pricing based on meal plan's totalPrice and user selections
  const basePlanPrice = mealPlan?.totalPrice || mealPlan?.price || 0; // Use totalPrice if available, fallback to price
  const frequencyMultiplier = frequencies.find(f => f.id === selectedFrequency)?.multiplier || 1;
  const durationMultiplier = durations.find(d => d.id === selectedDuration)?.multiplier || 1;
  
  // Debug logging for pricing calculation
  console.log('💰 Pricing calculation debug:', {
    mealPlan: mealPlan ? {
      name: mealPlan.planName || mealPlan.name,
      totalPrice: mealPlan.totalPrice,
      price: mealPlan.price,
      durationWeeks: mealPlan.durationWeeks,
      mealTypes: mealPlan.mealTypes
    } : null,
    basePlanPrice,
    selectedFrequency,
    selectedDuration,
    frequencyMultiplier,
    durationMultiplier,
    frequencies: frequencies.length,
    durations: durations.length
  });
  
  // Ensure all values are valid numbers
  const validBasePlanPrice = isNaN(basePlanPrice) ? 0 : basePlanPrice;
  const validFrequencyMultiplier = isNaN(frequencyMultiplier) ? 1 : frequencyMultiplier;
  const validDurationMultiplier = isNaN(durationMultiplier) ? 1 : durationMultiplier;
  
  // Calculate subtotal: base plan price × frequency selection × duration selection
  const subtotal = Math.round(validBasePlanPrice * validFrequencyMultiplier * validDurationMultiplier);
  const tax = Math.round(subtotal * 0.1); // 10% tax
  const totalPrice = subtotal + deliveryFee + tax;
  
  // Log final calculation
  console.log('💰 Final pricing:', {
    validBasePlanPrice,
    validFrequencyMultiplier, 
    validDurationMultiplier,
    subtotal,
    tax,
    totalPrice
  });

  const handleProceedToPayment = () => {
    if (!deliveryAddress.trim()) {
      showError('Required Field', 'Please enter your delivery address');
      return;
    }

    if (!mealPlan || !mealPlan.id) {
      showError('Error', 'Invalid meal plan data. Please try again.');
      return;
    }

    // Validate that we have valid numbers before proceeding
    if (isNaN(totalPrice) || totalPrice <= 0) {
      showError('Pricing Error', 'Unable to calculate valid pricing. Please try again or contact support.');
      return;
    }

    const subscriptionData = {
      mealPlan: mealPlan.id || mealPlan._id,
      selectedMealTypes: selectedFrequency === 'all' ? mealPlan.mealTypes : [selectedFrequency],
      frequency: selectedFrequency,
      duration: selectedDuration,
      durationWeeks: selectedDuration, // Store the actual weeks selected
      fullPlanDuration: mealPlan.durationWeeks, // Store the original plan duration for reference
      startDate: startDate.toISOString(),
      deliveryAddress: deliveryAddress.trim(),
      specialInstructions: specialInstructions.trim(),
      totalPrice: Math.round(totalPrice), // Ensure it's a whole number
      basePlanPrice: Math.round(validBasePlanPrice),
      frequencyMultiplier: validFrequencyMultiplier,
      durationMultiplier: validDurationMultiplier,
      deliveryFee: deliveryFee
    };
    
    console.log('🚀 Sending subscription data to payment:', JSON.stringify(subscriptionData, null, 2));

    navigation.navigate('Payment', {
      subscriptionData,
      mealPlan
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading meal plan details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Error</Text>
          <Text style={styles(colors).errorText}>
            {error}
          </Text>
          <TouchableOpacity 
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).errorContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={{marginBottom: 20}} />
          <Text style={styles(colors).errorTitle}>Loading Meal Plan</Text>
          <Text style={styles(colors).errorText}>
            Please wait while we fetch the meal plan details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Error</Text>
          <Text style={styles(colors).errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No meal plan selected or invalid pricing
  if (!mealPlan) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Meal Plan Not Found</Text>
          <Text style={styles(colors).errorText}>
            No meal plan selected. Please go back and select a meal plan.
          </Text>
          <TouchableOpacity 
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check for pricing issues
  if ((!mealPlan.totalPrice && !mealPlan.price) || (mealPlan.totalPrice === 0 && mealPlan.price === 0)) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles(colors).errorContainer}>
          <Ionicons name="warning" size={80} color={colors.warning} />
          <Text style={styles(colors).errorTitle}>Pricing Not Available</Text>
          <Text style={styles(colors).errorText}>
            This meal plan doesn't have pricing configured yet. Please contact support or try another meal plan.
          </Text>
          <TouchableOpacity 
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <StandardHeader 
        title="Checkout"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
        {/* Selected Meal Plan */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Selected Meal Plan</Text>
          
          <View style={styles(colors).mealPlanCard}>
            <View style={styles(colors).mealPlanImageContainer}>
              <Image 
                source={
                  mealPlan.coverImage 
                    ? { uri: mealPlan.coverImage }
                    : mealPlan.planImageUrl 
                      ? { uri: mealPlan.planImageUrl }
                      : mealPlan.image 
                        ? (typeof mealPlan.image === 'string' ? { uri: mealPlan.image } : mealPlan.image)
                        : require('../../assets/images/meal-plans/fitfuel.jpg')
                } 
                style={styles(colors).mealPlanImage}
                resizeMode="cover"
                defaultSource={require('../../assets/images/meal-plans/fitfuel.jpg')}
              />
            </View>
            <View style={styles(colors).mealPlanTextContent}>
              <Text style={styles(colors).mealPlanName}>{mealPlan.planName || mealPlan.name}</Text>
              <Text style={styles(colors).mealPlanSubtitle}>{mealPlan.description || mealPlan.subtitle}</Text>
              <Text style={styles(colors).mealPlanPrice}>₦{(mealPlan.totalPrice || mealPlan.price).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Frequency Selection */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Meal Selection</Text>
          <Text style={styles(colors).sectionSubtitle}>
            Choose which meals from this plan (Plan includes: {mealPlan?.mealTypes?.join(', ') || 'all meals'})
          </Text>
          
          <View style={styles(colors).optionsContainer}>
            {frequencies.map((frequency) => (
              <TouchableOpacity
                key={frequency.id}
                style={[
                  styles(colors).optionCard,
                  selectedFrequency === frequency.id && styles(colors).selectedOption
                ]}
                onPress={() => setSelectedFrequency(frequency.id)}
              >
                <View style={styles(colors).optionContent}>
                  <Text style={[
                    styles(colors).optionLabel,
                    selectedFrequency === frequency.id && styles(colors).selectedOptionText
                  ]}>
                    {frequency.label}
                  </Text>
                  <Text style={[
                    styles(colors).optionDescription,
                    selectedFrequency === frequency.id && styles(colors).selectedOptionDescriptionText
                  ]}>
                    {frequency.description}
                  </Text>
                </View>
                <View style={styles(colors).optionRight}>
                  <Text style={[
                    styles(colors).optionMultiplier,
                    selectedFrequency === frequency.id && styles(colors).selectedOptionText
                  ]}>
                    ×{frequency.multiplier}
                  </Text>
                  {selectedFrequency === frequency.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Subscription Duration</Text>
          <Text style={styles(colors).sectionSubtitle}>
            Choose duration (Plan is designed for {mealPlan?.durationWeeks} weeks)
          </Text>
          
          <View style={styles(colors).optionsContainer}>
            {durations.map((duration) => (
              <TouchableOpacity
                key={duration.id}
                style={[
                  styles(colors).optionCard,
                  selectedDuration === duration.id && styles(colors).selectedOption
                ]}
                onPress={() => setSelectedDuration(duration.id)}
              >
                <View style={styles(colors).optionContent}>
                  <Text style={[
                    styles(colors).optionLabel,
                    selectedDuration === duration.id && styles(colors).selectedOptionText
                  ]}>
                    {duration.label}
                  </Text>
                  <Text style={[
                    styles(colors).optionDescription,
                    selectedDuration === duration.id && styles(colors).selectedOptionDescriptionText
                  ]}>
                    {duration.description}
                  </Text>
                </View>
                <View style={styles(colors).optionRight}>
                  <Text style={[
                    styles(colors).optionMultiplier,
                    selectedDuration === duration.id && styles(colors).selectedOptionText
                  ]}>
                    ×{duration.multiplier}
                  </Text>
                  {selectedDuration === duration.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Delivery Information</Text>
          
          {/* Address Source Options */}
          <View style={styles(colors).addressSourceContainer}>
            <Text style={styles(colors).inputLabel}>Address Options</Text>
            <View style={styles(colors).addressOptionsContainer}>
              {/* Saved Address Option */}
              {user?.address && (
                <TouchableOpacity
                  style={[
                    styles(colors).addressOptionCard,
                    addressSource === 'saved' && styles(colors).selectedAddressOption
                  ]}
                  onPress={() => handleAddressSourceChange('saved')}
                >
                  <Ionicons 
                    name="home" 
                    size={20} 
                    color={addressSource === 'saved' ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles(colors).addressOptionContent}>
                    <Text style={[
                      styles(colors).addressOptionTitle,
                      addressSource === 'saved' && styles(colors).selectedAddressOptionText
                    ]}>
                      Saved Address
                    </Text>
                    <Text style={styles(colors).addressOptionSubtitle} numberOfLines={2}>
                      {user.address}
                    </Text>
                  </View>
                  {addressSource === 'saved' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              
              {/* Current Location Option */}
              <TouchableOpacity
                style={[
                  styles(colors).addressOptionCard,
                  addressSource === 'current' && styles(colors).selectedAddressOption
                ]}
                onPress={() => handleAddressSourceChange('current')}
                disabled={isGettingLocation}
              >
                <Ionicons 
                  name="location" 
                  size={20} 
                  color={addressSource === 'current' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles(colors).addressOptionContent}>
                  <Text style={[
                    styles(colors).addressOptionTitle,
                    addressSource === 'current' && styles(colors).selectedAddressOptionText
                  ]}>
                    Current Location
                  </Text>
                  <Text style={styles(colors).addressOptionSubtitle}>
                    {isGettingLocation 
                      ? 'Getting location...' 
                      : currentLocationAddress || 'Use my current location'}
                  </Text>
                </View>
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : addressSource === 'current' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
              
              {/* Manual Entry Option */}
              <TouchableOpacity
                style={[
                  styles(colors).addressOptionCard,
                  addressSource === 'manual' && styles(colors).selectedAddressOption
                ]}
                onPress={() => handleAddressSourceChange('manual')}
              >
                <Ionicons 
                  name="pencil" 
                  size={20} 
                  color={addressSource === 'manual' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles(colors).addressOptionContent}>
                  <Text style={[
                    styles(colors).addressOptionTitle,
                    addressSource === 'manual' && styles(colors).selectedAddressOptionText
                  ]}>
                    Enter Manually
                  </Text>
                  <Text style={styles(colors).addressOptionSubtitle}>
                    Type a custom delivery address
                  </Text>
                </View>
                {addressSource === 'manual' && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Address Input */}
          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Delivery Address *</Text>
            <TextInput
              style={styles(colors).textInput}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter your delivery address"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              editable={addressSource === 'manual' || (!user?.address && addressSource === 'saved')}
            />
          </View>

          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Special Instructions (Optional)</Text>
            <TextInput
              style={styles(colors).textInput}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              placeholder="Any special delivery instructions?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Price Summary</Text>
          
          <View style={styles(colors).summaryCard}>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Plan Base Price ({mealPlan?.durationWeeks} weeks)</Text>
              <Text style={styles(colors).summaryValue}>₦{basePlanPrice.toLocaleString()}</Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Meal Selection Adjustment</Text>
              <Text style={styles(colors).summaryValue}>×{frequencyMultiplier}</Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Duration Adjustment</Text>
              <Text style={styles(colors).summaryValue}>×{durationMultiplier}</Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Subtotal</Text>
              <Text style={styles(colors).summaryValue}>₦{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Delivery Fee</Text>
              {loadingDeliveryFee ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles(colors).summaryValue, deliveryFee === 0 && styles(colors).freeText]}>
                  {deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : 'Free'}
                </Text>
              )}
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Tax (10%)</Text>
              <Text style={styles(colors).summaryValue}>₦{tax.toLocaleString()}</Text>
            </View>
            <View style={styles(colors).summaryDivider} />
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).totalLabel}>Total</Text>
              <Text style={styles(colors).totalValue}>₦{totalPrice.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles(colors).footer}>
        <View style={styles(colors).totalSummary}>
          <Text style={styles(colors).totalSummaryLabel}>Total Amount</Text>
          <Text style={styles(colors).totalSummaryValue}>₦{totalPrice.toLocaleString()}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles(colors).proceedButton}
          onPress={handleProceedToPayment}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles(colors).proceedGradient}
          >
            <Ionicons name="card" size={20} color={colors.black} />
            <Text style={styles(colors).proceedButtonText}>Proceed to Payment</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: THEME.borderRadius.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  mealPlanCard: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
  },
  mealPlanImageContainer: {
    position: 'relative',
    height: 150,
    width: '100%',
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
  },
  mealPlanImage: {
    width: '100%',
    height: '100%',
    borderRadius: THEME.borderRadius.large,
  },
  mealPlanTextContent: {
    padding: 16,
    paddingTop: 12,
  },
  mealPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  mealPlanSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  mealPlanPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primaryLight}10`,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedOptionText: {
    color: colors.primary,
  },
  selectedOptionDescriptionText: {
    color: colors.primary,
    opacity: 0.8,
  },
  optionRight: {
    alignItems: 'center',
    gap: 8,
  },
  optionMultiplier: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.large,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  freeText: {
    color: colors.success,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalSummaryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalSummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  proceedButton: {
    borderRadius: THEME.borderRadius.xxl,
    overflow: 'hidden',
  },
  proceedGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  proceedButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.large,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  },
  // Address options styles
  addressSourceContainer: {
    marginBottom: 20,
  },
  addressOptionsContainer: {
    gap: 12,
  },
  addressOptionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedAddressOption: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  addressOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedAddressOptionText: {
    color: colors.primary,
  },
  addressOptionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default CheckoutScreen;