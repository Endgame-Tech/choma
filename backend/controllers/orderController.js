const Order = require('../models/Order');
const Customer = require('../models/Customer');
const MealPlan = require('../models/MealPlan');
const NotificationService = require('../services/notificationService');

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    // Get orders that are NOT assigned to chefs or are completed/cancelled
    const orders = await Order.find({ 
      customer: req.user.id,
      $or: [
        { assignedChef: { $exists: false } },
        { assignedChef: null },
        { delegationStatus: { $in: ['Completed', 'Cancelled'] } }
      ]
    })
      .populate('subscription')
      .populate('customer', 'fullName email phone')
      .populate('assignedChef', 'fullName email chefId')
      .sort({ createdDate: -1 });

    console.log(`📋 Found ${orders.length} orders for user ${req.user.id}`);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get user's orders that are assigned to chefs (in progress)
exports.getUserAssignedOrders = async (req, res) => {
  try {
    // Get orders that are assigned to chefs and in progress
    const orders = await Order.find({ 
      customer: req.user.id,
      assignedChef: { $exists: true, $ne: null },
      delegationStatus: { $in: ['Assigned', 'Accepted', 'In Progress', 'Ready'] }
    })
      .populate('subscription')
      .populate('customer', 'fullName email phone')
      .populate('assignedChef', 'fullName email chefId')
      .sort({ createdDate: -1 });

    console.log(`🍳 Found ${orders.length} assigned orders for user ${req.user.id}`);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (err) {
    console.error('Get user assigned orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned orders',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({ 
      _id: id, 
      customer: req.user.id 
    })
    .populate('subscription')
    .populate('customer', 'fullName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    console.error('Get order by ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const {
      subscription,
      orderItems,
      totalAmount,
      paymentMethod,
      paymentReference,
      deliveryAddress,
      deliveryDate,
      specialInstructions
    } = req.body;

    // Validation
    if (!orderItems || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order items, total amount, and payment method are required'
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      subscription,
      orderItems,
      totalAmount,
      paymentMethod,
      paymentReference,
      deliveryAddress: deliveryAddress || req.user.address,
      deliveryDate,
      specialInstructions,
      paymentStatus: 'Pending'
    });

    // Update customer's total orders and spent
    await Customer.findByIdAndUpdate(req.user.id, {
      $inc: { totalOrders: 1, totalSpent: totalAmount }
    });

    // Send order confirmation notification
    try {
      await NotificationService.notifyOrderConfirmed(req.user.id, {
        orderId: order._id,
        totalAmount: totalAmount,
        deliveryDate: deliveryDate
      });
    } catch (notificationError) {
      console.error('Failed to send order notification:', notificationError);
      // Don't fail the order creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      'deliveryAddress',
      'deliveryDate',
      'specialInstructions'
    ];
    
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    const order = await Order.findOneAndUpdate(
      { _id: id, customer: req.user.id },
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to update it'
      });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update order status (admin function, but keeping for completeness)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updates = {};
    if (status) updates.orderStatus = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    
    if (status === 'Delivered') {
      updates.actualDelivery = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Rate an order
exports.rateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const order = await Order.findOneAndUpdate(
      { 
        _id: id, 
        customer: req.user.id,
        orderStatus: 'Delivered' // Only allow rating delivered orders
      },
      {
        customerRating: rating,
        customerFeedback: feedback
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or cannot be rated'
      });
    }

    res.json({
      success: true,
      message: 'Order rated successfully',
      data: order
    });
  } catch (err) {
    console.error('Rate order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to rate order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
