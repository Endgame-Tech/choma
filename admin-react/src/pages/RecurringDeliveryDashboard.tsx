import React, { useState } from 'react';
import ChefWorkloadDashboard from '../components/recurring-delivery/ChefWorkloadDashboard';
import DeliveryMonitoringDashboard from '../components/recurring-delivery/DeliveryMonitoringDashboard';
import SubscriptionAnalyticsDashboard from '../components/recurring-delivery/SubscriptionAnalyticsDashboard';

type ActiveTab = 'analytics' | 'monitoring' | 'chefs';

const RecurringDeliveryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics');

  const tabs = [
    {
      id: 'analytics' as const,
      name: 'Analytics',
      icon: 'fi fi-sr-chart-line',
      description: 'Subscription metrics and trends'
    },
    {
      id: 'monitoring' as const,
      name: 'Live Monitoring',
      icon: 'fi fi-sr-eye',
      description: 'Real-time delivery tracking'
    },
    {
      id: 'chefs' as const,
      name: 'Chef Management',
      icon: 'fi fi-sr-users',
      description: 'Chef workload and assignments'
    }
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'analytics':
        return <SubscriptionAnalyticsDashboard />;
      case 'monitoring':
        return <DeliveryMonitoringDashboard />;
      case 'chefs':
        return <ChefWorkloadDashboard />;
      default:
        return <SubscriptionAnalyticsDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
              Recurring Delivery Management
            </h1>
            <p className="text-gray-600 dark:text-neutral-200 mt-2">
              Comprehensive management of subscription-based meal deliveries
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-neutral-100">🔄</div>
              <div className="text-gray-600 dark:text-neutral-200">Active System</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">✅</div>
              <div className="text-gray-600 dark:text-neutral-200">All Services</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-neutral-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <i className={`${tab.icon} mr-2 text-lg`}></i>
              <div className="text-left">
                <div className="font-medium">{tab.name}</div>
                <div className="text-xs text-gray-400 dark:text-neutral-500">
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {renderActiveComponent()}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-3">
          System Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-neutral-200">
              Meal Progression Service
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-neutral-200">
              Chef Assignment System
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-neutral-200">
              Delivery Tracking
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-neutral-200">
              Analytics Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringDeliveryDashboard;