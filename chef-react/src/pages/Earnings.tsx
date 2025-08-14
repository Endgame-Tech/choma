import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { earningsApi } from '../services/api'
import type { EarningsData, PaymentRecord } from '../types'
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')

  useEffect(() => {
    fetchEarningsData()
  }, [selectedPeriod])

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [earnings, payments] = await Promise.all([
        earningsApi.getEarningsOverview(selectedPeriod).catch(() => null),
        earningsApi.getPaymentHistory().catch(() => ({ payments: [] }))
      ])

      setEarningsData(earnings)
      setPaymentHistory(payments.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawRequest = async () => {
    try {
      const amount = parseFloat(withdrawAmount)
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount')
        return
      }

      if (amount > (earningsData?.availableBalance || 0)) {
        alert('Insufficient balance')
        return
      }

      await earningsApi.requestWithdrawal(amount)
      alert('Withdrawal request submitted successfully!')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      fetchEarningsData() // Refresh data
    } catch (err) {
      alert(`Failed to submit withdrawal request: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' }
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Balance</p>
              <p className="text-3xl font-semibold text-green-600">
                {earningsData?.availableBalance ? formatCurrency(earningsData.availableBalance) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <DollarSign size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!earningsData?.availableBalance || earningsData.availableBalance <= 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Request Withdrawal
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-3xl font-semibold text-blue-600">
                {earningsData?.totalEarnings ? formatCurrency(earningsData.totalEarnings) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Period: {selectedPeriod}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payments</p>
              <p className="text-3xl font-semibold text-orange-600">
                {earningsData?.pendingPayments ? formatCurrency(earningsData.pendingPayments) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
              <Clock size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              From {earningsData?.ordersCompleted || 0} orders
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Order Value</p>
              <p className="text-3xl font-semibold text-purple-600">
                {earningsData?.averageOrderValue ? formatCurrency(earningsData.averageOrderValue) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Per order
            </span>
          </div>
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

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h3>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <CreditCard size={48} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payment history</h3>
            <p className="text-gray-500 dark:text-gray-400">Your payment transactions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {paymentHistory.map((payment) => (
              <div key={payment._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {payment.type === 'earning' ? 'Order Payment' : 'Withdrawal'}
                      </h4>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {payment.type === 'withdrawal' ? '-' : '+'}{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(payment.createdAt).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {payment.description && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{payment.description}</p>
                        </div>
                      )}
                    </div>

                    {payment.orderId && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Order: #{payment.orderId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Withdrawal</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Available Balance</p>
              <p className="text-2xl font-semibold text-green-600">
                {earningsData?.availableBalance ? formatCurrency(earningsData.availableBalance) : '₦0'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Withdrawal Amount
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={earningsData?.availableBalance || 0}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 dark:text-yellow-100 text-sm flex items-center">
                <Lightbulb size={16} className="mr-2" />
                Withdrawal requests are processed within 1-3 business days.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawRequest}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Earnings