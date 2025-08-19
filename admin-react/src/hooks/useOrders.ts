import { useState, useCallback } from 'react'
import { ordersApi } from '../services/api'
import { useCachedApi } from './useCachedApi'
import { CACHE_DURATIONS } from '../services/cacheService'
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

  // Generate cache key based on filters
  const cacheKey = `orders-${JSON.stringify(filters)}`

  // Use cached API for orders fetching
  const {
    loading,
    error,
    refetch
  } = useCachedApi(
    () => ordersApi.getOrders(filters),
    {
      cacheKey,
      cacheDuration: CACHE_DURATIONS.ORDERS,
      immediate: true,
      onSuccess: (result) => {
        setOrders(Array.isArray(result.data.orders) ? result.data.orders : [])
        setStats(result.data.stats || null)
        setPagination(result.pagination || null)
      },
      onError: () => {
        setOrders([])
        setStats(null)
        setPagination(null)
      }
    }
  )

  // Wrapper function for manual refresh
  const refreshOrders = useCallback(async () => {
    await refetch()
  }, [refetch])

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

// Hook for single order with caching
export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)

  const {
    loading,
    error
  } = useCachedApi(
    () => ordersApi.getOrder(orderId),
    {
      cacheKey: `order-${orderId}`,
      cacheDuration: CACHE_DURATIONS.ORDERS,
      immediate: !!orderId,
      onSuccess: (result) => setOrder(result),
      onError: () => setOrder(null)
    }
  )

  return { order, loading, error: error || null }
}