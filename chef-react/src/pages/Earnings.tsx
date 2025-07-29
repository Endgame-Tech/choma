import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { earningsApi } from '../services/api'
import type { EarningsData, PaymentRecord } from '../types'

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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error loading earnings</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchEarningsData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
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
            <h1 className="text-3xl font-semibold text-gray-900">Earnings & Payments</h1>
            <p className="text-gray-600">Track your income and payment history</p>
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period.value
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <p className="text-3xl font-semibold text-green-600">
                {earningsData?.availableBalance ? formatCurrency(earningsData.availableBalance) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
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

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-3xl font-semibold text-blue-600">
                {earningsData?.totalEarnings ? formatCurrency(earningsData.totalEarnings) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              Period: {selectedPeriod}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-3xl font-semibold text-orange-600">
                {earningsData?.pendingPayments ? formatCurrency(earningsData.pendingPayments) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              From {earningsData?.ordersCompleted || 0} orders
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-3xl font-semibold text-purple-600">
                {earningsData?.averageOrderValue ? formatCurrency(earningsData.averageOrderValue) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              Per order
            </span>
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
        {chef?.bankDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Name</p>
              <p className="text-gray-900">{chef.bankDetails.bankName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Account Name</p>
              <p className="text-gray-900">{chef.bankDetails.accountName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Account Number</p>
              <p className="text-gray-900">
                ****{chef.bankDetails.accountNumber?.slice(-4) || '****'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-400 mr-3">⚠️</div>
              <div>
                <p className="text-yellow-800 font-medium">Banking information not provided</p>
                <p className="text-yellow-700 text-sm">
                  Please update your profile with banking details to receive payments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
        </div>
        
        {paymentHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
            <p className="text-gray-500">Your payment transactions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paymentHistory.map((payment) => (
              <div key={payment._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {payment.type === 'earning' ? 'Order Payment' : 'Withdrawal'}
                      </h4>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {payment.type === 'withdrawal' ? '-' : '+'}{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
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
                          <p className="text-sm text-gray-600">{payment.description}</p>
                        </div>
                      )}
                    </div>
                    
                    {payment.orderId && (
                      <p className="text-xs text-gray-500 mt-1">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Withdrawal</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Available Balance</p>
              <p className="text-2xl font-semibold text-green-600">
                {earningsData?.availableBalance ? formatCurrency(earningsData.availableBalance) : '₦0'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Withdrawal Amount
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={earningsData?.availableBalance || 0}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                💡 Withdrawal requests are processed within 1-3 business days.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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