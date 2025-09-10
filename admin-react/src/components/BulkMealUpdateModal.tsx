import React, { useState } from 'react'
import { mealsApi, type Meal } from '../services/mealApi'
import { useNotifications } from '../contexts/NotificationContext'
import * as XLSX from 'xlsx'

interface BulkMealUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  allMeals: Meal[]
}

const BulkMealUpdateModal: React.FC<BulkMealUpdateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allMeals
}) => {
  const { showToast } = useNotifications()
  const [step, setStep] = useState<'select' | 'export' | 'upload'>('select')
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Filter meals based on search and category
  const filteredMeals = allMeals.filter(meal => {
    const matchesSearch = meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || meal.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(allMeals.map(meal => meal.category).filter(Boolean)))

  const handleSelectMeal = (mealId: string) => {
    setSelectedMeals(prev =>
      prev.includes(mealId)
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    )
  }

  const handleSelectAll = () => {
    setSelectedMeals(
      selectedMeals.length === filteredMeals.length
        ? []
        : filteredMeals.map(meal => meal._id)
    )
  }

  const handleExportToExcel = () => {
    if (selectedMeals.length === 0) {
      showToast({
        title: 'No meals selected',
        message: 'Please select at least one meal to export.',
        type: 'meal_update',
        severity: 'warning'
      })
      return
    }

    setLoading(true)
    try {
      // Get selected meals data
      const selectedMealData = allMeals.filter(meal => selectedMeals.includes(meal._id))

      // Prepare data for Excel with all editable fields
      const excelData = selectedMealData.map(meal => ({
        'Meal ID': meal._id,
        'Meal Name': meal.name,
        'Category': meal.category || '',
        'Image URL': meal.image || '',
        'Ingredients': meal.ingredients || '',
        'Preparation Time (min)': meal.preparationTime || '',
        'Complexity Level': meal.complexityLevel || '',
        'Allergens (comma-separated)': meal.allergens?.join(', ') || '',
        'Tags (comma-separated)': meal.tags?.join(', ') || '',
        'Available': meal.isAvailable ? 'Yes' : 'No',
        'Admin Notes': meal.adminNotes || '',
        'Chef Notes': meal.chefNotes || '',

        // Pricing
        'Ingredients Cost': meal.pricing?.ingredients || 0,
        'Cooking Costs': meal.pricing?.cookingCosts || 0,
        'Packaging Cost': meal.pricing?.packaging || 0,
        'Platform Fee': meal.pricing?.platformFee || 0,
        'Total Costs': meal.pricing?.totalCosts || 0,
        'Profit': meal.pricing?.profit || 0,
        'Total Price': meal.pricing?.totalPrice || 0,
        'Chef Earnings': meal.pricing?.chefEarnings || 0,
        'Choma Earnings': meal.pricing?.chomaEarnings || 0,

        // Nutrition
        'Calories': meal.nutrition?.calories || 0,
        'Protein (g)': meal.nutrition?.protein || 0,
        'Carbs (g)': meal.nutrition?.carbs || 0,
        'Fat (g)': meal.nutrition?.fat || 0,
        'Fiber (g)': meal.nutrition?.fiber || 0,
        'Sugar (g)': meal.nutrition?.sugar || 0,
        'Weight (g)': meal.nutrition?.weight || 0,
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Add instructions sheet
      const instructions = [
        ['Bulk Meal Update Instructions'],
        [''],
        ['1. DO NOT modify the "Meal ID" column - this is used to identify meals for updates'],
        ['2. Update any other fields as needed'],
        ['3. For "Available" column, use "Yes" or "No"'],
        ['4. For "Complexity Level", use "low", "medium", or "high"'],
        ['5. For comma-separated fields (Allergens, Tags), separate items with commas'],
        ['6. Numeric fields should contain numbers only'],
        ['7. Save the file and upload it back using the upload step'],
        [''],
        ['Note: Only meals with modified data will be updated in the system'],
        ['Tip: You can filter/sort this data in Excel before making changes']
      ]
      const instructionsWs = XLSX.utils.aoa_to_sheet(instructions)

      // Add both sheets to workbook
      XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions')
      XLSX.utils.book_append_sheet(wb, ws, 'Meals Data')

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `bulk-meal-update-${selectedMeals.length}-meals-${timestamp}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      showToast({
        title: 'Export successful',
        message: `Downloaded Excel file with ${selectedMeals.length} meals. Make your changes and upload it back.`,
        type: 'meal_update',
        severity: 'success',
        duration: 5000
      })

      setStep('upload')
    } catch (error) {
      console.error('Export error:', error)
      showToast({
        title: 'Export failed',
        message: 'Failed to export meals data. Please try again.',
        type: 'meal_update',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // Read the Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })

      // Get the meals data sheet
      const worksheet = workbook.Sheets['Meals Data']
      if (!worksheet) {
        throw new Error('Could not find "Meals Data" sheet in the uploaded file')
      }

      type ExcelMealRow = {
        'Meal ID': string
        'Meal Name': string
        'Category': string
        'Image URL': string
        'Ingredients': string
        'Preparation Time (min)': number | string
        'Complexity Level': string
        'Allergens (comma-separated)': string
        'Tags (comma-separated)': string
        'Available': string
        'Admin Notes': string
        'Chef Notes': string
        'Ingredients Cost': number | string
        'Cooking Costs': number | string
        'Packaging Cost': number | string
        'Platform Fee': number | string
        'Total Costs': number | string
        'Profit': number | string
        'Total Price': number | string
        'Chef Earnings': number | string
        'Choma Earnings': number | string
        'Calories': number | string
        'Protein (g)': number | string
        'Carbs (g)': number | string
        'Fat (g)': number | string
        'Fiber (g)': number | string
        'Sugar (g)': number | string
        'Weight (g)': number | string
      }
      const jsonData = XLSX.utils.sheet_to_json<ExcelMealRow>(worksheet)

      if (jsonData.length === 0) {
        throw new Error('No data found in the uploaded file')
      }

      // Process updates and detect potential duplicates
      const updates: Array<{ id: string; data: Partial<Meal> }> = []
      const nameConflicts: string[] = []

      for (const row of jsonData) {
        const mealId = row['Meal ID']
        if (!mealId) continue

        // Find original meal
        const originalMeal = allMeals.find(m => m._id === mealId)
        if (!originalMeal) continue

        // Build update object with only changed fields
        const updateData: Partial<Meal> = {}

        // Basic fields
        if (row['Meal Name'] !== originalMeal.name) {
          // Check for potential name conflicts with other meals
          const newName = row['Meal Name']
          const conflictingMeal = allMeals.find(m =>
            m._id !== mealId &&
            m.name.toLowerCase() === newName.toLowerCase()
          )
          if (conflictingMeal) {
            nameConflicts.push(`"${newName}" conflicts with existing meal (ID: ${conflictingMeal._id})`)
          }
          updateData.name = newName
        }
        if (row['Category'] !== originalMeal.category) {
          updateData.category = row['Category']
        }
        if (row['Image URL'] !== originalMeal.image) {
          updateData.image = row['Image URL']
        }
        if (row['Ingredients'] !== originalMeal.ingredients) {
          updateData.ingredients = row['Ingredients']
        }
        if (Number(row['Preparation Time (min)']) !== originalMeal.preparationTime) {
          updateData.preparationTime = Number(row['Preparation Time (min)'])
        }
        if (row['Complexity Level'] !== originalMeal.complexityLevel) {
          const allowedLevels = ['low', 'medium', 'high'] as const
          type ComplexityLevel = typeof allowedLevels[number]
          const newLevel = row['Complexity Level']?.toLowerCase() as ComplexityLevel
          updateData.complexityLevel = allowedLevels.includes(newLevel) ? newLevel : undefined
        }
        if (row['Admin Notes'] !== originalMeal.adminNotes) {
          updateData.adminNotes = row['Admin Notes']
        }
        if (row['Chef Notes'] !== originalMeal.chefNotes) {
          updateData.chefNotes = row['Chef Notes']
        }

        // Availability
        const isAvailable = row['Available']?.toLowerCase() === 'yes'
        if (isAvailable !== originalMeal.isAvailable) {
          updateData.isAvailable = isAvailable
        }

        // Arrays (allergens, tags)
        const allergens = row['Allergens (comma-separated)']?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
        if (JSON.stringify(allergens) !== JSON.stringify(originalMeal.allergens || [])) {
          updateData.allergens = allergens
        }

        const tags = row['Tags (comma-separated)']?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
        if (JSON.stringify(tags) !== JSON.stringify(originalMeal.tags || [])) {
          updateData.tags = tags
        }

        // Pricing updates
        const pricingUpdates: Record<string, number> = {}
        const pricingFields: Array<keyof NonNullable<Meal["pricing"]>> = [
          'ingredients', 'cookingCosts', 'packaging', 'platformFee',
          'totalCosts', 'profit', 'totalPrice', 'chefEarnings', 'chomaEarnings'
        ]

        for (const field of pricingFields) {
          const excelKey = field === 'ingredients' ? 'Ingredients Cost' :
            field === 'cookingCosts' ? 'Cooking Costs' :
              field === 'packaging' ? 'Packaging Cost' :
                field === 'platformFee' ? 'Platform Fee' :
                  field === 'totalCosts' ? 'Total Costs' :
                    field === 'profit' ? 'Profit' :
                      field === 'totalPrice' ? 'Total Price' :
                        field === 'chefEarnings' ? 'Chef Earnings' :
                          field === 'chomaEarnings' ? 'Choma Earnings' : field

          const newValue = Number((row as Record<string, string | number>)[excelKey]) || 0
          if (newValue !== (originalMeal.pricing?.[field] || 0)) {
            pricingUpdates[field] = newValue
          }
        }

        if (Object.keys(pricingUpdates).length > 0) {
          updateData.pricing = { ...originalMeal.pricing, ...pricingUpdates }
        }

        // Nutrition updates
        const nutritionUpdates: Record<string, number> = {}
        const nutritionFields: Array<keyof NonNullable<Meal['nutrition']>> = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'weight']

        for (const field of nutritionFields) {
          const excelKey = field === 'protein' ? 'Protein (g)' :
            field === 'carbs' ? 'Carbs (g)' :
              field === 'fat' ? 'Fat (g)' :
                field === 'fiber' ? 'Fiber (g)' :
                  field === 'sugar' ? 'Sugar (g)' :
                    field === 'weight' ? 'Weight (g)' :
                      field === 'calories' ? 'Calories' : field

          const newValue = Number((row as Record<string, string | number>)[excelKey]) || 0
          if (newValue !== (originalMeal.nutrition?.[field] || 0)) {
            nutritionUpdates[field] = newValue
          }
        }

        if (Object.keys(nutritionUpdates).length > 0) {
          updateData.nutrition = { ...originalMeal.nutrition, ...nutritionUpdates }
        }

        // Only add to updates if there are actual changes
        if (Object.keys(updateData).length > 0) {
          updates.push({ id: mealId, data: updateData })
        }
      }

      if (updates.length === 0) {
        showToast({
          title: 'No changes detected',
          message: 'No changes detected in the uploaded file.',
          type: 'meal_update',
          severity: 'info'
        })
        return
      }

      // Check for name conflicts
      if (nameConflicts.length > 0) {
        const conflictMessage = `Warning: Found ${nameConflicts.length} potential name conflicts:\n\n${nameConflicts.slice(0, 3).join('\n')}${nameConflicts.length > 3 ? `\n... and ${nameConflicts.length - 3} more` : ''}\n\nThese updates may create duplicate meal names. Do you want to proceed anyway?`
        if (!confirm(conflictMessage)) {
          return
        }
      }

      // Confirm updates
      const confirmMessage = `Found ${updates.length} meals with changes out of ${jsonData.length} total rows.${nameConflicts.length > 0 ? `\n\nWarning: ${nameConflicts.length} potential conflicts detected.` : ''}\n\nDo you want to proceed with the updates?`
      if (!confirm(confirmMessage)) {
        return
      }

      // Apply updates using bulk API
      try {
        await mealsApi.bulkUpdateMeals(updates)
        showToast({
          title: 'Bulk update completed',
          message: `Successfully updated ${updates.length} meals.`,
          type: 'meal_update',
          severity: 'success',
          duration: 5000
        })
      } catch (error) {
        console.error('Bulk update error:', error)

        // If bulk update fails, fall back to individual updates
        showToast({
          title: 'Bulk update failed',
          message: 'Bulk update failed, trying individual updates...',
          type: 'meal_update',
          severity: 'warning'
        })

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const update of updates) {
          try {
            await mealsApi.updateMeal(update.id, update.data)
            successCount++
          } catch (error) {
            errorCount++
            const mealName = allMeals.find(m => m._id === update.id)?.name || update.id
            errors.push(`${mealName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        // Show results
        if (successCount > 0 && errorCount === 0) {
          showToast({
            title: 'Updates completed',
            message: `Successfully updated ${successCount} meals.`,
            type: 'meal_update',
            severity: 'success',
            duration: 5000
          })
        } else if (successCount > 0 && errorCount > 0) {
          showToast({
            title: 'Partial success',
            message: `Updated ${successCount} meals successfully, ${errorCount} failed.`,
            type: 'meal_update',
            severity: 'warning',
            duration: 7000
          })
        } else {
          showToast({
            title: 'Update failed',
            message: `Failed to update all ${errorCount} meals. Please check the console for details.`,
            type: 'meal_update',
            severity: 'error',
            duration: 7000
          })
        }

        if (successCount === 0) {
          return // Don't close modal if no updates succeeded
        }
      }

      onSuccess()
      onClose()

    } catch (error) {
      console.error('Upload error:', error)
      showToast({
        title: 'Upload failed',
        message: `Failed to process uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'meal_update',
        severity: 'error',
        duration: 7000
      })
    } finally {
      setLoading(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  const resetModal = () => {
    setStep('select')
    setSelectedMeals([])
    setSearchTerm('')
    setCategoryFilter('')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
            Bulk Meal Update
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300"
            disabled={loading}
            title="Close"
          >
            <i className="fi fi-sr-cross text-xl"></i>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'select' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'select' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'}`}>
                1
              </div>
              <span className="text-sm font-medium">Select Meals</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-neutral-700"></div>

            <div className={`flex items-center space-x-2 ${step === 'export' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'export' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'}`}>
                2
              </div>
              <span className="text-sm font-medium">Download Excel</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-neutral-700"></div>

            <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'upload' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'}`}>
                3
              </div>
              <span className="text-sm font-medium">Upload Updated File</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'select' && (
            <div className="p-6 space-y-4 flex flex-col min-h-0">
              <div className="text-sm text-gray-600 dark:text-neutral-300">
                Select the meals you want to update. You&apos;ll download an Excel file with their current data, make your changes, and upload it back.
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search meals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-neutral-700">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 mr-2"
                    checked={selectedMeals.length === filteredMeals.length && filteredMeals.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                    Select All ({filteredMeals.length} meals)
                  </span>
                </label>
                <span className="text-sm text-gray-500 dark:text-neutral-400">
                  {selectedMeals.length} selected
                </span>
              </div>

              {/* Meals List */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-96">
                {filteredMeals.map(meal => (
                  <div
                    key={meal._id}
                    className={`flex items-center p-3 rounded-lg border transition-colors cursor-pointer ${selectedMeals.includes(meal._id)
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700'
                      }`}
                    onClick={() => handleSelectMeal(meal._id)}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 mr-3"
                      checked={selectedMeals.includes(meal._id)}
                      onChange={() => handleSelectMeal(meal._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                          {meal.image ? (
                            <img src={meal.image} alt={meal.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <span className="text-gray-400 dark:text-neutral-400"><i className="fi fi-sr-utensils"></i></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">
                            {meal.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-neutral-400">
                            {meal.category} • ₦{meal.pricing?.totalPrice || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'export' && (
            <div className="p-6 text-center space-y-4">
              <div className="text-4xl text-green-500 mb-4">
                <i className="fi fi-sr-download"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
                Ready to Download Excel File
              </h3>
              <p className="text-gray-600 dark:text-neutral-300">
                You&apos;ve selected {selectedMeals.length} meals. Click the button below to download an Excel file with their current data.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleExportToExcel}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fi fi-sr-download mr-2"></i>
                      Download Excel File
                    </>
                  )}
                </button>
                <div className="text-xs text-gray-500 dark:text-neutral-400">
                  The file will include instructions on how to make your updates.
                </div>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="p-6 text-center space-y-4">
              <div className="text-4xl text-blue-500 mb-4">
                <i className="fi fi-sr-cloud-upload"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
                Upload Your Updated File
              </h3>
              <p className="text-gray-600 dark:text-neutral-300">
                Make your changes in Excel and upload the file here. Only meals with actual changes will be updated.
              </p>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className={`cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fi fi-sr-cloud-upload mr-2"></i>
                        Choose Excel File
                      </>
                    )}
                  </label>
                  <div className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                    Supported formats: .xlsx, .xls
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-neutral-700">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {step === 'select' && (
              <button
                onClick={() => setStep('export')}
                disabled={selectedMeals.length === 0}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue ({selectedMeals.length} selected)
              </button>
            )}

            {(step === 'export' || step === 'upload') && (
              <button
                onClick={() => setStep('select')}
                disabled={loading}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back to Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkMealUpdateModal