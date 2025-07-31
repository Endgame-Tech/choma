import React, { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-choma-white dark:bg-choma-dark transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-choma-white dark:bg-choma-dark p-6 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout