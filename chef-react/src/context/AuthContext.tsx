import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'
import type { Chef, AuthContextType, LoginCredentials, RegisterData } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [chef, setChef] = useState<Chef | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if chef is already logged in
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('chefToken')
        const chefData = localStorage.getItem('chefData')
        
        if (token && chefData) {
          // Verify token is still valid by fetching profile
          const profile = await authApi.getProfile()
          setChef(profile)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Clear invalid auth data
        localStorage.removeItem('chefToken')
        localStorage.removeItem('chefData')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const result = await authApi.login(credentials)
      setChef(result.chef)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterData): Promise<void> => {
    try {
      await authApi.register(data)
      // Note: Registration doesn't auto-login, chef needs admin approval
    } catch (error) {
      throw error
    }
  }

  const logout = (): void => {
    authApi.logout()
    setChef(null)
  }

  const updateChef = (updatedChef: Chef): void => {
    setChef(updatedChef)
    localStorage.setItem('chefData', JSON.stringify(updatedChef))
  }

  const value: AuthContextType = {
    chef,
    login,
    register,
    logout,
    updateChef,
    loading,
    isAuthenticated: !!chef
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext