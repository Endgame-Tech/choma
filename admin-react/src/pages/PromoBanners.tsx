import React, { useState, useEffect } from 'react'
import { PromoBanner, PromoBannerFilters, promoBannersApi, CreatePromoBannerData } from '../services/promoBannersApi'
import CreateBannerModal from '../components/CreateBannerModal'
import EditBannerModal from '../components/EditBannerModal'
import { PermissionGate } from '../contexts/PermissionContext'

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

  const handleCreateBanner = async (bannerData: CreatePromoBannerData) => {
    try {
      const response = await promoBannersApi.createBanner(bannerData)
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

  const handleEditBanner = async (bannerId: string, bannerData: Partial<PromoBanner>) => {
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Promo Banners</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage promotional banners for the mobile app</p>
          </div>
          <PermissionGate module="banners" action="create">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create Banner
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search banners..."
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: (e.target.value as 'active' | 'inactive') || undefined,
                page: 1
              }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Target Audience Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Audience
            </label>
            <select
              value={filters.targetAudience || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                targetAudience: e.target.value || undefined,
                page: 1
              }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Audiences</option>
              <option value="all">All Users</option>
              <option value="new_users">New Users</option>
              <option value="existing_users">Existing Users</option>
              <option value="subscribers">Subscribers</option>
              <option value="non_subscribers">Non-Subscribers</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={loadBanners}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh
            </button>
            {selectedBanners.length > 0 && (
              <PermissionGate module="banners" action="delete">
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Delete ({selectedBanners.length})
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading banners...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading banners</h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Banners List */}
      {!loading && !error && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pagination.totalItems}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Banners</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {banners.filter(b => b.isActive).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Banners</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {banners.reduce((sum, b) => sum + (b.impressions || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Impressions</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {banners.reduce((sum, b) => sum + (b.clicks || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</div>
            </div>
          </div>

          {/* Banners Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedBanners.length === banners.length && banners.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBanners(banners.map(b => b._id))
                          } else {
                            setSelectedBanners([])
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Banner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {banners.map((banner) => (
                    <tr key={banner._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedBanners.includes(banner._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBanners(prev => [...prev, banner._id])
                            } else {
                              setSelectedBanners(prev => prev.filter(id => id !== banner._id))
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="h-12 w-20 object-cover rounded-lg mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {banner.bannerId}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Priority: {banner.priority}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {banner.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {banner.subtitle}
                          </div>
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            CTA: {banner.ctaText} → {banner.ctaDestination}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(banner)}`}>
                          {getStatusText(banner)}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {banner.targetAudience.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="space-y-1">
                          <div>{banner.impressions?.toLocaleString() || 0} impressions</div>
                          <div>{banner.clicks?.toLocaleString() || 0} clicks</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            CTR: {banner.ctr || 0}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="space-y-1">
                          {banner.startDate && (
                            <div>Start: {new Date(banner.startDate).toLocaleDateString()}</div>
                          )}
                          {banner.endDate && (
                            <div>End: {new Date(banner.endDate).toLocaleDateString()}</div>
                          )}
                          {!banner.startDate && !banner.endDate && (
                            <div>No schedule</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <PermissionGate module="banners" action="edit">
                            <button
                              onClick={() => {
                                setSelectedBanner(banner)
                                setEditModalOpen(true)
                              }}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              Edit
                            </button>
                          </PermissionGate>
                          <PermissionGate module="banners" action="edit">
                            <button
                              onClick={() => handleToggleActive(banner)}
                              className={banner.isActive ? "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"}
                            >
                              {banner.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </PermissionGate>
                          <PermissionGate module="banners" action="delete">
                            <button
                              onClick={() => handleDeleteBanner(banner._id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
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

            {/* Empty State */}
            {banners.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No banners found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first promotional banner.
                </p>
                <div className="mt-6">
                  <PermissionGate module="banners" action="create">
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create Banner
                    </button>
                  </PermissionGate>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing{' '}
                        <span className="font-medium">
                          {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{pagination.totalItems}</span> banners
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                          disabled={pagination.currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
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
          onSubmit={(data: Partial<PromoBanner>) => handleEditBanner(selectedBanner._id, data)}
        />
      )}
    </div>
  )
}

export default PromoBanners