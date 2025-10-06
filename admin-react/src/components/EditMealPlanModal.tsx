import React from 'react'
import { useState, useEffect } from 'react'
import type { MealPlan as ApiMealPlan } from '../services/mealApi'
import type { MealPlan as UiMealPlan } from '../types'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ImageUpload from './ImageUpload'
import TagSelector from './TagSelector'
import { mealPlansApi } from '../services/mealApi'

interface EditMealPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (planData: Partial<ApiMealPlan>) => Promise<void>
  mealPlan: UiMealPlan
}

const targetAudiences = [
  'Fitness',
  'Professional',
  'Family',
  'Wellness',
  'Weight Loss',
  'Muscle Gain',
  'Diabetic Friendly',
  'Heart Healthy'
]

const EditMealPlanModal: React.FC<EditMealPlanModalProps> = ({ isOpen, onClose, onSubmit, mealPlan }) => {
  const [formData, setFormData] = useState({
    planName: '',
    description: '',
    coverImage: '',
    durationWeeks: '4',
    tier: 'Silver',
    targetAudience: 'Family',
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    planFeatures: '',
    adminNotes: '',
    tagId: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [detailedMealPlan, setDetailedMealPlan] = useState<UiMealPlan | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Narrow the incoming mealPlan (UI type) to a record for safe runtime checks
  const mealPlanRec = mealPlan as unknown as Record<string, unknown>

  // Fetch detailed meal plan data when modal opens
  useEffect(() => {
    if (isOpen && mealPlan?._id) {
      fetchMealPlanDetails()
    }
  }, [isOpen, mealPlan?._id])

  const fetchMealPlanDetails = async () => {
    if (!mealPlan?._id) return

    try {
      setLoadingDetails(true)
      const response = await mealPlansApi.getMealPlanDetails(mealPlan._id)
      if (response.success && response.data) {
        setDetailedMealPlan(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch meal plan details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Update form data when meal plan changes
  useEffect(() => {
    // Use detailed meal plan data if available, otherwise fall back to the passed mealPlan
    // Note: detailedMealPlan comes from API response with nested structure
    const mealPlanData = detailedMealPlan?.mealPlan || mealPlan
    if (mealPlanData) {

      // Handle tagId extraction more carefully
      let extractedTagId = '';
      const mealPlanAny = mealPlanData as Record<string, unknown>;

      if (mealPlanAny.tagId) {
        if (typeof mealPlanAny.tagId === 'string') {
          extractedTagId = mealPlanAny.tagId;
        } else if (typeof mealPlanAny.tagId === 'object' && mealPlanAny.tagId !== null) {
          // Handle populated tag object from backend
          const tagObject = mealPlanAny.tagId as { _id: string; name: string; image?: string };
          extractedTagId = tagObject._id;
        }
      } else {
        // Check alternative field names for backwards compatibility
        if (mealPlanAny.tag) {
          if (typeof mealPlanAny.tag === 'string') {
            extractedTagId = mealPlanAny.tag;
          } else if (typeof mealPlanAny.tag === 'object' && mealPlanAny.tag !== null && '_id' in mealPlanAny.tag) {
            extractedTagId = String((mealPlanAny.tag as { _id: string })._id);
          }
        } else if (Array.isArray(mealPlanAny.tags) && mealPlanAny.tags.length > 0) {
          // Handle tags array (legacy)
          const firstTag = mealPlanAny.tags[0];
          if (typeof firstTag === 'string') {
            extractedTagId = firstTag;
          } else if (typeof firstTag === 'object' && firstTag !== null && '_id' in firstTag) {
            extractedTagId = String((firstTag as { _id: string })._id);
          }
        }
      }

      setFormData({
        planName: typeof mealPlanAny.planName === 'string' ? mealPlanAny.planName as string : '',
        description: typeof mealPlanAny.description === 'string' ? mealPlanAny.description as string : '',
        coverImage: typeof mealPlanAny.coverImage === 'string' ? mealPlanAny.coverImage as string : '',
        durationWeeks: typeof mealPlanAny.durationWeeks === 'number' ? String(mealPlanAny.durationWeeks as number) : (typeof mealPlanAny.durationWeeks === 'string' ? mealPlanAny.durationWeeks as string : '4'),
        tier: typeof mealPlanAny.tier === 'string' ? mealPlanAny.tier as string : 'Silver',
        targetAudience: typeof mealPlanAny.targetAudience === 'string' ? mealPlanAny.targetAudience as string : 'Family',
        mealTypes: Array.isArray(mealPlanAny.mealTypes) && mealPlanAny.mealTypes.length > 0
          ? (mealPlanAny.mealTypes as string[])
          : ['breakfast', 'lunch', 'dinner'],
        planFeatures: Array.isArray(mealPlanAny.planFeatures) ? (mealPlanAny.planFeatures as string[]).join(', ') : (typeof mealPlanAny.planFeatures === 'string' ? mealPlanAny.planFeatures as string : ''),
        adminNotes: typeof mealPlanAny.adminNotes === 'string' ? mealPlanAny.adminNotes as string : '',
        tagId: extractedTagId
      })

    }
  }, [mealPlan, detailedMealPlan])

  // Fetch tags when modal opens

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMealTypeChange = (mealType: string) => {
    setFormData(prev => ({
      ...prev,
      mealTypes: prev.mealTypes.includes(mealType)
        ? prev.mealTypes.filter(type => type !== mealType)
        : [...prev.mealTypes, mealType]
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.planName || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.mealTypes.length === 0) {
      alert('Please select at least one meal type (Breakfast, Lunch, or Dinner)')
      return
    }

    setSubmitting(true)
    try {
      const planData: Partial<ApiMealPlan> = {
        planName: formData.planName,
        description: formData.description,
        coverImage: formData.coverImage,
        durationWeeks: parseInt(formData.durationWeeks),
        tier: formData.tier,
        targetAudience: formData.targetAudience,
        mealTypes: formData.mealTypes,
        planFeatures: formData.planFeatures.split(',').map(feature => feature.trim()).filter(feature => feature),
        adminNotes: formData.adminNotes,
        tagId: formData.tagId || undefined
      }

      await onSubmit(planData)
    } catch (error) {
      console.error('Failed to update meal plan:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Edit Meal Plan</h2>
              <p className="text-sm text-gray-600 dark:text-neutral-300">ID: {mealPlan.planId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-neutral-400 hover:text-gray-600 dark:hover:text-neutral-200"
              disabled={submitting}
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Loading indicator for detailed data */}
        {loadingDetails && (
          <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-300">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>Loading tag information...</span>
            </div>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-neutral-100">Current Status</h3>
                  <p className="text-sm text-gray-600 dark:text-neutral-300">Last updated: {mealPlanRec.updatedAt ? new Date(String(mealPlanRec.updatedAt)).toLocaleString() : '—'}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${mealPlan.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {mealPlan.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <div className="text-sm text-gray-600">
                    <div>Current Price: {formatCurrency(Number(mealPlanRec.totalPrice ?? 0))}</div>
                    <div>Meals Assigned: {Number(mealPlanRec.assignmentCount ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  name="planName"
                  value={formData.planName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 30-Day Weight Loss Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this meal plan offers, who it's for, and what makes it special..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Cover Image
                </label>

                {/* Current Image Preview */}
                {formData.coverImage && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 dark:text-neutral-300 mb-2">Current Cover Image:</div>
                    <div className="relative w-full max-w-md mx-auto">
                      <img
                        src={formData.coverImage}
                        alt="Meal plan cover"
                        className="w-full h-auto object-cover rounded-lg shadow-md border border-gray-200 dark:border-neutral-600"
                        style={{ aspectRatio: '1080/1350' }}
                        onError={(e) => {
                          console.error('Failed to load image:', formData.coverImage);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Image Upload */}
                <ImageUpload
                  currentImageUrl={formData.coverImage}
                  onImageUpload={(imageUrl) => setFormData(prev => ({ ...prev, coverImage: imageUrl }))}
                  uploadEndpoint="/upload/meal-plan-image"
                  label={formData.coverImage ? "Change Cover Image" : "Upload Cover Image"}
                  className="w-full"
                  enableCropping={true}
                  cropAspectRatio={1080 / 1350}
                />

                {!formData.coverImage && (
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600 text-center">
                    <div className="text-gray-400 dark:text-neutral-400 text-sm">
                      📸 No cover image selected
                    </div>
                    <div className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                      Upload an image to see it displayed here
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Configuration */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">📅 Plan Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Duration *
                  </label>
                  <select
                    name="durationWeeks"
                    value={formData.durationWeeks}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Duration in weeks"
                    title="Duration in weeks"
                  >
                    <option value="1">1 Week</option>
                    <option value="2">2 Weeks</option>
                    <option value="3">3 Weeks</option>
                    <option value="4">4 Weeks</option>
                  </select>
                  <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                    Current: {mealPlan.durationWeeks} week(s) → New: {parseInt(formData.durationWeeks)} week(s)
                    {parseInt(formData.durationWeeks) !== mealPlan.durationWeeks && (
                      <span className="text-orange-600 dark:text-orange-400 ml-1">
                        ⚠️ Changing duration may affect meal assignments
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Tier *
                  </label>
                  <select
                    name="tier"
                    value={formData.tier}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Premium">💎 Premium</option>
                    <option value="Gold">🥇 Gold</option>
                    <option value="Silver">🥈 Silver</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                    Plan category level
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Target Audience *
                  </label>
                  <select
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {targetAudiences.map(audience => (
                      <option key={audience} value={audience}>{audience}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Meal Types Selection */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-3">
                  Meal Types * <span className="text-xs text-gray-500 dark:text-neutral-400">(Select which meals this plan covers)</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
                    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
                    { id: 'dinner', label: 'Dinner', emoji: '🌙' }
                  ].map(mealType => (
                    <label
                      key={mealType.id}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${formData.mealTypes.includes(mealType.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-500 text-gray-700 dark:text-neutral-200'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.mealTypes.includes(mealType.id)}
                        onChange={() => handleMealTypeChange(mealType.id)}
                        className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-lg">{mealType.emoji}</span>
                      <span className="font-medium">{mealType.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                  Selected: {formData.mealTypes.length} meal type{formData.mealTypes.length !== 1 ? 's' : ''}
                  {formData.mealTypes.length > 0 && (
                    <span className="ml-1">
                      ({formData.mealTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Plan Stats */}
            {mealPlan.stats && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-3">📊 Current Plan Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{mealPlan.stats.totalDays}</div>
                    <div className="text-gray-600 dark:text-neutral-300">Total Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{mealPlan.assignmentCount || 0}</div>
                    <div className="text-gray-600 dark:text-neutral-300">Meals Assigned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{mealPlan.stats.avgMealsPerDay}</div>
                    <div className="text-gray-600 dark:text-neutral-300">Avg Meals/Day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {mealPlan.nutritionInfo && typeof mealPlan.nutritionInfo.avgCaloriesPerDay === 'number' && mealPlan.nutritionInfo.avgCaloriesPerDay > 0 ? mealPlan.nutritionInfo.avgCaloriesPerDay : '—'}
                    </div>
                    <div className="text-gray-600 dark:text-neutral-300">Avg Cal/Day</div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                Plan Features (comma-separated)
              </label>
              <input
                type="text"
                name="planFeatures"
                value={formData.planFeatures}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., High Protein, Low Carb, Dairy Free, Quick Prep"
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                These features will help customers find the right plan for their needs
              </p>
            </div>

            {/* Tag Selection */}
            <TagSelector
              selectedTagId={formData.tagId}
              onTagChange={(tagId) => setFormData(prev => ({ ...prev, tagId }))}
              showCreateButton={true}
              onCreateTag={() => {
                // You could open a tag creation modal here if needed
                alert('Tag creation from this modal is not yet implemented. Please use the View Tags button in the main meal plans page.');
              }}
            />

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                Admin Notes
              </label>
              <textarea
                name="adminNotes"
                value={formData.adminNotes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Internal notes about this meal plan..."
              />
            </div>

            {/* Publishing Warning */}
            {mealPlan.isPublished && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <h3 className="text-orange-800 dark:text-orange-300 font-medium mb-2">⚠️ Published Plan Notice</h3>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  This meal plan is currently live in the mobile app. Changes will be visible to customers immediately after saving.
                  Consider unpublishing the plan first if you need to make major changes.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditMealPlanModal