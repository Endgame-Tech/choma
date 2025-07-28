import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { usersApi } from '../services/api'
import type { User } from '../types'

export default function Users() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  type Pagination = {
    currentPage: number
    totalPages: number
    totalUsers: number
    hasPrev: boolean
    hasNext: boolean
  }
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Build filters (memoized to prevent infinite re-renders)
  type UserFilters = {
    page: number
    limit: number
    search?: string
    status?: string
  }

  const filters = useMemo(() => {
    const baseFilters: UserFilters = {
      page: 1,
      limit: 50,
      search: debouncedSearchTerm || undefined,
    }
    
    if (filter !== 'all') {
      baseFilters.status = filter === 'active' ? 'Active' : 
                          filter === 'inactive' ? 'Inactive' : 
                          filter === 'suspended' ? 'Suspended' : undefined
    }
    
    return baseFilters
  }, [debouncedSearchTerm, filter])

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await usersApi.getUsers(filters)
      setUsers((result.users as User[]) || [])
      setPagination(result.pagination && typeof result.pagination.currentPage === 'number'
        ? {
            currentPage: Number(result.pagination.currentPage),
            totalPages: Number(result.pagination.totalPages),
            totalUsers: Number(result.pagination.totalUsers),
            hasPrev: Boolean(result.pagination.hasPrev),
            hasNext: Boolean(result.pagination.hasNext),
          }
        : null
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(errorMessage)
      setUsers([])
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filters])

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      await usersApi.updateUserStatus(userId, newStatus)
      await fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      for (const userId of selectedUsers) {
        await usersApi.updateUserStatus(userId, newStatus)
      }
      setSelectedUsers([]) // Clear selection
      await fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to bulk update user status:', error)
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length ? [] : users.map(user => user._id)
    )
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      case 'deleted':
        return 'bg-red-200 text-red-900'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
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
            <h3 className="text-red-800 font-medium">Error loading users</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={fetchUsers}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Users</h1>
        <p className="text-gray-600">Manage customer accounts and subscriptions ({users.length} users)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, email, or customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'active', 'inactive', 'suspended'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Users
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedUsers.length} users selected
            </span>
            <div className="flex items-center space-x-2">
              {/* Bulk Status Update */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="text-sm border rounded px-3 py-2 bg-white"
                defaultValue=""
              >
                <option value="" disabled>Update Status</option>
                <option value="Active">Activate</option>
                <option value="Inactive">Deactivate</option>
                <option value="Suspended">Suspend</option>
              </select>
              
              <button 
                onClick={() => setSelectedUsers([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">👥</div>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.customerId || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-gray-500">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.totalOrders || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.totalSpent ? formatCurrency(user.totalSpent) : '₦0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusUpdate(user._id, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className="text-xs border rounded px-2 py-1"
                          defaultValue=""
                        >
                          <option value="" disabled>Status</option>
                          <option value="Active">Activate</option>
                          <option value="Inactive">Deactivate</option>
                          <option value="Suspended">Suspend</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {users.length} of {pagination.totalUsers} users
          </div>
          <div className="flex space-x-2">
            <button
              disabled={!pagination.hasPrev}
              className="px-3 py-2 text-sm border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              disabled={!pagination.hasNext}
              className="px-3 py-2 text-sm border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium">{selectedUser.fullName}</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Email:</strong> {selectedUser.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedUser.phone || 'N/A'}
                  </div>
                  <div>
                    <strong>Customer ID:</strong> {selectedUser.customerId || 'N/A'}
                  </div>
                  <div>
                    <strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>

                {selectedUser.address && (
                  <div>
                    <strong>Address:</strong> {selectedUser.address}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Registration Date:</strong><br/>
                    {selectedUser.registrationDate ? new Date(selectedUser.registrationDate).toLocaleString() : 'N/A'}
                  </div>
                  {selectedUser.lastLogin && (
                    <div>
                      <strong>Last Login:</strong><br/>
                      {new Date(selectedUser.lastLogin).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Total Orders:</strong> {selectedUser.totalOrders || 0}
                  </div>
                  <div>
                    <strong>Total Spent:</strong> {selectedUser.totalSpent ? formatCurrency(selectedUser.totalSpent) : '₦0'}
                  </div>
                </div>

                {selectedUser.subscriptionStatus && (
                  <div>
                    <strong>Subscription Status:</strong> {selectedUser.subscriptionStatus}
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {selectedUser.emailVerified !== undefined && (
                    <div className="flex items-center">
                      <strong>Email Verified:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${selectedUser.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedUser.emailVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {selectedUser.profileComplete !== undefined && (
                    <div className="flex items-center">
                      <strong>Profile Complete:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${selectedUser.profileComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {selectedUser.profileComplete ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}