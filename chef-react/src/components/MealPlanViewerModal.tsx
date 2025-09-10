import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, ChefHat, AlertTriangle, FileText, Utensils, Users } from 'lucide-react'
import { earningsApi } from '../services/api'

interface MealPlanViewerModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  mealPlanName?: string
}

interface MealItem {
  _id: string
  name: string
  ingredients: string
  instructions?: string
  preparationTime: number
  complexityLevel: 'low' | 'medium' | 'high'
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    weight: number
  }
  allergens: string[]
  category: string
}

interface DailyMeals {
  day: number
  date?: string
  meals: {
    breakfast?: MealItem[]
    lunch?: MealItem[]
    dinner?: MealItem[]
  }
}

interface MealPlanData {
  planName: string
  duration: number
  dailyMeals: DailyMeals[]
  specialNotes?: {
    customerRequests?: string
    adminInstructions?: string
    dietaryRestrictions?: string[]
  }
  totalNutrition?: {
    totalCalories: number
    avgCaloriesPerDay: number
    avgCaloriesPerMeal: number
  }
}

const MealPlanViewerModal: React.FC<MealPlanViewerModalProps> = ({
  isOpen,
  onClose,
  orderId,
}) => {
  const [mealPlanData, setMealPlanData] = useState<MealPlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'schedule' | 'nutrition' | 'notes'>('schedule')

  useEffect(() => {
    if (isOpen && orderId) {
      fetchMealPlanData()
    }
  }, [isOpen, orderId])

  const fetchMealPlanData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🍽️ Fetching meal plan data for order:', orderId)
      
      // Use real API call
      const response = await earningsApi.getMealPlan(orderId)
      
      console.log('✅ Meal plan data received:', response)
      setMealPlanData(response)
      
    } catch (err) {
      console.error('❌ Failed to fetch meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <ChefHat size={24} className="mr-2 text-green-600" />
                Detailed Meal Plan
              </h2>
              <p className="text-gray-600">{mealPlanData?.planName || 'Loading...'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center text-sm text-yellow-800">
            <AlertTriangle size={16} className="mr-2" />
            <span className="font-medium">Secure View:</span>
            <span className="ml-1">This meal plan is for cooking purposes only. Download/copy functions are disabled for IP protection.</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-6">
            {[
              { id: 'schedule', label: 'Meal Schedule', icon: Calendar },
              { id: 'nutrition', label: 'Nutrition Info', icon: Utensils },
              { id: 'notes', label: 'Special Notes', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading meal plan details...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle size={20} className="text-red-400 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Error loading meal plan</h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {mealPlanData && (
            <>
              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  {mealPlanData.dailyMeals && mealPlanData.dailyMeals.length > 0 ? (
                    mealPlanData.dailyMeals.map((day) => (
                    <div key={day.day} className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar size={20} className="mr-2" />
                        Day {day.day} {day.date && `- ${day.date}`}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(day.meals).map(([mealType, meals]) => (
                          <div key={mealType} className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-gray-800 mb-3 capitalize flex items-center">
                              <Utensils size={16} className="mr-2" />
                              {mealType}
                            </h4>
                            
                            {meals?.map((meal, mealIndex) => (
                              <div key={`${meal._id}-${day.day}-${mealType}-${mealIndex}`} className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium text-gray-900">{meal.name}</h5>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(meal.complexityLevel)}`}>
                                    {meal.complexityLevel}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600">
                                  <p><strong>Prep time:</strong> {meal.preparationTime} mins</p>
                                  <p><strong>Ingredients:</strong> {meal.ingredients}</p>
                                </div>
                                
                                {meal.instructions && (
                                  <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                                    <strong>Instructions:</strong>
                                    <p className="mt-1">{meal.instructions}</p>
                                  </div>
                                )}
                                
                                <div className="text-xs text-gray-500 flex items-center space-x-4">
                                  <span>{meal.nutrition.calories} cal</span>
                                  <span>{meal.nutrition.protein}g protein</span>
                                  <span><Clock size={12} className="inline mr-1" />{meal.preparationTime}min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="flex justify-center mb-4">
                        <Utensils size={48} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Meal Plan Available</h3>
                      <p className="text-gray-500">This order doesn't have a detailed meal plan assigned yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Nutrition Tab */}
              {activeTab === 'nutrition' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Nutrition Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{mealPlanData.totalNutrition?.totalCalories || 0}</p>
                        <p className="text-sm text-gray-600">Total Calories</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{mealPlanData.totalNutrition?.avgCaloriesPerDay || 0}</p>
                        <p className="text-sm text-gray-600">Avg Calories/Day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{mealPlanData.totalNutrition?.avgCaloriesPerMeal || 0}</p>
                        <p className="text-sm text-gray-600">Avg Calories/Meal</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual meal nutrition details would go here */}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {mealPlanData.specialNotes?.customerRequests && (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <Users size={20} className="mr-2" />
                        Customer Special Requests
                      </h3>
                      <p className="text-blue-800">{mealPlanData.specialNotes.customerRequests}</p>
                    </div>
                  )}

                  {mealPlanData.specialNotes?.adminInstructions && (
                    <div className="bg-red-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                        <AlertTriangle size={20} className="mr-2" />
                        Important Admin Instructions
                      </h3>
                      <p className="text-red-800 font-medium">{mealPlanData.specialNotes.adminInstructions}</p>
                    </div>
                  )}

                  {mealPlanData.specialNotes?.dietaryRestrictions && (
                    <div className="bg-yellow-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                        <FileText size={20} className="mr-2" />
                        Dietary Restrictions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {mealPlanData.specialNotes.dietaryRestrictions.map((restriction, index) => (
                          <span key={`restriction-${index}-${restriction}`} className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              🔒 Secure viewing mode - Content protection enabled
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MealPlanViewerModal