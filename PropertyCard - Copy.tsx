import React from 'react';
import { Link } from 'react-router-dom';
import { Property, PropertyImage } from '../types';
import {
    FiArrowRight,
    FiCheck,
    FiX,
    FiHome,
    FiDroplet,
    FiSquare,
    FiClock,
    FiDollarSign
} from 'react-icons/fi';

interface PropertyCardProps {
    property: Property;
    onApprove?: (propertyId: string) => void;
    onReject?: (propertyId: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onApprove, onReject }) => {
    const imageUrl = (() => {
        if (property.images && property.images.length > 0) {
            return Array.isArray(property.images) && typeof property.images[0] === 'string'
                ? property.images[0]
                : (property.images[0] as PropertyImage)?.url;
        }
        // Default aerial view image similar to the design
        return 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?auto=format&fit=crop&w=1000&q=80';
    })();

    const formatShortCurrency = (amount: number) => {
        if (amount >= 1_000_000_000) return `N${(amount / 1_000_000_000).toFixed(1)}B`;
        if (amount >= 1_000_000) return `N${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `N${(amount / 1_000).toFixed(1)}K`;
        return `N${amount}`;
    };

    return (
        <div className="group relative bg-white rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 w-full max-w-[320px] mx-auto overflow-hidden">
            {/* Main Property Image - with proper padding */}
            <div className="relative w-full h-[180px] p-[8px]">
                <img
                    src={imageUrl}
                    alt={property.title || 'Property'}
                    className="w-full h-full object-cover rounded-[12px]"
                />

                {/* Admin Actions - Show on hover */}
                {(onApprove || onReject) && (
                    <div className="absolute top-[16px] right-[16px] flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {onApprove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onApprove(property._id); }}
                                className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-green-600 hover:text-green-800 hover:bg-green-50 shadow-md"
                                title="Approve"
                            >
                                <FiCheck className="w-4 h-4" />
                            </button>
                        )}
                        {onReject && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject(property._id); }}
                                className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-red-600 hover:text-red-800 hover:bg-red-50 shadow-md"
                                title="Reject"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="px-[16px] pb-[20px]">
                {/* Property Type */}
                <div className="mb-2">
                    <h3 className="text-[14px] font-medium text-gray-700">
                        {(property.type?.charAt(0).toUpperCase() + property.type?.slice(1)) || 'Flat'} - Estate
                    </h3>
                </div>

                {/* Price Section with Arrow Button */}
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[32px] font-bold text-gray-900 leading-[1]">
                        {formatShortCurrency(property.rent?.amount || 7500000)}
                    </div>
                    {/* Green Arrow Button - Positioned next to price like in the image */}
                    <Link
                        to={`/admin/properties/${property._id}`}
                        className="w-[40px] h-[40px] rounded-full bg-lime-400 hover:bg-lime-500 flex items-center justify-center text-gray-900 transition-all duration-200 shadow-lg"
                        title="View Details"
                    >
                        <FiArrowRight className="w-4 h-4 ml-0.5" />
                    </Link>
                </div>

                {/* Address */}
                <div className="mb-4">
                    <p className="text-[12px] text-gray-600 leading-[1.2]">
                        {property.address || `${property.location?.city || '123 Main St'}, ${property.location?.state || 'Anytown, CA'}`}
                    </p>
                </div>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-[6px] mb-4">
                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 rounded-full">
                        <FiHome className="w-[12px] h-[12px] text-gray-600" />
                        <span className="text-[10px] font-medium text-gray-700">
                            {property.bedrooms || 3} Bedroom
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 rounded-full">
                        <FiDroplet className="w-[12px] h-[12px] text-gray-600" />
                        <span className="text-[10px] font-medium text-gray-700">
                            {property.bathrooms || 2} Bathrooms
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 rounded-full">
                        <FiSquare className="w-[12px] h-[12px] text-gray-600" />
                        <span className="text-[10px] font-medium text-gray-700">
                            {property.area || '5x7'} m²
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 rounded-full">
                        <FiClock className="w-[12px] h-[12px] text-gray-600" />
                        <span className="text-[10px] font-medium text-gray-700">
                            Shortlet
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 rounded-full">
                        <FiDollarSign className="w-[12px] h-[12px] text-gray-600" />
                        <span className="text-[10px] font-medium text-gray-700">
                            Fully Furnished
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-gray-200 mb-4"></div>

                {/* Bottom Expiry Sections */}
                <div className="flex items-center justify-between">
                    {/* First Expiry Section */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">⚡</span>
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 leading-tight">Expires in</p>
                            <p className="text-[8px] font-medium text-gray-900 leading-tight">3 Months</p>
                        </div>
                    </div>

                    {/* Second Expiry Section */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">⚡</span>
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 leading-tight">Expires in</p>
                            <p className="text-[8px] font-medium text-gray-900 leading-tight">3 Months</p>
                        </div>
                    </div>

                    {/* Third Expiry Section */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">⚡</span>
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 leading-tight">Expires in</p>
                            <p className="text-[8px] font-medium text-gray-900 leading-tight">3 Months</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;
