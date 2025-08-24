import React from 'react';
import { MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import DeliveryPriceTab from '../components/DeliveryPriceTab';

const DeliveryPricePage: React.FC = () => {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                        <MapPinIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">Delivery Management</h1>
                        <p className="text-gray-600 dark:text-neutral-400 mt-1">Configure delivery zones and pricing across different locations</p>
                    </div>
                </div>
                
                {/* Quick Stats */}
                <div className="hidden lg:flex items-center gap-6">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                            <CurrencyDollarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">₦1,200</div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-neutral-400">Avg. Delivery Price</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
                <DeliveryPriceTab />
            </div>
        </div>
    );
}

export default DeliveryPricePage;
