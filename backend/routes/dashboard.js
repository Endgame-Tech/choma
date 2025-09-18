const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MealPlan = require('../models/MealPlan');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const PromoBanner = require('../models/PromoBanner');
const Tag = require('../models/Tag');

/**
 * @route GET /api/dashboard/public
 * @desc Get public dashboard data (banners, meal plans, tags)
 * @access Public
 */
router.get('/public', async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [
      banners,
      mealPlans,
      tags
    ] = await Promise.all([
      // Get active banners
      PromoBanner.find({ 
        isActive: true,
        $or: [
          { expiresAt: { $gte: new Date() } },
          { expiresAt: null }
        ]
      }).sort({ sortOrder: 1, createdAt: -1 }),
      
      // Get meal plans (limited for performance)
      MealPlan.find({ isActive: true })
        .select('planName description price image category tags audience difficulty preparationTime nutritionInfo chef')
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(20),
      
      // Get active tags
      Tag.find({ isActive: true }).sort({ sortOrder: 1 })
    ]);

    // Process meal plans to include only essential data
    const processedMealPlans = mealPlans.map(plan => ({
      _id: plan._id,
      planName: plan.planName,
      description: plan.description,
      price: plan.price,
      image: plan.image,
      category: plan.category,
      tags: plan.tags,
      audience: plan.audience,
      difficulty: plan.difficulty,
      preparationTime: plan.preparationTime,
      nutritionInfo: plan.nutritionInfo,
      chef: plan.chef
    }));

    res.json({
      success: true,
      data: {
        banners: banners || [],
        mealPlans: processedMealPlans || [],
        tags: tags || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Public dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public dashboard data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dashboard/user
 * @desc Get user-specific dashboard data (orders, subscriptions)
 * @access Private
 */
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Execute all queries in parallel for better performance
    const [
      orders, 
      subscriptions
    ] = await Promise.all([
      // Get user's active orders
      Order.find({ 
        userId: userId,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'] }
      }).sort({ createdAt: -1 }),
      
      // Get user's subscriptions
      Subscription.find({ userId: userId }).sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      data: {
        orders: orders || [],
        subscriptions: subscriptions || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('User dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user dashboard data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dashboard
 * @desc Get all dashboard data in one request (for authenticated users)
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Execute all queries in parallel for better performance
    const [
      banners,
      orders, 
      subscriptions,
      mealPlans,
      tags
    ] = await Promise.all([
      // Get active banners
      PromoBanner.find({ 
        isActive: true,
        $or: [
          { expiresAt: { $gte: new Date() } },
          { expiresAt: null }
        ]
      }).sort({ sortOrder: 1, createdAt: -1 }),
      
      // Get user's active orders
      Order.find({ 
        userId: userId,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'] }
      }).sort({ createdAt: -1 }),
      
      // Get user's subscriptions
      Subscription.find({ userId: userId }).sort({ createdAt: -1 }),
      
      // Get meal plans (limited for performance)
      MealPlan.find({ isActive: true })
        .select('planName description price image category tags audience difficulty preparationTime nutritionInfo chef')
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(20),
      
      // Get active tags
      Tag.find({ isActive: true }).sort({ sortOrder: 1 })
    ]);

    // Process meal plans to include only essential data
    const processedMealPlans = mealPlans.map(plan => ({
      _id: plan._id,
      planName: plan.planName,
      description: plan.description,
      price: plan.price,
      image: plan.image,
      category: plan.category,
      tags: plan.tags,
      audience: plan.audience,
      difficulty: plan.difficulty,
      preparationTime: plan.preparationTime,
      nutritionInfo: plan.nutritionInfo,
      chef: plan.chef
    }));

    res.json({
      success: true,
      data: {
        banners: banners || [],
        orders: orders || [],
        subscriptions: subscriptions || [],
        mealPlans: processedMealPlans || [],
        tags: tags || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

module.exports = router;