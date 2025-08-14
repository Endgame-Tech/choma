import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useChefs } from '../hooks/useChefs'
import chefApiService from '../services/chefApiService'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { PermissionGate } from '../contexts/PermissionContext'
import type { Chef } from '../types'

const Chefs: React.FC = () => {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    action: string
    chef: Chef | null
    title: string
    message: string
    confirmText: string
    cancelText: string
    type: 'warning' | 'danger' | 'success'
  }>({
    isOpen: false,
    action: '',
    chef: null,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Cancel',
    type: 'warning'
  })

  const { toasts, removeToast, success, error, warning } = useToast()

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Build filters (memoized to prevent infinite re-renders)
  const filters = useMemo(() => {
    type ChefFilters = {
      search?: string
      status?: string
    }

    const baseFilters: ChefFilters = {
      search: debouncedSearchTerm || undefined,
    }

    if (filter !== 'all') {
      baseFilters.status = filter === 'active' ? 'Active' :
        filter === 'pending' ? 'Pending' :
          filter === 'inactive' ? 'Inactive' :
            filter === 'suspended' ? 'Suspended' : undefined
    }

    return baseFilters
  }, [debouncedSearchTerm, filter])

  const { chefs, loading, error: chefsError, refreshChefs } = useChefs(filters)

  // Helper function to show confirmation modal
  const showConfirmation = (action: string, chef: Chef) => {
    let title = ''
    let message = ''
    let confirmText = ''
    let type: 'warning' | 'danger' | 'success' = 'warning'

    switch (action) {
      case 'Suspended':
        title = 'Suspend Chef Account'
        message = `Are you sure you want to suspend ${chef.fullName}'s account? This action will:\n\n• Immediately disable their ability to accept new orders\n• Send them a notification email\n• Log this action for audit purposes\n\nThe chef will be notified via email and in-app notification.`
        confirmText = 'Suspend Account'
        type = 'danger'
        break
      case 'Inactive':
        title = 'Deactivate Chef Account'
        message = `Are you sure you want to deactivate ${chef.fullName}'s account? This action will:\n\n• Temporarily disable their account\n• Send them a notification email\n• Allow them to reapply if needed\n\nThe chef will be notified via email and in-app notification.`
        confirmText = 'Deactivate Account'
        type = 'warning'
        break
      case 'Active': {
        const previousStatus = chef.status
        title = previousStatus === 'Suspended' ? 'Unsuspend Chef Account' : 'Reactivate Chef Account'
        message = `Are you sure you want to ${previousStatus === 'Suspended' ? 'unsuspend' : 'reactivate'} ${chef.fullName}'s account? This action will:\n\n• Restore their full account access\n• Allow them to accept new orders\n• Send them a welcome back notification\n\nThe chef will be notified via email and in-app notification.`
        confirmText = previousStatus === 'Suspended' ? 'Unsuspend Account' : 'Reactivate Account'
        type = 'success'
        break
      }
      case 'Rejected':
        title = 'Reject Chef Application'
        message = `Are you sure you want to reject ${chef.fullName}'s application? This action will:\n\n• Permanently reject their application\n• Send them a rejection notification\n• Remove them from pending applications\n\nThe chef will be notified via email with feedback.`
        confirmText = 'Reject Application'
        type = 'danger'
        break
    }

    setConfirmationModal({
      isOpen: true,
      action,
      chef,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type
    })
  }

  // Handle confirmed action
  const handleConfirmedAction = async () => {
    if (!confirmationModal.chef || !confirmationModal.action) return

    try {
      const { chef, action } = confirmationModal

      if (action === 'Rejected') {
        await handleRejectChef(chef._id)
      } else {
        await handleStatusUpdate(chef._id, action)
      }

      // Email notifications are now handled by the API service
    } catch (err) {
      console.error('Failed to perform action:', err)
      error('Failed to perform action. Please try again.')
    } finally {
      setConfirmationModal(prev => ({ ...prev, isOpen: false }))
    }
  }

  // Handle status updates using the real API service
  const handleStatusUpdate = async (chefId: string, newStatus: string) => {
    try {
      const chef = chefs.find(c => c._id === chefId)
      const chefName = chef?.fullName || 'Chef'
      const oldStatus = chef?.status || 'Unknown'

      // Use the new API service that handles both status update and email notification
      const response = await chefApiService.updateChefStatus(chefId, {
        status: newStatus as 'Active' | 'Inactive' | 'Suspended' | 'Pending',
        reason: newStatus === 'Suspended' ? 'Account suspended by admin' :
          newStatus === 'Inactive' ? 'Account deactivated by admin' : undefined,
        sendEmail: true
      })

      await refreshChefs()

      // Provide feedback based on the API response
      if (response.emailSent && response.notificationSent) {
        if (newStatus === 'Active' && (oldStatus === 'Suspended' || oldStatus === 'Inactive')) {
          const action = oldStatus === 'Suspended' ? 'unsuspended' : 'reactivated'
          success(`Chef ${chefName} has been successfully ${action}! Email and in-app notification sent.`)
        } else if (newStatus === 'Suspended') {
          warning(`Chef ${chefName} has been suspended. Email and in-app notification sent.`)
        } else if (newStatus === 'Inactive') {
          warning(`Chef ${chefName} has been deactivated. Email and in-app notification sent.`)
        } else {
          success(`Chef ${chefName} status updated to ${newStatus}. Email and in-app notification sent!`)
        }
      } else if (response.emailSent || response.notificationSent) {
        // Partial success
        const successfulNotifications = []
        const failedNotifications = []

        if (response.emailSent) successfulNotifications.push('email')
        else failedNotifications.push('email')

        if (response.notificationSent) successfulNotifications.push('in-app notification')
        else failedNotifications.push('in-app notification')

        if (newStatus === 'Active' && (oldStatus === 'Suspended' || oldStatus === 'Inactive')) {
          const action = oldStatus === 'Suspended' ? 'unsuspended' : 'reactivated'
          success(`Chef ${chefName} has been successfully ${action}! ${successfulNotifications.join(' and ')} sent.`)
          if (failedNotifications.length > 0) {
            warning(`However, ${failedNotifications.join(' and ')} failed to send.`)
          }
        } else {
          success(`Chef ${chefName} status updated to ${newStatus}. ${successfulNotifications.join(' and ')} sent!`)
          if (failedNotifications.length > 0) {
            warning(`However, ${failedNotifications.join(' and ')} failed to send.`)
          }
        }
      } else {
        // Both failed, but status was updated
        if (newStatus === 'Active' && (oldStatus === 'Suspended' || oldStatus === 'Inactive')) {
          const action = oldStatus === 'Suspended' ? 'unsuspended' : 'reactivated'
          success(`Chef ${chefName} has been successfully ${action}!`)
        } else {
          success(`Chef ${chefName} status updated to ${newStatus}`)
        }
        if (response.statusChanged) {
          warning('Status updated but both email and in-app notifications failed to send')
        }
      }
    } catch (err) {
      console.error('Failed to update chef status:', err)
      error('Failed to update chef status. Please try again.')
    }
  }

  const handleApproveChef = async (chefId: string) => {
    try {
      const chef = chefs.find(c => c._id === chefId)
      if (!chef) {
        console.error('Chef not found')
        return
      }

      const response = await chefApiService.approveChef(chefId, { sendEmail: true })

      if (response.emailSent && response.notificationSent) {
        success(`Chef ${chef.fullName} approved! Welcome email and in-app notification sent.`)
      } else if (response.emailSent || response.notificationSent) {
        const sent = []
        const failed = []
        if (response.emailSent) sent.push('email')
        else failed.push('email')
        if (response.notificationSent) sent.push('in-app notification')
        else failed.push('in-app notification')

        success(`Chef ${chef.fullName} approved! ${sent.join(' and ')} sent.`)
        if (failed.length > 0) {
          warning(`However, ${failed.join(' and ')} failed to send.`)
        }
      } else {
        success(`Chef ${chef.fullName} approved successfully!`)
        if (response.success) {
          warning('Chef approved but both email and in-app notifications failed')
        }
      }

      await refreshChefs()
    } catch (err) {
      console.error('Failed to approve chef:', err)
      error('Failed to approve chef. Please try again.')
    }
  }

  const handleRejectChef = async (chefId: string, reason?: string) => {
    try {
      const chef = chefs.find(c => c._id === chefId)
      if (!chef) {
        console.error('Chef not found')
        return
      }

      const response = await chefApiService.rejectChef(chefId, {
        reason: reason || 'Application does not meet current requirements',
        sendEmail: true
      })

      if (response.emailSent && response.notificationSent) {
        success(`Chef ${chef.fullName} rejected. Email and in-app notification sent.`)
      } else if (response.emailSent || response.notificationSent) {
        const sent = []
        const failed = []
        if (response.emailSent) sent.push('email')
        else failed.push('email')
        if (response.notificationSent) sent.push('in-app notification')
        else failed.push('in-app notification')

        success(`Chef ${chef.fullName} rejected. ${sent.join(' and ')} sent.`)
        if (failed.length > 0) {
          warning(`However, ${failed.join(' and ')} failed to send.`)
        }
      } else {
        success(`Chef ${chef.fullName} rejected successfully!`)
        if (response.success) {
          warning('Chef rejected but both email and in-app notifications failed')
        }
      }

      await refreshChefs()
    } catch (err) {
      console.error('Failed to reject chef:', err)
      error('Failed to reject chef. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'busy':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      case 'offline':
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading chefs...</p>
        </div>
      </div>
    )
  }

  if (chefsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 dark:text-red-300 mr-3"><i className="fi fi-sr-warning"></i></div>
          <div>
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading chefs</h3>
            <p className="text-red-600 dark:text-red-300 text-sm">{chefsError}</p>
            <button
              onClick={refreshChefs}
              className="mt-2 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
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
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Chefs</h1>
        <p className="text-gray-600 dark:text-neutral-200">Manage chef profiles and assignments ({chefs.length} chefs)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar and View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md relative">
              <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
              <input
                type="text"
                placeholder="Search by chef name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={refreshChefs}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <i className="fi fi-sr-refresh"></i>
              Refresh
            </button>
          </div>

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
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-700/30 p-1 rounded-lg w-fit">
          {['all', 'active', 'pending', 'inactive', 'suspended'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === filterType
                ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm'
                : 'text-gray-500 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-neutral-100'
                }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Chefs
            </button>
          ))}
        </div>
      </div>

      {/* Chefs Display */}
      {chefs.length === 0 ? (
        <div className="bg-white/90 dark:bg-neutral-800/90 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 text-center">
          <div className="text-4xl mb-2"><i className="fi fi-sr-user"></i></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Chefs Found</h3>
          <p className="text-gray-600 dark:text-neutral-200">No chefs match your current filters.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {chefs.map((chef) => (
            <div key={chef._id} className="group bg-white dark:bg-neutral-800 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-neutral-700 overflow-hidden transition-all duration-300 hover:-translate-y-1 relative">
              {/* Status Badge - Floating */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getStatusColor(chef.status)}`}>
                  {chef.status}
                </span>
                {chef.availability && (
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full shadow-sm ${getAvailabilityColor(chef.availability)}`}>
                    {chef.availability}
                  </span>
                )}
              </div>

              {/* Chef Header - Enhanced */}
              <div className="relative p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-800 dark:to-neutral-700">
                <div className="flex items-center space-x-4">
                  {/* Enhanced Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-neutral-700">
                      <span className="text-2xl text-white"><i className="fi fi-sr-user"></i></span>
                    </div>
                    {/* Online indicator */}
                    {chef.availability === 'Available' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-neutral-700 rounded-full"></div>
                    )}
                  </div>

                  {/* Chef Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {chef.fullName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-neutral-300 truncate mb-1">{chef.email}</p>

                    {/* Rating Stars */}
                    {chef.rating !== undefined && (
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`fi fi-sr-star text-sm ${i < Math.floor(chef.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-neutral-600'}`}
                          ></i>
                        ))}
                        <span className="text-xs text-gray-600 dark:text-neutral-400 ml-1">({chef.rating}/5)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chef Details - Enhanced */}
              <div className="p-6 space-y-5">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Experience Card */}
                  {chef.experience !== undefined && (
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Experience</p>
                          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{chef.experience} years</p>
                        </div>
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <i className="fi fi-sr-time-past text-white text-sm"></i>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Orders Completed Card */}
                  {chef.totalOrdersCompleted !== undefined && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 border border-blue-200 dark:border-blue-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Orders</p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{chef.totalOrdersCompleted}</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <i className="fi fi-sr-check-circle text-white text-sm"></i>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity Progress */}
                {chef.currentCapacity !== undefined && chef.maxCapacity !== undefined && (
                  <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-200 dark:border-neutral-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <i className="fi fi-sr-chart-pie text-indigo-500"></i>
                        <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Capacity</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                        {chef.currentCapacity}/{chef.maxCapacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${chef.currentCapacity / chef.maxCapacity <= 0.5
                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                          : chef.currentCapacity / chef.maxCapacity <= 0.8
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-red-400 to-red-500'
                          } ${chef.currentCapacity === 0 ? 'w-0' :
                            chef.currentCapacity / chef.maxCapacity <= 0.25 ? 'w-1/4' :
                              chef.currentCapacity / chef.maxCapacity <= 0.5 ? 'w-1/2' :
                                chef.currentCapacity / chef.maxCapacity <= 0.75 ? 'w-3/4' :
                                  'w-full'
                          }`}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                      {((chef.currentCapacity / chef.maxCapacity) * 100).toFixed(0)}% capacity used
                    </p>
                  </div>
                )}

                {/* Location */}
                {chef.location && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fi fi-sr-marker text-white text-sm"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">Location</p>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 truncate">
                        {chef.location.city}{chef.location.area ? `, ${chef.location.area}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {chef.specialties && chef.specialties.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="fi fi-sr-utensils text-orange-500"></i>
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Specialties</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chef.specialties.slice(0, 3).map((specialty, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-800 dark:text-orange-200 rounded-full border border-orange-200 dark:border-orange-700/50"
                        >
                          {specialty}
                        </span>
                      ))}
                      {chef.specialties.length > 3 && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-full border border-gray-300 dark:border-neutral-600">
                          +{chef.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions - Enhanced */}
                <div className="pt-4 border-t border-gray-100 dark:border-neutral-700">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedChef(chef)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <i className="fi fi-sr-eye"></i> View Details
                    </button>

                    {chef.status === 'Pending' && (
                      <>
                        <PermissionGate module="chefs" action="approve">
                          <button
                            onClick={() => handleApproveChef(chef._id)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <i className="fi fi-sr-check-circle"></i> Approve
                          </button>
                        </PermissionGate>
                        <PermissionGate module="chefs" action="reject">
                          <button
                            onClick={() => handleRejectChef(chef._id)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <i className="fi fi-sr-cross-circle"></i> Reject
                          </button>
                        </PermissionGate>
                      </>
                    )}

                    {chef.status === 'Active' && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedChef(chef)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 flex items-center gap-1.5"
                        >
                          <i className="fi fi-sr-eye text-xs"></i> View
                        </button>
                        <PermissionGate module="chefs" action="update_status">
                          <button
                            onClick={() => showConfirmation('Inactive', chef)}
                            className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200 flex items-center gap-1.5"
                          >
                            <i className="fi fi-sr-pause text-xs"></i> Deactivate
                          </button>
                        </PermissionGate>
                        <PermissionGate module="chefs" action="update_status">
                          <button
                            onClick={() => showConfirmation('Suspended', chef)}
                            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200 flex items-center gap-1.5"
                          >
                            <i className="fi fi-sr-ban text-xs"></i> Suspend
                          </button>
                        </PermissionGate>
                      </div>
                    )}

                    {(chef.status === 'Inactive' || chef.status === 'Suspended') && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedChef(chef)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 flex items-center gap-1.5"
                        >
                          <i className="fi fi-sr-eye text-xs"></i> View
                        </button>
                        <PermissionGate module="chefs" action="update_status">
                          <button
                            onClick={() => showConfirmation('Active', chef)}
                            className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200 flex items-center gap-1.5"
                          >
                            <i className="fi fi-sr-check-circle text-xs"></i>
                            {chef.status === 'Suspended' ? 'Unsuspend' : 'Reactivate'}
                          </button>
                        </PermissionGate>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
          }
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/90 dark:bg-neutral-800/90 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-700/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Chef Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Location & Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Experience & Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Capacity & Orders
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
                {chefs.map((chef) => (
                  <tr key={chef._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                            <span className="text-xl text-white"><i className="fi fi-sr-user"></i></span>
                          </div>
                          {chef.availability === 'Available' && (
                            <div className="absolute -bottom-1 -right-3 w-4 h-4 bg-green-500 border-2 border-white dark:border-neutral-700 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{chef.fullName}</div>
                          <div className="text-sm text-gray-500 dark:text-neutral-300">{chef.email}</div>
                          {chef.specialties && chef.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {chef.specialties.slice(0, 2).map((specialty, index) => (
                                <span key={index} className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                  {specialty}
                                </span>
                              ))}
                              {chef.specialties.length > 2 && (
                                <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-neutral-700/30 text-gray-700 dark:text-neutral-300 rounded">
                                  +{chef.specialties.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {chef.location && (
                          <div className="text-sm text-gray-900 dark:text-neutral-100">
                            <i className="fi fi-sr-marker mr-1 text-gray-400"></i>
                            {chef.location.city}{chef.location.area ? `, ${chef.location.area}` : ''}
                          </div>
                        )}
                        {chef.phone && (
                          <div className="text-sm text-gray-500 dark:text-neutral-300">
                            <i className="fi fi-sr-phone-call mr-1 text-gray-400"></i>
                            {chef.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {chef.experience !== undefined && (
                          <div className="text-sm text-gray-900 dark:text-neutral-100">
                            <span className="font-medium">{chef.experience}</span> years exp.
                          </div>
                        )}
                        {chef.rating !== undefined && (
                          <div className="text-sm text-yellow-600 dark:text-yellow-400">
                            <i className="fi fi-sr-star mr-1"></i>
                            <span className="font-medium">{chef.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {chef.currentCapacity !== undefined && chef.maxCapacity !== undefined && (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-neutral-100">
                              <span className="font-medium">{chef.currentCapacity}/{chef.maxCapacity}</span> capacity
                            </div>
                            <div className="w-20 bg-gray-200 dark:bg-neutral-600 rounded-full h-1.5">
                              <div
                                className={`bg-blue-500 h-1.5 rounded-full transition-all duration-300 ${chef.currentCapacity === 0 ? 'w-0' :
                                  chef.currentCapacity / chef.maxCapacity <= 0.25 ? 'w-1/4' :
                                    chef.currentCapacity / chef.maxCapacity <= 0.5 ? 'w-1/2' :
                                      chef.currentCapacity / chef.maxCapacity <= 0.75 ? 'w-3/4' :
                                        'w-full'
                                  }`}
                              ></div>
                            </div>
                          </div>
                        )}
                        {chef.totalOrdersCompleted !== undefined && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            <i className="fi fi-sr-check-circle mr-1"></i>
                            <span className="font-medium">{chef.totalOrdersCompleted}</span> orders
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chef.status)}`}>
                          {chef.status}
                        </span>
                        {chef.availability && (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityColor(chef.availability)}`}>
                              {chef.availability}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedChef(chef)}
                          className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          <i className="fi fi-sr-eye"></i> View
                        </button>
                        {chef.status === 'Pending' && (
                          <div className="flex items-center space-x-1">
                            <PermissionGate module="chefs" action="approve">
                              <button
                                onClick={() => handleApproveChef(chef._id)}
                                className="text-green-600 dark:text-green-300 hover:text-green-900 dark:hover:text-green-400 flex items-center gap-1"
                              >
                                <i className="fi fi-sr-check-circle"></i> Approve
                              </button>
                            </PermissionGate>
                            <PermissionGate module="chefs" action="reject">
                              <button
                                onClick={() => handleRejectChef(chef._id)}
                                className="text-red-600 dark:text-red-300 hover:text-red-900 dark:hover:text-red-400 flex items-center gap-1"
                              >
                                <i className="fi fi-sr-cross-circle"></i> Reject
                              </button>
                            </PermissionGate>
                          </div>
                        )}
                        {chef.status === 'Active' && (
                          <div className="flex flex-wrap gap-1">
                            <PermissionGate module="chefs" action="update_status">
                              <button
                                onClick={() => showConfirmation('Inactive', chef)}
                                className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200"
                              >
                                Deactivate
                              </button>
                            </PermissionGate>
                            <PermissionGate module="chefs" action="update_status">
                              <button
                                onClick={() => showConfirmation('Suspended', chef)}
                                className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                              >
                                Suspend
                              </button>
                            </PermissionGate>
                          </div>
                        )}
                        {(chef.status === 'Inactive' || chef.status === 'Suspended') && (
                          <PermissionGate module="chefs" action="update_status">
                            <button
                              onClick={() => showConfirmation('Active', chef)}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200 flex items-center gap-1"
                            >
                              <i className="fi fi-sr-check-circle"></i>
                              {chef.status === 'Suspended' ? 'Unsuspend' : 'Reactivate'}
                            </button>
                          </PermissionGate>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comprehensive Chef Details Modal */}
      {selectedChef && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl text-white"><i className="fi fi-sr-user"></i></span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{selectedChef.fullName}</h3>
                    <p className="text-gray-600 dark:text-neutral-200">{selectedChef.email}</p>
                    <div className="flex items-center mt-1 gap-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedChef.status)}`}>
                        {selectedChef.status}
                      </span>
                      {selectedChef.availability && (
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAvailabilityColor(selectedChef.availability)}`}>
                          {selectedChef.availability}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChef(null)}
                  aria-label="Close chef details modal"
                  title="Close modal"
                  className="text-gray-400 dark:text-neutral-300 hover:text-gray-600 dark:hover:text-neutral-100 text-2xl"
                >
                  <i className="fi fi-sr-cross"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Personal Information Section */}
                <div className="bg-white/90 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-user mr-2"></i> Personal Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Full Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.fullName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Gender:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.gender || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Email:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Phone:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.phone}</p>
                      </div>
                    </div>
                    {selectedChef.alternatePhone && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Alternate Phone:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.alternatePhone}</p>
                      </div>
                    )}
                    {selectedChef.dateOfBirth && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Date of Birth:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identity Verification Section */}
                {selectedChef.identityVerification && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-id-badge mr-2"></i> Identity Verification
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">ID Type:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.identityVerification.idType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">ID Number:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.identityVerification.idNumber}</p>
                      </div>
                      {selectedChef.identityVerification.idExpiryDate && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Expiry Date:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.identityVerification.idExpiryDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Professional Details Section */}
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-user mr-2"></i> Professional Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Experience:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.experience || 0} years</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Rating:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.rating || 'N/A'}/5 <i className="fi fi-sr-star text-yellow-400"></i></p>
                      </div>
                    </div>

                    {selectedChef.specialties && selectedChef.specialties.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.specialties.map((specialty, index) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.languagesSpoken && selectedChef.languagesSpoken.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Languages:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.languagesSpoken.map((language: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.culinaryEducation && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Education:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.culinaryEducation}</p>
                      </div>
                    )}

                    {selectedChef.previousWorkExperience && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Work Experience:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.previousWorkExperience}</p>
                      </div>
                    )}

                    {selectedChef.certifications && selectedChef.certifications.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.certifications.map((cert: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.bio && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Bio:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Service Area Section */}
                {selectedChef.location && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-marker mr-2"></i> Location & Service Area
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedChef.location.streetAddress && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Address:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.streetAddress}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">City:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.city}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">State:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.state || selectedChef.location.area}</p>
                        </div>
                      </div>
                      {selectedChef.location.postalCode && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Postal Code:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.postalCode}</p>
                        </div>
                      )}
                      {selectedChef.location.serviceRadius && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Service Radius:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.serviceRadius} km</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kitchen & Equipment Section */}
                {selectedChef.kitchenDetails && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-utensils mr-2"></i> Kitchen & Equipment
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Has Own Kitchen:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails?.hasOwnKitchen ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Cook at Customer Location:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails?.canCookAtCustomerLocation ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Transportation:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails.transportationMethod}</p>
                      </div>
                      {selectedChef.kitchenDetails.kitchenEquipment && selectedChef.kitchenDetails.kitchenEquipment.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Equipment:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedChef.kitchenDetails.kitchenEquipment.map((equipment: string, index: number) => (
                              <span key={index} className="inline-block px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                                {equipment}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability & Capacity Section */}
                <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-clock mr-2"></i> Availability & Capacity
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Current Capacity:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.currentCapacity || 0}/{selectedChef.maxCapacity || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Availability:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.availability || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedChef.workingHours && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Working Hours:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.workingHours.start} - {selectedChef.workingHours.end}</p>
                      </div>
                    )}

                    {selectedChef.preferences?.workingDays && selectedChef.preferences.workingDays.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Working Days:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.preferences.workingDays.map((day: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded">
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-medium text-gray-700 dark:text-neutral-200">Orders Completed:</span>
                      <p className="text-gray-900 dark:text-neutral-100">{selectedChef.totalOrdersCompleted || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                {selectedChef.emergencyContact && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-warning mr-2"></i> Emergency Contact
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Relationship:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.relationship}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Phone:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details Section */}
                {selectedChef.bankDetails && (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-bank mr-2"></i> Bank Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Account Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.accountName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Account Number:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.accountNumber}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Bank:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.bankName}</p>
                        </div>
                      </div>
                      {selectedChef.bankDetails && selectedChef.bankDetails.bvn && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">BVN:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.bvn}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References Section */}
                {selectedChef.references && selectedChef.references.length > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-clipboard-list mr-2"></i> References
                    </h4>
                    <div className="space-y-4">
                      {selectedChef.references.map((ref, index) => (
                        <div key={index} className="border-l-4 border-indigo-400 dark:border-indigo-600 pl-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-neutral-100">{ref.name}</div>
                            <div className="grid grid-cols-2 gap-4 mt-1">
                              <div>
                                <span className="text-gray-600 dark:text-neutral-200">Relationship:</span> {ref.relationship}
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-neutral-200">Phone:</span> {ref.phone}
                              </div>
                            </div>
                            {ref.email && (
                              <div className="mt-1">
                                <span className="text-gray-600 dark:text-neutral-200">Email:</span> {ref.email}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Status & Dates Section */}
                <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-calendar mr-2"></i> Account Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {selectedChef.joinDate && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Join Date:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.joinDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.lastLogin && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Last Login:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.lastLogin).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.legalAgreements?.agreementDate && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Terms Agreed:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.legalAgreements.agreementDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.earnings && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Total Earnings:</span>
                          <p className="text-gray-900 dark:text-neutral-100">₦{selectedChef.earnings.totalEarned?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Current Balance:</span>
                          <p className="text-gray-900 dark:text-neutral-100">₦{selectedChef.earnings.currentBalance?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legal Agreements Section */}
                {selectedChef.legalAgreements && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-document-signed mr-2"></i> Legal Agreements
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToTerms ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToTerms ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Terms of Service</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToPrivacyPolicy ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToPrivacyPolicy ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Privacy Policy</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToBackgroundCheck ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToBackgroundCheck ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Background Check Consent</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  {selectedChef.status === 'Pending' && (
                    <>
                      <PermissionGate module="chefs" action="approve">
                        <button
                          onClick={() => {
                            handleApproveChef(selectedChef._id)
                            setSelectedChef(null)
                          }}
                          className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center gap-2"
                        >
                          <i className="fi fi-sr-check-circle"></i> Approve Chef
                        </button>
                      </PermissionGate>
                      <PermissionGate module="chefs" action="reject">
                        <button
                          onClick={() => {
                            handleRejectChef(selectedChef._id)
                            setSelectedChef(null)
                          }}
                          className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors flex items-center gap-2"
                        >
                          <i className="fi fi-sr-cross-circle"></i> Reject Chef
                        </button>
                      </PermissionGate>
                    </>
                  )}
                  {selectedChef.status === 'Active' && (
                    <div className="flex gap-2">
                      <PermissionGate module="chefs" action="update_status">
                        <button
                          onClick={() => {
                            showConfirmation('Inactive', selectedChef)
                            setSelectedChef(null)
                          }}
                          className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200 flex items-center gap-2"
                        >
                          <i className="fi fi-sr-pause"></i> Deactivate
                        </button>
                      </PermissionGate>
                      <PermissionGate module="chefs" action="update_status">
                        <button
                          onClick={() => {
                            showConfirmation('Suspended', selectedChef)
                            setSelectedChef(null)
                          }}
                          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200 flex items-center gap-2"
                        >
                          <i className="fi fi-sr-ban"></i> Suspend
                        </button>
                      </PermissionGate>
                    </div>
                  )}
                  {(selectedChef.status === 'Inactive' || selectedChef.status === 'Suspended') && (
                    <PermissionGate module="chefs" action="update_status">
                      <button
                        onClick={() => {
                          showConfirmation('Active', selectedChef)
                          setSelectedChef(null)
                        }}
                        className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200 flex items-center gap-2"
                      >
                        <i className="fi fi-sr-check-circle"></i>
                        {selectedChef.status === 'Suspended' ? 'Unsuspend Chef' : 'Reactivate Chef'}
                      </button>
                    </PermissionGate>
                  )}
                </div>
                <button
                  onClick={() => setSelectedChef(null)}
                  className="bg-gray-500 dark:bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                >
                  <i className="fi fi-sr-cross"></i> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${confirmationModal.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                confirmationModal.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/30' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}>
                <i className={`fi ${confirmationModal.type === 'danger' ? 'fi-sr-triangle-warning text-red-600 dark:text-red-400' :
                  confirmationModal.type === 'warning' ? 'fi-sr-exclamation text-orange-600 dark:text-orange-400' :
                    'fi-sr-check-circle text-green-600 dark:text-green-400'
                  }`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                {confirmationModal.title}
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                {confirmationModal.message}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-all duration-200"
              >
                {confirmationModal.cancelText}
              </button>
              <button
                onClick={handleConfirmedAction}
                className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 ${confirmationModal.type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white' :
                  confirmationModal.type === 'warning'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                    'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                {confirmationModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default Chefs