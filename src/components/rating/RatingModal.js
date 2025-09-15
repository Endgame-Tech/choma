import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';

const ASPECT_CONFIGS = {
  meal_plan: [
    { key: 'taste', label: 'Taste', description: 'How did the food taste?' },
    { key: 'presentation', label: 'Presentation', description: 'How was the visual presentation?' },
    { key: 'portionSize', label: 'Portion Size', description: 'Was the portion size appropriate?' },
    { key: 'valueForMoney', label: 'Value for Money', description: 'Was it worth the price?' },
    { key: 'healthiness', label: 'Healthiness', description: 'How healthy was the meal?' }
  ],
  chef_performance: [
    { key: 'cookingQuality', label: 'Cooking Quality', description: 'How well was the food prepared?' },
    { key: 'consistency', label: 'Consistency', description: 'How consistent is the chef?' },
    { key: 'communication', label: 'Communication', description: 'How was the communication?' },
    { key: 'punctuality', label: 'Punctuality', description: 'Was the chef on time?' },
    { key: 'professionalism', label: 'Professionalism', description: 'How professional was the chef?' }
  ],
  driver_service: [
    { key: 'timeliness', label: 'Timeliness', description: 'Was the delivery on time?' },
    { key: 'courteous', label: 'Courtesy', description: 'How courteous was the driver?' },
    { key: 'packaging', label: 'Packaging', description: 'How was the food packaged?' },
    { key: 'tracking', label: 'Tracking', description: 'How accurate was the tracking?' }
  ],
  delivery_experience: [
    { key: 'temperature', label: 'Temperature', description: 'Was the food at the right temperature?' },
    { key: 'condition', label: 'Condition', description: 'What condition was the food in?' },
    { key: 'accuracy', label: 'Accuracy', description: 'Was the order accurate?' }
  ],
  app_experience: [
    { key: 'easeOfUse', label: 'Ease of Use', description: 'How easy was the app to use?' },
    { key: 'performance', label: 'Performance', description: 'How well did the app perform?' },
    { key: 'design', label: 'Design', description: 'How was the app design?' },
    { key: 'features', label: 'Features', description: 'How useful were the features?' }
  ]
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
  loading = false
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState({});
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get aspect configuration based on rating type
  const aspectConfig = aspects ? 
    aspects.map(aspect => ({ key: aspect, label: aspect, description: '' })) :
    ASPECT_CONFIGS[ratingType] || [];

  // Initialize form with existing rating data
  useEffect(() => {
    if (existingRating) {
      setOverallRating(existingRating.overallRating || 0);
      setAspectRatings(existingRating.aspectRatings || {});
      setComment(existingRating.comment || '');
      setTags(existingRating.tags || []);
    } else {
      // Reset form for new rating
      setOverallRating(0);
      setAspectRatings({});
      setComment('');
      setTags([]);
    }
  }, [existingRating, visible]);

  const handleAspectRatingChange = (aspectKey, rating) => {
    setAspectRatings(prev => ({
      ...prev,
      [aspectKey]: rating
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags(prev => [...prev, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const ratingData = {
        ratingType,
        ratedEntity: entityId,
        ratedEntityType: entityType,
        overallRating,
        aspectRatings: Object.keys(aspectRatings).length > 0 ? aspectRatings : undefined,
        comment: comment.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        contextData
      };

      await onSubmit(ratingData);
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = title || `Rate ${entityName || entityType}`;
  const modalDescription = description || `Share your experience with this ${entityType}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{modalTitle}</Text>
            <Text style={styles.description}>{modalDescription}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Overall Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Rating *</Text>
            <View style={styles.ratingContainer}>
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                size={32}
                showValue
                style={styles.overallRating}
              />
            </View>
          </View>

          {/* Aspect Ratings */}
          {aspectConfig.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detailed Ratings</Text>
              {aspectConfig.map(aspect => (
                <View key={aspect.key} style={styles.aspectItem}>
                  <View style={styles.aspectInfo}>
                    <Text style={styles.aspectLabel}>{aspect.label}</Text>
                    {aspect.description && (
                      <Text style={styles.aspectDescription}>{aspect.description}</Text>
                    )}
                  </View>
                  <StarRating
                    value={aspectRatings[aspect.key] || 0}
                    onChange={(rating) => handleAspectRatingChange(aspect.key, rating)}
                    size={24}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments (Optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={1000}
              placeholder="Share your thoughts about this experience..."
              style={styles.textInput}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{comment.length}/1000 characters</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags (Optional)</Text>
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                      <Ionicons name="close-circle" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.tagInputContainer}>
              <TextInput
                value={currentTag}
                onChangeText={setCurrentTag}
                placeholder="Add a tag..."
                style={styles.tagInput}
                returnKeyType="done"
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity
                onPress={handleAddTag}
                disabled={!currentTag.trim()}
                style={[styles.addTagButton, !currentTag.trim() && styles.disabledButton]}
              >
                <Text style={[styles.addTagText, !currentTag.trim() && styles.disabledText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSubmitting}
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || overallRating === 0}
            style={[styles.button, styles.submitButton, (isSubmitting || overallRating === 0) && styles.disabledButton]}
          >
            <Text style={[styles.submitButtonText, (isSubmitting || overallRating === 0) && styles.disabledText]}>
              {isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  overallRating: {
    alignItems: 'center',
  },
  aspectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aspectInfo: {
    flex: 1,
    paddingRight: 16,
  },
  aspectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  aspectDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#1D4ED8',
    marginRight: 4,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  addTagButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  addTagText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    backgroundColor: '#F9FAFB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    marginLeft: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default RatingModal;