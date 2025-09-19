// src/screens/meal-plans/CustomizeScreen.js - Modern Dark Theme Update
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import ApiService from "../../services/api";
import StandardHeader from "../../components/layout/Header";
import { DIETARY_PREFERENCES } from "../../utils/profileConstants";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const CustomizeScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { bundle } = route.params || {};
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customization state
  const [selectedPreferences, setSelectedPreferences] = useState(
    user?.dietaryPreferences || []
  );
  const [selectedDietaryConditions, setSelectedDietaryConditions] = useState(
    []
  );
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [excludedIngredients, setExcludedIngredients] = useState([]);
  const [mealFrequency, setMealFrequency] = useState("daily");
  const [portionSize, setPortionSize] = useState("regular");
  const [spiceLevel, setSpiceLevel] = useState("medium");
  const [cookingStyle, setCookingStyle] = useState("balanced");
  const [customNotes, setCustomNotes] = useState("");
  const [selectedToppings, setSelectedToppings] = useState([]);

  // Modal states
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [selectedConditionDetails, setSelectedConditionDetails] =
    useState(null);

  // Available meals and customization options
  const [availableMeals, setAvailableMeals] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [swappedMeals, setSwappedMeals] = useState({});

  // Modals
  const [showMealSwapModal, setShowMealSwapModal] = useState(false);
  const [selectedMealToSwap, setSelectedMealToSwap] = useState(null);
  const [alternativeMeals, setAlternativeMeals] = useState([]);

  // Preferences and settings
  const frequencyOptions = [
    {
      id: "daily",
      label: "1 meal/day",
      description: "Perfect for lunch or dinner",
    },
    {
      id: "twice_daily",
      label: "2 meals/day",
      description: "Lunch and dinner",
    },
    {
      id: "thrice_daily",
      label: "3 meals/day",
      description: "All meals covered",
    },
  ];

  const portionOptions = [
    { id: "small", label: "Small", description: "300-400 calories" },
    { id: "regular", label: "Regular", description: "450-550 calories" },
    { id: "large", label: "Large", description: "600-700 calories" },
  ];

  const spiceLevels = [
    { id: "mild", label: "Mild", icon: "🌶️" },
    { id: "medium", label: "Medium", icon: "🌶️🌶️" },
    { id: "hot", label: "Hot", icon: "🌶️🌶️🌶️" },
  ];

  const cookingStyles = [
    {
      id: "traditional",
      label: "Traditional Nigerian",
      description: "Authentic local flavors",
    },
    {
      id: "international",
      label: "International Fusion",
      description: "Global cuisine styles",
    },
    {
      id: "balanced",
      label: "Balanced Mix",
      description: "Best of both worlds",
    },
  ];

  // Nigerian dietary conditions with recommendations
  const nigerianDietaryConditions = [
    {
      id: "ulcer",
      name: "Ulcer",
      icon: "🫠",
      description: "Stomach ulcer management",
      recommendations: [
        "Avoid excessive pepper and spicy foods",
        "Limit citrus fruits and tomatoes",
        "Eat smaller, frequent meals",
        "Avoid alcohol and caffeine",
        "Include bland foods like rice, yam, and plantain",
      ],
    },
    {
      id: "diabetes",
      name: "Diabetes",
      icon: "🩺",
      description: "Blood sugar management",
      recommendations: [
        "Control carbohydrate portions",
        "Choose brown rice over white rice",
        "Limit sugary foods and drinks",
        "Include fiber-rich vegetables",
        "Eat regular, balanced meals",
      ],
    },
    {
      id: "hypertension",
      name: "High Blood Pressure",
      icon: "💓",
      description: "Blood pressure management",
      recommendations: [
        "Reduce salt intake significantly",
        "Limit processed and canned foods",
        "Use herbs and spices instead of salt",
        "Avoid excessive palm oil",
        "Include potassium-rich foods like plantain",
      ],
    },
    {
      id: "lactose_intolerance",
      name: "Lactose Intolerance",
      icon: "🥛",
      description: "Difficulty digesting dairy",
      recommendations: [
        "Avoid cow milk and dairy products",
        "Use plant-based milk alternatives",
        "Check ingredients for hidden dairy",
        "Consider lactose-free options",
        "Get calcium from other sources",
      ],
    },
    {
      id: "gluten_sensitivity",
      name: "Gluten Sensitivity",
      icon: "🌾",
      description: "Gluten intolerance",
      recommendations: [
        "Avoid wheat, barley, and rye",
        "Choose rice, yam, and plantain as staples",
        "Read labels carefully",
        "Use corn flour instead of wheat flour",
        "Focus on naturally gluten-free foods",
      ],
    },
  ];

  const nigerianIngredients = [
    // Proteins
    "Fish",
    "Chicken",
    "Beef",
    "Goat meat",
    "Turkey",
    "Beans",
    "Lentils",
    // Staples
    "Rice",
    "Yam",
    "Plantain",
    "Cassava",
    "Sweet potato",
    "Cocoyam",
    // Vegetables
    "Spinach",
    "Waterleaf",
    "Ugwu",
    "Bitter leaf",
    "Scent leaf",
    "Tomatoes",
    "Onions",
    "Peppers",
    // Spices & Seasonings
    "Palm oil",
    "Locust beans",
    "Curry powder",
    "Thyme",
    "Ginger",
    "Garlic",
    // Allergens
    "Nuts (groundnuts)",
    "Dairy",
    "Eggs",
    "Shellfish",
  ];

  useEffect(() => {
    loadAvailableMeals();
    if (bundle) {
      loadMealPlanDetails();
    }
  }, [bundle]);

  useEffect(() => {
    if (availableMeals.length > 0) {
      loadAvailableMeals();
    }
  }, [selectedPreferences, excludedIngredients]);

  const loadAvailableMeals = async () => {
    setLoading(true);
    try {
      const filters = {
        dietaryPreferences: selectedPreferences,
        excludeIngredients: excludedIngredients,
      };

      const result = await ApiService.getAvailableMeals(filters);
      console.log(
        "✅ Successfully loaded",
        result?.data?.length || 0,
        "available meals"
      );

      // Handle the nested data structure from API
      if (result.success && result.data) {
        let mealsArray = [];

        if (Array.isArray(result.data)) {
          mealsArray = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          mealsArray = result.data.data;
        }

        if (mealsArray.length > 0) {
          const transformedMeals = mealsArray.map((meal) => ({
            id: meal._id || meal.id,
            name: meal.mealName || meal.name,
            type: meal.mealType || "Lunch",
            image: meal.image
              ? { uri: meal.image }
              : require("../../assets/images/meal-plans/wellness-hub.jpg"),
            calories: meal.calories || 400,
            protein: meal.protein || 20,
            dietaryTags: meal.dietaryTags || [],
            ingredients: meal.ingredients
              ? typeof meal.ingredients === "string"
                ? meal.ingredients.split(",").map((i) => i.trim())
                : meal.ingredients
              : [],
            allergens: meal.allergens || ["None"],
            spiceLevel: meal.spiceLevel || "medium",
            description: meal.description || "",
            price: meal.price || 0,
          }));

          setAvailableMeals(transformedMeals);

          // Only set selected meals if none are already selected
          if (selectedMeals.length === 0) {
            setSelectedMeals(transformedMeals.slice(0, 2));
          }
          return;
        }
      }

      // If we reach here, API didn't return valid data
      console.log(
        "No meals from API, meals will be managed through meal plan customization"
      );
    } catch (error) {
      console.error("Error loading meals:", error);
      console.log("Meals will be managed through meal plan customization");
    } finally {
      setLoading(false);
    }
  };

  const loadMealPlanDetails = async () => {
    if (!bundle?.id) return;

    try {
      const result = await ApiService.getMealCustomization(bundle.id);

      if (result.success && result.data) {
        const customization = result.data;

        if (customization.preferences) {
          setMealFrequency(customization.preferences.mealFrequency || "daily");
          setPortionSize(customization.preferences.portionSize || "regular");
          setSpiceLevel(customization.preferences.spiceLevel || "medium");
          setCookingStyle(customization.preferences.cookingStyle || "balanced");
          setExcludedIngredients(
            customization.preferences.excludedIngredients || []
          );
        }

        if (customization.mealSwaps) {
          setSwappedMeals(customization.mealSwaps);
        }
      }
    } catch (error) {
      console.error("Error loading meal plan customization:", error);
      showError(
        "Loading Error",
        "Could not load meal customization options. Using default settings instead."
      );
    }
  };

  const handleDietaryPreferenceToggle = (preference) => {
    const updated = selectedPreferences.includes(preference)
      ? selectedPreferences.filter((p) => p !== preference)
      : [...selectedPreferences, preference];

    setSelectedPreferences(updated);
  };

  const handleIngredientExclusion = (ingredient) => {
    const updated = excludedIngredients.includes(ingredient)
      ? excludedIngredients.filter((i) => i !== ingredient)
      : [...excludedIngredients, ingredient];

    setExcludedIngredients(updated);
  };

  const handleMealSwap = (mealId) => {
    const meal = selectedMeals.find((m) => m.id === mealId);
    if (meal) {
      setSelectedMealToSwap(meal);
      const alternatives = availableMeals.filter(
        (m) =>
          m.id !== mealId &&
          m.type === meal.type &&
          !selectedMeals.find((sm) => sm.id === m.id)
      );
      setAlternativeMeals(alternatives);
      setShowMealSwapModal(true);
    }
  };

  const confirmMealSwap = (newMeal) => {
    const updatedMeals = selectedMeals.map((meal) =>
      meal.id === selectedMealToSwap.id ? newMeal : meal
    );
    setSelectedMeals(updatedMeals);
    setSwappedMeals({
      ...swappedMeals,
      [selectedMealToSwap.id]: newMeal.id,
    });
    setShowMealSwapModal(false);
    setSelectedMealToSwap(null);
  };

  const saveCustomizations = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        dietaryPreferences: selectedPreferences,
        allergies: allergies.trim(),
      });

      const customizationData = {
        mealPlanId: bundle?.id,
        preferences: {
          mealFrequency,
          portionSize,
          spiceLevel,
          cookingStyle,
          excludedIngredients,
          dietaryConditions: selectedDietaryConditions,
          customNotes: customNotes.trim(),
          selectedToppings,
        },
        selectedMeals: selectedMeals.map((m) => m.id),
        mealSwaps: swappedMeals,
      };

      const result = await ApiService.saveMealCustomization(customizationData);

      if (result.success) {
        showSuccess(
          "Customization Saved! 🎉",
          "Your meal preferences have been updated successfully.",
          [{ text: "Continue", onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(result.message || "Failed to save customization");
      }
    } catch (error) {
      console.error("Error saving customizations:", error);
      showError("Error", "Failed to save customizations. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderDietaryPreferences = () => (
    <View style={styles(colors).section}>
      <Text style={styles(colors).sectionTitle}>Dietary Preferences</Text>
      <Text style={styles(colors).sectionSubtitle}>
        Tell us about your dietary needs and preferences
      </Text>

      <View style={styles(colors).preferencesGrid}>
        {DIETARY_PREFERENCES.map((preference) => (
          <TouchableOpacity
            key={preference}
            style={[
              styles(colors).preferenceChip,
              selectedPreferences.includes(preference) &&
                styles(colors).preferenceChipSelected,
            ]}
            onPress={() => handleDietaryPreferenceToggle(preference)}
          >
            <Text
              style={[
                styles(colors).preferenceText,
                selectedPreferences.includes(preference) &&
                  styles(colors).preferenceTextSelected,
              ]}
            >
              {preference}
            </Text>
            {selectedPreferences.includes(preference) && (
              <Ionicons
                name="checkmark"
                size={16}
                color={colors.white}
                style={styles(colors).preferenceCheck}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderToppingSection = () => {
    const nigerianToppings = [
      { id: "pepper_sauce", name: "Pepper sauce", price: "+₦300" },
      {
        id: "extra_protein",
        name: "Extra protein (Fish/Chicken)",
        price: "+₦800",
      },
      { id: "plantain", name: "Fried plantain", price: "+₦400" },
      { id: "vegetables", name: "Mixed vegetables", price: "+₦250" },
      { id: "palm_oil", name: "Extra palm oil", price: "+₦100" },
    ];

    return (
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Meal Extras</Text>
        <Text style={styles(colors).sectionSubtitle2}>
          Add extras to your meal
        </Text>

        <View style={styles(colors).toppingsContainer}>
          {nigerianToppings.map((topping) => (
            <TouchableOpacity
              key={topping.id}
              style={[
                styles(colors).toppingItem,
                selectedToppings.includes(topping.id) &&
                  styles(colors).toppingItemSelected,
              ]}
              onPress={() => {
                const isSelected = selectedToppings.includes(topping.id);
                if (isSelected) {
                  setSelectedToppings((prev) =>
                    prev.filter((id) => id !== topping.id)
                  );
                } else {
                  setSelectedToppings((prev) => [...prev, topping.id]);
                }
              }}
            >
              <Text
                style={[
                  styles(colors).toppingName,
                  selectedToppings.includes(topping.id) &&
                    styles(colors).toppingNameSelected,
                ]}
              >
                {topping.name}
              </Text>
              <Text
                style={[
                  styles(colors).toppingPrice,
                  selectedToppings.includes(topping.id) &&
                    styles(colors).toppingPriceSelected,
                ]}
              >
                {topping.price}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDietaryConditions = () => (
    <View style={styles(colors).section}>
      <Text style={styles(colors).sectionTitle}>Dietary Conditions</Text>
      <Text style={styles(colors).sectionSubtitle}>
        Do you have any dietary conditions we should know about?
      </Text>

      <View style={styles(colors).conditionsGrid}>
        {nigerianDietaryConditions.map((condition) => (
          <TouchableOpacity
            key={condition.id}
            style={[
              styles(colors).conditionChip,
              selectedDietaryConditions.includes(condition.id) &&
                styles(colors).conditionChipSelected,
            ]}
            onPress={() => {
              const isSelected = selectedDietaryConditions.includes(
                condition.id
              );
              if (isSelected) {
                setSelectedDietaryConditions((prev) =>
                  prev.filter((id) => id !== condition.id)
                );
              } else {
                setSelectedDietaryConditions((prev) => [...prev, condition.id]);
                setSelectedConditionDetails(condition);
                setShowConditionModal(true);
              }
            }}
          >
            <Text style={styles(colors).conditionIcon}>{condition.icon}</Text>
            <Text
              style={[
                styles(colors).conditionText,
                selectedDietaryConditions.includes(condition.id) &&
                  styles(colors).conditionTextSelected,
              ]}
            >
              {condition.name}
            </Text>
            {selectedDietaryConditions.includes(condition.id) && (
              <Ionicons
                name="checkmark"
                size={16}
                color={colors.white}
                style={styles(colors).conditionCheck}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCustomNotes = () => (
    <View style={styles(colors).section}>
      <Text style={styles(colors).sectionTitle}>Additional Notes</Text>
      <Text style={styles(colors).sectionSubtitle}>
        Any other dietary requirements or preferences?
      </Text>

      <TextInput
        style={styles(colors).notesInput}
        placeholder="Tell us about any other dietary needs, food allergies, or preferences..."
        placeholderTextColor={colors.textMuted}
        value={customNotes}
        onChangeText={setCustomNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );

  const renderConditionModal = () => (
    <Modal
      visible={showConditionModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowConditionModal(false)}
    >
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).modalContent}>
          <View style={styles(colors).modalHeader}>
            <Text style={styles(colors).modalTitle}>
              {selectedConditionDetails?.icon} {selectedConditionDetails?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setShowConditionModal(false)}
              style={styles(colors).modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles(colors).modalScroll}>
            <View style={styles(colors).conditionModalContent}>
              <Text style={styles(colors).conditionDescription}>
                {selectedConditionDetails?.description}
              </Text>

              <Text style={styles(colors).recommendationsTitle}>
                Dietary Recommendations:
              </Text>

              {selectedConditionDetails?.recommendations.map((rec, index) => (
                <View key={index} style={styles(colors).recommendationItem}>
                  <Text style={styles(colors).recommendationBullet}>•</Text>
                  <Text style={styles(colors).recommendationText}>{rec}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles(colors).conditionModalButton}
                onPress={() => setShowConditionModal(false)}
              >
                <Text style={styles(colors).conditionModalButtonText}>
                  Got it!
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderMealSwapModal = () => (
    <Modal
      visible={showMealSwapModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMealSwapModal(false)}
    >
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).modalContent}>
          <View style={styles(colors).modalHeader}>
            <Text style={styles(colors).modalTitle}>
              Swap {selectedMealToSwap?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setShowMealSwapModal(false)}
              style={styles(colors).modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles(colors).modalScroll}>
            {alternativeMeals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles(colors).alternativeMealCard}
                onPress={() => confirmMealSwap(meal)}
              >
                <Image
                  source={meal.image}
                  style={styles(colors).alternativeMealImage}
                />
                <View style={styles(colors).alternativeMealInfo}>
                  <Text style={styles(colors).alternativeMealName}>
                    {meal.name}
                  </Text>
                  <Text style={styles(colors).alternativeMealMeta}>
                    {meal.calories} cal • {meal.protein}g protein
                  </Text>
                  <View style={styles(colors).alternativeMealTags}>
                    {meal.dietaryTags.map((tag, index) => (
                      <Text
                        key={index}
                        style={styles(colors).alternativeMealTag}
                      >
                        {tag}
                      </Text>
                    ))}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading customization options...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StandardHeader
        title="Custom Orders"
        onBackPress={() => navigation.goBack()}
        onRightPress={() => {
          /* Add help functionality */
        }}
      />

      {/* Main Content */}
      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {/* Hero Image Section */}
        <View style={styles(colors).heroSection}>
          <Image
            source={require("../../assets/images/meal-plans/fitfuel.jpg")}
            style={styles(colors).heroImage}
          />
        </View>

        {renderToppingSection()}
        {renderDietaryConditions()}
        {renderCustomNotes()}

        {/* Price Section */}
        <View style={styles(colors).priceSection}>
          <Text style={styles(colors).priceLabel}>Price</Text>
          <Text style={styles(colors).finalPrice}>₦18,500</Text>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles(colors).bottomActions}>
        <TouchableOpacity
          style={[
            styles(colors).continueButton,
            saving && styles(colors).continueButtonDisabled,
          ]}
          onPress={saveCustomizations}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles(colors).continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderConditionModal()}
      {renderMealSwapModal()}
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    heroSection: {
      margin: 20,
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      height: 200,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 15,
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
      marginBottom: 20,
      lineHeight: 20,
    },
    sectionSubtitle2: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
      fontWeight: "500",
    },
    preferencesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    preferenceChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    preferenceChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    preferenceText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    preferenceTextSelected: {
      color: colors.white,
    },
    preferenceCheck: {
      marginLeft: 8,
    },
    toppingsContainer: {
      gap: 12,
    },
    toppingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toppingItemSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toppingName: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    toppingNameSelected: {
      color: colors.white,
    },
    toppingPrice: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
    toppingPriceSelected: {
      color: colors.white,
    },
    drinksContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    drinkChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    drinkChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    drinkText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    drinkTextSelected: {
      color: colors.white,
    },
    priceSection: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    priceLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    finalPrice: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },
    bottomActions: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    continueButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: THEME.borderRadius.large,
      alignItems: "center",
      justifyContent: "center",
    },
    continueButtonDisabled: {
      backgroundColor: colors.textMuted,
    },
    continueButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    bottomPadding: {
      height: 40,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalScroll: {
      maxHeight: 400,
    },
    alternativeMealCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    alternativeMealImage: {
      width: 60,
      height: 60,
      borderRadius: THEME.borderRadius.medium,
    },
    alternativeMealInfo: {
      flex: 1,
      marginLeft: 16,
    },
    alternativeMealName: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    alternativeMealMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    alternativeMealTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    alternativeMealTag: {
      fontSize: 10,
      color: colors.primary,
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: THEME.borderRadius.small,
    },
    // Dietary conditions styles
    conditionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    conditionChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      minWidth: 120,
    },
    conditionChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    conditionIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    conditionText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
      flex: 1,
    },
    conditionTextSelected: {
      color: colors.white,
    },
    conditionCheck: {
      marginLeft: 4,
    },
    // Notes input
    notesInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      height: 100,
      textAlignVertical: "top",
    },
    // Condition modal styles
    conditionModalContent: {
      padding: 20,
    },
    conditionDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 22,
    },
    recommendationsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    recommendationItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    recommendationBullet: {
      fontSize: 16,
      color: colors.primary,
      marginRight: 8,
      marginTop: 2,
    },
    recommendationText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      lineHeight: 20,
    },
    conditionModalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
      marginTop: 20,
    },
    conditionModalButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default CustomizeScreen;
