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
      transports: ["polling", "websocket"], // Try polling first, then websocket
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
        const { latitude, longitude, bearing, speed, accuracy } = data;
        
        console.log(`🚗 Raw location update from driver ${driverId}:`, data);
        
        if (!latitude || !longitude) {
          console.log('❌ Invalid location data received from driver:', driverId);
          return;
        }

        console.log(`📍 Valid location update from driver ${driverId}:`, { latitude, longitude });

        // Update driver location in database
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(driverId);
        
        if (driver) {
          await driver.updateLocation([longitude, latitude]);

          // Broadcast location to active tracking sessions
          const driverTrackingService = require('./driverTrackingWebSocketService');
          const DriverAssignment = require('../models/DriverAssignment');
          
          // Find all orders being delivered by this driver
          const activeAssignments = await DriverAssignment.find({
            driverId: driverId,
            status: { $in: ['assigned', 'picked_up', 'in_transit'] }
          }).populate('orderId');

          // Broadcast location to each active order's tracking session
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

            console.log(`📡 Broadcasting location for order ${orderId}`);
            driverTrackingService.sendTrackingUpdate(orderId, 'driver_location', locationData);
          }

          // Send acknowledgment back to driver
          socket.emit('location_update_ack', {
            success: true,
            timestamp: new Date().toISOString(),
            activeDeliveries: activeAssignments.length
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
