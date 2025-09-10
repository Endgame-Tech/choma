import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { WeeklyScheduleResponse, WeeklyDeliverySchedule, RouteOptimization } from '../types';
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LightBulbIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const SubscriptionSchedule: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<WeeklyScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [refreshing, setRefreshing] = useState(false);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  const fetchWeeklySchedule = async (startDate?: Date) => {
    try {
      setError(null);
      const dateString = startDate ? startDate.toISOString() : undefined;
      const data = await subscriptionService.getWeeklySchedule(dateString);
      setScheduleData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching weekly schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeeklySchedule(currentWeekStart);
  }, [currentWeekStart]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWeeklySchedule(currentWeekStart);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  if (loading) {
    return (
      <div className="choma-card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin p-4 bg-choma-orange/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <CalendarDaysIcon className="h-8 w-8 text-choma-orange" />
            </div>
            <div className="text-lg text-gray-600 font-medium">Loading weekly schedule...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="choma-card p-6">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CalendarDaysIcon className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-red-800 font-semibold text-lg mb-2">Error loading schedule</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { weeklySchedule, routeOptimizations, statistics } = scheduleData || { 
    weeklySchedule: [], 
    routeOptimizations: [], 
    statistics: {
      totalDeliveries: 0,
      subscriptionDeliveries: 0,
      oneTimeDeliveries: 0,
      uniqueCustomers: 0,
      routeOptimizations: 0,
      totalDistance: 0,
      totalEarnings: 0
    }
  };

  const weekStartFormatted = new Date(currentWeekStart).toLocaleDateString('en-NG', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const weekEndFormatted = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG', {
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <CalendarDaysIcon className="h-8 w-8 text-choma-orange" />
              <span>Weekly Schedule</span>
            </h1>
            <p className="text-gray-600 mt-2">Plan your recurring deliveries and optimize your routes</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-choma-brown text-choma-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-choma-orange/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span>Previous Week</span>
          </button>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {weekStartFormatted} - {weekEndFormatted}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {statistics.totalDeliveries} deliveries • {formatCurrency(statistics.totalEarnings)} earnings
            </p>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
          >
            <span>Next Week</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Weekly Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="choma-card p-4 text-center bg-gradient-to-br from-choma-orange/10 to-choma-brown/5">
          <TruckIcon className="h-6 w-6 text-choma-orange mx-auto mb-2" />
          <div className="text-2xl font-bold text-choma-brown">{statistics.totalDeliveries}</div>
          <div className="text-xs text-gray-600">Total Deliveries</div>
        </div>
        
        <div className="choma-card p-4 text-center bg-gradient-to-br from-purple-50 to-indigo-50">
          <UserIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{statistics.subscriptionDeliveries}</div>
          <div className="text-xs text-gray-600">Subscription</div>
        </div>

        <div className="choma-card p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50">
          <CurrencyDollarIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalEarnings)}</div>
          <div className="text-xs text-gray-600">Total Earnings</div>
        </div>

        <div className="choma-card p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50">
          <MapPinIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{statistics.totalDistance.toFixed(1)}</div>
          <div className="text-xs text-gray-600">km Distance</div>
        </div>

        <div className="choma-card p-4 text-center bg-gradient-to-br from-yellow-50 to-amber-50">
          <LightBulbIcon className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{statistics.routeOptimizations}</div>
          <div className="text-xs text-gray-600">Route Opportunities</div>
        </div>
      </div>

      {/* Route Optimizations */}
      {routeOptimizations.length > 0 && (
        <div className="choma-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <LightBulbIcon className="h-6 w-6 text-choma-orange" />
            <h3 className="text-xl font-semibold text-gray-900">Route Optimization Opportunities</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routeOptimizations.map((optimization: RouteOptimization, index: number) => (
              <div key={index} className="bg-gradient-to-r from-choma-orange/10 to-choma-brown/5 rounded-xl p-4 border border-choma-orange/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{optimization.area}</h4>
                  <span className="text-sm text-gray-600">{formatDate(optimization.date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {optimization.deliveries.length} deliveries
                  </span>
                  <span className="font-semibold text-choma-orange">
                    Save {optimization.estimatedTimeSaving} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Schedule */}
      <div className="choma-card">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">Daily Breakdown</h3>
          <p className="text-gray-600 mt-1">Your delivery schedule for each day</p>
        </div>

        <div className="divide-y divide-gray-100">
          {weeklySchedule.map((day: WeeklyDeliverySchedule) => (
            <div key={day.date} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isToday(day.date) ? 'bg-choma-orange' : 'bg-gray-300'}`} />
                  <h4 className={`text-lg font-semibold ${isToday(day.date) ? 'text-choma-orange' : 'text-gray-900'}`}>
                    {day.dayName}
                  </h4>
                  {isToday(day.date) && (
                    <span className="px-2 py-1 bg-choma-orange text-white text-xs font-bold rounded-full">
                      TODAY
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{day.deliveries.length} deliveries</div>
                  <div className="text-sm text-gray-600">
                    {day.subscriptionDeliveries} subscription • {day.oneTimeDeliveries} one-time
                  </div>
                </div>
              </div>

              {day.deliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No deliveries scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {day.deliveries.map((delivery) => (
                    <Link
                      key={delivery._id}
                      to={`/deliveries/${delivery._id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gradient-to-r hover:from-choma-orange/5 hover:to-choma-brown/5 rounded-lg transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                          delivery.subscriptionInfo ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900">
                            {delivery.deliveryLocation.area}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatTime(delivery.estimatedDeliveryTime)} • {delivery.pickupLocation.chefName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(delivery.totalEarning)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {delivery.totalDistance.toFixed(1)} km
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSchedule;