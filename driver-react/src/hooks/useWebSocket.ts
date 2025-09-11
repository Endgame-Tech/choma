import { useEffect, useCallback, useState } from 'react';
import websocketService from '../services/websocket';
import { DeliveryAssignment } from '../types';

interface WebSocketStatus {
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  status: WebSocketStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  updateLocation: (latitude: number, longitude: number) => void;
  updateAssignmentStatus: (assignmentId: string, status: string) => void;
  updateDriverStatus: (status: 'online' | 'offline' | 'busy') => void;
  ping: () => void;
  // Each listener returns an unsubscribe function so callers can cleanup.
  onNewAssignment: (callback: (assignment: DeliveryAssignment) => void) => () => void;
  onAssignmentUpdate: (callback: (data: { assignmentId: string; status: string; [key: string]: any }) => void) => () => void;
  onNotification: (callback: (notification: {
    title: string;
    body: string;
    data: any;
    priority: string;
    timestamp: string;
  }) => void) => () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });

  // Update connection status
  const updateStatus = useCallback(() => {
    const socketStatus = websocketService.getStatus();
    setIsConnected(socketStatus.connected);
    setStatus(socketStatus);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      await websocketService.connect();
      updateStatus();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      updateStatus();
      throw error;
    }
  }, [updateStatus]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    updateStatus();
  }, [updateStatus]);

  // Update driver location
  const updateLocation = useCallback((latitude: number, longitude: number) => {
    websocketService.updateLocation({ latitude, longitude });
  }, []);

  // Update assignment status
  const updateAssignmentStatus = useCallback((assignmentId: string, status: string) => {
    websocketService.updateAssignmentStatus(assignmentId, status);
  }, []);

  // Update driver status
  const updateDriverStatus = useCallback((status: 'online' | 'offline' | 'busy') => {
    websocketService.updateDriverStatus(status);
  }, []);

  // Send ping
  const ping = useCallback(() => {
    websocketService.ping();
  }, []);

  // Event listeners
  const onNewAssignment = useCallback((callback: (assignment: DeliveryAssignment) => void) => {
    websocketService.on('new_assignment', callback);
    return () => websocketService.off('new_assignment', callback);
  }, []);

  const onAssignmentUpdate = useCallback((callback: (data: { assignmentId: string; status: string; [key: string]: any }) => void) => {
    websocketService.on('assignment_update', callback);
    return () => websocketService.off('assignment_update', callback);
  }, []);

  const onNotification = useCallback((callback: (notification: {
    title: string;
    body: string;
    data: any;
    priority: string;
    timestamp: string;
  }) => void) => {
    websocketService.on('notification', callback);
    return () => websocketService.off('notification', callback);
  }, []);

  // Auto-connect on mount if we have a token
  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    if (token && !isConnected) {
      connect().catch(error => {
        console.warn('WebSocket connection failed, continuing without real-time features:', error.message);
      });
    }

    // Update status periodically (reduced frequency)
    const statusInterval = setInterval(updateStatus, 30000); // Every 30 seconds instead of 5
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [connect, isConnected, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    status,
    connect,
    disconnect,
    updateLocation,
    updateAssignmentStatus,
    updateDriverStatus,
    ping,
    onNewAssignment,
    onAssignmentUpdate,
    onNotification
  };
};