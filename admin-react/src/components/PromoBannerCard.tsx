import React from 'react';
import { PromoBanner } from '../services/promoBannersApi';

interface PromoBannerCardProps {
  banner: PromoBanner;
  onEdit: (banner: PromoBanner) => void;
  onDelete: (bannerId: string) => void;
  onToggleActive: (banner: PromoBanner) => void;
}

const PromoBannerCard: React.FC<PromoBannerCardProps> = ({ banner, onEdit, onDelete, onToggleActive }) => {
  const getStatusColor = () => {
    if (!banner.isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    const now = new Date();
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    }
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  };

  const getStatusText = () => {
    if (!banner.isActive) return 'Inactive';
    
    const now = new Date();
    if (banner.startDate && now < new Date(banner.startDate)) {
      return 'Scheduled';
    }
    if (banner.endDate && now > new Date(banner.endDate)) {
      return 'Expired';
    }
    return 'Active';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
      <div className="relative">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-40 object-cover" />
        <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{banner.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate h-10">{banner.subtitle}</p>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Priority:</span> {banner.priority}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Audience:</span> {banner.targetAudience.replace('_', ' ')}
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div><span className="font-semibold">CTA:</span> {banner.ctaText} → {banner.ctaDestination}</div>
        </div>

        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-end space-x-2">
          <button onClick={() => onEdit(banner)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>
          <button onClick={() => onToggleActive(banner)} className={banner.isActive ? "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"}>
            {banner.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => onDelete(banner._id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default PromoBannerCard;