import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import { type Tag, type UpdateTagData } from '../services/tagApi';

interface EditTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tagData: UpdateTagData) => Promise<void>;
  tag: Tag;
  loading?: boolean;
}

const EditTagModal: React.FC<EditTagModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tag,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    sortOrder: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when tag changes
  useEffect(() => {
    if (tag && isOpen) {
      setFormData({
        name: tag.name || '',
        image: tag.image || '',
        description: tag.description || '',
        sortOrder: tag.sortOrder || 0
      });
    }
  }, [tag, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));

    // Clear image error
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Tag name must be 50 characters or less';
    }

    if (!formData.image) {
      newErrors.image = 'Tag image is required';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error updating tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      image: '',
      description: '',
      sortOrder: 0
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || !tag) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Tag</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update tag "{tag.name}" information
            </p>
          </div>
          <button
            onClick={handleClose}
            title="Close modal"
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <i className="fi fi-sr-cross text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tag Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tag Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter tag name (e.g., Popular, Healthy, Quick)"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Tag Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tag Image *
            </label>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📐 <strong>Design Guidelines:</strong><br/>
                • Upload any image - it will be cropped to square (1:1 aspect ratio)<br/>
                • Final size will be optimized to 400x400px<br/>
                • Perfect for icons, logos, or simple graphics<br/>
                • Cropping tool will help you select the best square area<br/>
                • Supports JPG, PNG, and WebP formats
              </p>
            </div>
            <ImageUpload
              onImageUpload={handleImageUpload}
              currentImageUrl={formData.image}
              label="Upload Tag Image"
              className="w-full"
              enableCropping={true}
              cropAspectRatio={1}
              maxSizeMB={5}
              uploadEndpoint="/upload/tag-image"
            />
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of this tag"
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              maxLength={200}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/200 characters
            </p>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort Order
            </label>
            <input
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first in the tag list (0 = highest priority)
            </p>
          </div>

          {/* Tag Info */}
          <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Tag Information</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300">
              <div>
                <span className="font-medium">ID:</span> {tag.tagId}
              </div>
              <div>
                <span className="font-medium">Meal Plans:</span> {tag.mealPlanCount || 0}
              </div>
              <div>
                <span className="font-medium">Status:</span> {tag.isActive ? 'Active' : 'Inactive'}
              </div>
              <div>
                <span className="font-medium">Created:</span> {new Date(tag.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting || loading ? (
                <>
                  <i className="fi fi-sr-loading animate-spin mr-2"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fi fi-sr-check mr-2"></i>
                  Update Tag
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTagModal;