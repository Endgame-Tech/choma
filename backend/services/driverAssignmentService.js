const Driver = require('../models/Driver');
const DriverAssignment = require('../models/DriverAssignment');
const Order = require('../models/Order');
const Chef = require('../models/Chef');
const notificationService = require('./notificationService');

/**
 * Driver Assignment Service
 * Handles automatic driver assignment when chef completes orders
 */

class DriverAssignmentService {

  /**
   * Auto-assign a driver when chef marks food as ready
   */
  async autoAssignDriverForCompletedOrder(order, chefId) {
    try {
      console.log(`🚚 Auto-assigning driver for completed order ${order._id}`);
      
      // Check if driver already assigned
      const existingAssignment = await DriverAssignment.findOne({
        orderId: order._id,
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
      });
      
      if (existingAssignment) {
        console.log(`✅ Driver already assigned to order ${order._id}`);
        return { success: true, assignment: existingAssignment, isNewAssignment: false };
      }
      
      // Get chef details for pickup location
      const chef = await Chef.findById(chefId);
      if (!chef) {
        throw new Error('Chef not found');
      }
      
      // Find available driver in the area
      const availableDriver = await this.findAvailableDriver(chef.location);
      if (!availableDriver) {
        console.log(`⚠️ No available drivers found for order ${order._id}`);
        return { success: false, message: 'No available drivers in area' };
      }
      
      // Create driver assignment
      const driverAssignment = await this.createDriverAssignment(order, chef, availableDriver);
      
      // Send notification to driver
      await this.notifyDriverForPickup(driverAssignment, order);
      
      // Update order status
      await Order.findByIdAndUpdate(order._id, {
        orderStatus: 'Ready for Pickup',
        readyAt: new Date()
      });
      
      console.log(`✅ Successfully assigned driver ${availableDriver._id} to order ${order._id}`);
      
      return { 
        success: true, 
        assignment: driverAssignment, 
        driver: availableDriver,
        isNewAssignment: true 
      };
      
    } catch (error) {
      console.error('❌ Error auto-assigning driver:', error);
      return { 
        success: false, 
        message: error.message,
        error: error 
      };
    }
  }
  
  /**
   * Find available driver in the chef's area
   */
  async findAvailableDriver(chefLocation) {
    try {
      // Simple algorithm: find drivers with least current assignments
      // In production, this would consider location, capacity, ratings, etc.
      
      const drivers = await Driver.find({
        isActive: true,
        isAvailable: true,
        verified: true
      }).lean();
      
      if (drivers.length === 0) {
        return null;
      }
      
      // Get current assignments for each driver
      const driversWithLoad = await Promise.all(
        drivers.map(async (driver) => {
          const currentAssignments = await DriverAssignment.countDocuments({
            driverId: driver._id,
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
          });
          
          return {
            ...driver,
            currentLoad: currentAssignments,
            maxCapacity: driver.maxDeliveries || 5
          };
        })
      );
      
      // Filter drivers who have capacity
      const availableDrivers = driversWithLoad.filter(
        driver => driver.currentLoad < driver.maxCapacity
      );
      
      if (availableDrivers.length === 0) {
        return null;
      }
      
      // Sort by current load (least busy first)
      availableDrivers.sort((a, b) => a.currentLoad - b.currentLoad);
      
      return availableDrivers[0];
      
    } catch (error) {
      console.error('Error finding available driver:', error);
      return null;
    }
  }
  
  /**
   * Create driver assignment record
   */
  async createDriverAssignment(order, chef, driver) {
    try {
      // Generate confirmation code
      const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const driverAssignment = new DriverAssignment({
        driverId: driver._id,
        orderId: order._id,
        confirmationCode: confirmationCode,
        
        // Pickup location (chef's location)
        pickupLocation: {
          address: chef.location?.streetAddress || chef.location?.address || 'Chef Location',
          coordinates: chef.location?.coordinates || [3.3792, 6.5244], // Default Lagos coordinates
          chefId: chef._id,
          chefName: chef.fullName,
          chefPhone: chef.phone
        },
        
        // Delivery location (customer's address)
        deliveryLocation: {
          address: order.deliveryAddress,
          coordinates: [3.3792, 6.5244] // Default coordinates, should be enhanced
        },
        
        // Assignment details
        status: 'assigned',
        assignedAt: new Date(),
        priority: order.priority || 'medium',
        
        // Estimated times
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        estimatedDeliveryTime: new Date(Date.now() + 90 * 60 * 1000), // 90 minutes from now
        
        // Payment info
        payment: {
          deliveryFee: order.deliveryFee || 1500, // Default delivery fee
          paymentMethod: order.paymentMethod || 'prepaid'
        }
      });
      
      await driverAssignment.save();
      
      console.log(`✅ Created driver assignment ${driverAssignment._id}`);
      
      return driverAssignment;
      
    } catch (error) {
      console.error('Error creating driver assignment:', error);
      throw error;
    }
  }
  
  /**
   * Send notification to driver for pickup
   */
  async notifyDriverForPickup(driverAssignment, order) {
    try {
      // Populate driver and order details
      const populatedAssignment = await DriverAssignment.findById(driverAssignment._id)
        .populate('driverId', 'fullName email phone expoPushToken')
        .populate('orderId', 'orderNumber totalAmount customer')
        .populate('orderId.customer', 'fullName phone');
        
      if (!populatedAssignment) {
        console.log('⚠️ Could not find assignment for notification');
        return;
      }
      
      const driver = populatedAssignment.driverId;
      const orderDetails = populatedAssignment.orderId;
      
      // Create notification data
      const notificationData = {
        title: '🍽️ New Pickup Ready!',
        body: `Order #${orderDetails.orderNumber} is ready for pickup from ${driverAssignment.pickupLocation.chefName}`,
        data: {
          type: 'pickup_ready',
          orderId: order._id.toString(),
          assignmentId: driverAssignment._id.toString(),
          confirmationCode: driverAssignment.confirmationCode,
          chefName: driverAssignment.pickupLocation.chefName,
          chefPhone: driverAssignment.pickupLocation.chefPhone,
          pickupAddress: driverAssignment.pickupLocation.address,
          deliveryAddress: driverAssignment.deliveryLocation.address,
          customerName: orderDetails.customer?.fullName,
          customerPhone: orderDetails.customer?.phone,
          deliveryFee: driverAssignment.payment.deliveryFee,
          estimatedPickupTime: driverAssignment.estimatedPickupTime
        }
      };
      
      // Send push notification if driver has push token
      if (driver.expoPushToken) {
        try {
          await notificationService.sendPushNotification(
            driver.expoPushToken,
            notificationData.title,
            notificationData.body,
            notificationData.data
          );
          console.log(`📱 Push notification sent to driver ${driver.fullName}`);
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
        }
      }
      
      // Send SMS notification as backup
      try {
        const smsMessage = `New pickup ready! Order #${orderDetails.orderNumber} from ${driverAssignment.pickupLocation.chefName}. Pickup at: ${driverAssignment.pickupLocation.address}. Code: ${driverAssignment.confirmationCode}`;
        
        // This would integrate with SMS service
        console.log(`📱 SMS notification would be sent to ${driver.phone}: ${smsMessage}`);
        
      } catch (smsError) {
        console.error('Error sending SMS notification:', smsError);
      }
      
      console.log(`📞 Driver ${driver.fullName} notified for pickup of order ${order._id}`);
      
    } catch (error) {
      console.error('Error notifying driver:', error);
    }
  }
  
  /**
   * Update driver assignment status (pickup confirmed, out for delivery, delivered)
   */
  async updateAssignmentStatus(assignmentId, newStatus, metadata = {}) {
    try {
      const assignment = await DriverAssignment.findById(assignmentId);
      if (!assignment) {
        return { success: false, message: 'Assignment not found' };
      }
      
      const oldStatus = assignment.status;
      assignment.status = newStatus;
      
      // Update timestamps based on status
      switch (newStatus) {
        case 'picked_up':
          assignment.pickedUpAt = new Date();
          assignment.actualPickupTime = new Date();
          break;
        case 'out_for_delivery':
          assignment.outForDeliveryAt = new Date();
          break;
        case 'delivered':
          assignment.deliveredAt = new Date();
          assignment.actualDeliveryTime = new Date();
          break;
        case 'cancelled':
          assignment.cancelledAt = new Date();
          assignment.cancellationReason = metadata.reason;
          break;
      }
      
      // Add any additional metadata
      if (metadata.notes) {
        assignment.driverNotes = metadata.notes;
      }
      if (metadata.location) {
        assignment.lastKnownLocation = metadata.location;
      }
      if (metadata.photo) {
        assignment.deliveryPhoto = metadata.photo;
      }
      
      await assignment.save();
      
      // Update corresponding order status
      await this.updateOrderStatus(assignment.orderId, newStatus);
      
      // Send notifications based on status change
      await this.sendStatusUpdateNotifications(assignment, oldStatus, newStatus);
      
      console.log(`✅ Assignment ${assignmentId} status updated: ${oldStatus} → ${newStatus}`);
      
      return { success: true, assignment };
      
    } catch (error) {
      console.error('Error updating assignment status:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Update order status based on driver assignment status
   */
  async updateOrderStatus(orderId, driverStatus) {
    try {
      let orderStatus;
      
      switch (driverStatus) {
        case 'assigned':
          orderStatus = 'Ready for Pickup';
          break;
        case 'picked_up':
          orderStatus = 'Out for Delivery';
          break;
        case 'out_for_delivery':
          orderStatus = 'Out for Delivery';
          break;
        case 'delivered':
          orderStatus = 'Delivered';
          break;
        case 'cancelled':
          orderStatus = 'Cancelled';
          break;
        default:
          return; // No update needed
      }
      
      await Order.findByIdAndUpdate(orderId, { orderStatus });
      console.log(`📦 Order ${orderId} status updated to: ${orderStatus}`);
      
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }
  
  /**
   * Send notifications when assignment status changes
   */
  async sendStatusUpdateNotifications(assignment, oldStatus, newStatus) {
    try {
      // This would send notifications to customer about delivery progress
      // For now, just log the status change
      console.log(`📢 Would notify customer about status change: ${oldStatus} → ${newStatus} for order ${assignment.orderId}`);
      
    } catch (error) {
      console.error('Error sending status update notifications:', error);
    }
  }
  
  /**
   * Get driver's current assignments
   */
  async getDriverAssignments(driverId, status = null) {
    try {
      const query = { driverId };
      if (status) {
        query.status = status;
      }
      
      const assignments = await DriverAssignment.find(query)
        .populate('orderId', 'orderNumber totalAmount customer deliveryAddress')
        .populate('orderId.customer', 'fullName phone')
        .sort({ assignedAt: -1 });
        
      return { success: true, assignments };
      
    } catch (error) {
      console.error('Error getting driver assignments:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new DriverAssignmentService();