import React, { useState, useEffect } from 'react'
import { PromoBanner, PromoBannerFilters, promoBannersApi, CreatePromoBannerData } from '../services/promoBannersApi'
import CreateBannerModal from '../components/CreateBannerModal'
import EditBannerModal from '../components/EditBannerModal'
import BannerPreview from '../components/BannerPreview'
import { PermissionGate, usePermissionCheck } from '../contexts/PermissionContext'

const PromoBanners: React.FC = () => {
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })

  // Search input state
  const [searchInput, setSearchInput] = useState('')

  // Filters
  const [filters, setFilters] = useState<PromoBannerFilters>({
    page: 1,
    limit: 10,
    status: undefined,
    targetAudience: undefined
  })

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<PromoBanner | null>(null)

  // Selected banners for bulk operations
  const [selectedBanners, setSelectedBanners] = useState<string[]>([])

  // Load banners
  useEffect(() => {
    loadBanners()
  }, [filters])

  const loadBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await promoBannersApi.getBanners(filters)

      if (response.success) {
        setBanners(response.data)
        setPagination(response.pagination)
      } else {
        setError(response.error || 'Failed to load banners')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { currentAdmin } = usePermissionCheck();

  const handleCreateBanner = async (bannerData: Omit<CreatePromoBannerData, 'createdBy'>) => {
    if (!currentAdmin) {
      setError('You must be logged in to create a banner.');
      return;
    }
    try {
      const response = await promoBannersApi.createBanner({ ...bannerData, createdBy: currentAdmin._id });
      if (response.success) {
        setCreateModalOpen(false)
        await loadBanners()
      } else {
        throw new Error(response.error || 'Failed to create banner')
      }
    } catch (err) {
      console.error('Create banner error:', err)
      throw err
    }
  }

  const handleEditBanner = async (bannerId: string, bannerData: Partial<CreatePromoBannerData>) => {
    try {
      const response = await promoBannersApi.updateBanner(bannerId, bannerData)
      if (response.success) {
        setEditModalOpen(false)
        setSelectedBanner(null)
        await loadBanners()
      } else {
        throw new Error(response.error || 'Failed to update banner')
      }
    } catch (err) {
      console.error('Update banner error:', err)
      throw err
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return
    }

    try {
      const response = await promoBannersApi.deleteBanner(bannerId)
      if (response.success) {
        await loadBanners()
      } else {
        throw new Error(response.error || 'Failed to delete banner')
      }
    } catch (err) {
      console.error('Delete banner error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete banner')
    }
  }

  const handleToggleActive = async (banner: PromoBanner) => {
    try {
      const response = await promoBannersApi.updateBanner(banner._id, {
        isActive: !banner.isActive
      })
      if (response.success) {
        await loadBanners()
      }
    } catch (err) {
      console.error('Toggle banner status error:', err)
    }
  }

  const handlePublishToggle = async (bannerId: string) => {
    try {
      const response = await promoBannersApi.togglePublishBanner(bannerId)
      if (response.success) {
        await loadBanners()
      } else {
        throw new Error(response.error || 'Failed to toggle publish status')
      }
    } catch (err) {
      console.error('Publish toggle error:', err)
      alert(err instanceof Error ? err.message : 'Failed to toggle publish status')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBanners.length === 0) return

    if (!window.confirm(`Are you sure you want to delete ${selectedBanners.length} banner(s)?`)) {
      return
    }

    try {
      await Promise.all(
        selectedBanners.map(bannerId => promoBannersApi.deleteBanner(bannerId))
      )
      setSelectedBanners([])
      await loadBanners()
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('Failed to delete some banners')
    }
  }

  const getStatusColor = (banner: PromoBanner) => {
    if (!banner.isActive) return 'bg-gray-100 text-gray-800'

    const now = new Date()
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (banner: PromoBanner) => {
    if (!banner.isActive) return 'Inactive'

    const now = new Date()
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'Scheduled'
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'Expired'
    }
    return 'Active'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading promo banners...</p>
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
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading promo banners</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={loadBanners}
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
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Promo Banners Management</h1>
          <p className="text-gray-600 dark:text-neutral-200">Create and manage promotional banners for the mobile app ({pagination.totalItems} banners)</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Create Button */}
          <PermissionGate module="banners" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Banner
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
                placeholder="Search banners..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: (e.target.value as 'active' | 'inactive') || undefined,
                page: 1
              }))}
              aria-label="Filter banners by status"
              title="Filter banners by active or inactive status"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Target Audience Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Target Audience</label>
            <select
              value={filters.targetAudience || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                targetAudience: e.target.value || undefined,
                page: 1
              }))}
              aria-label="Filter banners by target audience"
              title="Filter banners by target audience"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Audiences</option>
              <option value="all">All Users</option>
              <option value="new_users">New Users</option>
              <option value="existing_users">Existing Users</option>
              <option value="subscribers">Subscribers</option>
              <option value="non_subscribers">Non-Subscribers</option>
            </select>
          </div>

          {/* Results per page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              aria-label="Number of banners per page"
              title="Choose how many banners to show per page"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div className="text-center py-12 bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="text-4xl mb-2"><i className="fi fi-sr-picture"></i></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No banners found</h3>
          <p className="text-gray-500 dark:text-neutral-200 mb-4">
            {filters.search || filters.status || filters.targetAudience
              ? "No banners match your current filters."
              : "Get started by creating your first promotional banner."}
          </p>
          <PermissionGate module="banners" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Banner
            </button>
          </PermissionGate>
        </div>
      ) : (
        /* Banners Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {banners.map((banner) => (
            <BannerPreview
              key={banner._id}
              banner={banner}
              onPublishToggle={handlePublishToggle}
              onEdit={(banner) => {
                setSelectedBanner(banner)
                setEditModalOpen(true)
              }}
              onDelete={handleDeleteBanner}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-neutral-200">
              Showing {((pagination.currentPage - 1) * (filters.limit || 10)) + 1} to{' '}
              {Math.min(pagination.currentPage * (filters.limit || 10), pagination.totalItems)} of{' '}
              {pagination.totalItems} banners
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBannerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateBanner}
      />

      {selectedBanner && (
        <EditBannerModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedBanner(null)
          }}
          banner={selectedBanner}
          onSubmit={(data: Partial<CreatePromoBannerData>) => handleEditBanner(selectedBanner._id, data)}
        />
      )}
    </div>
  )
}

export default PromoBanners