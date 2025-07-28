import { useState, useEffect } from 'react'
import { mealsApi, type Meal, type MealFilters } from '../services/mealApi'
import CreateMealModal from '../components/CreateMealModal'
import EditMealModal from '../components/EditMealModal'
import BulkMealUpload from '../components/BulkMealUpload'
import { PlusIcon, PencilIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function Meals() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMeals: 0,
    hasNext: false,
    hasPrev: false
  })

  // Filters
  const [filters, setFilters] = useState<MealFilters>({
    page: 1,
    limit: 20,
    search: '',
    category: '',
    isAvailable: undefined
  })

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)

  // Selected meals for bulk operations
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])

  useEffect(() => {
    fetchMeals()
  }, [filters])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await mealsApi.getAllMeals(filters)
      setMeals(response.data.meals)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meals')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeal = async (mealData: Partial<Meal>) => {
    try {
      await mealsApi.createMeal(mealData)
      await fetchMeals()
      setCreateModalOpen(false)
    } catch (err) {
      alert(`Failed to create meal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleEditMeal = async (mealData: Partial<Meal>) => {
    if (!selectedMeal) return

    try {
      await mealsApi.updateMeal(selectedMeal._id, mealData)
      await fetchMeals()
      setEditModalOpen(false)
      setSelectedMeal(null)
    } catch (err) {
      alert(`Failed to update meal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDeleteMeal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal? This action cannot be undone.')) {
      return
    }

    try {
      await mealsApi.deleteMeal(id)
      await fetchMeals()
    } catch (err) {
      alert(`Failed to delete meal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleToggleAvailability = async (id: string) => {
    try {
      await mealsApi.toggleMealAvailability(id)
      await fetchMeals()
    } catch (err) {
      alert(`Failed to toggle availability: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleBulkAvailabilityUpdate = async (isAvailable: boolean) => {
    if (selectedMeals.length === 0) return

    try {
      await mealsApi.bulkUpdateAvailability(selectedMeals, isAvailable)
      setSelectedMeals([])
      await fetchMeals()
    } catch (err) {
      alert(`Failed to update availability: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSelectMeal = (mealId: string) => {
    setSelectedMeals(prev => 
      prev.includes(mealId) 
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    )
  }

  const handleSelectAll = () => {
    setSelectedMeals(
      selectedMeals.length === meals.length ? [] : meals.map(meal => meal._id)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meals...</p>
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
            <h3 className="text-red-800 font-medium">Error loading meals</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchMeals}
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
          <h1 className="text-3xl font-semibold text-gray-900">Meals Management</h1>
          <p className="text-gray-600">Manage your food inventory and pricing ({pagination.totalMeals} meals)</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setBulkUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Meal
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search meals..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
              <option value="Dessert">Dessert</option>
              <option value="Beverage">Beverage</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
            <select
              value={filters.isAvailable?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isAvailable: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Meals</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
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
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMeals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedMeals.length} meals selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAvailabilityUpdate(true)}
                className="text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              >
                Enable Selected
              </button>
              <button
                onClick={() => handleBulkAvailabilityUpdate(false)}
                className="text-sm bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
              >
                Disable Selected
              </button>
              <button 
                onClick={() => setSelectedMeals([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meals Table */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={selectedMeals.length === meals.length && meals.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nutrition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {meals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">🍽️</div>
                    <p>No meals found</p>
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Create your first meal
                    </button>
                  </td>
                </tr>
              ) : (
                meals.map((meal) => (
                  <tr key={meal._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedMeals.includes(meal._id)}
                        onChange={() => handleSelectMeal(meal._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg mr-4 flex items-center justify-center">
                          {meal.image ? (
                            <img src={meal.image} alt={meal.name} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xl">🍽️</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{meal.name}</div>
                          <div className="text-sm text-gray-500">{meal.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{formatCurrency(meal.pricing.totalPrice)}</div>
                        <div className="text-xs text-gray-500">
                          Base: {formatCurrency(meal.pricing.basePrice)} + 
                          Platform: {formatCurrency(meal.pricing.platformFee)} + 
                          Chef: {formatCurrency(meal.pricing.chefFee)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{meal.nutrition.calories} cal</div>
                        <div className="text-xs text-gray-500">{meal.nutrition.weight}g</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {meal.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(meal._id)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          meal.isAvailable
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {meal.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedMeal(meal)
                            setEditModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMeal(meal._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * (filters.limit || 20)) + 1} to{' '}
                {Math.min(pagination.currentPage * (filters.limit || 20), pagination.totalMeals)} of{' '}
                {pagination.totalMeals} meals
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
      </div>

      {/* Modals */}
      <CreateMealModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateMeal}
      />

      {selectedMeal && (
        <EditMealModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedMeal(null)
          }}
          onSubmit={handleEditMeal}
          meal={selectedMeal}
        />
      )}

      <BulkMealUpload
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onSuccess={() => {
          setBulkUploadModalOpen(false)
          fetchMeals() // Refresh the meals list after successful upload
        }}
      />
    </div>
  )
}