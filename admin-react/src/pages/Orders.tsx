import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useOrders } from '../hooks/useOrders'
import { useAvailableChefs } from '../hooks/useChefs'
import { delegationApi } from '../services/api'
import ChefAssignmentModal from '../components/ChefAssignmentModal'
import type { OrderFilters } from '../types'

const Orders: React.FC = () => {
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
    }, 500)

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
      await refreshOrders()
      closeChefAssignmentModal()
    } catch (error) {
      console.error('Failed to assign chef:', error)
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
      for (const orderId of selectedOrders) {
        await updateOrderStatus(orderId, newStatus)
      }
      setSelectedOrders([])
    } catch (error) {
      console.error('Failed to bulk update order status:', error)
    }
  }

  const handleBulkChefAssignment = async (chefId: string) => {
    try {
      for (const orderId of selectedOrders) {
        await delegationApi.assignOrder({ orderId, chefId })
      }
      await refreshOrders()
      setSelectedOrders([])
    } catch (error) {
      console.error('Failed to bulk assign chef:', error)
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const getChefStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'Accepted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'Preparing':
      case 'In Progress':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      case 'Ready':
      case 'Completed':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
      case 'Rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'Not Assigned':
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const getChefStatusDisplay = (status: string | null | undefined) => {
    switch (status) {
      case 'Assigned':
        return <><i className="fi fi-sr-clipboard-list mr-1"></i> Assigned</>
      case 'Accepted':
        return <><i className="fi fi-sr-check-circle mr-1"></i> Accepted</>
      case 'In Progress':
        return <><i className="fi fi-sr-utensils mr-1"></i> Preparing</>
      case 'Ready':
        return <><i className="fi fi-sr-check mr-1"></i> Ready</>
      case 'Completed':
        return <><i className="fi fi-sr-star mr-1"></i> Completed</>
      case 'Rejected':
        return <><i className="fi fi-sr-cross-circle mr-1"></i> Rejected</>
      case 'Not Assigned':
      default:
        return <><i className="fi fi-sr-hourglass mr-1"></i> Not Assigned</>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading orders...</p>
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
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading orders</h3>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            <details className="mt-2 text-xs text-red-500 dark:text-red-300">
              <summary className="cursor-pointer">Debug info</summary>
              <div className="mt-1">
                <p>Make sure the backend server is running on port 5001</p>
                <p>Check browser console for detailed error logs</p>
              </div>
            </details>
            <button
              onClick={refreshOrders}
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-neutral-100">Orders</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-neutral-200">Manage all customer orders ({orders.length} orders)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 sm:max-w-md relative">
            <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={refreshOrders}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <i className="fi fi-sr-refresh"></i>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 sm:space-x-1 bg-gray-100 dark:bg-neutral-700/30 p-1 rounded-lg w-full sm:w-fit">
          {['all', 'pending', 'confirmed', 'completed'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${filter === filterType
                  ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm'
                  : 'text-gray-500 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-neutral-100'
                }`}
            >
              <span className="hidden sm:inline">{filterType.charAt(0).toUpperCase() + filterType.slice(1)} Orders</span>
              <span className="sm:hidden">{filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <span className="text-sm text-blue-800 dark:text-blue-300">
              {selectedOrders.length} orders selected
            </span>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Bulk Status Update */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value)
                    e.target.value = ''
                  }
                }}
                aria-label="Bulk update order status"
                className="text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-3 py-2"
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
                aria-label="Bulk assign chef to orders"
                title="Assign chef to selected orders"
                className="text-sm border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-3 py-2"
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
                className="text-sm text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white/90 dark:bg-neutral-800/90 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    aria-label="Select all orders"
                    title="Select or deselect all orders"
                    className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Meal Plan
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Chef Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Chef Assignment
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-200">
                    <div className="text-4xl mb-2"><i className="fi fi-sr-order"></i></div>
                    <p>No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        aria-label={`Select order ${order.orderNumber}`}
                        title={`Select or deselect order ${order.orderNumber}`}
                        className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                        #{order.orderNumber}
                      </div>
                      {order.urgencyInfo?.urgencyLevel !== 'normal' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                          {order.urgencyInfo?.urgencyLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">{order.customer.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-neutral-300">{order.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        {order.subscription?.mealPlanId?.planName || 'N/A'}
                      </div>
                      {order.subscription?.mealPlanId?.planType && (
                        <div className="text-xs text-gray-500 dark:text-neutral-300">{order.subscription.mealPlanId.planType}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        ₦{order.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        aria-label={`Change status for order ${order.orderNumber}`}
                        className="text-xs border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-2 py-1"
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
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChefStatusColor(order.delegationStatus || 'Not Assigned')
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
                        aria-label={`Change priority for order ${order.orderNumber}`}
                        title={`Set priority level for order ${order.orderNumber}`}
                        className="text-xs border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-2 py-1"
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
                          <div className="text-green-600 dark:text-green-300 font-medium">
                            <i className="fi fi-sr-user mr-1"></i> {order.assignedChef.fullName}
                          </div>
                          <button
                            className="text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 underline"
                            onClick={() => openChefAssignmentModal({ ...order, deliveryDate: order.deliveryDate ?? '' })}
                          >
                            Reassign
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openChefAssignmentModal({ ...order, deliveryDate: order.deliveryDate ?? '' })}
                          className="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-700 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={Boolean(chefsLoading || chefsError)}
                        >
                          {chefsLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-blue-700 dark:border-blue-300 mr-2"></div>
                              Loading...
                            </>
                          ) : chefsError ? (
                            <>
                              <i className="fi fi-sr-warning mr-1"></i> Error
                            </>
                          ) : (
                            <>
                              <i className="fi fi-sr-user-add mr-1"></i> Assign Chef
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-400">
                          <i className="fi fi-sr-eye mr-1"></i> View
                        </button>
                        <button className="text-green-600 dark:text-green-300 hover:text-green-900 dark:hover:text-green-400">
                          <i className="fi fi-sr-edit mr-1"></i> Edit
                        </button>
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
export default Orders