import type { MealPlan, MealPlanResponse } from '../types/mealplan'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export class MealPlanService {
  /**
   * Fetch all published meal plans
   */
  static async getAllMealPlans(): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mealplans`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: MealPlanResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch meal plans')
      }
      
      return data.data
    } catch (error) {
      console.error('Error fetching meal plans:', error)
      throw error
    }
  }

  /**
   * Fetch popular meal plans (sorted by popularity)
   */
  static async getPopularMealPlans(): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mealplans/popular`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: MealPlanResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch popular meal plans')
      }
      
      return data.data
    } catch (error) {
      console.error('Error fetching popular meal plans:', error)
      throw error
    }
  }

  /**
   * Fetch a random selection of published meal plans
   * @param limit - Number of meal plans to return (default: 6)
   */
  static async getRandomMealPlans(limit: number = 6): Promise<MealPlan[]> {
    try {
      const allMealPlans = await this.getAllMealPlans()
      
      // Shuffle array and take the first 'limit' items
      const shuffled = [...allMealPlans].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, limit)
    } catch (error) {
      console.error('Error fetching random meal plans:', error)
      throw error
    }
  }

  /**
   * Fetch meal plans by target audience
   */
  static async getMealPlansByAudience(audience: string): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mealplans/filtered?targetAudience=${encodeURIComponent(audience)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: MealPlanResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch filtered meal plans')
      }
      
      return data.data
    } catch (error) {
      console.error('Error fetching filtered meal plans:', error)
      throw error
    }
  }

  /**
   * Get a single meal plan by ID
   */
  static async getMealPlanById(id: string): Promise<MealPlan> {
    try {
      const response = await fetch(`${API_BASE_URL}/mealplans/${id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch meal plan')
      }
      
      return data.data
    } catch (error) {
      console.error('Error fetching meal plan by ID:', error)
      throw error
    }
  }
}