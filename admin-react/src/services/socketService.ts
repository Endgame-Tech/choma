import { io, Socket } from 'socket.io-client';
import { Notification, SecurityNotification } from '../types/notifications';

// These interface match the types expected by NotificationContext
export interface SystemUpdatePayload {
  message: string;
}

export interface TwoFactorAuthEvent {
  success: boolean;
  action: string;
}

// Type alias for compatibility with NotificationContext
export type SystemUpdate = SystemUpdatePayload;

interface SocketServiceInterface {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  onNewNotification: (callback: (notification: Notification) => void) => void;
  onSecurityAlert: (callback: (alert: SecurityNotification) => void) => void;
  onSystemUpdate: (callback: (update: SystemUpdatePayload) => void) => void;
  on2FAEvent: (callback: (event: TwoFactorAuthEvent) => void) => void;
  acknowledgeNotification: (notificationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  getConnectionStatus: () => boolean;
}

class SocketService implements SocketServiceInterface {
  public socket: Socket | null = null;
  public isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]> = new Map();

  constructor() {
    this.initializeEventMaps();
  }

  private initializeEventMaps() {
    this.eventCallbacks.set('new_notification', []);
    this.eventCallbacks.set('security_alert', []);
    this.eventCallbacks.set('system_update', []);
    this.eventCallbacks.set('2fa_event', []);
  }

  public connect(): void {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    const token = localStorage.getItem('choma-admin-token');
    if (!token) {
      console.warn('🔌 No authentication token found');
      return;
    }

    console.log('🔌 Connecting to WebSocket server...');

    try {
      this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3001', {
        auth: { token },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('🔌 Socket connection error:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
      if (error.message.includes('Authentication error')) {
        console.error('🔌 Authentication failed. Clearing token and stopping reconnection.');
        localStorage.removeItem('choma-admin-token');
        this.disconnect();
      } else {
        this.handleReconnection();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Reconnection error:', error);
      this.handleReconnection();
    });

    this.socket.on('new_notification', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);
      this.triggerCallbacks('new_notification', notification);
    });

    this.socket.on('security_alert', (alert: SecurityNotification) => {
      console.log('🚨 Security alert received:', alert);
      this.triggerCallbacks('security_alert', alert);
    });

    this.socket.on('system_update', (update: SystemUpdatePayload) => {
      console.log('⚙️ System update received:', update);
      this.triggerCallbacks('system_update', update);
    });

    this.socket.on('2fa_event', (event: TwoFactorAuthEvent) => {
      console.log('🔐 2FA event received:', event);
      this.triggerCallbacks('2fa_event', event);
    });

    this.socket.on('auth_error', (data: { message: string }) => {
      console.error('🔌 Authentication error:', data.message);
      localStorage.removeItem('choma-admin-token');
      this.disconnect();
    });

    this.socket.on('force_disconnect', (data: { reason: string }) => {
      console.warn('🔌 Forced disconnect:', data.reason);
      this.disconnect();
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔌 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      console.log('🔌 Disconnecting from WebSocket server');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  private addCallback(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(event, callbacks);
  }

  private triggerCallbacks(event: string, data: unknown): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      callback(data);
    });
  }

  // Public event subscription methods
  public onNewNotification(callback: (notification: Notification) => void): void {
    this.addCallback('new_notification', callback as (data: unknown) => void);
  }

  public onSecurityAlert(callback: (alert: SecurityNotification) => void): void {
    this.addCallback('security_alert', callback as (data: unknown) => void);
  }

  public onSystemUpdate(callback: (update: SystemUpdatePayload) => void): void {
    this.addCallback('system_update', callback as (data: unknown) => void);
  }

  public on2FAEvent(callback: (event: TwoFactorAuthEvent) => void): void {
    this.addCallback('2fa_event', callback as (data: unknown) => void);
  }

  // Client-to-server events
  public acknowledgeNotification(notificationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('notification_ack', { notificationId });
    }
  }

  public markNotificationRead(notificationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('notification_read', { notificationId });
    }
  }

  public requestStatus(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('status_request');
    }
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && this.socket !== null;
  }

  public forceReconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  public removeCallback(event: string, callback: (data: Notification | SecurityNotification | SystemUpdatePayload | TwoFactorAuthEvent) => void): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    const index = callbacks.indexOf(callback as (data: unknown) => void);
    if (index > -1) {
      callbacks.splice(index, 1);
      this.eventCallbacks.set(event, callbacks);
    }
  }

  public async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }

      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) {
          responded = true;
          resolve(false);
        }
      }, 5000);

      this.socket.once('pong', () => {
        if (!responded) {
          responded = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });

      this.socket.emit('ping');
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Auto-connect when authenticated
const checkAutoConnect = () => {
  const token = localStorage.getItem('choma-admin-token');
  if (token && !socketService.getConnectionStatus()) {
    console.log('🔌 Auto-connecting to WebSocket with existing token');
    socketService.connect();
  }
};

// Listen for storage changes to handle login/logout
window.addEventListener('storage', (event) => {
  if (event.key === 'choma-admin-token') {
    if (event.newValue) {
      // Token added - connect
      socketService.connect();
    } else {
      // Token removed - disconnect
      socketService.disconnect();
    }
  }
});

// Auto-connect on page load if token exists
if (typeof window !== 'undefined') {
  checkAutoConnect();
}

export default socketService;