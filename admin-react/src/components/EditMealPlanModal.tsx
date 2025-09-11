import React from 'react'
import { useState, useEffect } from 'react'
import type { MealPlan as ApiMealPlan } from '../services/mealApi'
import type { MealPlan as UiMealPlan } from '../types'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { mealPlansApi, mealsApi } from '../services/mealApi'

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
    targetAudience: 'Family',
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    planFeatures: '',
    adminNotes: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [recalculatingPrice, setRecalculatingPrice] = useState(false)
  const [currentPriceInfo, setCurrentPriceInfo] = useState<{
    price: number;
    assignmentCount: number;
  } | null>(null)

  // Narrow the incoming mealPlan (UI type) to a record for safe runtime checks
  const mealPlanRec = mealPlan as unknown as Record<string, unknown>

  // Update form data when meal plan changes
  useEffect(() => {
    if (mealPlan) {
      setFormData({
        planName: typeof mealPlanRec.planName === 'string' ? mealPlanRec.planName as string : '',
        description: typeof mealPlanRec.description === 'string' ? mealPlanRec.description as string : '',
        coverImage: typeof mealPlanRec.coverImage === 'string' ? mealPlanRec.coverImage as string : '',
        durationWeeks: typeof mealPlanRec.durationWeeks === 'number' ? String(mealPlanRec.durationWeeks as number) : (typeof mealPlanRec.durationWeeks === 'string' ? mealPlanRec.durationWeeks as string : '4'),
        targetAudience: typeof mealPlanRec.targetAudience === 'string' ? mealPlanRec.targetAudience as string : 'Family',
        mealTypes: Array.isArray(mealPlanRec.mealTypes) ? (mealPlanRec.mealTypes as string[]) : ['breakfast', 'lunch', 'dinner'],
        planFeatures: Array.isArray(mealPlanRec.planFeatures) ? (mealPlanRec.planFeatures as string[]).join(', ') : (typeof mealPlanRec.planFeatures === 'string' ? mealPlanRec.planFeatures as string : ''),
        adminNotes: typeof mealPlanRec.adminNotes === 'string' ? mealPlanRec.adminNotes as string : ''
      })
    }
  }, [mealPlan])

  // Calculate current price info based on form duration
  useEffect(() => {
    const calculateCurrentPriceInfo = async () => {
      if (!mealPlan || !isOpen) {
        setCurrentPriceInfo(null)
        return
      }

      try {
        // Get current assignments for this meal plan
        const assignmentsResponse = await mealPlansApi.getMealPlanAssignments(mealPlan._id)
        const assignments = (assignmentsResponse as any).data?.assignments || []

        // Get all available meals to calculate prices
        const mealsResponse = await mealsApi.getAllMeals({ limit: 1000, isAvailable: true })
        const availableMeals = (mealsResponse as any).data.meals || []

        // Get the current duration from form data
        const currentDurationWeeks = parseInt(formData.durationWeeks)

        // Filter assignments to only include meals within the current form duration
        const validAssignments = assignments.filter((assignment: any) =>
          assignment.weekNumber <= currentDurationWeeks
        )

        let totalPrice = 0
        // Calculate total cost from valid assigned meals only
        for (const assignment of validAssignments) {
          if (assignment.mealIds && Array.isArray(assignment.mealIds)) {
            for (const mealId of assignment.mealIds) {
              const meal = availableMeals.find((m: { _id: string; pricing?: { totalPrice?: number } }) => m._id === mealId)
              if (meal && meal.pricing && typeof meal.pricing.totalPrice === 'number') {
                totalPrice += meal.pricing.totalPrice
              }
            }
          }
        }

        setCurrentPriceInfo({
          price: totalPrice,
          assignmentCount: validAssignments.length
        })
      } catch (error) {
        console.error('Failed to calculate current price info:', error)
        // Fallback to using the existing meal plan data
        setCurrentPriceInfo({
          price: Number(mealPlanRec.totalPrice ?? 0),
          assignmentCount: Number(mealPlanRec.assignmentCount ?? 0)
        })
      }
    }

    calculateCurrentPriceInfo()
  }, [isOpen, mealPlan, formData.durationWeeks])

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

  const handleRecalculatePrice = async () => {
    try {
      setRecalculatingPrice(true)

      // Get current assignments for this meal plan
      const assignmentsResponse = await mealPlansApi.getMealPlanAssignments(mealPlan._id)
      const assignments = (assignmentsResponse as any).data?.assignments || []

      // Get all available meals to calculate prices
      const mealsResponse = await mealsApi.getAllMeals({ limit: 1000, isAvailable: true })
      const availableMeals = (mealsResponse as any).data.meals || []

      // Get the current duration from form data
      const currentDurationWeeks = parseInt(formData.durationWeeks)

      console.log(`💰 Recalculating price for meal plan duration: ${currentDurationWeeks} weeks`)

      // Filter assignments to only include meals within the meal plan's current duration
      const validAssignments = assignments.filter((assignment: any) =>
        assignment.weekNumber <= currentDurationWeeks
      )

      console.log(`📊 Total assignments: ${assignments.length}, Valid assignments (within ${currentDurationWeeks} weeks): ${validAssignments.length}`)

      let totalPrice = 0

      // Calculate total cost from valid assigned meals only
      for (const assignment of validAssignments) {
        if (assignment.mealIds && Array.isArray(assignment.mealIds)) {
          for (const mealId of assignment.mealIds) {
            const meal = availableMeals.find((m: { _id: string; pricing?: { totalPrice?: number } }) => m._id === mealId)
            if (meal && meal.pricing && typeof meal.pricing.totalPrice === 'number') {
              totalPrice += meal.pricing.totalPrice
              console.log(`  📝 Week ${assignment.weekNumber}, Day ${assignment.dayOfWeek}, ${assignment.mealTime}: +₦${meal.pricing.totalPrice} (${meal.name})`)
            }
          }
        }
      }

      console.log(`💵 Total calculated price: ₦${totalPrice.toLocaleString()}`)

      // Update the meal plan with the new total price
      const planData = { totalPrice }
      await onSubmit(planData)

      alert(`Price recalculated successfully! New total: ${formatCurrency(totalPrice)}`)
    } catch (error) {
      console.error('Failed to recalculate price:', error)
      alert('Failed to recalculate price. Please try again.')
    } finally {
      setRecalculatingPrice(false)
    }
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
        targetAudience: formData.targetAudience,
        mealTypes: formData.mealTypes,
        planFeatures: formData.planFeatures.split(',').map(feature => feature.trim()).filter(feature => feature),
        adminNotes: formData.adminNotes
      }

      // Check if duration changed - if so, automatically recalculate price
      const isDurationChanged = parseInt(formData.durationWeeks) !== mealPlan.durationWeeks
      const isReducingDuration = parseInt(formData.durationWeeks) < mealPlan.durationWeeks
      const assignmentsToDelete = isReducingDuration && currentPriceInfo
        ? (Number(mealPlanRec.assignmentCount ?? 0) - currentPriceInfo.assignmentCount)
        : 0

      // If duration changed, automatically include the recalculated price
      if (isDurationChanged && currentPriceInfo) {
        console.log(`💰 Duration changed from ${mealPlan.durationWeeks} to ${formData.durationWeeks} weeks - automatically updating price`)
        planData.totalPrice = currentPriceInfo.price
      }

      await onSubmit(planData)

      // Provide specific feedback for duration changes
      if (isDurationChanged) {
        if (isReducingDuration && assignmentsToDelete > 0) {
          alert(`Meal plan updated successfully!\n\nDuration reduced from ${mealPlan.durationWeeks} to ${formData.durationWeeks} weeks.\n${assignmentsToDelete} meal assignments beyond week ${formData.durationWeeks} were removed.\nPrice automatically updated to: ${formatCurrency(currentPriceInfo?.price ?? 0)}`)
        } else if (!isReducingDuration) {
          alert(`Meal plan updated successfully!\n\nDuration extended from ${mealPlan.durationWeeks} to ${formData.durationWeeks} weeks.\nPrice automatically updated to: ${formatCurrency(currentPriceInfo?.price ?? 0)}\n\nYou can now assign meals to the new weeks.`)
        } else {
          alert(`Meal plan updated successfully!\n\nPrice automatically updated to: ${formatCurrency(currentPriceInfo?.price ?? 0)}`)
        }
      } else {
        alert('Meal plan updated successfully!')
      }
    } catch (error) {
      console.error('Failed to update meal plan:', error)
      alert('Failed to update meal plan. Please try again.')
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
                    <div>Current Price: {formatCurrency(currentPriceInfo?.price ?? Number(mealPlanRec.totalPrice ?? 0))}</div>
                    <div>Meals Assigned: {currentPriceInfo?.assignmentCount ?? Number(mealPlanRec.assignmentCount ?? 0)}</div>
                    {parseInt(formData.durationWeeks) !== mealPlan.durationWeeks && (
                      <div className="text-xs text-blue-600 mt-1">
                        📊 Showing meals for {formData.durationWeeks} week{parseInt(formData.durationWeeks) !== 1 ? 's' : ''} (current form setting)
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRecalculatePrice}
                    disabled={recalculatingPrice || submitting}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                    title="Recalculate total price based on assigned meals"
                  >
                    {recalculatingPrice ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Calculating...</span>
                      </>
                    ) : (
                      <>
                        <span>💰</span>
                        <span>Recalculate Price</span>
                      </>
                    )}
                  </button>
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
                  Cover Image URL
                </label>
                <input
                  type="url"
                  name="coverImage"
                  value={formData.coverImage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">📅 Plan Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Duration Reduction Warning */}
            {parseInt(formData.durationWeeks) < mealPlan.durationWeeks && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                <h3 className="text-red-800 dark:text-red-300 font-medium mb-2">⚠️ Duration Reduction Warning</h3>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  Reducing duration from {mealPlan.durationWeeks} to {formData.durationWeeks} week{parseInt(formData.durationWeeks) !== 1 ? 's' : ''} will permanently delete all meal assignments
                  beyond week {formData.durationWeeks}. This action cannot be undone.
                </p>
                {currentPriceInfo && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-2">
                    {(Number(mealPlanRec.assignmentCount ?? 0) - currentPriceInfo.assignmentCount)} assignments will be removed.
                  </p>
                )}
              </div>
            )}

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