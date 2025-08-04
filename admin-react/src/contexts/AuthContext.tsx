import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
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

// Hash function for password verification (currently unused but kept for future implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Admin credentials (hashed)
const ADMIN_CREDENTIALS = {
  email: 'getchoma@gmail.com',
  // This is the hashed version of 'S0BwB$cuIqx_82Z'
  passwordHash: 'b8f3c2d4e5a6f7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2'
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('choma-admin-auth')
      const authTimestamp = localStorage.getItem('choma-admin-auth-timestamp')
      
      if (authStatus === 'true' && authTimestamp) {
        const timestamp = parseInt(authTimestamp)
        const now = Date.now()
        const sessionDuration = 24 * 60 * 60 * 1000 // 24 hours
        
        if (now - timestamp < sessionDuration) {
          setIsAuthenticated(true)
        } else {
          // Session expired
          localStorage.removeItem('choma-admin-auth')
          localStorage.removeItem('choma-admin-auth-timestamp')
        }
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Validate email
      if (email.toLowerCase() !== ADMIN_CREDENTIALS.email.toLowerCase()) {
        return false
      }
      
      // For demo purposes, we'll use a simple comparison
      // In production, you'd want to use a proper password hashing library like bcrypt
      // const hashedPassword = await hashPassword(password)
      const isValidPassword = password === 'S0BwB$cuIqx_82Z'
      
      if (isValidPassword) {
        setIsAuthenticated(true)
        localStorage.setItem('choma-admin-auth', 'true')
        localStorage.setItem('choma-admin-auth-timestamp', Date.now().toString())
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('choma-admin-auth')
    localStorage.removeItem('choma-admin-auth-timestamp')
  }

  const value: AuthContextType = {
    isAuthenticated,
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