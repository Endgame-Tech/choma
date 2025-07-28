import axios from 'axios'

// Create axios instance for meal API
const api = axios.create({
  baseURL: '/api/admin',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interfaces for the new meal system
export interface Meal {
  _id: string
  mealId: string
  name: string
  image: string
  basePrice?: number
  platformFee?: number
  chefFee?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  weight?: number
  pricing: {
    basePrice: number
    platformFee: number
    chefFee: number
    totalPrice: number
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
  targetAudience: string
  planFeatures: string[]
  adminNotes: string
  totalPrice: number
  isPublished: boolean
  isActive: boolean
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
}

export interface MealPlanFilters {
  page?: number
  limit?: number
  search?: string
  isPublished?: boolean
  durationWeeks?: number
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
  async updateMealPlan(id: string, planData: Partial<MealPlan>) {
    const response = await api.put(`/meal-plans/${id}`, planData)
    return response.data
  },

  // Delete meal plan
  async deleteMealPlan(id: string) {
    const response = await api.delete(`/meal-plans/${id}`)
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
  }
}

export default {
  meals: mealsApi,
  mealPlans: mealPlansApi
}