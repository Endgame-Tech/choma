const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const setupAlphaAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if Alpha Admin already exists
    const existingAlphaAdmin = await Admin.findOne({ isAlphaAdmin: true });
    if (existingAlphaAdmin) {
      console.log('Alpha Admin already exists:', existingAlphaAdmin.email);
      process.exit(0);
    }

    // Get Super Admin role
    const predefinedRoles = Admin.getPredefinedRoles();
    const superAdminRole = predefinedRoles.find(role => role.id === 'super_admin');

    // Create Alpha Admin
    const alphaAdmin = new Admin({
      email: 'alpha@choma.com',
      password: 'AlphaAdmin@2024', // Change this password after first login
      firstName: 'Alpha',
      lastName: 'Admin',
      role: superAdminRole,
      isActive: true,
      isAlphaAdmin: true
    });

    await alphaAdmin.save();
    console.log('✅ Alpha Admin created successfully!');
    console.log('📧 Email: alpha@choma.com');
    console.log('🔑 Password: AlphaAdmin@2024');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Alpha Admin:', error);
    process.exit(1);
  }
};

setupAlphaAdmin();