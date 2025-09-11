const RecurringSubscription = require('../models/RecurringSubscription');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const DriverAssignment = require('../models/DriverAssignment');
const Driver = require('../models/Driver');
const Chef = require('../models/Chef');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');

/**
 * Workflow Automation Service for Subscription Management
 * Handles automated workflows and business logic for next delivery management
 */
class WorkflowAutomationService {

  /**
   * Auto-create deliveries for recurring subscriptions
   * Runs daily to create tomorrow's deliveries
   */
  async autoCreateDailyDeliveries() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('🔄 Starting auto-creation of daily deliveries...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      // Find subscriptions due for delivery tomorrow
      const dueSubscriptions = await RecurringSubscription.find({
        status: 'active',
        nextDeliveryDate: {
          $gte: tomorrow,
          $lte: endOfTomorrow
        }
      })
      .populate('userId', 'fullName email phone')
      .populate('mealPlanId', 'planName mealsPerWeek')
      .session(session);

      console.log(`📅 Found ${dueSubscriptions.length} subscriptions due for delivery tomorrow`);

      const results = [];
      const errors = [];

      for (const subscription of dueSubscriptions) {
        try {
          // Check if delivery already exists
          const existingDelivery = await SubscriptionDelivery.findOne({
            subscriptionId: subscription._id,
            scheduledDate: {
              $gte: tomorrow,
              $lte: endOfTomorrow
            }
          }).session(session);

          if (existingDelivery) {
            console.log(`⏭️  Delivery already exists for subscription ${subscription._id}`);
            continue;
          }

          // Get chef assignment
          const chefAssignment = await SubscriptionChefAssignment.findOne({
            subscriptionId: subscription._id,
            assignmentStatus: 'active'
          }).session(session);

          if (!chefAssignment) {
            console.log(`⚠️  No chef assigned for subscription ${subscription._id}`);
            errors.push({
              subscriptionId: subscription._id,
              error: 'No chef assigned',
              action: 'requires_manual_assignment'
            });
            continue;
          }

          // Determine meal assignment for this delivery
          const mealAssignment = await this.getMealAssignmentForDate(
            subscription._id, 
            subscription.mealPlanId._id, 
            tomorrow,
            session
          );

          if (!mealAssignment) {
            console.log(`⚠️  No meal assignment found for subscription ${subscription._id}`);
            errors.push({
              subscriptionId: subscription._id,
              error: 'No meal assignment available',
              action: 'requires_meal_planning'
            });
            continue;
          }

          // Create the delivery
          const delivery = new SubscriptionDelivery({
            subscriptionId: subscription._id,
            customerId: subscription.userId._id,
            mealAssignment: {
              assignmentId: mealAssignment._id,
              weekNumber: mealAssignment.weekNumber || 1,
              dayOfWeek: mealAssignment.dayOfWeek || 1,
              mealTime: mealAssignment.mealTime,
              customTitle: mealAssignment.title || mealAssignment.customTitle
            },
            scheduledDate: subscription.nextDeliveryDate,
            scheduledTimeSlot: subscription.deliverySchedule.timeSlot,
            status: 'scheduled',
            chefAssignment: {
              chefId: chefAssignment.chefId,
              assignedAt: new Date()
            },
            deliveryInfo: {
              address: subscription.deliverySchedule.address,
              coordinates: subscription.deliverySchedule.coordinates,
              estimatedDeliveryTime: subscription.nextDeliveryDate
            },
            payment: {
              amount: subscription.pricePerMeal || subscription.totalPrice,
              status: subscription.paymentStatus === 'paid' ? 'paid' : 'pending'
            }
          });

          await delivery.save({ session });

          // Update chef workload
          await this.updateChefWorkload(chefAssignment._id, 'add', session);

          // Calculate next delivery date
          subscription.calculateNextDeliveryDate();
          await subscription.save({ session });

          results.push({
            subscriptionId: subscription._id,
            deliveryId: delivery._id,
            customer: subscription.userId.fullName,
            mealPlan: subscription.mealPlanId.planName,
            scheduledDate: delivery.scheduledDate
          });

          console.log(`✅ Created delivery ${delivery.deliveryId} for subscription ${subscription._id}`);

        } catch (error) {
          console.error(`❌ Error creating delivery for subscription ${subscription._id}:`, error);
          errors.push({
            subscriptionId: subscription._id,
            error: error.message,
            action: 'retry_manual'
          });
        }
      }

      await session.commitTransaction();

      // Send notifications for errors that need attention
      if (errors.length > 0) {
        await this.notifyAdminsOfDeliveryCreationErrors(errors);
      }

      console.log(`✨ Auto-creation completed: ${results.length} deliveries created, ${errors.length} errors`);

      return {
        success: true,
        data: {
          deliveriesCreated: results.length,
          errors: errors.length,
          results,
          errors: errors
        }
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error in auto-create daily deliveries:', error);
      return {
        success: false,
        message: 'Failed to auto-create deliveries',
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Auto-assign drivers to ready deliveries
   */
  async autoAssignDrivers() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('🚚 Starting auto-assignment of drivers...');

      // Find deliveries that are ready for pickup and need driver assignment
      const readyDeliveries = await SubscriptionDelivery.find({
        status: 'ready',
        'driverAssignment.driverId': { $exists: false },
        scheduledDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      })
      .populate('subscriptionId', 'deliverySchedule')
      .populate('customerId', 'fullName address')
      .session(session);

      console.log(`📦 Found ${readyDeliveries.length} deliveries ready for driver assignment`);

      const results = [];
      const errors = [];

      for (const delivery of readyDeliveries) {
        try {
          // Find available drivers in the delivery area
          const availableDriver = await this.findBestAvailableDriver(
            delivery.deliveryInfo.coordinates,
            delivery.scheduledDate,
            session
          );

          if (!availableDriver) {
            console.log(`⚠️  No available driver for delivery ${delivery.deliveryId}`);
            errors.push({
              deliveryId: delivery.deliveryId,
              error: 'No available driver in area',
              action: 'expand_search_radius'
            });
            continue;
          }

          // Create driver assignment
          const driverAssignment = new DriverAssignment({
            driverId: availableDriver._id,
            orderId: delivery.orderId, // If exists
            subscriptionInfo: {
              subscriptionId: delivery.subscriptionId._id,
              mealPlanId: delivery.subscriptionId.mealPlanId,
              customerId: delivery.customerId._id
            },
            pickupLocation: {
              address: 'Chef Location', // Would get from chef assignment
              coordinates: { lat: 0, lng: 0 } // Would get from chef
            },
            deliveryLocation: {
              address: delivery.deliveryInfo.address,
              coordinates: delivery.deliveryInfo.coordinates
            },
            scheduledPickupTime: delivery.scheduledDate,
            estimatedDeliveryTime: new Date(delivery.scheduledDate.getTime() + 45 * 60 * 1000), // +45 min
            deliveryInstructions: delivery.deliveryInfo.specialInstructions || '',
            status: 'assigned'
          });

          await driverAssignment.save({ session });

          // Update delivery with driver assignment
          delivery.driverAssignment = {
            assignmentId: driverAssignment._id,
            driverId: availableDriver._id,
            assignedAt: new Date()
          };
          delivery.status = 'driver_assigned';

          await delivery.save({ session });

          // Update driver workload
          await this.updateDriverWorkload(availableDriver._id, 'add', session);

          results.push({
            deliveryId: delivery.deliveryId,
            driverId: availableDriver._id,
            driverName: availableDriver.fullName,
            customer: delivery.customerId.fullName,
            scheduledTime: delivery.scheduledDate
          });

          // Send notification to driver
          await this.notifyDriverOfNewAssignment(availableDriver._id, delivery);

          console.log(`✅ Assigned driver ${availableDriver.fullName} to delivery ${delivery.deliveryId}`);

        } catch (error) {
          console.error(`❌ Error assigning driver for delivery ${delivery.deliveryId}:`, error);
          errors.push({
            deliveryId: delivery.deliveryId,
            error: error.message,
            action: 'retry_manual'
          });
        }
      }

      await session.commitTransaction();

      console.log(`✨ Auto-assignment completed: ${results.length} drivers assigned, ${errors.length} errors`);

      return {
        success: true,
        data: {
          driversAssigned: results.length,
          errors: errors.length,
          results,
          errors: errors
        }
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error in auto-assign drivers:', error);
      return {
        success: false,
        message: 'Failed to auto-assign drivers',
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Monitor and escalate overdue deliveries
   */
  async monitorOverdueDeliveries() {
    try {
      console.log('⏰ Starting overdue delivery monitoring...');

      const now = new Date();
      
      // Find deliveries that are overdue
      const overdueDeliveries = await SubscriptionDelivery.find({
        status: { $in: ['scheduled', 'chef_assigned', 'preparing', 'ready', 'out_for_delivery'] },
        scheduledDate: { $lt: now }
      })
      .populate('subscriptionId', 'userId frequency')
      .populate('customerId', 'fullName email phone')
      .populate('chefAssignment.chefId', 'fullName phone')
      .populate('driverAssignment.driverId', 'fullName phone');

      console.log(`🚨 Found ${overdueDeliveries.length} overdue deliveries`);

      const escalations = [];

      for (const delivery of overdueDeliveries) {
        const hoursOverdue = Math.round((now.getTime() - delivery.scheduledDate.getTime()) / (1000 * 60 * 60));
        
        let escalationLevel = 'low';
        if (hoursOverdue > 6) escalationLevel = 'high';
        else if (hoursOverdue > 2) escalationLevel = 'medium';

        const escalation = {
          deliveryId: delivery.deliveryId,
          subscriptionId: delivery.subscriptionId._id,
          customer: delivery.customerId,
          status: delivery.status,
          hoursOverdue,
          escalationLevel,
          scheduledDate: delivery.scheduledDate,
          chef: delivery.chefAssignment?.chefId,
          driver: delivery.driverAssignment?.driverId
        };

        escalations.push(escalation);

        // Auto-actions based on escalation level
        if (escalationLevel === 'high') {
          // High priority: Notify admin and customer
          await this.escalateHighPriorityDelivery(delivery);
        } else if (escalationLevel === 'medium') {
          // Medium priority: Notify relevant staff
          await this.escalateMediumPriorityDelivery(delivery);
        }

        console.log(`⚠️  Escalated ${escalationLevel} priority: ${delivery.deliveryId} (${hoursOverdue}h overdue)`);
      }

      // Create daily overdue report for admin dashboard
      await this.generateOverdueReport(escalations);

      return {
        success: true,
        data: {
          totalOverdue: overdueDeliveries.length,
          escalations: escalations.length,
          breakdown: {
            low: escalations.filter(e => e.escalationLevel === 'low').length,
            medium: escalations.filter(e => e.escalationLevel === 'medium').length,
            high: escalations.filter(e => e.escalationLevel === 'high').length
          }
        }
      };

    } catch (error) {
      console.error('❌ Error monitoring overdue deliveries:', error);
      return {
        success: false,
        message: 'Failed to monitor overdue deliveries',
        error: error.message
      };
    }
  }

  /**
   * Auto-update subscription progression
   */
  async updateSubscriptionProgression() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('📈 Starting subscription progression updates...');

      // Find completed deliveries from today that haven't updated progression
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const completedDeliveries = await SubscriptionDelivery.find({
        status: 'delivered',
        'driverAssignment.deliveredAt': {
          $gte: today,
          $lte: endOfDay
        },
        progressionUpdated: { $ne: true }
      })
      .populate('subscriptionId')
      .session(session);

      console.log(`📊 Found ${completedDeliveries.length} completed deliveries to update progression`);

      const results = [];

      for (const delivery of completedDeliveries) {
        try {
          const subscription = delivery.subscriptionId;

          // Update delivery metrics
          subscription.updateDeliveryMetrics(true, delivery.metrics?.onTimeDelivery !== false);

          // Update meal progression if this was a recurring delivery
          if (subscription.frequency === 'daily') {
            subscription.metrics.consecutiveDeliveryDays += 1;
          }

          // Check if subscription should move to next phase
          await this.checkSubscriptionPhaseProgression(subscription, session);

          // Mark delivery as progression updated
          delivery.progressionUpdated = true;
          await delivery.save({ session });
          await subscription.save({ session });

          results.push({
            subscriptionId: subscription._id,
            deliveryId: delivery.deliveryId,
            newMetrics: subscription.metrics
          });

          console.log(`✅ Updated progression for subscription ${subscription._id}`);

        } catch (error) {
          console.error(`❌ Error updating progression for delivery ${delivery.deliveryId}:`, error);
        }
      }

      await session.commitTransaction();

      console.log(`✨ Progression update completed: ${results.length} subscriptions updated`);

      return {
        success: true,
        data: {
          subscriptionsUpdated: results.length,
          results
        }
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error updating subscription progression:', error);
      return {
        success: false,
        message: 'Failed to update subscription progression',
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }

  // Helper methods

  async getMealAssignmentForDate(subscriptionId, mealPlanId, date, session) {
    // This would implement logic to get the correct meal assignment for the date
    // For now, return a basic structure
    return {
      _id: new mongoose.Types.ObjectId(),
      mealPlanId,
      weekNumber: 1,
      dayOfWeek: date.getDay() || 1,
      mealTime: 'lunch', // Default or determined by subscription preferences
      title: 'Scheduled Meal',
      customTitle: null
    };
  }

  async findBestAvailableDriver(coordinates, scheduledDate, session) {
    // Find drivers who are:
    // 1. Available and online
    // 2. In the delivery area (within reasonable distance)
    // 3. Not overloaded with deliveries
    // 4. Have good performance ratings

    const availableDrivers = await Driver.find({
      isAvailable: true,
      status: 'online',
      // Would add location-based query here
    })
    .limit(10)
    .session(session);

    // Simple selection - in production would use sophisticated matching
    return availableDrivers[0] || null;
  }

  async updateChefWorkload(chefAssignmentId, action, session) {
    const assignment = await SubscriptionChefAssignment.findById(chefAssignmentId).session(session);
    if (assignment) {
      if (action === 'add') {
        assignment.workload.totalMealsPending += 1;
        assignment.workload.currentWeekMeals += 1;
      } else if (action === 'complete') {
        assignment.workload.totalMealsCompleted += 1;
        assignment.workload.totalMealsPending = Math.max(0, assignment.workload.totalMealsPending - 1);
      }
      await assignment.save({ session });
    }
  }

  async updateDriverWorkload(driverId, action, session) {
    // Update driver's current workload
    // Implementation would track active deliveries, routes, etc.
    console.log(`📊 Updated driver ${driverId} workload: ${action}`);
  }

  async checkSubscriptionPhaseProgression(subscription, session) {
    // Check if subscription should transition to next phase
    // E.g., trial to paid, weekly to monthly, etc.
    const totalDelivered = subscription.metrics.totalMealsDelivered;
    const planDuration = subscription.mealPlanId?.durationWeeks || 1;
    const expectedDeliveries = planDuration * 7; // Assuming daily

    if (totalDelivered >= expectedDeliveries && subscription.autoRenewal) {
      // Auto-renew subscription
      console.log(`🔄 Auto-renewing subscription ${subscription._id}`);
      // Implementation would handle renewal logic
    }
  }

  async notifyAdminsOfDeliveryCreationErrors(errors) {
    // Send notification to admins about delivery creation issues
    console.log(`📧 Notifying admins of ${errors.length} delivery creation errors`);
    // Would integrate with actual notification service
  }

  async notifyDriverOfNewAssignment(driverId, delivery) {
    // Send notification to driver about new assignment
    console.log(`📱 Notifying driver ${driverId} of new assignment: ${delivery.deliveryId}`);
    // Would integrate with push notification service
  }

  async escalateHighPriorityDelivery(delivery) {
    // High priority escalation actions
    console.log(`🚨 High priority escalation for delivery ${delivery.deliveryId}`);
    // Would send alerts to admin, customer service, etc.
  }

  async escalateMediumPriorityDelivery(delivery) {
    // Medium priority escalation actions
    console.log(`⚠️  Medium priority escalation for delivery ${delivery.deliveryId}`);
    // Would send notifications to relevant team members
  }

  async generateOverdueReport(escalations) {
    // Generate and store daily overdue report
    console.log(`📊 Generated overdue report with ${escalations.length} items`);
    // Would save to database for admin dashboard
  }

  /**
   * Run all automated workflows
   */
  async runDailyWorkflows() {
    console.log('🔄 Starting daily workflow automation...');

    const results = {
      timestamp: new Date(),
      workflows: {}
    };

    try {
      // 1. Create tomorrow's deliveries
      results.workflows.deliveryCreation = await this.autoCreateDailyDeliveries();

      // 2. Assign drivers to ready deliveries
      results.workflows.driverAssignment = await this.autoAssignDrivers();

      // 3. Monitor overdue deliveries
      results.workflows.overdueMonitoring = await this.monitorOverdueDeliveries();

      // 4. Update subscription progression
      results.workflows.progressionUpdate = await this.updateSubscriptionProgression();

      console.log('✨ Daily workflow automation completed successfully');

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('❌ Error in daily workflow automation:', error);
      return {
        success: false,
        message: 'Daily workflow automation failed',
        error: error.message,
        partialResults: results
      };
    }
  }
}

module.exports = new WorkflowAutomationService();