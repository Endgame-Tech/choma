const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
const NotificationService = require("../services/notificationService");
const EmailService = require("../services/emailService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable not set");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signup controller
exports.signup = async (req, res) => {
  try {
    const {
      fullName,
      firstName,
      lastName,
      dateOfBirth,
      email,
      password,
      phone,
      deliveryAddress,
      address,
      city,
      dietaryPreferences,
      allergies,
      profileImage,
    } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Check if user already exists
    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const customer = await Customer.create({
      fullName,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      email,
      password: hashedPassword,
      phone,
      address: deliveryAddress, // Use deliveryAddress instead of address field
      city,
      dietaryPreferences,
      allergies,
      profileImage,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: customer._id,
        email: customer.email,
        customerId: customer.customerId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send welcome notification
    try {
      await NotificationService.notifyWelcome(customer._id, customer.fullName);
    } catch (notificationError) {
      console.error("Welcome notification failed:", notificationError);
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        profileImage: customer.profileImage,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        address: customer.address,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
        message: "Email and password are required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Find customer with password and check subscriptions in parallel for faster auth
    const [customer, activeSubscriptionsCheck] = await Promise.all([
      Customer.findOne({ email }).select("+password").lean(),
      // Pre-fetch subscription status to avoid second query
      Customer.findOne({ email }).then(user => 
        user ? Subscription.find({ 
          userId: user._id,
          status: { $in: ['active', 'paused'] }
        }).limit(1).lean() : []
      )
    ]);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if account is active
    if (customer.status === "Deleted") {
      return res.status(403).json({
        success: false,
        message: "This account has been deleted and cannot be accessed.",
      });
    }

    if (customer.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact support.",
      });
    }

    const hasActiveSubscription = activeSubscriptionsCheck.length > 0;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: customer._id,
        email: customer.email,
        customerId: customer.customerId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful!",
      token,
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        profileImage: customer.profileImage,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        address: customer.address,
        hasActiveSubscription: hasActiveSubscription, // Add subscription status for immediate UI decision
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    // Run customer and subscription queries in parallel for faster response
    const [customer, activeSubscriptions] = await Promise.all([
      Customer.findById(req.user.id).lean(), // Use lean() for faster queries
      Subscription.find({ 
        userId: req.user.id,
        status: { $in: ['active', 'paused'] }
      }).limit(1).lean() // Use lean() for faster queries
    ]);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if account is deleted
    if (customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "Account has been deleted.",
      });
    }

    const hasActiveSubscription = activeSubscriptions.length > 0;

    res.json({
      success: true,
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        profileImage: customer.profileImage,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        registrationDate: customer.registrationDate,
        hasActiveSubscription: hasActiveSubscription, // Add subscription status for immediate UI decision
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      firstName,
      lastName,
      dateOfBirth,
      phone,
      address,
      deliveryAddress,
      city,
      dietaryPreferences,
      allergies,
      profileImage,
    } = req.body;

    // Validation
    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }
    // Find and update the customer
    const customer = await Customer.findById(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if account is deleted
    if (customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "Account has been deleted",
      });
    }

    // Update fields
    customer.fullName = fullName;
    if (firstName !== undefined) customer.firstName = firstName;
    if (lastName !== undefined) customer.lastName = lastName;
    if (dateOfBirth !== undefined)
      customer.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    customer.phone = phone;
    // Use deliveryAddress if provided, otherwise fall back to address
    customer.address = deliveryAddress || address;
    customer.city = city;
    customer.dietaryPreferences = dietaryPreferences;
    customer.allergies = allergies;

    // Update profile image if provided
    if (profileImage !== undefined) {
      customer.profileImage = profileImage;
    }

    await customer.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        dateOfBirth: customer.dateOfBirth,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        dietaryPreferences: customer.dietaryPreferences,
        allergies: customer.allergies,
        profileImage: customer.profileImage,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        registrationDate: customer.registrationDate,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    console.log("🗑️ DELETE /auth/account endpoint hit");
    console.log("🗑️ Request user:", req.user?.id);
    console.log("🗑️ Request headers:", req.headers);

    const customerId = req.user.id;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
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
    await Customer.findByIdAndUpdate(
      customerId,
      {
        status: "Deleted",
        deletedAt: new Date(),
        // Clear sensitive data
        password: undefined,
        phone: undefined,
        address: undefined,
      },
      { new: true }
    ); // Return the updated document

    console.log(`🗑️ Account deleted for customer: ${customer.email}`);

    res.json({
      success: true,
      message: "Account has been successfully deleted",
    });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get user stats for profile dashboard
