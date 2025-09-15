const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Driver = require("../models/Driver");
const Customer = require("../models/Customer");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedAdmins = new Map();
    this.connectedDrivers = new Map();
    this.connectedCustomers = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? [
                process.env.ADMIN_FRONTEND_URL,
                process.env.CHEF_FRONTEND_URL,
                process.env.LANDING_PAGE_URL,
              ].filter(Boolean)
            : [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:3004", // Driver React app                
                "http://localhost:5173",
                "http://localhost:8081",
                "http://10.226.105.28:3002", // Driver app connecting to remote backend
                "http://10.226.105.28:3004", // Driver app connecting to remote backend
                "*", // Allow all origins in development (less secure but fixes CORS)
              ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      path: "/socket.io",
      transports: ["websocket", "polling"], // Prefer websocket over polling
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      allowUpgrades: true
    });

    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");
        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.adminId) {
          const admin = await Admin.findById(decoded.adminId).select(
            "-password"
          );
          if (!admin || !admin.isActive) {
            return next(new Error("Authentication error: Invalid admin"));
          }
          socket.user = admin;
          socket.userId = admin._id.toString();
          socket.userType = "admin";
        } else if (decoded.driverId) {
          const driver = await Driver.findById(decoded.driverId).select(
            "-password"
          );
          if (!driver || driver.accountStatus !== "approved") {
            return next(new Error("Authentication error: Invalid driver"));
          }
          socket.user = driver;
          socket.userId = driver._id.toString();
          socket.userType = "driver";
        } else if (decoded.id || decoded.customerId) {
          const customerId = decoded.id || decoded.customerId;
          const customer = await Customer.findById(customerId).select(
            "-password"
          );
          if (!customer || customer.status !== "Active") {
            return next(new Error("Authentication error: Invalid customer"));
          }
          socket.user = customer;
          socket.userId = customer._id.toString();
          socket.userType = "customer";
        } else {
          return next(new Error("Authentication error: Invalid token format"));
        }
        next();
      } catch (error) {
        next(new Error("Authentication error: Invalid token"));
      }
    });

    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    console.log("Socket.IO initialized for real-time notifications");
    return this.io;
  }

  handleConnection(socket) {
    if (socket.userType === "admin") {
      this.handleAdminConnection(socket);
    } else if (socket.userType === "driver") {
      this.handleDriverConnection(socket);
    } else if (socket.userType === "customer") {
      this.handleCustomerConnection(socket);
    }

    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });
  }

  handleAdminConnection(socket) {
    const adminId = socket.userId;
    this.connectedAdmins.set(adminId, {
      socketId: socket.id,
      admin: socket.user,
    });
    socket.join(`admin_${adminId}`);
    socket.join("all_admins");
    socket.emit("connected", { message: "Connected to notification service" });

    // Backwards compatibility: some deployments call setupEventHandlers after connecting.
    // Provide a safe no-op here so older code that expects this method won't crash.
    if (typeof this.setupEventHandlers === "function") {
      try {
        this.setupEventHandlers(socket);
      } catch (err) {
        console.error(
          "Error running setupEventHandlers for admin socket:",
          err
        );
      }
    }
  }

  // Optional hook for backwards compatibility. Newer code may set up per-socket admin
  // listeners by defining this method. Provide a no-op default so older deployments
  // that still call it don't cause the process to crash.
  setupEventHandlers(socket) {
    // no-op default. Override in runtime if needed.
    // Example override could attach socket.on('someEvent', handler) here.
    return;
  }

  handleDriverConnection(socket) {
    const driverId = socket.userId;
    this.connectedDrivers.set(driverId, {
      socketId: socket.id,
      driver: socket.user,
    });
    socket.join(`driver_${driverId}`);
    socket.join("all_drivers");
    socket.emit("connected", { 
      message: "Connected to delivery service",
      driverId: driverId 
    });

    // Handle location updates from driver
    socket.on('location_update', async (data) => {
      try {
        const { latitude, longitude, bearing, speed, accuracy, timestamp } = data;
        
        console.log(`🚗 Raw location update from driver ${driverId}:`, data);
        
        if (!latitude || !longitude) {
          console.log('❌ Invalid location data received from driver:', driverId);
          socket.emit('location_update_ack', {
            success: false,
            error: 'Invalid location coordinates'
          });
          return;
        }

        // Validate location accuracy - be more lenient for testing
        const locationAccuracy = accuracy || 0;
        if (locationAccuracy > 500000) { // 500km threshold for testing
          console.log(`⚠️ Extremely low accuracy location from driver ${driverId}: ${locationAccuracy}m - rejecting`);
          socket.emit('location_update_ack', {
            success: false,
            error: `Location accuracy too low (${Math.round(locationAccuracy)}m). Please wait for better GPS signal.`,
            accuracy: locationAccuracy
          });
          return;
        }

        // Accept IP-based location for testing with warning
        if (locationAccuracy > 100000) {
          console.log(`⚠️ Using IP-based location for testing from driver ${driverId}: ${locationAccuracy}m`);
        }

        // Validate timestamp freshness (optional - reject very stale data)
        if (timestamp) {
          const locationTime = new Date(timestamp).getTime();
          const now = Date.now();
          const ageMinutes = (now - locationTime) / (1000 * 60);
          if (ageMinutes > 5) {
            console.log(`⚠️ Stale location from driver ${driverId}: ${ageMinutes.toFixed(1)} minutes old`);
            socket.emit('location_update_ack', {
              success: false,
              error: 'Location data is too old',
              age: ageMinutes
            });
            return;
          }
        }

        console.log(`📍 High-accuracy GPS update from driver ${driverId}:`, { 
          latitude, 
          longitude, 
          accuracy: `${Math.round(locationAccuracy)}m`,
          source: locationAccuracy <= 20 ? 'GPS' : locationAccuracy <= 100 ? 'Network-assisted GPS' : 'Network/IP'
        });

        // Get driver info but don't update database for real-time tracking
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(driverId);
        
        if (driver) {
          // Update driver's location in the database
          await driver.updateLocation([longitude, latitude]);

          const DriverAssignment = require('../models/DriverAssignment');
          
          // Find all orders being delivered by this driver
          const activeAssignments = await DriverAssignment.find({
            driverId: driverId,
            status: { $in: ['assigned', 'picked_up', 'in_transit'] }
          }).populate('orderId');

          // Broadcast location to each active order's tracking session using Socket.IO rooms
          for (const assignment of activeAssignments) {
            const orderId = assignment.orderId._id.toString();
            const locationData = {
              latitude,
              longitude,
              bearing: bearing || 0,
              speed: speed || 0,
              accuracy: accuracy || 10,
              timestamp: new Date().toISOString(),
              driverId: driverId,
              driverName: driver.fullName
            };

            console.log(`📡 Broadcasting location for order ${orderId} to room tracking_${orderId}`);
            this.io.to(`tracking_${orderId}`).emit('driver_location', locationData);
          }

          // Send acknowledgment back to driver
          socket.emit('location_update_ack', {
            success: true,
            timestamp: new Date().toISOString(),
            activeDeliveries: activeAssignments.length,
            accuracy: locationAccuracy,
            source: locationAccuracy <= 20 ? 'GPS' : locationAccuracy <= 100 ? 'Network-assisted GPS' : 'Network/IP'
          });
        }
      } catch (error) {
        console.error('❌ Error handling location update:', error);
        socket.emit('location_update_ack', {
          success: false,
          error: error.message
        });
      }
    });

    // Handle driver status updates
    socket.on('driver_status_update', async (data) => {
      try {
        const { status } = data;
        console.log(`👷 Driver ${driverId} status update:`, status);

        const Driver = require('../models/Driver');
        await Driver.findByIdAndUpdate(driverId, { 
          status: status,
          isAvailable: status === 'online'
        });

        socket.emit('driver_status_update_ack', { success: true });
      } catch (error) {
        console.error('❌ Error updating driver status:', error);
        socket.emit('driver_status_update_ack', { success: false, error: error.message });
      }
    });
  }

  handleCustomerConnection(socket) {
    const customerId = socket.userId;
    this.connectedCustomers.set(customerId, {
      socketId: socket.id,
      customer: socket.user,
    });
    socket.join(`customer_${customerId}`);
    socket.emit("connected", {
      message: "Connected to Choma real-time service",
    });

    // Handle tracking subscriptions
    socket.on('track_order', async (data) => {
      try {
        const { orderId } = data;
        if (!orderId) {
          socket.emit('track_order_error', { error: 'Order ID required' });
          return;
        }

        console.log(`📱 Customer ${customerId} subscribing to track order ${orderId}`);
        
        // Join tracking room for this order
        socket.join(`tracking_${orderId}`);
        
        // Send current driver info if available
        const DriverAssignment = require('../models/DriverAssignment');
        const Driver = require('../models/Driver');
        
        const assignment = await DriverAssignment.findOne({
          orderId: orderId,
          status: { $in: ['assigned', 'picked_up', 'in_transit'] }
        }).populate('driverId');

        if (assignment && assignment.driverId) {
          const driver = assignment.driverId;
          
          // Send current driver info
          socket.emit('driver_info', {
            name: driver.fullName,
            phone: driver.phone,
            vehicle: `${driver.vehicleInfo?.type || 'Vehicle'} ${driver.vehicleInfo?.model || ''} - ${driver.vehicleInfo?.plateNumber || ''}`,
            rating: driver.rating || { average: 5, count: 0 },
            profileImage: driver.profileImage || 'https://via.placeholder.com/100x100'
          });

          // Send current location if available
          if (driver.currentLocation && driver.currentLocation.coordinates) {
            const locationData = {
              latitude: driver.currentLocation.coordinates[1],
              longitude: driver.currentLocation.coordinates[0],
              accuracy: 10,
              bearing: 0,
              speed: 0,
              timestamp: driver.currentLocation.lastUpdated || new Date().toISOString(),
              driverId: driver._id.toString(),
              driverName: driver.fullName
            };
            
            console.log(`📍 Sending stored location to customer for order ${orderId}:`, locationData);
            socket.emit('driver_location', locationData);
            
            // Also broadcast to room for any other listeners
            this.io.to(`tracking_${orderId}`).emit('driver_location', locationData);
          }

          // Send current tracking status
          socket.emit('tracking_status', {
            status: assignment.status,
            message: this.getStatusMessage(assignment.status),
            timestamp: new Date().toISOString()
          });
        }

        socket.emit('track_order_success', { orderId, message: 'Successfully subscribed to order tracking' });
        
      } catch (error) {
        console.error('❌ Error handling track_order:', error);
        socket.emit('track_order_error', { error: error.message });
      }
    });

    // Handle unsubscribe from tracking
    socket.on('untrack_order', (data) => {
      const { orderId } = data;
      if (orderId) {
        console.log(`📱 Customer ${customerId} unsubscribing from order ${orderId}`);
        socket.leave(`tracking_${orderId}`);
        socket.emit('untrack_order_success', { orderId });
      }
    });
  }

  getStatusMessage(status) {
    const messages = {
      'assigned': 'Driver assigned to your order',
      'picked_up': 'Driver has picked up your order', 
      'in_transit': 'Your order is on the way',
      'delivered': 'Order delivered successfully'
    };
    return messages[status] || 'Order status updated';
  }

  handleDisconnect(socket) {
    if (socket.userType === "admin") {
      this.connectedAdmins.delete(socket.userId);
    } else if (socket.userType === "driver") {
      this.connectedDrivers.delete(socket.userId);
    } else if (socket.userType === "customer") {
      this.connectedCustomers.delete(socket.userId);
    }
  }

  sendToAdmin(adminId, event, data) {
    const connection = this.connectedAdmins.get(adminId.toString());
    if (connection) {
      this.io.to(connection.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToDriver(driverId, event, data) {
    const connection = this.connectedDrivers.get(driverId.toString());
    if (connection) {
      this.io.to(connection.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToCustomer(customerId, event, data) {
    const connection = this.connectedCustomers.get(customerId.toString());
    if (connection) {
      this.io.to(connection.socketId).emit(event, data);
      console.log(`Event [${event}] sent to customer ${customerId}`);
      return true;
    }
    console.log(
      `Customer ${customerId} not connected, cannot send event [${event}]`
    );
    return false;
  }

  broadcastToAdmins(event, data) {
    this.io.to("all_admins").emit(event, data);
  }

  broadcastToDrivers(event, data) {
    this.io.to("all_drivers").emit(event, data);
  }

  getIO() {
    return this.io;
  }
}

module.exports = new SocketService();
