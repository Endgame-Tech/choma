const Subscription = require('../models/Subscription');
const RecurringSubscription = require('../models/RecurringSubscription');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const DriverAssignment = require('../models/DriverAssignment');
const MealPlan = require('../models/MealPlan');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const Customer = require('../models/Customer');
const Chef = require('../models/Chef');
const Driver = require('../models/Driver');
const mongoose = require('mongoose');

/**
 * Unified Subscription Management Service
 * Provides centralized management for all subscription-related operations
 * across chef, admin, and driver applications
 */
class UnifiedSubscriptionService {

  /**
   * Get comprehensive next delivery overview for admin dashboard
   */
  async getNextDeliveryOverview(filters = {}) {
    try {
      const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        status,
        area,
        chefId,
        driverId
      } = filters;

      // Build query
      const query = {
        nextDeliveryDate: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (status) query.status = status;
      if (area) query['deliverySchedule.area'] = { $regex: area, $options: 'i' };

      // Build query for existing Subscription model
      const subscriptionQuery = {
        status: 'Active', // Note: capital A as found in database
        paymentStatus: 'Paid'
      };
      
      if (status) {
        // Map status filter to correct format
        subscriptionQuery.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      }

      // Get existing active subscriptions
      const subscriptions = await Subscription.find(subscriptionQuery)
        .populate('userId', 'fullName email phone')
        .populate('mealPlanId', 'planName durationWeeks mealsPerWeek')
        .sort({ createdDate: -1 })
        .lean();
        
      console.log(`🔍 Found ${subscriptions.length} active subscriptions`);

      // Enrich with chef assignments and delivery status
      const enrichedData = await Promise.all(
        subscriptions.map(async (subscription) => {
          // Get chef assignment
          const chefAssignment = await SubscriptionChefAssignment.findOne({
            subscriptionId: subscription._id,
            assignmentStatus: 'active'
          }).populate('chefId', 'fullName phone email').lean();

          // Get next delivery if exists (use subscription's nextDelivery field or create virtual date)
          const nextDeliveryDate = subscription.nextDelivery || new Date(Date.now() + 24 * 60 * 60 * 1000);
          let deliveryToday = await SubscriptionDelivery.findOne({
            subscriptionId: subscription._id,
            scheduledDate: { $gte: new Date() }
          }).populate('driverAssignment.driverId', 'fullName phone').lean();
          
          // If no delivery record exists, create a virtual one with auto-assigned driver
          if (!deliveryToday && chefAssignment) {
            console.log(`📋 No delivery record found for subscription ${subscription._id}, creating virtual delivery...`);
            deliveryToday = await this.createVirtualDeliveryWithDriver(subscription, chefAssignment, nextDeliveryDate);
          } else if (!deliveryToday) {
            console.log(`⚠️ No delivery record and no chef assignment for subscription ${subscription._id}`);
          }

          return {
            ...subscription,
            nextDeliveryDate: nextDeliveryDate,
            deliverySchedule: {
              address: subscription.deliveryAddress || 'Address not specified',
              timeSlot: {
                start: '12:00',
                end: '14:00'
              },
              area: 'Lagos' // Default area, can be enhanced later
            },
            chefAssignment,
            nextDelivery: deliveryToday,
            canReassignChef: !chefAssignment || chefAssignment.adminControls?.canReassign !== false,
            canReassignDriver: !deliveryToday || deliveryToday.status === 'scheduled',
            riskLevel: this.calculateSubscriptionRiskLevel(subscription, chefAssignment, deliveryToday)
          };
        })
      );

      // Group by status and provide summary
      const summary = this.generateDeliverySummary(enrichedData);

      return {
        success: true,
        data: {
          deliveries: enrichedData,
          summary,
          totalCount: enrichedData.length
        }
      };

    } catch (error) {
      console.error('❌ Error getting next delivery overview:', error);
      return {
        success: false,
        message: 'Failed to get delivery overview',
        error: error.message
      };
    }
  }

