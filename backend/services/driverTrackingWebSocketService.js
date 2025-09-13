const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

class DriverTrackingWebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // Map of orderId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of WebSocket -> Set of subscriptions
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/driver-tracking',
      verifyClient: (info) => {
        try {
          const url = new URL(info.req.url, `http://${info.req.headers.host}`);
          const token = url.searchParams.get('token');
          if (!token) return false;
          
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          return !!decoded.id || !!decoded.customerId;
        } catch (error) {
          console.error('WebSocket verification failed:', error);
          return false;
        }
      }
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('🔌 Driver Tracking WebSocket service initialized at /driver-tracking');
    return this.wss;
  }

  async handleConnection(ws, req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const customerId = decoded.id || decoded.customerId;
      
      const customer = await Customer.findById(customerId).select('-password');
      if (!customer || customer.status !== 'Active') {
        ws.close(4001, 'Authentication failed');
        return;
      }

      ws.customerId = customerId;
      ws.customer = customer;
      ws.isAlive = true;
      ws.subscriptions = new Set();

      console.log(`📱 Customer ${customerId} connected to driver tracking`);

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid JSON message'
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
        this.handleDisconnect(ws);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to driver tracking service'
      }));

    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(4001, 'Authentication failed');
    }
  }

  handleMessage(ws, data) {
    const { type, orderId, events } = data;

    switch (type) {
      case 'subscribe':
        this.handleSubscribe(ws, orderId, events);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(ws, orderId);
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      
      default:
        console.log('Unknown message type:', type);
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${type}`
        }));
    }
  }

  handleSubscribe(ws, orderId, events = []) {
    if (!orderId) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Order ID is required for subscription'
      }));
      return;
    }

    // Add orderId to WebSocket's subscriptions
    ws.subscriptions.add(orderId);

    // Add WebSocket to order's connections
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }
    this.connections.get(orderId).add(ws);

    console.log(`📡 Customer ${ws.customerId} subscribed to order ${orderId}`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'subscribed',
      orderId: orderId,
      events: events
    }));

    // Send real tracking data from database
    this.sendRealTrackingData(orderId);
  }

  handleUnsubscribe(ws, orderId) {
    if (!orderId) return;

    // Remove from WebSocket's subscriptions
    ws.subscriptions.delete(orderId);

    // Remove WebSocket from order's connections
    if (this.connections.has(orderId)) {
      this.connections.get(orderId).delete(ws);
      
      // Clean up empty connection sets
      if (this.connections.get(orderId).size === 0) {
        this.connections.delete(orderId);
      }
    }

    console.log(`📡 Customer ${ws.customerId} unsubscribed from order ${orderId}`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      orderId: orderId
    }));
  }

  handleDisconnect(ws) {
    console.log(`📱 Customer ${ws.customerId} disconnected from driver tracking`);
    
    // Clean up all subscriptions for this WebSocket
    for (const orderId of ws.subscriptions) {
      if (this.connections.has(orderId)) {
        this.connections.get(orderId).delete(ws);
        
        // Clean up empty connection sets
        if (this.connections.get(orderId).size === 0) {
          this.connections.delete(orderId);
        }
      }
    }
  }

  // Send tracking update to all subscribers of an order
  sendTrackingUpdate(orderId, updateType, payload) {
    const connections = this.connections.get(orderId);
    if (!connections || connections.size === 0) {
      return false;
    }

    const message = JSON.stringify({
      type: updateType,
      orderId: orderId,
      payload: payload,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
          sentCount++;
        } catch (error) {
          console.error('Error sending tracking update:', error);
          // Remove dead connection
          connections.delete(ws);
        }
      } else {
        // Remove closed connection
        connections.delete(ws);
      }
    }

    console.log(`📡 Sent ${updateType} update for order ${orderId} to ${sentCount} clients`);
    return sentCount > 0;
  }

  // Send real tracking data from database
  async sendRealTrackingData(orderId) {
    console.log(`📊 Sending real tracking data for order ${orderId}`);
    
    try {
      // Find the driver assignment for this order
      const DriverAssignment = require('../models/DriverAssignment');
      const assignment = await DriverAssignment.findOne({ 
        orderId: orderId,
        status: { $in: ['assigned', 'picked_up', 'in_transit'] }
      }).populate('driverId', 'fullName currentLocation rating phone vehicleInfo profileImage');

      if (!assignment || !assignment.driverId) {
        console.log(`❌ No active driver found for order ${orderId}`);
        this.sendTrackingUpdate(orderId, 'error', {
          message: 'No active driver found for this order'
        });
        return;
      }

      const driver = assignment.driverId;
      
      // Send real driver info
      setTimeout(() => {
        const driverInfo = {
          name: driver.fullName,
          phone: driver.phone,
          vehicle: driver.vehicleInfo ? 
            `${driver.vehicleInfo.make || 'Vehicle'} ${driver.vehicleInfo.model || ''} - ${driver.vehicleInfo.plateNumber || 'N/A'}`.trim() : 
            'Vehicle information not available',
          rating: driver.rating || 4.5,
          profileImage: driver.profileImage || 'https://via.placeholder.com/100x100'
        };
        
        console.log(`👤 Sending real driver info:`, driverInfo);
        this.sendTrackingUpdate(orderId, 'driver_info', driverInfo);
      }, 500);

      // Send current location if available
      if (driver.currentLocation && driver.currentLocation.coordinates) {
        setTimeout(() => {
          const locationData = {
            latitude: driver.currentLocation.coordinates[1], // GeoJSON format is [lng, lat]
            longitude: driver.currentLocation.coordinates[0],
            accuracy: 10,
            bearing: 0,
            speed: 0,
            timestamp: driver.currentLocation.lastUpdated || new Date().toISOString()
          };
          
          console.log(`📍 Sending current driver location:`, locationData);
          this.sendTrackingUpdate(orderId, 'driver_location', locationData);
        }, 1000);
      }

      // Send status update
      setTimeout(() => {
        const statusMap = {
          'assigned': { status: 'driver_assigned', message: 'Driver has been assigned and is on the way' },
          'picked_up': { status: 'picked_up', message: 'Driver has picked up your order' },
          'in_transit': { status: 'in_transit', message: 'Your order is on the way' }
        };
        
        const statusInfo = statusMap[assignment.status] || statusMap['assigned'];
        
        this.sendTrackingUpdate(orderId, 'tracking_status', {
          ...statusInfo,
          timestamp: new Date().toISOString()
        });
      }, 200);

      // Send estimated ETA (you can enhance this with real calculation later)
      setTimeout(() => {
        this.sendTrackingUpdate(orderId, 'eta_update', {
          estimatedMinutes: 25,
          distance: 'Calculating...',
          status: 'On the way',
          traffic: 'Unknown'
        });
      }, 1500);

    } catch (error) {
      console.error(`❌ Error fetching tracking data for order ${orderId}:`, error);
      this.sendTrackingUpdate(orderId, 'error', {
        message: 'Unable to fetch tracking information'
      });
    }
  }

  // Note: Mock location updates removed - real location updates now come from driver app via Socket.IO

  // Health check for WebSocket connections
  startHealthCheck() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log('Terminating dead WebSocket connection');
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Get service statistics
  getStats() {
    return {
      totalConnections: this.wss ? this.wss.clients.size : 0,
      activeOrders: this.connections.size,
      connectionsByOrder: Object.fromEntries(
        Array.from(this.connections.entries()).map(([orderId, connections]) => [
          orderId,
          connections.size
        ])
      )
    };
  }
}

module.exports = new DriverTrackingWebSocketService();