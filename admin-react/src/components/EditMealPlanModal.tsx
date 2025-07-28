import React from 'react'
import { useState, useEffect } from 'react'
import { type MealPlan } from '../services/mealApi'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface EditMealPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (planData: Partial<MealPlan>) => Promise<void>
  mealPlan: MealPlan
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

export default function EditMealPlanModal({ isOpen, onClose, onSubmit, mealPlan }: EditMealPlanModalProps) {
  const [formData, setFormData] = useState({
    planName: '',
    description: '',
    coverImage: '',
    durationWeeks: '4',
    targetAudience: 'Family',
    planFeatures: '',
    adminNotes: ''
  })

  const [submitting, setSubmitting] = useState(false)

  // Update form data when meal plan changes
  useEffect(() => {
    if (mealPlan) {
      setFormData({
        planName: mealPlan.planName || '',
        description: mealPlan.description || '',
        coverImage: mealPlan.coverImage || '',
        durationWeeks: mealPlan.durationWeeks?.toString() || '4',
        targetAudience: mealPlan.targetAudience || 'Family',
        planFeatures: mealPlan.planFeatures?.join(', ') || '',
        adminNotes: mealPlan.adminNotes || ''
      })
    }
  }, [mealPlan])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    setSubmitting(true)
    try {
      const planData: Partial<MealPlan> = {
        planName: formData.planName,
        description: formData.description,
        coverImage: formData.coverImage,
        durationWeeks: parseInt(formData.durationWeeks),
        targetAudience: formData.targetAudience,
        planFeatures: formData.planFeatures.split(',').map(feature => feature.trim()).filter(feature => feature),
        adminNotes: formData.adminNotes
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Meal Plan</h2>
              <p className="text-sm text-gray-600">ID: {mealPlan.planId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Current Status</h3>
                  <p className="text-sm text-gray-600">Last updated: {new Date(mealPlan.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    mealPlan.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {mealPlan.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <div className="text-sm text-gray-600">
                    <div>Current Price: {formatCurrency(mealPlan.totalPrice)}</div>
                    <div>Meals Assigned: {mealPlan.assignmentCount || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  name="planName"
                  value={formData.planName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 30-Day Weight Loss Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this meal plan offers, who it's for, and what makes it special..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  name="coverImage"
                  value={formData.coverImage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/plan-cover.jpg"
                />
                {formData.coverImage && (
                  <div className="mt-2 flex space-x-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Current Image</div>
                      <img 
                        src={mealPlan.coverImage} 
                        alt="Current plan cover" 
                        className="h-20 w-28 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">New Image Preview</div>
                      <img 
                        src={formData.coverImage} 
                        alt="New plan cover preview" 
                        className="h-20 w-28 object-cover rounded-lg border-2 border-blue-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Configuration */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Plan Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration *
                  </label>
                  <select
                    name="durationWeeks"
                    value={formData.durationWeeks}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1">1 Week</option>
                    <option value="2">2 Weeks</option>
                    <option value="3">3 Weeks</option>
                    <option value="4">4 Weeks</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {mealPlan.durationWeeks} week(s) → New: {parseInt(formData.durationWeeks)} week(s)
                    {parseInt(formData.durationWeeks) !== mealPlan.durationWeeks && (
                      <span className="text-orange-600 ml-1">
                        ⚠️ Changing duration may affect meal assignments
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience *
                  </label>
                  <select
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {targetAudiences.map(audience => (
                      <option key={audience} value={audience}>{audience}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Plan Stats */}
            {mealPlan.stats && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Current Plan Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{mealPlan.stats.totalDays}</div>
                    <div className="text-gray-600">Total Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{mealPlan.assignmentCount || 0}</div>
                    <div className="text-gray-600">Meals Assigned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{mealPlan.stats.avgMealsPerDay}</div>
                    <div className="text-gray-600">Avg Meals/Day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {mealPlan.nutritionInfo?.avgCaloriesPerDay > 0 ? mealPlan.nutritionInfo.avgCaloriesPerDay : '—'}
                    </div>
                    <div className="text-gray-600">Avg Cal/Day</div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Features (comma-separated)
              </label>
              <input
                type="text"
                name="planFeatures"
                value={formData.planFeatures}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., High Protein, Low Carb, Dairy Free, Quick Prep"
              />
              <p className="text-xs text-gray-500 mt-1">
                These features will help customers find the right plan for their needs
              </p>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                name="adminNotes"
                value={formData.adminNotes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Internal notes about this meal plan..."
              />
            </div>

            {/* Publishing Warning */}
            {mealPlan.isPublished && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-orange-800 font-medium mb-2">⚠️ Published Plan Notice</h3>
                <p className="text-orange-700 text-sm">
                  This meal plan is currently live in the mobile app. Changes will be visible to customers immediately after saving.
                  Consider unpublishing the plan first if you need to make major changes.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}