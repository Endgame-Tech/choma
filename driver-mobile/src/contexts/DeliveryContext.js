// src/contexts/DeliveryContext.js - Manage delivery state and operations
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import driverApiService from '../services/driverApi';
import { useDriverAuth } from './DriverAuthContext';

const DeliveryContext = createContext();

// Delivery states
const DELIVERY_STATES = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  PICKUP_PENDING: 'pickup_pending',
  PICKUP_COMPLETED: 'pickup_completed',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Delivery actions
const DELIVERY_ACTIONS = {
  SET_AVAILABLE_DELIVERIES: 'SET_AVAILABLE_DELIVERIES',
  SET_ACTIVE_DELIVERY: 'SET_ACTIVE_DELIVERY',
  SET_DELIVERY_HISTORY: 'SET_DELIVERY_HISTORY',
  UPDATE_DELIVERY_STATUS: 'UPDATE_DELIVERY_STATUS',
  ADD_AVAILABLE_DELIVERY: 'ADD_AVAILABLE_DELIVERY',
  REMOVE_AVAILABLE_DELIVERY: 'REMOVE_AVAILABLE_DELIVERY',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  availableDeliveries: [],
  activeDelivery: null,
  deliveryHistory: [],
  isLoading: false,
  error: null,
  lastRefresh: null
};

