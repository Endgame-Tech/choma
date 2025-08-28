const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedAdmins = new Map(); // Map of adminId -> { socketId, admin }
    this.connectedDrivers = new Map(); // Map of driverId -> { socketId, driver }
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

        // Check if database is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
          console.log('Socket connection rejected: Database not connected');
          return next(new Error('Authentication error: Database not available'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's admin or driver token
        if (decoded.adminId) {
          // Admin authentication
          const admin = await Admin.findById(decoded.adminId).select('-password');
          if (!admin || !admin.isActive) {
            console.log('Socket connection rejected: Invalid admin or inactive status');
            return next(new Error('Authentication error: Invalid admin'));
          }

          socket.admin = admin;
          socket.adminId = admin._id.toString();
          socket.userType = 'admin';
          console.log(`Admin ${admin.email} authenticated for socket connection`);
          
        } else if (decoded.driverId) {
          // Driver authentication
          const driver = await Driver.findById(decoded.driverId).select('-password');
          if (!driver || driver.accountStatus !== 'approved') {
            console.log('Socket connection rejected: Invalid driver or not approved');
            return next(new Error('Authentication error: Invalid driver'));
          }

          socket.driver = driver;
          socket.driverId = driver._id.toString();
          socket.userType = 'driver';
          console.log(`Driver ${driver.driverId} authenticated for socket connection`);
          
        } else {
          console.log('Socket connection rejected: No valid user ID in token');
          return next(new Error('Authentication error: Invalid token format'));
        }
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
    if (socket.userType === 'admin') {
      this.handleAdminConnection(socket);
    } else if (socket.userType === 'driver') {
      this.handleDriverConnection(socket);
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  // Handle admin connection
  handleAdminConnection(socket) {
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

    // Setup admin-specific event handlers
    this.setupAdminEventHandlers(socket);
  }

  // Handle driver connection
  handleDriverConnection(socket) {
    const driverId = socket.driverId;
    const driver = socket.driver;

    console.log(`Driver ${driver.driverId} connected via socket: ${socket.id}`);

    // Store connection
    this.connectedDrivers.set(driverId, {
      socketId: socket.id,
      driver: driver,
      connectedAt: new Date()
    });

    // Join driver-specific room
    socket.join(`driver_${driverId}`);
    socket.join('all_drivers'); // For broadcast notifications

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to delivery service',
      driverId: driverId,
      timestamp: new Date()
    });

    // Setup driver-specific event handlers
    this.setupDriverEventHandlers(socket);
  }

  // Handle disconnect for both admin and driver
  handleDisconnect(socket) {
    if (socket.userType === 'admin') {
      const adminId = socket.adminId;
      console.log(`Admin ${socket.admin?.email} disconnected`);
      this.connectedAdmins.delete(adminId);
    } else if (socket.userType === 'driver') {
      const driverId = socket.driverId;
      console.log(`Driver ${socket.driver?.driverId} disconnected`);
      this.connectedDrivers.delete(driverId);
    }
  }

  // Setup admin-specific event handlers
  setupAdminEventHandlers(socket) {
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

  // Setup driver-specific event handlers
  setupDriverEventHandlers(socket) {
    const driverId = socket.driverId;

    // Handle location updates
    socket.on('location_update', async (data) => {
      try {
        const { latitude, longitude } = data;
        await Driver.findByIdAndUpdate(driverId, {
          'currentLocation.coordinates': [longitude, latitude],
          'currentLocation.updatedAt': new Date()
        });
        
        // Broadcast location to admins monitoring this driver
        this.io.to('all_admins').emit('driver_location_update', {
          driverId,
          location: { latitude, longitude },
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Handle assignment status updates
    socket.on('assignment_status', (data) => {
      const { assignmentId, status } = data;
      console.log(`Driver ${driverId} updated assignment ${assignmentId} status to ${status}`);
      
      // Notify admins of status change
      this.io.to('all_admins').emit('assignment_status_change', {
        driverId,
        assignmentId,
        status,
        timestamp: new Date()
      });
    });

    // Handle driver status changes
    socket.on('status_change', async (data) => {
      try {
        const { status } = data;
        await Driver.findByIdAndUpdate(driverId, { status });
        
        // Notify admins
        this.io.to('all_admins').emit('driver_status_change', {
          driverId,
          status,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Driver status change error:', error);
      }
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

  // Send notification to specific driver
  sendToDriver(driverId, event, data) {
    try {
      const connection = this.connectedDrivers.get(driverId);
      if (connection) {
        this.io.to(`driver_${driverId}`).emit(event, {
          ...data,
          timestamp: new Date(),
          delivered: true
        });
        console.log(`Notification sent to driver ${driverId}: ${event}`);
        return true;
      } else {
        console.log(`Driver ${driverId} not connected - notification queued`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending notification to driver ${driverId}:`, error);
      return false;
    }
  }

  // Send notification to multiple drivers
  sendToDrivers(driverIds, event, data) {
    let sentCount = 0;
    for (const driverId of driverIds) {
      if (this.sendToDriver(driverId, event, data)) {
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

  // Broadcast to all drivers
  broadcastToDrivers(event, data) {
    try {
      this.io.to('all_drivers').emit(event, {
        ...data,
        timestamp: new Date(),
        broadcast: true
      });
      console.log(`Broadcast notification sent: ${event} to ${this.connectedDrivers.size} drivers`);
      return this.connectedDrivers.size;
    } catch (error) {
      console.error('Error broadcasting notification to drivers:', error);
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
      connectedDrivers: this.connectedDrivers.size,
      adminConnections: Array.from(this.connectedAdmins.entries()).map(([adminId, connection]) => ({
        adminId,
        email: connection.admin.email,
        connectedAt: connection.connectedAt,
        socketId: connection.socketId
      })),
      driverConnections: Array.from(this.connectedDrivers.entries()).map(([driverId, connection]) => ({
        driverId,
        driverId: connection.driver.driverId,
        fullName: connection.driver.fullName,
        connectedAt: connection.connectedAt,
        socketId: connection.socketId
      }))
    };
  }

  // Check if admin is connected
  isAdminConnected(adminId) {
    return this.connectedAdmins.has(adminId);
  }

  // Check if driver is connected
  isDriverConnected(driverId) {
    return this.connectedDrivers.has(driverId);
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

  // Disconnect driver
  disconnectDriver(driverId, reason = 'Server initiated disconnect') {
    const connection = this.connectedDrivers.get(driverId);
    if (connection) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.emit('force_disconnect', { reason });
        socket.disconnect(true);
      }
      this.connectedDrivers.delete(driverId);
      return true;
    }
    return false;
  }

  // Send delivery assignment notification to driver
  sendDeliveryAssignment(driverId, assignment) {
    return this.sendToDriver(driverId, 'new_assignment', {
      id: assignment._id,
      orderId: assignment.orderId,
      pickupLocation: assignment.pickupLocation,
      deliveryLocation: assignment.deliveryLocation,
      estimatedPickupTime: assignment.estimatedPickupTime,
      estimatedDeliveryTime: assignment.estimatedDeliveryTime,
      totalEarning: assignment.totalEarning,
      priority: assignment.priority,
      specialInstructions: assignment.specialInstructions
    });
  }

  // Send assignment status update notification
  sendAssignmentUpdate(driverId, assignmentId, status, data = {}) {
    return this.sendToDriver(driverId, 'assignment_update', {
      assignmentId,
      status,
      ...data
    });
  }

  // Get socket.io instance
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();