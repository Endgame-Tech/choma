const Chef = require('../models/Chef');
const EmailVerification = require('../models/EmailVerification');
const Order = require('../models/Order');
const OrderDelegation = require('../models/OrderDelegation');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const paystackService = require('../services/paystackService');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

// ============= CHEF AUTHENTICATION =============
exports.registerChef = async (req, res) => {
    // Log incoming request details for debugging aborted requests
    console.log('--- Incoming Chef Registration Request ---');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('-----------------------------------------');
    try {
        const {
            // Personal Information
            fullName,
            email,
            phone,
            alternatePhone,
            dateOfBirth,
            gender,
            password,
            
            // Identity Verification
            identityVerification,
            
            // Professional Details
            specialties,
            experience,
            culinaryEducation,
            previousWorkExperience,
            certifications,
            languagesSpoken,
            
            // Location & Service Area
            location,
            
            // Kitchen & Equipment
            kitchenDetails,
            
            // Availability
            availability,
            
            // Emergency Contact
            emergencyContact,
            
            // References
            references,
            
            // Bank Details
            bankDetails,
            
            // Profile & Portfolio
            profilePhoto,
            portfolioImages,
            bio,
            
            // Health & Safety
            healthCertificates,
            foodSafetyCertification,
            
            // Legal Agreements
            agreedToTerms,
            agreedToPrivacyPolicy,
            agreedToBackgroundCheck
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone || !password || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                message: 'Missing required personal information'
            });
        }

        // Check if email has been verified
        const emailVerification = await EmailVerification.findOne({
            email: email.toLowerCase(),
            purpose: 'chef_registration',
            verified: true
        }).sort({ createdAt: -1 });

        if (!emailVerification) {
            return res.status(400).json({
                success: false,
                message: 'Email not verified. Please verify your email first.',
                requiresVerification: true
            });
        }

        // Check if verification is recent (within 24 hours)
        const verificationAge = Date.now() - emailVerification.verifiedAt.getTime();
        if (verificationAge > 24 * 60 * 60 * 1000) { // 24 hours
            return res.status(400).json({
                success: false,
                message: 'Email verification has expired. Please verify your email again.',
                requiresVerification: true
            });
        }

        if (!identityVerification?.idType || !identityVerification?.idNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required identity verification information'
            });
        }

        if (!specialties?.length || !languagesSpoken?.length) {
            return res.status(400).json({
                success: false,
                message: 'Missing required professional details'
            });
        }

        if (!location?.streetAddress || !location?.city || !location?.state) {
            return res.status(400).json({
                success: false,
                message: 'Missing required location information'
            });
        }

        if (!kitchenDetails?.kitchenEquipment?.length || !availability?.daysAvailable?.length) {
            return res.status(400).json({
                success: false,
                message: 'Missing required kitchen and availability information'
            });
        }

        if (!emergencyContact?.name || !emergencyContact?.phone || !bankDetails?.accountName || !bankDetails?.accountNumber || !bankDetails?.bankName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required emergency contact or bank details'
            });
        }

        if (!agreedToTerms || !agreedToPrivacyPolicy || !agreedToBackgroundCheck) {
            return res.status(400).json({
                success: false,
                message: 'You must agree to all terms and conditions'
            });
        }

        // Check if chef already exists
        const existingChef = await Chef.findOne({ email });
        if (existingChef) {
            return res.status(400).json({
                success: false,
                message: 'Chef with this email already exists'
            });
        }

        // Create new chef with comprehensive data
        const chef = new Chef({
            // Personal Information
            fullName,
            email,
            phone,
            alternatePhone,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            password,
            
            // Identity Verification
            identityVerification,
            
            // Professional Details
            specialties: specialties || [],
            experience: experience || 0,
            culinaryEducation,
            previousWorkExperience,
            certifications: certifications || [],
            languagesSpoken: languagesSpoken || ['English'],
            bio,
            
            // Location & Service Area
            location: {
                streetAddress: location.streetAddress,
                city: location.city,
                state: location.state,
                postalCode: location.postalCode,
                country: location.country || 'Nigeria',
                serviceRadius: location.serviceRadius || 5
            },
            
            // Kitchen & Equipment
            kitchenDetails: {
                hasOwnKitchen: kitchenDetails.hasOwnKitchen || true,
                kitchenEquipment: kitchenDetails.kitchenEquipment || [],
                canCookAtCustomerLocation: kitchenDetails.canCookAtCustomerLocation || false,
                transportationMethod: kitchenDetails.transportationMethod || 'Own Vehicle'
            },
            
            // Availability
            workingHours: {
                start: availability.hoursPerDay?.start || '08:00',
                end: availability.hoursPerDay?.end || '18:00'
            },
            maxCapacity: availability.maxOrdersPerDay || 5,
            preferences: {
                workDays: availability.daysAvailable || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            },
            
            // Emergency Contact
            emergencyContact,
            
            // References
            references: references || [],
            
            // Bank Details (with verification info)
            bankDetails: {
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber,
                bankName: bankDetails.bankName,
                bankCode: bankDetails.bankCode,
                bvn: bankDetails.bvn && bankDetails.bvn.length === 11 ? bankDetails.bvn : undefined,
                isVerified: bankDetails.isVerified || false,
                verifiedAt: bankDetails.isVerified ? new Date() : undefined,
                verificationProvider: 'paystack',
                recipientCode: bankDetails.recipientCode || undefined
            },
            
            // Profile & Portfolio
            profileImage: profilePhoto || '',
            portfolioImages: portfolioImages || [],
            
            // Health & Safety
            healthCertificates: healthCertificates || [],
            foodSafetyCertification,
            
            // Legal Agreements
            legalAgreements: {
                agreedToTerms,
                agreedToPrivacyPolicy,
                agreedToBackgroundCheck,
                agreementDate: new Date()
            },
            
            // Set status to Pending for admin review
            status: 'Pending'
        });

        await chef.save();

        // Generate JWT token
        const token = jwt.sign(
            { chefId: chef._id, email: chef.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Clean up used verification record
        await EmailVerification.deleteOne({
            _id: emailVerification._id
        });

        res.status(201).json({
            success: true,
            message: 'Chef application submitted successfully. Your application is now under review by our admin team.',
            data: {
                chef: {
                    id: chef._id,
                    chefId: chef.chefId,
                    fullName: chef.fullName,
                    email: chef.email,
                    specialties: chef.specialties,
                    status: chef.status
                },
                token
            }
        });

    } catch (error) {
        console.error('Chef registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register chef',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.loginChef = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find chef by email
        const chef = await Chef.findOne({ email });
        if (!chef) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await chef.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if chef account is active
        if (chef.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: `Account is ${chef.status.toLowerCase()}. Please contact admin.`
            });
        }

        // Update last login
        chef.lastLogin = new Date();
        await chef.save();

        // Generate JWT token
        const token = jwt.sign(
            { chefId: chef._id, email: chef.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                chef: {
                    id: chef._id,
                    chefId: chef.chefId,
                    fullName: chef.fullName,
                    email: chef.email,
                    specialties: chef.specialties,
                    availability: chef.availability,
                    currentCapacity: chef.currentCapacity,
                    maxCapacity: chef.maxCapacity,
                    rating: chef.rating
                },
                token
            }
        });

    } catch (error) {
        console.error('Chef login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= CHEF DASHBOARD =============
exports.getChefDashboard = async (req, res) => {
    try {
        const chefId = req.chef.chefId;

        // Get chef's basic stats
        const chef = await Chef.findById(chefId);
        
        // Get orders assigned to chef
        const assignedOrders = await Order.find({ assignedChef: chefId })
            .populate('customer', 'fullName email phone')
            .populate('subscription', 'mealPlanId')
            .sort({ chefAssignedDate: -1 });

        // Get order statistics
        const stats = {
            totalOrders: assignedOrders.length,
            pendingOrders: assignedOrders.filter(o => o.delegationStatus === 'Assigned').length,
            inProgressOrders: assignedOrders.filter(o => o.delegationStatus === 'In Progress').length,
            completedOrders: assignedOrders.filter(o => o.delegationStatus === 'Completed').length,
            currentCapacity: chef.currentCapacity,
            maxCapacity: chef.maxCapacity,
            rating: chef.rating,
            totalEarnings: chef.earnings.total,
            thisMonthEarnings: chef.earnings.thisMonth
        };

        // Get recent orders (last 10)
        const recentOrders = assignedOrders.slice(0, 10);

        res.json({
            success: true,
            data: {
                chef: {
                    id: chef._id,
                    chefId: chef.chefId,
                    fullName: chef.fullName,
                    specialties: chef.specialties,
                    availability: chef.availability,
                    rating: chef.rating
                },
                stats,
                recentOrders
            }
        });

    } catch (error) {
        console.error('Get chef dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= ORDER MANAGEMENT =============
exports.getChefOrders = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { status, page = 1, limit = 20 } = req.query;

        console.log('🔍 Chef Orders Query Debug:');
        console.log('👨‍🍳 Chef ID from auth:', chefId);
        console.log('📊 Query parameters:', { status, page, limit });

        const skip = (page - 1) * limit;
        
        // Build query - ensure chefId is treated as ObjectId
        const query = { assignedChef: new mongoose.Types.ObjectId(chefId) };
        if (status) {
            query.delegationStatus = status;
        }

        console.log('🔎 Final query:', JSON.stringify(query));
        console.log('🔎 Chef ID type in query:', typeof query.assignedChef);

        const orders = await Order.find(query)
            .populate('customer', 'fullName email phone deliveryAddress city state')
            .populate({
                path: 'subscription',
                populate: {
                    path: 'mealPlanId',
                    model: 'MealPlan',
                    select: 'planName description price duration mealTypes servingSize ingredients nutritionInfo'
                }
            })
            .populate('assignedChef', 'fullName email chefId')
            .sort({ chefAssignedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        console.log(`📋 Found ${orders.length} orders for chef ${chefId}`);
        console.log(`📊 Total orders in database matching query: ${total}`);
        
        // Additional debugging - check if there are ANY orders assigned to this chef
        const debugOrders = await Order.find({ assignedChef: new mongoose.Types.ObjectId(chefId) }).select('_id orderNumber delegationStatus assignedChef');
        console.log('🔍 Debug - All orders for this chef:', debugOrders.map(o => ({
            id: o._id,
            orderNumber: o.orderNumber,
            status: o.delegationStatus,
            assignedChef: o.assignedChef
        })));

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalOrders: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get chef orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.acceptOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const chefId = req.chef.chefId;

        const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to you'
            });
        }

        if (order.delegationStatus !== 'Assigned') {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be accepted in its current state'
            });
        }

        // Update order status
        order.delegationStatus = 'Accepted';
        order.chefAcceptedDate = new Date();
        await order.save();

        // Update chef's current capacity
        const chef = await Chef.findById(chefId);
        chef.currentCapacity += 1;
        await chef.save();

        res.json({
            success: true,
            message: 'Order accepted successfully',
            data: order
        });

    } catch (error) {
        console.error('Accept order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.startOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const chefId = req.chef.chefId;

        const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to you'
            });
        }

        if (order.delegationStatus !== 'Accepted') {
            return res.status(400).json({
                success: false,
                message: 'Order must be accepted before starting'
            });
        }

        // Update order status
        order.delegationStatus = 'In Progress';
        order.chefStartedDate = new Date();
        order.orderStatus = 'Preparing';
        await order.save();

        res.json({
            success: true,
            message: 'Order started successfully',
            data: order
        });

    } catch (error) {
        console.error('Start order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.completeOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { notes } = req.body;
        const chefId = req.chef.chefId;

        const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to you'
            });
        }

        if (order.delegationStatus !== 'In Progress') {
            return res.status(400).json({
                success: false,
                message: 'Order must be in progress to complete'
            });
        }

        // Update order status
        order.delegationStatus = 'Completed';
        order.chefCompletedDate = new Date();
        order.orderStatus = 'Out for Delivery';
        order.chefNotes = notes || '';
        await order.save();

        // Update chef stats
        const chef = await Chef.findById(chefId);
        chef.currentCapacity = Math.max(0, chef.currentCapacity - 1);
        chef.totalOrdersCompleted += 1;
        await chef.save();

        res.json({
            success: true,
            message: 'Order completed successfully',
            data: order
        });

    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.rejectOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const chefId = req.chef.chefId;

        const order = await Order.findOne({ _id: orderId, assignedChef: chefId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to you'
            });
        }

        if (order.delegationStatus !== 'Assigned') {
            return res.status(400).json({
                success: false,
                message: 'Only assigned orders can be rejected'
            });
        }

        // Reset order for reassignment
        order.assignedChef = null;
        order.delegationStatus = 'Not Assigned';
        order.chefNotes = `Rejected by chef: ${reason || 'No reason provided'}`;
        await order.save();

        res.json({
            success: true,
            message: 'Order rejected successfully',
            data: order
        });

    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= CHEF PROFILE MANAGEMENT =============
