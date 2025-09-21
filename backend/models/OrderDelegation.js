const mongoose = require('mongoose');

const orderDelegationSchema = new mongoose.Schema({
    delegationId: {
        type: String,
        unique: true,
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    chef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chef',
        required: true
    },
    delegatedBy: {
        type: String, // Admin who delegated the order
        required: true
    },
    delegationDate: {
        type: Date,
        default: Date.now
    },
    acceptanceDate: {
        type: Date
    },
    estimatedCompletionTime: {
        type: Date,
        required: true
    },
    actualCompletionTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Assigned', 'Pending', 'Accepted', 'In Progress', 'Ready', 'Completed', 'Rejected', 'Cancelled'],
        default: 'Assigned'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    specialInstructions: {
        type: String,
        default: ''
    },
    chefNotes: {
        type: String,
        default: ''
    },
    adminNotes: {
        type: String,
        default: ''
    },
    mealPlanDetails: {
        planName: String,
        mealsPerWeek: Number,
        weekNumber: Number, // Which week of the plan this is for
        mealTypes: [String], // breakfast, lunch, dinner
        specialRequirements: [String], // vegan, gluten-free, etc.
        customerPreferences: String
    },
    timeline: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        updatedBy: String // chef or admin
    }],
    ingredients: [{
        name: String,
        quantity: String,
        unit: String,
        source: String, // where to get the ingredient
        cost: Number
    }],
    preparation: {
        startTime: Date,
        endTime: Date,
        steps: [{
            stepNumber: Number,
            description: String,
            estimatedTime: Number, // in minutes
            completed: {
                type: Boolean,
                default: false
            },
            completedAt: Date
        }]
    },
    quality: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        ratedBy: String, // admin or customer
        ratedAt: Date
    },
    payment: {
        chefFee: {
            type: Number,
            required: true
        },
        ingredientsCost: {
            type: Number,
            default: 0
        },
        totalCost: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Processing', 'Paid', 'Failed'],
            default: 'Pending'
        },
        paidAt: Date
    },
    delivery: {
        method: {
            type: String,
            enum: ['Chef Delivery', 'Pickup', 'Third Party'],
            default: 'Chef Delivery'
        },
        scheduledTime: Date,
        actualTime: Date,
        location: {
            address: String,
            city: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        },
        recipient: {
            name: String,
            phone: String
        },
        deliveryNotes: String
    },
    communication: [{
        from: {
            type: String,
            enum: ['Admin', 'Chef', 'Customer'],
            required: true
        },
        to: {
            type: String,
            enum: ['Admin', 'Chef', 'Customer'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        read: {
            type: Boolean,
            default: false
        }
    }],
    rejectionReason: {
        type: String
    },
    cancellationReason: {
        type: String
    },
    performance: {
        onTimeDelivery: {
            type: Boolean,
            default: null
        },
        qualityScore: {
            type: Number,
            min: 1,
            max: 5
        },
        communicationScore: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique delegation ID before saving
orderDelegationSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const count = await mongoose.model('OrderDelegation').countDocuments();
            this.delegationId = `DEL${String(count + 1).padStart(6, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    
    // Update the updatedAt field
    this.updatedAt = new Date();
    next();
});

// Add to timeline when status changes
orderDelegationSchema.pre('save', function(next) {
    if (this.isModified('status') && !this.isNew) {
        this.timeline.push({
            status: this.status,
            timestamp: new Date(),
            notes: `Status changed to ${this.status}`,
            updatedBy: 'System'
        });
    }
    next();
});

// Method to calculate total preparation time
orderDelegationSchema.methods.getTotalPreparationTime = function() {
    if (!this.preparation.steps || this.preparation.steps.length === 0) return 0;
    return this.preparation.steps.reduce((total, step) => total + (step.estimatedTime || 0), 0);
};

// Method to check if order is overdue
orderDelegationSchema.methods.isOverdue = function() {
    return this.estimatedCompletionTime < new Date() && 
           !['Completed', 'Cancelled', 'Rejected'].includes(this.status);
};

// Method to get completion percentage
orderDelegationSchema.methods.getCompletionPercentage = function() {
    if (!this.preparation.steps || this.preparation.steps.length === 0) return 0;
    
    const completedSteps = this.preparation.steps.filter(step => step.completed).length;
    return Math.round((completedSteps / this.preparation.steps.length) * 100);
};

// Static method to get chef workload
orderDelegationSchema.statics.getChefWorkload = function(chefId) {
    return this.aggregate([
        {
            $match: {
                chef: new mongoose.Types.ObjectId(chefId),
                status: { $in: ['Pending', 'Accepted', 'In Progress'] }
            }
        },
        {
            $group: {
                _id: '$chef',
                totalOrders: { $sum: 1 },
                pendingOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                },
                inProgressOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                },
                avgCompletionTime: { $avg: '$actualCompletionTime' },
                totalRevenue: { $sum: '$payment.chefFee' }
            }
        }
    ]);
};

// Static method to get order statistics
orderDelegationSchema.statics.getOrderStatistics = function(dateRange = {}) {
    const matchStage = {};
    if (dateRange.start && dateRange.end) {
        matchStage.delegationDate = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalDelegations: { $sum: 1 },
                completedOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
                },
                pendingOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                },
                rejectedOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                },
                avgCompletionTime: { $avg: '$actualCompletionTime' },
                totalRevenue: { $sum: '$payment.totalCost' }
            }
        }
    ]);
};

module.exports = mongoose.model('OrderDelegation', orderDelegationSchema);