const mongoose = require('mongoose');
require('dotenv').config();
const Customer = require('../models/Customer');
const axios = require('axios');

async function testDeleteAccountEndpoint() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find a test customer
    const customer = await Customer.findOne().sort({ createdAt: -1 });
    if (!customer) {
      console.log('❌ No customers found to test with');
      return;
    }
    
    console.log(`📋 Testing with customer: ${customer.email}`);
    
    // Try to generate a JWT token for testing
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: customer._id, 
        email: customer.email,
        customerId: customer.customerId 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Test JWT token generated');
    
    // Make API call to delete endpoint  
    const baseUrl = 'http://localhost:5001'; // Direct server URL without /api
    const fullUrl = `${baseUrl}/api/auth/account`;
    console.log(`🌐 Making DELETE request to ${fullUrl}`);
    
    try {
      const response = await axios.delete(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Response:', response.status, response.data);
    } catch (apiError) {
      if (apiError.response) {
        console.log('❌ API Error Response:', apiError.response.status, apiError.response.data);
      } else {
        console.log('❌ API Error:', apiError.message);
      }
    }
    
    // Check if customer was actually updated
    const updatedCustomer = await Customer.findById(customer._id);
    console.log(`📊 Customer status after API call: ${updatedCustomer?.status}`);
    console.log(`🗑️ Deleted at: ${updatedCustomer?.deletedAt}`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDeleteAccountEndpoint();