const Driver = require('../models/Driver');
const DriverAssignment = require('../models/DriverAssignment');
const Order = require('../models/Order');
const deliveryAssignmentService = require('../services/deliveryAssignmentService');

// @desc    Get all drivers with filtering and pagination
// @route   GET /api/admin/drivers
// @access  Private (Admin)
const getDrivers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Filter by account status
    if (status) {
      query.accountStatus = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { driverId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get drivers with pagination
    const drivers = await Driver.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalDrivers = await Driver.countDocuments(query);

    // Enhance driver data with current assignments and stats
    const enhancedDrivers = await Promise.all(
      drivers.map(async (driver) => {
        // Get current active assignment
        const activeAssignment = await DriverAssignment.findOne({
          driverId: driver._id,
          status: { $in: ['assigned', 'picked_up'] }
        }).select('status orderId estimatedDeliveryTime');

        // Calculate completion rate
        const totalAssignments = driver.stats?.totalDeliveries || 0;
        const completedAssignments = driver.stats?.completedDeliveries || 0;
        const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

        return {
          ...driver,
          activeAssignment,
          completionRate: Math.round(completionRate)
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      total: totalDrivers,
      pending: await Driver.countDocuments({ accountStatus: 'pending' }),
      approved: await Driver.countDocuments({ accountStatus: 'approved' }),
      suspended: await Driver.countDocuments({ accountStatus: 'suspended' }),
      online: await Driver.countDocuments({ 
        accountStatus: 'approved', 
        status: 'online' 
      }),
      busy: await Driver.countDocuments({ 
        accountStatus: 'approved', 
        status: 'busy' 
      })
    };

    res.json({
      success: true,
      data: enhancedDrivers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalDrivers / limit),
        totalItems: totalDrivers,
        itemsPerPage: parseInt(limit)
      },
      summary
    });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers',
      error: error.message
    });
  }
};

// @desc    Get single driver details
// @route   GET /api/admin/drivers/:id
// @access  Private (Admin)
const getDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findById(id)
      .select('-password')
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get driver's assignment history
    const assignments = await DriverAssignment.find({ driverId: id })
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate detailed stats
    const totalEarnings = assignments
      .filter(a => a.status === 'delivered')
      .reduce((sum, a) => sum + (a.totalEarning || 0), 0);

    const avgRating = assignments
      .filter(a => a.rating)
      .reduce((sum, a, _, arr) => sum + a.rating / arr.length, 0);

    // Get current active assignment
    const activeAssignment = await DriverAssignment.findOne({
      driverId: id,
      status: { $in: ['assigned', 'picked_up'] }
    }).populate('orderId', 'orderNumber totalAmount');

    res.json({
      success: true,
      data: {
        ...driver,
        recentAssignments: assignments,
        activeAssignment,
        detailedStats: {
          totalEarnings,
          averageRating: Math.round(avgRating * 10) / 10,
          totalAssignments: assignments.length,
          completedAssignments: assignments.filter(a => a.status === 'delivered').length
        }
      }
    });

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver details',
      error: error.message
    });
  }
};

// @desc    Update driver account status
// @route   PUT /api/admin/drivers/:id/status
// @access  Private (Admin)
const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus, reason } = req.body;

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const previousStatus = driver.accountStatus;

    // Update driver status
    driver.accountStatus = accountStatus;
    driver.statusHistory = driver.statusHistory || [];
    driver.statusHistory.push({
      status: accountStatus,
      changedAt: new Date(),
      changedBy: req.admin.id, // Admin who made the change
      reason: reason || 'Status updated by admin'
    });

    await driver.save();

    // Log status change
    console.log(`Driver ${driver.driverId} status changed from ${previousStatus} to ${accountStatus} by admin ${req.admin.id}`);

    // If driver is suspended, cancel any active assignments
    if (accountStatus === 'suspended') {
      await DriverAssignment.updateMany(
        {
          driverId: id,
          status: { $in: ['assigned', 'picked_up'] }
        },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'Driver account suspended'
        }
      );
    }

    res.json({
      success: true,
      message: `Driver status updated to ${accountStatus}`,
      data: {
        driverId: driver._id,
        accountStatus: driver.accountStatus,
        previousStatus
      }
    });

  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status',
      error: error.message
    });
  }
};

// @desc    Get driver assignments
// @route   GET /api/admin/drivers/:id/assignments
// @access  Private (Admin)
const getDriverAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { driverId: id };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const assignments = await DriverAssignment.find(query)
      .populate('orderId', 'orderNumber totalAmount userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalAssignments = await DriverAssignment.countDocuments(query);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAssignments / limit),
        totalItems: totalAssignments,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get driver assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver assignments',
      error: error.message
    });
  }
};

