import React, { useState, useEffect } from 'react'
import { mealsApi, type Meal, type MealFilters } from '../services/mealApi'
import CreateMealModal from '../components/CreateMealModal'
import EditMealModal from '../components/EditMealModal'
import BulkMealUpload from '../components/BulkMealUpload'
import MealCard from '../components/MealCard'
import ConfirmationModal from '../components/ConfirmationModal'
import { PermissionGate, usePermissionCheck } from '../contexts/PermissionContext'
import { activityLogger } from '../services/activityLogger'

const Meals: React.FC = () => {
  const { hasPermission, currentAdmin } = usePermissionCheck();
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

  // Search states
  const [searchInput, setSearchInput] = useState('')
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])

  // Filters (excluding search since we handle it separately)
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

  // View mode toggle
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

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

  // Get display meals (filtered results when searching, all meals otherwise)
  const displayMeals = searchInput.trim() ? filteredMeals : meals

  // Load initial data and when non-search filters change
  useEffect(() => {
    fetchMeals()
  }, [filters.category, filters.isAvailable, filters.page, filters.limit])

  // Handle search with immediate client-side filtering + debounced server search
  useEffect(() => {
    // Immediate client-side search
    if (searchInput.trim()) {
      const filtered = allMeals.filter(meal =>
        meal.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        meal.category?.toLowerCase().includes(searchInput.toLowerCase())
      )
      setFilteredMeals(filtered)
    } else {
      setFilteredMeals(allMeals)
    }

    // Debounced server search for more comprehensive results
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        fetchMealsWithSearch(searchInput)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, allMeals])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await mealsApi.getAllMeals(filters) as { data: { meals: Meal[], pagination: typeof pagination } }
      setAllMeals(response.data.meals)
      setMeals(response.data.meals)
      setFilteredMeals(response.data.meals)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meals')
    } finally {
      setLoading(false)
    }
  }

  const fetchMealsWithSearch = async (searchTerm: string) => {
    try {
      const searchFilters = { ...filters, search: searchTerm, page: 1 }
      const response = await mealsApi.getAllMeals(searchFilters) as { data: { meals: Meal[], pagination: typeof pagination } }
      setMeals(response.data.meals)
      setFilteredMeals(response.data.meals)
      setPagination(response.data.pagination)
    } catch (err) {
      console.error('Search failed:', err)
      // Don't show error for search failures, just keep current results
    }
  }

  const handleCreateMeal = async (mealData: Partial<Meal>) => {
    try {
      await mealsApi.createMeal(mealData)
      
      // Log activity
      if (currentAdmin) {
        await activityLogger.logMealAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'CREATE',
          undefined,
          { mealName: mealData.name, category: mealData.category }
        );
      }
      
      await fetchMeals()
      setCreateModalOpen(false)
    } catch (err) {
      // Log failed activity
      if (currentAdmin) {
        await activityLogger.logMealAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'CREATE',
          undefined,
          { mealName: mealData.name, successful: false, errorMessage: err instanceof Error ? err.message : 'Unknown error' }
        );
      }
      alert(`Failed to create meal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleEditMeal = async (mealData: Partial<Meal>) => {
    if (!selectedMeal) return

    try {
      await mealsApi.updateMeal(selectedMeal._id, mealData)
      
      // Log activity
      if (currentAdmin) {
        await activityLogger.logMealAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'UPDATE',
          selectedMeal._id,
          { mealName: selectedMeal.name, updatedFields: Object.keys(mealData) }
        );
      }
      
      await fetchMeals()
      setEditModalOpen(false)
      setSelectedMeal(null)
    } catch (err) {
      // Log failed activity
      if (currentAdmin) {
        await activityLogger.logMealAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'UPDATE',
          selectedMeal._id,
          { mealName: selectedMeal.name, successful: false, errorMessage: err instanceof Error ? err.message : 'Unknown error' }
        );
      }
      alert(`Failed to update meal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDeleteMeal = async (id: string) => {
    const meal = meals.find(m => m._id === id)
    const mealName = meal?.name || 'this meal'

    setConfirmationModal({
      isOpen: true,
      title: 'Delete Meal',
      message: `Are you sure you want to permanently delete "${mealName}"?\n\nThis action cannot be undone and will remove all meal data, pricing, and nutrition information.`,
      type: 'danger',
      confirmText: 'Delete Meal',
      onConfirm: async () => {
        setConfirmationModal(prev => ({ ...prev, loading: true }))
        try {
          await mealsApi.deleteMeal(id)
          
          // Log activity
          if (currentAdmin) {
            await activityLogger.logMealAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'DELETE',
              id,
              { mealName }
            );
          }
          
          await fetchMeals()
          setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
        } catch (err: unknown) {
          console.error('Delete meal error:', err);
          const errorMessage = (err as Error)?.message || 'Unknown error';

          // Show user-friendly error modal with force delete option
          setConfirmationModal({
            isOpen: true,
            title: 'Cannot Delete Meal',
            message: `❌ ${errorMessage}\n\nOptions:\n\n🔧 Manual Process:\n1. Go to Meal Plans management\n2. Remove this meal from assigned meal plans\n3. Then try deleting again\n\n⚡ Force Delete:\nAutomatically remove from all meal plans and delete the meal.`,
            type: 'warning',
            confirmText: 'Force Delete',
            onConfirm: async () => {
              setConfirmationModal(prev => ({ ...prev, loading: true }))
              try {
                // Call force delete API (we'll need to update the mealApi)
                await mealsApi.forceDeleteMeal(id)
                await fetchMeals()
                setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
              } catch (forceErr: unknown) {
                console.error('Force delete error:', forceErr);
                const forceErrorMessage = 'Failed to force delete meal';
                alert(`Failed to force delete meal: ${forceErrorMessage}`)
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

    const action = isAvailable ? 'enable' : 'disable'
    const actionPast = isAvailable ? 'enabled' : 'disabled'

    setConfirmationModal({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Selected Meals`,
      message: `Are you sure you want to ${action} ${selectedMeals.length} selected meal${selectedMeals.length > 1 ? 's' : ''}?\n\nThis action will update their availability status and they will be ${actionPast} for customers.`,
      type: 'warning',
      confirmText: `${action.charAt(0).toUpperCase() + action.slice(1)} Meals`,
      onConfirm: async () => {
        setConfirmationModal(prev => ({ ...prev, loading: true }))
        try {
          await mealsApi.bulkUpdateAvailability(selectedMeals, isAvailable)
          
          // Log activity
          if (currentAdmin) {
            await activityLogger.logMealAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'BULK_AVAILABILITY',
              undefined,
              { mealCount: selectedMeals.length, isAvailable, mealIds: selectedMeals }
            );
          }
          
          setSelectedMeals([])
          await fetchMeals()
          setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
        } catch (err) {
          // Log failed activity
          if (currentAdmin) {
            await activityLogger.logMealAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'BULK_AVAILABILITY',
              undefined,
              { 
                mealCount: selectedMeals.length, 
                isAvailable, 
                successful: false, 
                errorMessage: err instanceof Error ? err.message : 'Unknown error' 
              }
            );
          }
          alert(`Failed to update availability: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setConfirmationModal(prev => ({ ...prev, loading: false }))
        }
      },
      loading: false
    })
  }

  const handleBulkDelete = async () => {
    if (selectedMeals.length === 0) return

    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Meals',
      message: `⚠️ DANGER: Are you sure you want to permanently delete ${selectedMeals.length} selected meal${selectedMeals.length > 1 ? 's' : ''}?\n\nThis action cannot be undone and will remove:\n• All meal data and images\n• Pricing and cost information\n• Nutrition information\n• Chef assignments and notes\n\nDeleted meals cannot be recovered.`,
      type: 'danger',
      confirmText: `Delete ${selectedMeals.length} Meal${selectedMeals.length > 1 ? 's' : ''}`,
      onConfirm: async () => {
        setConfirmationModal(prev => ({ ...prev, loading: true }))
        try {
          // Delete each meal individually since there might not be a bulk delete API
          for (const mealId of selectedMeals) {
            await mealsApi.deleteMeal(mealId)
          }
          
          // Log activity
          if (currentAdmin) {
            await activityLogger.logMealAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'BULK_DELETE',
              undefined,
              { mealCount: selectedMeals.length, mealIds: selectedMeals }
            );
          }
          
          setSelectedMeals([])
          await fetchMeals()
          setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
        } catch (err: unknown) {
          console.error('Bulk delete meals error:', err);
          const errorMessage = 'Failed to delete some meals';

          // Show user-friendly error modal for bulk delete failures with force delete option
          setConfirmationModal({
            isOpen: true,
            title: 'Cannot Delete Some Meals',
            message: `❌ Some meals could not be deleted:\n\n${errorMessage}\n\nOptions:\n\n🔧 Manual Process:\n1. Go to Meal Plans management\n2. Remove these meals from assigned meal plans\n3. Then try deleting them again\n\n⚡ Force Delete All:\nAutomatically remove ALL selected meals from meal plans and delete them.`,
            type: 'warning',
            confirmText: 'Force Delete All',
            onConfirm: async () => {
              setConfirmationModal(prev => ({ ...prev, loading: true }))
              try {
                // Force delete each selected meal
                for (const mealId of selectedMeals) {
                  await mealsApi.forceDeleteMeal(mealId)
                }
                setSelectedMeals([])
                await fetchMeals()
                setConfirmationModal(prev => ({ ...prev, isOpen: false, loading: false }))
              } catch (forceErr: unknown) {
                console.error('Force bulk delete error:', forceErr);
                const forceErrorMessage = 'Failed to force delete meals';
                alert(`Failed to force delete meals: ${forceErrorMessage}`)
                setConfirmationModal(prev => ({ ...prev, loading: false }))
                // Still refresh to show any meals that were deleted before the error
                fetchMeals()
              }
            },
            loading: false
          })
        }
      },
      loading: false
    })
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
      selectedMeals.length === displayMeals.length ? [] : displayMeals.map(meal => meal._id)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading meals...</p>
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
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading meals</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchMeals}
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
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Meals Management</h1>
          <p className="text-gray-600 dark:text-neutral-200">Manage your food inventory and pricing ({pagination.totalMeals} meals)</p>
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

          <PermissionGate module="meals" action="bulkUpload">
            <button
              onClick={() => setBulkUploadModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
            >
              <i className="fi fi-sr-cloud-upload mr-2"></i>
              Bulk Upload
            </button>
          </PermissionGate>
          
          <PermissionGate module="meals" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Meal
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
                placeholder="Search meals..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by Category"
              title="Filter by Category"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Availability</label>
            <select
              value={filters.isAvailable?.toString() ?? ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                isAvailable: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by Availability"
              title="Filter by Availability"
            >
              <option value="">All Meals</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>

          {/* Results per page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Number of meals per page"
              title="Number of meals per page"
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
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedMeals.length} meals selected
            </span>
            <div className="flex items-center space-x-2">
              <PermissionGate module="meals" action="manageAvailability">
                <button
                  onClick={() => handleBulkAvailabilityUpdate(true)}
                  className="text-sm bg-green-600 dark:bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                >
                  <i className="fi fi-sr-check mr-1"></i>
                  Enable Selected
                </button>
              </PermissionGate>
              
              <PermissionGate module="meals" action="manageAvailability">
                <button
                  onClick={() => handleBulkAvailabilityUpdate(false)}
                  className="text-sm bg-orange-600 dark:bg-orange-700 text-white px-3 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"
                >
                  <i className="fi fi-sr-cross mr-1"></i>
                  Disable Selected
                </button>
              </PermissionGate>
              
              <PermissionGate module="meals" action="delete">
                <button
                  onClick={handleBulkDelete}
                  className="text-sm bg-red-600 dark:bg-red-700 text-white px-3 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                >
                  <i className="fi fi-sr-trash mr-1"></i>
                  Delete Selected
                </button>
              </PermissionGate>
              
              <button
                onClick={() => setSelectedMeals([])}
                className="text-sm text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meals Display */}
      {viewMode === 'cards' ? (
        /* Card View */
        <div className="space-y-6">
          {displayMeals.length === 0 ? (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg border border-gray-200 dark:border-neutral-700 py-12">
              <div className="text-center text-gray-500 dark:text-neutral-200">
                <div className="text-4xl mb-2"><i className="fi fi-sr-utensils"></i></div>
                <p>No meals found</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 underline"
                >
                  Create your first meal
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Select All for Cards */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 mr-2"
                    checked={selectedMeals.length === displayMeals.length && displayMeals.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600 dark:text-neutral-300">Select All Meals</span>
                </label>
                <span className="text-sm text-gray-500 dark:text-neutral-400">{displayMeals.length} meals</span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayMeals.map((meal) => (
                  <MealCard
                    key={meal._id}
                    meal={meal}
                    onEdit={hasPermission('meals', 'edit') ? (meal) => {
                      setSelectedMeal(meal)
                      setEditModalOpen(true)
                    } : undefined}
                    onDelete={hasPermission('meals', 'delete') ? handleDeleteMeal : undefined}
                    onToggleAvailability={hasPermission('meals', 'manageAvailability') ? handleToggleAvailability : undefined}
                    onSelect={handleSelectMeal}
                    isSelected={selectedMeals.includes(meal._id)}
                  />
                ))}
              </div>
            </>
          )}
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
                      checked={selectedMeals.length === displayMeals.length && displayMeals.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all meals"
                      title="Select all meals"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Meal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Nutrition & Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Category
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
                {displayMeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-200">
                      <div className="text-4xl mb-2"><i className="fi fi-sr-utensils"></i></div>
                      <p>No meals found</p>
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 underline"
                      >
                        Create your first meal
                      </button>
                    </td>
                  </tr>
                ) : (
                  displayMeals.map((meal) => (
                    <tr key={meal._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                          checked={selectedMeals.includes(meal._id)}
                          onChange={() => handleSelectMeal(meal._id)}
                          aria-label={`Select meal: ${meal.name}`}
                          title={`Select meal: ${meal.name}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 bg-gray-200 dark:bg-neutral-700 rounded-lg mr-4 flex items-center justify-center">
                            {meal.image ? (
                              <img src={meal.image} alt={meal.name} className="h-12 w-12 rounded-lg object-cover" />
                            ) : (
                              <span className="text-gray-400 dark:text-neutral-400 text-xl"><i className="fi fi-sr-utensils"></i></span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{meal.name}</div>
                            <div className="text-sm text-gray-500 dark:text-neutral-300">{meal.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          // Calculate proper pricing like in MealCard
                          const ingredients = meal.pricing?.ingredients || 0;
                          const cookingCosts = meal.pricing?.cookingCosts || 0;
                          const packaging = meal.pricing?.packaging || 0;
                          const delivery = meal.pricing?.delivery || 0;
                          const platformFee = meal.pricing?.platformFee || 0;

                          const totalCosts = ingredients + cookingCosts + packaging + delivery;
                          const profit = totalCosts * 0.4;
                          const totalPrice = totalCosts + profit + platformFee;
                          const chefEarnings = ingredients + cookingCosts + (profit * 0.5);
                          const chomaEarnings = packaging + delivery + (profit * 0.5) + platformFee;

                          return (
                            <div className="text-sm text-gray-900 dark:text-neutral-100">
                              <div className="font-medium">{formatCurrency(totalPrice)}</div>
                              <div className="text-xs text-gray-500 dark:text-neutral-300">
                                Ingredients: {formatCurrency(ingredients)} + Cooking: {formatCurrency(cookingCosts)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-neutral-300">
                                Costs: {formatCurrency(totalCosts)} + Profit: {formatCurrency(profit)}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                Chef: {formatCurrency(chefEarnings)} | Choma: {formatCurrency(chomaEarnings)}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-neutral-100">
                          <div>{meal.nutrition.calories} cal</div>
                          <div className="text-xs text-gray-500 dark:text-neutral-300">{meal.nutrition.weight}g • {meal.preparationTime} min</div>
                          <div className="text-xs mt-1">
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${meal.complexityLevel === 'low'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : meal.complexityLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              }`}>
                              {meal.complexityLevel}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {meal.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasPermission('meals', 'manageAvailability') ? (
                          <button
                            onClick={() => handleToggleAvailability(meal._id)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${meal.isAvailable
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              }`}
                          >
                            {meal.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${meal.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {meal.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <PermissionGate module="meals" action="edit">
                            <button
                              onClick={() => {
                                setSelectedMeal(meal)
                                setEditModalOpen(true)
                              }}
                              className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-400"
                              aria-label={`Edit meal: ${meal.name}`}
                              title={`Edit meal: ${meal.name}`}
                            >
                              <i className="fi fi-sr-pencil"></i>
                            </button>
                          </PermissionGate>
                          
                          <PermissionGate module="meals" action="delete">
                            <button
                              onClick={() => handleDeleteMeal(meal._id)}
                              className="text-red-600 dark:text-red-300 hover:text-red-900 dark:hover:text-red-400"
                              aria-label={`Delete meal: ${meal.name}`}
                              title={`Delete meal: ${meal.name}`}
                            >
                              <i className="fi fi-sr-trash"></i>
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-neutral-200">
              Showing {((pagination.currentPage - 1) * (filters.limit || 20)) + 1} to{' '}
              {Math.min(pagination.currentPage * (filters.limit || 20), pagination.totalMeals)} of{' '}
              {pagination.totalMeals} meals
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

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
          fetchMeals()
        }}
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

export default Meals