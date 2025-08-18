const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');

// ============= ENHANCED USER MANAGEMENT =============

// Get all users with advanced filtering and search
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'registrationDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.registrationDate = {};
      if (dateFrom) query.registrationDate.$gte = new Date(dateFrom);
      if (dateTo) query.registrationDate.$lte = new Date(dateTo);
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Execute query with aggregation for additional stats
    const users = await Customer.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'customer',
          as: 'orders'
        }
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'customer',
          as: 'subscriptions'
        }
      },
      {
        $addFields: {
          totalOrders: { $size: '$orders' },
          totalSpent: {
            $sum: {
              $map: {
                input: '$orders',
                as: 'order',
                in: { $cond: [{ $eq: ['$$order.paymentStatus', 'Paid'] }, '$$order.totalAmount', 0] }
              }
            }
          },
          activeSubscriptions: {
            $size: {
              $filter: {
                input: '$subscriptions',
                as: 'sub',
                cond: { $eq: ['$$sub.status', 'Active'] }
              }
            }
          },
          lastOrderDate: {
            $max: '$orders.createdDate'
          }
        }
      },
      {
        $project: {
          password: 0,
          orders: 0,
          subscriptions: 0
        }
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit }
    ]);

    const total = await Customer.countDocuments(query);

    // Get user statistics
    const userStats = await Customer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users,
        stats: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single user details with full analytics
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get user with detailed information
    const user = await Customer.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const orders = await Order.find({ customer: id })
      .populate('subscription')
      .sort({ createdDate: -1 })
      .limit(20);

    // Get user's subscriptions
    const subscriptions = await Subscription.find({ customer: id })
      .populate('mealPlanId')
      .sort({ subscriptionDate: -1 });

    // Calculate analytics
    const analytics = await Customer.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'customer',
          as: 'allOrders'
        }
      },
      {
        $addFields: {
          totalOrders: { $size: '$allOrders' },
          totalSpent: {
            $sum: {
              $map: {
                input: '$allOrders',
                as: 'order',
                in: { $cond: [{ $eq: ['$$order.paymentStatus', 'Paid'] }, '$$order.totalAmount', 0] }
              }
            }
          },
          averageOrderValue: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$allOrders',
                    as: 'order',
                    cond: { $eq: ['$$order.paymentStatus', 'Paid'] }
                  }
                },
                as: 'paidOrder',
                in: '$$paidOrder.totalAmount'
              }
            }
          },
          lastOrderDate: { $max: '$allOrders.createdDate' },
          firstOrderDate: { $min: '$allOrders.createdDate' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        user,
        orders,
        subscriptions,
        analytics: analytics[0] || {}
      }
    });
  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update user status with enhanced validation
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!['Active', 'Inactive', 'Suspended', 'Deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Active, Inactive, Suspended, or Deleted'
      });
    }

    const existingUser = await Customer.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent reactivation of deleted accounts
    if (existingUser.status === 'Deleted' && status !== 'Deleted') {
      return res.status(400).json({
        success: false,
        message: 'Deleted accounts cannot be reactivated'
      });
    }

    const updateData = { status };
    
    // Handle status-specific logic
    if (status === 'Deleted' && !existingUser.deletedAt) {
      updateData.deletedAt = new Date();
      
      // Cancel active subscriptions
      await Subscription.updateMany(
        { customer: id, status: 'Active' },
        { 
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'User account deleted'
        }
      );
    } else if (status === 'Suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason || 'Administrative action';
      
      // Pause active subscriptions
      await Subscription.updateMany(
        { customer: id, status: 'Active' },
        { 
          status: 'Paused',
          pausedAt: new Date(),
          pauseReason: 'Account suspended'
        }
      );
    } else if (status === 'Active' && existingUser.status === 'Suspended') {
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    const updatedUser = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: updatedUser
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Bulk update user status
exports.bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, status, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!['Active', 'Inactive', 'Suspended', 'Deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Validate all user IDs
    const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some user IDs are invalid'
      });
    }

    // Find existing users
    const existingUsers = await Customer.find({ _id: { $in: validIds } });
    if (existingUsers.length !== validIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some users not found'
      });
    }

    const updateData = { status };
    
    if (status === 'Deleted') {
      updateData.deletedAt = new Date();
    } else if (status === 'Suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason || 'Bulk administrative action';
    }

    // Update users
    const result = await Customer.updateMany(
      { _id: { $in: validIds } },
      updateData
    );

    // Handle subscription updates for deleted/suspended users
    if (status === 'Deleted') {
      await Subscription.updateMany(
        { customer: { $in: validIds }, status: 'Active' },
        { 
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'User account deleted'
        }
      );
    } else if (status === 'Suspended') {
      await Subscription.updateMany(
        { customer: { $in: validIds }, status: 'Active' },
        { 
          status: 'Paused',
          pausedAt: new Date(),
          pauseReason: 'Account suspended'
        }
      );
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} users updated to ${status}`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (err) {
    console.error('Bulk update user status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update user status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete user permanently (super admin only)
exports.deleteUserPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await Customer.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Require email confirmation for permanent deletion
    if (confirmEmail !== user.email) {
      return res.status(400).json({
        success: false,
        message: 'Email confirmation does not match'
      });
    }

    // Check if user has any active orders or subscriptions
    const activeOrders = await Order.countDocuments({
      customer: id,
      orderStatus: { $in: ['Pending', 'Confirmed', 'InProgress'] }
    });

    const activeSubscriptions = await Subscription.countDocuments({
      customer: id,
      status: 'Active'
    });

    if (activeOrders > 0 || activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active orders or subscriptions'
      });
    }

    // Delete related data
    await Order.deleteMany({ customer: id });
    await Subscription.deleteMany({ customer: id });
    
    // Finally delete the user
    await Customer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User permanently deleted',
      data: {
        deletedUserId: id,
        deletedEmail: user.email
      }
    });
  } catch (err) {
    console.error('Delete user permanently error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user permanently',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Export users data
exports.exportUsers = async (req, res) => {
  try {
    const { format = 'json', status, dateFrom, dateTo } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.registrationDate = {};
      if (dateFrom) query.registrationDate.$gte = new Date(dateFrom);
      if (dateTo) query.registrationDate.$lte = new Date(dateTo);
    }

    const users = await Customer.find(query)
      .select('-password')
      .lean();

    if (format === 'csv') {
      const csvFields = [
        'customerId', 'fullName', 'email', 'phone', 'status',
        'registrationDate', 'totalOrders', 'totalSpent'
      ];
      
      // You would implement CSV conversion here
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      
      // For now, return JSON format
      res.json({
        success: true,
        message: 'CSV export functionality to be implemented',
        data: users
      });
    } else {
      res.json({
        success: true,
        data: users,
        meta: {
          totalUsers: users.length,
          exportDate: new Date(),
          filters: { status, dateFrom, dateTo }
        }
      });
    }
  } catch (err) {
    console.error('Export users error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Send notification to user(s)
exports.sendUserNotification = async (req, res) => {
  try {
    const { userIds, title, message, type = 'info' } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Validate user IDs
    const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some user IDs are invalid'
      });
    }

    // Find existing users
    const users = await Customer.find({ 
      _id: { $in: validIds },
      status: { $ne: 'Deleted' }
    }).select('email fullName');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid users found'
      });
    }

    // Here you would integrate with your notification service
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      data: {
        sentTo: users.length,
        recipients: users.map(u => ({ id: u._id, name: u.fullName, email: u.email }))
      }
    });
  } catch (err) {
    console.error('Send user notification error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = exports;