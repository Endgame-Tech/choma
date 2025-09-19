import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./StarRating";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../ui/CustomIcon";

// Entity type display name mapping
const ENTITY_DISPLAY_NAMES = {
  meal_plan: "Meal Plan",
  chef_performance: "Chef",
  driver_service: "Driver",
  delivery_experience: "Delivery",
  app_experience: "App",
  order: "Order",
  restaurant: "Restaurant",
  customer_service: "Customer Service",
  subscription: "Subscription",
  payment: "Payment Experience",
};

// Helper function to get display name for entity type
const getEntityDisplayName = (entityType) => {
  return ENTITY_DISPLAY_NAMES[entityType] || entityType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Item";
};

const ASPECT_CONFIGS = {
  meal_plan: [
    { key: "taste", label: "Taste", description: "How did the food taste?" },
    {
      key: "presentation",
      label: "Presentation",
      description: "How was the visual presentation?",
    },
    {
      key: "portionSize",
      label: "Portion Size",
      description: "Was the portion size appropriate?",
    },
    {
      key: "valueForMoney",
      label: "Value for Money",
      description: "Was it worth the price?",
    },
    {
      key: "healthiness",
      label: "Healthiness",
      description: "How healthy was the meal?",
    },
  ],
  chef_performance: [
    {
      key: "cookingQuality",
      label: "Cooking Quality",
      description: "How well was the food prepared?",
    },
    {
      key: "consistency",
      label: "Consistency",
      description: "How consistent is the chef?",
    },
    {
      key: "communication",
      label: "Communication",
      description: "How was the communication?",
    },
    {
      key: "punctuality",
      label: "Punctuality",
      description: "Was the chef on time?",
    },
    {
      key: "professionalism",
      label: "Professionalism",
      description: "How professional was the chef?",
    },
  ],
  driver_service: [
    {
      key: "timeliness",
      label: "Timeliness",
      description: "Was the delivery on time?",
    },
    {
      key: "courteous",
      label: "Courtesy",
      description: "How courteous was the driver?",
    },
    {
      key: "packaging",
      label: "Packaging",
      description: "How was the food packaged?",
    },
    {
      key: "tracking",
      label: "Tracking",
      description: "How accurate was the tracking?",
    },
  ],
  delivery_experience: [
    {
      key: "temperature",
      label: "Temperature",
      description: "Was the food at the right temperature?",
    },
    {
      key: "condition",
      label: "Condition",
      description: "What condition was the food in?",
    },
    {
      key: "accuracy",
      label: "Accuracy",
      description: "Was the order accurate?",
    },
  ],
  app_experience: [
    {
      key: "easeOfUse",
      label: "Ease of Use",
      description: "How easy was the app to use?",
    },
    {
      key: "performance",
      label: "Performance",
      description: "How well did the app perform?",
    },
    { key: "design", label: "Design", description: "How was the app design?" },
    {
      key: "features",
      label: "Features",
      description: "How useful were the features?",
    },
  ],
};

