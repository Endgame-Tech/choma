// src/context/AuthContext.js - Updated for MongoDB Backend
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import biometricAuth from '../services/biometricAuth';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking authentication status...');
      
      // Check if we have a stored token
      const token = await apiService.getStoredToken();
      
      if (token) {
        console.log('📱 Token found, verifying with backend...');
        
        // Try to get user profile to verify token validity
        const profileResponse = await apiService.getProfile();
        
        if (profileResponse.success) {
          setUser(profileResponse.data.customer);
          setIsAuthenticated(true);
          setIsOffline(profileResponse.offline || false);
          
          console.log('✅ User authenticated:', profileResponse.data.customer.email);
          
          if (profileResponse.offline) {
            console.log('📱 Using offline user data');
          }
        } else {
          // Token might be expired or invalid, logout
          console.log('❌ Token invalid, logging out...');
          await logout();
        }
      } else {
        console.log('ℹ️ No authentication token found');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login for:', credentials.email);

      const response = await apiService.login(credentials);
      
      if (response.success) {
        setUser(response.data.customer);
        setIsAuthenticated(true);
        setIsOffline(response.offline || false);
        
        console.log('✅ Login successful for:', credentials.email);
        
        if (response.offline) {
          return { 
            success: true, 
            message: response.data.message || 'Logged in offline - some features may be limited'
          };
        }
        
        // Try to sync any pending data if we're back online
        if (!response.offline) {
          apiService.syncPendingData().catch(console.error);
        }
        
        return { 
          success: true, 
          message: response.data.message || 'Login successful!'
        };
      } else {
        console.log('❌ Login failed:', response.error);
        return { 
          success: false, 
          message: response.error || 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        message: 'Login failed. Please check your connection and try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setIsLoading(true);
      console.log('📝 Creating account for:', userData.email);

      const response = await apiService.signup(userData);
      
      if (response.success) {
        setUser(response.data.customer);
        setIsAuthenticated(true);
        setIsOffline(response.offline || false);
        
        console.log('✅ Signup successful for:', userData.email);
        
        if (response.offline) {
          return { 
            success: true, 
            message: response.data.message || 'Account created offline - will sync when online'
          };
        }
        
        return { 
          success: true, 
          message: response.data.message || 'Account created successfully!'
        };
      } else {
        console.log('❌ Signup failed:', response.error);
        return { 
          success: false, 
          message: response.error || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      return { 
        success: false, 
        message: 'Registration failed. Please check your connection and try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user:', user?.email);
      
      // Call API logout (will work even if offline)
      await apiService.logout();
      
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsOffline(false);
      
      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if API call fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsOffline(false);
      return { success: false, message: 'Logout completed locally' };
    }
  };

  const updateProfile = async () => {
    try {
      console.log('📝 Updating profile for:', user?.email);
      
      const response = await apiService.getProfile();
      
      if (response.success) {
        setUser(response.data.customer);
        setIsOffline(response.offline || false);
        
        console.log('✅ Profile updated successfully');
        return { 
          success: true, 
          message: 'Profile updated successfully' 
        };
      } else {
        console.log('❌ Profile update failed:', response.error);
        return { 
          success: false, 
          message: response.error || 'Failed to update profile' 
        };
      }
    } catch (error) {
      console.error('❌ Update profile error:', error);
      return { 
        success: false, 
        message: 'Failed to update profile' 
      };
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      console.log('📝 Updating user profile for:', user?.email);
      
      const response = await apiService.updateProfile(profileData);
      
      if (response.success) {
        // Update the user state with the new data
        setUser({
          ...user,
          ...response.data.customer
        });
        
        setIsOffline(response.offline || false);
        
        console.log('✅ User profile updated successfully');
        return { 
          success: true, 
          message: response.data.message || 'Profile updated successfully'
        };
      } else {
        console.log('❌ Profile update failed:', response.error);
        return { 
          success: false, 
          message: response.error || 'Failed to update profile' 
        };
      }
    } catch (error) {
      console.error('❌ Update user profile error:', error);
      return { 
        success: false, 
        message: 'Failed to update profile' 
      };
    }
  };

  // Quick demo login for testing
  const demoLogin = async () => {
    return await login({ 
      email: 'demo@choma.ng', 
      password: 'password123' 
    });
  };

  // Check connection status
  const checkConnection = async () => {
    const isHealthy = await apiService.checkBackendHealth();
    setIsOffline(!isHealthy);
    return isHealthy;
  };

  // Sync offline data with server
  const syncData = async () => {
    try {
      console.log('🔄 Syncing offline data...');
      
      // Check if we're online first
      const isOnline = await checkConnection();
      if (!isOnline) {
        console.log('📱 Still offline, cannot sync data');
        return { success: false, message: 'No internet connection' };
      }

      // If we have a user and we were offline, try to sync any pending data
      if (user && isOffline) {
        console.log('🔄 Syncing user data with server...');
        
        // Re-fetch fresh user data from server
        const response = await apiService.getProfile();
        if (response.success) {
          setUser(response.data.customer);
          setIsOffline(false);
          console.log('✅ Data synced successfully');
          return { success: true, message: 'Data synced successfully' };
        }
      }
      
      return { success: true, message: 'No sync required' };
    } catch (error) {
      console.error('❌ Sync error:', error);
      return { success: false, message: 'Failed to sync data' };
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      console.log('🗑️ Deleting account for user:', user?.email);
      
      const response = await apiService.deleteAccount();
      
      if (response.success) {
        // Clear local state immediately
        setUser(null);
        setIsAuthenticated(false);
        setIsOffline(false);
        
        console.log('✅ Account deleted successfully');
        return { 
          success: true, 
          message: response.data?.message || 'Account deleted successfully'
        };
      } else {
        console.log('❌ Account deletion failed:', response.error);
        return { 
          success: false, 
          message: response.error || 'Failed to delete account'
        };
      }
    } catch (error) {
      console.error('❌ Delete account error:', error);
      return { 
        success: false, 
        message: 'Failed to delete account. Please check your connection and try again.'
      };
    }
  };

  const loginWithBiometric = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting biometric login...');
      
      // Get stored credentials for biometric login
      const storedCredentials = await AsyncStorage.getItem('biometricCredentials');
      if (!storedCredentials) {
        return {
          success: false,
          message: 'No biometric credentials found. Please log in with password first.',
        };
      }
      
      const credentials = JSON.parse(storedCredentials);
      const response = await apiService.login(credentials);
      
      if (response.success) {
        setUser(response.data.customer);
        setIsAuthenticated(true);
        setIsOffline(response.offline || false);
        
        console.log('✅ Biometric login successful for:', credentials.email);
        
        return {
          success: true,
          message: response.data.message || 'Logged in successfully',
        };
      } else {
        console.log('❌ Biometric login failed:', response.error);
        return {
          success: false,
          message: response.error || 'Login failed',
        };
      }
    } catch (error) {
      console.error('❌ Biometric login error:', error);
      return {
        success: false,
        message: 'Biometric login failed. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const storeBiometricCredentials = async (credentials) => {
    try {
      await AsyncStorage.setItem('biometricCredentials', JSON.stringify(credentials));
      console.log('📱 Biometric credentials stored');
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
    }
  };

  const clearBiometricCredentials = async () => {
    try {
      await AsyncStorage.removeItem('biometricCredentials');
      console.log('🗑️ Biometric credentials cleared');
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isOffline,
    login,
    signup,
    logout,
    updateProfile,
    updateUserProfile,
    demoLogin,
    checkConnection,
    syncData,
    deleteAccount,
    loginWithBiometric,
    storeBiometricCredentials,
    clearBiometricCredentials,
    setUser,
    setIsAuthenticated,
    setIsLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};