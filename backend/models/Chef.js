const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const chefSchema = new mongoose.Schema({
    chefId: {
        type: String,
        unique: true
    },
    
    // Personal Information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    alternatePhone: {
        type: String
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    
    // Identity Verification
    identityVerification: {
        idType: {
            type: String,
            enum: ['National ID', 'Driver License', 'International Passport', 'Voter Card'],
            required: true
        },
        idNumber: {
            type: String,
            required: true
        },
        idExpiryDate: {
            type: Date
        }
    },
    
    // Professional Details
    specialties: [{
        type: String,
        enum: [
            'Nigerian Cuisine', 'Continental Cuisine', 'Asian Cuisine', 'Italian Cuisine', 
            'Chinese Cuisine', 'Indian Cuisine', 'Lebanese Cuisine', 'Healthy Meals', 
            'Vegetarian', 'Vegan', 'Keto Diet', 'Protein-Rich', 'Low Carb', 'Gluten-Free', 
            'Mediterranean', 'Diabetic-Friendly', 'Kids Meals', 'Halal', 'Kosher'
        ]
    }],
    experience: {
        type: Number,
        required: true,
        min: 0,
        max: 50
    },
    culinaryEducation: {
        type: String
    },
    previousWorkExperience: {
        type: String
    },
    certifications: [{
        type: String,
        enum: [
            'HACCP Certification', 'Food Safety Certificate', 'Culinary School Diploma',
            'ServSafe Certification', 'Nutrition Certification', 'Catering License',
            'Health Department Permit', 'Other'
        ]
    }],
    languagesSpoken: [{
        type: String,
        enum: [
            'English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin English', 'Fulfulde', 'Kanuri',
            'Ibibio', 'Tiv', 'Ijaw', 'French', 'Arabic', 'Other'
        ]
    }],
    bio: {
        type: String,
        maxlength: 500
    },
    
    // Location & Service Area
    location: {
        streetAddress: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true,
            enum: [
                'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
                'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
                'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
                'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
                'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
            ]
        },
        postalCode: {
            type: String
        },
        country: {
            type: String,
            default: 'Nigeria'
        },
        serviceRadius: {
            type: Number,
            required: true,
            min: 1,
            max: 50
        }
    },
    
    // Kitchen & Equipment
    kitchenDetails: {
        hasOwnKitchen: {
            type: Boolean,
            default: true
        },
        kitchenEquipment: [{
            type: String,
            enum: [
                'Gas Cooker', 'Electric Cooker', 'Microwave', 'Oven', 'Blender', 'Food Processor',
                'Pressure Cooker', 'Rice Cooker', 'Deep Fryer', 'Grilling Equipment', 'Refrigerator',
                'Freezer', 'Kitchen Scale', 'Mixing Bowls', 'Professional Knives', 'Cutting Boards'
            ]
        }],
        canCookAtCustomerLocation: {
            type: Boolean,
            default: false
        },
        transportationMethod: {
            type: String,
            enum: ['Own Vehicle', 'Motorcycle', 'Public Transport', 'Delivery Service'],
            required: true
        }
    },
    
    // System fields
    rating: {
        type: Number,
        default: 4.5,
        min: 0,
        max: 5
    },
    totalOrdersCompleted: {
        type: Number,
        default: 0
    },
    currentCapacity: {
        type: Number,
        default: 0
    },
    maxCapacity: {
        type: Number,
        default: 5
    },
    availability: {
        type: String,
        enum: ['Available', 'Busy', 'Offline', 'Unavailable'],
        default: 'Available'
    },
    workingHours: {
        start: {
            type: String,
            default: '08:00'
        },
        end: {
            type: String,
            default: '18:00'
        }
    },
    
    // Emergency Contact
    emergencyContact: {
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    
    // References
    references: [{
        name: {
            type: String
        },
        relationship: {
            type: String
        },
        phone: {
            type: String
        },
        email: {
            type: String
        }
    }],
    
    // Bank Details
    bankDetails: {
        accountName: {
            type: String,
            required: true
        },
        accountNumber: {
            type: String,
            required: true
        },
        bankName: {
            type: String,
            required: true
        },
        bankCode: {
            type: String
        },
        bvn: {
            type: String,
            validate: {
                validator: function(v) {
                    // BVN is optional, but if provided, must be exactly 11 digits
                    return !v || (v.length === 11 && /^\d{11}$/.test(v));
                },
                message: 'BVN must be exactly 11 digits if provided'
            }
        }
    },
    
    // Profile & Portfolio
    profileImage: {
        type: String,
        default: ''
    },
    portfolioImages: [{
        type: String
    }],
    
    // Health & Safety
    healthCertificates: [{
        type: String
    }],
    foodSafetyCertification: {
        type: String
    },
    
    // Legal Agreements
    legalAgreements: {
        agreedToTerms: {
            type: Boolean,
            required: true
        },
        agreedToPrivacyPolicy: {
            type: Boolean,
            required: true
        },
        agreedToBackgroundCheck: {
            type: Boolean,
            required: true
        },
        agreementDate: {
            type: Date,
            default: Date.now
        }
    },
    
    // Status and admin fields
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended', 'Pending'],
        default: 'Pending'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    
    // Earnings
    earnings: {
        total: {
            type: Number,
            default: 0
        },
        thisMonth: {
            type: Number,
            default: 0
        },
        lastPayout: {
            type: Date
        }
    },
    
    // Preferences
    preferences: {
        notifications: {
            newOrders: {
                type: Boolean,
                default: true
            },
            orderUpdates: {
                type: Boolean,
                default: true
            },
            payments: {
                type: Boolean,
                default: true
            }
        },
        workDays: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }]
    },
    
    // Reviews
    reviews: [{
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique chef ID before saving, with logging for debugging
chefSchema.pre('save', async function(next) {
    console.log('[ChefSchema] pre-save hook (chefId generation) triggered');
    if (this.isNew) {
        try {
            const count = await mongoose.model('Chef').countDocuments();
            this.chefId = `CHEF${String(count + 1).padStart(4, '0')}`;
            console.log(`[ChefSchema] Generated chefId: ${this.chefId}`);
        } catch (error) {
            console.error('[ChefSchema] Error generating chefId:', error);
            return next(error);
        }
    }
    // Update the updatedAt field
    this.updatedAt = new Date();
    console.log('[ChefSchema] pre-save hook (chefId generation) completed');
    next();
});

// Hash password before saving, with logging for debugging
chefSchema.pre('save', async function(next) {
    console.log('[ChefSchema] pre-save hook (password hash) triggered');
    if (!this.isModified('password')) {
        console.log('[ChefSchema] Password not modified, skipping hash');
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('[ChefSchema] Password hashed successfully');
        next();
    } catch (error) {
        console.error('[ChefSchema] Error hashing password:', error);
        next(error);
    }
});

// Method to compare password
chefSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate average rating
chefSchema.methods.calculateAverageRating = function() {
    if (this.reviews.length === 0) return this.rating;
    
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / this.reviews.length).toFixed(1);
};

// Method to check availability
chefSchema.methods.isAvailable = function() {
    return this.status === 'Active' && 
           this.availability === 'Available' && 
           this.currentCapacity < this.maxCapacity;
};

// Static method to find available chefs
chefSchema.statics.findAvailableChefs = function(specialty = null) {
    const query = {
        status: 'Active',
        availability: 'Available',
        $expr: { $lt: ['$currentCapacity', '$maxCapacity'] }
    };
    
    if (specialty) {
        query.specialties = { $in: [specialty] };
    }
    
    return this.find(query).sort({ rating: -1, currentCapacity: 1 });
};

module.exports = mongoose.model('Chef', chefSchema);