const DiscountRule = require('../models/DiscountRule');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get all discount rules
// @route   GET /api/admin/discount-rules
// @access  Private/Admin
exports.getAllDiscountRules = async (req, res) => {
  try {
    const rules = await DiscountRule.find({});
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Create a new discount rule
// @route   POST /api/admin/discount-rules
// @access  Private/Admin
exports.createDiscountRule = async (req, res) => {
  try {
    const newRule = new DiscountRule(req.body);
    const savedRule = await newRule.save();
    res.status(201).json({ success: true, data: savedRule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update a discount rule
// @route   PUT /api/admin/discount-rules/:id
// @access  Private/Admin
exports.updateDiscountRule = async (req, res) => {
  try {
    const updatedRule = await DiscountRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedRule) {
      return res.status(404).json({ success: false, error: 'Discount rule not found' });
    }
    res.json({ success: true, data: updatedRule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a discount rule
// @route   DELETE /api/admin/discount-rules/:id
// @access  Private/Admin
exports.deleteDiscountRule = async (req, res) => {
  try {
    const deletedRule = await DiscountRule.findByIdAndDelete(req.params.id);
    if (!deletedRule) {
      return res.status(404).json({ success: false, error: 'Discount rule not found' });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Get discount rules for a specific meal plan
// @route   GET /api/meal-plans/:id/discount-rules
// @access  Public
exports.getDiscountRulesForMealPlan = async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const rules = await DiscountRule.find({
      isActive: true,
      $and: [
        {
          $or: [
            { applicableMealPlans: { $size: 0 } }, // Empty array means all meal plans
            { applicableMealPlans: mealPlanId },
          ],
        },
        {
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: { $gte: new Date() } },
          ],
        },
      ],
    });
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching discount rules for meal plan:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Get global discount rules
// @route   GET /api/discount-rules/global
// @access  Public
exports.getGlobalDiscountRules = async (req, res) => {
  try {
    const rules = await DiscountRule.find({
      isActive: true,
      targetSegment: 'all_users',
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: new Date() } },
      ],
    });
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Get user activity data for discount calculation
// @route   GET /api/users/:userId/activity
// @access  Public (user can access their own data)
exports.getUserActivity = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user data
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get user's order history
    const orders = await Order.find({ user: userId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 });
    
    const now = new Date();
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Calculate days since registration
    const registrationDate = user.createdAt || user.dateRegistered;
    const daysSinceRegistration = registrationDate 
      ? Math.floor((now - new Date(registrationDate)) / (1000 * 60 * 60 * 24))
      : 0;
    
    // Calculate days since last order
    const lastOrder = orders[0];
    const lastOrderDate = lastOrder ? lastOrder.createdAt : null;
    const daysSinceLastOrder = lastOrderDate 
      ? Math.floor((now - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24))
      : null;
    
    const monthsSinceLastOrder = daysSinceLastOrder 
      ? Math.floor(daysSinceLastOrder / 30)
      : null;
    
    // Calculate subscription streak (consecutive months with at least 1 order)
    let subscriptionStreak = 0;
    if (orders.length > 0) {
      let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let hasOrderInMonth = true;
      
      while (hasOrderInMonth && subscriptionStreak < 12) { // Max 12 months streak
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        hasOrderInMonth = orders.some(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= currentMonth && orderDate < nextMonth;
        });
        
        if (hasOrderInMonth) {
          subscriptionStreak++;
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        }
      }
    }
    
    // Determine if user is consistent (has ordered at least once every 2 months for last 6 months)
    let isConsistentUser = false;
    if (totalOrders >= 3) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const recentOrders = orders.filter(order => new Date(order.createdAt) >= sixMonthsAgo);
      
      // Check if there's at least one order every 2 months
      if (recentOrders.length >= 3) {
        isConsistentUser = true;
      }
    }
    
    const activityData = {
      isFirstTime: totalOrders === 0,
      lastOrderDate,
      totalOrders,
      totalSpent,
      subscriptionStreak,
      daysSinceLastOrder,
      monthsSinceLastOrder,
      isConsistentUser,
      registrationDate,
      daysSinceRegistration
    };
    
    res.json({ success: true, data: activityData });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Calculate discount for user and meal plan
// @route   POST /api/discounts/calculate
// @access  Public
exports.calculateUserDiscount = async (req, res) => {
  try {
    const { userId, mealPlanId } = req.body;
    
    if (!userId || !mealPlanId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and Meal Plan ID are required' 
      });
    }
    
    // Get applicable discount rules for the meal plan
    const rules = await DiscountRule.find({
      isActive: true,
      $and: [
        {
          $or: [
            { applicableMealPlans: { $size: 0 } }, // Empty array means all meal plans
            { applicableMealPlans: mealPlanId },
          ],
        },
        {
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: { $gte: new Date() } },
          ],
        },
      ],
    });
    
    if (rules.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          discountPercent: 0, 
          discountAmount: 0, 
          reason: 'No discount rules available' 
        } 
      });
    }
    
    // Get user activity data
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const orders = await Order.find({ user: userId, status: { $ne: 'cancelled' } });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const now = new Date();
    const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const daysSinceLastOrder = lastOrder 
      ? Math.floor((now - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24))
      : null;
    const monthsSinceLastOrder = daysSinceLastOrder ? Math.floor(daysSinceLastOrder / 30) : null;
    
    const registrationDate = user.createdAt || user.dateRegistered;
    const daysSinceRegistration = registrationDate 
      ? Math.floor((now - new Date(registrationDate)) / (1000 * 60 * 60 * 24))
      : 0;
    
    // Check eligibility for each rule
    const applicableDiscounts = [];
    
    for (const rule of rules) {
      let isEligible = false;
      let reason = '';
      
      switch (rule.targetSegment) {
        case 'first_time':
          if (totalOrders === 0) {
            isEligible = true;
            reason = 'First-time user discount';
          }
          break;
          
        case 'inactive_6_months':
          if (monthsSinceLastOrder >= 6) {
            isEligible = true;
            reason = 'Welcome back! You haven\'t ordered in 6+ months';
          }
          break;
          
        case 'inactive_1_year':
          if (monthsSinceLastOrder >= 12) {
            isEligible = true;
            reason = 'Welcome back! You haven\'t ordered in 1+ year';
          }
          break;
          
        case 'loyal_consistent':
          if (totalOrders >= 5 && monthsSinceLastOrder <= 2) {
            isEligible = true;
            reason = 'Loyal customer reward';
          }
          break;
          
        case 'high_value':
          const threshold = rule.criteria?.minSpent || 100000;
          if (totalSpent >= threshold) {
            isEligible = true;
            reason = 'High-value customer discount';
          }
          break;
          
        case 'new_registrant':
          const daysThreshold = rule.criteria?.withinDays || 30;
          if (daysSinceRegistration <= daysThreshold) {
            isEligible = true;
            reason = 'New member welcome discount';
          }
          break;
          
        case 'all_users':
          isEligible = true;
          reason = 'Universal discount';
          break;
      }
      
      if (isEligible) {
        applicableDiscounts.push({
          ...rule.toObject(),
          reason
        });
      }
    }
    
    if (applicableDiscounts.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          discountPercent: 0, 
          discountAmount: 0, 
          reason: 'User not eligible for any discounts' 
        } 
      });
    }
    
    // Apply the highest discount
    const bestDiscount = applicableDiscounts.reduce((best, current) => 
      current.discountPercent > best.discountPercent ? current : best
    );
    
    const discountData = {
      discountPercent: bestDiscount.discountPercent,
      discountAmount: 0, // Will be calculated on frontend based on meal plan price
      reason: bestDiscount.reason,
      validUntil: bestDiscount.validUntil,
      isLimitedTime: !!bestDiscount.validUntil
    };
    
    res.json({ success: true, data: discountData });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
