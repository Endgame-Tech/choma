import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Admin } from '../types/admin'

interface AuthContextType {
  isAuthenticated: boolean
  admin: Admin | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('choma-admin-token')
        const storedAdmin = localStorage.getItem('choma-admin-data')

        if (storedToken && storedAdmin) {
          // Verify token is still valid by making a request to get profile
          const response = await fetch('http://localhost:5001/api/admin/auth/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            setToken(storedToken)
            setAdmin(data.data)
            setIsAuthenticated(true)
          } else {
            // Token is invalid, clear stored data
            localStorage.removeItem('choma-admin-token')
            localStorage.removeItem('choma-admin-data')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Clear stored data on error
        localStorage.removeItem('choma-admin-token')
        localStorage.removeItem('choma-admin-data')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)

      const response = await fetch('http://localhost:5001/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const { admin: adminData, token: authToken } = data.data

        // Store auth data
        localStorage.setItem('choma-admin-token', authToken)
        localStorage.setItem('choma-admin-data', JSON.stringify(adminData))

        // Update state
        setToken(authToken)
        setAdmin(adminData)
        setIsAuthenticated(true)

        return true
      } else {
        console.error('Login failed:', data.error || 'Unknown error')
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint if token exists
      if (token) {
        await fetch('http://localhost:5001/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state and storage regardless of API call result
      setIsAuthenticated(false)
      setAdmin(null)
      setToken(null)
      localStorage.removeItem('choma-admin-token')
      localStorage.removeItem('choma-admin-data')
    }
  }

  const value: AuthContextType = {
    isAuthenticated,
    admin,
    token,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}