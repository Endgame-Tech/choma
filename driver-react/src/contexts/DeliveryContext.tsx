import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeliveryAssignment, PickupConfirmationData, DeliveryConfirmationData } from '../types';
import { driverApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

import { useAuth } from './AuthContext';

interface DeliveryContextType {
  assignments: DeliveryAssignment[];
  loading: boolean;
  error: string | null;
  refreshAssignments: () => Promise<void>;
  getAssignmentById: (id: string) => DeliveryAssignment | undefined;
  acceptAssignment: (id: string) => Promise<{ success: boolean; message?: string }>;
  confirmPickup: (id: string, data: PickupConfirmationData) => Promise<{ success: boolean; message?: string }>;
  confirmDelivery: (id: string, data: DeliveryConfirmationData) => Promise<{ success: boolean; message?: string }>;
  updateDeliveryStatus: (id: string, status: DeliveryAssignment['status']) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};

interface DeliveryProviderProps {
  children: React.ReactNode;
}

export const DeliveryProvider: React.FC<DeliveryProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    onNewAssignment,
    onAssignmentUpdate,
    updateAssignmentStatus: wsUpdateStatus
  } = useWebSocket();

  // Load assignments on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshAssignments();
    }
  }, [isAuthenticated]);

  // Setup WebSocket listeners
  useEffect(() => {
    const maybeUnsubscribeNewAssignment = onNewAssignment((assignment) => {
      setAssignments(prev => [assignment, ...prev]);
    });
    const unsubscribeNewAssignment: (() => void) | undefined = typeof maybeUnsubscribeNewAssignment === 'function'
      ? maybeUnsubscribeNewAssignment
      : undefined;

    const maybeUnsubscribeAssignmentUpdate = onAssignmentUpdate((data) => {
      const allowedStatuses: DeliveryAssignment['status'][] = [
        'available',
        'assigned',
        'picked_up',
        'delivered',
        'cancelled'
      ];
      if (allowedStatuses.includes(data.status as DeliveryAssignment['status'])) {
        updateDeliveryStatus(data.assignmentId, data.status as DeliveryAssignment['status']);
      } else {
        console.warn(`Received unknown status: ${data.status}`);
      }
    });
    const unsubscribeAssignmentUpdate: (() => void) | undefined = typeof maybeUnsubscribeAssignmentUpdate === 'function'
      ? maybeUnsubscribeAssignmentUpdate
      : undefined;

    return () => {
      if (typeof unsubscribeNewAssignment === 'function') (unsubscribeNewAssignment as any)();
      if (typeof unsubscribeAssignmentUpdate === 'function') (unsubscribeAssignmentUpdate as any)();
    };
  }, [onNewAssignment, onAssignmentUpdate]);

  const refreshAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await driverApi.getAssignments();
      if (response.success) {
        if (response.data) {
          setAssignments(response.data);
        }
      } else {
        setError(response.message || 'Failed to load assignments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentById = (id: string) => {
    return assignments.find(assignment => assignment._id === id);
  };

  const acceptAssignment = async (id: string) => {
    try {
      const response = await driverApi.acceptAssignment(id);

      if (response.success) {
        // Update local state
        setAssignments(prev =>
          prev.map(assignment =>
            assignment._id === id
              ? { ...assignment, status: 'assigned' }
              : assignment
          )
        );

        // Update via WebSocket
        wsUpdateStatus(id, 'assigned');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to accept assignment'
      };
    }
  };

  const confirmPickup = async (id: string, data: PickupConfirmationData) => {
    try {
      const response = await driverApi.confirmPickup(id, data);

      if (response.success) {
        // Update local state
        setAssignments(prev =>
          prev.map(assignment =>
            assignment._id === id
              ? { ...assignment, status: 'picked_up' }
              : assignment
          )
        );

        // Update via WebSocket
        wsUpdateStatus(id, 'picked_up');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to confirm pickup'
      };
    }
  };

  const confirmDelivery = async (id: string, data: DeliveryConfirmationData) => {
    try {
      const response = await driverApi.confirmDelivery(id, data);

      if (response.success) {
        // Update local state
        setAssignments(prev =>
          prev.map(assignment =>
            assignment._id === id
              ? { ...assignment, status: 'delivered' }
              : assignment
          )
        );

        // Update via WebSocket
        wsUpdateStatus(id, 'delivered');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to confirm delivery'
      };
    }
  };

  const updateDeliveryStatus = (
    id: string,
    status: DeliveryAssignment['status']
  ) => {
    setAssignments(prev =>
      prev.map(assignment =>
        assignment._id === id
          ? { ...assignment, status }
          : assignment
      )
    );
  };

  const value: DeliveryContextType = {
    assignments,
    loading,
    error,
    refreshAssignments,
    getAssignmentById,
    acceptAssignment,
    confirmPickup,
    confirmDelivery,
    updateDeliveryStatus
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};