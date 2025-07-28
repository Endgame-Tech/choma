import { useState, useEffect, useCallback } from 'react'
import { ordersApi } from '../services/api'
import type { Order, OrderFilters, OrdersResponse, Pagination } from '../types'

interface UseOrdersReturn {
  orders: Order[]
  stats: OrdersResponse['stats'] | null
  pagination: Pagination | null
  loading: boolean
  error: string | null
  refreshOrders: () => Promise<void>
  updateOrderStatus: (orderId: string, status: string, reason?: string) => Promise<void>
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<void>
  bulkUpdateOrders: (orderIds: string[], data: Partial<Order>) => Promise<void>
}

export function useOrders(filters: OrderFilters = {}): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrdersResponse['stats'] | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize the actual API call function
  const fetchOrders = useCallback(async (currentFilters: OrderFilters) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await ordersApi.getOrders(currentFilters)
      
      setOrders(Array.isArray(result.data.orders) ? result.data.orders : [])
      setStats(result.data.stats || null)
      setPagination(result.pagination || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders'
      setError(errorMessage)
      setOrders([]) // Set empty array on error
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Wrapper function to use current filters
  const refreshOrders = useCallback(async () => {
    await fetchOrders(filters)
  }, [fetchOrders, filters])

  const updateOrderStatus = useCallback(async (orderId: string, status: string, reason?: string) => {
    try {
      const updatedOrder = await ordersApi.updateOrderStatus(orderId, status, reason)
      
      // Update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status'
      throw new Error(errorMessage)
    }
  }, [])

  const updateOrder = useCallback(async (orderId: string, data: Partial<Order>) => {
    try {
      const updatedOrder = await ordersApi.updateOrder(orderId, data)
      
      // Update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order'
      throw new Error(errorMessage)
    }
  }, [])

  const bulkUpdateOrders = useCallback(async (orderIds: string[], data: Partial<Order>) => {
    try {
      await ordersApi.bulkUpdateOrders(orderIds, data)
      
      // Refresh orders to get updated data
      await refreshOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk update orders'
      throw new Error(errorMessage)
    }
  }, [refreshOrders])

  // Use effect that only runs when filters actually change
  useEffect(() => {
    fetchOrders(filters)
  }, [fetchOrders, filters.page, filters.limit, filters.search, filters.orderStatus, filters.paymentStatus, filters.sortBy, filters.sortOrder])

  return {
    orders,
    stats,
    pagination,
    loading,
    error,
    refreshOrders,
    updateOrderStatus,
    updateOrder,
    bulkUpdateOrders
  }
}

// Hook for single order
export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await ordersApi.getOrder(orderId)
        setOrder(result)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch order'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  return { order, loading, error }
}