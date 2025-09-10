import React, { useState } from 'react'
import type { MealPlan } from '../types'

interface DuplicateMealPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (newPlanName: string, modifications?: any) => Promise<void>
  mealPlan: MealPlan | null
  isLoading?: boolean
}

const DuplicateMealPlanModal: React.FC<DuplicateMealPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mealPlan,
  isLoading = false
}) => {
  const [newPlanName, setNewPlanName] = useState('')
  const [includeAssignments, setIncludeAssignments] = useState(true)
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [newDurationWeeks, setNewDurationWeeks] = useState<number>(0)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [submitError, setSubmitError] = useState('')

  React.useEffect(() => {
    if (isOpen && mealPlan) {
      setNewPlanName(`${mealPlan.planName} (Copy)`)
      setNewDurationWeeks(mealPlan.durationWeeks || 0)
      setErrors({})
      setSubmitError('')
    }
  }, [isOpen, mealPlan])

  // Calculate recalculated price based on new duration
  const getRecalculatedPrice = () => {
    if (!mealPlan || !mealPlan.totalPrice || !mealPlan.durationWeeks) return 0
    const pricePerWeek = mealPlan.totalPrice / mealPlan.durationWeeks
    return Math.round(pricePerWeek * newDurationWeeks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    
    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!newPlanName.trim()) {
      newErrors.newPlanName = 'Plan name is required'
    } else if (newPlanName.trim().length < 3) {
      newErrors.newPlanName = 'Plan name must be at least 3 characters long'
    } else if (newPlanName.trim().length > 100) {
      newErrors.newPlanName = 'Plan name must not exceed 100 characters'
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Prepare modifications
    const modifications: any = {}
    
    if (publishImmediately && mealPlan?.assignmentCount && mealPlan.assignmentCount > 0) {
      modifications.isPublished = true
    }

    // Add duration and price modifications if duration changed
    if (newDurationWeeks !== mealPlan?.durationWeeks) {
      modifications.durationWeeks = newDurationWeeks
      modifications.totalPrice = getRecalculatedPrice()
    }
    
    try {
      await onSubmit(newPlanName.trim(), modifications)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate meal plan'
      setSubmitError(errorMessage)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setNewPlanName('')
      setIncludeAssignments(true)
      setPublishImmediately(false)
      setNewDurationWeeks(0)
      setErrors({})
      setSubmitError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Duplicate Meal Plan</h2>
            {!isLoading && (
              <button
                onClick={handleClose}
                className="text-gray-400 dark:text-neutral-400 hover:text-gray-600 dark:hover:text-neutral-200"
                disabled={isLoading}
                title="Close"
              >
                <i className="fi fi-sr-cross text-xl"></i>
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6">
            {/* Important Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-blue-400 mr-3 text-lg">📋</div>
                <div>
                  <h3 className="text-blue-800 dark:text-blue-300 font-medium">Duplicating Plan</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    Creating a copy of "<strong>{mealPlan?.planName}</strong>". All settings and meal assignments will be preserved in the duplicate.
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                New Plan Name *
              </label>
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => {
                  setNewPlanName(e.target.value)
                  if (errors.newPlanName) {
                    setErrors({ ...errors, newPlanName: '' })
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-neutral-800 dark:text-white ${
                  errors.newPlanName
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-neutral-600'
                }`}
                placeholder="Enter name for the duplicated plan"
                disabled={isLoading}
                maxLength={100}
              />
              {errors.newPlanName && (
                <p className="text-red-500 text-sm mt-1">{errors.newPlanName}</p>
              )}
              <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
                {newPlanName.length}/100 characters
              </p>
            </div>

            {/* Duration Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                Duration (Weeks) *
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={newDurationWeeks}
                onChange={(e) => {
                  const weeks = parseInt(e.target.value) || 0
                  setNewDurationWeeks(weeks)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-neutral-800 dark:text-white"
                placeholder="Enter duration in weeks"
                disabled={isLoading}
              />
              <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
                Original: {mealPlan?.durationWeeks || 0} weeks
                {newDurationWeeks !== mealPlan?.durationWeeks && (
                  <span className="text-blue-600 dark:text-blue-400 ml-2">
                    → Changed to {newDurationWeeks} weeks
                  </span>
                )}
              </p>
            </div>

            {/* Duplication Options */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">⚙️ Duplication Options</h3>
              
              {/* Include Assignments */}
              <div className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  id="includeAssignments"
                  checked={includeAssignments}
                  onChange={(e) => setIncludeAssignments(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <div>
                  <label htmlFor="includeAssignments" className="text-sm font-medium text-gray-700 dark:text-neutral-200">
                    Include meal assignments
                  </label>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Copy all scheduled meals and assignments from the original plan
                    {mealPlan?.assignmentCount && ` (${mealPlan.assignmentCount} assignments)`}
                  </p>
                </div>
              </div>

              {/* Publish Immediately */}
              {mealPlan?.assignmentCount && mealPlan.assignmentCount > 0 && (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="publishImmediately"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <div>
                    <label htmlFor="publishImmediately" className="text-sm font-medium text-gray-700 dark:text-neutral-200">
                      Publish immediately
                    </label>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      Make the duplicated plan available to customers right away
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {mealPlan && (
              <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-neutral-200 mb-3">
                  📊 Plan Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">Duration:</span>
                    <span className="ml-2 text-gray-900 dark:text-neutral-100">
                      {newDurationWeeks} {newDurationWeeks === 1 ? 'week' : 'weeks'}
                      {newDurationWeeks !== mealPlan.durationWeeks && (
                        <span className="text-blue-600 dark:text-blue-400 text-xs ml-1">
                          (was {mealPlan.durationWeeks})
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">Price:</span>
                    <span className="ml-2 text-gray-900 dark:text-neutral-100">
                      ₦{getRecalculatedPrice().toLocaleString()}
                      {newDurationWeeks !== mealPlan.durationWeeks && (
                        <span className="text-blue-600 dark:text-blue-400 text-xs ml-1">
                          (was ₦{mealPlan.totalPrice?.toLocaleString() || '0'})
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">Status:</span>
                    <span className={`ml-2 ${mealPlan.isPublished ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-neutral-400'}`}>
                      {publishImmediately ? 'Will be Published' : 'Draft'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">Meals:</span>
                    <span className="ml-2 text-gray-900 dark:text-neutral-100">
                      {includeAssignments ? (mealPlan.assignmentCount || 0) : 0} assigned
                    </span>
                  </div>
                </div>
                {newDurationWeeks !== mealPlan.durationWeeks && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Price Calculation:</strong> ₦{mealPlan.totalPrice?.toLocaleString() || '0'} ÷ {mealPlan.durationWeeks} weeks × {newDurationWeeks} weeks = ₦{getRecalculatedPrice().toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <i className="fi fi-sr-triangle-warning text-red-500 dark:text-red-400 mt-0.5"></i>
                  <div>
                    <h4 className="text-red-800 dark:text-red-300 font-medium text-sm">
                      Duplication Failed
                    </h4>
                    <p className="text-red-700 dark:text-red-400 text-sm">
                      {submitError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !newPlanName.trim()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Duplicating...
                </>
              ) : (
                <>
                  <i className="fi fi-sr-copy"></i>
                  Create Duplicate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DuplicateMealPlanModal