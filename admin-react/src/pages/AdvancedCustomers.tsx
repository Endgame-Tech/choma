import React from 'react'
import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal'
import type { User } from '../types'

interface CustomerFilters {
  search: string
  status: string
  registrationDateFrom: string
  registrationDateTo: string
  totalSpentMin: string
  totalSpentMax: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

const AdvancedCustomers: React.FC = () => {
  // State management
  const [customers, setCustomers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false
  })

  // Filters
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: '',
    registrationDateFrom: '',
    registrationDateTo: '',
    totalSpentMin: '',
    totalSpentMax: '',
    sortBy: 'registrationDate',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  })

  // Selected customers for bulk operations
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomersThisMonth: 0,
    averageOrderValue: 0,
    topCustomersBySpend: [] as User[],
    customersByStatus: {} as Record<string, number>
  })

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getUsers(filters as unknown as Record<string, string | number | boolean | undefined>)
      setCustomers(response.users as User[])
      
      // Mock pagination for now
      setPagination({
        currentPage: filters.page,
        totalPages: Math.ceil(response.users.length / filters.limit),
        totalUsers: response.users.length,
        hasNext: filters.page < Math.ceil(response.users.length / filters.limit),
        hasPrev: filters.page > 1
      })

      // Calculate analytics
      calculateAnalytics(response.users as User[])
      
    } catch (err) {
      setMockData()
    } finally {
      setLoading(false)
    }
  }

  // Set mock data for demonstration
  const setMockData = () => {
    const mockCustomers: User[] = [
      {
        _id: '1',
        customerId: 'CUST001',
        fullName: 'Adebayo Johnson',
        email: 'adebayo@example.com',
        phone: '+234123456789',
        address: '123 Victoria Island, Lagos',
        status: 'Active',
        registrationDate: '2023-12-01T00:00:00Z',
        lastLogin: '2024-01-15T10:30:00Z',
        emailVerified: true,
        profileComplete: true,
        subscriptionStatus: 'Premium',
        totalOrders: 23,
        totalSpent: 145000
      },
      {
        _id: '2', 
        customerId: 'CUST002',
        fullName: 'Fatima Ahmed',
        email: 'fatima@example.com',
        phone: '+234987654321',
        address: '456 Wuse II, Abuja',
        status: 'Active',
        registrationDate: '2023-11-15T00:00:00Z',
        lastLogin: '2024-01-14T15:45:00Z',
        emailVerified: true,
        profileComplete: false,
        subscriptionStatus: 'Basic',
        totalOrders: 12,
        totalSpent: 89000
      },
      {
        _id: '3',
        customerId: 'CUST003', 
        fullName: 'Chidi Okafor',
        email: 'chidi@example.com',
        phone: '+234555666777',
        address: '789 GRA, Port Harcourt',
        status: 'Inactive',
        registrationDate: '2023-10-20T00:00:00Z',
        lastLogin: '2023-12-20T09:15:00Z',
        emailVerified: false,
        profileComplete: true,
        totalOrders: 5,
        totalSpent: 32000
      }
    ]
    
    setCustomers(mockCustomers)
    calculateAnalytics(mockCustomers)
  }

  // Calculate analytics
  const calculateAnalytics = (customerData: User[]) => {
    const total = customerData.length
    const active = customerData.filter(c => c.status === 'Active').length
    const thisMonth = customerData.filter(c => {
      const regDate = new Date(c.registrationDate)
      const now = new Date()
      return regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear()
    }).length
    
    const avgOrderValue = customerData.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / 
                         customerData.reduce((sum, c) => sum + (c.totalOrders || 0), 0) || 0

    const topCustomers = [...customerData]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5)

    const statusCounts = customerData.reduce((acc, customer) => {
      acc[customer.status] = (acc[customer.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    setAnalytics({
      totalCustomers: total,
      activeCustomers: active,
      newCustomersThisMonth: thisMonth,
      averageOrderValue: avgOrderValue,
      topCustomersBySpend: topCustomers,
      customersByStatus: statusCounts
    })
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof CustomerFilters, value: string | number) => {
    setFilters((prev: CustomerFilters) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value)
    }))
  }

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomers((prev: string[]) => 
      prev.includes(customerId) 
        ? prev.filter((id: string) => id !== customerId)
        : [...prev, customerId]
    )
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(customers.map(c => c._id))
    }
    setSelectAll(!selectAll)
  }

  // Handle status update
  const handleStatusUpdate = async (customerId: string, status: string) => {
    try {
      await usersApi.updateUserStatus(customerId, status)
      
      setCustomers((prev: User[]) => 
        prev.map((customer: User) => 
          customer._id === customerId 
            ? { ...customer, status: status as User['status'] }
            : customer
        )
      )
      
      if (selectedCustomer?._id === customerId) {
        setSelectedCustomer((prev: User | null) => prev ? { ...prev, status: status as User['status'] } : null)
      }
      
    } catch (error) {
      console.error('Failed to update customer status:', error)
      throw error
    }
  }

  // Export customers
  const handleExport = async () => {
    try {
      const blob = await usersApi.exportUsers(filters as unknown as Record<string, string | number | boolean | undefined>)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'customers.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', 
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'Inactive': return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
      case 'Suspended': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'Deleted': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default: return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  // Initialize data
  useEffect(() => {
    fetchCustomers()
  }, [filters])

  // Loading state
  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading customer data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Customer Management</h1>
          <p className="text-gray-600 dark:text-neutral-200">
            Manage and analyze your customer base ({analytics.totalCustomers} customers)
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-700 dark:text-neutral-100 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <i className="fi fi-sr-filter text-base mr-2"></i>
            Filters
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
          >
            <i className="fi fi-sr-download text-base mr-2"></i>
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
            <i className="fi fi-sr-user-add text-base mr-2"></i>
            Add Customer
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/90 dark:bg-neutral-800/90 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-200">Total Customers</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">{analytics.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-users-alt text-2xl text-gray-900 dark:text-neutral-100"></i>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-neutral-800/90 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-200">Active Customers</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">{analytics.activeCustomers}</p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {((analytics.activeCustomers / analytics.totalCustomers) * 100).toFixed(1)}% active
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-check-circle text-2xl text-gray-900 dark:text-neutral-100"></i>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-neutral-800/90 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-200">New This Month</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">{analytics.newCustomersThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-star text-2xl text-gray-900 dark:text-neutral-100"></i>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-neutral-800/90 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-200">Avg Order Value</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">
                {formatCurrency(analytics.averageOrderValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-usd-circle text-2xl text-gray-900 dark:text-neutral-100"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Search</label>
              <div className="relative">
                <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                aria-label="Filter by customer status"
                title="Filter customers by their status"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                aria-label="Sort customers by field"
                title="Choose field to sort customers by"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="registrationDate">Registration Date</option>
                <option value="fullName">Name</option>
                <option value="totalSpent">Total Spent</option>
                <option value="totalOrders">Total Orders</option>
                <option value="lastLogin">Last Login</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                aria-label="Sort order"
                title="Choose ascending or descending sort order"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors">
                Activate
              </button>
              <button className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors">
                Suspend
              </button>
              <button className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    aria-label="Select all customers"
                    title="Select or deselect all customers"
                    className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
              {customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer._id)}
                      onChange={() => handleCustomerSelect(customer._id)}
                      aria-label={`Select customer ${customer.fullName}`}
                      title={`Select or deselect ${customer.fullName}`}
                      className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {customer.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{customer.fullName}</div>
                        <div className="text-sm text-gray-500 dark:text-neutral-300">{customer.email}</div>
                        {customer.customerId && (
                          <div className="text-xs text-gray-400 dark:text-neutral-400">ID: {customer.customerId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                      {customer.status}
                    </span>
                    {!customer.emailVerified && (
                      <div className="text-xs text-red-500 dark:text-red-300 mt-1">Email not verified</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-neutral-100">
                    <div className="font-medium">{customer.totalOrders || 0}</div>
                    {customer.subscriptionStatus && (
                      <div className="text-xs text-gray-500 dark:text-neutral-300">{customer.subscriptionStatus}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-neutral-100">
                    {formatCurrency(customer.totalSpent || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-neutral-300">
                    {customer.lastLogin ? formatDate(customer.lastLogin) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-400 mr-4"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white/90 dark:bg-neutral-800/90 px-4 py-3 border-t border-gray-200 dark:border-neutral-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-neutral-200">
                Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)} of{' '}
                {pagination.totalUsers} customers
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                  {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer!}
        onUpdateStatus={handleStatusUpdate}
      />
    </div>
  )
}

export default AdvancedCustomers