exports.getUserStats = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Get orders this month
    const ordersThisMonth = await Order.countDocuments({
      customer: customerId,
      createdDate: { $gte: startOfMonth, $lte: endOfMonth },
      orderStatus: { $ne: "Cancelled" },
    });

    // Get total completed orders
    const totalOrdersCompleted = await Order.countDocuments({
      customer: customerId,
      orderStatus: "Delivered",
    });

    // Calculate streak days (consecutive days with delivered orders in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      customer: customerId,
      orderStatus: "Delivered",
      actualDelivery: { $gte: thirtyDaysAgo },
    }).sort({ actualDelivery: -1 });

    let streakDays = 0;
    if (recentOrders.length > 0) {
      const orderDates = recentOrders.map((order) =>
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
      status: "Active",
    });

    // Calculate total saved (mock calculation based on orders vs regular prices)
    const totalOrders = await Order.find({
      customer: customerId,
      orderStatus: "Delivered",
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
      status: "Active",
      nextDelivery: { $gte: now },
    }).sort({ nextDelivery: 1 });

    const nextDelivery = nextSubscription
      ? nextSubscription.nextDelivery
      : null;

    const stats = {
      ordersThisMonth,
      totalOrdersCompleted,
      streakDays,
      activeSubscriptions,
      totalSaved: Math.round(totalSaved),
      nutritionScore,
      nextDelivery,
      favoriteCategory: "Fitness", // This could be calculated from order patterns
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("Get user stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get user recent activity for profile dashboard
exports.getUserActivity = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const activities = [];

    // Get recent orders (delivered in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      customer: customerId,
      orderStatus: "Delivered",
      actualDelivery: { $gte: thirtyDaysAgo },
    })
      .populate("subscription")
      .sort({ actualDelivery: -1 })
      .limit(5);

    // Add order activities
    recentOrders.forEach((order) => {
      const timeAgo = getTimeAgo(order.actualDelivery);
      let title = "Order delivered";

      if (order.subscription && order.subscription.mealPlan) {
        title = `${
          order.subscription.mealPlan.planName || "Meal plan"
        } delivered`;
      }

      activities.push({
        id: `order_${order._id}`,
        type: "order",
        title,
        date: timeAgo,
        timestamp: order.actualDelivery,
        icon: "checkmark-circle",
        color: "#4CAF50", // COLORS.success
      });
    });

    // Get recent subscription changes
    const recentSubscriptions = await Subscription.find({
      userId: customerId,
      createdDate: { $gte: thirtyDaysAgo },
    })
      .populate("mealPlanId")
      .sort({ createdDate: -1 })
      .limit(3);

    recentSubscriptions.forEach((subscription) => {
      const timeAgo = getTimeAgo(subscription.createdDate);
      activities.push({
        id: `subscription_${subscription._id}`,
        type: "subscription",
        title: `Started ${
          subscription.mealPlanId?.planName || "meal plan"
        } subscription`,
        date: timeAgo,
        timestamp: subscription.createdDate,
        icon: "calendar",
        color: "#FF6B35", // COLORS.primary
      });
    });

    // Get rated orders
    const ratedOrders = await Order.find({
      customer: customerId,
      customerRating: { $exists: true, $ne: null },
      createdDate: { $gte: thirtyDaysAgo },
    })
      .sort({ createdDate: -1 })
      .limit(3);

    ratedOrders.forEach((order) => {
      const timeAgo = getTimeAgo(order.createdDate);
      activities.push({
        id: `rating_${order._id}`,
        type: "review",
        title: `Rated order ${order.customerRating}/5 stars`,
        date: timeAgo,
        timestamp: order.createdDate,
        icon: "star",
        color: "#FFD700", // COLORS.rating
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return top 10 activities
    const recentActivity = activities.slice(0, 10);

    res.json({
      success: true,
      data: recentActivity,
    });
  } catch (err) {
    console.error("Get user activity error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activity",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  } else if (diffInHours > 0) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  } else if (diffInMinutes > 0) {
    return diffInMinutes === 1
      ? "1 minute ago"
      : `${diffInMinutes} minutes ago`;
  } else {
    return "Just now";
  }
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_order",
    title: "First Order",
    description: "Completed your first meal plan",
    icon: "gift",
    target: 1,
    type: "order_count",
  },
  {
    id: "consistent_eater",
    title: "Consistent Eater",
    description: "15 days streak",
    icon: "flame",
    target: 15,
    type: "streak_days",
  },
  {
    id: "health_warrior",
    title: "Health Warrior",
    description: "50+ orders completed",
    icon: "shield",
    target: 50,
    type: "order_count",
  },
  {
    id: "nutrition_expert",
    title: "Nutrition Expert",
    description: "Try 10 different plans",
    icon: "school",
    target: 10,
    type: "plan_variety",
  },
  {
    id: "vip_member",
    title: "VIP Member",
    description: "100+ orders completed",
    icon: "diamond",
    target: 100,
    type: "order_count",
  },
  {
    id: "referral_master",
    title: "Referral Master",
    description: "Refer 5 friends",
    icon: "people",
    target: 5,
    type: "referrals",
  },
];

// Get user achievements with real progress tracking
exports.getUserAchievements = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate current achievements progress
    const progress = await calculateAchievementProgress(customerId);

    // Initialize achievements if they don't exist
    if (!customer.achievements || customer.achievements.length === 0) {
      customer.achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
        achievementId: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        earned: false,
        progress: 0,
        target: def.target,
      }));
      await customer.save();
    }

    // Update achievements based on current progress
    const updatedAchievements = customer.achievements.map((achievement) => {
      const definition = ACHIEVEMENT_DEFINITIONS.find(
        (def) => def.id === achievement.achievementId
      );
      if (!definition) return achievement;

      let currentProgress = 0;
      switch (definition.type) {
        case "order_count":
          currentProgress = progress.totalOrders;
          break;
        case "streak_days":
          currentProgress = progress.streakDays;
          break;
        case "plan_variety":
          currentProgress = progress.planVariety;
          break;
        case "referrals":
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
      data: updatedAchievements.map((achievement) => ({
        id: achievement.achievementId,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        earned: achievement.earned,
        earnedDate: achievement.earnedDate,
        progress: achievement.progress,
        target: achievement.target,
      })),
    });
  } catch (err) {
    console.error("Get user achievements error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user achievements",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Helper function to calculate achievement progress
async function calculateAchievementProgress(customerId) {
  // Get total delivered orders
  const totalOrders = await Order.countDocuments({
    customer: customerId,
    orderStatus: "Delivered",
  });

  // Calculate streak days (reuse logic from getUserStats)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = await Order.find({
    customer: customerId,
    orderStatus: "Delivered",
    actualDelivery: { $gte: thirtyDaysAgo },
  }).sort({ actualDelivery: -1 });

  let streakDays = 0;
  if (recentOrders.length > 0) {
    const orderDates = recentOrders.map((order) =>
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
  const uniquePlans = await Order.distinct("subscription", {
    customer: customerId,
    orderStatus: "Delivered",
    subscription: { $ne: null },
  });

  const planVariety = uniquePlans.length;

  // Calculate referrals (for now, mock this - would need referral tracking)
  const referrals = 0; // TODO: Implement referral tracking

  return {
    totalOrders,
    streakDays,
    planVariety,
    referrals,
  };
}

// Update user notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      orderUpdates,
      deliveryReminders,
      promotions,
      newMealPlans,
      achievements,
    } = req.body;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update notification preferences
    customer.notificationPreferences = {
      orderUpdates:
        orderUpdates !== undefined
          ? orderUpdates
          : customer.notificationPreferences?.orderUpdates ?? true,
      deliveryReminders:
        deliveryReminders !== undefined
          ? deliveryReminders
          : customer.notificationPreferences?.deliveryReminders ?? true,
      promotions:
        promotions !== undefined
          ? promotions
          : customer.notificationPreferences?.promotions ?? false,
      newMealPlans:
        newMealPlans !== undefined
          ? newMealPlans
          : customer.notificationPreferences?.newMealPlans ?? true,
      achievements:
        achievements !== undefined
          ? achievements
          : customer.notificationPreferences?.achievements ?? true,
    };

    await customer.save();

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      data: customer.notificationPreferences,
    });
  } catch (err) {
    console.error("Update notification preferences error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get user notification preferences
exports.getNotificationPreferences = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return notification preferences (with defaults if not set)
    const preferences = customer.notificationPreferences || {
      orderUpdates: true,
      deliveryReminders: true,
      promotions: false,
      newMealPlans: true,
      achievements: true,
    };

    res.json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    console.error("Get notification preferences error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification preferences",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Forgot password - Request reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Find customer
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    // Check if account is deleted
    if (customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "Account has been deleted.",
      });
    }

    // Generate reset code (6-digit)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset code
    customer.resetPasswordCode = resetCode;
    customer.resetPasswordExpires = resetCodeExpires;
    await customer.save();

    // Send reset email
    const emailSent = await EmailService.sendVerificationEmail({
      email: customer.email,
      verificationCode: resetCode,
      purpose: "password_reset",
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again.",
      });
    }

    res.json({
      success: true,
      message: "Password reset code sent to your email address.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Reset password - Verify code and reset
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    // Validation
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Find customer with valid reset code
    const customer = await Customer.findOne({
      email,
      resetPasswordCode: resetCode,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset code
    customer.password = hashedPassword;
    customer.resetPasswordCode = undefined;
    customer.resetPasswordExpires = undefined;
    await customer.save();

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reset password.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Log user activity
exports.logUserActivity = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { action, description, timestamp, metadata } = req.body;

    // Validation
    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action is required",
      });
    }

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer || customer.status === "Deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create activity log entry (you might want to create a separate Activity model)
    const activityLog = {
      customerId: customerId,
      action: action,
      description: description || action,
      timestamp: timestamp || new Date().toISOString(),
      metadata: metadata || {},
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    };

    // For now, just log to console (you can extend this to save to database)
    console.log(
      "📝 User Activity Logged:",
      JSON.stringify(activityLog, null, 2)
    );

    // TODO: Save to database if you create an Activity model
    // const activity = new Activity(activityLog);
    // await activity.save();

    res.json({
      success: true,
      message: "Activity logged successfully",
      data: {
        action: action,
        timestamp: activityLog.timestamp,
      },
    });
  } catch (err) {
    console.error("Log activity error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to log activity",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Bank account verification controller
exports.verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    // Validation
    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: "Account number and bank code are required",
      });
    }

    if (accountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Account number must be exactly 10 digits",
      });
    }

    // Call Paystack API to verify account using axios
    const axios = require("axios");
    const response = await axios.get("https://api.paystack.co/bank/resolve", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
    });

    if (response.data.status) {
      return res.json({
        success: true,
        account_name: response.data.data.account_name,
        account_number: response.data.data.account_number,
        bank_id: response.data.data.bank_id,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || "Unable to verify account details",
      });
    }
  } catch (err) {
    console.error("Bank verification error:", err);

    // Handle specific Paystack errors
    if (err.response) {
      const errorMessage =
        err.response.data?.message || "Bank verification failed";
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    res.status(500).json({
      success: false,
      message: "Bank verification service temporarily unavailable",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get user activity for discount calculation
exports.getUserActivityForDiscount = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const orders = await Order.find({
      customer: customerId,
      orderStatus: "Delivered",
    }).sort({ actualDelivery: -1 });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce(
      (acc, order) => acc + order.totalAmount,
      0
    );
    const isFirstTime = totalOrders === 0;
    const lastOrderDate = totalOrders > 0 ? orders[0].actualDelivery : null;

    let daysSinceLastOrder = null;
    let monthsSinceLastOrder = null;
    if (lastOrderDate) {
      const now = new Date();
      const diffInMs = now.getTime() - new Date(lastOrderDate).getTime();
      daysSinceLastOrder = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      monthsSinceLastOrder = Math.floor(daysSinceLastOrder / 30);
    }

    const registrationDate = customer.registrationDate;
    let daysSinceRegistration = 0;
    if (registrationDate) {
      const now = new Date();
      const diffInMs = now.getTime() - new Date(registrationDate).getTime();
      daysSinceRegistration = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    }

    // For now, subscriptionStreak and isConsistentUser are placeholders
    const subscriptionStreak = 0;
    const isConsistentUser = false;

    res.json({
      success: true,
      data: {
        isFirstTime,
        lastOrderDate,
        totalOrders,
        totalSpent,
        subscriptionStreak,
        daysSinceLastOrder,
        monthsSinceLastOrder,
        isConsistentUser,
        registrationDate,
        daysSinceRegistration,
      },
    });
  } catch (err) {
    console.error("Get user activity for discount error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user activity for discount",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { dataCollection } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    customer.privacySettings = {
      ...customer.privacySettings,
      dataCollection: dataCollection,
      updatedAt: new Date(),
    };

    await customer.save();

    res.json({ success: true, message: "Privacy settings updated" });
  } catch (err) {
    console.error("Update privacy settings error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy settings",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.logPrivacyAction = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { action } = req.body;

    // In a real application, you would save this to a dedicated audit log
    console.log(`Privacy action logged for user ${customerId}: ${action}`);

    res.json({ success: true, message: "Privacy action logged" });
  } catch (err) {
    console.error("Log privacy action error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to log privacy action",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { dataCollection } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    customer.privacySettings = {
      ...customer.privacySettings,
      dataCollection: dataCollection,
      updatedAt: new Date(),
    };

    await customer.save();

    res.json({ success: true, message: "Privacy settings updated" });
  } catch (err) {
    console.error("Update privacy settings error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy settings",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.logPrivacyAction = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { action } = req.body;

    // In a real application, you would save this to a dedicated audit log
    console.log(`Privacy action logged for user ${customerId}: ${action}`);

    res.json({ success: true, message: "Privacy action logged" });
  } catch (err) {
    console.error("Log privacy action error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to log privacy action",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
