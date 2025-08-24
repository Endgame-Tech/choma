import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
// Removed MUI imports
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
                    <li key={item.data._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ marginRight: 12 }}><UserPlusIcon className="h-6 w-6" /></span>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>New User Registration</div>
                            <div style={{ color: '#555' }}>{item.data.fullName} ({item.data.email}) registered.</div>
                        </div>
                    </li>
                );
            case 'new_order':
                return (
                    <li key={item.data._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ marginRight: 12 }}><ShoppingCartIcon className="h-6 w-6" /></span>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>New Order</div>
                            <div style={{ color: '#555' }}>Order #{item.data.orderNumber} for ₦{item.data.totalAmount} by {item.data.customer.fullName}.</div>
                        </div>
                    </li>
                );
            case 'new_subscription':
                return (
                    <li key={item.data._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ marginRight: 12 }}><BellAlertIcon className="h-6 w-6" /></span>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>New Subscription</div>
                            <div style={{ color: '#555' }}>{item.data.userId.fullName} subscribed to {item.data.mealPlanId.planName}.</div>
                        </div>
                    </li>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>;
    }

    return (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Recent Activity</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activity.map(renderActivityItem)}
            </ul>
        </div>
    );
};

export default UserActivityDashboard;
