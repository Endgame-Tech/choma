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
    console.log('📋 Subscription creation request body:', JSON.stringify(req.body, null, 2));

    const {
      mealPlan,
      selectedMealTypes,
      frequency,
      duration,
      durationWeeks,
      fullPlanDuration,
      startDate,
      deliveryAddress,
      specialInstructions,
      totalPrice,
      basePlanPrice,
      frequencyMultiplier,
      durationMultiplier,
      subscriptionId,
      paymentStatus,
      paymentReference,
      transactionId
    } = req.body;

    // Validation
    if (!mealPlan) {
      return res.status(400).json({
        success: false,
        message: 'Meal plan is required'
      });
    }

    if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid total price is required'
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

    console.log('📊 Meal plan found:', {
      planName: mealPlanDoc.planName,
      totalPrice: mealPlanDoc.totalPrice,
      durationWeeks: mealPlanDoc.durationWeeks,
      mealTypes: mealPlanDoc.mealTypes
    });

    // Use the calculated price from frontend, but validate it's reasonable
    const finalPrice = Math.round(totalPrice);
    
    // Validate price is reasonable (not negative, not excessively high)
    if (finalPrice < 100 || finalPrice > 10000000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price calculation detected'
      });
    }

    // Calculate next delivery date
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const nextDelivery = new Date(subscriptionStartDate);
    nextDelivery.setDate(nextDelivery.getDate() + 1); // Next day delivery

    // Calculate end date based on selected duration
    const endDate = new Date(subscriptionStartDate);
    const weeksToAdd = durationWeeks || (duration === 'Monthly' ? 4 : 1);
    endDate.setDate(endDate.getDate() + (weeksToAdd * 7));

    console.log('📅 Date calculations:', {
      startDate: subscriptionStartDate,
      nextDelivery,
      endDate,
      weeksToAdd
    });

    const subscriptionData = {
      subscriptionId: subscriptionId || `SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: req.user.id,
      mealPlanId: mealPlan,
      selectedMealTypes: selectedMealTypes || mealPlanDoc.mealTypes || ['lunch'],
      frequency,
      duration,
      durationWeeks: weeksToAdd,
      startDate: subscriptionStartDate,
      nextDelivery,
      endDate,
      totalPrice: finalPrice,
      price: finalPrice, // Required field for compatibility
      basePlanPrice: basePlanPrice || mealPlanDoc.totalPrice || 0,
      frequencyMultiplier: frequencyMultiplier || 1,
      durationMultiplier: durationMultiplier || 1,
      deliveryAddress,
      specialInstructions,
      paymentStatus: paymentStatus || 'Pending',
      paymentReference,
      transactionId: transactionId || `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    };

    console.log('💾 Creating subscription with data:', JSON.stringify(subscriptionData, null, 2));

    const subscription = await Subscription.create(subscriptionData);

    await subscription.populate('mealPlanId');

    console.log('✅ Subscription created successfully:', {
      id: subscription._id,
      subscriptionId: subscription.subscriptionId,
      totalPrice: subscription.totalPrice,
      price: subscription.price
    });

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
