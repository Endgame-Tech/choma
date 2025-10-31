import React from 'react'
import { useState } from 'react'
import { type MealPlan } from '../services/mealApi'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ImageUpload from './ImageUpload'
import TagSelector from './TagSelector'
import TierSelector from './TierSelector'

interface CreateMealPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (planData: Partial<MealPlan>) => Promise<void>
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

export default function CreateMealPlanModal({ isOpen, onClose, onSubmit }: CreateMealPlanModalProps) {
  const [formData, setFormData] = useState({
    planName: '',
    description: '',
    coverImage: '',
    durationWeeks: '4',
    isFiveWorkingDays: false, // 5 working days toggle
    tier: 'Silver', // Default tier
    targetAudience: 'Family',
    mealTypes: ['breakfast', 'lunch', 'dinner'], // Default to all three meals
    planFeatures: '',
    adminNotes: '',
    tagId: '' // Add tag selection
  })

  const [submitting, setSubmitting] = useState(false)

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
      const planData: Partial<MealPlan> = {
        planName: formData.planName,
        description: formData.description,
        coverImage: formData.coverImage,
        durationWeeks: formData.isFiveWorkingDays 
          ? parseInt(formData.durationWeeks) * 5 
          : parseInt(formData.durationWeeks) * 7,
        tier: formData.tier,
        targetAudience: formData.targetAudience,
        mealTypes: formData.mealTypes,
        planFeatures: formData.planFeatures.split(',').map(feature => feature.trim()).filter(feature => feature),
        adminNotes: formData.adminNotes,
        tagId: formData.tagId || undefined
      }


      await onSubmit(planData)

      // Reset form
      setFormData({
        planName: '',
        description: '',
        coverImage: '',
        durationWeeks: '4',
        isFiveWorkingDays: false,
        tier: 'Silver',
        targetAudience: 'Family',
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        planFeatures: '',
        adminNotes: '',
        tagId: ''
      })
    } catch (error) {
      console.error('Failed to create meal plan:', error)
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Create New Meal Plan</h2>
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6 ">
            {/* Important Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-blue-400 mr-3 text-lg">💡</div>
                <div>
                  <h3 className="text-blue-800 dark:text-blue-300 font-medium">Getting Started</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    Your meal plan will be created as a <strong>draft</strong>. After creating it, you can add meals using the scheduler and then publish it to make it visible in the mobile app.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="">
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
                <ImageUpload
                  currentImageUrl={formData.coverImage}
                  onImageUpload={(imageUrl) => setFormData(prev => ({ ...prev, coverImage: imageUrl }))}
                  uploadEndpoint="/upload/meal-plan-image"
                  label="Upload Cover Image"
                  className="w-full"
                  enableCropping={true}
                  cropAspectRatio={1080 / 1350}
                />
              </div>
            </div>

            {/* Plan Configuration */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">📅 Plan Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Duration *
                  </label>
                  <select
                    name="durationWeeks"
                    value={formData.durationWeeks}
                    onChange={handleInputChange}
                    required
                    title="Select meal plan duration"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1">1 Week</option>
                    <option value="2">2 Weeks</option>
                    <option value="3">3 Weeks</option>
                    <option value="4">4 Weeks</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                    Total days: {formData.isFiveWorkingDays
                      ? `${parseInt(formData.durationWeeks) * 5} days (${parseInt(formData.durationWeeks) * 5} Days Plan)`
                      : `${parseInt(formData.durationWeeks) * 7} days`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    5 Working Days Plan
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isFiveWorkingDays: !prev.isFiveWorkingDays }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.isFiveWorkingDays ? 'bg-blue-600' : 'bg-gray-200 dark:bg-neutral-600'
                        }`}
                      role="switch"
                      aria-checked={formData.isFiveWorkingDays}
                      title="Toggle 5 working days plan"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFiveWorkingDays ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-neutral-200">
                      {formData.isFiveWorkingDays ? 'Enabled (Mon-Fri only)' : 'Disabled (Full week)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                    For office workers who need meals Monday through Friday only
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Target Audience *
                </label>
                <select
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  required
                  title="Select target audience"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {targetAudiences.map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>

              {/* Tier Selection */}
              <div className="mt-6">
                <TierSelector
                  selectedTier={formData.tier}
                  onTierChange={(tier) => setFormData(prev => ({ ...prev, tier }))}
                />
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

            {/* Next Steps Preview */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h3 className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">📋 Next Steps</h3>
              <ol className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 list-decimal list-inside">
                <li>Create the meal plan template</li>
                <li>Use the <strong>Schedule</strong> button to assign meals to time slots</li>
                <li>Review the pricing and nutrition calculations</li>
                <li>Publish the plan to make it live in the mobile app</li>
              </ol>
            </div>
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
              {submitting ? 'Creating...' : 'Create Meal Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}