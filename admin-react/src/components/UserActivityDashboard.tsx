import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { UserPlusIcon, ShoppingCartIcon, BellAlertIcon } from '@heroicons/react/24/outline';

type UserActivityItem =
    | {
        type: 'new_user';
        data: {
            _id: string;
            fullName: string;
            email: string;
        };
    }
    | {
        type: 'new_order';
        data: {
            _id: string;
            orderNumber: string;
            totalAmount: number;
            customer: {
                fullName: string;
            };
        };
    }
    | {
        type: 'new_subscription';
        data: {
            _id: string;
            userId: {
                fullName: string;
            };
            mealPlanId: {
                planName: string;
            };
        };
    };

const UserActivityDashboard: React.FC = () => {
    const [activity, setActivity] = useState<UserActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const data = await dashboardApi.getUserActivityForDashboard();
                setActivity(data as UserActivityItem[]);
            } catch (err) {
                setError('Failed to fetch user activity.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    const renderActivityItem = (item: UserActivityItem) => {
        switch (item.type) {
            case 'new_user':
                return (
                    <li key={item.data._id} className="flex items-start space-x-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-choma-orange/5 rounded-lg transition-colors duration-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                            <UserPlusIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-choma-white">New User Registration</div>
                            <div className="text-sm text-gray-600 dark:text-choma-white/70 mt-1">
                                <span className="font-medium">{item.data.fullName || 'Unknown User'}</span> ({item.data.email || 'No email'}) joined the platform.
                            </div>
                        </div>
                    </li>
                );
            case 'new_order':
                return (
                    <li key={item.data._id} className="flex items-start space-x-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-choma-orange/5 rounded-lg transition-colors duration-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                            <ShoppingCartIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-choma-white">New Order</div>
                            <div className="text-sm text-gray-600 dark:text-choma-white/70 mt-1">
                                Order <span className="font-medium">#{item.data.orderNumber || 'Unknown'}</span> for{' '}
                                <span className="font-medium text-green-600 dark:text-green-400">₦{item.data.totalAmount?.toLocaleString() || 0}</span>{' '}
                                by {item.data.customer?.fullName || 'Unknown Customer'}.
                            </div>
                        </div>
                    </li>
                );
            case 'new_subscription':
                return (
                    <li key={item.data._id} className="flex items-start space-x-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-choma-orange/5 rounded-lg transition-colors duration-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center">
                            <BellAlertIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-choma-white">New Subscription</div>
                            <div className="text-sm text-gray-600 dark:text-choma-white/70 mt-1">
                                <span className="font-medium">{item.data.userId?.fullName || 'Unknown User'}</span> subscribed to{' '}
                                <span className="font-medium text-purple-600 dark:text-purple-400">{item.data.mealPlanId?.planName || 'Unknown Meal Plan'}</span>.
                            </div>
                        </div>
                    </li>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-choma-dark-card p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20">
                <div className="flex items-center justify-center h-32">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-choma-orange"></div>
                        <span className="text-gray-600 dark:text-choma-white/70">Loading activity...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-choma-dark-card p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20">
                <div className="text-center py-4">
                    <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-choma-dark-card p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-choma-white">Recent Activity</h3>
                <div className="text-xs text-gray-500 dark:text-choma-white/60">
                    Live updates
                </div>
            </div>

            {activity.length === 0 ? (
                <div className="text-center py-8">
                    <BellAlertIcon className="w-8 h-8 text-gray-400 dark:text-choma-white/40 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-choma-white/60">No recent activity</p>
                </div>
            ) : (
                <ul className="space-y-1">
                    {activity.map(renderActivityItem)}
                </ul>
            )}
        </div>
    );
};

export default UserActivityDashboard;