exports.getChefProfile = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const chef = await Chef.findById(chefId).select('-password');

        res.json({
            success: true,
            data: chef
        });

    } catch (error) {
        console.error('Get chef profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateChefProfile = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const updates = req.body;

        // Remove sensitive fields that shouldn't be updated via this endpoint
        delete updates.password;
        delete updates.email;
        delete updates.chefId;
        delete updates.status;
        delete updates.earnings;

        const chef = await Chef.findByIdAndUpdate(
            chefId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: chef
        });

    } catch (error) {
        console.error('Update chef profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { availability } = req.body;

        if (!['Available', 'Busy', 'Offline'].includes(availability)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid availability status'
            });
        }

        const chef = await Chef.findByIdAndUpdate(
            chefId,
            { availability, updatedAt: new Date() },
            { new: true }
        ).select('fullName availability currentCapacity maxCapacity');

        res.json({
            success: true,
            message: 'Availability updated successfully',
            data: chef
        });

    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update availability',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= CHEF ANALYTICS =============
exports.getChefAnalytics = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { period = 'month' } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Get orders for the period
        const orders = await Order.find({
            assignedChef: chefId,
            chefAssignedDate: { $gte: startDate, $lte: now }
        });

        // Calculate analytics
        const analytics = {
            totalOrders: orders.length,
            completedOrders: orders.filter(o => o.delegationStatus === 'Completed').length,
            rejectedOrders: orders.filter(o => o.chefNotes && o.chefNotes.includes('Rejected')).length,
            averageRating: orders.filter(o => o.chefRating).reduce((sum, o) => sum + o.chefRating, 0) / 
                          orders.filter(o => o.chefRating).length || 0,
            totalEarnings: orders.filter(o => o.delegationStatus === 'Completed').length * 500, // Assuming 500 per order
            completionRate: orders.length > 0 ? 
                (orders.filter(o => o.delegationStatus === 'Completed').length / orders.length * 100).toFixed(1) : 0
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Get chef analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= NOTIFICATION MANAGEMENT =============
exports.getChefNotifications = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        console.log('📬 Fetching notifications for chef:', chefId);

        const skip = (page - 1) * limit;
        const query = { userId: chefId };
        
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const Notification = require('../models/Notification');
        
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ 
            userId: chefId, 
            read: false 
        });

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalNotifications: total,
                    unreadCount,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('❌ Get chef notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { notificationId } = req.params;

        console.log('✅ Marking notification as read:', { chefId, notificationId });

        const Notification = require('../models/Notification');
        
        const notification = await Notification.findOne({
            _id: notificationId,
            userId: chefId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });

    } catch (error) {
        console.error('❌ Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= CHEF STATUS UPDATE =============
exports.updateChefStatus = async (req, res) => {
    try {
        const chefId = req.chef.chefId;
        const { orderId } = req.params;
        const { chefStatus } = req.body;

        console.log('✅ Updating chef status:', { chefId, orderId, chefStatus });

        // Validate chef status (must match OrderDelegation enum)
        const validStatuses = ['Assigned', 'Accepted', 'In Progress', 'Ready', 'Completed'];
        if (!validStatuses.includes(chefStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid chef status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        // Find the order delegation
        const delegation = await OrderDelegation.findOne({
            order: orderId,
            chef: chefId
        });

        if (!delegation) {
            return res.status(404).json({
                success: false,
                message: 'Order delegation not found for this chef'
            });
        }

        // Update the delegation status
        delegation.status = chefStatus;
        delegation.updatedAt = new Date();
        await delegation.save();

        // Get the updated order with delegation info
        const order = await Order.findById(orderId)
            .populate('customer', 'fullName email phone')
            .populate('subscription.mealPlanId', 'planName planType duration')
            .populate({
                path: 'assignedChef',
                select: 'fullName email rating totalOrdersCompleted'
            });

        if (order) {
            // Add delegation status to order object for response
            order.delegationStatus = chefStatus;
        }

        // Send notification to admin about status change
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                userId: 'admin', // Or specific admin ID
                type: 'chef_status_update',
                title: 'Chef Status Updated',
                message: `Chef has updated status to "${chefStatus}" for order #${order?.orderNumber}`,
                data: {
                    orderId,
                    chefId,
                    newStatus: chefStatus,
                    orderNumber: order?.orderNumber
                }
            });
        } catch (notificationError) {
            console.warn('⚠️ Failed to send notification:', notificationError.message);
        }

        res.json({
            success: true,
            message: `Chef status updated to ${chefStatus}`,
            data: order
        });

    } catch (error) {
        console.error('❌ Update chef status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update chef status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};