import React from 'react'
import { PromoBanner } from '../services/promoBannersApi'

interface BannerPreviewProps {
  banner: PromoBanner
  onPublishToggle: (bannerId: string) => void
  onEdit: (banner: PromoBanner) => void
  onDelete: (bannerId: string) => void
}

const BannerPreview: React.FC<BannerPreviewProps> = ({
  banner,
  onPublishToggle,
  onEdit,
  onDelete
}) => {
  const getStatusColor = (banner: PromoBanner) => {
    if (!banner.isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'

    const now = new Date()
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  }

  const getStatusText = (banner: PromoBanner) => {
    if (!banner.isActive) return 'Inactive'

    const now = new Date()
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'Scheduled'
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'Expired'
    }
    return 'Active'
  }

  return (
    <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
      {/* Banner ID and Status Header */}
      <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
              {banner.bannerId}
            </h3>
            <p className="text-sm text-gray-600 dark:text-neutral-300 mt-1">
              {banner.title}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(banner)}`}>
              {getStatusText(banner)}
            </span>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                banner.isPublished 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
              }`}>
                {banner.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App Preview */}
      <div className="p-6 bg-gray-50/90 dark:bg-neutral-900/90">
        <div className="max-w-sm mx-auto">
          <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3 text-center">
            Mobile App Preview
          </p>
          
          {/* Banner Container - Mimics Mobile Style */}
          <div className="relative rounded-lg overflow-hidden" style={{ height: '140px' }}>
            {/* Banner Image */}
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/375x140/4ECDC4/FFFFFF?text=Banner+Image';
              }}
            />
            
            {/* CTA Button Overlay - Positioned like mobile app */}
            <div className="absolute bottom-3 right-3">
              <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                <span className="text-black text-xs font-semibold">
                  {banner.ctaText}
                </span>
                <i className="fi fi-sr-angle-right text-black text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics and Details */}
      <div className="p-4 bg-gray-50/90 dark:bg-neutral-900/90 border-t border-gray-200 dark:border-neutral-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
              {banner.impressions?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-neutral-400">Impressions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
              {banner.clicks?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-neutral-400">Clicks</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {banner.ctr || 0}%
            </div>
            <div className="text-xs text-gray-500 dark:text-neutral-400">CTR</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(banner)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="Edit banner details"
            >
              <i className="fi fi-sr-pencil mr-1"></i>
              Edit
            </button>
            <button
              onClick={() => onDelete(banner._id)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="Delete banner permanently"
            >
              <i className="fi fi-sr-trash mr-1"></i>
              Delete
            </button>
          </div>
          
          <button
            onClick={() => onPublishToggle(banner._id)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              banner.isPublished
                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-900/50'
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
            }`}
            title={banner.isPublished ? 'Click to unpublish' : 'Click to publish'}
          >
            {banner.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Additional Details */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 dark:text-neutral-400 space-y-1">
          <div>Destination: {banner.ctaDestination}</div>
          <div>Target: {banner.targetAudience.replace('_', ' ')}</div>
          <div>Priority: {banner.priority}</div>
          {banner.startDate && (
            <div>Starts: {new Date(banner.startDate).toLocaleDateString()}</div>
          )}
          {banner.endDate && (
            <div>Ends: {new Date(banner.endDate).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BannerPreview