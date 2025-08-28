import React from 'react';
import { type Meal } from '../services/mealApi';
import {
    FiEdit,
    FiTrash2,
    FiClock,
    FiUsers,
    FiActivity,
    FiDollarSign,
    FiUser,
    FiPackage
} from 'react-icons/fi';

interface MealCardProps {
    meal: Meal;
    onEdit?: (meal: Meal) => void;
    onDelete?: (id: string) => void;
    onToggleAvailability?: (id: string) => void;
    onSelect?: (id: string) => void;
    isSelected?: boolean;
}

const MealCard: React.FC<MealCardProps> = ({
    meal,
    onEdit,
    onDelete,
    onToggleAvailability,
    onSelect,
    isSelected
}) => {
    // Calculate proper earnings and pricing like in the modals
    const calculateEarnings = () => {
        const ingredients = meal.pricing?.ingredients || 0;
        const cookingCosts = meal.pricing?.cookingCosts || 0;
        const packaging = meal.pricing?.packaging || 0;
        const platformFee = meal.pricing?.platformFee || 0;

        const totalCosts = ingredients + cookingCosts + packaging;
        const profit = totalCosts * 0.4; // 40% profit
        const totalPrice = totalCosts + profit + platformFee; // Recalculated total price including platform fee

        // Chef gets: ingredients + cooking cost + 50% of profit
        const chefEarnings = ingredients + cookingCosts + (profit * 0.5);

        // Choma gets: platform fee + packaging + 50% of profit
        const chomaEarnings = platformFee + packaging + (profit * 0.5);

        return {
            chefEarnings,
            chomaEarnings,
            cookingCosts,
            totalPrice
        };
    };

    const earnings = calculateEarnings();

    const formatShortCurrency = (amount: number | undefined) => {
        if (!amount || amount === 0) return '₦0';
        if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
        if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
        return `₦${amount}`;
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity) {
            case 'low': return 'bg-green-100 text-green-800';
            case 'high': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const imageUrl = meal.image || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1000&q=80';

    return (
        <div className="group relative bg-white dark:bg-black/50 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 w-full max-w-[320px] mx-auto overflow-hidden">
            {/* Checkbox for selection */}
            {onSelect && (
                <div className="absolute top-[16px] left-[16px] z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(meal._id)}
                        title={`Select ${meal.name}`}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                </div>
            )}

            {/* Main Meal Image - with proper padding */}
            <div className="relative w-full h-[180px] p-[8px]">
                <img
                    src={imageUrl}
                    alt={meal.name}
                    className="w-full h-full object-cover rounded-[12px]"
                />
                {/* Dark gradient overlay at bottom */}
                <div className="absolute bottom-[8px] left-[8px] right-[8px] h-[50px] bg-gradient-to-t from-black/80 to-transparent rounded-b-[12px] pointer-events-none"></div>

                {/* Admin Actions - Show on hover */}
                <div className="absolute top-[16px] right-[16px] flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(meal); }}
                            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 shadow-md"
                            title="Edit Meal"
                        >
                            <FiEdit className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(meal._id); }}
                            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-red-600 hover:text-red-800 hover:bg-red-50 shadow-md"
                            title="Delete Meal"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Availability Status */}
                <div className="absolute bottom-[16px] left-[16px]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleAvailability?.(meal._id);
                        }}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${meal.isAvailable
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                    >
                        {meal.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-[16px] pb-[20px]">
                {/* Meal Category */}
                <div className="mb-2">
                    <h3 className="text-[14px] font-medium text-gray-700 dark:text-gray-300">
                        {meal.category} - Nigerian Cuisine
                    </h3>
                </div>

                {/* Price Section with Complexity Badge */}
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-[1]">
                        {formatShortCurrency(earnings.totalPrice)}
                    </div>
                    {/* Complexity Level Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getComplexityColor(meal.complexityLevel)}`}>
                        {meal.complexityLevel}
                    </div>
                </div>

                {/* Meal Name */}
                <div className="mb-4">
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-[1.2] font-medium">
                        {meal.name}
                    </p>
                </div>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-[6px] mb-4">
                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiClock className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {meal.preparationTime} mins
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiActivity className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {meal.nutrition.calories} cal
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiUsers className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {meal.nutrition.weight}g
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiPackage className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {meal.nutrition.protein}g protein
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-gray-200 dark:bg-gray-600 mb-4"></div>

                {/* Bottom Revenue Sections */}
                <div className="flex items-center justify-between">
                    {/* Chef Earnings */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-green-500 rounded-full flex items-center justify-center">
                            <FiUser className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Chef Gets</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {formatShortCurrency(earnings.chefEarnings)}
                            </p>
                        </div>
                    </div>

                    {/* Choma Earnings */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-blue-500 rounded-full flex items-center justify-center">
                            <FiDollarSign className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Choma Gets</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {formatShortCurrency(earnings.chomaEarnings)}
                            </p>
                        </div>
                    </div>

                    {/* Cooking Cost */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">🔥</span>
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Cook Cost</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {formatShortCurrency(earnings.cookingCosts)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MealCard;