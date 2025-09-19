import React, { useState, useEffect } from 'react';
import { tagsApi, type Tag } from '../services/tagApi';

interface TagSelectorProps {
  selectedTagId?: string;
  onTagChange: (tagId: string) => void;
  className?: string;
  showCreateButton?: boolean;
  onCreateTag?: () => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTagId = '',
  onTagChange,
  className = '',
  showCreateButton = false,
  onCreateTag
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tagsApi.getAllTags();
      if (response.success) {
        setTags(response.data || []);
      } else {
        setError('Failed to fetch tags');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const selectedTag = tags.find(tag => tag._id === selectedTagId);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
          Tag (Optional)
        </label>
        <div className="flex items-center justify-center py-4">
          <i className="fi fi-sr-loading animate-spin mr-2"></i>
          <span className="text-sm text-gray-600 dark:text-neutral-400">Loading tags...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
          Tag (Optional)
        </label>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          <button
            onClick={fetchTags}
            className="mt-2 text-xs text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200">
          Tag (Optional)
        </label>
        {showCreateButton && onCreateTag && (
          <button
            type="button"
            onClick={onCreateTag}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <i className="fi fi-sr-plus text-xs"></i>
            Create New Tag
          </button>
        )}
      </div>

      {/* Current Tag Display */}
      {selectedTag && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-3">
            {selectedTag.image ? (
              <img
                src={selectedTag.image}
                alt={selectedTag.name}
                className="w-8 h-8 rounded object-cover bg-gray-200 dark:bg-neutral-600"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-200 dark:bg-neutral-600 flex items-center justify-center">
                <i className="fi fi-sr-tag text-gray-400 text-sm"></i>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Current Tag: {selectedTag.name}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {selectedTag.mealPlanCount || 0} meal plan{(selectedTag.mealPlanCount || 0) !== 1 ? 's' : ''} • Sort Order: {selectedTag.sortOrder}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTagChange('')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              title="Remove tag"
            >
              <i className="fi fi-sr-cross text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* Tag Selection */}
      {tags.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-600">
          <div className="text-gray-400 dark:text-neutral-500 text-2xl mb-2">
            <i className="fi fi-sr-tags"></i>
          </div>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-2">No tags available</p>
          {showCreateButton && onCreateTag && (
            <button
              type="button"
              onClick={onCreateTag}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Create your first tag
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Available Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* No Tag Option */}
            <button
              type="button"
              onClick={() => onTagChange('')}
              className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${!selectedTagId
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-500'
                }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                <i className="fi fi-sr-cross text-gray-400 text-lg"></i>
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium text-sm ${!selectedTagId ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  No Tag
                </p>
                <p className={`text-xs ${!selectedTagId ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                  Default category
                </p>
              </div>
              {!selectedTagId && (
                <i className="fi fi-sr-check text-blue-600 dark:text-blue-400"></i>
              )}
            </button>

            {/* Tag Options */}
            {tags.map((tag) => (
              <button
                key={tag._id}
                type="button"
                onClick={() => onTagChange(tag._id)}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${selectedTagId === tag._id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-500'
                  }`}
              >
                {tag.image ? (
                  <img
                    src={tag.image}
                    alt={tag.name}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-200 dark:bg-neutral-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-neutral-600 flex items-center justify-center">
                    <i className="fi fi-sr-tag text-gray-400"></i>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className={`font-medium text-sm ${selectedTagId === tag._id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    {tag.name}
                  </p>
                  <p className={`text-xs ${selectedTagId === tag._id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                    {tag.mealPlanCount || 0} plan{(tag.mealPlanCount || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                {selectedTagId === tag._id && (
                  <i className="fi fi-sr-check text-blue-600 dark:text-blue-400"></i>
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Select a tag to categorize this meal plan for easier filtering on the home screen. Tags help customers discover relevant meal plans.
          </p>
        </>
      )}
    </div>
  );
};

export default TagSelector;