const RatingModal = ({
  visible,
  onClose,
  onSubmit,
  ratingType,
  entityType,
  entityId,
  entityName,
  contextData,
  existingRating,
  aspects,
  title,
  description,
  loading = false,
}) => {
  const { colors } = useTheme();
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState({});
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);
  const expandAnimation = useState(new Animated.Value(0))[0];

  // Get aspect configuration based on rating type
  const aspectConfig = aspects
    ? aspects.map((aspect) => ({ key: aspect, label: aspect, description: "" }))
    : ASPECT_CONFIGS[ratingType] || [];

  // Initialize form with existing rating data
  useEffect(() => {
    if (existingRating) {
      setOverallRating(existingRating.overallRating || 0);
      setAspectRatings(existingRating.aspectRatings || {});
      setComment(existingRating.comment || "");
      setTags(existingRating.tags || []);
    } else {
      // Reset form for new rating
      setOverallRating(0);
      setAspectRatings({});
      setComment("");
      setTags([]);
      setShowDetailedRatings(false);
      expandAnimation.setValue(0);
    }
  }, [existingRating, visible]);

  const handleAspectRatingChange = (aspectKey, rating) => {
    setAspectRatings((prev) => ({
      ...prev,
      [aspectKey]: rating,
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags((prev) => [...prev, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const toggleDetailedRatings = () => {
    const toValue = showDetailedRatings ? 0 : 1;
    setShowDetailedRatings(!showDetailedRatings);

    Animated.spring(expandAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert("Rating Required", "Please provide an overall rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const ratingData = {
        ratingType,
        ratedEntity: entityId,
        ratedEntityType: entityType,
        overallRating,
        aspectRatings:
          Object.keys(aspectRatings).length > 0 ? aspectRatings : undefined,
        comment: comment.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        contextData,
      };

      await onSubmit(ratingData);
      onClose();
    } catch (error) {
      console.error("Failed to submit rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = title || `Rate ${entityName || entityType}`;
  const modalDescription =
    description || `Share your experience with this ${entityType}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles(colors).backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles(colors).container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView
            style={styles(colors).modalContent}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles(colors).closeButton}
          >
            <CustomIcon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles(colors).content}
          contentContainerStyle={styles(colors).scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Title */}
          <View style={styles(colors).titleSection}>
            <Text style={styles(colors).title}>How would you rate</Text>
            <Text style={styles(colors).entityName}>
              {entityName || getEntityDisplayName(entityType)}
            </Text>
          </View>

          {/* Overall Rating */}
          <View style={styles(colors).section}>
            <View style={styles(colors).ratingContainer}>
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                size={40}
                style={styles(colors).overallRating}
              />
            </View>
          </View>

  {/* Comment Section - Always visible */}
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Comments (Optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines ={4}
              maxLength={1000}
              placeholder={`Share your feedback about this ${getEntityDisplayName(entityType).toLowerCase()} with other customers.`}
              placeholderTextColor={colors.textMuted || colors.textSecondary || "#9CA3AF"}
              style={styles(colors).textInput}
              textAlignVertical="top"
            />
            <Text style={styles(colors).characterCount}>
              {comment.length}/1000 characters
            </Text>
          </View>

          {/* Detailed Ratings Toggle */}
          {aspectConfig.length > 0 && (
            <TouchableOpacity
              style={styles(colors).detailedToggle}
              onPress={toggleDetailedRatings}
              activeOpacity={0.7}
            >
              <Text style={styles(colors).detailedToggleText}>
                {showDetailedRatings
                  ? "Hide detailed ratings"
                  : "Show detailed ratings"}
              </Text>
              <Ionicons
                name={showDetailedRatings ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

          {/* Collapsible Detailed Ratings */}
          {aspectConfig.length > 0 && (
            <Animated.View
              style={[
                styles(colors).detailedSection,
                {
                  maxHeight: expandAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 600], // Adjust based on content
                  }),
                  opacity: expandAnimation,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={styles(colors).aspectsList}>
                {aspectConfig.map((aspect) => (
                  <View key={aspect.key} style={styles(colors).aspectItem}>
                    <View style={styles(colors).aspectInfo}>
                      <Text style={styles(colors).aspectLabel}>
                        {aspect.label}
                      </Text>
                      {aspect.description && (
                        <Text style={styles(colors).aspectDescription}>
                          {aspect.description}
                        </Text>
                      )}
                    </View>
                    <StarRating
                      value={aspectRatings[aspect.key] || 0}
                      onChange={(rating) =>
                        handleAspectRatingChange(aspect.key, rating)
                      }
                      size={24}
                    />
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Consent Message */}
          <View style={styles(colors).consentSection}>
            <Text style={styles(colors).consentText}>
              By submitting this review, you consent to sharing your feedback publicly to help other customers make informed decisions. Your review may be displayed on our platform.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles(colors).footer}>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            style={[styles(colors).button, styles(colors).cancelButton]}
          >
            <Text style={styles(colors).cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || overallRating === 0}
            style={[
              styles(colors).button,
              styles(colors).submitButton,
              (isSubmitting || overallRating === 0) &&
                styles(colors).disabledButton,
            ]}
          >
            <Text
              style={[
                styles(colors).submitButtonText,
                (isSubmitting || overallRating === 0) &&
                  styles(colors).disabledText,
              ]}
            >
              {isSubmitting
                ? "Submitting..."
                : existingRating
                ? "Update review"
                : "Leave review"}
            </Text>
          </TouchableOpacity>
        </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = (colors) =>
  createStylesWithDMSans({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    container: {
      height: screenHeight * 0.78,
      backgroundColor: colors.background || "#FFFFFF",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: "hidden",
    },
    modalContent: {
      flex: 1,
    },
    header: {
      alignItems: "flex-end",
      justifyContent: "flex-end",
      padding: 20,
      paddingTop: Platform.OS === "ios" ? 60 : 20,
    },
    closeButton: {
      padding: 4,
      backgroundColor: colors.cardBackground || "#F9FAFB",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      flexGrow: 1,
    },
    titleSection: {
      alignItems: "center",
      marginBottom: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.text || "#111827",
      textAlign: "center",
      marginBottom: 8,
    },
    entityName: {
      fontSize: 18,
      fontWeight: "500",
      color: colors.textSecondary || "#6B7280",
      textAlign: "center",
    },
    section: {
      marginBottom: 24,
    },
    ratingContainer: {
      alignItems: "center",
      // paddingVertical: 24,
    },
    overallRating: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    feedbackSection: {
      alignItems: "center",
      marginBottom: 32,
      paddingHorizontal: 20,
    },
    feedbackText: {
      fontSize: 14,
      color: colors.textSecondary || "#6B7280",
      textAlign: "center",
      lineHeight: 20,
    },
    detailedToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      marginBottom: 6,
      gap: 8,
    },
    detailedToggleText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.primary,
    },
    detailedSection: {
      marginBottom: 24,
    },
    aspectsList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
    },
    aspectItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || "#E5E7EB",
    },
    aspectInfo: {
      flex: 1,
      paddingRight: 16,
    },
    aspectLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text || "#374151",
    },
    aspectDescription: {
      fontSize: 12,
      color: colors.textSecondary || "#6B7280",
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text || "#374151",
      marginBottom: 12,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border || "#D1D5DB",
      borderRadius: 15,
      padding: 12,
      fontSize: 14,
      color: colors.text || "#111827",
      backgroundColor: colors.background || "#FFFFFF",
      minHeight: 100,
    },
    characterCount: {
      fontSize: 12,
      color: "#6B7280",
      textAlign: "right",
      marginTop: 4,
    },
    consentSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      marginTop: 16,
      marginBottom: 20,
    },
    consentText: {
      fontSize: 12,
      color: colors.textSecondary || "#6B7280",
      textAlign: "center",
      lineHeight: 16,
      fontStyle: "italic",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.border || "#F3F4F6",
      backgroundColor: colors.cardBackground || "#F9FAFB",
      minHeight: 60,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButton: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border ,
      marginRight: 8,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary ,
    },
    submitButton: {
      backgroundColor: colors.black,
      marginLeft: 8,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.white,
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledText: {
      opacity: 0.5,
    },
  });

export default RatingModal;
