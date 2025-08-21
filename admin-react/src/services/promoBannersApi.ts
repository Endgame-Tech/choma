import { apiRequest } from './api'

export interface PromoBanner {
  _id: string
  bannerId: string
  title: string
  subtitle?: string
  imageUrl: string
  ctaText: string
  ctaDestination: 'Search' | 'MealPlans' | 'MealPlanDetail' | 'Profile' | 'Orders' | 'Support' | 'External'
  ctaParams?: Record<string, unknown>
  externalUrl?: string
  isActive: boolean
  isPublished: boolean
  priority: number
  startDate?: string
  endDate?: string
  targetAudience: 'all' | 'new_users' | 'existing_users' | 'subscribers' | 'non_subscribers'
  impressions: number
  clicks: number
  ctr?: number
  createdBy: {
    _id: string
    username: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface PromoBannerFilters {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive'
  targetAudience?: string
}

export interface CreatePromoBannerData {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText: string;
  ctaDestination: string;
  ctaParams?: Record<string, unknown>;
  externalUrl?: string;
  isActive?: boolean;
  priority?: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  createdBy: string;
}

export interface BannersResponse {
  success: boolean
  data: PromoBanner[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
  error?: string
}

export interface BannerResponse {
  success: boolean
  data: PromoBanner
  message?: string
  error?: string
}

export interface DeleteResponse {
  success: boolean
  message?: string
  error?: string
}

export const promoBannersApi = {
  // Get all banners with pagination and filters
  getBanners: async (filters: PromoBannerFilters = {}): Promise<BannersResponse> => {
    const params = new URLSearchParams()
    
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.status) params.append('status', filters.status)
    if (filters.targetAudience) params.append('targetAudience', filters.targetAudience)

    return apiRequest(`/banners?${params.toString()}`)
  },

  // Get single banner
  getBanner: async (bannerId: string): Promise<BannerResponse> => {
    return apiRequest(`/banners/${bannerId}`)
  },

  // Create new banner
  createBanner: async (bannerData: CreatePromoBannerData): Promise<BannerResponse> => {
    return apiRequest('/banners', {
      method: 'POST',
      body: JSON.stringify(bannerData)
    })
  },

  // Update banner
  updateBanner: async (bannerId: string, bannerData: Partial<CreatePromoBannerData>): Promise<BannerResponse> => {
    return apiRequest(`/banners/${bannerId}`, {
      method: 'PUT',
      body: JSON.stringify(bannerData)
    })
  },

  // Delete banner
  deleteBanner: async (bannerId: string): Promise<DeleteResponse> => {
    return apiRequest(`/banners/${bannerId}`, {
      method: 'DELETE'
    })
  },

  // Get banner stats
  getBannerStats: async (bannerId: string) => {
    return apiRequest(`/banners/${bannerId}/stats`)
  },

  // Get active banners (for mobile app)
  getActiveBanners: async (targetAudience?: string) => {
    const params = new URLSearchParams()
    if (targetAudience) params.append('targetAudience', targetAudience)
    
    return apiRequest(`/banners/active?${params.toString()}`)
  },

  // Toggle publish status
  togglePublishBanner: async (bannerId: string): Promise<BannerResponse> => {
    return apiRequest(`/banners/${bannerId}/publish`, {
      method: 'PUT'
    })
  }
}