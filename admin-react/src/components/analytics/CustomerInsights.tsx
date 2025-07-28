import React from 'react'

interface CustomerSegment {
  name: string
  users: number
  percentage: number
  color: string
  avgOrderValue: number
  totalRevenue: number
}

interface CustomerInsightsProps {
  segments: CustomerSegment[]
  totalCustomers: number
  className?: string
}

export default function CustomerInsights({ segments, totalCustomers, className = '' }: CustomerInsightsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const totalRevenue = segments.reduce((sum, segment) => sum + segment.totalRevenue, 0)

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer Segments</h3>
        <div className="text-sm text-gray-600">
          Total: {totalCustomers.toLocaleString()} customers
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No customer data available
        </div>
      ) : (
        <div className="space-y-6">
          {/* Segments Overview */}
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="font-medium text-gray-900">{segment.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {segment.users.toLocaleString()} ({segment.percentage}%)
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatCurrency(segment.avgOrderValue)} avg
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${segment.percentage}%`,
                      backgroundColor: segment.color
                    }}
                  />
                </div>
                
                {/* Revenue Contribution */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Revenue: {formatCurrency(segment.totalRevenue)}</span>
                  <span>{((segment.totalRevenue / totalRevenue) * 100).toFixed(1)}% of total</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(segments.reduce((sum, s) => sum + (s.avgOrderValue * s.users), 0) / totalCustomers)}
                </p>
                <p className="text-sm text-gray-600">Avg Customer Value</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {segments.length > 0 ? Math.max(...segments.map(s => s.percentage)).toFixed(1) : 0}%
                </p>
                <p className="text-sm text-gray-600">Largest Segment</p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-medium text-gray-900 mb-3">Key Insights</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {segments.length > 0 && (
                <>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    <span>
                      <strong>{segments[0].name}</strong> represents the largest customer segment at {segments[0].percentage}%
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span>
                      Highest value customers have an average order value of{' '}
                      <strong>{formatCurrency(Math.max(...segments.map(s => s.avgOrderValue)))}</strong>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    <span>
                      Customer acquisition cost should focus on{' '}
                      <strong>{segments.find(s => s.totalRevenue === Math.max(...segments.map(s => s.totalRevenue)))?.name}</strong> segment
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}