import React, { useState, useMemo } from 'react';
import { Calendar, ChefHat, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Meal {
    _id: string;
    mealTitle: string;
    mealType: string;
    scheduledDate: string;
    scheduledTimeSlot?: {
        start: string;
        end: string;
    };
    status: string;
    ingredients?: string[];
    deliveryStatus?: string;
}

interface DailyMealManagerProps {
    subscriptionId?: string;
    meals: Meal[];
    onUpdateDailyStatus: (date: string, status: string) => Promise<void>;
    onUpdateSingleMeal?: (mealId: string, status: string) => Promise<void>;
}

const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-gray-500' },
    { value: 'chef_assigned', label: 'Assigned', color: 'bg-blue-500' },
    { value: 'preparing', label: 'Preparing', color: 'bg-yellow-500' },
    { value: 'ready', label: 'Ready', color: 'bg-green-500' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-500' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-600' },
];

const mealTypeOrder: Record<string, number> = {
    breakfast: 1,
    lunch: 2,
    dinner: 3,
};

const DailyMealManager: React.FC<DailyMealManagerProps> = ({
    meals,
    onUpdateDailyStatus,
}) => {
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({});
    const [updatingDates, setUpdatingDates] = useState<Set<string>>(new Set());

    // Group meals by date
    const mealsByDate = useMemo(() => {
        const grouped: Record<string, Meal[]> = {};

        meals.forEach((meal) => {
            if (!meal.scheduledDate) return;

            const date = new Date(meal.scheduledDate);
            if (isNaN(date.getTime())) return;

            const dateKey = date.toISOString().split('T')[0];

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }

            grouped[dateKey].push(meal);
        });

        // Sort by date
        return Object.entries(grouped)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .reduce((acc, [date, meals]) => {
                acc[date] = meals.sort((a, b) => {
                    const typeA = a.mealType?.toLowerCase() || '';
                    const typeB = b.mealType?.toLowerCase() || '';
                    const orderA = mealTypeOrder[typeA] || 4;
                    const orderB = mealTypeOrder[typeB] || 4;
                    return orderA - orderB;
                });
                return acc;
            }, {} as Record<string, Meal[]>);
    }, [meals]);

    const getMealStatusColor = (status: string) => {
        const option = statusOptions.find((opt) => opt.value === status);
        return option?.color || 'bg-gray-500';
    };

    const getMealStatusLabel = (status: string) => {
        const option = statusOptions.find((opt) => opt.value === status);
        return option?.label || status;
    };

    const isDayComplete = (dateMeals: Meal[]) => {
        return dateMeals.every((meal) => meal.status === 'delivered' || meal.deliveryStatus === 'delivered');
    };

    const getDayProgress = (dateMeals: Meal[]) => {
        const completedMeals = dateMeals.filter(
            (meal) => meal.status === 'delivered' || meal.deliveryStatus === 'delivered'
        ).length;
        return Math.round((completedMeals / dateMeals.length) * 100);
    };

    const handleStatusChange = (date: string, status: string) => {
        setSelectedStatuses((prev) => ({
            ...prev,
            [date]: status,
        }));
    };

    const handleUpdateAll = async (date: string) => {
        const status = selectedStatuses[date] || 'ready';

        setUpdatingDates((prev) => new Set(prev).add(date));

        try {
            await onUpdateDailyStatus(date, status);

            // Clear selected status after successful update
            setSelectedStatuses((prev) => {
                const newStatuses = { ...prev };
                delete newStatuses[date];
                return newStatuses;
            });
        } catch (error) {
            console.error('Failed to update daily meals:', error);
            // Error handling will be done by parent component
        } finally {
            setUpdatingDates((prev) => {
                const newSet = new Set(prev);
                newSet.delete(date);
                return newSet;
            });
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5" />
                <h3>Daily Meal Schedule</h3>
            </div>

            {Object.entries(mealsByDate).map(([date, dateMeals]) => {
                const isComplete = isDayComplete(dateMeals);
                const progress = getDayProgress(dateMeals);
                const isUpdating = updatingDates.has(date);

                return (
                    <div
                        key={date}
                        className={`border rounded-lg p-4 ${isComplete
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            }`}
                    >
                        {/* Date Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatDate(date)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {dateMeals.length} meal{dateMeals.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {isComplete && (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="text-sm font-medium">Complete</span>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {!isComplete && (
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                            role="progressbar"
                                            aria-label="Daily meal completion progress"
                                            aria-valuenow={progress}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{progress}%</span>
                                </div>
                            )}
                        </div>

                        {/* Individual Meals */}
                        <div className="space-y-3 mb-4">
                            {dateMeals.map((meal) => (
                                <div
                                    key={meal._id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <ChefHat className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {meal.mealTitle || `${meal.mealType} Meal`}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                {meal.mealType}
                                                {meal.scheduledTimeSlot && (
                                                    <span className="ml-2">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {meal.scheduledTimeSlot.start} - {meal.scheduledTimeSlot.end}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meal Status Badge */}
                                    <span
                                        className={`px-3 py-1 text-xs font-medium text-white rounded-full ${getMealStatusColor(
                                            meal.status || meal.deliveryStatus || 'scheduled'
                                        )}`}
                                    >
                                        {getMealStatusLabel(meal.status || meal.deliveryStatus || 'scheduled')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Bulk Update Controls */}
                        {!isComplete && (
                            <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <select
                                    value={selectedStatuses[date] || 'ready'}
                                    onChange={(e) => handleStatusChange(date, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    disabled={isUpdating}
                                    aria-label="Select status for all meals"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            Mark all as {option.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => handleUpdateAll(date)}
                                    disabled={isUpdating}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Update All
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {Object.keys(mealsByDate).length === 0 && (
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No meals scheduled</p>
                </div>
            )}
        </div>
    );
};

export default DailyMealManager;
