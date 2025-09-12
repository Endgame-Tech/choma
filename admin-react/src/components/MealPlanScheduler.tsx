import React, { useState, useEffect } from 'react'
import { Meal, MealPlan, MealPlanAssignment } from '../services/mealApi'
import { mealPlansApi, mealsApi } from '../services/mealApi'
import { requestDeduplicationService } from '../services/requestDeduplicationService'
import { XMarkIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface MealPlanSchedulerProps {
  isOpen: boolean
  onClose: () => void
  mealPlan: MealPlan
  onUpdate: () => void
}

const ALL_MEAL_TIMES = ['breakfast', 'lunch', 'dinner'] as const
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MealPlanScheduler: React.FC<MealPlanSchedulerProps> = ({ isOpen, onClose, mealPlan, onUpdate }) => {
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Get meal times based on the meal plan configuration
  const availableMealTimes = mealPlan.mealTypes && mealPlan.mealTypes.length > 0
    ? mealPlan.mealTypes.filter(type => ALL_MEAL_TIMES.includes(type as typeof ALL_MEAL_TIMES[number]))
    : ALL_MEAL_TIMES

  // Get total possible meal slots per week
  const totalSlotsPerWeek = availableMealTimes.length * DAYS_OF_WEEK.length
  const [mealSearch, setMealSearch] = useState('')
  const [selectedMealTime, setSelectedMealTime] = useState<typeof ALL_MEAL_TIMES[number] | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [currentAssignment, setCurrentAssignment] = useState({
    selectedMeals: [] as string[],
    customTitle: '',
    customDescription: '',
    imageUrl: ''
  })
  const [savingAssignment, setSavingAssignment] = useState(false)
  // Track the previous meal plan ID to detect updates
  const [prevMealPlanId, setPrevMealPlanId] = useState(mealPlan._id)
  const [weekBeforeUpdate, setWeekBeforeUpdate] = useState<number | null>(null)
  // State to store meal plan with assignments
  const [mealPlanWithAssignments, setMealPlanWithAssignments] = useState<MealPlan>(mealPlan)

  const fetchMealPlanAssignments = async () => {
    try {
      const response = await requestDeduplicationService.deduplicateApiCall(
        `/meal-plans/${mealPlan._id}/assignments`,
        'GET',
        () => mealPlansApi.getMealPlanAssignments(mealPlan._id)
      ) as { data: { assignments: MealPlanAssignment[] } }
      const assignments = response.data?.assignments || []
      setMealPlanWithAssignments({ ...mealPlan, assignments })
    } catch (error) {
      console.error('Failed to fetch meal plan assignments:', error)
      setMealPlanWithAssignments({ ...mealPlan, assignments: [] })
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchAvailableMeals()
      fetchMealPlanAssignments()
      if (selectedWeek > mealPlan.durationWeeks) {
        setSelectedWeek(1)
      }
    }
  }, [isOpen, mealPlan, selectedWeek])

  // Effect to detect meal plan updates and restore week selection
  useEffect(() => {
    // Check if the meal plan was updated (assignments changed) but it's the same plan
    if (mealPlan._id === prevMealPlanId && weekBeforeUpdate !== null) {
      // Restore the week selection
      setSelectedWeek(weekBeforeUpdate)
      setWeekBeforeUpdate(null)
    }

    // Update the tracked meal plan ID
    if (mealPlan._id !== prevMealPlanId) {
      setPrevMealPlanId(mealPlan._id)
    }
  }, [mealPlan, prevMealPlanId, weekBeforeUpdate])

  const fetchAvailableMeals = async () => {
    try {
      setLoading(true)
      const mealsResponse = await requestDeduplicationService.deduplicateApiCall(
        '/meals?limit=1000&isAvailable=true',
        'GET',
        () => mealsApi.getAllMeals({ limit: 1000, isAvailable: true })
      ) as { data: { meals: Meal[] } }
      setAvailableMeals(mealsResponse.data.meals || [])
    } catch (error) {
      console.error('Failed to fetch available meals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAssignment = async () => {
    if (selectedDay && selectedMealTime && currentAssignment.selectedMeals.length > 0 && currentAssignment.customTitle.trim()) {
      try {
        setSavingAssignment(true)
        // Store the current week before triggering update
        setWeekBeforeUpdate(selectedWeek)

        await mealPlansApi.assignMealToPlan(mealPlan._id, {
          mealIds: currentAssignment.selectedMeals,
          customTitle: currentAssignment.customTitle.trim(),
          customDescription: currentAssignment.customDescription.trim(),
          imageUrl: currentAssignment.imageUrl.trim(),
          weekNumber: selectedWeek,
          dayOfWeek: selectedDay,
          mealTime: selectedMealTime as 'breakfast' | 'lunch' | 'dinner'
        })

        // Refresh assignments to show new data
        await fetchMealPlanAssignments()

        // Reset form
        setCurrentAssignment({
          selectedMeals: [],
          customTitle: '',
          customDescription: '',
          imageUrl: ''
        })
        setSelectedDay(null)
        setSelectedMealTime(null)
      } catch (error) {
        console.error('Failed to assign meal:', error)
        alert('Failed to assign meal to plan')
        // Reset the week tracking on error
        setWeekBeforeUpdate(null)
      } finally {
        setSavingAssignment(false)
      }
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      // Store the current week before triggering update
      setWeekBeforeUpdate(selectedWeek)

      await mealPlansApi.removeAssignment(mealPlan._id, assignmentId)
      // Trigger update - week will be restored by useEffect
      onUpdate()
    } catch (error) {
      console.error('Failed to remove assignment:', error)
      alert('Failed to remove meal assignment')
      // Reset the week tracking on error
      setWeekBeforeUpdate(null)
    }
  }

  const getAssignmentForSlot = (week: number, dayOfWeek: number, mealTime: string) => {
    return mealPlanWithAssignments.assignments?.find(a =>
      a.weekNumber === week && a.dayOfWeek === dayOfWeek && a.mealTime === mealTime
    )
  }

  const getMealById = (mealId: string) => {
    return availableMeals.find(m => m._id === mealId)
  }

  const getMealsByIds = (mealIds: (string | Partial<Meal> | null | undefined)[]) => {
    if (!Array.isArray(mealIds)) return [] as Meal[]

    return mealIds.map((idOrObj) => {
      if (!idOrObj) return null

      // If it's a string id, try to find in availableMeals
      if (typeof idOrObj === 'string') {
        return availableMeals.find(m => m._id === idOrObj) || null
      }

      // If it's an object, it might be a populated meal already
      if (typeof idOrObj === 'object') {
        const obj = idOrObj as Partial<Meal>
        // If it has an _id, try to find the canonical meal first
        if (obj._id) {
          const found = availableMeals.find(m => m._id === obj._id)
          if (found) return found
        }

        // If it has nutrition/pricing fields, use it directly
        if (obj.nutrition || obj.pricing) {
          return obj as Meal
        }
      }

      return null
    }).filter(Boolean) as Meal[]
  }

  const filteredMeals = availableMeals.filter(meal =>
    meal.name.toLowerCase().includes(mealSearch.toLowerCase()) ||
    meal.category.toLowerCase().includes(mealSearch.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSlotClick = (week: number, dayOfWeek: number, mealTime: string) => {
    setSelectedWeek(week)
    setSelectedDay(dayOfWeek)
    setSelectedMealTime(mealTime as typeof ALL_MEAL_TIMES[number])

    // Load existing assignment if any
    const existingAssignment = getAssignmentForSlot(week, dayOfWeek, mealTime)
    if (existingAssignment) {
      // Ensure mealIds are strings, not populated objects
      const mealIds = Array.isArray(existingAssignment.mealIds)
        ? existingAssignment.mealIds.map((id: string | { _id: string }) => typeof id === 'string' ? id : (id as { _id: string })._id)
        : []

      setCurrentAssignment({
        selectedMeals: mealIds,
        customTitle: existingAssignment.customTitle || '',
        customDescription: existingAssignment.customDescription || '',
        imageUrl: existingAssignment.imageUrl || ''
      })
    } else {
      setCurrentAssignment({
        selectedMeals: [],
        customTitle: '',
        customDescription: '',
        imageUrl: ''
      })
    }
  }

  const handleMealSelect = (mealId: string) => {
    if (selectedDay && selectedMealTime) {
      setCurrentAssignment(prev => {
        const newSelectedMeals = prev.selectedMeals.includes(mealId)
          ? prev.selectedMeals.filter(id => id !== mealId)
          : [...prev.selectedMeals, mealId]

        return {
          ...prev,
          selectedMeals: newSelectedMeals
        }
      })
    }
  }

  // Compute weekly assignments and calories for the summary.
  const weekAssignments = Array.isArray(mealPlanWithAssignments.assignments)
    ? mealPlanWithAssignments.assignments.filter(a => a.weekNumber === selectedWeek)
    : []

  // Count unique assigned slots (dayOfWeek + mealTime) so "Total Meals" reflects visible slots
  const uniqueAssignedSlotCount = (() => {
    try {
      const slots = new Set<string>()
      weekAssignments.forEach(a => {
        if (a && a.dayOfWeek && a.mealTime) {
          slots.add(`${a.dayOfWeek}-${a.mealTime}`)
        }
      })
      // If there are more assignments than unique slots, log for debugging
      if (weekAssignments.length > slots.size) {
        console.warn('MealPlanScheduler: duplicate assignments detected for week', selectedWeek, {
          totalAssignments: weekAssignments.length,
          uniqueSlots: slots.size,
          assignments: weekAssignments
        })
      }
      return slots.size
    } catch (err) {
      console.error('Failed to compute uniqueAssignedSlotCount', err)
      return weekAssignments.length
    }
  })()

  // Compute per-day totals: for each day of the week sum calories across all meal times
  const perDayTotals = DAYS_OF_WEEK.map((_, idx) => {
    const day = idx + 1
    const assignmentsForDay = weekAssignments.filter(a => a.dayOfWeek === day)
    const dayCalories = assignmentsForDay.reduce((dayTotal, assignment) => {
      const meals = getMealsByIds(Array.isArray(assignment.mealIds) ? (assignment.mealIds as string[]) : [])
      return dayTotal + meals.reduce((sum, m) => sum + (m.nutrition?.calories || 0), 0)
    }, 0)
    return dayCalories
  })

  const totalCaloriesForWeek = perDayTotals.reduce((a, b) => a + b, 0)
  const avgCaloriesPerDay = Math.round(totalCaloriesForWeek)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Meal Plan Scheduler</h2>
              <p className="text-sm text-gray-600 dark:text-neutral-300">{mealPlan.planName} - {mealPlan.durationWeeks} Week(s)</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-neutral-400">Meal Types:</span>
                {availableMealTimes.map((type) => (
                  <span key={type} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full capitalize">
                    {type}
                  </span>
                ))}
                <span className="text-xs text-gray-500 dark:text-neutral-400">({totalSlotsPerWeek} slots per week)</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[80vh]">
          {/* Main Schedule View */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Week Selector */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-neutral-200">Week:</label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Select week"
                  >
                    {Array.from({ length: mealPlan.durationWeeks }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-500 dark:text-neutral-400">
                    Total assignments: {Array.isArray(mealPlanWithAssignments.assignments) ? mealPlanWithAssignments.assignments.filter(a => a.weekNumber === selectedWeek).length : 0}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-neutral-300">Loading schedule...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-2">
                  {/* Header Row */}
                  <div className="text-center font-medium text-gray-700 dark:text-neutral-200 py-2"></div>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div key={day} className="text-center font-medium text-gray-700 dark:text-neutral-200 py-2 border-b border-gray-300 dark:border-neutral-600">
                      <div>{day}</div>
                      <div className="text-xs text-gray-500 dark:text-neutral-400">Day {index + 1}</div>
                    </div>
                  ))}

                  {/* Meal Time Rows */}
                  {availableMealTimes.map((mealTime) => (
                    <div key={mealTime} className="contents">
                      <div className="flex items-center justify-center font-medium text-gray-700 dark:text-neutral-200 capitalize bg-gray-50 dark:bg-neutral-700 border-r border-gray-300 dark:border-neutral-600">
                        {mealTime}
                      </div>
                      {DAYS_OF_WEEK.map((day, dayIndex) => {
                        const assignment = getAssignmentForSlot(selectedWeek, dayIndex + 1, mealTime)
                        const meals = assignment ? getMealsByIds(assignment.mealIds as string[]) : []
                        const isSelected = selectedDay === dayIndex + 1 && selectedMealTime === mealTime

                        // Debug log for this specific slot
                        if (dayIndex === 1 && mealTime === 'breakfast') {
                          console.log('Tuesday Breakfast Debug:', {
                            assignment,
                            hasAssignment: !!assignment,
                            imageUrl: assignment?.imageUrl,
                            imageUrlLength: assignment?.imageUrl?.length,
                            imageUrlPreview: assignment?.imageUrl?.substring(0, 50) + '...',
                            mealsLength: meals.length,
                            mealIds: assignment?.mealIds,
                            availableMealIds: availableMeals.map(m => m._id),
                            mealIdsMatch: assignment?.mealIds?.map(id => availableMeals.find(m => m._id === id))
                          });
                        }

                        return (
                          <div
                            key={`${day}-${mealTime}`}
                            className={`min-h-[140px] border p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500'
                              : assignment
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700'
                              }`}
                            onClick={() => handleSlotClick(selectedWeek, dayIndex + 1, mealTime)}
                          >
                            {assignment ? (
                              <div className="h-full relative flex flex-col rounded-lg overflow-hidden">
                                {/* Custom Image or Orange Background */}
                                <div className="flex-1 relative">
                                  {assignment.imageUrl && assignment.imageUrl.trim() ? (
                                    <img
                                      src={assignment.imageUrl}
                                      alt={assignment.customTitle}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // If image fails to load, show orange background
                                        e.currentTarget.style.display = 'none';
                                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (nextElement) {
                                          nextElement.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}

                                  {/* Orange background fallback */}
                                  <div
                                    className={`w-full h-full bg-orange-400 flex items-center justify-center ${assignment.imageUrl && assignment.imageUrl.trim() ? 'hidden' : 'flex'
                                      }`}
                                  >
                                    <div className="text-center text-white">
                                      <div className="text-xs font-medium mb-1 px-2 line-clamp-2">
                                        {assignment.customTitle}
                                      </div>
                                      <div className="text-xs opacity-90">
                                        {meals.length > 0 ? `${meals.length} item${meals.length > 1 ? 's' : ''}` : 'Custom meal'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Overlay info for image */}
                                  {assignment.imageUrl && assignment.imageUrl.trim() && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                                      <div className="text-xs font-medium line-clamp-1">
                                        {assignment.customTitle}
                                      </div>
                                      <div className="text-xs opacity-90">
                                        {meals.length > 0
                                          ? `${meals.length} item${meals.length > 1 ? 's' : ''} • ${formatCurrency(meals.reduce((sum, m) => sum + m.pricing.totalPrice, 0))}`
                                          : 'Custom meal'
                                        }
                                      </div>
                                    </div>
                                  )}

                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveAssignment(assignment._id || (assignment as { assignmentId?: string }).assignmentId || '')
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                                    title="Delete assignment"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-400 dark:text-neutral-500">
                                <PlusIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Schedule Summary */}
              <div className="mt-8 bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-3">Week {selectedWeek} Summary</h3>
                {availableMealTimes.length < 3 && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Note:</span> This plan only covers {availableMealTimes.join(', ')} meals
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 dark:text-neutral-300">Total Meals</div>
                    <div className="text-xl font-bold text-blue-600">
                      {uniqueAssignedSlotCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-neutral-300">Estimated Cost</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        Array.isArray(mealPlanWithAssignments.assignments)
                          ? mealPlanWithAssignments.assignments
                            .filter(a => a.weekNumber === selectedWeek)
                            .reduce((total, assignment) => {
                              const meals = getMealsByIds(assignment.mealIds as string[])
                              return total + meals.reduce((sum, m) => sum + m.pricing.totalPrice, 0)
                            }, 0)
                          : 0
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-neutral-300">Avg Calories/Day</div>
                    <div className="text-xl font-bold text-purple-600">
                      {avgCaloriesPerDay}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-neutral-300">Completion</div>
                    <div className="text-xl font-bold text-orange-600">
                      {Math.round((uniqueAssignedSlotCount / totalSlotsPerWeek) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="w-96 border-l border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 flex-shrink-0">
            <div className="h-full flex flex-col">
              {/* Fixed Header */}
              <div className="p-4 border-b border-gray-200 dark:border-neutral-600 flex-shrink-0">
                <h3 className="font-semibold text-gray-900 dark:text-neutral-100">
                  {selectedDay && selectedMealTime
                    ? `${currentAssignment.selectedMeals.length > 0 ? 'Edit' : 'Configure'} ${selectedMealTime} for ${DAYS_OF_WEEK[selectedDay - 1]} (Week ${selectedWeek})`
                    : 'Select a time slot to configure'
                  }
                </h3>
              </div>

              {selectedDay && selectedMealTime && availableMealTimes.includes(selectedMealTime) ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {/* Meal Configuration Section */}
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-600">
                      <h4 className="font-medium text-gray-900 dark:text-neutral-100 mb-3">Meal Details</h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                            Meal Title *
                          </label>
                          <input
                            type="text"
                            value={currentAssignment.customTitle}
                            onChange={(e) => setCurrentAssignment(prev => ({ ...prev, customTitle: e.target.value }))}
                            placeholder="e.g., Traditional Nigerian Breakfast"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                            Image URL
                          </label>
                          <input
                            type="url"
                            value={currentAssignment.imageUrl}
                            onChange={(e) => setCurrentAssignment(prev => ({ ...prev, imageUrl: e.target.value }))}
                            placeholder="https://craftsnippets.com/articles_images/placeholder/placeholder.jpg"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                            Description
                          </label>
                          <textarea
                            value={currentAssignment.customDescription}
                            onChange={(e) => setCurrentAssignment(prev => ({ ...prev, customDescription: e.target.value }))}
                            placeholder="Describe this meal combination..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Current Selection Summary */}
                      {currentAssignment.selectedMeals.length > 0 && (() => {
                        console.log('Sidebar - Current selected meals (IDs):', currentAssignment.selectedMeals);
                        return (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                              Selected Items ({currentAssignment.selectedMeals.length}):
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {currentAssignment.selectedMeals.map(mealId => {
                                const meal = getMealById(mealId)
                                return meal ? (
                                  <span key={mealId} className="px-2 py-1 bg-blue-200 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                                    {meal.name}
                                  </span>
                                ) : (
                                  <span key={mealId} className="px-2 py-1 bg-red-200 dark:bg-red-800/30 text-red-800 dark:text-red-300 rounded text-xs">
                                    Missing: {mealId}
                                  </span>
                                )
                              })}
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              Total: {formatCurrency(currentAssignment.selectedMeals.reduce((sum, id) => {
                                const meal = getMealById(id)
                                return sum + (meal?.pricing?.totalPrice || 0)
                              }, 0))} |
                              {Math.round(currentAssignment.selectedMeals.reduce((sum, id) => {
                                const meal = getMealById(id)
                                return sum + (meal?.nutrition?.calories || 0)
                              }, 0))} cal
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleSaveAssignment}
                          disabled={currentAssignment.selectedMeals.length === 0 || !currentAssignment.customTitle.trim() || savingAssignment}
                          className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {savingAssignment ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            currentAssignment.selectedMeals.length > 0 &&
                              mealPlanWithAssignments.assignments?.find(a => a.weekNumber === selectedWeek && a.dayOfWeek === selectedDay && a.mealTime === selectedMealTime)
                              ? 'Update Assignment' : 'Save Assignment'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDay(null)
                            setSelectedMealTime(null)
                            setCurrentAssignment({
                              selectedMeals: [],
                              customTitle: '',
                              customDescription: '',
                              imageUrl: ''
                            })
                          }}
                          className="px-3 py-2 text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 text-sm transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Food Selection Section */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-neutral-100 mb-3">Add Food Items</h4>

                      {/* Search */}
                      <div className="relative mb-3">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          placeholder="Search food items..."
                          value={mealSearch}
                          onChange={(e) => setMealSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Food List - Now with better height for scrolling */}
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {filteredMeals.map((meal) => (
                          <div
                            key={meal._id}
                            className={`p-3 border rounded cursor-pointer transition-colors ${currentAssignment.selectedMeals.includes(meal._id)
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500'
                              : 'bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border-gray-200 dark:border-neutral-600'
                              }`}
                            onClick={() => handleMealSelect(meal._id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gray-200 dark:bg-neutral-600 rounded flex-shrink-0 overflow-hidden">
                                {meal.image ? (
                                  <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-neutral-500 text-sm">
                                    🍽️
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">{meal.name}</div>
                                <div className="text-xs text-gray-600 dark:text-neutral-400">{meal.category}</div>
                                <div className="text-xs text-gray-600 dark:text-neutral-400">{formatCurrency(meal.pricing.totalPrice)}</div>
                                <div className="text-xs text-gray-500 dark:text-neutral-500">{meal.nutrition.calories} cal</div>
                              </div>
                              {currentAssignment.selectedMeals.includes(meal._id) && (
                                <div className="text-blue-600 dark:text-blue-400">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {filteredMeals.length === 0 && (
                          <div className="text-center text-gray-500 dark:text-neutral-400 py-8">
                            <div className="text-2xl mb-2">🔍</div>
                            <p className="text-sm">No food items found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedDay && selectedMealTime && !availableMealTimes.includes(selectedMealTime) ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-orange-600 dark:text-orange-400">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-sm font-medium">&ldquo;{selectedMealTime}&rdquo; is not configured for this meal plan</p>
                    <p className="text-xs text-gray-600 dark:text-neutral-400 mt-1">Available meal types: {availableMealTimes.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-gray-500 dark:text-neutral-400">
                    <div className="text-4xl mb-2">👆</div>
                    <p className="text-sm">Click on a time slot in the schedule to start configuring meals</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-neutral-300">
              Plan Status: {mealPlan.isPublished ? 'Published' : 'Draft'} |
              Total Assignments: {Array.isArray(mealPlanWithAssignments.assignments) ? mealPlanWithAssignments.assignments.length : 0} |
              Current Price: {formatCurrency(mealPlan.totalPrice)}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default MealPlanScheduler