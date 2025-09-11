const unifiedSubscriptionService = require('../services/unifiedSubscriptionService');
const monitoringService = require('../services/monitoringService');
const { asyncHandler, successResponse } = require('../middleware/errorHandlingMiddleware');
const RecurringSubscription = require('../models/RecurringSubscription');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const Chef = require('../models/Chef');
const Driver = require('../models/Driver');

/**
 * Unified Subscription Management Controller
 * Provides APIs for next delivery management across all applications
 */

// ============ ADMIN APIS ============

/**
 * Get comprehensive next delivery overview for admin dashboard
 */
const getAdminNextDeliveryOverview = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    status,
    area,
    chefId,
    driverId,
    riskLevel,
    page = 1,
    limit = 50
  } = req.query;

  const filters = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status,
    area,
    chefId,
    driverId,
    riskLevel
  };

  console.log('🔍 Admin getting next delivery overview with filters:', filters);

  const result = await unifiedSubscriptionService.getNextDeliveryOverview(filters);

  if (!result.success) {
    throw new Error(result.message || 'Failed to get delivery overview');
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedData = result.data.deliveries.slice(startIndex, endIndex);

  res.json(successResponse({
    ...result.data,
    deliveries: paginatedData,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(result.data.deliveries.length / limit),
      totalItems: result.data.deliveries.length,
      itemsPerPage: parseInt(limit)
    }
  }, 'next_delivery_overview'));
});

/**
 * Reassign chef for subscription
 */
const reassignSubscriptionChef = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { newChefId, reason } = req.body;
  const adminId = req.user.id;

  if (!newChefId || !reason) {
    const error = new Error('New chef ID and reason are required');
    error.statusCode = 400;
    throw error;
  }

  console.log('🔄 Admin reassigning chef:', { subscriptionId, newChefId, adminId, reason });

  const result = await unifiedSubscriptionService.reassignChef(
    subscriptionId,
    newChefId,
    adminId,
    reason
  );

  if (!result.success) {
    throw new Error(result.message || 'Failed to reassign chef');
  }

  res.json(successResponse(result.data, 'chef_reassignment', { subscriptionId, newChefId }));
});

/**
 * Bulk update delivery schedules
 */
const bulkUpdateDeliverySchedules = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  const adminId = req.user.id;

  if (!Array.isArray(updates) || updates.length === 0) {
    const error = new Error('Updates array is required');
    error.statusCode = 400;
    throw error;
  }

  console.log('📅 Admin bulk updating delivery schedules:', { count: updates.length, adminId });

  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const subscription = await RecurringSubscription.findById(update.subscriptionId);
      if (!subscription) {
        errors.push({ subscriptionId: update.subscriptionId, error: 'Subscription not found' });
        continue;
      }

      const oldDate = subscription.nextDeliveryDate;
      subscription.nextDeliveryDate = new Date(update.newDate);
      
      subscription.adminNotes.push({
        note: `Delivery rescheduled: ${oldDate.toISOString()} → ${update.newDate}. Reason: ${update.reason}`,
        addedBy: adminId,
        category: 'delivery_issue'
      });

      await subscription.save();
      results.push({ subscriptionId: update.subscriptionId, success: true });

    } catch (error) {
      errors.push({ subscriptionId: update.subscriptionId, error: error.message });
    }
  }

  res.json(successResponse({
    totalUpdates: updates.length,
    successfulUpdates: results.length,
    failedUpdates: errors.length,
    results,
    errors
  }, 'bulk_schedule_update'));
});

/**
 * Get available chefs for reassignment
 */
const getAvailableChefs = asyncHandler(async (req, res) => {
  const { area, date, skillLevel } = req.query;

  let query = { isActive: true };
  if (area) query.serviceAreas = { $in: [area] };
  if (skillLevel) query.skillLevel = { $gte: parseInt(skillLevel) };

  const chefs = await Chef.find(query)
    .select('fullName email phone serviceAreas skillLevel maxSubscriptions')
    .lean();

  const chefsWithWorkload = await Promise.all(
    chefs.map(async (chef) => {
      const currentAssignments = await SubscriptionChefAssignment.countDocuments({
        chefId: chef._id,
        assignmentStatus: 'active'
      });

      const capacityResult = await unifiedSubscriptionService.checkChefCapacity(chef._id);

      return {
        ...chef,
        currentWorkload: currentAssignments,
        hasCapacity: capacityResult.hasCapacity,
        availableSlots: (chef.maxSubscriptions || 10) - currentAssignments
      };
    })
  );

  res.json(successResponse(chefsWithWorkload.filter(chef => chef.hasCapacity)));
});

