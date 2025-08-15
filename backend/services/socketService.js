const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedAdmins = new Map(); // Map of adminId -> { socketId, admin }
  }

  // Initialize socket.io with Express server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [
              process.env.ADMIN_FRONTEND_URL,
              process.env.CHEF_FRONTEND_URL,
              process.env.LANDING_PAGE_URL
            ].filter(Boolean)
          : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    // Middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          console.log('Socket connection rejected: No token provided');
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find admin
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin || !admin.isActive) {
          console.log('Socket connection rejected: Invalid admin or inactive status');
          return next(new Error('Authentication error: Invalid admin'));
        }

        // Attach admin to socket
        socket.admin = admin;
        socket.adminId = admin._id.toString();
        
        console.log(`Admin ${admin.email} authenticated for socket connection`);
        next();
      } catch (error) {
        console.error('Socket authentication error:', error.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('Socket.IO initialized for real-time notifications');
    return this.io;
  }

  // Handle new socket connection
  handleConnection(socket) {
    const adminId = socket.adminId;
    const admin = socket.admin;

    console.log(`Admin ${admin.email} connected via socket: ${socket.id}`);

    // Store connection
    this.connectedAdmins.set(adminId, {
      socketId: socket.id,
      admin: admin,
      connectedAt: new Date()
    });

    // Join admin-specific room
    socket.join(`admin_${adminId}`);
    socket.join('all_admins'); // For broadcast notifications

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to notification service',
      adminId: adminId,
      timestamp: new Date()
    });

    // Handle custom events
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Admin ${admin.email} disconnected: ${reason}`);
      this.connectedAdmins.delete(adminId);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for admin ${admin.email}:`, error);
    });
  }

  // Setup event handlers for socket
  setupEventHandlers(socket) {
    const adminId = socket.adminId;

    // Handle notification acknowledgment
    socket.on('notification_ack', (data) => {
      console.log(`Admin ${adminId} acknowledged notification: ${data.notificationId}`);
    });

    // Handle notification read
    socket.on('notification_read', (data) => {
      console.log(`Admin ${adminId} read notification: ${data.notificationId}`);
    });

    // Handle real-time status requests
    socket.on('get_status', () => {
      socket.emit('status', {
        connected: true,
        adminId: adminId,
        connectedAdmins: this.connectedAdmins.size,
        timestamp: new Date()
      });
    });

    // Handle ping-pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });
  }

  // Send notification to specific admin
  sendToAdmin(adminId, event, data) {
    try {
      const connection = this.connectedAdmins.get(adminId);
      if (connection) {
        this.io.to(`admin_${adminId}`).emit(event, {
          ...data,
          timestamp: new Date(),
          delivered: true
        });
        console.log(`Notification sent to admin ${adminId}: ${event}`);
        return true;
      } else {
        console.log(`Admin ${adminId} not connected - notification queued`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending notification to admin ${adminId}:`, error);
      return false;
    }
  }

  // Send notification to multiple admins
  sendToAdmins(adminIds, event, data) {
    let sentCount = 0;
    for (const adminId of adminIds) {
      if (this.sendToAdmin(adminId, event, data)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  // Broadcast notification to all connected admins
  broadcast(event, data) {
    try {
      this.io.to('all_admins').emit(event, {
        ...data,
        timestamp: new Date(),
        broadcast: true
      });
      console.log(`Broadcast notification sent: ${event} to ${this.connectedAdmins.size} admins`);
      return this.connectedAdmins.size;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      return 0;
    }
  }

  // Send notification based on notification object
  async sendNotification(notification) {
    try {
      const eventData = {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        severity: notification.severity,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        persistent: notification.persistent,
        securityEventType: notification.securityEventType,
        riskLevel: notification.riskLevel
      };

      return this.sendToAdmin(notification.adminId.toString(), 'new_notification', eventData);
    } catch (error) {
      console.error('Error sending notification via socket:', error);
      return false;
    }
  }

  // Send security alert
  async sendSecurityAlert(adminId, alert) {
    try {
      const eventData = {
        id: alert._id,
        title: alert.title,
        message: alert.message,
        securityEventType: alert.securityEventType,
        riskLevel: alert.riskLevel,
        affectedResource: alert.affectedResource,
        sourceIP: alert.sourceIP,
        recommendations: alert.recommendations,
        metadata: alert.metadata,
        createdAt: alert.createdAt
      };

      return this.sendToAdmin(adminId, 'security_alert', eventData);
    } catch (error) {
      console.error('Error sending security alert via socket:', error);
      return false;
    }
  }

  // Send system update notification
  broadcastSystemUpdate(update) {
    return this.broadcast('system_update', {
      title: update.title,
      message: update.message,
      type: 'system_update',
      severity: update.severity || 'info',
      metadata: update.metadata || {}
    });
  }

  // Send 2FA event notification
  send2FAEvent(adminId, event) {
    return this.sendToAdmin(adminId, '2fa_event', {
      action: event.action,
      success: event.success,
      timestamp: event.createdAt,
      riskLevel: event.riskLevel,
      details: event.details
    });
  }

  // Get connection statistics
  getStats() {
    return {
      connectedAdmins: this.connectedAdmins.size,
      connections: Array.from(this.connectedAdmins.entries()).map(([adminId, connection]) => ({
        adminId,
        email: connection.admin.email,
        connectedAt: connection.connectedAt,
        socketId: connection.socketId
      }))
    };
  }

  // Check if admin is connected
  isAdminConnected(adminId) {
    return this.connectedAdmins.has(adminId);
  }

  // Disconnect admin
  disconnectAdmin(adminId, reason = 'Server initiated disconnect') {
    const connection = this.connectedAdmins.get(adminId);
    if (connection) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.emit('force_disconnect', { reason });
        socket.disconnect(true);
      }
      this.connectedAdmins.delete(adminId);
      return true;
    }
    return false;
  }

  // Get socket.io instance
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();