import React from 'react';
import { type MealPlan } from '../services/mealApi';
import {
    FiEdit,
    FiTrash2,
    FiCalendar,
    FiUsers,
    FiClock,
    FiDollarSign,
    FiEyeOff,
    FiGlobe
} from 'react-icons/fi';

interface MealPlanCardProps {
    mealPlan: MealPlan;
    onEdit?: (mealPlan: MealPlan) => void;
    onDelete?: (id: string) => void;
    onSchedule?: (mealPlan: MealPlan) => void;
    onTogglePublish?: (mealPlan: MealPlan) => void;
    onSelect?: (id: string) => void;
    isSelected?: boolean;
}

const MealPlanCard: React.FC<MealPlanCardProps> = ({
    mealPlan,
    onEdit,
    onDelete,
    onSchedule,
    onTogglePublish,
    onSelect,
    isSelected
}) => {
    const formatShortCurrency = (amount: number | undefined) => {
        if (!amount || amount === 0) return '₦0';
        if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
        if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
        return `₦${amount}`;
    };

    const getDurationText = (weeks: number) => {
        if (weeks === 1) return '1 week';
        if (weeks < 4) return `${weeks} weeks`;
        const months = Math.floor(weeks / 4);
        const remainingWeeks = weeks % 4;
        if (remainingWeeks === 0) return `${months} month${months > 1 ? 's' : ''}`;
        return `${months}mo ${remainingWeeks}w`;
    };

    const imageUrl = mealPlan.coverImage || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1000&q=80';

    return (
        <div className="group relative bg-white dark:bg-black/50 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 w-full max-w-[320px] mx-auto overflow-hidden">
            {/* Checkbox for selection */}
            {onSelect && (
                <div className="absolute top-[16px] left-[16px] z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(mealPlan._id)}
                        title={`Select ${mealPlan.planName}`}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                </div>
            )}

            {/* Main Plan Image - with proper padding */}
            <div className="relative w-full h-[180px] p-[8px]">
                <img
                    src={imageUrl}
                    alt={mealPlan.planName}
                    className="w-full h-full object-cover rounded-[12px]"
                />
                {/* Dark gradient overlay at bottom */}
                <div className="absolute bottom-[8px] left-[8px] right-[8px] h-[50px] bg-gradient-to-t from-black/80 to-transparent rounded-b-[12px] pointer-events-none"></div>

                {/* Admin Actions - Show on hover */}
                <div className="absolute top-[16px] right-[16px] flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(mealPlan); }}
                            className="p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-md"
                            title="Edit Meal Plan"
                        >
                            <FiEdit className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(mealPlan._id); }}
                            className="p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-md"
                            title="Delete Meal Plan"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Publication Status */}
                <div className="absolute bottom-[16px] left-[16px]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePublish?.(mealPlan);
                        }}
                        disabled={!mealPlan.isPublished && (!mealPlan.assignmentCount || mealPlan.assignmentCount === 0)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${mealPlan.isPublished
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : (!mealPlan.assignmentCount || mealPlan.assignmentCount === 0)
                                    ? 'bg-red-100 border border-white dark:bg-red-900/40 text-red-800 dark:text-red-300 opacity-75 cursor-not-allowed'
                                    : 'bg-gray-100 border border-white dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                            }`}
                        title={
                            !mealPlan.isPublished && (!mealPlan.assignmentCount || mealPlan.assignmentCount === 0)
                                ? 'Schedule meals before publishing'
                                : mealPlan.isPublished ? 'Click to unpublish' : 'Click to publish'
                        }
                    >
                        {mealPlan.isPublished ? 'Published' : (!mealPlan.assignmentCount || mealPlan.assignmentCount === 0) ? 'No Meals' : 'Draft'}
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-[16px] pb-[20px]">
                {/* Plan Category */}
                <div className="mb-2">
                    <h3 className="text-[14px] font-medium text-gray-700 dark:text-gray-300">
                        {mealPlan.targetAudience || 'Meal Plan'} - {getDurationText(mealPlan.durationWeeks)}
                    </h3>
                </div>

                {/* Price Section */}
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-[1]">
                        {formatShortCurrency(mealPlan.totalPrice)}
                    </div>
                    {/* Schedule Button */}
                    {onSchedule && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSchedule(mealPlan); }}
                            className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                            Schedule
                        </button>
                    )}
                </div>

                {/* Plan Name */}
                <div className="mb-4">
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-[1.2] font-medium">
                        {mealPlan.planName}
                    </p>
                </div>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-[6px] mb-4">
                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiCalendar className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {mealPlan.stats?.totalDays || 0} days
                        </span>
                    </div>

                    <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                        <FiUsers className="w-[12px] h-[12px] text-gray-600 dark:text-gray-400" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                            {mealPlan.assignmentCount || 0} meals
                        </span>
                    </div>

                    {mealPlan.nutritionInfo?.avgCaloriesPerDay && (
                        <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">🔥</span>
                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                                {Math.round(mealPlan.nutritionInfo.avgCaloriesPerDay)} cal/day
                            </span>
                        </div>
                    )}

                    {mealPlan.stats?.avgMealsPerDay && (
                        <div className="flex items-center gap-1 px-[8px] py-[4px] bg-gray-100 dark:bg-gray-700 rounded-full">
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">🍽️</span>
                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                                {mealPlan.stats.avgMealsPerDay} meals/day
                            </span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-gray-200 dark:bg-gray-600 mb-4"></div>

                {/* Bottom Status Sections */}
                <div className="flex items-center justify-between">
                    {/* Publication Status */}
                    <div className="flex items-center gap-2">
                        <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center ${mealPlan.isPublished
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }`}>
                            {mealPlan.isPublished ? (
                                <FiGlobe className="w-3 h-3 text-white" />
                            ) : (
                                <FiEyeOff className="w-3 h-3 text-white" />
                            )}
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Status</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {mealPlan.isPublished ? 'Live' : 'Draft'}
                            </p>
                        </div>
                    </div>

                    {/* Duration Info */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-blue-500 rounded-full flex items-center justify-center">
                            <FiClock className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Duration</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {getDurationText(mealPlan.durationWeeks)}
                            </p>
                        </div>
                    </div>

                    {/* Total Price */}
                    <div className="flex items-center gap-2">
                        <div className="w-[24px] h-[24px] bg-orange-500 rounded-full flex items-center justify-center">
                            <FiDollarSign className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">Total</p>
                            <p className="text-[8px] font-medium text-gray-900 dark:text-white leading-tight">
                                {formatShortCurrency(mealPlan.totalPrice)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MealPlanCard;