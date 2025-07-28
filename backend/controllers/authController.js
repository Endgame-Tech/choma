const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const NotificationService = require('../services/notificationService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signup controller
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, phone, address, city, dietaryPreferences, allergies } = req.body;
    
    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and password are required.' 
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Check if user already exists
    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already registered.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const customer = await Customer.create({
      fullName,
      email,
      password: hashedPassword,
      phone,
      address,
      city,
      dietaryPreferences,
      allergies
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: customer._id, 
        email: customer.email,
        customerId: customer.customerId 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Send welcome notification
    try {
      await NotificationService.notifyWelcome(customer._id, customer.fullName);
    } catch (notificationError) {
      console.error('Welcome notification failed:', notificationError);
    }

    res.status(201).json({ 
      success: true,
      message: 'Account created successfully!',
      token, 
      customer: { 
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName, 
        email: customer.email,
        phone: customer.phone,
        city: customer.city
      } 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required.' 
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address.' 
      });
    }

    // Find customer with password
    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }    // Check if account is active
    if (customer.status === 'Deleted') {
      return res.status(403).json({ 
        success: false,
        message: 'This account has been deleted and cannot be accessed.' 
      });
    }
    
    if (customer.status !== 'Active') {
      return res.status(403).json({ 
        success: false,
        message: 'Account is inactive. Please contact support.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: customer._id, 
        email: customer.email,
        customerId: customer.customerId 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      message: 'Login successful!',
      token, 
      customer: { 
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName, 
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        dietaryPreferences: customer.dietaryPreferences
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    // Check if account is deleted
    if (customer.status === 'Deleted') {
      return res.status(404).json({ 
        success: false,
        message: 'Account has been deleted.' 
      });
    }

    res.json({
      success: true,
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        registrationDate: customer.registrationDate
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address, city, dietaryPreferences, allergies } = req.body;
    
    // Validate required fields
    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }
      // Find and update the customer
    const customer = await Customer.findById(req.user.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is deleted
    if (customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'Account has been deleted'
      });
    }
    
    // Update fields
    customer.fullName = fullName;
    customer.phone = phone;
    customer.address = address;
    customer.city = city;
    customer.dietaryPreferences = dietaryPreferences;
    customer.allergies = allergies;
    
    await customer.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        registrationDate: customer.registrationDate
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // TODO: In a real app, you might want to:
    // 1. Cancel active subscriptions
    // 2. Process refunds if necessary
    // 3. Archive order history instead of deleting
    // 4. Send confirmation email
    // 5. Add a grace period before permanent deletion
      // For now, we'll simply deactivate the account instead of hard delete
    // This preserves order history and allows for account recovery
    await Customer.findByIdAndUpdate(customerId, { 
      status: 'Deleted',
      deletedAt: new Date(),
      // Clear sensitive data
      password: undefined,
      phone: undefined,
      address: undefined
    }, { new: true }); // Return the updated document

    console.log(`🗑️ Account deleted for customer: ${customer.email}`);
    
    res.json({
      success: true,
      message: 'Account has been successfully deleted'
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get user stats for profile dashboard
exports.getUserStats = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get orders this month
    const ordersThisMonth = await Order.countDocuments({
      customer: customerId,
      createdDate: { $gte: startOfMonth, $lte: endOfMonth },
      orderStatus: { $ne: 'Cancelled' }
    });

    // Get total completed orders
    const totalOrdersCompleted = await Order.countDocuments({
      customer: customerId,
      orderStatus: 'Delivered'
    });

    // Calculate streak days (consecutive days with delivered orders in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentOrders = await Order.find({
      customer: customerId,
      orderStatus: 'Delivered',
      actualDelivery: { $gte: thirtyDaysAgo }
    }).sort({ actualDelivery: -1 });

    let streakDays = 0;
    if (recentOrders.length > 0) {
      const orderDates = recentOrders.map(order => 
        new Date(order.actualDelivery).toDateString()
      );
      const uniqueDates = [...new Set(orderDates)].sort().reverse();
      
      // Calculate consecutive days from today
      let currentDate = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const orderDate = new Date(uniqueDates[i]);
        orderDate.setHours(0, 0, 0, 0);
        
        if (checkDate.getTime() === orderDate.getTime()) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Get active subscriptions count
    const activeSubscriptions = await Subscription.countDocuments({
      customer: customerId,
      status: 'Active'
    });

    // Calculate total saved (mock calculation based on orders vs regular prices)
    const totalOrders = await Order.find({
      customer: customerId,
      orderStatus: 'Delivered'
    });
    
    const totalSaved = totalOrders.reduce((sum, order) => {
      // Assume 15% savings on each order for subscription customers
      const orderSavings = order.totalAmount ? order.totalAmount * 0.15 : 0;
      return sum + orderSavings;
    }, 0);

    // Calculate nutrition score (based on dietary preferences compliance and order frequency)
    let nutritionScore = 50; // Base score
    
    // Add points for dietary preferences (shows health consciousness)
    if (customer.dietaryPreferences && customer.dietaryPreferences.length > 0) {
      nutritionScore += customer.dietaryPreferences.length * 5;
    }
    
    // Add points for order consistency
    if (streakDays > 0) {
      nutritionScore += Math.min(streakDays * 2, 30);
    }
    
    // Add points for recent activity
    if (ordersThisMonth > 0) {
      nutritionScore += Math.min(ordersThisMonth * 3, 20);
    }
    
    // Cap at 100
    nutritionScore = Math.min(nutritionScore, 100);

    // Get next delivery date from active subscriptions
    const nextSubscription = await Subscription.findOne({
      customer: customerId,
      status: 'Active',
      nextDelivery: { $gte: now }
    }).sort({ nextDelivery: 1 });

    const nextDelivery = nextSubscription ? nextSubscription.nextDelivery : null;

    const stats = {
      ordersThisMonth,
      totalOrdersCompleted,
      streakDays,
      activeSubscriptions,
      totalSaved: Math.round(totalSaved),
      nutritionScore,
      nextDelivery,
      favoriteCategory: 'Fitness' // This could be calculated from order patterns
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get user recent activity for profile dashboard
exports.getUserActivity = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const activities = [];
    
    // Get recent orders (delivered in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      customer: customerId,
      orderStatus: 'Delivered',
      actualDelivery: { $gte: thirtyDaysAgo }
    }).populate('subscription').sort({ actualDelivery: -1 }).limit(5);

    // Add order activities
    recentOrders.forEach(order => {
      const timeAgo = getTimeAgo(order.actualDelivery);
      let title = 'Order delivered';
      
      if (order.subscription && order.subscription.mealPlan) {
        title = `${order.subscription.mealPlan.planName || 'Meal plan'} delivered`;
      }
      
      activities.push({
        id: `order_${order._id}`,
        type: 'order',
        title,
        date: timeAgo,
        timestamp: order.actualDelivery,
        icon: 'checkmark-circle',
        color: '#4CAF50' // COLORS.success
      });
    });

    // Get recent subscription changes
    const recentSubscriptions = await Subscription.find({
      userId: customerId,
      createdDate: { $gte: thirtyDaysAgo }
    }).populate('mealPlanId').sort({ createdDate: -1 }).limit(3);

    recentSubscriptions.forEach(subscription => {
      const timeAgo = getTimeAgo(subscription.createdDate);
      activities.push({
        id: `subscription_${subscription._id}`,
        type: 'subscription',
        title: `Started ${subscription.mealPlanId?.planName || 'meal plan'} subscription`,
        date: timeAgo,
        timestamp: subscription.createdDate,
        icon: 'calendar',
        color: '#FF6B35' // COLORS.primary
      });
    });

    // Get rated orders
    const ratedOrders = await Order.find({
      customer: customerId,
      customerRating: { $exists: true, $ne: null },
      createdDate: { $gte: thirtyDaysAgo }
    }).sort({ createdDate: -1 }).limit(3);

    ratedOrders.forEach(order => {
      const timeAgo = getTimeAgo(order.createdDate);
      activities.push({
        id: `rating_${order._id}`,
        type: 'review',
        title: `Rated order ${order.customerRating}/5 stars`,
        date: timeAgo,
        timestamp: order.createdDate,
        icon: 'star',
        color: '#FFD700' // COLORS.rating
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return top 10 activities
    const recentActivity = activities.slice(0, 10);

    res.json({
      success: true,
      data: recentActivity
    });

  } catch (err) {
    console.error('Get user activity error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  } else if (diffInHours > 0) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  } else if (diffInMinutes > 0) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  } else {
    return 'Just now';
  }
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first_order',
    title: 'First Order',
    description: 'Completed your first meal plan',
    icon: 'gift',
    target: 1,
    type: 'order_count'
  },
  {
    id: 'consistent_eater',
    title: 'Consistent Eater',
    description: '15 days streak',
    icon: 'flame',
    target: 15,
    type: 'streak_days'
  },
  {
    id: 'health_warrior',
    title: 'Health Warrior',
    description: '50+ orders completed',
    icon: 'shield',
    target: 50,
    type: 'order_count'
  },
  {
    id: 'nutrition_expert',
    title: 'Nutrition Expert',
    description: 'Try 10 different plans',
    icon: 'school',
    target: 10,
    type: 'plan_variety'
  },
  {
    id: 'vip_member',
    title: 'VIP Member',
    description: '100+ orders completed',
    icon: 'diamond',
    target: 100,
    type: 'order_count'
  },
  {
    id: 'referral_master',
    title: 'Referral Master',
    description: 'Refer 5 friends',
    icon: 'people',
    target: 5,
    type: 'referrals'
  }
];

// Get user achievements with real progress tracking
exports.getUserAchievements = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate current achievements progress
    const progress = await calculateAchievementProgress(customerId);
    
    // Initialize achievements if they don't exist
    if (!customer.achievements || customer.achievements.length === 0) {
      customer.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
        achievementId: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        earned: false,
        progress: 0,
        target: def.target
      }));
      await customer.save();
    }

    // Update achievements based on current progress
    const updatedAchievements = customer.achievements.map(achievement => {
      const definition = ACHIEVEMENT_DEFINITIONS.find(def => def.id === achievement.achievementId);
      if (!definition) return achievement;

      let currentProgress = 0;
      switch (definition.type) {
        case 'order_count':
          currentProgress = progress.totalOrders;
          break;
        case 'streak_days':
          currentProgress = progress.streakDays;
          break;
        case 'plan_variety':
          currentProgress = progress.planVariety;
          break;
        case 'referrals':
          currentProgress = progress.referrals;
          break;
        default:
          currentProgress = achievement.progress;
      }

      // Check if achievement should be earned
      const shouldBeEarned = currentProgress >= definition.target;
      
      if (shouldBeEarned && !achievement.earned) {
        achievement.earned = true;
        achievement.earnedDate = new Date();
      }
      
      achievement.progress = currentProgress;
      return achievement;
    });

    // Save updated achievements
    customer.achievements = updatedAchievements;
    await customer.save();

    res.json({
      success: true,
      data: updatedAchievements.map(achievement => ({
        id: achievement.achievementId,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        earned: achievement.earned,
        earnedDate: achievement.earnedDate,
        progress: achievement.progress,
        target: achievement.target
      }))
    });

  } catch (err) {
    console.error('Get user achievements error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user achievements',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Helper function to calculate achievement progress
async function calculateAchievementProgress(customerId) {
  // Get total delivered orders
  const totalOrders = await Order.countDocuments({
    customer: customerId,
    orderStatus: 'Delivered'
  });

  // Calculate streak days (reuse logic from getUserStats)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const recentOrders = await Order.find({
    customer: customerId,
    orderStatus: 'Delivered',
    actualDelivery: { $gte: thirtyDaysAgo }
  }).sort({ actualDelivery: -1 });

  let streakDays = 0;
  if (recentOrders.length > 0) {
    const orderDates = recentOrders.map(order => 
      new Date(order.actualDelivery).toDateString()
    );
    const uniqueDates = [...new Set(orderDates)].sort().reverse();
    
    let currentDate = new Date();
    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setHours(0, 0, 0, 0);
      const orderDate = new Date(uniqueDates[i]);
      orderDate.setHours(0, 0, 0, 0);
      
      if (checkDate.getTime() === orderDate.getTime()) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate plan variety (unique meal plans ordered)
  const uniquePlans = await Order.distinct('subscription', {
    customer: customerId,
    orderStatus: 'Delivered',
    subscription: { $ne: null }
  });
  
  const planVariety = uniquePlans.length;

  // Calculate referrals (for now, mock this - would need referral tracking)
  const referrals = 0; // TODO: Implement referral tracking

  return {
    totalOrders,
    streakDays,
    planVariety,
    referrals
  };
}

// Update user notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { orderUpdates, deliveryReminders, promotions, newMealPlans, achievements } = req.body;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update notification preferences
    customer.notificationPreferences = {
      orderUpdates: orderUpdates !== undefined ? orderUpdates : customer.notificationPreferences?.orderUpdates ?? true,
      deliveryReminders: deliveryReminders !== undefined ? deliveryReminders : customer.notificationPreferences?.deliveryReminders ?? true,
      promotions: promotions !== undefined ? promotions : customer.notificationPreferences?.promotions ?? false,
      newMealPlans: newMealPlans !== undefined ? newMealPlans : customer.notificationPreferences?.newMealPlans ?? true,
      achievements: achievements !== undefined ? achievements : customer.notificationPreferences?.achievements ?? true
    };

    await customer.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: customer.notificationPreferences
    });

  } catch (err) {
    console.error('Update notification preferences error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get user notification preferences
exports.getNotificationPreferences = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === 'Deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return notification preferences (with defaults if not set)
    const preferences = customer.notificationPreferences || {
      orderUpdates: true,
      deliveryReminders: true,
      promotions: false,
      newMealPlans: true,
      achievements: true
    };

    res.json({
      success: true,
      data: preferences
    });

  } catch (err) {
    console.error('Get notification preferences error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Logout controller
exports.logout = async (req, res) => {
  try {
    // For JWT-based authentication, we don't need to do anything on the server side
    // The client will remove the token from storage
    // In a more sophisticated setup, you might want to blacklist the token
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
