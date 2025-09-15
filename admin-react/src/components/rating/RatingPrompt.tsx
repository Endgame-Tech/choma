import React, { useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import StarRating from './StarRating';
import RatingModal from './RatingModal';
import { ratingApi } from '../../services/ratingApi';

interface RatingData {
  ratingType: string;
  ratedEntity: string;
  ratedEntityType: string;
  overallRating: number;
  aspectRatings?: { [key: string]: number | null };
  comment?: string;
  tags?: string[];
  contextData?: Record<string, unknown>;
}

interface RatingPromptData {
  triggerId: string;
  triggerType: string;
  triggerScore: number;
  ratingType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  contextData?: Record<string, unknown>;
  title: string;
  description: string;
}

interface RatingPromptProps {
  promptData?: RatingPromptData;
  onResponse?: (response: string, triggerId: string, ratingId?: string) => void;
  onDismiss?: () => void;
  className?: string;
  position?: 'top' | 'bottom' | 'center';
}

const RatingPrompt: React.FC<RatingPromptProps> = ({
  promptData,
  onResponse,
  onDismiss,
  className = '',
  position = 'bottom'
}) => {
  const [visible, setVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [quickRating, setQuickRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (promptData) {
      setVisible(true);
    }
  }, [promptData]);

  const handleQuickRating = async (rating: number) => {
    if (isSubmitting || !promptData) return;

    setQuickRating(rating);
    setIsSubmitting(true);

    try {
      // Create quick rating
      const ratingData = {
        ratingType: promptData.ratingType,
        ratedEntity: promptData.entityId,
        ratedEntityType: promptData.entityType,
        overallRating: rating,
        comment: rating >= 4 ? 'Quick positive rating' : rating <= 2 ? 'Quick negative rating' : 'Quick neutral rating'
      };

      const response = await ratingApi.createRating(ratingData);

      if (response.success) {
        hidePrompt();
        onResponse?.('completed', promptData.triggerId, response.data._id);
      } else {
        throw new Error(response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting quick rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedRating = () => {
    setRatingModalVisible(true);
  };

  const handleModalSubmit = async (ratingData: RatingData) => {
    if (!promptData) return;

    try {
      // Transform RatingData to CreateRatingData format
      const createRatingData = {
        ...ratingData,
        aspectRatings: ratingData.aspectRatings
          ? Object.fromEntries(
            Object.entries(ratingData.aspectRatings).filter(([, value]) => value !== null)
          ) as { [key: string]: number }
          : undefined
      };

      const response = await ratingApi.createRating(createRatingData);

      if (response.success) {
        setRatingModalVisible(false);
        hidePrompt();
        onResponse?.('completed', promptData.triggerId, response.data._id);
      } else {
        throw new Error(response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting detailed rating:', error);
      throw error;
    }
  };

  const hidePrompt = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const handleDismiss = () => {
    if (!promptData) return;
    hidePrompt();
    onResponse?.('dismissed', promptData.triggerId);
  };

  const handlePostpone = () => {
    if (!promptData) return;
    hidePrompt();
    onResponse?.('postponed', promptData.triggerId);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-4 left-4 right-4';
    }
  };

  if (!promptData) {
    return null;
  }

  return (
    <>
      <Transition
        show={visible}
        enter="transition-all duration-300 ease-out"
        enterFrom={position === 'bottom' ? 'translate-y-full opacity-0' :
          position === 'top' ? '-translate-y-full opacity-0' :
            'scale-95 opacity-0'}
        enterTo="translate-y-0 opacity-100 scale-100"
        leave="transition-all duration-300 ease-in"
        leaveFrom="translate-y-0 opacity-100 scale-100"
        leaveTo={position === 'bottom' ? 'translate-y-full opacity-0' :
          position === 'top' ? '-translate-y-full opacity-0' :
            'scale-95 opacity-0'}
      >
        <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {promptData.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {promptData.description}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
                aria-label="Close rating prompt"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Rating */}
            <div className="text-center mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick rating:
              </label>
              <StarRating
                value={quickRating}
                onChange={handleQuickRating}
                size="large"
                disabled={isSubmitting}
                className="justify-center"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleDetailedRating}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Details
              </button>

              <button
                onClick={handlePostpone}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Later
              </button>
            </div>

          </div>
        </div>
      </Transition>

      {/* Detailed Rating Modal */}
      <RatingModal
        isOpen={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleModalSubmit}
        ratingType={promptData.ratingType}
        entityType={promptData.entityType}
        entityId={promptData.entityId}
        entityName={promptData.entityName}
        contextData={promptData.contextData}
        title={promptData.title}
        description={promptData.description}
      />
    </>
  );
};

export default RatingPrompt;