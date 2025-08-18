import React, { ReactNode } from 'react'

interface MobileCardProps {
  children: ReactNode
  className?: string
}

const MobileCard: React.FC<MobileCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/90 dark:bg-neutral-800/90 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 space-y-3 ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardRowProps {
  label: string
  children: ReactNode
  className?: string
}

export const MobileCardRow: React.FC<MobileCardRowProps> = ({ label, children, className = '' }) => {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-sm font-medium text-gray-500 dark:text-neutral-400">{label}:</span>
      <div className="text-sm text-gray-900 dark:text-neutral-100">{children}</div>
    </div>
  )
}

export default MobileCard