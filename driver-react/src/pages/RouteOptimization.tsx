import React, { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { WeeklyScheduleResponse, RouteOptimization as RouteOptimizationType } from '../types';
import {
  MapPinIcon,
  ClockIcon,
  LightBulbIcon,
  ArrowPathIcon,
  TruckIcon,
  StarIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

const RouteOptimization: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<WeeklyScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  const fetchRouteOptimizations = async (startDate?: Date) => {
    try {
      setError(null);
      const dateString = startDate ? startDate.toISOString() : undefined;
      const data = await subscriptionService.getWeeklySchedule(dateString);
      setScheduleData(data);
      
      // Set default selected date to today or first day with deliveries
      if (!selectedDate) {
        const today = new Date().toISOString().split('T')[0];
        const todayHasDeliveries = data.weeklySchedule.some(day => 
          day.date === today && day.deliveries.length > 0
        );
        
        if (todayHasDeliveries) {
          setSelectedDate(today);
        } else {
          const firstDayWithDeliveries = data.weeklySchedule.find(day => day.deliveries.length > 0);
          if (firstDayWithDeliveries) {
            setSelectedDate(firstDayWithDeliveries.date);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching route optimizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteOptimizations(currentWeekStart);
  }, [currentWeekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
    setSelectedDate(''); // Reset selected date when changing weeks
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAreaDeliveries = (date: string) => {
    if (!scheduleData) return [];
    
    const dayData = scheduleData.weeklySchedule.find(day => day.date === date);
    if (!dayData) return [];

    // Group deliveries by area
    const areaGroups = new Map();
    dayData.deliveries.forEach(delivery => {
      const area = delivery.deliveryLocation.area;
      if (!areaGroups.has(area)) {
        areaGroups.set(area, []);
      }
      areaGroups.get(area).push(delivery);
    });

    // Convert to array with optimization data
    return Array.from(areaGroups.entries()).map(([area, deliveries]) => ({
      area,
      deliveries,
      count: deliveries.length,
      totalEarnings: deliveries.reduce((sum: number, d: any) => sum + d.totalEarning, 0),
      totalDistance: deliveries.reduce((sum: number, d: any) => sum + d.totalDistance, 0),
      estimatedTimeSaving: deliveries.length >= 2 ? Math.round(deliveries.length * 15 * 0.2) : 0, // 20% time saving for grouped deliveries
      subscriptionCount: deliveries.filter((d: any) => d.subscriptionInfo).length
    })).sort((a, b) => b.count - a.count);
  };

  if (loading) {
    return (
      <div className="choma-card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin p-4 bg-choma-orange/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MapPinIcon className="h-8 w-8 text-choma-orange" />
            </div>
            <div className="text-lg text-gray-600 font-medium">Loading route optimizations...</div>
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
            <MapPinIcon className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-red-800 font-semibold text-lg mb-2">Error loading route data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchRouteOptimizations(currentWeekStart)}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { weeklySchedule, routeOptimizations } = scheduleData || { weeklySchedule: [], routeOptimizations: [] };
  const selectedDayData = weeklySchedule.find(day => day.date === selectedDate);
  const areaDeliveries = getAreaDeliveries(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <MapPinIcon className="h-8 w-8 text-choma-orange" />
              <span>Route Optimization</span>
            </h1>
            <p className="text-gray-600 mt-2">Plan efficient routes for your subscription deliveries</p>
          </div>
          <button
            onClick={() => fetchRouteOptimizations(currentWeekStart)}
            className="px-6 py-3 bg-choma-brown text-choma-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-choma-orange/25 transition-all duration-300 transform hover:scale-105"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            Refresh
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
              Week of {new Date(currentWeekStart).toLocaleDateString('en-NG', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {routeOptimizations.length} optimization opportunities found
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

      {/* Day Selector */}
      <div className="choma-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Day to Optimize</h3>
        <div className="grid grid-cols-7 gap-2">
          {weeklySchedule.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            const hasDeliveries = day.deliveries.length > 0;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`p-4 rounded-xl text-center transition-all duration-300 transform hover:scale-105 ${
                  isSelected
                    ? 'bg-choma-brown text-choma-white shadow-lg'
                    : hasDeliveries
                    ? 'bg-choma-orange/10 hover:bg-choma-orange/20 text-choma-brown'
                    : 'bg-gray-100 text-gray-500'
                }`}
                disabled={!hasDeliveries}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-choma-orange' : ''}`}>
                  {day.dayName.slice(0, 3)}
                </div>
                <div className="text-lg font-bold">
                  {new Date(day.date).getDate()}
                </div>
                <div className="text-xs mt-1">
                  {day.deliveries.length} deliveries
                </div>
                {isToday && (
                  <div className="text-xs font-bold text-choma-orange mt-1">TODAY</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Route Optimization Results */}
      {selectedDayData && (
        <div className="choma-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <LightBulbIcon className="h-6 w-6 text-choma-orange" />
              <span>
                {selectedDayData.dayName} Route Optimization
              </span>
            </h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-choma-brown">{selectedDayData.deliveries.length}</div>
              <div className="text-sm text-gray-600">Total Deliveries</div>
            </div>
          </div>

          {areaDeliveries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TruckIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">No deliveries scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-4">
              {areaDeliveries.map((areaGroup, index) => (
                <div
                  key={areaGroup.area}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    areaGroup.count >= 3
                      ? 'border-choma-orange bg-gradient-to-r from-choma-orange/10 to-choma-brown/5'
                      : areaGroup.count >= 2
                      ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        areaGroup.count >= 3
                          ? 'bg-choma-orange text-white'
                          : areaGroup.count >= 2
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-400 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{areaGroup.area}</h4>
                        <p className="text-sm text-gray-600">
                          {areaGroup.count} deliveries • {areaGroup.subscriptionCount} subscription
                        </p>
                      </div>
                    </div>

                    {areaGroup.estimatedTimeSaving > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-choma-orange">
                          Save {areaGroup.estimatedTimeSaving} min
                        </div>
                        <div className="text-sm text-gray-600">Route optimization</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg font-semibold text-green-600">
                        {formatCurrency(areaGroup.totalEarnings)}
                      </div>
                      <div className="text-xs text-gray-600">Total Earnings</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">
                        {areaGroup.totalDistance.toFixed(1)} km
                      </div>
                      <div className="text-xs text-gray-600">Total Distance</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg font-semibold text-purple-600">
                        {Math.round(areaGroup.totalDistance / areaGroup.count * 10) / 10} km
                      </div>
                      <div className="text-xs text-gray-600">Avg per delivery</div>
                    </div>
                  </div>

                  {areaGroup.count >= 2 && (
                    <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                      areaGroup.count >= 3
                        ? 'bg-choma-orange/20 text-choma-brown'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      <StarIcon className="h-5 w-5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Optimization Tip:</strong> {
                          areaGroup.count >= 3
                            ? `Excellent batching opportunity! Group these ${areaGroup.count} deliveries together for maximum efficiency.`
                            : 'Good opportunity to batch these deliveries together and save travel time.'
                        }
                      </div>
                    </div>
                  )}

                  {/* Delivery Details */}
                  <div className="mt-4 space-y-2">
                    <h5 className="font-medium text-gray-900 text-sm">Deliveries in this area:</h5>
                    {areaGroup.deliveries.slice(0, 5).map((delivery: any) => (
                      <div key={delivery._id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            delivery.subscriptionInfo ? 'bg-purple-500' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium">{delivery.pickupLocation.chefName}</span>
                          <span className="text-gray-500">→</span>
                          <span>{delivery.deliveryLocation.address.substring(0, 30)}...</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(delivery.totalEarning)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(delivery.estimatedDeliveryTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {areaGroup.deliveries.length > 5 && (
                      <div className="text-center text-sm text-gray-500">
                        +{areaGroup.deliveries.length - 5} more deliveries
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Optimization Summary */}
      {routeOptimizations.length > 0 && (
        <div className="choma-card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Weekly Optimization Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routeOptimizations.slice(0, 6).map((optimization: RouteOptimizationType, index: number) => (
              <div key={index} className="p-4 bg-gradient-to-r from-choma-orange/5 to-choma-brown/5 rounded-xl border border-choma-orange/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{optimization.area}</h4>
                  <span className="text-sm text-gray-600">
                    {new Date(optimization.date).toLocaleDateString('en-NG', { weekday: 'short' })}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {optimization.deliveries.length} deliveries
                </div>
                <div className="text-lg font-semibold text-choma-orange">
                  Save {optimization.estimatedTimeSaving} min
                </div>
              </div>
            ))}
          </div>

          {routeOptimizations.length > 6 && (
            <div className="text-center mt-4">
              <p className="text-gray-600">+{routeOptimizations.length - 6} more optimization opportunities this week</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteOptimization;