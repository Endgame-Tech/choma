import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Driver, LoginCredentials, RegisterData, AuthResponse } from '../types';
import { driverApi } from '../services/api';

interface AuthContextType {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateDriver: (updates: Partial<Driver>) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      const driverData = localStorage.getItem('driverData');
      
      if (token && driverData) {
        const parsedDriver = JSON.parse(driverData);
        setDriver(parsedDriver);
        setIsAuthenticated(true);
        
        // Verify token is still valid
        const isValid = await driverApi.verifyToken();
        if (!isValid) {
          await logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const response = await driverApi.login(credentials);
      
      if (response.success && response.data) {
        const { driver: driverData, token } = response.data;
        
        // Store auth data
        localStorage.setItem('driverToken', token);
        localStorage.setItem('driverData', JSON.stringify(driverData));
        
        setDriver(driverData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const response = await driverApi.register(data);
      
      if (response.success) {
        return { 
          success: true, 
          message: response.message || 'Registration successful! Please wait for approval.' 
        };
      } else {
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear local storage
      localStorage.removeItem('driverToken');
      localStorage.removeItem('driverData');
      
      // Reset state
      setDriver(null);
      setIsAuthenticated(false);
      
      // Notify server
      await driverApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriver = async (updates: Partial<Driver>) => {
    try {
      const response = await driverApi.updateProfile(updates);
      
      if (response.success && driver) {
        const updatedDriver = { ...driver, ...updates };
        setDriver(updatedDriver);
        localStorage.setItem('driverData', JSON.stringify(updatedDriver));
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Update failed' };
      }
    } catch (error) {
      console.error('Update driver error:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  };

  const value: AuthContextType = {
    driver,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateDriver,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};