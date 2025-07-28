import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useOrders } from '../hooks/useOrders'
import { useAvailableChefs } from '../hooks/useChefs'
import { delegationApi } from '../services/api'
import ChefAssignmentModal from '../components/ChefAssignmentModal'
import type { OrderFilters } from '../types'

export default function Orders() {
  const [filter, setFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [chefAssignmentModal, setChefAssignmentModal] = useState<{
    isOpen: boolean
    orderId: string
    orderDetails: {
      orderNumber: string
      customer: string
      totalAmount: number
      deliveryDate: string
    } | null
  }>({ isOpen: false, orderId: '', orderDetails: null })

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Build filters based on current filter (memoized to prevent infinite re-renders)
  const filters: OrderFilters = useMemo(() => ({
    page: 1,
    limit: 50,
    search: debouncedSearchTerm || undefined,
    orderStatus: filter === 'completed' ? 'Delivered' : 
                 filter === 'pending' ? 'Pending' : 
                 filter === 'confirmed' ? 'Confirmed' : undefined,
    sortBy: 'createdDate',
    sortOrder: 'desc'
  }), [debouncedSearchTerm, filter])
  
  const { 
    orders, 
    loading, 
    error, 
    refreshOrders, 
    updateOrderStatus, 
    updateOrder 
  } = useOrders(filters)
  
  const { chefs: availableChefs, loading: chefsLoading, error: chefsError } = useAvailableChefs()

  // Handle opening chef assignment modal
  // Define a type for the order parameter
  type OrderType = {
    _id: string
    orderNumber: string
    customer?: {
      fullName?: string
    }
    totalAmount: number
    deliveryDate: string
  }

  const openChefAssignmentModal = (order: OrderType) => {
    setChefAssignmentModal({
      isOpen: true,
      orderId: order._id,
      orderDetails: {
        orderNumber: order.orderNumber,
        customer: order.customer?.fullName || 'Unknown Customer',
        totalAmount: order.totalAmount,
        deliveryDate: order.deliveryDate
      }
    })
  }

  // Handle closing chef assignment modal
  const closeChefAssignmentModal = () => {
    setChefAssignmentModal({ isOpen: false, orderId: '', orderDetails: null })
  }

  // Handle chef assignment
  const handleAssignChef = async (chefId: string, assignmentDetails: {
    estimatedHours: number
    priority: string
    specialInstructions: string
    chefFeePercentage: number
  }) => {
    try {
      await delegationApi.assignOrder({ 
        orderId: chefAssignmentModal.orderId, 
        chefId,
        ...assignmentDetails
      })
      await refreshOrders() // Refresh the orders list
      closeChefAssignmentModal()
    } catch (error) {
      console.error('Failed to assign chef:', error)
      // You can add toast notification here
    }
  }

  // Handle order status change
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  // Handle priority change
  const handlePriorityChange = async (orderId: string, newPriority: string) => {
    try {
      await updateOrder(orderId, { priority: newPriority as 'Low' | 'Medium' | 'High' | 'Urgent' })
    } catch (error) {
      console.error('Failed to update order priority:', error)
    }
  }

  // Handle selection
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length ? [] : orders.map(order => order._id)
    )
  }

  // Handle bulk operations
  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      // Update each order individually since we need to use updateOrderStatus
      for (const orderId of selectedOrders) {
        await updateOrderStatus(orderId, newStatus)
      }
      setSelectedOrders([]) // Clear selection
    } catch (error) {
      console.error('Failed to bulk update order status:', error)
    }
  }

  const handleBulkChefAssignment = async (chefId: string) => {
    try {
      for (const orderId of selectedOrders) {
        await delegationApi.assignOrder({ orderId, chefId })
      }
      await refreshOrders() // Refresh to show updates
      setSelectedOrders([]) // Clear selection
    } catch (error) {
      console.error('Failed to bulk assign chef:', error)
    }
  }


  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChefStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800'
      case 'Accepted':
        return 'bg-green-100 text-green-800'
      case 'Preparing':
      case 'In Progress':
        return 'bg-orange-100 text-orange-800'
      case 'Ready':
      case 'Completed':
        return 'bg-purple-100 text-purple-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      case 'Not Assigned':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChefStatusDisplay = (status: string | null | undefined) => {
    switch (status) {
      case 'Assigned':
        return '📋 Assigned'
      case 'Accepted':
        return '✅ Accepted'
      case 'In Progress':
        return '🍳 Preparing'
      case 'Ready':
        return '🎯 Ready'
      case 'Completed':
        return '✨ Completed'
      case 'Rejected':
        return '❌ Rejected'
      case 'Not Assigned':
      default:
        return '⏳ Not Assigned'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
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
            <h3 className="text-red-800 font-medium">Error loading orders</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <details className="mt-2 text-xs text-red-500">
              <summary className="cursor-pointer">Debug info</summary>
              <div className="mt-1">
                <p>Make sure the backend server is running on port 5001</p>
                <p>Check browser console for detailed error logs</p>
              </div>
            </details>
            <button 
              onClick={refreshOrders}
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
        <h1 className="text-3xl font-semibold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage all customer orders ({orders.length} orders)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={refreshOrders}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'pending', 'confirmed', 'completed'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Orders
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedOrders.length} orders selected
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
                title="Update Order Status (sends customer notifications)"
              >
                <option value="" disabled>Update Order Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              
              {/* Bulk Chef Assignment */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkChefAssignment(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="text-sm border rounded px-3 py-2 bg-white"
                disabled={Boolean(chefsLoading || chefsError)}
                defaultValue=""
              >
                <option value="" disabled>
                  {chefsLoading ? 'Loading Chefs...' : 'Assign Chef'}
                </option>
                {Array.isArray(availableChefs) && availableChefs.map((chef) => (
                  <option key={chef._id} value={chef._id}>
                    {chef.fullName} ({chef.currentCapacity}/{chef.maxCapacity})
                  </option>
                ))}
              </select>
              
              <button 
                onClick={() => setSelectedOrders([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meal Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chef Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chef Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.orderNumber}
                      </div>
                      {order.urgencyInfo?.urgencyLevel !== 'normal' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          {order.urgencyInfo?.urgencyLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer.fullName}</div>
                      <div className="text-xs text-gray-500">{order.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.subscription?.mealPlanId?.planName || 'N/A'}
                      </div>
                      {order.subscription?.mealPlanId?.planType && (
                        <div className="text-xs text-gray-500">{order.subscription.mealPlanId.planType}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₦{order.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                        title="Admin controls delivery status - sends customer notifications"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getChefStatusColor(order.delegationStatus || 'Not Assigned')
                        }`}
                        title="Chef-controlled cooking status"
                      >
                        {getChefStatusDisplay(order.delegationStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.priority}
                        onChange={(e) => handlePriorityChange(order._id, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.assignedChef ? (
                        <div className="text-sm">
                          <div className="text-green-600 font-medium">
                            👨‍🍳 {order.assignedChef.fullName}
                          </div>
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            onClick={() => openChefAssignmentModal({ ...order, deliveryDate: order.deliveryDate ?? '' })}
                          >
                            Reassign
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openChefAssignmentModal({ ...order, deliveryDate: order.deliveryDate ?? '' })}
                          className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={Boolean(chefsLoading || chefsError)}
                        >
                          {chefsLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-blue-700 mr-2"></div>
                              Loading...
                            </>
                          ) : chefsError ? (
                            <>
                              ⚠️ Error
                            </>
                          ) : (
                            <>
                              👨‍🍳 Assign Chef
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View</button>
                        <button className="text-green-600 hover:text-green-900">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chef Assignment Modal */}
      <ChefAssignmentModal
        isOpen={chefAssignmentModal.isOpen}
        onClose={closeChefAssignmentModal}
        onAssign={handleAssignChef}
        orderId={chefAssignmentModal.orderId}
        orderDetails={chefAssignmentModal.orderDetails}
      />
    </div>
  )
}