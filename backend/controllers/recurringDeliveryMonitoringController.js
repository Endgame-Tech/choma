const MealAssignment = require('../models/MealAssignment');
const RecurringSubscription = require('../models/RecurringSubscription');
const mongoose = require('mongoose');

const recurringDeliveryMonitoringController = {
  /**
   * Get live delivery monitoring data
   */
  async getLiveDeliveries(req, res) {
    try {
      const { date, status, area } = req.query;
      
      // Build match query
      const matchQuery = {};
      
      // Filter by date if provided
      if (date) {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        matchQuery.scheduledDate = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      } else {
        // Default to today
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        matchQuery.scheduledDate = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }
      
      // Filter by status if provided and not 'all'
      if (status && status !== 'all') {
        if (status === 'overdue') {
          matchQuery.isOverdue = true;
        } else {
          matchQuery.status = status;
        }
      }
      
      // Aggregate deliveries with populated data
      const deliveries = await MealAssignment.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'recurringsubscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription'
          }
        },
        { $unwind: '$subscription' },
        {
          $lookup: {
            from: 'users',
            localField: 'subscription.userId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $lookup: {
            from: 'mealplans',
            localField: 'subscription.mealPlanId',
            foreignField: '_id',
            as: 'mealPlan'
          }
        },
        { $unwind: '$mealPlan' },
        {
          $lookup: {
            from: 'chefs',
            localField: 'assignedChef',
            foreignField: '_id',
            as: 'chef'
          }
        },
        { $unwind: { path: '$chef', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'drivers',
            localField: 'assignedDriver',
            foreignField: '_id',
            as: 'driver'
          }
        },
        { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            // Check if delivery is overdue
            isOverdue: {
              $and: [
                { $in: ['$status', ['scheduled', 'chef_assigned', 'preparing']] },
                { $lt: ['$scheduledDate', new Date()] }
              ]
            },
            // Extract area from delivery address (simplified)
            deliveryArea: {
              $arrayElemAt: [
                { $split: ['$subscription.deliverySchedule.address', ','] },
                -2
              ]
            }
          }
        },
        // Filter by area if provided
        ...(area && area !== 'all' ? [
          {
            $match: {
              deliveryArea: { $regex: area, $options: 'i' }
            }
          }
        ] : []),
        {
          $project: {
            _id: 1,
            subscriptionId: '$subscription._id',
            customerName: '$customer.name',
            customerPhone: '$customer.phone',
            mealTitle: '$mealPlan.title',
            mealImage: '$mealPlan.imageUrl',
            chefName: '$chef.fullName',
            chefPhone: '$chef.phone',
            driverName: '$driver.fullName',
            driverPhone: '$driver.phone',
            status: 1,
            scheduledDate: 1,
            scheduledTimeSlot: '$subscription.deliverySchedule.timeSlot',
            deliveryAddress: '$subscription.deliverySchedule.address',
            coordinates: '$subscription.deliverySchedule.coordinates',
            estimatedReadyTime: 1,
            actualDeliveryTime: 1,
            isOverdue: 1,
            priority: { $ifNull: ['$priority', 'normal'] },
            timeline: {
              $ifNull: ['$statusHistory', []]
            }
          }
        },
        {
          $sort: { 
            priority: 1, // urgent first
            isOverdue: -1, // overdue first
            scheduledDate: 1 
          }
        },
        {
          $limit: 100 // Limit for performance
        }
      ]);

      res.json({
        success: true,
        data: deliveries
      });

    } catch (error) {
      console.error('Error fetching live deliveries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch live delivery data',
        error: error.message
      });
    }
  },

  /**
   * Get delivery statistics for the selected date
   */
  async getDeliveryStats(req, res) {
    try {
      const { date } = req.query;
      
      // Determine date range
      let targetDate;
      if (date) {
        targetDate = new Date(date);
      } else {
        targetDate = new Date(); // Today
      }
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregate delivery statistics
      const [statsResult] = await MealAssignment.aggregate([
        {
          $match: {
            scheduledDate: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            overdueCount: [
              {
                $match: {
                  $and: [
                    { $in: ['$status', ['scheduled', 'chef_assigned', 'preparing']] },
                    { $lt: ['$scheduledDate', new Date()] }
                  ]
                }
              },
              { $count: 'count' }
            ],
            onTimeDeliveries: [
              {
                $match: {
                  status: 'delivered',
                  actualDeliveryTime: { $exists: true },
                  scheduledDate: { $exists: true }
                }
              },
              {
                $addFields: {
                  isOnTime: {
                    $lte: ['$actualDeliveryTime', '$scheduledDate']
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  totalDelivered: { $sum: 1 },
                  onTimeCount: {
                    $sum: { $cond: ['$isOnTime', 1, 0] }
                  }
                }
              }
            ],
            averageDeliveryTime: [
              {
                $match: {
                  status: 'delivered',
                  actualDeliveryTime: { $exists: true },
                  createdAt: { $exists: true }
                }
              },
              {
                $addFields: {
                  deliveryDuration: {
                    $divide: [
                      { $subtract: ['$actualDeliveryTime', '$createdAt'] },
                      60000 // Convert to minutes
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  averageTime: { $avg: '$deliveryDuration' }
                }
              }
            ]
          }
        }
      ]);

      // Process status counts
      const statusCounts = {};
      let total = 0;
      
      if (statsResult.statusCounts) {
        statsResult.statusCounts.forEach(item => {
          statusCounts[item._id] = item.count;
          total += item.count;
        });
      }

      // Process other metrics
      const overdueCount = statsResult.overdueCount[0]?.count || 0;
      const onTimeData = statsResult.onTimeDeliveries[0] || {};
      const averageTimeData = statsResult.averageDeliveryTime[0] || {};

      const stats = {
        total,
        scheduled: statusCounts.scheduled || 0,
        chef_assigned: statusCounts.chef_assigned || 0,
        preparing: statusCounts.preparing || 0,
        ready: statusCounts.ready || 0,
        outForDelivery: statusCounts.out_for_delivery || 0,
        delivered: statusCounts.delivered || 0,
        failed: statusCounts.failed || 0,
        overdue: overdueCount,
        onTime: onTimeData.onTimeCount || 0,
        averageDeliveryTime: Math.round(averageTimeData.averageTime || 0)
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch delivery statistics',
        error: error.message
      });
    }
  }
};

module.exports = recurringDeliveryMonitoringController;