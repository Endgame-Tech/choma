import { io, Socket } from 'socket.io-client';
import { DeliveryAssignment, Location } from '../types';

interface SocketEvents {
  connected: (data: { message: string; driverId: string; timestamp: string }) => void;
  new_assignment: (assignment: DeliveryAssignment) => void;
  assignment_update: (data: { assignmentId: string; status: string; [key: string]: any }) => void;
  notification: (notification: {
    title: string;
    body: string;
    data: any;
    priority: string;
    timestamp: string;
  }) => void;
  pong: (data: { timestamp: string }) => void;
  force_disconnect: (data: { reason: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: { [event: string]: Function[] } = {};

  // Get WebSocket URL
  private getSocketUrl(): string {
  const WEBSOCKET_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
  return WEBSOCKET_URL;
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }
      const token = localStorage.getItem('driverToken');
      
      if (!token) {
        reject(new Error('No authentication token found'));
        return;
      }

      try {
  this.socket = io(this.getSocketUrl(), {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          path: '/socket.io',
          forceNew: true,
          reconnection: true,
          reconnectionDelay: this.reconnectInterval,
          reconnectionAttempts: this.maxReconnectAttempts
        });

        // Track whether we've already settled the promise
        let settled = false;
        const connectionTimeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            console.error('[WS] WebSocket connection timeout');
            try {
              this.socket?.disconnect();
            } catch (e) {
              // ignore
            }
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10s timeout

        this.socket.on('connect', () => {
          if (settled) return;
          settled = true;
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connected', (data) => {
          console.log('[WS] Driver connection confirmed:', data);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[WS] Connection error:', error);
          if (!settled) {
            settled = true;
            clearTimeout(connectionTimeout);
            reject(error);
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected:', reason)
          
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Server or client initiated disconnect - don't auto reconnect
            return;
          }
          
          // Try to reconnect for other reasons
          this.handleReconnect();
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
          this.reconnectAttempts = 0;
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('❌ Reconnect error:', error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('💀 Max reconnect attempts reached');
            try {
              if (!settled) {
                settled = true;
                clearTimeout(connectionTimeout);
                reject(new Error('Max reconnect attempts reached'));
              }
            } finally {
              this.disconnect();
            }
          }
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('❌ Reconnect error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('💀 Max reconnect attempts reached');
            this.disconnect();
          }
        });

        this.socket.on('force_disconnect', (data) => {
          console.warn('⚠️ Server forced disconnect:', data.reason);
          alert(`Connection closed: ${data.reason}`);
          this.disconnect();
          try {
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              if (currentPath !== '/login') {
                window.location.replace('/login');
              } else {
                // already on login; skip reload to avoid loops
                // eslint-disable-next-line no-console
                console.warn('force_disconnect received while on /login - skipping redirect');
              }
            }
          } catch (e) {
            // ignore
          }
        });

        // Setup event forwarding
        this.setupEventForwarding();

      } catch (error) {
        console.error('Failed to create socket connection:', error);
        reject(error);
      }
    });
  }

  // Setup event forwarding to registered listeners
  private setupEventForwarding() {
    if (!this.socket) return;

    const events: (keyof SocketEvents)[] = [
      'new_assignment',
      'assignment_update', 
      'notification',
      'pong'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data: any) => {
        this.emit(event, data);
      });
    });
  }

  // Handle reconnection
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners = {};
    console.log('🔌 Disconnected from delivery service');
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Update driver location
  updateLocation(location: Location) {
    if (this.socket?.connected) {
      this.socket.emit('location_update', {
        latitude: location.latitude,
        longitude: location.longitude
      });
    }
  }

  // Update assignment status
  updateAssignmentStatus(assignmentId: string, status: string) {
    if (this.socket?.connected) {
      this.socket.emit('assignment_status', {
        assignmentId,
        status
      });
    }
  }

  // Update driver status (online/offline/busy)
  updateDriverStatus(status: 'online' | 'offline' | 'busy') {
    if (this.socket?.connected) {
      this.socket.emit('status_change', {
        status
      });
    }
  }

  // Send ping to check connection
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Event listener management
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (!this.listeners[event]) return;

    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      this.listeners[event] = [];
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;