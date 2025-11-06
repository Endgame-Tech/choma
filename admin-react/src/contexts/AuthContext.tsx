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
  const [justLoggedIn, setJustLoggedIn] = useState(false)

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      // Skip verification if we just logged in (state is fresh)
      if (justLoggedIn) {
        console.log('⏭️ Skipping auth check - just logged in')
        setLoading(false)
        setJustLoggedIn(false)
        return
      }

      try {
        const storedToken = localStorage.getItem('choma-admin-token')
        const storedAdmin = localStorage.getItem('choma-admin-data')

        if (storedToken && storedAdmin) {
          // Verify token is still valid by making a request to get profile
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/auth/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (response.ok) {
              // Token is valid, update with fresh data from server
              const data = await response.json()
              setToken(storedToken)
              setAdmin(data.data)
              setIsAuthenticated(true)
            } else if (response.status === 401 || response.status === 403) {
              // Token is invalid or expired - clear authentication
              console.warn('Token is invalid or expired, logging out')
              localStorage.removeItem('choma-admin-token')
              localStorage.removeItem('choma-admin-data')
              setToken(null)
              setAdmin(null)
              setIsAuthenticated(false)
            } else {
              // Server error (500, 502, etc.) - keep user logged in with cached data
              console.warn(`Server error (${response.status}), using cached authentication`)
              try {
                const cachedAdmin = JSON.parse(storedAdmin)
                setToken(storedToken)
                setAdmin(cachedAdmin)
                setIsAuthenticated(true)
              } catch (parseError) {
                console.error('Failed to parse cached admin data:', parseError)
                localStorage.removeItem('choma-admin-token')
                localStorage.removeItem('choma-admin-data')
              }
            }
          } catch (fetchError) {
            // Network error (offline, timeout, etc.) - keep user logged in with cached data
            console.warn('Network error during token verification, using cached authentication:', fetchError)
            try {
              const cachedAdmin = JSON.parse(storedAdmin)
              setToken(storedToken)
              setAdmin(cachedAdmin)
              setIsAuthenticated(true)
            } catch (parseError) {
              console.error('Failed to parse cached admin data:', parseError)
              localStorage.removeItem('choma-admin-token')
              localStorage.removeItem('choma-admin-data')
            }
          }
        }
      } catch (error) {
        console.error('Unexpected auth check error:', error)
        // Only clear auth if we can't recover
        localStorage.removeItem('choma-admin-token')
        localStorage.removeItem('choma-admin-data')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [justLoggedIn])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/auth/login`, {
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

        // Update state synchronously
        setToken(authToken)
        setAdmin(adminData)
        setIsAuthenticated(true)
        setJustLoggedIn(true)

        // Wait for React to process state updates before returning
        await new Promise(resolve => setTimeout(resolve, 0))

        console.log('✅ Login successful, auth state updated')
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
        await fetch(`${import.meta.env.VITE_API_URL}/api/admin/auth/logout`, {
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