const RecurringSubscription = require('../models/RecurringSubscription');
const MealPlan = require('../models/MealPlan');
const Chef = require('../models/Chef');
const MealAssignment = require('../models/MealAssignment');
const mongoose = require('mongoose');

const recurringDeliveryAnalyticsController = {
  /**
   * Get subscription metrics for analytics dashboard
   */
  async getSubscriptionMetrics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Aggregate subscription metrics
      const [metricsResult] = await RecurringSubscription.aggregate([
        {
          $facet: {
            totalSubscriptions: [
              { $count: "count" }
            ],
            activeSubscriptions: [
              { $match: { status: 'active' } },
              { $count: "count" }
            ],
            pausedSubscriptions: [
              { $match: { status: 'paused' } },
              { $count: "count" }
            ],
            cancelledSubscriptions: [
              { $match: { status: 'cancelled' } },
              { $count: "count" }
            ],
            newSubscriptionsThisMonth: [
              { 
                $match: { 
                  createdAt: { $gte: startDate },
                  status: { $in: ['active', 'paused'] }
                }
              },
              { $count: "count" }
            ],
            recentCancellations: [
              {
                $match: {
                  status: 'cancelled',
                  updatedAt: { $gte: startDate }
                }
              },
              { $count: "count" }
            ],
            subscriptionDurations: [
              {
                $match: { status: 'cancelled' }
              },
              {
                $addFields: {
                  duration: {
                    $divide: [
                      { $subtract: ["$updatedAt", "$createdAt"] },
                      86400000 // Convert to days
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  averageDuration: { $avg: "$duration" }
                }
              }
            ],
            revenueMetrics: [
              {
                $match: { status: { $in: ['active', 'paused'] } }
              },
              {
                $lookup: {
                  from: 'mealplans',
                  localField: 'mealPlanId',
                  foreignField: '_id',
                  as: 'mealPlan'
                }
              },
              {
                $unwind: '$mealPlan'
              },
              {
                $group: {
                  _id: null,
                  totalRecurringRevenue: { $sum: '$mealPlan.price' },
                  averageRevenuePerSubscription: { $avg: '$mealPlan.price' },
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]);

      const totalSubs = metricsResult.totalSubscriptions[0]?.count || 0;
      const activeSubs = metricsResult.activeSubscriptions[0]?.count || 0;
      const pausedSubs = metricsResult.pausedSubscriptions[0]?.count || 0;
      const cancelledSubs = metricsResult.cancelledSubscriptions[0]?.count || 0;
      const newSubs = metricsResult.newSubscriptionsThisMonth[0]?.count || 0;
      const recentCancellations = metricsResult.recentCancellations[0]?.count || 0;
      const avgDuration = metricsResult.subscriptionDurations[0]?.averageDuration || 0;
      const revenueData = metricsResult.revenueMetrics[0] || {};

      // Calculate metrics
      const churnRate = totalSubs > 0 ? (recentCancellations / totalSubs) * 100 : 0;
      const reactivationRate = Math.max(0, ((activeSubs - newSubs) / Math.max(1, pausedSubs)) * 100);
      const customerLifetimeValue = revenueData.averageRevenuePerSubscription * (avgDuration / 30) || 0;

      const metrics = {
        totalSubscriptions: totalSubs,
        activeSubscriptions: activeSubs,
        pausedSubscriptions: pausedSubs,
        cancelledSubscriptions: cancelledSubs,
        newSubscriptionsThisMonth: newSubs,
        churnRate: Math.round(churnRate * 10) / 10,
        averageSubscriptionDuration: Math.round(avgDuration),
        reactivationRate: Math.round(reactivationRate * 10) / 10,
        totalRecurringRevenue: revenueData.totalRecurringRevenue || 0,
        averageRevenuePerSubscription: revenueData.averageRevenuePerSubscription || 0,
        customerLifetimeValue: Math.round(customerLifetimeValue)
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription metrics',
        error: error.message
      });
    }
  },

  /**
   * Get meal plan popularity metrics
   */
  async getMealPlanPopularity(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const mealPlanStats = await RecurringSubscription.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'mealplans',
            localField: 'mealPlanId',
            foreignField: '_id',
            as: 'mealPlan'
          }
        },
        {
          $unwind: '$mealPlan'
        },
        {
          $lookup: {
            from: 'mealassignments',
            localField: '_id',
            foreignField: 'subscriptionId',
            as: 'assignments'
          }
        },
        {
          $group: {
            _id: '$mealPlanId',
            planName: { $first: '$mealPlan.title' },
            planImage: { $first: '$mealPlan.imageUrl' },
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['active', 'paused']] },
                  '$mealPlan.price',
                  0
                ]
              }
            },
            completedDeliveries: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$assignments',
                    cond: { $eq: ['$$this.status', 'delivered'] }
                  }
                }
              }
            },
            totalDeliveries: { $sum: { $size: '$assignments' } },
            cancelledSubscriptions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
              }
            }
          }
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [
                {
                  $divide: [
                    '$completedDeliveries',
                    { $max: ['$totalDeliveries', 1] }
                  ]
                },
                100
              ]
            },
            churnRate: {
              $multiply: [
                {
                  $divide: [
                    '$cancelledSubscriptions',
                    { $max: ['$totalSubscriptions', 1] }
                  ]
                },
                100
              ]
            },
            popularityScore: {
              $min: [
                100,
                {
                  $multiply: [
                    {
                      $add: [
                        { $multiply: ['$activeSubscriptions', 0.4] },
                        { $multiply: [
                          { $divide: ['$completedDeliveries', { $max: ['$totalDeliveries', 1] }] },
                          30
                        ]},
                        { $multiply: [
                          { $subtract: [1, { $divide: ['$cancelledSubscriptions', { $max: ['$totalSubscriptions', 1] }] }] },
                          30
                        ]}
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            planId: '$_id',
            planName: 1,
            planImage: 1,
            activeSubscriptions: 1,
            totalRevenue: 1,
            averageRating: { $literal: 4.5 }, // Mock rating for now
            completionRate: { $round: ['$completionRate', 1] },
            popularityScore: { $round: ['$popularityScore', 0] },
            churnRate: { $round: ['$churnRate', 1] }
          }
        },
        {
          $sort: { popularityScore: -1 }
        },
        {
          $limit: 10
        }
      ]);

      res.json({
        success: true,
        data: mealPlanStats
      });

    } catch (error) {
      console.error('Error fetching meal plan popularity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meal plan popularity data',
        error: error.message
      });
    }
  },

  /**
   * Get chef performance metrics
   */
  async getChefPerformance(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const chefPerformance = await MealAssignment.aggregate([
        {
          $match: {
            assignedChef: { $exists: true },
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'chefs',
            localField: 'assignedChef',
            foreignField: '_id',
            as: 'chef'
          }
        },
        {
          $unwind: '$chef'
        },
        {
          $lookup: {
            from: 'recurringsubscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription'
          }
        },
        {
          $unwind: '$subscription'
        },
        {
          $lookup: {
            from: 'mealplans',
            localField: 'subscription.mealPlanId',
            foreignField: '_id',
            as: 'mealPlan'
          }
        },
        {
          $unwind: '$mealPlan'
        },
        {
          $group: {
            _id: '$assignedChef',
            chefName: { $first: '$chef.fullName' },
            chefImage: { $first: '$chef.profileImage' },
            totalDeliveries: { $sum: 1 },
            completedDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
              }
            },
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'delivered'] },
                      { $lte: ['$actualDeliveryTime', '$scheduledDate'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            activeSubscriptions: {
              $addToSet: {
                $cond: [
                  { $eq: ['$subscription.status', 'active'] },
                  '$subscriptionId',
                  null
                ]
              }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'delivered'] },
                  '$mealPlan.price',
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            activeSubscriptions: {
              $size: {
                $filter: {
                  input: '$activeSubscriptions',
                  cond: { $ne: ['$$this', null] }
                }
              }
            },
            onTimeDeliveryRate: {
              $multiply: [
                {
                  $divide: [
                    '$onTimeDeliveries',
                    { $max: ['$completedDeliveries', 1] }
                  ]
                },
                100
              ]
            },
            customerRetentionRate: {
              $multiply: [
                {
                  $divide: [
                    '$completedDeliveries',
                    { $max: ['$totalDeliveries', 1] }
                  ]
                },
                100
              ]
            },
            consistencyScore: {
              $min: [
                100,
                {
                  $multiply: [
                    {
                      $add: [
                        { $multiply: [
                          { $divide: ['$onTimeDeliveries', { $max: ['$completedDeliveries', 1] }] },
                          50
                        ]},
                        { $multiply: [
                          { $divide: ['$completedDeliveries', { $max: ['$totalDeliveries', 1] }] },
                          50
                        ]}
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            chefId: '$_id',
            chefName: 1,
            chefImage: 1,
            activeSubscriptions: 1,
            totalDeliveries: 1,
            onTimeDeliveryRate: { $round: ['$onTimeDeliveryRate', 1] },
            averageRating: { $literal: 4.3 }, // Mock rating for now
            customerRetentionRate: { $round: ['$customerRetentionRate', 1] },
            revenueGenerated: '$totalRevenue',
            consistencyScore: { $round: ['$consistencyScore', 0] }
          }
        },
        {
          $sort: { consistencyScore: -1, totalDeliveries: -1 }
        },
        {
          $limit: 20
        }
      ]);

      res.json({
        success: true,
        data: chefPerformance
      });

    } catch (error) {
      console.error('Error fetching chef performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chef performance data',
        error: error.message
      });
    }
  },

  /**
   * Get subscription trends over time
   */
  async getSubscriptionTrends(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate, groupBy;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      }

      const trends = await RecurringSubscription.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: groupBy,
            newSubscriptions: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['active', 'paused']] },
                  1,
                  0
                ]
              }
            },
            cancellations: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'cancelled'] },
                      { $gte: ['$updatedAt', startDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            reactivations: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'active'] },
                      { $ne: ['$createdAt', '$updatedAt'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            pausedSubscriptions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paused'] }, 1, 0]
              }
            }
          }
        },
        {
          $addFields: {
            netGrowth: {
              $subtract: [
                { $add: ['$newSubscriptions', '$reactivations'] },
                '$cancellations'
              ]
            }
          }
        },
        {
          $project: {
            date: '$_id',
            newSubscriptions: 1,
            cancellations: 1,
            reactivations: 1,
            pausedSubscriptions: 1,
            netGrowth: 1
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      console.error('Error fetching subscription trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription trends data',
        error: error.message
      });
    }
  }
};

module.exports = recurringDeliveryAnalyticsController;