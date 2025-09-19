import React, { useState, useEffect } from 'react';
import { tagsApi, type Tag, type CreateTagData, type UpdateTagData } from '../services/tagApi';
import CreateTagModal from './CreateTagModal';
import EditTagModal from './EditTagModal';

interface ViewTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ViewTagsModal: React.FC<ViewTagsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

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

  const handleCreateTag = async (tagData: CreateTagData) => {
    try {
      setIsCreating(true);
      await tagsApi.createTag(tagData);
      setCreateModalOpen(false);
      // Refresh the tags list
      await fetchTags();
      // Show success notification
      const successEvent = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          message: `Tag "${tagData.name}" created successfully!`
        }
      });
      window.dispatchEvent(successEvent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag';
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTag = async (tagData: UpdateTagData) => {
    if (!selectedTag) return;

    try {
      setIsUpdating(true);
      await tagsApi.updateTag(selectedTag._id, tagData);
      setEditModalOpen(false);
      setSelectedTag(null);
      // Refresh the tags list
      await fetchTags();
      // Show success notification
      const successEvent = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          message: `Tag "${tagData.name}" updated successfully!`
        }
      });
      window.dispatchEvent(successEvent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      throw new Error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    // Check if tag has meal plans associated with it
    if (tag.mealPlanCount && tag.mealPlanCount > 0) {
      const shouldRemoveFromMealPlans = confirm(
        `This tag "${tag.name}" is currently used by ${tag.mealPlanCount} meal plan(s).\n\n` +
        `Click OK to remove the tag from all meal plans and then delete it.\n` +
        `Click Cancel to abort the deletion.`
      );

      if (!shouldRemoveFromMealPlans) {
        return;
      }

      try {
        // First remove the tag from all meal plans
        const removeResult = await tagsApi.removeTagFromAllMealPlans(tag._id);

        if (removeResult.success) {
          // Show notification about removal
          const removeEvent = new CustomEvent('show-notification', {
            detail: {
              type: 'info',
              message: `Tag removed from ${removeResult.updatedCount} meal plan(s). Now deleting the tag...`
            }
          });
          window.dispatchEvent(removeEvent);

          // Small delay to show the notification
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove tag from meal plans';
        const errorEvent = new CustomEvent('show-notification', {
          detail: {
            type: 'error',
            message: `Failed to remove tag from meal plans: ${errorMessage}`
          }
        });
        window.dispatchEvent(errorEvent);
        return;
      }
    } else {
      // Tag has no meal plans, just confirm deletion
      if (!confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
        return;
      }
    }

    try {
      await tagsApi.deleteTag(tag._id);
      // Refresh the tags list
      await fetchTags();
      // Show success notification
      const successEvent = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          message: `Tag "${tag.name}" deleted successfully!`
        }
      });
      window.dispatchEvent(successEvent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      const errorEvent = new CustomEvent('show-notification', {
        detail: {
          type: 'error',
          message: errorMessage
        }
      });
      window.dispatchEvent(errorEvent);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tags Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View and manage tags for organizing meal plans ({tags.length} total)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              >
                <i className="fi fi-sr-plus mr-2"></i>
                Create Tag
              </button>
              <button
                onClick={onClose}
                title="Close modal"
                aria-label="Close modal"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <i className="fi fi-sr-cross text-xl"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-neutral-200">Loading tags...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-400 dark:text-red-300 mr-3">
                    <i className="fi fi-sr-warning"></i>
                  </div>
                  <div>
                    <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading tags</h3>
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                    <button
                      onClick={fetchTags}
                      className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">
                  <i className="fi fi-sr-tags text-gray-400"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">
                  No tags found
                </h3>
                <p className="text-gray-500 dark:text-neutral-200 mb-4">
                  Create your first tag to start organizing meal plans.
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800"
                >
                  <i className="fi fi-sr-plus mr-2"></i>
                  Create First Tag
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tags.map((tag) => (
                  <div
                    key={tag._id}
                    className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4 border border-gray-200 dark:border-neutral-600 hover:shadow-md transition-shadow"
                  >
                    {/* Tag Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {tag.image ? (
                          <img
                            src={tag.image}
                            alt={tag.name}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-200 dark:bg-neutral-600"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-neutral-600 flex items-center justify-center">
                            <i className="fi fi-sr-tag text-gray-400 text-xl"></i>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {tag.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {tag.tagId}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedTag(tag);
                            setEditModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Edit tag"
                        >
                          <i className="fi fi-sr-edit text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Delete tag"
                        >
                          <i className="fi fi-sr-trash text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* Tag Description */}
                    {tag.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {tag.description}
                      </p>
                    )}

                    {/* Meal Plan Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fi fi-sr-clipboard-list text-blue-500 text-sm"></i>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tag.mealPlanCount || 0} meal plans
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tag.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                        }`}>
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Sort Order */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-neutral-600">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Sort Order: {tag.sortOrder}</span>
                        <span>Created: {new Date(tag.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTag}
        loading={isCreating}
      />

      {/* Edit Tag Modal */}
      {selectedTag && (
        <EditTagModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedTag(null);
          }}
          onSubmit={handleEditTag}
          tag={selectedTag}
          loading={isUpdating}
        />
      )}
    </>
  );
};

export default ViewTagsModal;