// @desc    Create new delivery assignment (Admin)
// @route   POST /api/admin/assignments
// @access  Private (Admin)
const createDriverAssignment = async (req, res) => {
  try {
    const {
      orderId,
      driverId,
      priority = 'normal',
      specialInstructions,
      estimatedPickupTime,
      isFirstDelivery = false
    } = req.body;

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await DriverAssignment.findOne({ orderId });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Assignment already exists for this order'
      });
    }

    // Create assignment using the service
    const result = await deliveryAssignmentService.createAssignmentFromOrder(orderId, {
      priority,
      isFirstDelivery,
      autoAssign: !!driverId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // If specific driver is assigned, assign immediately
    if (driverId) {
      const driver = await Driver.findById(driverId);
      if (!driver || driver.accountStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Driver not found or not approved'
        });
      }

      const assignment = result.assignment;
      assignment.driverId = driverId;
      assignment.status = 'assigned';
      assignment.acceptedAt = new Date();
      await assignment.save();

      // Update order status to reflect driver assignment for mobile app tracking
      await Order.findByIdAndUpdate(orderId, {
        orderStatus: 'Out for Delivery',
        updatedAt: new Date()
      });

      // Invalidate mobile app caches for immediate status update
      try {
        const { cacheService } = require("../config/redis");
        const customerId = order.customer;
        
        if (customerId && cacheService) {
          const cacheKeys = [
            `user:${customerId}:/api/orders/assigned:{}`,
            `user-orders:${customerId}:1:20:`,
            `user:${customerId}:/api/orders:{}`,
          ];
          
          for (const key of cacheKeys) {
            await cacheService.delete(key);
            console.log(`🗑️ Cache invalidated: ${key}`);
          }
          
          console.log(`🔄 Cache invalidated for customer ${customerId} after driver assignment`);
        }
      } catch (cacheError) {
        console.warn("⚠️ Failed to invalidate cache after driver assignment:", cacheError.message);
      }

      // Send notification to customer about driver assignment
      try {
        const NotificationService = require("../services/notificationService");
        
        await NotificationService.createNotification({
          userId: order.customer,
          title: "Driver Assigned",
          message: `🚚 Your order is now out for delivery! Driver ${driver.fullName} is on the way to deliver your delicious meals.`,
          type: "driver_assignment",
          data: {
            orderId,
            driverId,
            driverName: driver.fullName,
            vehicleInfo: driver.vehicleInfo
          },
          priority: "high",
        });
      } catch (notificationError) {
        console.warn("⚠️ Failed to send driver assignment notification:", notificationError.message);
      }

      await driver.startDelivery();
    }

    res.status(201).json({
      success: true,
      message: 'Delivery assignment created successfully',
      data: result.assignment
    });

  } catch (error) {
    console.error('Create driver assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery assignment',
      error: error.message
    });
  }
};

// @desc    Get delivery statistics
// @route   GET /api/admin/delivery-stats
// @access  Private (Admin)
const getDeliveryStats = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      driverId
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    } else {
      // Default to last 30 days
      dateFilter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    // Build driver filter
    const driverFilter = driverId ? { driverId } : {};
    const query = { ...dateFilter, ...driverFilter };

    // Get delivery statistics
    const [
      totalAssignments,
      completedDeliveries,
      cancelledDeliveries,
      avgDeliveryTime,
      totalEarnings,
      topDrivers
    ] = await Promise.all([
      // Total assignments
      DriverAssignment.countDocuments(query),
      
      // Completed deliveries
      DriverAssignment.countDocuments({ ...query, status: 'delivered' }),
      
      // Cancelled deliveries
      DriverAssignment.countDocuments({ ...query, status: 'cancelled' }),
      
      // Average delivery time
      DriverAssignment.aggregate([
        { $match: { ...query, status: 'delivered', pickedUpAt: { $exists: true }, deliveredAt: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$deliveredAt', '$pickedUpAt'] },
                  1000 * 60 // Convert to minutes
                ]
              }
            }
          }
        }
      ]),
      
      // Total earnings
      DriverAssignment.aggregate([
        { $match: { ...query, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalEarning' } } }
      ]),
      
      // Top performing drivers
      DriverAssignment.aggregate([
        { $match: { ...query, status: 'delivered' } },
        {
          $group: {
            _id: '$driverId',
            completedDeliveries: { $sum: 1 },
            totalEarnings: { $sum: '$totalEarning' },
            avgRating: { $avg: '$rating' }
          }
        },
        { $sort: { completedDeliveries: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'drivers',
            localField: '_id',
            foreignField: '_id',
            as: 'driver'
          }
        },
        { $unwind: '$driver' },
        {
          $project: {
            driverId: '$driver.driverId',
            fullName: '$driver.fullName',
            completedDeliveries: 1,
            totalEarnings: 1,
            avgRating: { $round: ['$avgRating', 1] }
          }
        }
      ])
    ]);

    // Calculate completion rate
    const completionRate = totalAssignments > 0 
      ? Math.round((completedDeliveries / totalAssignments) * 100) 
      : 0;

    // Calculate cancellation rate
    const cancellationRate = totalAssignments > 0
      ? Math.round((cancelledDeliveries / totalAssignments) * 100)
      : 0;

    const stats = {
      overview: {
        totalAssignments,
        completedDeliveries,
        cancelledDeliveries,
        completionRate,
        cancellationRate,
        avgDeliveryTime: avgDeliveryTime[0]?.avgTime || 0,
        totalEarnings: totalEarnings[0]?.total || 0
      },
      topDrivers: topDrivers || [],
      dateRange: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery statistics',
      error: error.message
    });
  }
};

// @desc    Delete driver
// @route   DELETE /api/admin/drivers/:id
// @access  Private (Admin)
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check if driver has active assignments
    const activeAssignment = await DriverAssignment.findOne({
      driverId: id,
      status: { $in: ['assigned', 'picked_up'] }
    });

    if (activeAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete driver with active assignments. Please cancel or reassign first.'
      });
    }

    // Cancel all pending assignments
    await DriverAssignment.updateMany(
      {
        driverId: id,
        status: 'pending'
      },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Driver account deleted'
      }
    );

    // Delete the driver
    await Driver.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Driver deleted successfully'
    });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete driver',
      error: error.message
    });
  }
};

module.exports = {
  getDrivers,
  getDriver,
  updateDriverStatus,
  getDriverAssignments,
  createDriverAssignment,
  getDeliveryStats,
  deleteDriver
};