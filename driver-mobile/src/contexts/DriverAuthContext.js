import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DRIVER_STATUSES } from '../utils/constants';

// Initial state
const initialState = {
  driver: null,
  isAuthenticated: false,
  isLoading: true,
  driverStatus: DRIVER_STATUSES.OFFLINE,
  token: null,
  refreshToken: null,
  lastLoginTime: null,
  deviceInfo: null,
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_DRIVER: 'UPDATE_DRIVER',
  SET_DRIVER_STATUS: 'SET_DRIVER_STATUS',
  UPDATE_TOKEN: 'UPDATE_TOKEN',
  RESTORE_SESSION: 'RESTORE_SESSION',
};

// Reducer
const driverAuthReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        driver: action.payload.driver,
        isAuthenticated: true,
        isLoading: false,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        lastLoginTime: new Date().toISOString(),
        driverStatus: action.payload.driver?.status || DRIVER_STATUSES.OFFLINE,
      };

    case ActionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case ActionTypes.UPDATE_DRIVER:
      return {
        ...state,
        driver: {
          ...state.driver,
          ...action.payload,
        },
      };

    case ActionTypes.SET_DRIVER_STATUS:
      return {
        ...state,
        driverStatus: action.payload,
        driver: state.driver ? {
          ...state.driver,
          status: action.payload,
        } : null,
      };

    case ActionTypes.UPDATE_TOKEN:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken || state.refreshToken,
      };

    case ActionTypes.RESTORE_SESSION:
      return {
        ...state,
        driver: action.payload.driver,
        isAuthenticated: action.payload.isAuthenticated,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        driverStatus: action.payload.driverStatus || DRIVER_STATUSES.OFFLINE,
        lastLoginTime: action.payload.lastLoginTime,
        isLoading: false,
      };

    default:
      return state;
  }
};

// Context
const DriverAuthContext = createContext();

// Provider component
export const DriverAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(driverAuthReducer, initialState);

  // Storage keys
  const STORAGE_KEYS = {
    DRIVER: '@driver_data',
    TOKEN: '@driver_token',
    REFRESH_TOKEN: '@driver_refresh_token',
    STATUS: '@driver_status',
    LAST_LOGIN: '@driver_last_login',
  };

  // Save auth data to storage
  const saveAuthData = async (authData) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DRIVER, JSON.stringify(authData.driver)),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authData.token),
        authData.refreshToken && AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.STATUS, authData.driver?.status || DRIVER_STATUSES.OFFLINE),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString()),
      ]);
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  };

  // Clear auth data from storage
  const clearAuthData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.DRIVER),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.STATUS),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_LOGIN),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  // Restore session from storage
  const restoreSession = async () => {
    try {
      const [driverData, token, refreshToken, driverStatus, lastLoginTime] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DRIVER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.STATUS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_LOGIN),
      ]);

      if (driverData && token) {
        dispatch({
          type: ActionTypes.RESTORE_SESSION,
          payload: {
            driver: JSON.parse(driverData),
            isAuthenticated: true,
            token,
            refreshToken,
            driverStatus: driverStatus || DRIVER_STATUSES.OFFLINE,
            lastLoginTime,
          },
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    
    dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    return false;
  };

  // Login
  const login = async (authData) => {
    try {
      dispatch({
        type: ActionTypes.LOGIN_SUCCESS,
        payload: authData,
      });
      
      await saveAuthData(authData);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      dispatch({ type: ActionTypes.LOGOUT });
      await clearAuthData();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Update driver data
  const updateDriver = async (driverData) => {
    try {
      dispatch({
        type: ActionTypes.UPDATE_DRIVER,
        payload: driverData,
      });
      
      // Update storage
      const updatedDriver = { ...state.driver, ...driverData };
      await AsyncStorage.setItem(STORAGE_KEYS.DRIVER, JSON.stringify(updatedDriver));
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update driver:', error);
      return { success: false, error: error.message };
    }
  };

  // Set driver status
  const setDriverStatus = async (status) => {
    try {
      dispatch({
        type: ActionTypes.SET_DRIVER_STATUS,
        payload: status,
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.STATUS, status);
      return { success: true };
    } catch (error) {
      console.error('Failed to set driver status:', error);
      return { success: false, error: error.message };
    }
  };

  // Update tokens
  const updateTokens = async (tokenData) => {
    try {
      dispatch({
        type: ActionTypes.UPDATE_TOKEN,
        payload: tokenData,
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, tokenData.token);
      if (tokenData.refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update tokens:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if driver is online
  const isDriverOnline = () => {
    return state.driverStatus === DRIVER_STATUSES.ONLINE || 
           state.driverStatus === DRIVER_STATUSES.BUSY ||
           state.driverStatus === DRIVER_STATUSES.DELIVERING;
  };

  // Initialize on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const contextValue = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    updateDriver,
    setDriverStatus,
    updateTokens,
    restoreSession,
    
    // Helpers
    isDriverOnline,
  };

  return (
    <DriverAuthContext.Provider value={contextValue}>
      {children}
    </DriverAuthContext.Provider>
  );
};

// Hook to use driver auth context
export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};

export default DriverAuthContext;