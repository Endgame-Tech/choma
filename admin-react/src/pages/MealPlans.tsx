import React from 'react'
import { useState, useEffect } from 'react'
import { mealPlansApi, type MealPlan as ApiMealPlan, type MealPlanFilters } from '../services/mealApi'
import { PermissionGate, usePermissionCheck } from '../contexts/PermissionContext'
import CreateMealPlanModal from '../components/CreateMealPlanModal'
import CreateTagModal from '../components/CreateTagModal'
import EditMealPlanModal from '../components/EditMealPlanModal'
import DuplicateMealPlanModal from '../components/DuplicateMealPlanModal'
import MealPlanScheduler from '../components/MealPlanScheduler'
import MealPlanCard from '../components/MealPlanCard'
import ConfirmationModal from '../components/ConfirmationModal'
import type { MealPlan as UiMealPlan } from '../types'
import { tagsApi, type CreateTagData } from '../services/tagApi'

const MealPlans: React.FC = () => {
  const { hasPermission } = usePermissionCheck();
  const [mealPlans, setMealPlans] = useState<UiMealPlan[]>([])
  const [apiPlanMap, setApiPlanMap] = useState<Record<string, ApiMealPlan>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMealPlans: 0,
    hasNext: false,
    hasPrev: false
  })

  // Search input state (separate from filters for debouncing)
  const [searchInput, setSearchInput] = useState('')

  // Filters
  const [filters, setFilters] = useState<MealPlanFilters>({
    page: 1,
    limit: 20,
    search: '',
    isPublished: undefined,
    durationWeeks: undefined
  })

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createTagModalOpen, setCreateTagModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false)
  const [selectedMealPlan, setSelectedMealPlan] = useState<UiMealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm',
    onConfirm: () => { },
    loading: false
  })

  // View mode toggle
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Selected meal plans for bulk operations
  const [selectedMealPlans, setSelectedMealPlans] = useState<string[]>([])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }))
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchMealPlans()
  }, [filters])

  const fetchMealPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await mealPlansApi.getAllMealPlans(filters) as { data: { mealPlans: ApiMealPlan[]; pagination: typeof pagination } }
      // Normalize API MealPlan -> UI MealPlan shape to satisfy shared UI types
      const apiPlans = response.data.mealPlans || []
      
      const uiPlans: UiMealPlan[] = apiPlans.map((p) => {
        // Safe extraction helpers
        const statsRecord = p.stats as unknown as Record<string, unknown> | undefined
        const possibleTotalAssignments = typeof statsRecord?.totalMealsAssigned === 'number'
          ? statsRecord!.totalMealsAssigned as number
          : (typeof statsRecord?.totalAssignments === 'number' ? statsRecord!.totalAssignments as number : undefined)

        const extra = p as unknown as Record<string, unknown>
        const planImageUrl = typeof extra?.planImageUrl === 'string' ? extra.planImageUrl as string : p.coverImage
        const category = typeof extra?.category === 'string' ? extra.category as string : undefined
        const tags = Array.isArray(extra?.tags) ? (extra.tags as unknown[]).map(String) : []

        return {
          _id: p._id,
          planId: p.planId,
          planName: p.planName,
          description: p.description,
          coverImage: p.coverImage,
          durationWeeks: p.durationWeeks,
          targetAudience: p.targetAudience,
          mealTypes: p.mealTypes,
          planFeatures: p.planFeatures,
          adminNotes: p.adminNotes,
          totalPrice: p.totalPrice,
          isPublished: p.isPublished,
          isActive: p.isActive,
          nutritionInfo: {
            avgCaloriesPerDay: p.nutritionInfo?.avgCaloriesPerDay,
            totalCalories: p.nutritionInfo?.totalCalories,
            avgCaloriesPerMeal: p.nutritionInfo?.avgCaloriesPerMeal,
          },
          stats: {
            avgMealsPerDay: p.stats?.avgMealsPerDay,
            totalDays: p.stats?.totalDays,
            totalAssignments: possibleTotalAssignments,
          },
          assignmentCount: p.assignmentCount,
          assignments: (p.assignments ?? []).map(a => a as unknown as Record<string, unknown>),
          planImageUrl,
          category,
          tags,
        }
      })
      setMealPlans(uiPlans)
      // store api plans by id for components that need the API shape
      const map: Record<string, ApiMealPlan> = {}
      apiPlans.forEach(p => { map[p._id] = p })
      setApiPlanMap(map)
      setPagination(response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalMealPlans: 0,
        hasNext: false,
        hasPrev: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meal plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMealPlan = async (planData: Partial<ApiMealPlan>) => {
    try {

      await mealPlansApi.createMealPlan(planData)
      await fetchMealPlans()
      setCreateModalOpen(false)
    } catch (err) {
      alert(`Failed to create meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleCreateTag = async (tagData: CreateTagData) => {
    try {
      await tagsApi.createTag(tagData)
      setCreateTagModalOpen(false)
      // Show success notification
      alert('Tag created successfully!')
    } catch (err) {
      alert(`Failed to create tag: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err // Re-throw to keep modal open
    }
  }

  const handleEditMealPlan = async (planData: Partial<ApiMealPlan>) => {
    if (!selectedMealPlan) return

    try {
      const updatedMealPlan = await mealPlansApi.updateMealPlan(selectedMealPlan._id, planData)
      await fetchMealPlans()
      // Update the selectedMealPlan with fresh data so the modal shows current values
      setSelectedMealPlan(updatedMealPlan.data)
      setEditModalOpen(false)
    } catch (err) {
      alert(`Failed to update meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDeleteMealPlan = async (id: string) => {
    const plan = mealPlans.find(p => p._id === id)
    const planName = plan?.planName || 'this meal plan'

    setConfirmationModal({
      isOpen: true,
      title: 'Delete Meal Plan',
      message: `Are you sure you want to permanently delete "${planName}"? This action cannot be undone.`,      type: 'danger',
      confirmText: 'Delete Meal Plan',
      onConfirm: async () => {
        setConfirmationModal(prev => ({ ...prev, loading: true }))

        type AxiosLikeError = { response?: { data?: { message?: string; assignmentCount?: number } } }
        const isAxiosLikeError = (e: unknown): e is AxiosLikeError =>
          typeof e === 'object' && e !== null && 'response' in e

        try {
          await mealPlansApi.deleteMealPlan(id, false)
          await fetchMealPlans()
          setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
        } catch (err: unknown) {
          const errorMessage = isAxiosLikeError(err) ? err.response?.data?.message ?? 'An unknown error occurred.' : 'An unknown error occurred.'
          const assignmentCount = isAxiosLikeError(err) ? err.response?.data?.assignmentCount ?? 'some' : 'some'

          // Handle specific error types with a new modal
          setConfirmationModal({
            isOpen: true,
            title: 'Cannot Delete Meal Plan',
            message: `❌ ${errorMessage}\n\nThis will permanently delete all ${assignmentCount} meal assignment(s) for this meal plan. Do you want to proceed?`,            type: 'warning',
            confirmText: 'Force Delete',
            onConfirm: async () => {
              setConfirmationModal(prev => ({ ...prev, loading: true }))
              try {
                await mealPlansApi.deleteMealPlan(id, true)
                await fetchMealPlans()
                setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
              } catch (forceErr: unknown) {
                const forceMessage = isAxiosLikeError(forceErr)
                  ? forceErr.response?.data?.message ?? 'Unknown error'
                  : (forceErr instanceof Error ? forceErr.message : 'Unknown error')
                alert(`Failed to force delete meal plan: ${forceMessage}`)
                setConfirmationModal(prev => ({ ...prev, loading: false }))
              }
            },
            loading: false
          })
        }
      },
      loading: false
    })
  }

  const handleTogglePublish = async (plan: UiMealPlan) => {
    try {
      if (plan.isPublished) {
        await mealPlansApi.unpublishMealPlan(plan._id)
      } else {
        // Check if meal plan has any assignments before publishing
        if (!plan.assignmentCount || plan.assignmentCount === 0) {
          alert('Cannot publish meal plan without any meal assignments. Please schedule some meals first.')
          return
        }
        await mealPlansApi.publishMealPlan(plan._id)
      }
      await fetchMealPlans()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Handle specific validation errors
      if (errorMessage.includes('meal assignments') || errorMessage.includes('Cannot publish')) {
        alert('Cannot publish meal plan without any meal assignments. Please use the Schedule button to add meals first.')
      } else {
        alert(`Failed to ${plan.isPublished ? 'unpublish' : 'publish'} meal plan: ${errorMessage}`)
      }
    }
  }

  const handleDuplicateMealPlan = (plan: UiMealPlan) => {
    setSelectedMealPlan(plan)
    setDuplicateModalOpen(true)
  }

  const handleDuplicateSubmit = async (newPlanName: string, modifications?: Record<string, unknown>) => {
    if (!selectedMealPlan) return

    setIsLoading(true)
    try {
      await mealPlansApi.duplicateMealPlan(selectedMealPlan._id, newPlanName, modifications)
      await fetchMealPlans()
      setDuplicateModalOpen(false)
      setSelectedMealPlan(null)
      // Show success feedback
      const successEvent = new CustomEvent('show-notification', {
        detail: {
          type: 'success',
          message: `Meal plan "${newPlanName}" has been created successfully!`
        }
      })
      window.dispatchEvent(successEvent)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate meal plan'
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getDurationText = (weeks: number) => {
    return weeks === 1 ? '1 Week' : `${weeks} Weeks`
  }

  // Selection handlers
  const handleSelectMealPlan = (id: string) => {
    setSelectedMealPlans(prev =>
      prev.includes(id)
        ? prev.filter(planId => planId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedMealPlans.length === mealPlans.length) {
      setSelectedMealPlans([])
    } else {
      setSelectedMealPlans(mealPlans.map(plan => plan._id))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading meal plans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 dark:text-red-300 mr-3"><i className="fi fi-sr-warning"></i></div>
          <div>
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading meal plans</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchMealPlans}
              className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Meal Plans Management</h1>
          <p className="text-gray-600 dark:text-neutral-200">Create and manage meal plan templates ({pagination?.totalMealPlans || 0} plans)</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'cards'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <i className="fi fi-sr-apps mr-1.5"></i>
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <i className="fi fi-sr-list mr-1.5"></i>
              Table
            </button>
          </div>

          {/* Create Tags Button */}
          <PermissionGate module="mealPlans" action="create">
            <button
              onClick={() => setCreateTagModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
            >
              <i className="fi fi-sr-tags mr-2"></i>
              Create Tags
            </button>
          </PermissionGate>

          {/* Create Button */}
          <PermissionGate module="mealPlans" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-choma-brown dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Meal Plan
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Search</label>
            <div className="relative">
              <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
              <input
                type="text"
                placeholder="Search meal plans..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Publish Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Publish Status</label>
            <select
              value={filters.isPublished?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                isPublished: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1
              }))}
              aria-label="Filter meal plans by publish status"
              title="Filter plans by published or draft status"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Plans</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>

          {/* Duration Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Duration</label>
            <select
              value={filters.durationWeeks?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                durationWeeks: e.target.value === '' ? undefined : parseInt(e.target.value),
                page: 1
              }))}
              aria-label="Filter meal plans by duration"
              title="Filter plans by duration in weeks"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Durations</option>
              <option value={1}>1 Week</option>
              <option value={2}>2 Weeks</option>
              <option value={3}>3 Weeks</option>
              <option value={4}>4 Weeks</option>
            </select>
          </div>

          {/* Results per page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              aria-label="Number of meal plans per page"
              title="Choose how many meal plans to show per page"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

        </div>
      </div>

      {/* Meal Plans Grid */}
      {mealPlans.length === 0 ? (
        <div className="text-center py-12 bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="text-4xl mb-2"><i className="fi fi-sr-clipboard-list"></i></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No meal plans found</h3>
          <p className="text-gray-500 dark:text-neutral-200 mb-4">
            {filters.search || filters.isPublished !== undefined || filters.durationWeeks
              ? "No plans match your current filters."
              : "Get started by creating your first meal plan template."}
          </p>
          <PermissionGate module="mealPlans" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Meal Plan
            </button>
          </PermissionGate>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mealPlans.map((plan) => (
            <MealPlanCard
              key={plan._id}
              mealPlan={plan}
              onEdit={hasPermission('mealPlans', 'edit') ? (plan) => {
                setSelectedMealPlan(plan)
                setEditModalOpen(true)
              } : undefined}
              onDelete={hasPermission('mealPlans', 'delete') ? handleDeleteMealPlan : undefined}
              onSchedule={hasPermission('mealPlans', 'schedule') ? (plan) => {
                setSelectedMealPlan(plan)
                setSchedulerModalOpen(true)
              } : undefined}
              onTogglePublish={hasPermission('mealPlans', 'publish') ? handleTogglePublish : undefined}
              onDuplicate={hasPermission('mealPlans', 'create') ? handleDuplicateMealPlan : undefined}
              onSelect={handleSelectMealPlan}
              isSelected={selectedMealPlans.includes(plan._id)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/90 dark:bg-neutral-800/90 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-700/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedMealPlans.length === mealPlans.length && mealPlans.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all meal plans"
                      title="Select all meal plans"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Plan Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Meal Types & Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Pricing & Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Nutrition & Audience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
                {mealPlans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        title={`Select ${plan.planName}`}
                        className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                        checked={selectedMealPlans.includes(plan._id)}
                        onChange={() => handleSelectMealPlan(plan._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-200 dark:bg-neutral-700 rounded-lg mr-4 flex items-center justify-center">
                          {plan.coverImage ? (
                            <img src={plan.coverImage} alt={plan.planName} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="text-gray-400 dark:text-neutral-400 text-xl"><i className="fi fi-sr-clipboard-list"></i></span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{plan.planName}</div>
                          <div className="text-sm text-gray-500 dark:text-neutral-300">ID: {String(plan.planId ?? plan._id)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {/* Meal Types */}
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(plan.mealTypes) && plan.mealTypes.length > 0 ? (
                            (plan.mealTypes as string[]).map((type) => (
                              <span
                                key={type}
                                className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                              >
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              All meals
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                          {getDurationText(plan.durationWeeks ?? 0)}
                        </div>
                        {plan.stats && (
                          <div className="text-xs text-gray-500 dark:text-neutral-300">
                            {plan.stats.totalDays} days total
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-gray-900 dark:text-neutral-100">
                          {formatCurrency(plan.totalPrice ?? 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-neutral-300">
                          {plan.assignmentCount || 0} meals assigned
                        </div>
                        {plan.stats && (
                          <div className="text-xs text-blue-600 dark:text-blue-300">
                            {plan.stats.avgMealsPerDay} meals/day avg
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {plan.nutritionInfo?.avgCaloriesPerDay ? (
                          <div className="text-sm text-orange-600 dark:text-orange-300 font-medium">
                            {Math.round(plan.nutritionInfo.avgCaloriesPerDay)} cal/day
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 dark:text-neutral-500">-</div>
                        )}
                        {plan.targetAudience && (
                          <div className="text-xs text-gray-500 dark:text-neutral-300">
                            For {plan.targetAudience}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PermissionGate
                        module="mealPlans"
                        action="publish"
                        fallback={
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${plan.isPublished
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : (!plan.assignmentCount || plan.assignmentCount === 0)
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                            }`}>
                            {plan.isPublished ? 'Published' : (!plan.assignmentCount || plan.assignmentCount === 0) ? 'No Meals' : 'Draft'}
                          </span>
                        }
                      >
                        <button
                          onClick={() => handleTogglePublish(plan)}
                          disabled={!plan.isPublished && (!plan.assignmentCount || plan.assignmentCount === 0)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${plan.isPublished
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : (!plan.assignmentCount || plan.assignmentCount === 0)
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 opacity-75 cursor-not-allowed'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-900/50'
                            }`}
                          title={
                            !plan.isPublished && (!plan.assignmentCount || plan.assignmentCount === 0)
                              ? 'Schedule meals before publishing'
                              : plan.isPublished ? 'Click to unpublish' : 'Click to publish'
                          }
                        >
                          {plan.isPublished ? 'Published' : (!plan.assignmentCount || plan.assignmentCount === 0) ? 'No Meals' : 'Draft'}
                        </button>
                      </PermissionGate>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {/* Schedule Button */}
                        <PermissionGate module="mealPlans" action="schedule">
                          <button
                            onClick={() => {
                              setSelectedMealPlan(plan)
                              setSchedulerModalOpen(true)
                            }}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            title="Schedule meals for this plan"
                            aria-label={`Schedule meals for ${plan.planName}`}
                          >
                            <i className="fi fi-sr-calendar mr-1"></i>
                            Schedule
                          </button>
                        </PermissionGate>

                        {/* Edit Button */}
                        <PermissionGate module="mealPlans" action="edit">
                          <button
                            onClick={() => {
                              setSelectedMealPlan(plan)
                              setEditModalOpen(true)
                            }}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            title="Edit meal plan details"
                            aria-label={`Edit ${plan.planName}`}
                          >
                            <i className="fi fi-sr-pencil mr-1"></i>
                            Edit
                          </button>
                        </PermissionGate>

                        {/* Duplicate Button */}
                        <PermissionGate module="mealPlans" action="create">
                          <button
                            onClick={() => handleDuplicateMealPlan(plan)}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/30 hover:bg-gray-200 dark:hover:bg-gray-900/50 transition-colors"
                            title="Duplicate meal plan"
                            aria-label={`Duplicate ${plan.planName}`}
                          >
                            <i className="fi fi-sr-copy mr-1"></i>
                            Duplicate
                          </button>
                        </PermissionGate>

                        {/* Delete Button */}
                        <PermissionGate module="mealPlans" action="delete">
                          <button
                            onClick={() => handleDeleteMealPlan(plan._id)}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete meal plan permanently"
                            aria-label={`Delete ${plan.planName}`}
                          >
                            <i className="fi fi-sr-trash mr-1"></i>
                            Delete
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {(pagination?.totalPages || 0) > 1 && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-neutral-200">
              Showing {((pagination?.currentPage || 1) - 1) * (filters.limit || 20) + 1} to{' '}
              {Math.min((pagination?.currentPage || 1) * (filters.limit || 20), pagination?.totalMealPlans || 0)} of{' '}
              {pagination?.totalMealPlans || 0} meal plans
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                disabled={!pagination?.hasPrev}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                {pagination?.currentPage || 1} of {pagination?.totalPages || 1}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                disabled={!pagination?.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateMealPlanModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateMealPlan}
      />

      {selectedMealPlan && (
        <>
          <EditMealPlanModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false)
              setSelectedMealPlan(null)
            }}
            onSubmit={handleEditMealPlan}
            mealPlan={selectedMealPlan}
          />

          <MealPlanScheduler
            isOpen={schedulerModalOpen}
            onClose={() => {
              setSchedulerModalOpen(false)
              setSelectedMealPlan(null)
            }}
            mealPlan={(apiPlanMap[selectedMealPlan?._id ?? ''] as ApiMealPlan) || (mealPlans.find(p => p._id === selectedMealPlan?._id) as unknown as ApiMealPlan) || (selectedMealPlan as unknown as ApiMealPlan)}
            onUpdate={fetchMealPlans}
          />

          <DuplicateMealPlanModal
            isOpen={duplicateModalOpen}
            onClose={() => {
              if (!isLoading) {
                setDuplicateModalOpen(false)
                setSelectedMealPlan(null)
              }
            }}
            onSubmit={handleDuplicateSubmit}
            mealPlan={selectedMealPlan}
            isLoading={isLoading}
          />
        </>
      )}

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={createTagModalOpen}
        onClose={() => setCreateTagModalOpen(false)}
        onSubmit={handleCreateTag}
        loading={isLoading}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        confirmText={confirmationModal.confirmText}
        loading={confirmationModal.loading}
      />
    </div>
  )
}

export default MealPlans