  /**
   * Get chef's next cooking assignments with detailed information
   */
  async getChefNextAssignments(chefId, days = 7) {
    try {
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Get chef's active subscription assignments
      const assignments = await SubscriptionChefAssignment.find({
        chefId,
        assignmentStatus: 'active',
        endDate: { $gte: new Date() }
      })
      .populate('subscriptionId')
      .populate('customerId', 'fullName phone email address')
      .populate('mealPlanId', 'planName mealsPerWeek')
      .lean();

      // Get next deliveries for each assignment
      const nextAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const subscription = assignment.subscriptionId;
          
          // Get upcoming deliveries
          const upcomingDeliveries = await SubscriptionDelivery.find({
            subscriptionId: subscription._id,
            'chefAssignment.chefId': chefId,
            scheduledDate: {
              $gte: new Date(),
              $lte: endDate
            },
            status: { $in: ['scheduled', 'chef_assigned', 'preparing'] }
          }).sort({ scheduledDate: 1 }).lean();

          // Get meal assignments for each delivery
          const enrichedDeliveries = await Promise.all(
            upcomingDeliveries.map(async (delivery) => {
              const mealAssignment = await MealPlanAssignment.findById(
                delivery.mealAssignment.assignmentId
              ).lean();

              return {
                ...delivery,
                mealDetails: mealAssignment,
                priority: this.calculateDeliveryPriority(delivery, assignment),
                estimatedPrepTime: this.estimatePreparationTime(mealAssignment)
              };
            })
          );

          return {
            ...assignment,
            upcomingDeliveries: enrichedDeliveries,
            nextDeliveryDate: upcomingDeliveries[0]?.scheduledDate,
            totalUpcomingMeals: upcomingDeliveries.length
          };
        })
      );

      // Sort by next delivery date
      nextAssignments.sort((a, b) => 
        (a.nextDeliveryDate || new Date(2099, 0, 1)) - 
        (b.nextDeliveryDate || new Date(2099, 0, 1))
      );

      return {
        success: true,
        data: {
          assignments: nextAssignments,
          totalAssignments: nextAssignments.length,
          totalUpcomingDeliveries: nextAssignments.reduce((sum, a) => sum + a.totalUpcomingMeals, 0)
        }
      };

    } catch (error) {
      console.error('❌ Error getting chef next assignments:', error);
      return {
        success: false,
        message: 'Failed to get chef assignments',
        error: error.message
      };
    }
  }

  /**
   * Get driver's next delivery assignments
   */
  async getDriverNextDeliveries(driverId, days = 7) {
    try {
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Get driver's upcoming subscription deliveries
      const subscriptionDeliveries = await SubscriptionDelivery.find({
        'driverAssignment.driverId': driverId,
        scheduledDate: {
          $gte: new Date(),
          $lte: endDate
        },
        status: { $in: ['ready', 'out_for_delivery', 'assigned'] }
      })
      .populate('subscriptionId', 'frequency dietaryPreferences allergens')
      .populate('customerId', 'fullName phone email address')
      .populate('mealAssignment.assignmentId')
      .sort({ scheduledDate: 1 })
      .lean();

      // Group by customer and subscription for better management
      const groupedDeliveries = {};
      
      subscriptionDeliveries.forEach(delivery => {
        const customerId = delivery.customerId._id.toString();
        const subscriptionId = delivery.subscriptionId._id.toString();
        const key = `${customerId}_${subscriptionId}`;

        if (!groupedDeliveries[key]) {
          groupedDeliveries[key] = {
            customer: delivery.customerId,
            subscription: delivery.subscriptionId,
            deliveries: [],
            relationshipScore: 0, // Will calculate based on history
            totalEarnings: 0
          };
        }

        groupedDeliveries[key].deliveries.push({
          ...delivery,
          routeOptimized: false, // Will be set by route optimization
          estimatedDuration: this.estimateDeliveryDuration(delivery)
        });
      });

      // Calculate relationship scores and earnings
      for (const group of Object.values(groupedDeliveries)) {
        group.relationshipScore = await this.calculateCustomerRelationshipScore(
          driverId, 
          group.customer._id, 
          group.subscription._id
        );
        group.totalEarnings = group.deliveries.reduce((sum, d) => sum + (d.payment?.amount || 0), 0);
      }

      return {
        success: true,
        data: {
          deliveryGroups: Object.values(groupedDeliveries),
          totalDeliveries: subscriptionDeliveries.length,
          totalCustomers: Object.keys(groupedDeliveries).length
        }
      };

    } catch (error) {
      console.error('❌ Error getting driver next deliveries:', error);
      return {
        success: false,
        message: 'Failed to get driver deliveries',
        error: error.message
      };
    }
  }

  /**
   * Reassign chef for specific subscription
   */
  async reassignChef(subscriptionId, newChefId, adminId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get current chef assignment
      const currentAssignment = await SubscriptionChefAssignment.findOne({
        subscriptionId,
        assignmentStatus: 'active'
      }).session(session);

      if (!currentAssignment) {
        throw new Error('No active chef assignment found');
      }

      // Validate new chef
      const newChef = await Chef.findById(newChefId).session(session);
      if (!newChef) {
        throw new Error('New chef not found');
      }

      // Check if new chef has capacity
      const chefCapacity = await this.checkChefCapacity(newChefId, session);
      if (!chefCapacity.hasCapacity) {
        throw new Error(`Chef at capacity: ${chefCapacity.reason}`);
      }

      // Mark current assignment as reassigned
      currentAssignment.assignmentStatus = 'reassigned';
      currentAssignment.reassignment = {
        isReassignmentRequested: true,
        requestedBy: 'admin',
        requestDate: new Date(),
        requestReason: reason,
        newChefId,
        reassignmentDate: new Date(),
        transitionNotes: `Reassigned by admin ${adminId}`
      };
      await currentAssignment.save({ session });

      // Create new chef assignment
      const newAssignment = new SubscriptionChefAssignment({
        subscriptionId,
        chefId: newChefId,
        customerId: currentAssignment.customerId,
        mealPlanId: currentAssignment.mealPlanId,
        startDate: new Date(),
        endDate: currentAssignment.endDate,
        assignmentDetails: {
          assignedBy: adminId,
          assignmentReason: 'chef_reassignment',
          priority: 'high',
          adminNotes: reason
        }
      });
      await newAssignment.save({ session });

      // Update future deliveries
      await SubscriptionDelivery.updateMany(
        {
          subscriptionId,
          scheduledDate: { $gte: new Date() },
          status: { $in: ['scheduled', 'chef_assigned'] }
        },
        {
          'chefAssignment.chefId': newChefId,
          'chefAssignment.assignedAt': new Date()
        }
      ).session(session);

      await session.commitTransaction();

      return {
        success: true,
        data: {
          oldAssignment: currentAssignment,
          newAssignment,
          message: 'Chef reassigned successfully'
        }
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error reassigning chef:', error);
      return {
        success: false,
        message: 'Failed to reassign chef',
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Update next delivery status with workflow automation
   */
  async updateDeliveryStatus(deliveryId, newStatus, updatedBy, metadata = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const delivery = await SubscriptionDelivery.findById(deliveryId).session(session);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const oldStatus = delivery.status;

      // Update status with timeline
      await delivery.updateStatus(newStatus, metadata.notes || '', updatedBy, metadata);

      // Automated workflow triggers
      await this.triggerWorkflowActions(delivery, oldStatus, newStatus, session);

      // Update subscription metrics
      if (newStatus === 'delivered') {
        await this.updateSubscriptionMetrics(delivery.subscriptionId, true, session);
      } else if (newStatus === 'failed') {
        await this.updateSubscriptionMetrics(delivery.subscriptionId, false, session);
      }

      await session.commitTransaction();

      return {
        success: true,
        data: delivery,
        message: `Delivery status updated to ${newStatus}`
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error updating delivery status:', error);
      return {
        success: false,
        message: 'Failed to update delivery status',
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }

  // Helper methods
  calculateRiskLevel(subscription, chefAssignment, delivery) {
    let riskScore = 0;
    const now = new Date();
    const nextDelivery = new Date(subscription.nextDeliveryDate);
    const hoursUntilDelivery = (nextDelivery - now) / (1000 * 60 * 60);

    // Time-based risk
    if (hoursUntilDelivery < 4) riskScore += 30;
    else if (hoursUntilDelivery < 12) riskScore += 15;

    // Chef assignment risk
    if (!chefAssignment) riskScore += 40;
    else if (chefAssignment.performance.consistencyScore < 70) riskScore += 20;

    // Delivery status risk
    if (!delivery) riskScore += 25;
    else if (delivery.status === 'scheduled' && hoursUntilDelivery < 6) riskScore += 20;

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Calculate risk level for existing subscription format
   */
  calculateSubscriptionRiskLevel(subscription, chefAssignment, delivery) {
    let riskScore = 0;

    // Check subscription age and payment
    const daysSinceCreated = (new Date() - new Date(subscription.createdDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 30 && subscription.paymentStatus !== 'Paid') {
      riskScore += 40;
    }

    // Check chef assignment
    if (!chefAssignment) {
      riskScore += 40;
    } else if (chefAssignment.performance?.consistencyScore < 70) {
      riskScore += 20;
    }

    // Check delivery schedule
    if (!delivery) {
      riskScore += 30;
    }

    // Check subscription status
    if (subscription.status !== 'Active') {
      riskScore += 25;
    }

    // Determine risk level
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  generateDeliverySummary(deliveries) {
    const summary = {
      total: deliveries.length,
      byStatus: {},
      byRisk: { low: 0, medium: 0, high: 0 },
      unassignedChef: 0,
      unassignedDriver: 0
    };

    deliveries.forEach(delivery => {
      // Status summary
      const status = delivery.status || 'unknown';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

      // Risk summary
      summary.byRisk[delivery.riskLevel]++;

      // Assignment summary
      if (!delivery.chefAssignment) summary.unassignedChef++;
      if (!delivery.nextDelivery?.driverAssignment?.driverId) summary.unassignedDriver++;
    });

    return summary;
  }

  calculateDeliveryPriority(delivery, assignment) {
    // Calculate based on customer relationship, meal complexity, timing
    let priority = 50; // Base priority

    // Customer relationship factor
    if (assignment.relationship.customerSatisfaction >= 4) priority += 10;
    else if (assignment.relationship.customerSatisfaction <= 2) priority += 20;

    // Timing factor
    const hoursUntil = (new Date(delivery.scheduledDate) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 6) priority += 15;
    else if (hoursUntil < 12) priority += 5;

    return Math.min(100, Math.max(0, priority));
  }

  estimatePreparationTime(mealAssignment) {
    // Base time estimation logic
    if (!mealAssignment) return 30;
    
    const baseTime = 30;
    const complexityMultiplier = 1.2; // Could be based on meal data
    
    return Math.round(baseTime * complexityMultiplier);
  }

  estimateDeliveryDuration(delivery) {
    // Estimate based on distance, traffic, etc.
    // For now, return a default
    return 45; // minutes
  }

  async calculateCustomerRelationshipScore(driverId, customerId, subscriptionId) {
    try {
      // Get delivery history
      const deliveryHistory = await SubscriptionDelivery.find({
        'driverAssignment.driverId': driverId,
        customerId,
        subscriptionId,
        status: 'delivered'
      }).limit(10).lean();

      if (deliveryHistory.length === 0) return 0;

      const ratings = deliveryHistory
        .filter(d => d.customer?.rating)
        .map(d => d.customer.rating);

      if (ratings.length === 0) return 50; // Neutral score

      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      return Math.round((avgRating / 5) * 100);

    } catch (error) {
      console.error('Error calculating relationship score:', error);
      return 0;
    }
  }

  async checkChefCapacity(chefId, session) {
    try {
      const chef = await Chef.findById(chefId).session(session);
      if (!chef) {
        return { hasCapacity: false, reason: 'Chef not found' };
      }

      // Get current workload
      const activeAssignments = await SubscriptionChefAssignment.countDocuments({
        chefId,
        assignmentStatus: 'active'
      }).session(session);

      const maxCapacity = chef.maxSubscriptions || 10;
      
      return {
        hasCapacity: activeAssignments < maxCapacity,
        currentLoad: activeAssignments,
        maxCapacity,
        reason: activeAssignments >= maxCapacity ? 'Chef at maximum capacity' : ''
      };

    } catch (error) {
      return { hasCapacity: false, reason: 'Error checking capacity' };
    }
  }

  async triggerWorkflowActions(delivery, oldStatus, newStatus, session) {
    // Implement automated workflow triggers based on status changes
    
    if (oldStatus === 'chef_assigned' && newStatus === 'preparing') {
      // Chef started cooking - notify customer
      // Could integrate with notification service
    }

    if (oldStatus === 'preparing' && newStatus === 'ready') {
      // Food ready - assign/notify driver
      await this.autoAssignDriver(delivery, session);
    }

    if (oldStatus === 'ready' && newStatus === 'out_for_delivery') {
      // Driver picked up - notify customer with tracking
    }

    if (oldStatus === 'out_for_delivery' && newStatus === 'delivered') {
      // Delivered - update next delivery date
      await this.scheduleNextDelivery(delivery.subscriptionId, session);
    }
  }

  async autoAssignDriver(delivery, session) {
    // Auto-assign available driver based on location and capacity
    // This would integrate with driver assignment service
    console.log(`🚚 Auto-assigning driver for delivery ${delivery.deliveryId}`);
  }

  async scheduleNextDelivery(subscriptionId, session) {
    // Update next delivery date based on frequency
    const subscription = await RecurringSubscription.findById(subscriptionId).session(session);
    if (subscription) {
      subscription.calculateNextDeliveryDate();
      await subscription.save({ session });
    }
  }

  async updateSubscriptionMetrics(subscriptionId, delivered, session) {
    const subscription = await RecurringSubscription.findById(subscriptionId).session(session);
    if (subscription) {
      subscription.updateDeliveryMetrics(delivered);
      await subscription.save({ session });
    }
  }

  /**
   * Create virtual delivery with auto-assigned driver for admin dashboard visibility
   */
  async createVirtualDeliveryWithDriver(subscription, chefAssignment, nextDeliveryDate) {
    try {
      console.log(`🔮 Creating virtual delivery for subscription ${subscription._id}`);
      
      // Find available driver using simplified algorithm
      const availableDriver = await this.findAvailableDriverForVirtualAssignment();
      
      if (!availableDriver) {
        console.log(`⚠️ No available driver for virtual assignment for subscription ${subscription._id}`);
        return {
          status: 'scheduled',
          driverAssignment: null,
          isVirtual: true
        };
      }

      // Create virtual delivery object (not saved to database yet)
      const virtualDelivery = {
        subscriptionId: subscription._id,
        customerId: subscription.userId,
        status: 'scheduled',
        scheduledDate: nextDeliveryDate,
        
        // Virtual driver assignment with populated driver info
        driverAssignment: {
          driverId: {
            _id: availableDriver._id,
            fullName: availableDriver.fullName,
            phone: availableDriver.phone
          },
          assignedAt: new Date(),
          confirmationCode: this.generateVirtualConfirmationCode(),
          isVirtual: true
        },
        
        // Delivery info
        deliveryInfo: {
          address: subscription.deliveryAddress || 'Address not specified',
          coordinates: {
            lat: 6.5244, // Default Lagos coordinates
            lng: 3.3792
          },
          estimatedDeliveryTime: new Date(nextDeliveryDate.setHours(14, 0, 0, 0))
        },
        
        // Payment info
        payment: {
          amount: subscription.price || subscription.totalPrice || 0,
          method: subscription.paymentMethod || 'prepaid',
          status: 'paid'
        },
        
        isVirtual: true
      };

      console.log(`🚚 Virtual driver assigned: ${availableDriver.fullName} for delivery on ${nextDeliveryDate.toDateString()}`);
      
      return virtualDelivery;
      
    } catch (error) {
      console.error('Error creating virtual delivery with driver:', error);
      return {
        status: 'scheduled',
        driverAssignment: null,
        isVirtual: true
      };
    }
  }

  /**
   * Find available driver for virtual assignment (simplified algorithm)
   */
  async findAvailableDriverForVirtualAssignment() {
    try {
      // Get active drivers using correct field names
      const drivers = await Driver.find({
        accountStatus: 'approved',
        status: { $in: ['online', 'available'] }
      }).lean();
      
      if (drivers.length === 0) {
        return null;
      }
      
      // Count current assignments for each driver for today
      const driversWithLoad = await Promise.all(
        drivers.map(async (driver) => {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          
          // Count both actual and virtual assignments
          const actualAssignments = await SubscriptionDelivery.countDocuments({
            'driverAssignment.driverId': driver._id,
            scheduledDate: { $gte: todayStart, $lte: todayEnd },
            status: { $in: ['scheduled', 'assigned', 'picked_up', 'out_for_delivery'] }
          });
          
          // For virtual assignments, we'll use a simple round-robin approach
          // In production, this could be more sophisticated
          
          return {
            ...driver,
            todayLoad: actualAssignments,
            maxDailyCapacity: driver.maxDeliveries || 8
          };
        })
      );
      
      // Filter drivers who have capacity
      const availableDrivers = driversWithLoad.filter(
        driver => driver.todayLoad < driver.maxDailyCapacity
      );
      
      if (availableDrivers.length === 0) {
        // If no drivers have capacity, still assign to the one with least load
        driversWithLoad.sort((a, b) => a.todayLoad - b.todayLoad);
        return driversWithLoad[0];
      }
      
      // Return driver with least load
      availableDrivers.sort((a, b) => a.todayLoad - b.todayLoad);
      return availableDrivers[0];
      
    } catch (error) {
      console.error('Error finding available driver for virtual assignment:', error);
      return null;
    }
  }

  /**
   * Generate confirmation code for virtual assignments
   */
  generateVirtualConfirmationCode() {
    return 'V' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }
}

module.exports = new UnifiedSubscriptionService();