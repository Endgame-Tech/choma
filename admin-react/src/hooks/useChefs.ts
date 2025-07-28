import { useState, useEffect, useCallback } from 'react'
import { chefsApi } from '../services/api'
import type { Chef } from '../types'

interface UseChefsReturn {
  chefs: Chef[]
  loading: boolean
  error: string | null
  refreshChefs: () => Promise<void>
}

export function useChefs(filters: any = {}): UseChefsReturn {
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChefs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await chefsApi.getChefs(filters)
      setChefs(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chefs'
      setError(errorMessage)
      console.error('Error fetching chefs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchChefs()
  }, [fetchChefs])

  return {
    chefs,
    loading,
    error,
    refreshChefs: fetchChefs
  }
}

export function useAvailableChefs() {
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAvailableChefs = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await chefsApi.getAvailableChefs()
        // Ensure result is an array
        setChefs(Array.isArray(result) ? result : [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch available chefs'
        setError(errorMessage)
        setChefs([]) // Set empty array on error
        console.error('Error fetching available chefs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableChefs()
  }, [])

  return { chefs, loading, error }
}