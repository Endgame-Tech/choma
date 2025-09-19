import React from 'react'
import { useState, useEffect } from 'react'
import { type Meal } from '../services/mealApi'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ImageUpload from './ImageUpload'

interface EditMealModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (mealData: Partial<Meal>) => Promise<void>
  meal: Meal
}

const categories = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
  'Beverage'
]

const allergenOptions = [
  'Nuts',
  'Dairy',
  'Gluten',
  'Soy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Sesame'
]

export default function EditMealModal({ isOpen, onClose, onSubmit, meal }: EditMealModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    packaging: '',
    cookingCosts: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    weight: '',
    ingredients: '',
    preparationTime: '',
    allergens: [] as string[],
    category: 'Lunch',
    tags: '',
    adminNotes: '',
    chefNotes: ''
  })

  const [submitting, setSubmitting] = useState(false)

  // Update form data when meal changes
  useEffect(() => {
    if (meal) {
      setFormData({
        name: meal.name || '',
        description: '',
        image: meal.image || '',
        packaging: meal.pricing?.packaging?.toString() || '',
        cookingCosts: meal.pricing?.cookingCosts?.toString() || '',
        calories: meal.nutrition?.calories?.toString() || '',
        protein: meal.nutrition?.protein?.toString() || '',
        carbs: meal.nutrition?.carbs?.toString() || '',
        fat: meal.nutrition?.fat?.toString() || '',
        fiber: meal.nutrition?.fiber?.toString() || '',
        sugar: meal.nutrition?.sugar?.toString() || '',
        weight: meal.nutrition?.weight?.toString() || '',
        ingredients: meal.ingredients || '',
        preparationTime: meal.preparationTime?.toString() || '',
        allergens: meal.allergens || [],
        category: meal.category || 'Lunch',
        tags: meal.tags?.join(', ') || '',
        adminNotes: meal.adminNotes || '',
        chefNotes: meal.chefNotes || ''
      })
    }
  }, [meal])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAllergenChange = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }))
  }

  const calculatePricing = () => {
    const packaging = parseFloat(formData.packaging) || 0
    const cookingCosts = parseFloat(formData.cookingCosts) || 0

    // Platform fee = 20% of cooking cost
    const platformFee = cookingCosts * 0.2

    // Total price = cooking cost + packaging + platform fee
    const totalPrice = cookingCosts + packaging + platformFee

    // Chef gets: cooking cost only
    const chefEarnings = cookingCosts

    // Choma gets: platform fee + packaging
    const chomaEarnings = platformFee + packaging

    return {
      totalCosts: cookingCosts + packaging, // For display purposes
      profit: 0, // No separate profit calculation
      totalPrice,
      chefEarnings,
      chomaEarnings,
      cookingCosts,
      platformFee
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Debug validation - check which fields are empty
    const emptyFields = []
    if (!formData.name) emptyFields.push('Name')
    if (!formData.packaging) emptyFields.push('Packaging')
    if (!formData.cookingCosts) emptyFields.push('Cooking Costs')

    if (emptyFields.length > 0) {
      console.log('Empty fields:', emptyFields)
      console.log('Form data:', formData)
      alert(`Please fill in all required fields. Missing: ${emptyFields.join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const pricing = calculatePricing()

      const mealData: Partial<Meal> = {
        name: formData.name,
        image: formData.image,
        pricing: {
          ingredients: 0, // No longer used
          cookingCosts: pricing.cookingCosts, // Auto-calculated
          packaging: parseFloat(formData.packaging),
          platformFee: pricing.platformFee, // Auto-calculated (20% of cooking cost)
          totalCosts: pricing.totalCosts,
          profit: pricing.profit,
          totalPrice: pricing.totalPrice,
          chefEarnings: pricing.chefEarnings,
          chomaEarnings: pricing.chomaEarnings
        },
        nutrition: {
          calories: parseInt(formData.calories) || 0,
          protein: parseFloat(formData.protein) || 0,
          carbs: parseFloat(formData.carbs) || 0,
          fat: parseFloat(formData.fat) || 0,
          fiber: parseFloat(formData.fiber) || 0,
          sugar: parseFloat(formData.sugar) || 0,
          weight: parseFloat(formData.weight) || 0,
        },
        ingredients: formData.ingredients,
        preparationTime: parseInt(formData.preparationTime) || 0,
        complexityLevel: 'medium' as 'low' | 'medium' | 'high', // Default since we're not auto-calculating
        allergens: formData.allergens,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        adminNotes: formData.adminNotes,
        chefNotes: formData.chefNotes
      }

      await onSubmit(mealData)
    } catch (error) {
      console.error('Failed to update meal:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Meal</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">ID: {meal.mealId}</p>
            </div>
            <button
              onClick={onClose}
              title="Close modal"
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              disabled={submitting}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Current Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Last updated: {new Date(meal.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${meal.isAvailable
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                    {meal.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Current Price: {formatCurrency(meal.pricing.totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Meal Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  title="Enter meal name"
                  placeholder="Enter meal name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  title="Select meal category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                title="Enter meal description"
                placeholder="Describe the meal..."
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Meal Image
              </label>
              <ImageUpload
                currentImageUrl={formData.image}
                onImageUpload={(imageUrl) => setFormData(prev => ({ ...prev, image: imageUrl }))}
                uploadEndpoint="/upload/meal-image"
                label="Upload Meal Image"
                className="w-full"
                enableCropping={true}
                cropAspectRatio={1080 / 1350}
              />
            </div>

            {/* Pricing Information */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💰 Cost Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Packaging (₦) *
                  </label>
                  <input
                    type="number"
                    name="packaging"
                    value={formData.packaging}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Cooking Cost (₦) *
                  </label>
                  <input
                    type="number"
                    name="cookingCosts"
                    value={formData.cookingCosts}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the cost to prepare this meal
                  </p>
                </div>
              </div>

              {/* Price Calculations Display */}
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 dark:border-blue-600">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">Cooking Cost:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(calculatePricing().cookingCosts)}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Auto-calculated</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">Total Costs:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(calculatePricing().totalCosts)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">Platform Fee (20%):</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(calculatePricing().platformFee)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-green-600 dark:text-green-400">New Price:</span>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(calculatePricing().totalPrice)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300">Current Price</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(meal.pricing.totalPrice)}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Chef Earnings</div>
                    <div className="text-lg font-semibold text-green-800 dark:text-green-200">{formatCurrency(calculatePricing().chefEarnings)}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">Cooking Cost Only</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Choma Earnings</div>
                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">{formatCurrency(calculatePricing().chomaEarnings)}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Platform Fee + Packaging</div>
                  </div>
                </div>

                {calculatePricing().totalPrice !== meal.pricing.totalPrice && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-center">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {calculatePricing().totalPrice > meal.pricing.totalPrice ? '↗️ Price Increase' : '↘️ Price Decrease'}:
                      {formatCurrency(Math.abs(calculatePricing().totalPrice - meal.pricing.totalPrice))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition Information */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🥗 Nutrition Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Calories
                  </label>
                  <input
                    type="number"
                    name="calories"
                    value={formData.calories}
                    onChange={handleInputChange}
                    title="Enter calories"
                    placeholder="Enter calories"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    name="protein"
                    value={formData.protein}
                    onChange={handleInputChange}
                    title="Enter protein in grams"
                    placeholder="Enter protein (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    name="carbs"
                    value={formData.carbs}
                    onChange={handleInputChange}
                    title="Enter carbohydrates in grams"
                    placeholder="Enter carbs (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    name="fat"
                    value={formData.fat}
                    onChange={handleInputChange}
                    title="Enter fat in grams"
                    placeholder="Enter fat (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    name="fiber"
                    value={formData.fiber}
                    onChange={handleInputChange}
                    title="Enter fiber in grams"
                    placeholder="Enter fiber (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Sugar (g)
                  </label>
                  <input
                    type="number"
                    name="sugar"
                    value={formData.sugar}
                    onChange={handleInputChange}
                    title="Enter sugar in grams"
                    placeholder="Enter sugar (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    title="Enter weight in grams"
                    placeholder="Enter weight (g)"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    name="preparationTime"
                    value={formData.preparationTime}
                    onChange={handleInputChange}
                    title="Enter preparation time in minutes"
                    placeholder="Enter prep time (min)"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  Ingredients
                </label>
                <textarea
                  name="ingredients"
                  value={formData.ingredients}
                  onChange={handleInputChange}
                  title="Enter ingredients list"
                  placeholder="List all ingredients..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  Allergens
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {allergenOptions.map(allergen => (
                    <label key={allergen} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen)}
                        onChange={() => handleAllergenChange(allergen)}
                        className="rounded mr-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-200">{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  title="Enter tags separated by commas"
                  placeholder="e.g. spicy, vegetarian, gluten-free"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    name="adminNotes"
                    value={formData.adminNotes}
                    onChange={handleInputChange}
                    title="Enter admin notes"
                    placeholder="Internal notes for admin use..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    Chef Instructions
                  </label>
                  <textarea
                    name="chefNotes"
                    value={formData.chefNotes}
                    onChange={handleInputChange}
                    title="Enter chef instructions"
                    placeholder="Special instructions for the chef..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Meal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}