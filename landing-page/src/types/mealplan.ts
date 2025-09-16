export interface MealPlan {
  _id: string
  id: string
  planId: string
  planName: string
  name: string
  subtitle: string
  description: string
  targetAudience: 'Fitness' | 'Professional' | 'Family' | 'Wellness' | 'Weight Loss' | 'Muscle Gain' | 'Diabetic Friendly' | 'Heart Healthy'
  
  // Pricing
  price: number
  totalPrice: number
  basePrice: number
  originalPrice: number
  
  // Duration and meals
  durationWeeks: number
  duration: string
  meals: string
  mealTypes: ('breakfast' | 'lunch' | 'dinner')[]
  
  // Publishing
  isPublished: boolean
  isActive: boolean
  
  // Images
  coverImage: string
  image: string
  planImageUrl: string
  galleryImages: string[]
  
  // Features and details
  planFeatures: string[]
  features: string[]
  chefNotes?: string
  allergens: string[]
  
  // Nutrition information
  nutritionInfo: {
    totalCalories: number
    avgCaloriesPerDay: number
    avgCaloriesPerMeal: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
    totalFiber: number
  }
  
  // Statistics
  stats: {
    totalMealsAssigned: number
    totalDays: number
    avgMealsPerDay: number
  }
  
  // Business metrics
  totalSubscriptions: number
  avgRating: number
  totalReviews: number
  
  // UI specific
  gradient: [string, string]
  tag: string
  
  // Sample meals for display
  sampleMeals: SampleMeal[]
  totalMealsAssigned: number
  
  // Dates
  createdDate: string
  lastModified: string
  sortOrder?: number
}

export interface SampleMeal {
  _id: string
  mealName: string
  description: string
  image: string
  mainImageUrl: string
  pricing: {
    totalPrice: number
  }
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  mealType: 'breakfast' | 'lunch' | 'dinner'
  isActive: boolean
}

export interface MealPlanResponse {
  success: boolean
  data: MealPlan[]
  count: number
  message?: string
  error?: string
}

export interface MealPlanApiError {
  success: false
  message: string
  error?: string
}