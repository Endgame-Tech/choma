import React from 'react'
import { useState, useEffect } from 'react'
import { mealPlansApi, type MealPlan, type MealPlanFilters } from '../services/mealApi'
import CreateMealPlanModal from '../components/CreateMealPlanModal'
import EditMealPlanModal from '../components/EditMealPlanModal'
import MealPlanScheduler from '../components/MealPlanScheduler'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CalendarDaysIcon,
  GlobeAltIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

const MealPlans: React.FC = () => {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMealPlans: 0,
    hasNext: false,
    hasPrev: false
  })

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
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false)
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null)

  useEffect(() => {
    fetchMealPlans()
  }, [filters])

  const fetchMealPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await mealPlansApi.getAllMealPlans(filters) as { data: { mealPlans: MealPlan[]; pagination: typeof pagination } }
      setMealPlans(response.data.mealPlans)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meal plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMealPlan = async (planData: Partial<MealPlan>) => {
    try {
      await mealPlansApi.createMealPlan(planData)
      await fetchMealPlans()
      setCreateModalOpen(false)
    } catch (err) {
      alert(`Failed to create meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleEditMealPlan = async (planData: Partial<MealPlan>) => {
    if (!selectedMealPlan) return

    try {
      await mealPlansApi.updateMealPlan(selectedMealPlan._id, planData)
      await fetchMealPlans()
      setEditModalOpen(false)
      setSelectedMealPlan(null)
    } catch (err) {
      alert(`Failed to update meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal plan? This action cannot be undone.')) {
      return
    }

    try {
      await mealPlansApi.deleteMealPlan(id)
      await fetchMealPlans()
    } catch (err) {
      alert(`Failed to delete meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleTogglePublish = async (plan: MealPlan) => {
    try {
      if (plan.isPublished) {
        await mealPlansApi.unpublishMealPlan(plan._id)
      } else {
        await mealPlansApi.publishMealPlan(plan._id)
      }
      await fetchMealPlans()
    } catch (err) {
      alert(`Failed to ${plan.isPublished ? 'unpublish' : 'publish'} meal plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPublishStatusColor = (isPublished: boolean) => {
    return isPublished
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getDurationText = (weeks: number) => {
    return weeks === 1 ? '1 Week' : `${weeks} Weeks`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal plans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error loading meal plans</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchMealPlans}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Meal Plans Management</h1>
          <p className="text-gray-600">Create and manage meal plan templates ({pagination.totalMealPlans} plans)</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Meal Plan
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search meal plans..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Publish Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status</label>
            <select
              value={filters.isPublished?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isPublished: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Plans</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>

          {/* Duration Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select
              value={filters.durationWeeks?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                durationWeeks: e.target.value === '' ? undefined : parseInt(e.target.value),
                page: 1 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meal plans found</h3>
          <p className="text-gray-500 mb-4">
            {filters.search || filters.isPublished !== undefined || filters.durationWeeks
              ? "No plans match your current filters."
              : "Get started by creating your first meal plan template."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Meal Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mealPlans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {/* Plan Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.planName}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                  </div>
                  {plan.coverImage && (
                    <img 
                      src={plan.coverImage} 
                      alt={plan.planName}
                      className="w-16 h-16 rounded-lg object-cover ml-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </div>

                {/* Status and Duration */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleTogglePublish(plan)}
                    className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border transition-colors ${getPublishStatusColor(plan.isPublished)} hover:opacity-80`}
                  >
                    {plan.isPublished ? (
                      <>
                        <GlobeAltIcon className="w-4 h-4 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeSlashIcon className="w-4 h-4 mr-1" />
                        Draft
                      </>
                    )}
                  </button>
                  <span className="text-sm text-gray-500">{getDurationText(plan.durationWeeks)}</span>
                </div>
              </div>

              {/* Plan Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Price</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(plan.totalPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Meals Assigned</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {plan.assignmentCount || 0}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                {plan.stats && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>📅 {plan.stats.totalDays} days total</div>
                    <div>🍽️ {plan.stats.avgMealsPerDay} meals/day avg</div>
                    {plan.nutritionInfo?.avgCaloriesPerDay > 0 && (
                      <div>🔥 {plan.nutritionInfo.avgCaloriesPerDay} cal/day avg</div>
                    )}
                  </div>
                )}

                {/* Target Audience */}
                {plan.targetAudience && (
                  <div className="mt-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {plan.targetAudience}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMealPlan(plan)
                      setSchedulerModalOpen(true)
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CalendarDaysIcon className="w-4 h-4 mr-1" />
                    Schedule
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedMealPlan(plan)
                      setEditModalOpen(true)
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteMealPlan(plan._id)}
                    className="px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan ID */}
                <div className="mt-2 text-xs text-gray-400 text-center">
                  ID: {plan.planId}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.currentPage - 1) * (filters.limit || 20)) + 1} to{' '}
              {Math.min(pagination.currentPage * (filters.limit || 20), pagination.totalMealPlans)} of{' '}
              {pagination.totalMealPlans} meal plans
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
            mealPlan={selectedMealPlan}
            onUpdate={fetchMealPlans}
          />
        </>
      )}
    </div>
  )
}

export default MealPlans;