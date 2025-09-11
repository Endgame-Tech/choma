const Subscription = require('../models/Subscription');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const Driver = require('../models/Driver');
const mongoose = require('mongoose');

/**
 * Subscription Delivery Scheduler Service
 * Creates upcoming delivery records and assigns drivers for admin dashboard visibility
 */

class SubscriptionDeliverySchedulerService {

  /**
   * Create upcoming delivery records for all active subscriptions
   */
  async createUpcomingDeliveries(daysAhead = 7) {
    try {
      console.log(`📅 Creating upcoming deliveries for next ${daysAhead} days...`);
      
      // Get all active subscriptions with chef assignments
      const activeSubscriptions = await Subscription.find({
        status: 'Active',
        paymentStatus: 'Paid'
      }).lean();
      
      console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);
      
      let deliveriesCreated = 0;
      let driversAssigned = 0;
      
      for (const subscription of activeSubscriptions) {
        try {
          // Check if this subscription has a chef assignment
          const chefAssignment = await SubscriptionChefAssignment.findOne({
            subscriptionId: subscription._id,
            assignmentStatus: 'active'
          });
          
          if (!chefAssignment) {
            console.log(`⚠️ No chef assignment found for subscription ${subscription._id}`);
            continue;
          }
          
          // Generate delivery dates for the next few days
          const deliveryDates = this.generateDeliveryDates(subscription, daysAhead);
          
          for (const deliveryDate of deliveryDates) {
            // Check if delivery already exists for this date
            const existingDelivery = await SubscriptionDelivery.findOne({
              subscriptionId: subscription._id,
              scheduledDate: {
                $gte: new Date(deliveryDate.setHours(0, 0, 0, 0)),
                $lte: new Date(deliveryDate.setHours(23, 59, 59, 999))
              }
            });
            
            if (existingDelivery) {
              continue; // Skip if delivery already exists
            }
            
            // Create meal assignment (simplified for now)
            const mealAssignment = await this.createMealAssignment(subscription, deliveryDate);
            
            // Create the delivery record
            const delivery = await this.createDeliveryRecord(
              subscription,
              chefAssignment,
              deliveryDate,
              mealAssignment
            );
            
            if (delivery) {
              deliveriesCreated++;
              
              // Assign a driver to this delivery
              const driverAssigned = await this.assignDriverToDelivery(delivery);
              if (driverAssigned) {
                driversAssigned++;
              }
            }
          }
          
        } catch (error) {
          console.error(`❌ Error processing subscription ${subscription._id}:`, error.message);
        }
      }
      
      console.log(`✅ Created ${deliveriesCreated} upcoming deliveries with ${driversAssigned} driver assignments`);
      
      return {
        success: true,
        deliveriesCreated,
        driversAssigned
      };
      
    } catch (error) {
      console.error('❌ Error creating upcoming deliveries:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Generate delivery dates for a subscription
   */
  generateDeliveryDates(subscription, daysAhead) {
    const dates = [];
    const startDate = new Date();
    
    // For simplicity, create one delivery per day for the subscription
    // In production, this would be based on subscription frequency
    for (let i = 1; i <= daysAhead; i++) {
      const deliveryDate = new Date(startDate);
      deliveryDate.setDate(startDate.getDate() + i);
      
      // Only add weekdays for now (skip weekends)
      const dayOfWeek = deliveryDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        dates.push(deliveryDate);
      }
    }
    
    return dates;
  }
  
  /**
   * Create meal assignment for delivery
   */
  async createMealAssignment(subscription, deliveryDate) {
    try {
      // Get existing meal plan assignment or create a simplified one
      let mealAssignment = await MealPlanAssignment.findOne({
        subscriptionId: subscription._id
      });
      
      if (!mealAssignment) {
        // Create a basic meal assignment
        mealAssignment = new MealPlanAssignment({
          subscriptionId: subscription._id,
          customerId: subscription.userId,
          mealPlanId: subscription.mealPlanId,
          weekNumber: Math.ceil((deliveryDate - new Date(subscription.createdDate)) / (7 * 24 * 60 * 60 * 1000)),
          assignments: [{
            dayOfWeek: deliveryDate.getDay(),
            mealTime: subscription.selectedMealTypes?.[0] || 'lunch',
            customTitle: `Daily ${subscription.selectedMealTypes?.[0] || 'lunch'}`,
            meals: []
          }]
        });
        
        await mealAssignment.save();
      }
      
      return {
        assignmentId: mealAssignment._id,
        weekNumber: Math.ceil((deliveryDate - new Date(subscription.createdDate)) / (7 * 24 * 60 * 60 * 1000)),
        dayOfWeek: deliveryDate.getDay(),
        mealTime: subscription.selectedMealTypes?.[0] || 'lunch',
        customTitle: `Daily ${subscription.selectedMealTypes?.[0] || 'lunch'}`,
        meals: []
      };
      
    } catch (error) {
      console.error('Error creating meal assignment:', error);
      return {
        assignmentId: null,
        weekNumber: 1,
        dayOfWeek: deliveryDate.getDay(),
        mealTime: 'lunch',
        customTitle: 'Daily Meal',
        meals: []
      };
    }
  }
  
  /**
   * Create delivery record
   */
  async createDeliveryRecord(subscription, chefAssignment, deliveryDate, mealAssignment) {
    try {
      const delivery = new SubscriptionDelivery({
        subscriptionId: subscription._id,
        customerId: subscription.userId,
        status: 'scheduled',
        
        // Schedule for lunch time (12:00 PM)
        scheduledDate: new Date(deliveryDate.setHours(12, 0, 0, 0)),
        
        // Meal assignment
        mealAssignment: mealAssignment,
        
        // Chef assignment
        chefAssignment: {
          chefId: chefAssignment.chefId,
          assignedAt: new Date(),
          status: 'assigned'
        },
        
        // Delivery info
        deliveryInfo: {
          address: subscription.deliveryAddress || 'Address not specified',
          coordinates: {
            lat: 6.5244, // Default Lagos coordinates
            lng: 3.3792
          },
          estimatedDeliveryTime: new Date(deliveryDate.setHours(14, 0, 0, 0)) // 2 PM delivery
        },
        
        // Payment info
        payment: {
          amount: subscription.price || subscription.totalPrice || 0,
          method: subscription.paymentMethod || 'prepaid',
          status: 'paid'
        },
        
        // Timeline
        timeline: [{
          status: 'scheduled',
          timestamp: new Date(),
          notes: 'Delivery scheduled',
          updatedBy: 'system'
        }],
        
        // Metrics
        metrics: {
          created: true,
          onTimeDelivery: null // Will be updated when delivered
        }
      });
      
      await delivery.save();
      console.log(`📦 Created delivery ${delivery._id} for ${deliveryDate.toDateString()}`);
      
      return delivery;
      
    } catch (error) {
      console.error('Error creating delivery record:', error);
      return null;
    }
  }
  
  /**
   * Assign driver to delivery
   */
  async assignDriverToDelivery(delivery) {
    try {
      // Find available driver using simple algorithm
      const availableDriver = await this.findAvailableDriver();
      
      if (!availableDriver) {
        console.log(`⚠️ No available driver for delivery ${delivery._id}`);
        return false;
      }
      
      // Update delivery with driver assignment
      delivery.driverAssignment = {
        driverId: availableDriver._id,
        assignedAt: new Date(),
        confirmationCode: this.generateConfirmationCode()
      };
      
      // Add to timeline
      delivery.timeline.push({
        status: 'driver_assigned',
        timestamp: new Date(),
        notes: `Driver ${availableDriver.fullName} assigned`,
        updatedBy: 'system'
      });
      
      await delivery.save();
      
      console.log(`🚚 Assigned driver ${availableDriver.fullName} to delivery ${delivery._id}`);
      return true;
      
    } catch (error) {
      console.error('Error assigning driver to delivery:', error);
      return false;
    }
  }
  
  /**
   * Find available driver (simplified algorithm)
   */
  async findAvailableDriver() {
    try {
      // Get active drivers
      const drivers = await Driver.find({
        isActive: true,
        verified: true
      }).lean();
      
      if (drivers.length === 0) {
        return null;
      }
      
      // Count current assignments for each driver
      const driversWithLoad = await Promise.all(
        drivers.map(async (driver) => {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          
          const todayAssignments = await SubscriptionDelivery.countDocuments({
            'driverAssignment.driverId': driver._id,
            scheduledDate: { $gte: todayStart, $lte: todayEnd },
            status: { $in: ['scheduled', 'assigned', 'picked_up', 'out_for_delivery'] }
          });
          
          return {
            ...driver,
            todayLoad: todayAssignments,
            maxDailyCapacity: driver.maxDeliveries || 8
          };
        })
      );
      
      // Filter drivers who have capacity
      const availableDrivers = driversWithLoad.filter(
        driver => driver.todayLoad < driver.maxDailyCapacity
      );
      
      if (availableDrivers.length === 0) {
        return null;
      }
      
      // Return driver with least load
      availableDrivers.sort((a, b) => a.todayLoad - b.todayLoad);
      return availableDrivers[0];
      
    } catch (error) {
      console.error('Error finding available driver:', error);
      return null;
    }
  }
  
  /**
   * Generate confirmation code
   */
  generateConfirmationCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  /**
   * Clean up old delivery records
   */
  async cleanupOldDeliveries() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Remove deliveries older than 30 days
      
      const result = await SubscriptionDelivery.deleteMany({
        scheduledDate: { $lt: cutoffDate },
        status: { $in: ['cancelled', 'delivered'] }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old delivery records`);
      
    } catch (error) {
      console.error('Error cleaning up old deliveries:', error);
    }
  }
}

module.exports = new SubscriptionDeliverySchedulerService();