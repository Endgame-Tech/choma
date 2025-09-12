import { useState } from 'react'
import { chefsApi } from '../services/api'
import { useCachedApi } from './useCachedApi'
import { CACHE_DURATIONS } from '../services/cacheService'
import type { Chef } from '../types'

interface UseChefsReturn {
  chefs: Chef[]
  loading: boolean
  error: string | null
  refreshChefs: () => Promise<void>
}

interface ChefFilters {
  [key: string]: string | number | boolean | undefined
}

export function useChefs(filters: ChefFilters = {}): UseChefsReturn {
  const [chefs, setChefs] = useState<Chef[]>([])

  // Generate cache key based on filters
  const cacheKey = `chefs-${JSON.stringify(filters)}`

  const {
    loading,
    error,
    refetch
  } = useCachedApi(
    () => chefsApi.getChefs(filters).then((data) => ({ data })),
    {
      cacheKey,
      cacheDuration: CACHE_DURATIONS.CHEFS,
      immediate: true,
      onSuccess: (result) => setChefs(Array.isArray(result) ? result : []),
      onError: () => setChefs([])
    }
  )

  return {
    chefs,
    loading,
    error: error || null,
    refreshChefs: refetch
  }
}

export function useAvailableChefs() {
  return useChefs({ available: true })
}