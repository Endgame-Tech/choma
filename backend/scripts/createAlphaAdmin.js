const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://chomaDev:65dHyGGsQ2Zhshld@chomadev.gmea24c.mongodb.net/chomaDev?retryWrites=true&w=majority&appName=chomaDev';

// Alpha Admin credentials
const ALPHA_ADMIN_DATA = {
  email: 'alpha@getchoma.com',
  password: 'AlphaAdmin@2024',
  firstName: 'Alpha',
  lastName: 'Administrator'
};

async function createAlphaAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if Alpha Admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { email: ALPHA_ADMIN_DATA.email },
        { isAlphaAdmin: true }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Alpha Admin already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   Alpha Admin: ${existingAdmin.isAlphaAdmin}`);
      console.log('🛑 Skipping creation to prevent duplicates');
      return;
    }

    // Create Super Admin role with full permissions
    const superAdminRole = {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access with all permissions - Alpha Administrator',
      permissions: {
        dashboard: { view: true },
        analytics: { view: true },
        orders: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          approve: true 
        },
        chefs: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          approve: true, 
          manageApplications: true 
        },
        users: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          viewSensitiveInfo: true 
        },
        customers: { 
          view: true, 
          edit: true, 
          delete: true, 
          viewSensitiveInfo: true 
        },
        meals: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          bulkUpload: true, 
          manageAvailability: true 
        },
        mealPlans: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          publish: true, 
          schedule: true 
        },
        adminManagement: { 
          view: true, 
          create: true, 
          edit: true, 
          delete: true, 
          managePermissions: true, 
          view_activity_logs: true, 
          manage_sessions: true 
        },
        deliveryPrices: { view: true },
        drivers: { view: true, approve: true, edit: true, manage: true }
      },
      isDefault: true
    };

    // Create Alpha Admin document
    const alphaAdmin = new Admin({
      email: ALPHA_ADMIN_DATA.email,
      password: ALPHA_ADMIN_DATA.password, // Will be hashed by pre-save middleware
      firstName: ALPHA_ADMIN_DATA.firstName,
      lastName: ALPHA_ADMIN_DATA.lastName,
      role: superAdminRole,
      isActive: true,
      isAlphaAdmin: true, // This is the key flag for Alpha Admin
      phone: '+234-800-CHOMA-1', // Optional: Add a phone number
      department: 'Executive Management',
      twoFactorEnabled: false,
      loginAttempts: 0,
      sessions: []
    });

    // Save Alpha Admin to database
    console.log('👤 Creating Alpha Admin...');
    await alphaAdmin.save();
    
    console.log('🎉 Alpha Admin created successfully!');
    console.log('📋 Alpha Admin Details:');
    console.log(`   📧 Email: ${alphaAdmin.email}`);
    console.log(`   👤 Name: ${alphaAdmin.firstName} ${alphaAdmin.lastName}`);
    console.log(`   🔑 Role: ${alphaAdmin.role.name}`);
    console.log(`   ⭐ Alpha Admin: ${alphaAdmin.isAlphaAdmin}`);
    console.log(`   ✅ Active: ${alphaAdmin.isActive}`);
    console.log(`   📱 Phone: ${alphaAdmin.phone}`);
    console.log(`   🏢 Department: ${alphaAdmin.department}`);
    console.log(`   🆔 Admin ID: ${alphaAdmin._id}`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log(`   Email: ${ALPHA_ADMIN_DATA.email}`);
    console.log(`   Password: ${ALPHA_ADMIN_DATA.password}`);
    console.log('');
    console.log('✅ Alpha Admin can now login with full system access!');

  } catch (error) {
    console.error('❌ Error creating Alpha Admin:', error);
    
    // Provide specific error messages
    if (error.code === 11000) {
      console.error('🛑 Duplicate key error: An admin with this email already exists');
    } else if (error.name === 'ValidationError') {
      console.error('🛑 Validation error:', error.message);
    } else if (error.name === 'MongoNetworkError') {
      console.error('🛑 Network error: Could not connect to MongoDB');
    } else {
      console.error('🛑 Unknown error occurred');
    }
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit(0);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Run the script
console.log('🚀 Starting Alpha Admin Creation Script...');
console.log('📋 Target Database: Choma Production');
console.log(`📧 Alpha Admin Email: ${ALPHA_ADMIN_DATA.email}`);
console.log('');
createAlphaAdmin();