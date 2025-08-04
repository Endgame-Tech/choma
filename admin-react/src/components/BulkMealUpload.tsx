import React, { useRef, useState } from 'react'

import * as XLSX from 'xlsx'
import { mealsApi } from '../services/mealApi'
import { CloudArrowUpIcon, DocumentArrowDownIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface BulkMealUploadProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ExcelMealData {
  name: string
  description?: string
  basePrice: number
  platformFee: number
  chefFee: number
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  weight?: number
  ingredients?: string
  preparationTime?: number
  allergens?: string
  tags?: string
  isAvailable?: string
  adminNotes?: string
  chefNotes?: string
  image?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  value?: string | number | undefined
}

interface UploadResult {
  success: boolean
  totalRows: number
  successCount: number
  failedCount: number
  errors: ValidationError[]
  successfulMeals?: ExcelMealData[]
}

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Beverage']


export default function BulkMealUpload({ isOpen, onClose, onSuccess }: BulkMealUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [previewData, setPreviewData] = useState<ExcelMealData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Excel template data with proper column headers and example data
  const createExcelTemplate = () => {
    const templateData = [
      {
        // Required Fields (columns A-E)
        'Meal Name': 'Jollof Rice with Chicken',
        'Description': 'Traditional Nigerian rice dish cooked with tomatoes, peppers, and spices, served with grilled chicken',
        'Base Price (₦)': 2500,
        'Platform Fee (₦)': 300,
        'Chef Fee (₦)': 200,
        
        // Optional Fields (columns F-U)
        'Category': 'Lunch',
        'Calories': 450,
        'Protein (g)': 25,
        'Carbs (g)': 65,
        'Fat (g)': 12,
        'Fiber (g)': 3,
        'Sugar (g)': 8,
        'Weight (g)': 350,
        'Ingredients': 'Rice, chicken, tomatoes, onions, bell peppers, spices',
        'Preparation Time (mins)': 45,
        'Allergens': 'dairy,gluten',
        'Tags': 'popular,traditional,protein-rich',
        'Available': 'TRUE',
        'Admin Notes': 'Popular Nigerian dish',
        'Chef Notes': 'Cook rice until fluffy',
        'Image URL': 'https://example.com/jollof-rice.jpg'
      },
      {
        'Meal Name': 'Egusi Soup with Pounded Yam',
        'Description': 'Rich Nigerian soup made with ground egusi seeds, leafy vegetables, meat and fish, served with smooth pounded yam',
        'Base Price (₦)': 3000,
        'Platform Fee (₦)': 350,
        'Chef Fee (₦)': 250,
        'Category': 'Dinner',
        'Calories': 520,
        'Protein (g)': 30,
        'Carbs (g)': 45,
        'Fat (g)': 18,
        'Fiber (g)': 5,
        'Sugar (g)': 6,
        'Weight (g)': 400,
        'Ingredients': 'Egusi seeds, spinach, meat, fish, yam, palm oil',
        'Preparation Time (mins)': 60,
        'Allergens': 'fish',
        'Tags': 'traditional,protein-rich,vegetable',
        'Available': 'TRUE',
        'Admin Notes': 'Traditional Nigerian soup',
        'Chef Notes': 'Pound yam until smooth',
        'Image URL': 'https://example.com/egusi-soup.jpg'
      },
      {
        'Meal Name': 'Fruit Salad',
        'Description': 'Fresh mix of seasonal tropical fruits with a light honey dressing and mint leaves',
        'Base Price (₦)': 1500,
        'Platform Fee (₦)': 200,
        'Chef Fee (₦)': 100,
        'Category': 'Dessert',
        'Calories': 180,
        'Protein (g)': 2,
        'Carbs (g)': 45,
        'Fat (g)': 0.5,
        'Fiber (g)': 8,
        'Sugar (g)': 35,
        'Weight (g)': 250,
        'Ingredients': 'Mixed seasonal fruits, honey, mint leaves',
        'Preparation Time (mins)': 15,
        'Allergens': '',
        'Tags': 'healthy,fresh,vegan,low-calorie',
        'Available': 'TRUE',
        'Admin Notes': 'Seasonal fruit availability may vary',
        'Chef Notes': 'Use fresh fruits only',
        'Image URL': 'https://example.com/fruit-salad.jpg'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Meals Template')
    
    // Ensure data types are preserved
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:U4')
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Set numeric columns as numbers
      for (let C = 2; C <= 4; ++C) { // Base Price, Platform Fee, Chef Fee columns (now columns C, D, E)
        const cell_address = XLSX.utils.encode_cell({c: C, r: R})
        if (!ws[cell_address]) continue
        ws[cell_address].t = 'n' // Force number type
      }
    }
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 }, // Meal Name
      { wch: 40 }, // Description
      { wch: 12 }, // Base Price
      { wch: 12 }, // Platform Fee
      { wch: 12 }, // Chef Fee
      { wch: 12 }, // Category
      { wch: 10 }, // Calories
      { wch: 10 }, // Protein
      { wch: 10 }, // Carbs
      { wch: 10 }, // Fat
      { wch: 10 }, // Fiber
      { wch: 10 }, // Sugar
      { wch: 10 }, // Weight
      { wch: 30 }, // Ingredients
      { wch: 15 }, // Preparation Time
      { wch: 15 }, // Allergens
      { wch: 20 }, // Tags
      { wch: 10 }, // Available
      { wch: 20 }, // Admin Notes
      { wch: 20 }, // Chef Notes
      { wch: 25 }  // Image URL
    ]

    XLSX.writeFile(wb, 'meals_upload_template.xlsx')
  }

  const validateMealData = (data: ExcelMealData[], startRow: number = 2): ValidationError[] => {
    const errors: ValidationError[] = []

    data.forEach((meal, index) => {
      const rowNum = startRow + index

      // Required field validations
      if (!meal.name || meal.name.trim() === '') {
        errors.push({ row: rowNum, field: 'Meal Name', message: 'Meal name is required', value: meal.name })
      }

      if (!meal.basePrice || isNaN(meal.basePrice) || meal.basePrice <= 0) {
        errors.push({ row: rowNum, field: 'Base Price', message: 'Valid base price is required (must be > 0)', value: meal.basePrice })
      }

      if (!meal.platformFee || isNaN(meal.platformFee) || meal.platformFee < 0) {
        errors.push({ row: rowNum, field: 'Platform Fee', message: 'Valid platform fee is required (must be >= 0)', value: meal.platformFee })
      }

      if (!meal.chefFee || isNaN(meal.chefFee) || meal.chefFee < 0) {
        errors.push({ row: rowNum, field: 'Chef Fee', message: 'Valid chef fee is required (must be >= 0)', value: meal.chefFee })
      }

      // Optional field validations
      if (meal.category && !CATEGORIES.includes(meal.category)) {
        errors.push({ row: rowNum, field: 'Category', message: `Category must be one of: ${CATEGORIES.join(', ')}`, value: meal.category })
      }

      // Nutrition validations (if provided)
      if (meal.calories !== undefined && (isNaN(meal.calories) || meal.calories < 0)) {
        errors.push({ row: rowNum, field: 'Calories', message: 'Calories must be a positive number', value: meal.calories })
      }

      if (meal.protein !== undefined && (isNaN(meal.protein) || meal.protein < 0)) {
        errors.push({ row: rowNum, field: 'Protein', message: 'Protein must be a positive number', value: meal.protein })
      }

      if (meal.preparationTime !== undefined && (isNaN(meal.preparationTime) || meal.preparationTime <= 0)) {
        errors.push({ row: rowNum, field: 'Preparation Time', message: 'Preparation time must be a positive number', value: meal.preparationTime })
      }

      // Boolean validation for availability
      if (meal.isAvailable && !['TRUE', 'FALSE', 'true', 'false', '1', '0'].includes(meal.isAvailable.toString())) {
        errors.push({ row: rowNum, field: 'Available', message: 'Available must be TRUE or FALSE', value: meal.isAvailable })
      }

      // URL validation for image (basic)
      if (meal.image && meal.image.trim() !== '') {
        try {
          new URL(meal.image)
        } catch {
          errors.push({ row: rowNum, field: 'Image URL', message: 'Invalid URL format', value: meal.image })
        }
      }
    })

    return errors
  }

  const convertExcelDataToMealFormat = (excelData: ExcelMealData[]) => {
    return excelData.map(meal => {
      const basePrice = Number(meal.basePrice) || 0
      const platformFee = Number(meal.platformFee) || 0
      const chefFee = Number(meal.chefFee) || 0
      const totalPrice = basePrice + platformFee + chefFee

      return {
        name: meal.name?.trim() || '',
        description: meal.description?.trim() || '',
        pricing: {
          basePrice,
          platformFee,
          chefFee,
          totalPrice
        },
        nutrition: {
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
          fiber: Number(meal.fiber) || 0,
          sugar: Number(meal.sugar) || 0,
          weight: Number(meal.weight) || 0
        },
        category: meal.category || 'Lunch',
        ingredients: meal.ingredients?.trim() || '',
        preparationTime: Number(meal.preparationTime) || 0,
        allergens: meal.allergens ? meal.allergens.split(',').map(a => a.trim()).filter(a => a) : [],
        tags: meal.tags ? meal.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        isAvailable: meal.isAvailable ? ['TRUE', 'true', '1'].includes(meal.isAvailable.toString()) : true,
        adminNotes: meal.adminNotes?.trim() || '',
        chefNotes: meal.chefNotes?.trim() || '',
        image: meal.image?.trim() || ''
      }
    })
  }

  const parseExcelFile = (file: File): Promise<ExcelMealData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          }) as string[][]

          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row')
          }

          const headers = jsonData[0]
          const dataRows = jsonData.slice(1).filter(row => {
            // Filter out completely empty rows and rows where the first column (meal name) is empty
            return row.length > 0 && row.some(cell => cell !== '' && cell !== null && cell !== undefined) && 
                   row[0] && row[0].toString().trim() !== ''
          })

          console.log('📊 Excel parsing debug:')
          console.log('Total raw rows:', jsonData.length)
          console.log('Headers:', headers)
          console.log('Filtered data rows:', dataRows.length)
          console.log('Data rows content:', dataRows)

          // Map headers to expected field names
          const headerMapping: { [key: string]: keyof ExcelMealData } = {
            'Meal Name': 'name',
            'Description': 'description',
            'Base Price (₦)': 'basePrice',
            'Platform Fee (₦)': 'platformFee', 
            'Chef Fee (₦)': 'chefFee',
            'Category': 'category',
            'Calories': 'calories',
            'Protein (g)': 'protein',
            'Carbs (g)': 'carbs',
            'Fat (g)': 'fat',
            'Fiber (g)': 'fiber',
            'Sugar (g)': 'sugar',
            'Weight (g)': 'weight',
            'Ingredients': 'ingredients',
            'Preparation Time (mins)': 'preparationTime',
            'Allergens': 'allergens',
            'Tags': 'tags',
            'Available': 'isAvailable',
            'Admin Notes': 'adminNotes',
            'Chef Notes': 'chefNotes',
            'Image URL': 'image'
          }

          const meals: ExcelMealData[] = dataRows.map(row => {
            const meal: ExcelMealData = {} as ExcelMealData
            headers.forEach((header, index) => {
              const fieldName = headerMapping[header as string]
              if (fieldName && row[index] !== undefined && row[index] !== '') {
                // Convert numeric fields
                if (['basePrice', 'platformFee', 'chefFee', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'weight', 'preparationTime'].includes(fieldName)) {
                  (meal as Record<keyof ExcelMealData, unknown>)[fieldName] = Number(row[index])
                } else {
                  (meal as Record<keyof ExcelMealData, unknown>)[fieldName] = row[index]
                }
              }
            })
            return meal
          })

          resolve(meals)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      setUploadResult(null)
      
      const excelData = await parseExcelFile(file)
      setPreviewData(excelData)
      
      console.log('🔍 Parsed Excel data for validation:', excelData)
      
      // Validate data
      const validationErrors = validateMealData(excelData)
      
      if (validationErrors.length > 0) {
        setUploadResult({
          success: false,
          totalRows: excelData.length,
          successCount: 0,
          failedCount: excelData.length,
          errors: validationErrors
        })
        setShowPreview(true)
        return
      }

      // Convert to API format and upload
      const mealsToUpload = convertExcelDataToMealFormat(excelData)
      const response = await mealsApi.bulkCreateMeals(mealsToUpload) as {
        data: {
          summary?: { created?: number; failed?: number };
          created?: ExcelMealData[];
          errors?: { error?: string; message?: string; meal?: { name?: string } }[];
        }
      }
      
      setUploadResult({
        success: true,
        totalRows: excelData.length,
        successCount: response.data.summary?.created || response.data.created?.length || 0,
        failedCount: response.data.summary?.failed || response.data.errors?.length || 0,
        errors: response.data.errors?.map((err: { error?: string; message?: string; meal?: { name?: string } }, index: number) => ({
          row: index + 2, // Excel row number (accounting for header)
          field: 'General',
          message: err.error || err.message || 'Unknown error',
          value: err.meal?.name || 'Unknown meal'
        })) || [],
        successfulMeals: response.data.created
      })
      
      if ((response.data.summary?.created || response.data.created?.length || 0) > 0) {
        onSuccess()
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      let errorMessage = 'Upload failed';
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
      ) {
        errorMessage = error.response.data.message;
      }
      setUploadResult({
        success: false,
        totalRows: previewData.length,
        successCount: 0,
        failedCount: previewData.length,
        errors: [{
          row: 0,
          field: 'General',
          message: errorMessage
        }]
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    const excelFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    )
    
    if (excelFile) {
      handleFileUpload(excelFile)
    } else {
      alert('Please upload a valid Excel file (.xlsx or .xls)')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Meal Upload</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!uploadResult && !showPreview && (
            <>
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Upload Instructions</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the Excel template below</li>
                  <li>Fill in your meal data following the column headers exactly</li>
                  <li>Required columns: Meal Name, Base Price, Platform Fee, Chef Fee</li>
                  <li>Optional columns: Description, nutrition, ingredient, and metadata fields</li>
                  <li>Use TRUE/FALSE for Available column</li>
                  <li>Separate multiple allergens/tags with commas</li>
                  <li>Upload your completed Excel file</li>
                </ol>
              </div>

              {/* Download Template Button */}
              <div className="mb-6">
                <button
                  onClick={createExcelTemplate}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Download Excel Template
                </button>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your Excel file here or click to browse
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Supports .xlsx and .xls files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? 'Processing...' : 'Select File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  title="Select Excel file to upload"
                  placeholder="Choose an Excel file (.xlsx or .xls)"
                />
              </div>
            </>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                uploadResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {uploadResult.success ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                  )}
                  <h4 className={`font-semibold ${
                    uploadResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {uploadResult.success ? 'Upload Completed' : 'Upload Failed'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Rows:</span>
                    <span className="ml-1">{uploadResult.totalRows}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Successful:</span>
                    <span className="ml-1">{uploadResult.successCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Failed:</span>
                    <span className="ml-1">{uploadResult.failedCount}</span>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-semibold text-red-900 mb-3">Error Details:</h5>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border-l-4 border-red-400">
                        <div className="font-medium text-red-800">
                          Row {error.row} - {error.field}
                        </div>
                        <div className="text-red-700">{error.message}</div>
                        {error.value !== undefined && (
                          <div className="text-gray-600 text-xs">
                            Value: &quot;{error.value}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setUploadResult(null)
                    setPreviewData([])
                    setShowPreview(false)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {uploading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing Excel file...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}