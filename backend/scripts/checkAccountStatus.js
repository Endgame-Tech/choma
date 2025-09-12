const mongoose = require('mongoose');
require('dotenv').config();
const Customer = require('../models/Customer');

async function checkAccountStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Show all customers to help identify accounts
    console.log('\n📋 All Customers (Recent First):');
    const customers = await Customer.find({})
      .sort({ createdAt: -1 })
      .select('email status deletedAt createdAt');
      
    customers.forEach((cust, index) => {
      const createdDate = cust.createdAt ? cust.createdAt.toISOString().split('T')[0] : 'Unknown';
      const deletedInfo = cust.deletedAt ? ` - Deleted: ${cust.deletedAt.toISOString().split('T')[0]}` : '';
      console.log(`${index + 1}. ${cust.email} - Status: ${cust.status} - Created: ${createdDate}${deletedInfo}`);
    });
    
    // Show deleted accounts specifically
    const deletedAccounts = await Customer.find({ status: 'Deleted' });
    console.log(`\n🗑️  Found ${deletedAccounts.length} deleted accounts`);
    deletedAccounts.forEach((cust, index) => {
      console.log(`   ${index + 1}. ${cust.email} - Deleted: ${cust.deletedAt ? cust.deletedAt.toISOString() : 'No timestamp'}`);
    });
    
  } catch (error) {
    console.error('❌ Check error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAccountStatus();