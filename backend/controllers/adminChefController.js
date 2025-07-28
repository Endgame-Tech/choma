const Chef = require('../models/Chef');
const Order = require('../models/Order');
const OrderDelegation = require('../models/OrderDelegation');
const mongoose = require('mongoose');

// ============= ENHANCED CHEF MANAGEMENT =============

// Get all chefs with advanced filtering
exports.getAllChefs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const specialization = req.query.specialization || '';
    const sortBy = req.query.sortBy || 'registrationDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const ratingMin = req.query.ratingMin ? parseFloat(req.query.ratingMin) : null;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { chefId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by specialization
    if (specialization) {
      query.specializations = { $in: [specialization] };
    }
    
    // Filter by minimum rating
    if (ratingMin !== null) {
      query.rating = { $gte: ratingMin };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Execute query with aggregation for additional stats
    const chefs = await Chef.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'orderdelegations',
          localField: '_id',
          foreignField: 'chef',
          as: 'delegations'
        }
      },
      {
        $addFields: {
          totalOrdersAssigned: { $size: '$delegations' },
          completedOrders: {
            $size: {
              $filter: {
                input: '$delegations',
                as: 'delegation',
                cond: { $eq: ['$$delegation.status', 'Completed'] }
              }
            }
          },
          pendingOrders: {
            $size: {
              $filter: {
                input: '$delegations',
                as: 'delegation',
                cond: { $eq: ['$$delegation.status', 'Assigned'] }
              }
            }
          },
          averageCompletionTime: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$delegations',
                    as: 'delegation',
                    cond: { $eq: ['$$delegation.status', 'Completed'] }
                  }
                },
                as: 'completedDelegation',
                in: {
                  $subtract: [
                    '$$completedDelegation.completedDate',
                    '$$completedDelegation.assignedDate'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          delegations: 0
        }
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit }
    ]);

    const total = await Chef.countDocuments(query);

    // Get chef statistics
    const chefStats = await Chef.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const specializationStats = await Chef.aggregate([
      { $unwind: '$specializations' },
      {
        $group: {
          _id: '$specializations',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        chefs,
        stats: {
          statusDistribution: chefStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          specializationDistribution: specializationStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalChefs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all chefs error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chefs',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single chef details
exports.getChefDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chef ID'
      });
    }

    const chef = await Chef.findById(id).lean();
    
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef not found'
      });
    }

    // Get chef's order delegations
    const delegations = await OrderDelegation.find({ chef: id })
      .populate({
        path: 'order',
        populate: {
          path: 'customer',
          select: 'fullName email'
        }
      })
      .sort({ assignedDate: -1 })
      .limit(20)
      .lean();

    // Calculate detailed analytics
    const analytics = await OrderDelegation.aggregate([
      { $match: { chef: mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] }
          },
          averageCompletionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'Completed'] },
                {
                  $subtract: ['$completedDate', '$assignedDate']
                },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get performance over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const performanceOverTime = await OrderDelegation.aggregate([
      { 
        $match: { 
          chef: mongoose.Types.ObjectId(id),
          assignedDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$assignedDate' }
          },
          assigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        chef,
        recentDelegations: delegations,
        analytics: analytics[0] || {
          totalAssigned: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          averageCompletionTime: 0
        },
        performanceOverTime
      }
    });
  } catch (err) {
    console.error('Get chef details error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chef details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update chef status
exports.updateChefStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chef ID'
      });
    }

    const validStatuses = ['Pending', 'Active', 'Suspended', 'Deactivated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Pending, Active, Suspended, or Deactivated'
      });
    }

    const chef = await Chef.findById(id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef not found'
      });
    }

    const updateData = { status };
    
    // Handle status-specific logic
    if (status === 'Suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason || 'Administrative action';
      
      // Cancel pending order delegations
      await OrderDelegation.updateMany(
        { chef: id, status: 'Assigned' },
        { 
          status: 'Cancelled',
          notes: 'Chef suspended'
        }
      );
    } else if (status === 'Active' && chef.status === 'Suspended') {
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    } else if (status === 'Deactivated') {
      updateData.deactivatedAt = new Date();
      updateData.deactivationReason = reason || 'Administrative action';
      
      // Cancel all pending order delegations
      await OrderDelegation.updateMany(
        { chef: id, status: 'Assigned' },
        { 
          status: 'Cancelled',
          notes: 'Chef deactivated'
        }
      );
    }

    const updatedChef = await Chef.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: `Chef status updated to ${status}`,
      data: updatedChef
    });
  } catch (err) {
    console.error('Update chef status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update chef status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update chef profile/details
exports.updateChefProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chef ID'
      });
    }

    const chef = await Chef.findById(id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef not found'
      });
    }

    // Remove sensitive fields that shouldn't be updated via admin
    delete updateData.password;
    delete updateData.chefId;
    delete updateData.status;
    delete updateData.rating;
    delete updateData.totalOrdersCompleted;

    const updatedChef = await Chef.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Chef profile updated successfully',
      data: updatedChef
    });
  } catch (err) {
    console.error('Update chef profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update chef profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Bulk update chef status
exports.bulkUpdateChefStatus = async (req, res) => {
  try {
    const { chefIds, status, reason } = req.body;

    if (!Array.isArray(chefIds) || chefIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chef IDs array is required'
      });
    }

    const validStatuses = ['Pending', 'Active', 'Suspended', 'Deactivated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Validate chef IDs
    const validIds = chefIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== chefIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some chef IDs are invalid'
      });
    }

    // Find existing chefs
    const chefs = await Chef.find({ _id: { $in: validIds } });
    if (chefs.length !== validIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some chefs not found'
      });
    }

    const updateData = { status };
    
    if (status === 'Suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason || 'Bulk administrative action';
    } else if (status === 'Deactivated') {
      updateData.deactivatedAt = new Date();
      updateData.deactivationReason = reason || 'Bulk administrative action';
    }

    // Update chefs
    const result = await Chef.updateMany(
      { _id: { $in: validIds } },
      updateData
    );

    // Handle order delegations for suspended/deactivated chefs
    if (status === 'Suspended' || status === 'Deactivated') {
      await OrderDelegation.updateMany(
        { chef: { $in: validIds }, status: 'Assigned' },
        { 
          status: 'Cancelled',
          notes: `Chef ${status.toLowerCase()}`
        }
      );
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} chefs updated to ${status}`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (err) {
    console.error('Bulk update chef status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update chef status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete chef permanently (super admin only)
exports.deleteChef = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chef ID'
      });
    }

    const chef = await Chef.findById(id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef not found'
      });
    }

    // Require email confirmation for permanent deletion
    if (confirmEmail !== chef.email) {
      return res.status(400).json({
        success: false,
        message: 'Email confirmation does not match'
      });
    }

    // Check for pending order delegations
    const pendingDelegations = await OrderDelegation.countDocuments({
      chef: id,
      status: 'Assigned'
    });

    if (pendingDelegations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete chef with pending order assignments'
      });
    }

    // Delete related data
    await OrderDelegation.deleteMany({ chef: id });
    
    // Finally delete the chef
    await Chef.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Chef permanently deleted',
      data: {
        deletedChefId: id,
        deletedEmail: chef.email
      }
    });
  } catch (err) {
    console.error('Delete chef error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chef',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get chef performance analytics
exports.getChefAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateRange = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateRange = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateRange = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    // Top performing chefs
    const topChefs = await OrderDelegation.aggregate([
      { $match: { assignedDate: dateRange } },
      {
        $group: {
          _id: '$chef',
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          completionRate: {
            $multiply: [
              { 
                $divide: [
                  { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                  { $sum: 1 }
                ]
              },
              100
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'chefs',
          localField: '_id',
          foreignField: '_id',
          as: 'chef'
        }
      },
      { $unwind: '$chef' },
      { $sort: { completionRate: -1, completed: -1 } },
      { $limit: 10 }
    ]);

    // Chef workload distribution
    const workloadDistribution = await Chef.aggregate([
      {
        $lookup: {
          from: 'orderdelegations',
          localField: '_id',
          foreignField: 'chef',
          as: 'delegations',
          pipeline: [
            { $match: { assignedDate: dateRange } }
          ]
        }
      },
      {
        $addFields: {
          workload: { $size: '$delegations' }
        }
      },
      {
        $bucket: {
          groupBy: '$workload',
          boundaries: [0, 1, 5, 10, 20, 50],
          default: '50+',
          output: {
            count: { $sum: 1 },
            chefs: { $push: { id: '$_id', name: '$fullName', workload: '$workload' } }
          }
        }
      }
    ]);

    // Specialization performance
    const specializationPerformance = await Chef.aggregate([
      { $unwind: '$specializations' },
      {
        $lookup: {
          from: 'orderdelegations',
          localField: '_id',
          foreignField: 'chef',
          as: 'delegations',
          pipeline: [
            { $match: { assignedDate: dateRange } }
          ]
        }
      },
      {
        $group: {
          _id: '$specializations',
          totalChefs: { $sum: 1 },
          totalDelegations: { $sum: { $size: '$delegations' } },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { totalDelegations: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        topChefs,
        workloadDistribution,
        specializationPerformance
      }
    });
  } catch (err) {
    console.error('Get chef analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chef analytics',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Send notification to chef(s)
exports.sendChefNotification = async (req, res) => {
  try {
    const { chefIds, title, message, type = 'info' } = req.body;

    if (!Array.isArray(chefIds) || chefIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chef IDs array is required'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Validate chef IDs
    const validIds = chefIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== chefIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some chef IDs are invalid'
      });
    }

    // Find existing chefs
    const chefs = await Chef.find({ 
      _id: { $in: validIds },
      status: { $ne: 'Deactivated' }
    }).select('email fullName');

    if (chefs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid chefs found'
      });
    }

    // Here you would integrate with your notification service
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: `Notification sent to ${chefs.length} chefs`,
      data: {
        sentTo: chefs.length,
        recipients: chefs.map(c => ({ id: c._id, name: c.fullName, email: c.email }))
      }
    });
  } catch (err) {
    console.error('Send chef notification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = exports;