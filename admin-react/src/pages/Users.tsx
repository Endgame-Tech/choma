import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { usersApi } from '../services/api'
import type { User } from '../types'

const Users: React.FC = () => {
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
    }, 500)

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
      await fetchUsers()
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      for (const userId of selectedUsers) {
        await usersApi.updateUserStatus(userId, newStatus)
      }
      setSelectedUsers([])
      await fetchUsers()
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
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'inactive':
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'deleted':
        return 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
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
          <p className="text-gray-600 dark:text-neutral-200">Loading users...</p>
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
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading users</h3>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            <button 
              onClick={fetchUsers}
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
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Users</h1>
        <p className="text-gray-600 dark:text-neutral-200">Manage customer accounts and subscriptions ({users.length} users)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md relative">
            <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
            <input
              type="text"
              placeholder="Search by name, email, or customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <i className="fi fi-sr-refresh"></i>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-700/30 p-1 rounded-lg w-fit">
          {['all', 'active', 'inactive', 'suspended'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm'
                  : 'text-gray-500 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-neutral-100'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Users
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedUsers.length} users selected
            </span>
            <div className="flex items-center space-x-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value)
                    e.target.value = ''
                  }
                }}
                aria-label="Bulk update user status"
                title="Update status for selected users"
                className="text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-3 py-2"
                defaultValue=""
              >
                <option value="" disabled>Update Status</option>
                <option value="Active">Activate</option>
                <option value="Inactive">Deactivate</option>
                <option value="Suspended">Suspend</option>
              </select>
              
              <button 
                onClick={() => setSelectedUsers([])}
                className="text-sm text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white/90 dark:bg-neutral-800/90 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    aria-label="Select all users"
                    title="Select or deselect all users"
                    className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500" 
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Registration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-200">
                    <div className="text-4xl mb-2"><i className="fi fi-sr-users"></i></div>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        aria-label={`Select user ${user.fullName}`}
                        title={`Select or deselect ${user.fullName}`}
                        className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-lg text-blue-800 dark:text-blue-300"><i className="fi fi-sr-user"></i></span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{user.fullName}</div>
                          <div className="text-xs text-gray-500 dark:text-neutral-300">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400 dark:text-neutral-400">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">{user.customerId || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-gray-500 dark:text-neutral-300">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">{user.totalOrders || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        {user.totalSpent ? formatCurrency(user.totalSpent) : '₦0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          <i className="fi fi-sr-eye"></i> View
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusUpdate(user._id, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          aria-label={`Change status for user ${user.fullName}`}
                          title={`Change status for ${user.fullName}`}
                          className="text-xs border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-2 py-1"
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
          <div className="text-sm text-gray-700 dark:text-neutral-200">
            Showing {users.length} of {pagination.totalUsers} users
          </div>
          <div className="flex space-x-2">
            <button
              disabled={!pagination.hasPrev}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              disabled={!pagination.hasNext}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-neutral-100">{selectedUser.fullName}</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close user details modal"
                  title="Close modal"
                  className="text-gray-400 dark:text-neutral-300 hover:text-gray-600 dark:hover:text-neutral-100"
                >
                  <i className="fi fi-sr-cross"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Email:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.email}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Phone:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Customer ID:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.customerId || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>

                {selectedUser.address && (
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Address:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.address}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Registration Date:</strong>
                    <p className="text-gray-900 dark:text-neutral-100">{selectedUser.registrationDate ? new Date(selectedUser.registrationDate).toLocaleString() : 'N/A'}</p>
                  </div>
                  {selectedUser.lastLogin && (
                    <div>
                      <strong className="text-gray-700 dark:text-neutral-200">Last Login:</strong>
                      <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedUser.lastLogin).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Total Orders:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.totalOrders || 0}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Total Spent:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.totalSpent ? formatCurrency(selectedUser.totalSpent) : '₦0'}</span>
                  </div>
                </div>

                {selectedUser.subscriptionStatus && (
                  <div>
                    <strong className="text-gray-700 dark:text-neutral-200">Subscription Status:</strong> 
                    <span className="text-gray-900 dark:text-neutral-100">{selectedUser.subscriptionStatus}</span>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {selectedUser.emailVerified !== undefined && (
                    <div className="flex items-center">
                      <strong className="text-gray-700 dark:text-neutral-200">Email Verified:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${selectedUser.emailVerified ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                        {selectedUser.emailVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {selectedUser.profileComplete !== undefined && (
                    <div className="flex items-center">
                      <strong className="text-gray-700 dark:text-neutral-200">Profile Complete:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${selectedUser.profileComplete ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>
                        {selectedUser.profileComplete ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-500 dark:bg-neutral-600 text-white py-2 px-4 rounded-lg hover:bg-gray-600 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fi fi-sr-cross"></i> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users