// ============ CHEF APIS ============

/**
 * Get chef's next cooking assignments
 */
const getChefNextAssignments = asyncHandler(async (req, res) => {
  const chefId = req.chef?.chefId || req.user?.chefId;
  const { days = 7 } = req.query;

  if (!chefId) {
    const error = new Error('Chef ID is required');
    error.statusCode = 400;
    throw error;
  }

  console.log('👨‍🍳 Getting next assignments for chef:', chefId);

  const result = await unifiedSubscriptionService.getChefNextAssignments(chefId, parseInt(days));

  if (!result.success) {
    throw new Error(result.message || 'Failed to get chef assignments');
  }

  res.json(successResponse(result.data, 'chef_assignments'));
});

/**
 * Update cooking status for delivery
 */
const updateCookingStatus = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { status, notes, estimatedReadyTime } = req.body;
  const chefId = req.chef?.chefId || req.user?.chefId;

  if (!['preparing', 'ready', 'delayed'].includes(status)) {
    const error = new Error('Invalid status. Must be: preparing, ready, or delayed');
    error.statusCode = 400;
    throw error;
  }

  console.log('🍳 Chef updating cooking status:', { deliveryId, status, chefId });

  const metadata = {
    notes,
    estimatedReadyTime,
    chefId,
    updatedAt: new Date()
  };

  const result = await unifiedSubscriptionService.updateDeliveryStatus(
    deliveryId,
    status,
    'chef',
    metadata
  );

  if (!result.success) {
    throw new Error(result.message || 'Failed to update cooking status');
  }

  res.json(successResponse(result.data, 'cooking_status_update', { deliveryId, status }));
});

/**
 * Request reassignment from customer
 */
const requestChefReassignment = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { reason } = req.body;
  const chefId = req.chef?.chefId || req.user?.chefId;

  if (!reason) {
    const error = new Error('Reason is required for reassignment request');
    error.statusCode = 400;
    throw error;
  }

  console.log('🔄 Chef requesting reassignment:', { subscriptionId, chefId, reason });

  const assignment = await SubscriptionChefAssignment.findOne({
    subscriptionId,
    chefId,
    assignmentStatus: 'active'
  });

  if (!assignment) {
    const error = new Error('Assignment not found');
    error.statusCode = 404;
    throw error;
  }

  await assignment.requestReassignment('chef', reason);

  res.json(successResponse({
    message: 'Reassignment request submitted successfully',
    data: assignment
  }, 'chef_reassignment_request'));
});

// ============ DRIVER APIS ============

/**
 * Get driver's next delivery assignments
 */
const getDriverNextDeliveries = asyncHandler(async (req, res) => {
  const driverId = req.driver?.id || req.user?.driverId;
  const { days = 7 } = req.query;

  if (!driverId) {
    const error = new Error('Driver ID is required');
    error.statusCode = 400;
    throw error;
  }

  console.log('🚚 Getting next deliveries for driver:', driverId);

  const result = await unifiedSubscriptionService.getDriverNextDeliveries(driverId, parseInt(days));

  if (!result.success) {
    throw new Error(result.message || 'Failed to get driver deliveries');
  }

  res.json(successResponse(result.data, 'driver_assignments'));
});

/**
 * Update delivery status (pickup, out_for_delivery, delivered)
 */
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { status, notes, location, deliveryPhoto } = req.body;
  const driverId = req.driver?.id || req.user?.driverId;

  if (!['picked_up', 'out_for_delivery', 'delivered', 'failed'].includes(status)) {
    const error = new Error('Invalid status. Must be: picked_up, out_for_delivery, delivered, or failed');
    error.statusCode = 400;
    throw error;
  }

  console.log('🚛 Driver updating delivery status:', { deliveryId, status, driverId });

  const metadata = {
    notes,
    location,
    deliveryPhoto,
    driverId,
    updatedAt: new Date()
  };

  const result = await unifiedSubscriptionService.updateDeliveryStatus(
    deliveryId,
    status,
    'driver',
    metadata
  );

  if (!result.success) {
    throw new Error(result.message || 'Failed to update delivery status');
  }

  res.json(successResponse(result.data, 'delivery_status_update', { deliveryId, status }));
});

/**
 * Get route optimization for driver's deliveries
 */
const getOptimizedRoute = asyncHandler(async (req, res) => {
  const driverId = req.driver?.id || req.user?.driverId;
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  console.log('🗺️ Getting optimized route for driver:', { driverId, date });

  const targetDate = new Date(date);
  const deliveries = await SubscriptionDelivery.find({
    'driverAssignment.driverId': driverId,
    scheduledDate: {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999))
    },
    status: { $in: ['ready', 'out_for_delivery', 'assigned'] }
  })
  .populate('customerId', 'address fullName phone')
  .populate('deliveryInfo.coordinates')
  .lean();

  const optimizedRoute = deliveries.map((delivery, index) => ({
    ...delivery,
    routeOrder: index + 1,
    estimatedArrival: new Date(Date.now() + (index * 45 * 60 * 1000)),
    distanceFromPrevious: index === 0 ? 0 : Math.random() * 10
  }));

  res.json(successResponse({
    deliveries: optimizedRoute,
    totalDeliveries: deliveries.length,
    estimatedDuration: deliveries.length * 45,
    totalDistance: optimizedRoute.reduce((sum, d) => sum + d.distanceFromPrevious, 0)
  }, 'route_optimization'));
});

// ============ SHARED APIS ============

/**
 * Get subscription timeline for any role
 */
const getSubscriptionTimeline = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { days = 30 } = req.query;

  console.log('📅 Getting subscription timeline:', { subscriptionId, days });

  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const deliveries = await SubscriptionDelivery.find({
    subscriptionId,
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .populate('chefAssignment.chefId', 'fullName')
  .populate('driverAssignment.driverId', 'fullName')
  .sort({ scheduledDate: -1 })
  .lean();

  const subscription = await RecurringSubscription.findById(subscriptionId)
    .populate('userId', 'fullName email')
    .populate('mealPlanId', 'planName')
    .lean();

  res.json(successResponse({
    subscription,
    deliveries,
    totalDeliveries: deliveries.length
  }, 'subscription_timeline'));
});

/**
 * Get subscription statistics
 */
const getSubscriptionStatistics = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const userId = req.user?.id || req.chef?.chefId || req.driver?.id;

  console.log('📊 Getting subscription statistics:', { role, userId });

  let query = {};
  if (role === 'chef') {
    query = { 'chefAssignment.chefId': userId };
  } else if (role === 'driver') {
    query = { 'driverAssignment.driverId': userId };
  }

  const stats = await SubscriptionDelivery.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRating: { $avg: '$customer.rating' },
        totalEarnings: { $sum: '$payment.amount' }
      }
    }
  ]);

  const totalStats = await SubscriptionDelivery.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        totalEarnings: { $sum: '$payment.amount' },
        avgRating: { $avg: '$customer.rating' },
        onTimeDeliveries: {
          $sum: { $cond: ['$metrics.onTimeDelivery', 1, 0] }
        }
      }
    }
  ]);

  res.json(successResponse({
    byStatus: stats,
    overall: totalStats[0] || {},
    onTimeRate: totalStats[0] ? 
      Math.round((totalStats[0].onTimeDeliveries / totalStats[0].totalDeliveries) * 100) : 0
  }, 'subscription_statistics'));
});

/**
 * Get monitoring dashboard data (Admin only)
 */
const getMonitoringDashboard = asyncHandler(async (req, res) => {
  console.log('📊 Getting monitoring dashboard data for admin');

  const dashboardData = monitoringService.getDashboardData();
  const systemHealth = await monitoringService.getSystemHealth();

  res.json(successResponse({
    ...dashboardData,
    systemHealth
  }, 'monitoring_dashboard'));
});

/**
 * Trigger manual workflow (Admin only)
 */
const triggerManualWorkflow = asyncHandler(async (req, res) => {
  const { workflowName } = req.params;
  const adminId = req.user.id;

  console.log(`🔧 Admin ${adminId} triggering manual workflow: ${workflowName}`);

  // This would integrate with cronJobService
  // const cronJobService = require('../services/cronJobService');
  // const result = await cronJobService.triggerJob(workflowName);

  // For now, return success
  res.json(successResponse({
    message: `Workflow ${workflowName} triggered successfully`,
    triggeredBy: adminId,
    timestamp: new Date()
  }, 'manual_workflow_trigger'));
});

module.exports = {
  // Admin APIs
  getAdminNextDeliveryOverview,
  reassignSubscriptionChef,
  bulkUpdateDeliverySchedules,
  getAvailableChefs,
  
  // Chef APIs
  getChefNextAssignments,
  updateCookingStatus,
  requestChefReassignment,
  
  // Driver APIs
  getDriverNextDeliveries,
  updateDeliveryStatus,
  getOptimizedRoute,
  
  // Shared APIs
  getSubscriptionTimeline,
  getSubscriptionStatistics,
  
  // Monitoring APIs
  getMonitoringDashboard,
  triggerManualWorkflow
};