// Reducer
function deliveryReducer(state, action) {
  switch (action.type) {
    case DELIVERY_ACTIONS.SET_AVAILABLE_DELIVERIES:
      return {
        ...state,
        availableDeliveries: action.payload,
        lastRefresh: new Date().toISOString(),
        isLoading: false
      };

    case DELIVERY_ACTIONS.SET_ACTIVE_DELIVERY:
      return {
        ...state,
        activeDelivery: action.payload,
        isLoading: false
      };

    case DELIVERY_ACTIONS.SET_DELIVERY_HISTORY:
      return {
        ...state,
        deliveryHistory: action.payload,
        isLoading: false
      };

    case DELIVERY_ACTIONS.UPDATE_DELIVERY_STATUS:
      const { deliveryId, status, updates } = action.payload;
      
      // Update active delivery if it matches
      let updatedActiveDelivery = state.activeDelivery;
      if (state.activeDelivery && state.activeDelivery._id === deliveryId) {
        updatedActiveDelivery = {
          ...state.activeDelivery,
          status,
          ...updates
        };
      }

      // Update delivery history
      const updatedHistory = state.deliveryHistory.map(delivery =>
        delivery._id === deliveryId
          ? { ...delivery, status, ...updates }
          : delivery
      );

      return {
        ...state,
        activeDelivery: updatedActiveDelivery,
        deliveryHistory: updatedHistory,
        isLoading: false
      };

    case DELIVERY_ACTIONS.ADD_AVAILABLE_DELIVERY:
      return {
        ...state,
        availableDeliveries: [action.payload, ...state.availableDeliveries]
      };

    case DELIVERY_ACTIONS.REMOVE_AVAILABLE_DELIVERY:
      return {
        ...state,
        availableDeliveries: state.availableDeliveries.filter(
          delivery => delivery._id !== action.payload
        )
      };

    case DELIVERY_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case DELIVERY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case DELIVERY_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

export function DeliveryProvider({ children }) {
  const [state, dispatch] = useReducer(deliveryReducer, initialState);
  const { driver, isAuthenticated } = useDriverAuth();

  // Load available deliveries
  const loadAvailableDeliveries = async () => {
    try {
      dispatch({ type: DELIVERY_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR });

      const response = await driverApiService.getAvailableDeliveries();
      dispatch({
        type: DELIVERY_ACTIONS.SET_AVAILABLE_DELIVERIES,
        payload: response.data.deliveries || []
      });
    } catch (error) {
      console.error('Failed to load available deliveries:', error);
      dispatch({
        type: DELIVERY_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to load available deliveries'
      });
    }
  };

  // Load active delivery
  const loadActiveDelivery = async () => {
    try {
      dispatch({ type: DELIVERY_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR });

      const response = await driverApiService.getActiveDelivery();
      dispatch({
        type: DELIVERY_ACTIONS.SET_ACTIVE_DELIVERY,
        payload: response.data.delivery || null
      });
    } catch (error) {
      console.error('Failed to load active delivery:', error);
      // Don't set error for 404 (no active delivery)
      if (error.status !== 404) {
        dispatch({
          type: DELIVERY_ACTIONS.SET_ERROR,
          payload: error.message || 'Failed to load active delivery'
        });
      }
      dispatch({ type: DELIVERY_ACTIONS.SET_ACTIVE_DELIVERY, payload: null });
    }
  };

  // Load delivery history
  const loadDeliveryHistory = async (page = 1, limit = 20) => {
    try {
      dispatch({ type: DELIVERY_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR });

      const response = await driverApiService.getDeliveryHistory({ page, limit });
      dispatch({
        type: DELIVERY_ACTIONS.SET_DELIVERY_HISTORY,
        payload: response.data.deliveries || []
      });
    } catch (error) {
      console.error('Failed to load delivery history:', error);
      dispatch({
        type: DELIVERY_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to load delivery history'
      });
    }
  };

  // Accept delivery
  const acceptDelivery = async (deliveryId) => {
    try {
      dispatch({ type: DELIVERY_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR });

      const response = await driverApiService.acceptDelivery(deliveryId);
      
      // Remove from available deliveries
      dispatch({
        type: DELIVERY_ACTIONS.REMOVE_AVAILABLE_DELIVERY,
        payload: deliveryId
      });

      // Set as active delivery
      dispatch({
        type: DELIVERY_ACTIONS.SET_ACTIVE_DELIVERY,
        payload: response.data.delivery
      });

      return response.data.delivery;
    } catch (error) {
      console.error('Failed to accept delivery:', error);
      dispatch({
        type: DELIVERY_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to accept delivery'
      });
      throw error;
    }
  };

  // Update delivery status
  const updateDeliveryStatus = async (deliveryId, status, updates = {}) => {
    try {
      dispatch({ type: DELIVERY_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR });

      const response = await driverApiService.updateDeliveryStatus(deliveryId, {
        status,
        ...updates
      });

      dispatch({
        type: DELIVERY_ACTIONS.UPDATE_DELIVERY_STATUS,
        payload: {
          deliveryId,
          status,
          updates: response.data.delivery
        }
      });

      // If delivery is completed, clear active delivery
      if (status === DELIVERY_STATES.DELIVERED || status === DELIVERY_STATES.CANCELLED) {
        dispatch({ type: DELIVERY_ACTIONS.SET_ACTIVE_DELIVERY, payload: null });
        // Refresh delivery history
        loadDeliveryHistory();
      }

      return response.data.delivery;
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      dispatch({
        type: DELIVERY_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to update delivery status'
      });
      throw error;
    }
  };

  // Mark pickup complete
  const markPickupComplete = async (deliveryId, pickupPhotos = []) => {
    return updateDeliveryStatus(deliveryId, DELIVERY_STATES.PICKUP_COMPLETED, {
      pickupTime: new Date().toISOString(),
      pickupPhotos
    });
  };

  // Mark delivery complete
  const markDeliveryComplete = async (deliveryId, deliveryPhotos = [], customerSignature = null) => {
    return updateDeliveryStatus(deliveryId, DELIVERY_STATES.DELIVERED, {
      deliveredTime: new Date().toISOString(),
      deliveryPhotos,
      customerSignature
    });
  };

  // Cancel delivery
  const cancelDelivery = async (deliveryId, reason) => {
    return updateDeliveryStatus(deliveryId, DELIVERY_STATES.CANCELLED, {
      cancelledTime: new Date().toISOString(),
      cancelReason: reason
    });
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([
      loadAvailableDeliveries(),
      loadActiveDelivery(),
      loadDeliveryHistory()
    ]);
  };

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated && driver) {
      refreshData();
    }
  }, [isAuthenticated, driver]);

  // Auto-refresh available deliveries every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !driver) return;

    const interval = setInterval(() => {
      loadAvailableDeliveries();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, driver]);

  const value = {
    // State
    ...state,
    
    // Constants
    DELIVERY_STATES,
    
    // Actions
    loadAvailableDeliveries,
    loadActiveDelivery,
    loadDeliveryHistory,
    acceptDelivery,
    updateDeliveryStatus,
    markPickupComplete,
    markDeliveryComplete,
    cancelDelivery,
    refreshData,
    
    // Utilities
    clearError: () => dispatch({ type: DELIVERY_ACTIONS.CLEAR_ERROR })
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
}

export { DELIVERY_STATES };