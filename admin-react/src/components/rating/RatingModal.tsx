import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import StarRating from './StarRating';

interface AspectRating {
  [key: string]: number | null;
}

interface RatingData {
  ratingType: string;
  ratedEntity: string;
  ratedEntityType: string;
  overallRating: number;
  aspectRatings?: AspectRating;
  comment?: string;
  tags?: string[];
  contextData?: Record<string, unknown>;
}

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ratingData: RatingData) => Promise<void>;
  ratingType: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  contextData?: Record<string, unknown>;
  existingRating?: Partial<RatingData> & { aspectRatings?: AspectRating };
  aspects?: string[];
  title?: string;
  description?: string;
  loading?: boolean;
}

const ASPECT_CONFIGS: Record<string, { key: string; label: string; description: string }[]> = {
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

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
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
  // loading = false
}) => {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [aspectRatings, setAspectRatings] = useState<AspectRating>({});
  const [comment, setComment] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState<string>('');
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
  }, [existingRating, isOpen]);

  const handleAspectRatingChange = (aspectKey: string, rating: number) => {
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

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      alert('Please provide an overall rating');
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
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = title || `Rate ${entityName || entityType}`;
  const modalDescription = description || `Share your experience with this ${entityType}`;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {modalTitle}
              </Dialog.Title>
              <p className="text-sm text-gray-600 mt-1">
                {modalDescription}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close rating modal"
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating *
              </label>
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                size="large"
                showValue
                className="justify-center"
              />
            </div>

            {/* Aspect Ratings */}
            {aspectConfig.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Detailed Ratings
                </label>
                <div className="space-y-4">
                  {aspectConfig.map(aspect => (
                    <div key={aspect.key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">
                          {aspect.label}
                        </div>
                        {aspect.description && (
                          <div className="text-xs text-gray-500">
                            {aspect.description}
                          </div>
                        )}
                      </div>
                      <StarRating
                        value={aspectRatings[aspect.key] || 0}
                        onChange={(rating) => handleAspectRatingChange(aspect.key, rating)}
                        size="medium"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your thoughts about this experience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 mt-1">
                {comment.length}/1000 characters
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!currentTag.trim()}
                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || overallRating === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default RatingModal;