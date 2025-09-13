const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const DriverAssignment = require('./backend/models/DriverAssignment');
const Driver = require('./backend/models/Driver');
const Order = require('./backend/models/Order');

async function setupTestAssignment() {
  try {
    await mongoose.connect(process.env.DB_URL || 'mongodb://127.0.0.1:27017/choma');
    console.log('Connected to database');

    const orderId = '68c54251f28ad35854e590fc'; // From your logs
    const driverName = 'Legend Testimony';
    const driverPhone = '08139120289';

    // Find or create driver
    let driver = await Driver.findOne({ fullName: driverName, phone: driverPhone });
    
    if (!driver) {
      console.log('Creating test driver...');
      driver = new Driver({
        fullName: driverName,
        email: `${driverName.toLowerCase().replace(' ', '.')}@test.com`,
        phone: driverPhone,
        password: 'TestPassword123!',
        licenseNumber: 'TEST123456',
        vehicleInfo: {
          type: 'motorcycle',
          make: 'Honda',
          model: 'CB125F',
          plateNumber: 'KJA-123-XY',
          color: 'Red'
        },
        accountStatus: 'approved',
        status: 'online',
        isAvailable: true,
        rating: 4.7,
        currentLocation: {
          type: 'Point',
          coordinates: [7.4914, 9.0579], // Abuja coordinates (longitude, latitude)
          lastUpdated: new Date()
        }
      });
      await driver.save();
      console.log('Test driver created:', driver._id);
    } else {
      console.log('Found existing driver:', driver._id);
      // Update location to Abuja
      driver.currentLocation = {
        type: 'Point',
        coordinates: [7.4914, 9.0579], // Abuja coordinates (longitude, latitude)
        lastUpdated: new Date()
      };
      await driver.save();
    }

    // Check if assignment already exists
    let assignment = await DriverAssignment.findOne({ orderId: orderId });
    
    if (!assignment) {
      console.log('Creating test driver assignment...');
      assignment = new DriverAssignment({
        driverId: driver._id,
        orderId: orderId,
        confirmationCode: 'ABCD123',
        pickupLocation: {
          address: 'Test Chef Location, Abuja',
          coordinates: [7.4914, 9.0579],
          chefId: new mongoose.Types.ObjectId(),
          chefName: 'Test Chef',
          chefPhone: '+234-801-234-5678'
        },
        deliveryLocation: {
          address: 'Customer Location, Abuja',
          coordinates: [7.4924, 9.0589],
          customerName: 'Test Customer',
          customerPhone: '+234-802-345-6789'
        },
        status: 'assigned',
        priority: 'medium',
        totalDistance: 2.5,
        estimatedDuration: 25,
        assignedAt: new Date(),
        deliveryFee: 500,
        totalEarning: 500
      });
      
      await assignment.save();
      console.log('Test assignment created:', assignment._id);
    } else {
      console.log('Assignment already exists:', assignment._id);
      // Update assignment to use correct driver
      assignment.driverId = driver._id;
      assignment.status = 'assigned';
      await assignment.save();
      console.log('Assignment updated with driver:', driver._id);
    }

    console.log('✅ Test setup complete!');
    console.log('Driver:', driver.fullName, driver.phone);
    console.log('Order:', orderId);
    console.log('Assignment Status:', assignment.status);
    
  } catch (error) {
    console.error('Error setting up test assignment:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupTestAssignment();