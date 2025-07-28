import React, { useState, useEffect } from 'react'
import { usersApi } from '../services/api'
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal'
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, UserPlusIcon } from '@heroicons/react/24/outline'
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

export default function AdvancedCustomers() {
  // State management
  const [customers, setCustomers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setError(null)

      const response = await usersApi.getUsers(filters)
      setCustomers(response.users)
      
      // Mock pagination for now
      setPagination({
        currentPage: filters.page,
        totalPages: Math.ceil(response.users.length / filters.limit),
        totalUsers: response.users.length,
        hasNext: filters.page < Math.ceil(response.users.length / filters.limit),
        hasPrev: filters.page > 1
      })

      // Calculate analytics
      calculateAnalytics(response.users)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
      
      // Mock data for demonstration
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
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset page when other filters change
    }))
  }

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
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
      
      // Update local state
      setCustomers(prev => 
        prev.map(customer => 
          customer._id === customerId 
            ? { ...customer, status: status as any }
            : customer
        )
      )
      
      // Update selected customer if open
      if (selectedCustomer?._id === customerId) {
        setSelectedCustomer(prev => prev ? { ...prev, status: status as any } : null)
      }
      
    } catch (error) {
      console.error('Failed to update customer status:', error)
      throw error
    }
  }

  // Export customers
  const handleExport = async () => {
    try {
      const blob = await usersApi.exportUsers(filters)
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
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Inactive': return 'bg-gray-100 text-gray-800'
      case 'Suspended': return 'bg-yellow-100 text-yellow-800'
      case 'Deleted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">
            Manage and analyze your customer base ({analytics.totalCustomers} customers)
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics.activeCustomers}</p>
              <p className="text-xs text-green-600">
                {((analytics.activeCustomers / analytics.totalCustomers) * 100).toFixed(1)}% active
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics.newCustomersThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🆕</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-3xl font-semibold text-gray-900">
                {formatCurrency(analytics.averageOrderValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="registrationDate">Registration Date</option>
                <option value="fullName">Name</option>
                <option value="totalSpent">Total Spent</option>
                <option value="totalOrders">Total Orders</option>
                <option value="lastLogin">Last Login</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-800 font-medium">
                {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Activate
              </button>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                Suspend
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer._id)}
                      onChange={() => handleCustomerSelect(customer._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                        <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                        {customer.customerId && (
                          <div className="text-xs text-gray-400">ID: {customer.customerId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                      {customer.status}
                    </span>
                    {!customer.emailVerified && (
                      <div className="text-xs text-red-500 mt-1">Email not verified</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{customer.totalOrders || 0}</div>
                    {customer.subscriptionStatus && (
                      <div className="text-xs text-gray-500">{customer.subscriptionStatus}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(customer.totalSpent || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {customer.lastLogin ? formatDate(customer.lastLogin) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
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
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)} of{' '}
                {pagination.totalUsers} customers
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                  {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', filters.page + 1)}
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