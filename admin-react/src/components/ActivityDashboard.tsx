import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  UserIcon, 
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { ActivityLog, ActivityFilters, SecurityAlert } from '../types/activity';
import { activityLogger } from '../services/activityLogger';
import { usePermissions } from '../contexts/PermissionContext';

interface ActivityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ActivityDashboard: React.FC<ActivityDashboardProps> = ({ isOpen, onClose }) => {
  const { hasPermission, currentAdmin } = usePermissions();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>({ page: 1, limit: 10 });
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'activities' | 'alerts'>('activities');

  // Check if user can view activity logs
  const canViewLogs = hasPermission('adminManagement', 'view_activity_logs') || currentAdmin?.isAlphaAdmin;

  useEffect(() => {
    if (isOpen && canViewLogs) {
      loadData();
    }
  }, [isOpen, filters, canViewLogs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activityData, alertsData] = await Promise.all([
        activityLogger.getActivityLogs(filters),
        activityLogger.getSecurityAlerts(false), // Unresolved alerts
      ]);

      setActivities(activityData.activities);
      setTotalPages(activityData.totalPages);
      setSecurityAlerts(alertsData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ActivityFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset to page 1 when changing other filters
    }));
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!currentAdmin) return;
    
    try {
      await activityLogger.resolveSecurityAlert(alertId, currentAdmin._id);
      setSecurityAlerts(prev => prev.filter(alert => alert._id !== alertId));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;
  if (!canViewLogs) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-choma-dark rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don't have permission to view activity logs.
            </p>
            <button
              onClick={onClose}
              className="bg-choma-orange text-white px-4 py-2 rounded-lg hover:bg-choma-orange/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <ClockIcon className="w-6 h-6 text-choma-orange" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Activity Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'activities'
                ? 'border-b-2 border-choma-orange text-choma-orange'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === 'alerts'
                ? 'border-b-2 border-choma-orange text-choma-orange'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Security Alerts
            {securityAlerts && securityAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {securityAlerts.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'activities' ? (
            <div>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Module
                  </label>
                  <select
                    value={filters.module || ''}
                    onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white"
                  >
                    <option value="">All Modules</option>
                    <option value="auth">Authentication</option>
                    <option value="admin">Admin Management</option>
                    <option value="meals">Meals</option>
                    <option value="meal_plans">Meal Plans</option>
                    <option value="orders">Orders</option>
                    <option value="chefs">Chefs</option>
                    <option value="users">Users</option>
                    <option value="customers">Customers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={filters.severity || ''}
                    onChange={(e) => handleFilterChange('severity', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white"
                  >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.successful !== undefined ? filters.successful.toString() : ''}
                    onChange={(e) => handleFilterChange('successful', e.target.value === '' ? undefined : e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="true">Successful</option>
                    <option value="false">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Items per page
                  </label>
                  <select
                    value={filters.limit || 10}
                    onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Activity List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-choma-orange mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Loading activities...</p>
                </div>
              ) : !activities || activities.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No activities found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities?.map((activity) => (
                    <div
                      key={activity._id}
                      className="bg-gray-50 dark:bg-choma-black/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <UserIcon className="w-5 h-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {activity.adminName}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(activity.severity)}`}>
                              {activity.severity.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              activity.successful
                                ? 'text-green-700 bg-green-100 dark:bg-green-900/20'
                                : 'text-red-700 bg-red-100 dark:bg-red-900/20'
                            }`}>
                              {activity.successful ? 'SUCCESS' : 'FAILED'}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <span className="font-medium">{activity.action}</span> in{' '}
                            <span className="font-medium">{activity.module}</span>
                          </p>
                          
                          {activity.errorMessage && (
                            <p className="text-red-600 dark:text-red-400 text-sm mb-2">
                              Error: {activity.errorMessage}
                            </p>
                          )}
                          
                          {Object.keys(activity.details).length > 0 && (
                            <details className="text-sm text-gray-600 dark:text-gray-400">
                              <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                View Details
                              </summary>
                              <pre className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(activity.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        
                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                          <p>{formatTimestamp(activity.timestamp)}</p>
                          {activity.ipAddress && (
                            <p className="text-xs">IP: {activity.ipAddress}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Page {filters.page || 1} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                      disabled={filters.page === 1}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-choma-black border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', Math.min(totalPages, (filters.page || 1) + 1))}
                      disabled={filters.page === totalPages}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-choma-black border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Security Alerts */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-choma-orange mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Loading alerts...</p>
                </div>
              ) : !securityAlerts || securityAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No active security alerts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityAlerts?.map((alert) => (
                    <div
                      key={alert._id}
                      className={`rounded-lg p-4 border-l-4 ${
                        alert.severity === 'critical'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                          : alert.severity === 'high'
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {alert.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            {alert.description}
                          </p>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Admin: {alert.adminName} • {formatTimestamp(alert.timestamp)}
                          </p>
                          
                          {Object.keys(alert.metadata).length > 0 && (
                            <details className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                View Metadata
                              </summary>
                              <pre className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(alert.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleResolveAlert(alert._id)}
                          className="ml-4 px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDashboard;