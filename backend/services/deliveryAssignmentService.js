const DriverAssignment = require('../models/DriverAssignment');
const Driver = require('../models/Driver');
const Order = require('../models/Order');
const Chef = require('../models/Chef');
const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const notificationService = require('./notificationService');

class DeliveryAssignmentService {
  
  /**
   * Create delivery assignment from order
   * @param {string} orderId - The order ID
   * @param {object} options - Additional options
   */
  async createAssignmentFromOrder(orderId, options = {}) {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'fullName phone address city')
        .populate('chefId', 'businessName phone address coordinates')
        .populate('subscriptionId');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if assignment already exists
      const existingAssignment = await DriverAssignment.findOne({ orderId });
      if (existingAssignment) {
        throw new Error('Assignment already exists for this order');
      }

      // Generate unique confirmation code
      let confirmationCode;
      let codeExists = true;
      while (codeExists) {
        confirmationCode = this.generateConfirmationCode();
        const existing = await DriverAssignment.findOne({ confirmationCode });
        codeExists = !!existing;
      }

      // Get chef information
      const chef = await Chef.findById(order.chefId);
      if (!chef) {
        throw new Error('Chef not found for order');
      }

      // Calculate distance and duration (simplified - in production use Google Maps API)
      const distance = this.calculateDistance(
        chef.coordinates || [0, 0],
        order.deliveryAddress?.coordinates || [0, 0]
      );

      const estimatedDuration = Math.max(30, Math.ceil(distance * 3)); // 3 mins per km minimum 30 mins
      const now = new Date();
      const estimatedPickupTime = new Date(now.getTime() + 15 * 60000); // 15 mins from now
      const estimatedDeliveryTime = new Date(estimatedPickupTime.getTime() + estimatedDuration * 60000);

      // Create assignment
      const assignment = new DriverAssignment({
        orderId: order._id,
        confirmationCode,
        
        pickupLocation: {
          address: chef.address || chef.businessName,
          coordinates: chef.coordinates || [0, 0],
          chefId: chef._id,
          chefName: chef.businessName || chef.name,
          chefPhone: chef.phone || chef.contactInfo?.phone,
          instructions: chef.deliveryInstructions || ''
        },
        
        deliveryLocation: {
          address: order.deliveryAddress?.fullAddress || order.address || '',
          coordinates: order.deliveryAddress?.coordinates || [0, 0],
          area: order.deliveryAddress?.area || order.city || 'Unknown Area',
          instructions: order.deliveryInstructions || ''
        },
        
        estimatedPickupTime,
        estimatedDeliveryTime,
        totalDistance: distance,
        estimatedDuration,
        
        priority: this.determinePriority(order, options),
        specialInstructions: order.specialRequests || '',
        isFirstDelivery: options.isFirstDelivery || false,
        
        // Subscription info if applicable
        ...(order.subscriptionId && {
          subscriptionInfo: {
            subscriptionId: order.subscriptionId._id,
            mealPlanId: order.subscriptionId.mealPlanId,
            deliveryDay: options.deliveryDay || 1,
            isActivationDelivery: options.isFirstDelivery || false
          }
        })
      });

      // Calculate earning
      assignment.calculateEarning();
      
      await assignment.save();

      // Update order with confirmation code (for user to see)
      order.deliveryConfirmationCode = confirmationCode;
      order.status = 'Confirmed'; // Ready for pickup
      await order.save();

      console.log(`✅ Delivery assignment created: ${assignment._id} for order ${orderId}`);
      
      // Notify nearby drivers if auto-assign is disabled
      if (!options.autoAssign) {
        await this.notifyNearbyDrivers(assignment);
      }

      return {
        success: true,
        assignment,
        confirmationCode
      };

    } catch (error) {
      console.error('Create assignment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto-assign delivery to best available driver
   * @param {string} assignmentId - Assignment ID
   */
  async autoAssignToDriver(assignmentId) {
    try {
      const assignment = await DriverAssignment.findById(assignmentId);
      if (!assignment || assignment.status !== 'available') {
        throw new Error('Assignment not available for auto-assignment');
      }

      // Find best driver near pickup location
      const availableDrivers = await Driver.findAvailableDrivers(
        assignment.pickupLocation.coordinates,
        15 // 15km radius
      );

      if (availableDrivers.length === 0) {
        console.log(`⚠️ No available drivers found for assignment ${assignmentId}`);
        return {
          success: false,
          message: 'No available drivers found'
        };
      }

      // Select best driver (highest rated with most deliveries)
      const bestDriver = availableDrivers[0];

      // Assign to driver
      assignment.driverId = bestDriver._id;
      assignment.status = 'assigned';
      assignment.acceptedAt = new Date();
      await assignment.save();

      // Update driver status
      await bestDriver.startDelivery();

      // Send notification to driver
      await notificationService.sendDriverNotification(bestDriver._id, {
        title: 'New Delivery Assignment',
        body: `You have a new delivery assignment. Pickup from ${assignment.pickupLocation.chefName}`,
        data: {
          type: 'assignment',
          assignmentId: assignment._id,
          action: 'view_assignment'
        }
      });

      console.log(`✅ Assignment ${assignmentId} auto-assigned to driver ${bestDriver.driverId}`);

      return {
        success: true,
        assignment,
        driver: bestDriver
      };

    } catch (error) {
      console.error('Auto-assign error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create daily meal plan deliveries
   * @param {string} mealPlanId - Meal plan ID
   * @param {Date} deliveryDate - Target delivery date
   */
  async createDailyMealPlanDeliveries(mealPlanId, deliveryDate = new Date()) {
    try {
      const mealPlan = await MealPlan.findById(mealPlanId)
        .populate('assignedChef')
        .populate('subscribers.userId');

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      const assignments = [];
      const dateStr = deliveryDate.toISOString().split('T')[0];

      // Create assignment for each subscriber
      for (const subscriber of mealPlan.subscribers) {
        if (!subscriber.userId || subscriber.status !== 'active') continue;

        // Check if delivery already exists for today
        const existingDelivery = await DriverAssignment.findOne({
          'subscriptionInfo.mealPlanId': mealPlanId,
          'subscriptionInfo.deliveryDay': this.getDayOfWeek(deliveryDate),
          deliveryLocation: {
            address: { $regex: subscriber.userId.address, $options: 'i' }
          },
          assignedAt: {
            $gte: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()),
            $lt: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate() + 1)
          }
        });

        if (existingDelivery) {
          console.log(`Delivery already exists for subscriber ${subscriber.userId._id} on ${dateStr}`);
          continue;
        }

        // Create mock order for daily delivery
        const mockOrder = {
          _id: `daily-${mealPlanId}-${subscriber.userId._id}-${dateStr}`,
          userId: subscriber.userId,
          chefId: mealPlan.assignedChef._id,
          deliveryAddress: {
            fullAddress: subscriber.userId.address,
            coordinates: subscriber.userId.coordinates || [0, 0],
            area: subscriber.userId.city || 'Unknown Area'
          },
          subscriptionId: {
            _id: subscriber.subscriptionId,
            mealPlanId: mealPlanId
          }
        };

        const result = await this.createAssignmentFromOrder(mockOrder._id, {
          deliveryDay: this.getDayOfWeek(deliveryDate),
          isFirstDelivery: false,
          autoAssign: true
        });

        if (result.success) {
          assignments.push(result.assignment);
          
          // Auto-assign immediately
          await this.autoAssignToDriver(result.assignment._id);
        }
      }

      console.log(`✅ Created ${assignments.length} daily deliveries for meal plan ${mealPlanId}`);

      return {
        success: true,
        assignments,
        count: assignments.length
      };

    } catch (error) {
      console.error('Create daily deliveries error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notify nearby drivers of new assignment
   * @private
   */
  async notifyNearbyDrivers(assignment) {
    try {
      const nearbyDrivers = await Driver.find({
        accountStatus: 'approved',
        status: 'online',
        isAvailable: true,
        'currentLocation.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: assignment.pickupLocation.coordinates
            },
            $maxDistance: 10000 // 10km
          }
        }
      });

      const notificationPromises = nearbyDrivers.map(driver => 
        notificationService.sendDriverNotification(driver._id, {
          title: 'New Delivery Available',
          body: `${assignment.totalDistance.toFixed(1)}km - ₦${assignment.totalEarning}`,
          data: {
            type: 'new_assignment',
            assignmentId: assignment._id,
            action: 'view_assignments'
          }
        })
      );

      await Promise.all(notificationPromises);
      console.log(`📱 Notified ${nearbyDrivers.length} drivers about new assignment`);

    } catch (error) {
      console.error('Notify drivers error:', error);
    }
  }

  /**
   * Generate confirmation code
   * @private
   */
  generateConfirmationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @private
   */
  calculateDistance(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.max(0.5, Math.round(distance * 10) / 10); // Minimum 0.5km
  }

  /**
   * Determine priority based on order
   * @private
   */
  determinePriority(order, options) {
    if (options.priority) return options.priority;
    if (order.isUrgent) return 'urgent';
    if (order.isPriority) return 'high';
    if (options.isFirstDelivery) return 'high';
    return 'normal';
  }

  /**
   * Get day of week number
   * @private
   */
  getDayOfWeek(date) {
    return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  }
}

module.exports = new DeliveryAssignmentService();