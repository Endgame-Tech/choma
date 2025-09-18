import React, { useState } from 'react'
import { CreatePromoBannerData } from '../services/promoBannersApi'
import ImageUpload from './ImageUpload'

interface CreateBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bannerData: Omit<CreatePromoBannerData, 'createdBy'>) => Promise<void>;
}

const CreateBannerModal: React.FC<CreateBannerModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Omit<CreatePromoBannerData, 'createdBy'>>({
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaText: '',
    ctaDestination: 'Search',
    ctaParams: undefined,
    externalUrl: '',
    isActive: true,
    priority: 0,
    startDate: '',
    endDate: '',
    targetAudience: 'all'
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.imageUrl || !formData.ctaText) {
      setError('Title, image URL, and CTA text are required')
      return
    }

    if (formData.ctaDestination === 'External' && !formData.externalUrl) {
      setError('External URL is required when CTA destination is External')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const submitData = { ...formData }
      
      // Clean up empty fields
      if (!submitData.subtitle) delete submitData.subtitle
      if (!submitData.externalUrl) delete submitData.externalUrl
      if (!submitData.startDate) delete submitData.startDate
      if (!submitData.endDate) delete submitData.endDate
      if (!submitData.ctaParams) delete submitData.ctaParams

      await onSubmit(submitData)
      
      // Reset form
      setFormData({
        title: '',
        subtitle: '',
        imageUrl: '',
        ctaText: '',
        ctaDestination: 'Search',
        ctaParams: undefined,
        externalUrl: '',
        isActive: true,
        priority: 0,
        startDate: '',
        endDate: '',
        targetAudience: 'all'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create banner')
    } finally {
      setLoading(false)
    }
  }

  const ctaDestinations = [
    { value: 'Search', label: 'Search Screen' },
    { value: 'MealPlans', label: 'Meal Plans Screen' },
    { value: 'MealPlanDetail', label: 'Specific Meal Plan' },
    { value: 'Profile', label: 'Profile Screen' },
    { value: 'Orders', label: 'Orders Screen' },
    { value: 'Support', label: 'Support Screen' },
    { value: 'External', label: 'External URL' }
  ]

  const targetAudiences = [
    { value: 'all', label: 'All Users' },
    { value: 'new_users', label: 'New Users' },
    { value: 'existing_users', label: 'Existing Users' },
    { value: 'subscribers', label: 'Subscribers Only' },
    { value: 'non_subscribers', label: 'Non-Subscribers Only' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Promo Banner</h2>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="text-sm text-red-600 dark:text-red-300">{error}</div>
              </div>
            )}

            {/* Banner Name (for admin reference only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Banner Name (Admin Reference) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Summer Sale Banner, Black Friday Deal, etc."
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This is only for admin identification and won&apos;t be shown in the app
              </p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Banner Design (Image/GIF) *
              </label>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📐 <strong>Design Guidelines:</strong><br/>
                  • Upload a complete banner design (1200x400px - 3:1 aspect ratio)<br/>
                  • Image will be automatically optimized to banner dimensions<br/>
                  • The CTA button will overlay on the bottom-right corner<br/>
                  • No cropping needed - upload your final design<br/>
                  • Supports static images (JPG, PNG) and animated GIFs
                </p>
              </div>
              <ImageUpload
                currentImageUrl={formData.imageUrl}
                onImageUpload={(imageUrl) => setFormData(prev => ({ ...prev, imageUrl }))}
                maxSizeMB={5}
                label="Upload Banner Design"
                enableCropping={false}
                uploadEndpoint="/upload/banner-image"
              />
              
              {/* Manual URL input as alternative */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Or enter image/GIF URL manually
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/banner-design.jpg"
                />
              </div>
            </div>

            {/* CTA Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CTA Button Text *
              </label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Get 20% Off 🎉"
                maxLength={50}
                required
              />
            </div>

            {/* CTA Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CTA Destination *
              </label>
              <select
                value={formData.ctaDestination}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  ctaDestination: e.target.value as CreatePromoBannerData['ctaDestination'],
                  externalUrl: e.target.value !== 'External' ? '' : prev.externalUrl
                }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {ctaDestinations.map(dest => (
                  <option key={dest.value} value={dest.value}>
                    {dest.label}
                  </option>
                ))}
              </select>
            </div>

            {/* External URL (only if CTA destination is External) */}
            {formData.ctaDestination === 'External' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  External URL *
                </label>
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com"
                  required
                />
              </div>
            )}

            {/* CTA Parameters (for MealPlanDetail) */}
            {formData.ctaDestination === 'MealPlanDetail' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meal Plan ID
                </label>
                <input
                  type="text"
                  value={(formData.ctaParams as { planId?: string })?.planId || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    ctaParams: { ...(prev.ctaParams || {}), planId: e.target.value }
                  }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="MP001"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as CreatePromoBannerData['targetAudience'] }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {targetAudiences.map(audience => (
                    <option key={audience.value} value={audience.value}>
                      {audience.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Banner is active
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Banner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateBannerModal