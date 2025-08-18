const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

// ============= ENHANCED PAYMENT MANAGEMENT =============

// Get all payments with advanced filtering
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const paymentStatus = req.query.paymentStatus || '';
    const paymentMethod = req.query.paymentMethod || '';
    const sortBy = req.query.sortBy || 'createdDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin) : null;
    const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax) : null;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Search functionality
    if (search) {
      // Search by order ID, transaction ID, or customer info
      const customers = await Customer.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const customerIds = customers.map(c => c._id);
      
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { customer: { $in: customerIds } }
      ];
    }
    
    // Filter by payment status
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    // Filter by payment method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdDate = {};
      if (dateFrom) query.createdDate.$gte = new Date(dateFrom);
      if (dateTo) query.createdDate.$lte = new Date(dateTo);
    }
    
    // Amount range filter
    if (amountMin !== null || amountMax !== null) {
      query.totalAmount = {};
      if (amountMin !== null) query.totalAmount.$gte = amountMin;
      if (amountMax !== null) query.totalAmount.$lte = amountMax;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Execute query with population
    const payments = await Order.find(query)
      .populate('customer', 'fullName email phone customerId')
      .populate({
        path: 'subscription',
        populate: {
          path: 'mealPlanId',
          select: 'planName planType'
        }
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    // Get payment statistics
    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const methodStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Calculate success rate
    const totalPayments = await Order.countDocuments({});
    const successfulPayments = await Order.countDocuments({ paymentStatus: 'Paid' });
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    res.json({
      success: true,
      data: {
        payments,
        stats: {
          paymentStatus: paymentStats.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, total: stat.totalAmount };
            return acc;
          }, {}),
          paymentMethod: methodStats.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, total: stat.totalAmount };
            return acc;
          }, {}),
          successRate: successRate.toFixed(2)
        }
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all payments error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single payment details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const payment = await Order.findById(id)
      .populate('customer', 'fullName email phone customerId address')
      .populate({
        path: 'subscription',
        populate: {
          path: 'mealPlanId',
          select: 'planName planType description pricing'
        }
      })
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get payment history/timeline
    const paymentHistory = [
      { status: 'Pending', timestamp: payment.createdDate, note: 'Payment initiated' },
      ...(payment.paymentDate ? [{ status: 'Paid', timestamp: payment.paymentDate, note: 'Payment successful' }] : []),
      ...(payment.refundInitiatedDate ? [{ status: 'Refund Initiated', timestamp: payment.refundInitiatedDate, note: `Refund of ₦${payment.refundAmount || payment.totalAmount} initiated` }] : []),
      ...(payment.refundCompletedDate ? [{ status: 'Refunded', timestamp: payment.refundCompletedDate, note: 'Refund completed' }] : [])
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Get related orders for this customer
    const relatedPayments = await Order.find({
      customer: payment.customer._id,
      _id: { $ne: id }
    })
      .select('orderId totalAmount paymentStatus createdDate')
      .sort({ createdDate: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        payment,
        paymentHistory,
        relatedPayments
      }
    });
  } catch (err) {
    console.error('Get payment details error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId, paymentMethod, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded', 'Cancelled'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const payment = await Order.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Validate status transitions
    const currentStatus = payment.paymentStatus;
    const invalidTransitions = {
      'Paid': ['Pending'],
      'Refunded': ['Pending', 'Failed'],
      'Cancelled': ['Paid', 'Refunded']
    };

    if (invalidTransitions[currentStatus]?.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change payment status from ${currentStatus} to ${paymentStatus}`
      });
    }

    // Prepare update data
    const updateData = { paymentStatus };
    const now = new Date();

    // Set status-specific data
    switch (paymentStatus) {
      case 'Paid':
        updateData.paymentDate = now;
        if (transactionId) updateData.transactionId = transactionId;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        
        // Update order status if payment is successful
        if (payment.orderStatus === 'Pending') {
          updateData.orderStatus = 'Confirmed';
          updateData.confirmedDate = now;
        }
        break;
        
      case 'Failed':
        updateData.paymentFailedDate = now;
        updateData.paymentFailureReason = notes || 'Payment failed';
        break;
        
      case 'Refunded':
        updateData.refundCompletedDate = now;
        updateData.refundStatus = 'Completed';
        if (!payment.refundAmount) {
          updateData.refundAmount = payment.totalAmount;
        }
        break;
        
      case 'Cancelled':
        updateData.paymentCancelledDate = now;
        updateData.cancellationReason = notes || 'Payment cancelled';
        break;
    }

    const updatedPayment = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer', 'fullName email');

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: updatedPayment
    });
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Initiate refund
exports.initiateRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, reason, refundMethod = 'original' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const payment = await Order.findById(id).populate('customer', 'fullName email');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentStatus !== 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund paid orders'
      });
    }

    if (payment.refundStatus === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been refunded'
      });
    }

    // Validate refund amount
    const maxRefundAmount = payment.totalAmount - (payment.refundAmount || 0);
    const finalRefundAmount = refundAmount || maxRefundAmount;

    if (finalRefundAmount > maxRefundAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed ₦${maxRefundAmount}`
      });
    }

    // Update payment with refund information
    const updateData = {
      refundStatus: 'Pending',
      refundAmount: finalRefundAmount,
      refundInitiatedDate: new Date(),
      refundReason: reason || 'Admin initiated refund',
      refundMethod
    };

    const updatedPayment = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Here you would integrate with payment gateway for actual refund
    // For now, we'll simulate the refund process
    console.log(`Refund of ₦${finalRefundAmount} initiated for order ${payment.orderId}`);

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        payment: updatedPayment,
        refundAmount: finalRefundAmount,
        refundReference: `REF_${Date.now()}` // Simulated refund reference
      }
    });
  } catch (err) {
    console.error('Initiate refund error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate refund',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get payment analytics
exports.getPaymentAnalytics = async (req, res) => {
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
      case '1y':
        dateRange = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    // Revenue over time
    const revenueOverTime = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdDate' }
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0]
            }
          },
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payment method performance
    const paymentMethodPerformance = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: '$paymentMethod',
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }
          },
          averageAmount: {
            $avg: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', null] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$successfulTransactions', '$totalTransactions'] },
              100
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Failed payment analysis
    const failureAnalysis = await Order.aggregate([
      { 
        $match: { 
          createdDate: dateRange,
          paymentStatus: 'Failed'
        }
      },
      {
        $group: {
          _id: '$paymentFailureReason',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Refund statistics
    const refundStats = await Order.aggregate([
      { 
        $match: { 
          createdDate: dateRange,
          refundStatus: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$refundStatus',
          count: { $sum: 1 },
          totalRefundAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    // Customer payment behavior
    const customerBehavior = await Order.aggregate([
      { $match: { createdDate: dateRange } },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          },
          totalSpent: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }
          }
        }
      },
      {
        $addFields: {
          paymentSuccessRate: {
            $multiply: [
              { $divide: ['$successfulPayments', '$totalOrders'] },
              100
            ]
          }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        revenueOverTime,
        paymentMethodPerformance,
        failureAnalysis,
        refundStats,
        topCustomers: customerBehavior
      }
    });
  } catch (err) {
    console.error('Get payment analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get revenue summary
exports.getRevenueSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Daily revenue
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startOfDay },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Weekly revenue
    const weeklyRevenue = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startOfWeek },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startOfMonth },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Yearly revenue
    const yearlyRevenue = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startOfYear },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        daily: dailyRevenue[0] || { revenue: 0, orders: 0 },
        weekly: weeklyRevenue[0] || { revenue: 0, orders: 0 },
        monthly: monthlyRevenue[0] || { revenue: 0, orders: 0 },
        yearly: yearlyRevenue[0] || { revenue: 0, orders: 0 }
      }
    });
  } catch (err) {
    console.error('Get revenue summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue summary',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = exports;