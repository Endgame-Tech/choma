const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const Chef = require('../models/Chef');
const ChefReassignmentRequest = require('../models/ChefReassignmentRequest');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// All routes require admin authentication
router.use(authenticateAdmin);

// ==========================================
// SUBSCRIPTION OVERVIEW AND MANAGEMENT
// ==========================================

// GET /api/admin/subscription-management/subscriptions - Get all subscriptions with filtering
router.get('/subscriptions', cacheMiddleware.adminShort, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    // Add status filter
    if (status && status !== 'all') {
      if (status === 'issues') {
        // Find subscriptions with issues
        query.$or = [
          { status: 'paused' },
          { 'issues.pendingReassignmentRequests': { $gt: 0 } },
          { 'issues.customerComplaints': { $gt: 0 } }
        ];
      } else {
        query.status = status;
      }
    }

    // Create aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'customers',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId'
        }
      },
      { $unwind: '$userId' },
      {
        $lookup: {
          from: 'mealplans',
          localField: 'mealPlanId',
          foreignField: '_id',
          as: 'mealPlanId'
        }
      },
      { $unwind: '$mealPlanId' },
      {
        $lookup: {
          from: 'subscriptionchefassignments',
          localField: '_id',
          foreignField: 'subscriptionId',
          pipeline: [{ $match: { assignmentStatus: 'active' } }],
          as: 'chefAssignment'
        }
      },
      {
        $lookup: {
          from: 'chefs',
          localField: 'chefAssignment.chefId',
          foreignField: '_id',
          as: 'chefDetails'
        }
      },
      {
        $addFields: {
          chefAssignment: {
            $cond: {
              if: { $gt: [{ $size: '$chefAssignment' }, 0] },
              then: {
                $mergeObjects: [
                  { $arrayElemAt: ['$chefAssignment', 0] },
                  { chefId: { $arrayElemAt: ['$chefDetails', 0] } }
                ]
              },
              else: null
            }
          }
        }
      },
      {
        $addFields: {
          metrics: {
            completedMeals: { $ifNull: ['$metrics.completedMeals', 0] },
            totalMeals: { 
              $multiply: [
                { $ifNull: ['$mealPlanId.durationWeeks', 4] },
                { $ifNull: ['$mealPlanId.mealsPerWeek', 21] }
              ]
            },
            consecutiveDays: { $ifNull: ['$metrics.consecutiveDays', 0] },
            progressPercentage: {
              $cond: {
                if: { $gt: [{ $multiply: [{ $ifNull: ['$mealPlanId.durationWeeks', 4] }, { $ifNull: ['$mealPlanId.mealsPerWeek', 21] }] }, 0] },
                then: {
                  $multiply: [
                    { $divide: [{ $ifNull: ['$metrics.completedMeals', 0] }, { $multiply: [{ $ifNull: ['$mealPlanId.durationWeeks', 4] }, { $ifNull: ['$mealPlanId.mealsPerWeek', 21] }] }] },
                    100
                  ]
                },
                else: 0
              }
            }
          },
          issues: {
            pendingReassignmentRequests: { $ifNull: ['$issues.pendingReassignmentRequests', 0] },
            skippedMeals: { $ifNull: ['$issues.skippedMeals', 0] },
            customerComplaints: { $ifNull: ['$issues.customerComplaints', 0] }
          }
        }
      }
    ];

    // Add search filter if provided
    if (search) {
      pipeline.unshift({
        $match: {
          $or: [
            { 'userId.fullName': { $regex: search, $options: 'i' } },
            { 'userId.email': { $regex: search, $options: 'i' } },
            { subscriptionId: { $regex: search, $options: 'i' } },
            { 'mealPlanId.planName': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    const subscriptions = await Subscription.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
    totalPipeline.push({ $count: 'total' });
    const totalResult = await Subscription.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCount: total,
        hasNext: skip + subscriptions.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/subscription-management/subscriptions/stats - Get subscription statistics
router.get('/subscriptions/stats', cacheMiddleware.adminMedium, async (req, res) => {
  try {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pausedSubscriptions: {
            $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$totalPrice' },
          averageSubscriptionValue: { $avg: '$totalPrice' }
        }
      }
    ]);

    // Get pending reassignment requests
    const pendingRequests = await ChefReassignmentRequest.countDocuments({ status: 'pending' });

    // Get subscriptions with issues
    const issuesRequiringAttention = await Subscription.countDocuments({
      $or: [
        { 'issues.pendingReassignmentRequests': { $gt: 0 } },
        { 'issues.customerComplaints': { $gt: 0 } },
        { status: 'paused' }
      ]
    });

    const result = {
      totalSubscriptions: stats[0]?.totalSubscriptions || 0,
      activeSubscriptions: stats[0]?.activeSubscriptions || 0,
      pausedSubscriptions: stats[0]?.pausedSubscriptions || 0,
      pendingRequests,
      issuesRequiringAttention,
      revenueMetrics: {
        monthlyRecurringRevenue: stats[0]?.totalRevenue || 0,
        averageSubscriptionValue: stats[0]?.averageSubscriptionValue || 0,
        churnRate: 0 // Calculate based on your business logic
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/subscription-management/subscriptions/:id - Get detailed subscription information
router.get('/subscriptions/:id', cacheMiddleware.adminShort, async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id)
      .populate('userId', 'fullName email phone')
      .populate('mealPlanId')
      .lean();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Get chef assignment details
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: id,
      assignmentStatus: 'active'
    }).populate('chefId', 'fullName email phone rating');

    if (chefAssignment) {
      subscription.chefAssignment = chefAssignment;
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('❌ Get subscription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/pause - Admin pause subscription
router.put('/subscriptions/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for pausing subscription'
      });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { 
        status: 'paused',
        $push: {
          adminActions: {
            action: 'pause',
            reason,
            performedBy: req.admin.id,
            performedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Admin pause subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/resume - Admin resume subscription
router.put('/subscriptions/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { 
        status: 'active',
        $push: {
          adminActions: {
            action: 'resume',
            reason: 'Admin resumed subscription',
            performedBy: req.admin.id,
            performedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Admin resume subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/cancel - Admin cancel subscription
router.put('/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for cancelling subscription'
      });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { 
        status: 'cancelled',
        $push: {
          adminActions: {
            action: 'cancel',
            reason,
            performedBy: req.admin.id,
            performedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Admin cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/delivery-preferences - Update delivery preferences
router.put('/subscriptions/:id/delivery-preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const { frequency, timeSlot, daysOfWeek, specialInstructions } = req.body;

    const updateData = {};
    if (frequency) updateData['deliveryPreferences.frequency'] = frequency;
    if (timeSlot) updateData['recurringDelivery.deliverySchedule.timeSlot'] = timeSlot;
    if (daysOfWeek) updateData['recurringDelivery.deliverySchedule.daysOfWeek'] = daysOfWeek;
    if (specialInstructions) updateData['specialInstructions'] = specialInstructions;

    updateData['$push'] = {
      adminActions: {
        action: 'update_preferences',
        reason: 'Admin updated delivery preferences',
        performedBy: req.admin.id,
        performedAt: new Date(),
        details: { frequency, timeSlot, daysOfWeek, specialInstructions }
      }
    };

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Delivery preferences updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Update delivery preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// CHEF REASSIGNMENT MANAGEMENT
// ==========================================

// GET /api/admin/subscription-management/chef-reassignment-requests - Get all chef reassignment requests
router.get('/chef-reassignment-requests', cacheMiddleware.adminShort, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await ChefReassignmentRequest.find(query)
      .populate('subscriptionId', 'subscriptionId')
      .populate('customerId', 'fullName email')
      .populate('currentChefId', 'fullName email')
      .sort({ requestedAt: -1, priority: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChefReassignmentRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCount: total,
        hasNext: skip + requests.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get chef reassignment requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chef reassignment requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/subscription-management/subscriptions/:id/available-chefs - Get available chefs for reassignment
router.get('/subscriptions/:id/available-chefs', async (req, res) => {
  try {
    const { id } = req.params;

    // Get subscription details to understand requirements
    const subscription = await Subscription.findById(id).populate('mealPlanId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Find available chefs (basic criteria - can be enhanced)
    const availableChefs = await Chef.aggregate([
      {
        $match: {
          accountStatus: 'approved',
          isAvailable: true
        }
      },
      {
        $lookup: {
          from: 'subscriptionchefassignments',
          localField: '_id',
          foreignField: 'chefId',
          pipeline: [{ $match: { assignmentStatus: 'active' } }],
          as: 'currentAssignments'
        }
      },
      {
        $addFields: {
          currentWorkload: { $size: '$currentAssignments' },
          maxCapacity: { $ifNull: ['$maxCapacity', 10] }, // Default max capacity
          availability: {
            daysOfWeek: { $ifNull: ['$availability.daysOfWeek', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']] },
            timeSlots: { $ifNull: ['$availability.timeSlots', ['09:00-11:00', '12:00-14:00', '15:00-17:00']] }
          },
          performance: {
            averageRating: { $ifNull: ['$rating', 5] },
            completedOrders: { $ifNull: ['$metrics.completedOrders', 0] },
            onTimePercentage: { $ifNull: ['$metrics.onTimePercentage', 95] },
            customerSatisfaction: { $ifNull: ['$metrics.customerSatisfaction', 4.5] }
          }
        }
      },
      {
        $match: {
          $expr: { $lt: ['$currentWorkload', '$maxCapacity'] }
        }
      },
      {
        $sort: { 'performance.averageRating': -1, currentWorkload: 1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      success: true,
      data: availableChefs
    });
  } catch (error) {
    console.error('❌ Get available chefs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available chefs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/chef-reassignment-requests/:id/approve - Approve chef reassignment
router.put('/chef-reassignment-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { newChefId, adminNotes } = req.body;

    if (!newChefId) {
      return res.status(400).json({
        success: false,
        message: 'New chef ID is required'
      });
    }

    // Find the reassignment request
    const request = await ChefReassignmentRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Reassignment request not found'
      });
    }

    // Update the request status
    request.status = 'approved';
    request.adminNotes = adminNotes;
    request.approvedBy = req.admin.id;
    request.approvedAt = new Date();
    await request.save();

    // Update the chef assignment
    await SubscriptionChefAssignment.findOneAndUpdate(
      { subscriptionId: request.subscriptionId, assignmentStatus: 'active' },
      { assignmentStatus: 'completed', completedAt: new Date() }
    );

    // Create new chef assignment
    await SubscriptionChefAssignment.create({
      subscriptionId: request.subscriptionId,
      chefId: newChefId,
      assignedBy: req.admin.id,
      assignmentStatus: 'active',
      assignedAt: new Date(),
      reason: 'Chef reassignment approved by admin'
    });

    res.json({
      success: true,
      message: 'Chef reassignment approved successfully'
    });
  } catch (error) {
    console.error('❌ Approve chef reassignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve chef reassignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/chef-reassignment-requests/:id/reject - Reject chef reassignment
router.put('/chef-reassignment-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const request = await ChefReassignmentRequest.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: req.admin.id,
        rejectedAt: new Date()
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Reassignment request not found'
      });
    }

    res.json({
      success: true,
      message: 'Chef reassignment request rejected'
    });
  } catch (error) {
    console.error('❌ Reject chef reassignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject chef reassignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/assign-chef - Manually assign chef
router.put('/subscriptions/:id/assign-chef', async (req, res) => {
  try {
    const { id } = req.params;
    const { chefId, reason } = req.body;

    if (!chefId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Chef ID and reason are required'
      });
    }

    // Verify chef exists and is available
    const chef = await Chef.findById(chefId);
    if (!chef || chef.accountStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Chef not found or not approved'
      });
    }

    // Update existing assignment to completed
    await SubscriptionChefAssignment.findOneAndUpdate(
      { subscriptionId: id, assignmentStatus: 'active' },
      { assignmentStatus: 'completed', completedAt: new Date() }
    );

    // Create new assignment
    await SubscriptionChefAssignment.create({
      subscriptionId: id,
      chefId,
      assignedBy: req.admin.id,
      assignmentStatus: 'active',
      assignedAt: new Date(),
      reason
    });

    res.json({
      success: true,
      message: 'Chef assigned successfully'
    });
  } catch (error) {
    console.error('❌ Manual chef assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign chef',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// MEAL TIMELINE AND MONITORING
// ==========================================

// GET /api/admin/subscription-management/subscriptions/:id/timeline - Get subscription meal timeline
router.get('/subscriptions/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, daysAhead = 30 } = req.query;

    // Get subscription details
    const subscription = await Subscription.findById(id).populate('mealPlanId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Calculate date range
    let dateStart = startDate ? new Date(startDate) : new Date();
    let dateEnd = endDate ? new Date(endDate) : new Date();
    
    if (!endDate && daysAhead) {
      dateEnd = new Date(dateStart.getTime() + (parseInt(daysAhead) * 24 * 60 * 60 * 1000));
    }

    // Get meal assignments and deliveries
    const deliveries = await SubscriptionDelivery.find({
      subscriptionId: id,
      scheduledDate: { $gte: dateStart, $lte: dateEnd }
    })
    .populate('mealAssignment.assignmentId')
    .populate('chefAssignment.chefId', 'fullName')
    .sort({ scheduledDate: 1 });

    // Transform to timeline format
    const timeline = deliveries.map(delivery => ({
      date: delivery.scheduledDate,
      mealType: delivery.mealAssignment?.mealType || 'lunch',
      mealName: delivery.mealAssignment?.assignmentId?.title || 'Scheduled Meal',
      status: delivery.status,
      chefId: delivery.chefAssignment?.chefId?._id,
      chefName: delivery.chefAssignment?.chefId?.fullName,
      estimatedTime: delivery.chefAssignment?.estimatedReadyTime,
      actualTime: delivery.delivery?.completedAt,
      customerRating: delivery.customer?.rating,
      customerFeedback: delivery.customer?.feedback,
      adminNotes: delivery.adminNotes,
      canModify: ['scheduled', 'preparing'].includes(delivery.status)
    }));

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('❌ Get subscription timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription timeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/subscription-management/subscriptions/:id/skip-meal - Admin skip meal delivery
router.post('/subscriptions/:id/skip-meal', async (req, res) => {
  try {
    const { id } = req.params;
    const { skipDate, reason } = req.body;

    if (!skipDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Skip date and reason are required'
      });
    }

    // Find the delivery to skip
    const delivery = await SubscriptionDelivery.findOne({
      subscriptionId: id,
      scheduledDate: {
        $gte: new Date(new Date(skipDate).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(skipDate).setHours(23, 59, 59, 999))
      }
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'No delivery found for the specified date'
      });
    }

    // Update delivery status
    delivery.status = 'skipped';
    delivery.adminNotes = `Skipped by admin: ${reason}`;
    delivery.skippedBy = req.admin.id;
    delivery.skippedAt = new Date();
    await delivery.save();

    // Update subscription metrics
    await Subscription.findByIdAndUpdate(id, {
      $inc: { 'issues.skippedMeals': 1 },
      $push: {
        adminActions: {
          action: 'skip_meal',
          reason,
          performedBy: req.admin.id,
          performedAt: new Date(),
          details: { skipDate }
        }
      }
    });

    res.json({
      success: true,
      message: 'Meal delivery skipped successfully'
    });
  } catch (error) {
    console.error('❌ Admin skip meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip meal delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/subscription-management/subscriptions/:id/reschedule-meal - Reschedule meal delivery
router.put('/subscriptions/:id/reschedule-meal', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentDate, newDate, reason } = req.body;

    if (!currentDate || !newDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Current date, new date, and reason are required'
      });
    }

    // Find the delivery to reschedule
    const delivery = await SubscriptionDelivery.findOne({
      subscriptionId: id,
      scheduledDate: {
        $gte: new Date(new Date(currentDate).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(currentDate).setHours(23, 59, 59, 999))
      }
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'No delivery found for the specified date'
      });
    }

    // Update delivery with new date
    delivery.scheduledDate = new Date(newDate);
    delivery.status = 'rescheduled';
    delivery.adminNotes = `Rescheduled by admin: ${reason}`;
    delivery.rescheduledBy = req.admin.id;
    delivery.rescheduledAt = new Date();
    await delivery.save();

    // Add admin action to subscription
    await Subscription.findByIdAndUpdate(id, {
      $push: {
        adminActions: {
          action: 'reschedule_meal',
          reason,
          performedBy: req.admin.id,
          performedAt: new Date(),
          details: { currentDate, newDate }
        }
      }
    });

    res.json({
      success: true,
      message: 'Meal delivery rescheduled successfully'
    });
  } catch (error) {
    console.error('❌ Reschedule meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule meal delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// ANALYTICS AND REPORTING
// ==========================================

// GET /api/admin/subscription-management/analytics/subscription-performance - Get subscription performance analytics
router.get('/analytics/subscription-performance', cacheMiddleware.adminMedium, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    const analytics = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          averageValue: { $avg: '$totalPrice' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pausedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = analytics[0] || {
      totalSubscriptions: 0,
      totalRevenue: 0,
      averageValue: 0,
      activeCount: 0,
      pausedCount: 0,
      cancelledCount: 0
    };

    res.json({
      success: true,
      data: {
        period,
        metrics: result,
        calculatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Get subscription analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/subscription-management/subscriptions/requiring-attention - Get subscriptions requiring attention
router.get('/subscriptions/requiring-attention', cacheMiddleware.adminShort, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      $or: [
        { status: 'paused' },
        { 'issues.pendingReassignmentRequests': { $gt: 0 } },
        { 'issues.customerComplaints': { $gt: 0 } },
        { 'issues.skippedMeals': { $gt: 2 } } // More than 2 skipped meals
      ]
    })
    .populate('userId', 'fullName email phone')
    .populate('mealPlanId', 'planName')
    .sort({ 'issues.pendingReassignmentRequests': -1, 'issues.customerComplaints': -1 })
    .limit(50);

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('❌ Get subscriptions requiring attention error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions requiring attention',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/subscription-management/subscriptions/:id/health-score - Get subscription health score
router.get('/subscriptions/:id/health-score', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Calculate health score based on various factors
    let healthScore = 100;
    const issues = [];

    // Deduct points for issues
    if (subscription.status === 'paused') {
      healthScore -= 30;
      issues.push('Subscription is paused');
    }

    if (subscription.issues?.customerComplaints > 0) {
      healthScore -= subscription.issues.customerComplaints * 15;
      issues.push(`${subscription.issues.customerComplaints} customer complaints`);
    }

    if (subscription.issues?.skippedMeals > 2) {
      healthScore -= (subscription.issues.skippedMeals - 2) * 10;
      issues.push(`${subscription.issues.skippedMeals} skipped meals`);
    }

    if (subscription.issues?.pendingReassignmentRequests > 0) {
      healthScore -= subscription.issues.pendingReassignmentRequests * 20;
      issues.push(`${subscription.issues.pendingReassignmentRequests} pending chef reassignment requests`);
    }

    // Ensure score doesn't go below 0
    healthScore = Math.max(0, healthScore);

    // Determine health status
    let status = 'excellent';
    if (healthScore < 50) status = 'poor';
    else if (healthScore < 70) status = 'needs_attention';
    else if (healthScore < 85) status = 'good';

    res.json({
      success: true,
      data: {
        healthScore,
        status,
        issues,
        recommendations: generateRecommendations(subscription, healthScore, issues)
      }
    });
  } catch (error) {
    console.error('❌ Get subscription health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate subscription health score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to generate recommendations
function generateRecommendations(subscription, healthScore, issues) {
  const recommendations = [];

  if (subscription.status === 'paused') {
    recommendations.push('Review reason for pause and consider resuming if issues are resolved');
  }

  if (subscription.issues?.customerComplaints > 0) {
    recommendations.push('Follow up on customer complaints and implement improvements');
  }

  if (subscription.issues?.skippedMeals > 2) {
    recommendations.push('Investigate reasons for frequent meal skipping');
  }

  if (subscription.issues?.pendingReassignmentRequests > 0) {
    recommendations.push('Process pending chef reassignment requests promptly');
  }

  if (healthScore < 50) {
    recommendations.push('Consider direct customer outreach to address concerns');
  }

  return recommendations;
}

module.exports = router;