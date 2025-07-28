import React from 'react'

interface RevenueData {
  date: string
  revenue: number
  orders: number
}

interface RevenueChartProps {
  data: RevenueData[]
  period: 'daily' | 'weekly' | 'monthly'
  className?: string
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, period, className = '' }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue))
  const maxOrders = Math.max(...data.map(d => d.orders))

  const periodLabels = {
    daily: 'Daily Revenue',
    weekly: 'Weekly Revenue', 
    monthly: 'Monthly Revenue'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{periodLabels[period]}</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Orders</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for the selected period
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">
                  {new Date(item.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: period === 'monthly' ? 'numeric' : undefined
                  })}
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-blue-600 font-semibold">
                    {formatCurrency(item.revenue)}
                  </span>
                  <span className="text-green-600 font-semibold">
                    {item.orders} orders
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {/* Revenue Bar */}
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                
                {/* Orders Bar */}
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(item.orders / maxOrders) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {data.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {data.reduce((sum, item) => sum + item.orders, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RevenueChart