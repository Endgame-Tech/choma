// src/screens/subscription/CheckoutScreen.js - Modern Dark Theme Update
import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
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
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import api from "../../services/api";
import StandardHeader from "../../components/layout/Header";
import { useAlert } from "../../contexts/AlertContext";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";
import DeliveryZoneModal from "../../components/delivery/DeliveryZoneModal";
import discountService from "../../services/discountService";

const CheckoutScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showInfo, showSuccess } = useAlert();
  const { mealPlanId, mealPlan: initialMealPlan } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(!!mealPlanId && !initialMealPlan);
  const [mealPlan, setMealPlan] = useState(initialMealPlan || null);
  const [error, setError] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState("all");
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [addressSource, setAddressSource] = useState(
    user?.address ? "saved" : "manual"
  ); // 'saved', 'current', 'manual'
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocationAddress, setCurrentLocationAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingDeliveryFee, setLoadingDeliveryFee] = useState(false);
  const [deliverySchedule, setDeliverySchedule] = useState([]);
  const [consolidatedDeliveries, setConsolidatedDeliveries] = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(1);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [discount, setDiscount] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  // Debounced function to fetch delivery price
  const debouncedFetchDeliveryPrice = useCallback(
    debounce(async (address, count, consolidated) => {
      if (address && address.trim().length > 2) {
        setLoadingDeliveryFee(true);
        try {
          const result = await api.getDeliveryPrice(
            address,
            count,
            consolidated
          );
          if (result.success && result.data) {
            setDeliveryFee(result.data.totalDeliveryFee || result.data.price);
            setDeliverySchedule(result.data.deliverySchedule || []);
          } else {
            setDeliveryFee(0);
            setDeliverySchedule([]);
          }
        } catch (err) {
          setDeliveryFee(0);
          setDeliverySchedule([]);
          console.error("Failed to fetch delivery price:", err);
        } finally {
          setLoadingDeliveryFee(false);
        }
      } else {
        setDeliveryFee(0);
        setDeliverySchedule([]);
      }
    }, 1000),
    []
  );

  // Function to calculate discount
  const calculateDiscount = useCallback(async () => {
    if (!user || !mealPlan) return;

    setLoadingDiscount(true);
    try {
      const discountResult = await discountService.calculateDiscount(
        user,
        mealPlan
      );
      setDiscount(discountResult);
    } catch (error) {
      console.error("Failed to calculate discount:", error);
      setDiscount(null);
    } finally {
      setLoadingDiscount(false);
    }
  }, [user, mealPlan]);

  // Function to get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showError(
          "Permission Required",
          "Please grant location permission to use current location as delivery address."
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
          address.country,
        ]
          .filter(Boolean)
          .join(", ");

        setCurrentLocationAddress(formattedAddress);
        setDeliveryAddress(formattedAddress);
        setAddressSource("current");
      } else {
        showError(
          "Error",
          "Unable to get address from current location. Please enter manually."
        );
      }
    } catch (error) {
      console.error("Error getting location:", error);
      showError(
        "Location Error",
        "Unable to get current location. Please check your GPS and try again or enter address manually."
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Function to handle address source change
  const handleAddressSourceChange = (source) => {
    setAddressSource(source);

    switch (source) {
      case "saved":
        setDeliveryAddress(user?.address || "");
        break;
      case "current":
        if (currentLocationAddress) {
          setDeliveryAddress(currentLocationAddress);
        } else {
          getCurrentLocation();
        }
        break;
      case "manual":
        setDeliveryAddress("");
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
            setError("Failed to fetch meal plan details. Please try again.");
            console.error("Error fetching meal plan details:", result.error);
          }
        } catch (err) {
          setError("An unexpected error occurred. Please try again.");
          console.error("Error fetching meal plan details:", err);
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
      const defaultFrequency =
        mealPlan.mealTypes && mealPlan.mealTypes.length > 1
          ? "all"
          : mealPlan.mealTypes?.[0] || "all";
      setSelectedFrequency(defaultFrequency);

      // Default to full duration
      setSelectedDuration(parsePlanWeeks(mealPlan) || 1);
    }
  }, [mealPlan, selectedFrequency, selectedDuration]);

  // Calculate discount when meal plan or user changes
  useEffect(() => {
    if (mealPlan && user) {
      calculateDiscount();
    }
  }, [mealPlan, user, calculateDiscount]);

  useEffect(() => {
    if (selectedDuration) {
      const newDeliveryCount = selectedDuration * 7;
      console.log(
        `🚀 Duration Changed: ${selectedDuration} weeks → ${newDeliveryCount} deliveries`
      );
      setDeliveryCount(newDeliveryCount);
    }
  }, [selectedDuration]);

  useEffect(() => {
    if (selectedZone) {
      let totalFee = 0;
      if (consolidatedDeliveries) {
        const consolidatedCount = Math.ceil(deliveryCount / 2);
        totalFee = selectedZone.price * consolidatedCount;
        console.log(
          `🚀 Consolidated Delivery Calculation: ₦${selectedZone.price} × ${consolidatedCount} deliveries = ₦${totalFee}`
        );
      } else {
        totalFee = selectedZone.price * deliveryCount;
        console.log(
          `🚀 Daily Delivery Calculation: ₦${selectedZone.price} × ${deliveryCount} deliveries = ₦${totalFee}`
        );
      }
      setDeliveryFee(totalFee);
    }
  }, [consolidatedDeliveries, selectedZone, deliveryCount]);

  // Handle delivery zone selection
  const handleZoneSelect = (zone) => {
    console.log(`🚀 Zone Selected: ${zone.area} - ₦${zone.price}`);
    console.log(
      `🚀 Delivery Count: ${deliveryCount}, Consolidated: ${consolidatedDeliveries}`
    );

    setSelectedZone(zone);
    // Calculate delivery fee based on selected zone and delivery options
    let totalFee = 0;
    if (consolidatedDeliveries) {
      const consolidatedCount = Math.ceil(deliveryCount / 2);
      totalFee = zone.price * consolidatedCount;
      console.log(
        `🚀 Zone Select - Consolidated: ₦${zone.price} × ${consolidatedCount} = ₦${totalFee}`
      );
    } else {
      totalFee = zone.price * deliveryCount;
      console.log(
        `🚀 Zone Select - Daily: ₦${zone.price} × ${deliveryCount} = ₦${totalFee}`
      );
    }
    setDeliveryFee(totalFee);
    setDeliverySchedule([]);
  };

  // Generate frequency options based on meal plan's mealTypes
  const getAvailableFrequencies = () => {
    if (!mealPlan?.mealTypes || mealPlan.mealTypes.length === 0) {
      return [
        {
          id: "all",
          label: "All Meals",
          description: "All meals in this plan",
          multiplier: 1,
        },
      ];
    }

    const mealTypeOptions = [];

    // Add option for each individual meal type
    mealPlan.mealTypes.forEach((mealType) => {
      mealTypeOptions.push({
        id: mealType,
        label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
        description: `${mealType} meals only`,
        multiplier: 1 / mealPlan.mealTypes.length, // Proportional to number of meal types
      });
    });

    // Add option for all meal types if more than one
    if (mealPlan.mealTypes.length > 1) {
      mealTypeOptions.push({
        id: "all",
        label: "All Meals",
        description: `${mealPlan.mealTypes.join(", ")} meals`,
        multiplier: 1,
      });
    }

    return mealTypeOptions;
  };

  // Generate duration options based on meal plan's durationWeeks
  const getAvailableDurations = () => {
    // The plan's duration is fixed based on admin settings.
    const planWeeks = parsePlanWeeks(mealPlan);

    if (!planWeeks || planWeeks < 1) {
      // Fallback to a default of 1 week if the plan duration is not set.
      return [
        {
          id: 1,
          label: "1 Week",
          description: "7 days of meals",
          multiplier: 1,
        },
      ];
    }

    // Only provide the duration specified by the meal plan.
    return [
      {
        id: planWeeks,
        label: planWeeks === 1 ? "1 Week" : `${planWeeks} Weeks`,
        description: `This plan has a fixed duration of ${planWeeks * 7} days.`,
        multiplier: 1, // The multiplier is 1 because this is the only option.
      },
    ];
  };

  // Helper: try multiple fields to determine how many weeks the plan is designed for
  const parsePlanWeeks = (mp) => {
    if (!mp) return 1;
    // Prefer explicit numeric field
    if (typeof mp.durationWeeks === "number" && mp.durationWeeks > 0)
      return mp.durationWeeks;

    // Some backends send a string like '4 weeks' under planDuration or duration
    const candidates = [
      mp.planDuration,
      mp.duration,
      mp.plan_duration,
      mp.planDurationText,
      mp.durationText,
    ];
    for (const v of candidates) {
      if (!v) continue;
      const match = String(v).match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Fallback to mealsPerWeek -> derive weeks if totalPrice or base assumptions exist is not reliable
    return 1;
  };

  const frequencies = getAvailableFrequencies();
  const durations = getAvailableDurations();

  // Calculate pricing based on meal plan's totalPrice and user selections
  const originalBasePlanPrice = mealPlan?.totalPrice || mealPlan?.price || 0; // Use totalPrice if available, fallback to price

  // Apply discount to base price if available
  const hasValidDiscount = discount && discount.discountPercent > 0;
  const basePlanPrice = hasValidDiscount
    ? discount.discountedPrice
    : originalBasePlanPrice;

  const frequencyMultiplier =
    frequencies.find((f) => f.id === selectedFrequency)?.multiplier || 1;
  const durationMultiplier =
    durations.find((d) => d.id === selectedDuration)?.multiplier || 1;

  // Ensure all values are valid numbers
  const validBasePlanPrice = isNaN(basePlanPrice) ? 0 : basePlanPrice;
  const validFrequencyMultiplier = isNaN(frequencyMultiplier)
    ? 1
    : frequencyMultiplier;
  const validDurationMultiplier = isNaN(durationMultiplier)
    ? 1
    : durationMultiplier;
  const validDeliveryFee =
    isNaN(deliveryFee) || deliveryFee < 0 ? 0 : deliveryFee;

  // Calculate subtotal: base plan price × frequency selection × duration selection
  const subtotal = Math.round(
    validBasePlanPrice * validFrequencyMultiplier * validDurationMultiplier
  );

  const totalPrice = subtotal + validDeliveryFee;

  const handleProceedToPayment = () => {
    if (!deliveryAddress.trim()) {
      showError("Required Field", "Please enter your delivery address");
      return;
    }

    if (!selectedZone) {
      showError(
        "Required Field",
        "Please select a delivery zone to calculate delivery fees"
      );
      return;
    }

    if (!mealPlan || !mealPlan.id) {
      showError("Error", "Invalid meal plan data. Please try again.");
      return;
    }

    // Validate that we have valid numbers before proceeding
    if (isNaN(totalPrice) || totalPrice <= 0) {
      showError(
        "Pricing Error",
        "Unable to calculate valid pricing. Please try again or contact support."
      );
      return;
    }

    const subscriptionData = {
      mealPlan: mealPlan.id || mealPlan._id,
      selectedMealTypes:
        selectedFrequency === "all" ? mealPlan.mealTypes : [selectedFrequency],
      frequency: selectedFrequency,
      duration: selectedDuration,
      durationWeeks: selectedDuration, // Store the actual weeks selected
      fullPlanDuration: parsePlanWeeks(mealPlan), // Store the original plan duration for reference
      startDate: startDate.toISOString(),
      deliveryAddress: deliveryAddress.trim(),
      specialInstructions: specialInstructions.trim(),
      totalPrice: Math.round(totalPrice), // Ensure it's a whole number
      originalBasePlanPrice: Math.round(originalBasePlanPrice),
      basePlanPrice: Math.round(validBasePlanPrice),
      discount:
        discount && discount.discountPercent > 0
          ? {
              discountPercent: discount.discountPercent,
              discountAmount: discount.discountAmount,
              reason: discount.reason,
              eligibilityReason: discount.eligibilityReason,
            }
          : null,
      frequencyMultiplier: validFrequencyMultiplier,
      durationMultiplier: validDurationMultiplier,
      deliveryFee: deliveryFee,
      selectedDeliveryZone: selectedZone
        ? {
            _id: selectedZone._id,
            area: selectedZone.area,
            state: selectedZone.state,
            country: selectedZone.country,
            price: selectedZone.price,
            locationName: selectedZone.locationName,
          }
        : null,
      deliveryCount,
      consolidatedDeliveries,
      deliverySchedule: deliverySchedule,
    };

    console.log(
      "🚀 Sending subscription data to payment:",
      JSON.stringify(subscriptionData, null, 2)
    );

    navigation.navigate("Payment", {
      subscriptionData,
      mealPlan,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading meal plan details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

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

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

        <View style={styles(colors).errorContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginBottom: 20 }}
          />
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
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

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
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

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
  if (
    (!mealPlan.totalPrice && !mealPlan.price) ||
    (mealPlan.totalPrice === 0 && mealPlan.price === 0)
  ) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

        <View style={styles(colors).errorContainer}>
          <Ionicons name="warning" size={80} color={colors.warning} />
          <Text style={styles(colors).errorTitle}>Pricing Not Available</Text>
          <Text style={styles(colors).errorText}>
            This meal plan doesn't have pricing configured yet. Please contact
            support or try another meal plan.
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

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
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
                    ? typeof mealPlan.image === "string"
                      ? { uri: mealPlan.image }
                      : mealPlan.image
                    : require("../../assets/images/meal-plans/fitfuel.jpg")
                }
                style={styles(colors).mealPlanImage}
                resizeMode="cover"
                defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
              />
            </View>
            <View style={styles(colors).mealPlanTextContent}>
              <Text style={styles(colors).mealPlanName}>
                {mealPlan.planName || mealPlan.name}
              </Text>
              <Text style={styles(colors).mealPlanSubtitle}>
                {mealPlan.description || mealPlan.subtitle}
              </Text>
              <Text style={styles(colors).mealPlanPrice}>
                ₦{(mealPlan.totalPrice || mealPlan.price).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Meal selection is controlled by admin; users cannot choose meal types here. */}

        {/* Duration Selection */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Subscription Duration</Text>
          <Text style={styles(colors).sectionSubtitle}>
            This plan has a fixed duration of {parsePlanWeeks(mealPlan)}{" "}
            week(s).
          </Text>

          <View style={styles(colors).optionsContainer}>
            {durations.map((duration) => (
              <TouchableOpacity
                key={duration.id}
                style={[
                  styles(colors).optionCard,
                  selectedDuration === duration.id &&
                    styles(colors).selectedOption,
                ]}
                onPress={() => setSelectedDuration(duration.id)}
              >
                <View style={styles(colors).optionContent}>
                  <Text
                    style={[
                      styles(colors).optionLabel,
                      selectedDuration === duration.id &&
                        styles(colors).selectedOptionText,
                    ]}
                  >
                    {duration.label}
                  </Text>
                  <Text
                    style={[
                      styles(colors).optionDescription,
                      selectedDuration === duration.id &&
                        styles(colors).selectedOptionDescriptionText,
                    ]}
                  >
                    {duration.description}
                  </Text>
                </View>
                <View style={styles(colors).optionRight}>
                  <Text
                    style={[
                      styles(colors).optionMultiplier,
                      selectedDuration === duration.id &&
                        styles(colors).selectedOptionText,
                    ]}
                  >
                    ×{duration.multiplier}
                  </Text>
                  {selectedDuration === duration.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.success}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Delivery Information</Text>

          {/* Delivery Schedule Options */}
          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Delivery Schedule</Text>
            <View style={styles(colors).deliveryOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles(colors).deliveryOptionCard,
                  !consolidatedDeliveries &&
                    styles(colors).selectedDeliveryOption,
                ]}
                onPress={() => setConsolidatedDeliveries(false)}
              >
                <Ionicons
                  name="calendar"
                  size={20}
                  color={
                    !consolidatedDeliveries
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <View style={styles(colors).deliveryOptionContent}>
                  <Text
                    style={[
                      styles(colors).deliveryOptionTitle,
                      !consolidatedDeliveries &&
                        styles(colors).selectedDeliveryOptionText,
                    ]}
                  >
                    Daily Delivery
                  </Text>
                  <Text style={styles(colors).deliveryOptionSubtitle}>
                    Fresh meals delivered every day ({deliveryCount} deliveries)
                  </Text>
                </View>
                {!consolidatedDeliveries && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.success}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles(colors).deliveryOptionCard,
                  consolidatedDeliveries &&
                    styles(colors).selectedDeliveryOption,
                ]}
                onPress={() => setConsolidatedDeliveries(true)}
              >
                <Ionicons
                  name="bag"
                  size={20}
                  color={
                    consolidatedDeliveries
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <View style={styles(colors).deliveryOptionContent}>
                  <Text
                    style={[
                      styles(colors).deliveryOptionTitle,
                      consolidatedDeliveries &&
                        styles(colors).selectedDeliveryOptionText,
                    ]}
                  >
                    Consolidated Delivery
                  </Text>
                  <Text style={styles(colors).deliveryOptionSubtitle}>
                    2-day meals in one delivery ({Math.ceil(deliveryCount / 2)}{" "}
                    deliveries)
                  </Text>
                </View>
                {consolidatedDeliveries && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.success}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Address Source Options */}
          <View style={styles(colors).addressSourceContainer}>
            <Text style={styles(colors).inputLabel}>Address Options</Text>
            <View style={styles(colors).addressOptionsContainer}>
              {/* Saved Address Option */}
              {user?.address && (
                <TouchableOpacity
                  style={[
                    styles(colors).addressOptionCard,
                    addressSource === "saved" &&
                      styles(colors).selectedAddressOption,
                  ]}
                  onPress={() => handleAddressSourceChange("saved")}
                >
                  <Ionicons
                    name="home"
                    size={20}
                    color={
                      addressSource === "saved"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <View style={styles(colors).addressOptionContent}>
                    <Text
                      style={[
                        styles(colors).addressOptionTitle,
                        addressSource === "saved" &&
                          styles(colors).selectedAddressOptionText,
                      ]}
                    >
                      Saved Address
                    </Text>
                    <Text
                      style={styles(colors).addressOptionSubtitle}
                      numberOfLines={2}
                    >
                      {user.address}
                    </Text>
                  </View>
                  {addressSource === "saved" && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* Current Location Option */}
              <TouchableOpacity
                style={[
                  styles(colors).addressOptionCard,
                  addressSource === "current" &&
                    styles(colors).selectedAddressOption,
                ]}
                onPress={() => handleAddressSourceChange("current")}
                disabled={isGettingLocation}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={
                    addressSource === "current"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <View style={styles(colors).addressOptionContent}>
                  <Text
                    style={[
                      styles(colors).addressOptionTitle,
                      addressSource === "current" &&
                        styles(colors).selectedAddressOptionText,
                    ]}
                  >
                    Current Location
                  </Text>
                  <Text style={styles(colors).addressOptionSubtitle}>
                    {isGettingLocation
                      ? "Getting location..."
                      : currentLocationAddress || "Use my current location"}
                  </Text>
                </View>
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : addressSource === "current" ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.success}
                  />
                ) : null}
              </TouchableOpacity>

              {/* Manual Entry Option */}
              <TouchableOpacity
                style={[
                  styles(colors).addressOptionCard,
                  addressSource === "manual" &&
                    styles(colors).selectedAddressOption,
                ]}
                onPress={() => handleAddressSourceChange("manual")}
              >
                <Ionicons
                  name="pencil"
                  size={20}
                  color={
                    addressSource === "manual"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <View style={styles(colors).addressOptionContent}>
                  <Text
                    style={[
                      styles(colors).addressOptionTitle,
                      addressSource === "manual" &&
                        styles(colors).selectedAddressOptionText,
                    ]}
                  >
                    Enter Manually
                  </Text>
                  <Text style={styles(colors).addressOptionSubtitle}>
                    Type a custom delivery address
                  </Text>
                </View>
                {addressSource === "manual" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.success}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Address Input */}
          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>Delivery Address *</Text>
            <View style={styles(colors).autocompleteContainer}>
              <AddressAutocomplete
                placeholder="Enter your delivery address"
                onAddressSelect={(addressInfo) => {
                  setDeliveryAddress(addressInfo.formattedAddress);
                  // Selecting from suggestions considered manual entry
                  setAddressSource("manual");
                }}
                defaultValue={deliveryAddress}
              />
            </View>

            {/* Select Delivery Zone Button */}
            <TouchableOpacity
              style={styles(colors).selectZoneButton}
              onPress={() => setShowZoneModal(true)}
            >
              <View style={styles(colors).selectZoneContent}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <View style={styles(colors).selectZoneTextContainer}>
                  <Text style={styles(colors).selectZoneTitle}>
                    {selectedZone
                      ? "Change Delivery Zone"
                      : "Select Delivery Zone"}
                  </Text>
                  <Text style={styles(colors).selectZoneSubtitle}>
                    {selectedZone
                      ? `${selectedZone.area}, ${
                          selectedZone.state
                        } - ₦${selectedZone.price.toLocaleString()}`
                      : "Choose the closest zone to your address"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles(colors).inputContainer}>
            <Text style={styles(colors).inputLabel}>
              Special Instructions (Optional)
            </Text>
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
              <Text style={styles(colors).summaryLabel}>
                Plan Base Price ({parsePlanWeeks(mealPlan)} weeks)
              </Text>
              <Text style={styles(colors).summaryValue}>
                ₦{originalBasePlanPrice.toLocaleString()}
              </Text>
            </View>

            {/* Show discount if available */}
            {discount && discount.discountPercent > 0 && (
              <View style={styles(colors).summaryRow}>
                <Text
                  style={[
                    styles(colors).summaryLabel,
                    { color: colors.success },
                  ]}
                >
                  {discount.reason} ({discount.discountPercent}% OFF)
                </Text>
                <Text
                  style={[
                    styles(colors).summaryValue,
                    { color: colors.success },
                  ]}
                >
                  -₦{discount.discountAmount.toLocaleString()}
                </Text>
              </View>
            )}

            {discount && discount.discountPercent > 0 && (
              <View style={styles(colors).summaryRow}>
                <Text style={styles(colors).summaryLabel}>
                  Discounted Base Price
                </Text>
                <Text style={styles(colors).summaryValue}>
                  ₦{basePlanPrice.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>
                Meal Selection Adjustment
              </Text>
              <Text style={styles(colors).summaryValue}>
                ×{frequencyMultiplier}
              </Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>
                Duration Adjustment
              </Text>
              <Text style={styles(colors).summaryValue}>
                ×{durationMultiplier}
              </Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Subtotal</Text>
              <Text style={styles(colors).summaryValue}>
                ₦{subtotal.toLocaleString()}
              </Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>
                Delivery Fee (
                {consolidatedDeliveries
                  ? Math.ceil(deliveryCount / 2)
                  : deliveryCount}{" "}
                deliveries)
              </Text>
              {loadingDeliveryFee ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles(colors).summaryValue,
                    validDeliveryFee === 0 && styles(colors).freeText,
                  ]}
                >
                  {validDeliveryFee > 0
                    ? `₦${validDeliveryFee.toLocaleString()}`
                    : "Free"}
                </Text>
              )}
            </View>
            {/* Show delivery fee breakdown if zone is selected */}
            {selectedZone && validDeliveryFee > 0 && (
              <View style={styles(colors).summaryRow}>
                <Text
                  style={[
                    styles(colors).summaryLabel,
                    { fontSize: 14, fontStyle: "italic" },
                  ]}
                >
                  {consolidatedDeliveries
                    ? `₦${selectedZone.price.toLocaleString()} × ${Math.ceil(
                        deliveryCount / 2
                      )} consolidated deliveries`
                    : `₦${selectedZone.price.toLocaleString()} × ${deliveryCount} daily deliveries`}
                </Text>
                <Text style={[styles(colors).summaryValue, { fontSize: 14 }]}>
                  = ₦{validDeliveryFee.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles(colors).summaryDivider} />
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).totalLabel}>Total</Text>
              <Text style={styles(colors).totalValue}>
                ₦{totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles(colors).footer}>
        <View style={styles(colors).totalSummary}>
          <Text style={styles(colors).totalSummaryLabel}>Total Amount</Text>
          <Text style={styles(colors).totalSummaryValue}>
            ₦{totalPrice.toLocaleString()}
          </Text>
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
            <Text style={styles(colors).proceedButtonText}>
              Proceed to Payment
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Delivery Zone Selection Modal */}
      <DeliveryZoneModal
        visible={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        onZoneSelect={handleZoneSelect}
        userAddress={deliveryAddress}
      />
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      fontWeight: "600",
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
      fontWeight: "600",
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
      overflow: "hidden",
    },
    mealPlanImageContainer: {
      position: "relative",
      height: 150,
      width: "100%",
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
    },
    mealPlanImage: {
      width: "100%",
      height: "100%",
      borderRadius: THEME.borderRadius.large,
    },
    mealPlanTextContent: {
      padding: 16,
      paddingTop: 12,
    },
    mealPlanName: {
      fontSize: 18,
      fontWeight: "600",
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
      fontWeight: "700",
      color: colors.primary,
    },
    optionsContainer: {
      gap: 12,
    },
    optionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
      fontWeight: "600",
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
      color: colors.textSecondary,
      opacity: 0.8,
    },
    optionRight: {
      alignItems: "center",
      gap: 8,
    },
    optionMultiplier: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "500",
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
      textAlignVertical: "top",
    },
    autocompleteContainer: {
      minHeight: 50,
      zIndex: 1000,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    freeText: {
      color: colors.success,
      fontWeight: "600",
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 15,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: "bold",
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    totalSummaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    totalSummaryValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    proceedButton: {
      borderRadius: THEME.borderRadius.xxl,
      overflow: "hidden",
    },
    proceedGradient: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 16,
      gap: 12,
    },
    proceedButtonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: "600",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
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
      fontWeight: "600",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
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
    pillContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    pillButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.cardBackground,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    pillButtonSelected: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    pillButtonDisabled: {
      opacity: 0.5,
    },
    pillButtonText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    pillButtonTextSelected: {
      color: colors.primary,
    },
    addressOptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
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
      fontWeight: "600",
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
    // Delivery options styles
    deliveryOptionsContainer: {
      gap: 12,
    },
    deliveryOptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedDeliveryOption: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    deliveryOptionContent: {
      flex: 1,
      marginLeft: 12,
    },
    deliveryOptionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    selectedDeliveryOptionText: {
      color: colors.primary,
    },
    deliveryOptionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // Delivery zone selection styles
    selectZoneButton: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
    },
    selectZoneContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    selectZoneTextContainer: {
      flex: 1,
    },
    selectZoneTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    selectZoneSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });

export default CheckoutScreen;
