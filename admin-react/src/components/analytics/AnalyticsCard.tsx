import React from 'react'

interface AnalyticsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    period: string
    isPositive?: boolean
  }
  icon: string
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo' | 'pink' | 'teal'
  subtitle?: string
  onClick?: () => void
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  red: 'bg-red-100 text-red-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  pink: 'bg-pink-100 text-pink-600',
  teal: 'bg-teal-100 text-teal-600'
}

export default function AnalyticsCard({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  subtitle,
  onClick 
}: AnalyticsCardProps) {
  return (
    <div 
      className={`bg-white p-6 rounded-lg shadow-sm border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                change.isPositive !== false ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.isPositive !== false ? '↗' : '↘'} {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs {change.period}</span>
            </div>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}