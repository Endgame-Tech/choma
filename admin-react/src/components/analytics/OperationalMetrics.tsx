import React from 'react'
interface OperationalData {
  averageOrderValue: number
  averageDeliveryTime: number
  chefUtilization: number
  customerSatisfaction: number
  orderFulfillmentRate: number
  peakHours: Array<{ hour: string; orders: number }>
  popularMeals: Array<{ name: string; orders: number; revenue: number }>
  cancellationRate: number
}

interface OperationalMetricsProps {
  data: OperationalData
  className?: string
}

export default function OperationalMetrics({ data, className = '' }: OperationalMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getMetricColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.fair) return 'text-yellow-600'
    return 'text-red-600'
  }

  

  const maxPeakOrders = Math.max(...data.peakHours.map(h => h.orders))

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Operational Metrics</h3>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(data.averageOrderValue)}
          </p>
          <p className="text-sm text-gray-600">Avg Order Value</p>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">
            {data.averageDeliveryTime} min
          </p>
          <p className="text-sm text-gray-600">Avg Delivery Time</p>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">
            {data.chefUtilization}%
          </p>
          <p className="text-sm text-gray-600">Chef Utilization</p>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">
            {data.customerSatisfaction}/5.0
          </p>
          <p className="text-sm text-gray-600">Customer Satisfaction</p>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Performance Indicators</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Order Fulfillment Rate</span>
                <span className={`text-sm font-semibold ${getMetricColor(data.orderFulfillmentRate, { good: 95, fair: 85 })}`}>
                  {data.orderFulfillmentRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    data.orderFulfillmentRate >= 95 ? 'bg-green-500' :
                    data.orderFulfillmentRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.orderFulfillmentRate}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Chef Utilization</span>
                <span className={`text-sm font-semibold ${getMetricColor(data.chefUtilization, { good: 80, fair: 60 })}`}>
                  {data.chefUtilization}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    data.chefUtilization >= 80 ? 'bg-green-500' :
                    data.chefUtilization >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.chefUtilization}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Cancellation Rate</span>
                <span className={`text-sm font-semibold ${
                  data.cancellationRate <= 5 ? 'text-green-600' :
                  data.cancellationRate <= 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {data.cancellationRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    data.cancellationRate <= 5 ? 'bg-green-500' :
                    data.cancellationRate <= 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.cancellationRate, 20) * 5}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Peak Hours</h4>
          <div className="space-y-3">
            {data.peakHours.slice(0, 6).map((hour, index) => (
              <div key={index} className="flex items-center">
                <div className="w-16 text-sm text-gray-600 font-medium">
                  {hour.hour}
                </div>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(hour.orders / maxPeakOrders) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {hour.orders}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Meals */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Top Performing Meals</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-600 font-medium">Meal</th>
                <th className="text-center py-2 text-gray-600 font-medium">Orders</th>
                <th className="text-right py-2 text-gray-600 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.popularMeals.slice(0, 5).map((meal, index) => (
                <tr key={index} className="border-b border-gray-50">
                  <td className="py-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 text-xs font-bold">#{index + 1}</span>
                      </div>
                      <span className="font-medium text-gray-900">{meal.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {meal.orders}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(meal.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Score */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Operational Health Score</h4>
            <p className="text-sm text-gray-600">Based on key performance indicators</p>
          </div>
          <div className="text-right">
            {(() => {
              const score = Math.round(
                (data.orderFulfillmentRate + 
                 data.chefUtilization + 
                 (100 - data.cancellationRate) + 
                 (data.customerSatisfaction * 20)) / 4
              )
              return (
                <div className={`text-3xl font-bold ${
                  score >= 85 ? 'text-green-600' :
                  score >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {score}%
                  <div className="text-sm font-normal text-gray-600">
                    {score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Attention'}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}