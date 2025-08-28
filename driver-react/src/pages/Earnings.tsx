import React, { useState, useEffect } from 'react';
import { driverApi } from '../services/api';
import { DailyStats } from '../types';
import {
  CurrencyDollarIcon,
  TruckIcon,
  MapPinIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// PeriodData is a normalized shape used for daily/weekly/monthly views.
type PeriodData = {
  // aggregate shape used by weekly/monthly
  totalEarnings?: number;
  totalDeliveries?: number;
  totalDistance?: number;
  averageEarningsPerDelivery?: number;
  // original daily fields that may exist on DailyStats
  earnings?: number;
  distance?: number;
  completedDeliveries?: number;
};

interface EarningsData {
  daily: PeriodData;
  weekly: PeriodData;
  monthly: PeriodData;
}

const Earnings: React.FC = () => {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadEarningsData();
  }, [selectedDate]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load daily stats
      const dailyResponse = await driverApi.getDailyStats(selectedDate);

      if (dailyResponse.success && dailyResponse.data) {
        // For now, we'll use daily stats as base
        // In a real app, you'd have separate endpoints for weekly/monthly data
        const daily: DailyStats = dailyResponse.data;

        const earnings = daily.earnings ?? 0;
        const totalDeliveries = (daily.totalDeliveries ?? daily.completedDeliveries) ?? 0;
        const distance = daily.distance ?? 0;

        setEarningsData({
          daily: {
            earnings,
            completedDeliveries: daily.completedDeliveries ?? totalDeliveries,
            distance,
            totalDeliveries,
            totalEarnings: earnings,
            averageEarningsPerDelivery: totalDeliveries > 0 ? earnings / totalDeliveries : 0,
          },
          weekly: {
            totalEarnings: earnings * 7, // Mock weekly data
            totalDeliveries: totalDeliveries * 7,
            totalDistance: distance * 7,
            averageEarningsPerDelivery: totalDeliveries > 0 ? earnings / totalDeliveries : 0,
          },
          monthly: {
            totalEarnings: earnings * 30, // Mock monthly data
            totalDeliveries: totalDeliveries * 30,
            totalDistance: distance * 30,
            averageEarningsPerDelivery: totalDeliveries > 0 ? earnings / totalDeliveries : 0,
          }
        });
      } else {
        setError(dailyResponse.message || 'Failed to load earnings data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentPeriodData = () => {
    if (!earningsData) return null;
    return earningsData[selectedPeriod];
  };

  const getPeriodLabel = () => {
    const date = new Date(selectedDate);
    switch (selectedPeriod) {
      case 'daily':
        return date.toLocaleDateString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-NG', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`;
      case 'monthly':
        return date.toLocaleDateString('en-NG', {
          month: 'long',
          year: 'numeric'
        });
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading earnings data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h3 className="text-red-800 font-medium">Error loading earnings</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadEarningsData}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentData = getCurrentPeriodData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <button
          onClick={loadEarningsData}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Period Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedPeriod === period
                ? 'bg-white text-primary-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Period Label */}
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">{getPeriodLabel()}</h2>
      </div>

      {/* Main Earnings Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-8 text-white">
        <div className="text-center">
          <CurrencyDollarIcon className="h-16 w-16 mx-auto mb-4 opacity-80" />
          <p className="text-lg opacity-90 mb-2">
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Earnings
          </p>
          <p className="text-4xl font-bold mb-4">
            {currentData ? formatCurrency(((currentData.totalEarnings ?? currentData.earnings) ?? 0)) : '₦0'}
          </p>

          {currentData && selectedPeriod === 'daily' && (
            <div className="grid grid-cols-2 gap-4 text-sm opacity-90">
              <div>
                <p className="font-medium">Deliveries</p>
                <p className="text-2xl font-bold">{currentData.completedDeliveries ?? 0}</p>
              </div>
              <div>
                <p className="font-medium">Distance</p>
                <p className="text-2xl font-bold">{(currentData.distance ?? 0).toFixed(1)} km</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {currentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TruckIcon className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {selectedPeriod === 'daily' ? 'Deliveries Today' : 'Total Deliveries'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(currentData.totalDeliveries ?? currentData.completedDeliveries) ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <MapPinIcon className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {selectedPeriod === 'daily' ? 'Distance Today' : 'Total Distance'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(currentData.totalDistance ?? currentData.distance ?? 0).toFixed(1)} km
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-10 w-10 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. per Delivery</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentData.averageEarningsPerDelivery
                    ? formatCurrency(currentData.averageEarningsPerDelivery ?? 0)
                    : selectedPeriod === 'daily' && (currentData.completedDeliveries ?? 0) > 0
                      ? formatCurrency((currentData.earnings ?? 0) / (currentData.completedDeliveries ?? 1))
                      : '₦0'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ClockIcon className="h-10 w-10 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {selectedPeriod === 'daily' && (currentData.distance ?? 0) > 0
                    ? `${((currentData.earnings ?? 0) / (currentData.distance ?? 1)).toFixed(0)}/km`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Earnings Breakdown</h3>
        </div>

        <div className="p-6">
          {selectedPeriod === 'daily' && earningsData ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Base Delivery Earnings</p>
                  <p className="text-sm text-gray-600">
                    {(earningsData.daily.completedDeliveries ?? 0)} deliveries completed
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(((earningsData.daily.earnings ?? 0) * 0.8))} {/* Assuming 80% is base */}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Distance Bonus</p>
                  <p className="text-sm text-gray-600">
                    {(earningsData.daily.distance ?? 0).toFixed(1)} km driven
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(((earningsData.daily.earnings ?? 0) * 0.15))} {/* Assuming 15% is distance */}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Tips & Bonuses</p>
                  <p className="text-sm text-gray-600">Additional earnings</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(((earningsData.daily.earnings ?? 0) * 0.05))} {/* Assuming 5% is tips */}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-900">Total Earnings</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency((earningsData.daily.earnings ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Detailed breakdown not available for {selectedPeriod} view.</p>
              <p className="text-sm text-gray-500 mt-2">Switch to daily view for detailed earnings breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly/Monthly Summary */}
      {selectedPeriod !== 'daily' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Working Days</p>
              <p className="text-2xl font-bold text-primary-600">
                {selectedPeriod === 'weekly' ? '7' : '30'} {/* Mock data */}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Daily Average</p>
              <p className="text-2xl font-bold text-green-600">
                {currentData
                  ? formatCurrency(
                    (currentData.totalEarnings || 0) /
                    (selectedPeriod === 'weekly' ? 7 : 30)
                  )
                  : '₦0'
                }
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Per Delivery</p>
              <p className="text-2xl font-bold text-blue-600">
                {currentData && (currentData.totalDeliveries ?? 0) > 0
                  ? formatCurrency((currentData.totalEarnings || 0) / (currentData.totalDeliveries ?? 1))
                  : '₦0'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Earnings;