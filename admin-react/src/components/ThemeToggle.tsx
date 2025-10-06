import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-choma-brown/10 dark:bg-choma-orange/20 hover:bg-choma-brown/20 dark:hover:bg-choma-orange/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-choma-orange focus:ring-offset-2 dark:focus:ring-offset-choma-dark group"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative">
        <SunIcon
          className={`w-5 h-5 text-choma-brown dark:text-choma-orange transform transition-all duration-300 ${theme === 'light'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-180 scale-0 opacity-0'
            }`}
        />
        <MoonIcon
          className={`w-5 h-5 text-choma-brown dark:text-choma-orange absolute inset-0 transform transition-all duration-300 ${theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-180 scale-0 opacity-0'
            }`}
        />
      </div>

      {/* Hover effect ring */}
      <div className="absolute inset-0 rounded-xl bg-choma-orange opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300"></div>
    </button>
  )
}

export default ThemeToggle