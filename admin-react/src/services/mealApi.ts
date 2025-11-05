import axios from 'axios'

// Create axios instance for meal API
const api = axios.create({
  baseURL: import.meta.env.PROD 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/admin`
    : '/api/admin',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  
  // Add authentication token if available
  const token = localStorage.getItem('choma-admin-token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error(`❌ Meal API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message)
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 Meal API authentication failed - clearing stored credentials')
      localStorage.removeItem('choma-admin-token')
      localStorage.removeItem('choma-admin-data')
      // You might want to redirect to login page here
      if (window.location.pathname !== '/login') {
        window.location.reload() // This will trigger the auth check and redirect to login
      }
    }
    
    return Promise.reject(error)
  }
)

// Interfaces for the new meal system
export interface Meal {
  _id: string
  mealId: string
  name: string
  image: string
  pricing: {
    ingredients: number
    cookingCosts: number
    packaging: number
    platformFee: number
    totalCosts: number
    profit: number
    totalPrice: number
    chefEarnings: number
    chomaEarnings: number
  }
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    weight: number
  }
  ingredients: string
  preparationTime: number
  complexityLevel: 'low' | 'medium' | 'high'
  allergens: string[]
  isAvailable: boolean
  adminNotes: string
  chefNotes: string
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface MealPlan {
  _id: string
  planId: string
  planName: string
  description: string
  coverImage: string
  durationWeeks: number
  isFiveWorkingDays: boolean
  tier: string
  targetAudience: string
  mealTypes: string[]
  planFeatures: string[]
  adminNotes: string
  totalPrice: number
  isPublished: boolean
  isActive: boolean
  tagId?: string
  nutritionInfo: {
    totalCalories: number
    avgCaloriesPerDay: number
    avgCaloriesPerMeal: number
  }
  stats: {
    totalMealsAssigned: number
    totalDays: number
    avgMealsPerDay: number
  }
  assignmentCount?: number
  assignments?: MealPlanAssignment[]
  createdDate: string
  lastModified: string
  createdAt: string
  updatedAt: string
}

export interface MealPlanAssignment {
  _id: string
  assignmentId: string
  mealPlanId: string
  mealIds: string[]
  customTitle: string
  customDescription?: string
  imageUrl?: string
  weekNumber: number
  dayOfWeek: number
  mealTime: 'breakfast' | 'lunch' | 'dinner'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MealFilters {
  page?: number
  limit?: number
  search?: string
  category?: string
  isAvailable?: boolean
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface MealPlanFilters {
  page?: number
  limit?: number
  search?: string
  isPublished?: boolean
  durationWeeks?: number
  sortBy?: 'planName' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface MealPlanResponse {
  success: boolean
  data: MealPlan
  message?: string
}

export interface DeleteDuplicatesResponse {
  success: boolean
  message: string
  data: {
    duplicateGroupsFound: number
    mealsDeleted: number
    assignmentsUpdated: number
  }
}

// Meals API
export const mealsApi = {
  // Get all meals
  async getAllMeals(filters: MealFilters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })

    const response = await api.get(`/meals?${params.toString()}`)
    return response.data
  },

  // Get meal details
  async getMealDetails(id: string) {
    const response = await api.get(`/meals/${id}`)
    return response.data
  },

  // Create meal
  async createMeal(mealData: Partial<Meal>) {
    const response = await api.post('/meals', mealData)
    return response.data
  },

  // Update meal
  async updateMeal(id: string, mealData: Partial<Meal>) {
    const response = await api.put(`/meals/${id}`, mealData)
    return response.data
  },

  // Delete meal
  async deleteMeal(id: string) {
    const response = await api.delete(`/meals/${id}`)
    return response.data
  },

  // Force delete meal (removes from meal plans first, then deletes)
  async forceDeleteMeal(id: string) {
    const response = await api.request({
      method: 'delete',
      url: `/meals/${id}`,
      data: { force: true }
    })
    return response.data
  },

  // Toggle meal availability
  async toggleMealAvailability(id: string) {
    const response = await api.put(`/meals/${id}/availability`)
    return response.data
  },

  // Bulk create meals
  async bulkCreateMeals(meals: Partial<Meal>[]) {
    const response = await api.post('/meals/bulk', { meals })
    return response.data
  },

  // Bulk update availability
  async bulkUpdateAvailability(mealIds: string[], isAvailable: boolean) {
    const response = await api.put('/meals/bulk/availability', { mealIds, isAvailable })
    return response.data
  },

  // Bulk update meals
  async bulkUpdateMeals(updates: Array<{ id: string; data: Partial<Meal> }>) {
    const response = await api.put('/meals/bulk/update', { updates })
    return response.data
  },

  // Delete duplicate meals
  async deleteDuplicateMeals(): Promise<DeleteDuplicatesResponse> {
    // Use a longer timeout for this potentially heavy operation
    const response = await api.delete('/meals/duplicates', { 
      timeout: 120000 // 2 minutes timeout for duplicate deletion
    })
    return response.data as DeleteDuplicatesResponse
  }
}

// Meal Plans API
export const mealPlansApi = {
  // Get all meal plans
  async getAllMealPlans(filters: MealPlanFilters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })

    const response = await api.get(`/meal-plans?${params.toString()}`)
    return response.data
  },

  // Get meal plan details
  async getMealPlanDetails(id: string) {
    const response = await api.get(`/meal-plans/${id}`)
    return response.data
  },

  // Create meal plan
  async createMealPlan(planData: Partial<MealPlan>) {
    const response = await api.post('/meal-plans', planData)
    return response.data
  },

  // Update meal plan
  async updateMealPlan(id: string, planData: Partial<MealPlan>): Promise<MealPlanResponse> {
    const response = await api.put(`/meal-plans/${id}`, planData)
    return response.data as MealPlanResponse
  },

  // Delete meal plan
  async deleteMealPlan(id: string, force: boolean = false) {
    const response = await api.request({
      method: 'delete',
      url: `/meal-plans/${id}`,
      data: { force }
    })
    return response.data
  },

  // Publish meal plan
  async publishMealPlan(id: string) {
    const response = await api.put(`/meal-plans/${id}/publish`)
    return response.data
  },

  // Unpublish meal plan
  async unpublishMealPlan(id: string) {
    const response = await api.put(`/meal-plans/${id}/unpublish`)
    return response.data
  },

  // Get meal plan assignments
  async getMealPlanAssignments(id: string) {
    const response = await api.get(`/meal-plans/${id}/assignments`)
    return response.data
  },

  // Assign meal to plan
  async assignMealToPlan(planId: string, assignmentData: {
    mealIds: string[]
    customTitle: string
    customDescription?: string
    imageUrl?: string
    weekNumber: number
    dayOfWeek: number
    mealTime: 'breakfast' | 'lunch' | 'dinner'
    notes?: string
  }) {
    const response = await api.post(`/meal-plans/${planId}/assign-meal`, assignmentData)
    return response.data
  },

  // Update meal assignment
  async updateAssignment(planId: string, assignmentId: string, updateData: Partial<MealPlanAssignment>) {
    const response = await api.put(`/meal-plans/${planId}/assignments/${assignmentId}`, updateData)
    return response.data
  },

  // Remove meal assignment
  async removeAssignment(planId: string, assignmentId: string) {
    const response = await api.delete(`/meal-plans/${planId}/assignments/${assignmentId}`)
    return response.data
  },

  // Get meal plan schedule
  async getMealPlanSchedule(id: string, week?: number) {
    const params = week ? `?week=${week}` : ''
    const response = await api.get(`/meal-plans/${id}/schedule${params}`)
    return response.data
  },

  // Duplicate meal plan
  async duplicateMealPlan(id: string, newPlanName?: string, modifications?: Partial<MealPlan>) {
    const response = await api.post(`/meal-plans/${id}/duplicate`, {
      newPlanName,
      modifications
    })
    return response.data
  },

  // Remove assignments beyond specified week (for duration reduction)
  async removeAssignmentsBeyondWeek(planId: string, maxWeekNumber: number) {
    const response = await api.delete(`/meal-plans/${planId}/assignments/beyond-week/${maxWeekNumber}`)
    return response.data
  }
}

export default {
  meals: mealsApi,
  mealPlans: mealPlansApi
}