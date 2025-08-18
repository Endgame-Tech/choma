import React, { ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children, className = '' }) => {
  return (
    <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className={`min-w-full divide-y divide-gray-200 dark:divide-neutral-700 ${className}`}>
            {children}
          </table>
        </div>
      </div>
    </div>
  )
}

export default ResponsiveTable