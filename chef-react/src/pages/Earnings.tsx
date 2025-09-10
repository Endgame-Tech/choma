import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { earningsApi } from '../services/api'
import type { EarningsData } from '../types'
import {
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock,
  TrendingUp,
  CreditCard,
  Lightbulb
} from 'lucide-react'

const Earnings: React.FC = () => {
  const { chef } = useAuth()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'current_week' | 'last_week' | 'current_month'>('current_month')

  useEffect(() => {
    fetchEarningsData()
  }, [selectedPeriod])

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch earnings data using the new API
      const earnings = await earningsApi.getEarnings(selectedPeriod).catch(() => null)

      if (earnings) {
        // Transform to legacy format for backward compatibility
        const transformedData = {
          ...earnings,
          totalEarnings: earnings.summary.totalEarnings,
          currentMonthEarnings: earnings.summary.totalEarnings,
          availableBalance: earnings.summary.totalPaid, // Paid amounts are available
          pendingPayments: earnings.summary.totalPending,
          ordersCompleted: earnings.summary.completedOrders,
          averageOrderValue: earnings.summary.completedOrders > 0
            ? earnings.summary.totalEarnings / earnings.summary.completedOrders
            : 0
        }
        setEarningsData(transformedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100'
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading earnings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle size={20} className="text-red-400 mr-3" />
          <div>
            <h3 className="text-red-800 dark:text-red-100 font-medium">Error loading earnings</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchEarningsData}
              className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Earnings & Payments</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your income and payment history</p>
          </div>

          {/* Period selector */}
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-2">
              {[
                { value: 'current_week', label: 'This Week' },
                { value: 'last_week', label: 'Last Week' },
                { value: 'current_month', label: 'This Month' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === period.value
                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100 border-2 border-blue-200 dark:border-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Earnings</p>
              <p className="text-3xl font-semibold text-green-600">
                {earningsData?.summary?.totalPaid ? formatCurrency(earningsData.summary.totalPaid) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <DollarSign size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600 dark:text-green-400">
              Already transferred to your bank
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-3xl font-semibold text-blue-600">
                {earningsData?.summary?.totalEarnings ? formatCurrency(earningsData.summary.totalEarnings) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Period: {selectedPeriod.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payments</p>
              <p className="text-3xl font-semibold text-orange-600">
                {earningsData?.summary?.totalPending ? formatCurrency(earningsData.summary.totalPending) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
              <Clock size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Paid on Fridays
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Orders</p>
              <p className="text-3xl font-semibold text-purple-600">
                {earningsData?.summary?.completedOrders || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              This period
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Payout Information */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
          <Clock size={20} className="mr-2" />
          Weekly Payout Schedule
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Payment Day</h4>
            <p className="text-blue-700 dark:text-blue-300">Every Friday</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Chef Commission</h4>
            <p className="text-blue-700 dark:text-blue-300">85% of order value</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Processing Time</h4>
            <p className="text-blue-700 dark:text-blue-300">Same day transfer</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center">
            <Lightbulb size={16} className="mr-2" />
            Complete orders from Monday to Sunday are paid the following Friday directly to your registered bank account.
          </p>
        </div>
      </div>

      {/* Banking Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Banking Information</h3>
        {chef?.bankDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bank Name</p>
              <p className="text-gray-900 dark:text-white">{chef.bankDetails.bankName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Name</p>
              <p className="text-gray-900 dark:text-white">{chef.bankDetails.accountName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Number</p>
              <p className="text-gray-900 dark:text-white">
                ****{chef.bankDetails.accountNumber?.slice(-4) || '****'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle size={20} className="text-yellow-400 mr-3" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-100 font-medium">Banking information not provided</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  Please update your profile with banking details to receive payments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Earnings History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Earnings History</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your order completions and payouts</p>
        </div>

        {!earningsData?.earnings || earningsData.earnings.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <CreditCard size={48} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No earnings yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Complete orders to start earning. Payments are made every Friday.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {earningsData.earnings.map((earning) => (
              <div key={earning.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Order Completion
                      </h4>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(earning.status)}`}>
                        {earning.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(earning.cookingFee)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Completed: {new Date(earning.completedDate).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        {earning.payoutDate && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Paid: {new Date(earning.payoutDate).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {earning.chefPercentage}% of ₦{earning.orderTotal.toLocaleString()}
                        </p>
                        {earning.payoutReference && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Ref: {earning.payoutReference}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default Earnings