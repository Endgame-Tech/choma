const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const Customer = require('../models/Customer');

// Get user's subscriptions
exports.getUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user.id })
      .populate('mealPlanId')
      .sort({ createdDate: -1 });

    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length
    });
  } catch (err) {
    console.error('Get user subscriptions error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findOne({ 
      _id: id, 
      userId: req.user.id 
    })
    .populate('mealPlanId')
    .populate('userId', 'fullName email phone');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (err) {
    console.error('Get subscription by ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Create new subscription
exports.createSubscription = async (req, res) => {
  try {
    const {
      mealPlan,
      frequency,
      duration,
      startDate,
      deliveryAddress,
      specialInstructions
    } = req.body;

    // Validation
    if (!mealPlan || !frequency || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Meal plan, frequency, and duration are required'
      });
    }

    // Verify meal plan exists
    const mealPlanDoc = await MealPlan.findById(mealPlan);
    if (!mealPlanDoc) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Calculate total price based on frequency, duration, and meal plan price
    const frequencyMultiplier = {
      'Daily': 1,
      'Twice Daily': 2,
      'Thrice Daily': 3
    };

    const durationMultiplier = {
      'Weekly': 1,
      'Monthly': 4
    };

    const totalPrice = mealPlanDoc.basePrice * 
      frequencyMultiplier[frequency] * 
      durationMultiplier[duration];

    // Calculate next delivery date
    const nextDelivery = new Date(startDate || Date.now());
    nextDelivery.setDate(nextDelivery.getDate() + 1); // Next day delivery

    // Calculate end date
    const endDate = new Date(startDate || Date.now());
    if (duration === 'Weekly') {
      endDate.setDate(endDate.getDate() + 7);
    } else if (duration === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription = await Subscription.create({
      subscriptionId: `SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`, // Generate a unique subscription ID
      userId: req.user.id,
      mealPlanId: mealPlan,
      frequency,
      duration,
      startDate: startDate || new Date(),
      nextDelivery,
      endDate,
      totalPrice,
      price: totalPrice, // Add required price field
      deliveryAddress,
      specialInstructions,
      paymentStatus: 'Pending',
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}` // Generate transaction ID
    });

    await subscription.populate('mealPlanId');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Create subscription error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      'frequency',
      'duration',
      'deliveryAddress',
      'specialInstructions'
    ];
    
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // If frequency or duration changed, recalculate price
    if (filteredUpdates.frequency || filteredUpdates.duration) {
      const subscription = await Subscription.findOne({ 
        _id: id, 
        userId: req.user.id 
      }).populate('mealPlanId');

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const frequencyMultiplier = {
        'Daily': 1,
        'Twice Daily': 2,
        'Thrice Daily': 3
      };

      const durationMultiplier = {
        'Weekly': 1,
        'Monthly': 4
      };

      const newFrequency = filteredUpdates.frequency || subscription.frequency;
      const newDuration = filteredUpdates.duration || subscription.duration;

      filteredUpdates.totalPrice = subscription.mealPlanId.basePrice * 
        frequencyMultiplier[newFrequency] * 
        durationMultiplier[newDuration];
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      filteredUpdates,
      { new: true, runValidators: true }
    ).populate('mealPlanId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Update subscription error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Pause subscription
exports.pauseSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findOneAndUpdate(
      { 
        _id: id, 
        userId: req.user.id,
        status: 'Active'
      },
      { status: 'Paused' },
      { new: true, runValidators: true }
    ).populate('mealPlanId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or cannot be paused'
      });
    }

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Pause subscription error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to pause subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Resume subscription
exports.resumeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findOneAndUpdate(
      { 
        _id: id, 
        userId: req.user.id,
        status: 'Paused'
      },
      { status: 'Active' },
      { new: true, runValidators: true }
    ).populate('mealPlanId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or cannot be resumed'
      });
    }

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Resume subscription error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status: 'Cancelled' },
      { new: true, runValidators: true }
    ).populate('mealPlanId');

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
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
