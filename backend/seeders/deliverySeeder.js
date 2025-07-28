// backend/seeders/deliverySeeder.js - Seed delivery data for testing
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const DeliveryTracking = require('../models/DeliveryTracking');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const sampleDrivers = [
  {
    fullName: 'John Adebayo',
    email: 'john.adebayo@choma.ng',
    phone: '+2348123456789',
    licenseNumber: 'LAG12345',
    vehicleInfo: {
      type: 'motorcycle',
      model: 'Honda CB150',
      plateNumber: 'LAG-123-ABC',
      capacity: 8
    },
    currentLocation: {
      latitude: 6.4281,
      longitude: 3.4219,
      lastUpdated: new Date()
    },
    rating: 4.8,
    totalDeliveries: 247,
    totalEarnings: 89500,
    workingHours: {
      start: '08:00',
      end: '18:00'
    },
    isAvailable: true,
    status: 'Active'
  },
  {
    fullName: 'Sarah Okafor',
    email: 'sarah.okafor@choma.ng',
    phone: '+2348987654321',
    licenseNumber: 'LAG54321',
    vehicleInfo: {
      type: 'bicycle',
      model: 'Mountain Bike',
      plateNumber: 'N/A',
      capacity: 4
    },
    currentLocation: {
      latitude: 6.5954,
      longitude: 3.3364,
      lastUpdated: new Date()
    },
    rating: 4.9,
    totalDeliveries: 189,
    totalEarnings: 67800,
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    isAvailable: true,
    status: 'Active'
  },
  {
    fullName: 'Ahmed Musa',
    email: 'ahmed.musa@choma.ng',
    phone: '+2348111222333',
    licenseNumber: 'LAG67890',
    vehicleInfo: {
      type: 'car',
      model: 'Toyota Corolla',
      plateNumber: 'LAG-456-DEF',
      capacity: 15
    },
    currentLocation: {
      latitude: 6.4333,
      longitude: 3.4167,
      lastUpdated: new Date()
    },
    rating: 4.7,
    totalDeliveries: 312,
    totalEarnings: 125600,
    workingHours: {
      start: '07:00',
      end: '19:00'
    },
    isAvailable: false,
    status: 'On Delivery'
  },
  {
    fullName: 'Grace Nkem',
    email: 'grace.nkem@choma.ng',
    phone: '+2348444555666',
    licenseNumber: 'LAG13579',
    vehicleInfo: {
      type: 'motorcycle',
      model: 'Bajaj Pulsar',
      plateNumber: 'LAG-789-GHI',
      capacity: 6
    },
    currentLocation: {
      latitude: 6.5244,
      longitude: 3.3792,
      lastUpdated: new Date()
    },
    rating: 4.6,
    totalDeliveries: 156,
    totalEarnings: 56200,
    workingHours: {
      start: '10:00',
      end: '16:00'
    },
    isAvailable: true,
    status: 'Active'
  }
];

const seedDrivers = async () => {
  try {
    // Clear existing drivers
    await Driver.deleteMany({});
    console.log('Cleared existing drivers');

    // Insert sample drivers
    const drivers = await Driver.insertMany(sampleDrivers);
    console.log(`Inserted ${drivers.length} sample drivers`);

    return drivers;
  } catch (error) {
    console.error('Error seeding drivers:', error);
    throw error;
  }
};

const createSampleDeliveryTrackings = async (drivers, orders, customers) => {
  try {
    // Clear existing delivery trackings
    await DeliveryTracking.deleteMany({});
    console.log('Cleared existing delivery trackings');

    const sampleTrackings = [
      {
        order: orders[0]._id,
        driver: drivers[0]._id,
        customer: customers[0]._id,
        deliveryStatus: 'Delivered',
        deliveryLocation: {
          address: 'Victoria Island, Lagos State',
          latitude: 6.4281,
          longitude: 3.4219,
          instructions: 'Call when you arrive at the gate'
        },
        pickupLocation: {
          address: 'choma Kitchen, Victoria Island, Lagos',
          latitude: 6.4281,
          longitude: 3.4219,
          instructions: 'Kitchen entrance at the back'
        },
        timeline: [
          {
            status: 'Pending Assignment',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            updatedBy: 'system'
          },
          {
            status: 'Assigned',
            timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
            updatedBy: 'admin'
          },
          {
            status: 'Driver En Route to Kitchen',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            updatedBy: 'driver'
          },
          {
            status: 'Picked Up',
            timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
            updatedBy: 'driver'
          },
          {
            status: 'En Route to Customer',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            updatedBy: 'driver'
          },
          {
            status: 'Delivered',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            updatedBy: 'driver',
            notes: 'Successfully delivered to customer'
          }
        ],
        estimatedPickupTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        actualPickupTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        estimatedDeliveryTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        actualDeliveryTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        deliveryProof: {
          type: 'photo',
          customerName: 'John Doe',
          notes: 'Delivered to customer directly'
        },
        deliveryFee: 500,
        distance: 8.5,
        priority: 'normal',
        customerRating: 5,
        customerFeedback: 'Excellent service! Driver was very professional.'
      },
      {
        order: orders[1]._id,
        driver: drivers[1]._id,
        customer: customers[1]._id,
        deliveryStatus: 'En Route to Customer',
        deliveryLocation: {
          address: 'Ikeja, Lagos State',
          latitude: 6.5954,
          longitude: 3.3364,
          instructions: 'Building has blue gate, ring doorbell'
        },
        pickupLocation: {
          address: 'choma Kitchen, Victoria Island, Lagos',
          latitude: 6.4281,
          longitude: 3.4219,
          instructions: 'Kitchen entrance at the back'
        },
        timeline: [
          {
            status: 'Pending Assignment',
            timestamp: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
            updatedBy: 'system'
          },
          {
            status: 'Assigned',
            timestamp: new Date(Date.now() - 75 * 60 * 1000), // 1.25 hours ago
            updatedBy: 'admin'
          },
          {
            status: 'Driver En Route to Kitchen',
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            updatedBy: 'driver'
          },
          {
            status: 'Picked Up',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            updatedBy: 'driver'
          },
          {
            status: 'En Route to Customer',
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            updatedBy: 'driver'
          }
        ],
        estimatedPickupTime: new Date(Date.now() - 45 * 60 * 1000),
        actualPickupTime: new Date(Date.now() - 30 * 60 * 1000),
        estimatedDeliveryTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        deliveryFee: 800,
        distance: 12.3,
        priority: 'normal'
      },
      {
        order: orders[2]._id,
        customer: customers[0]._id,
        deliveryStatus: 'Pending Assignment',
        deliveryLocation: {
          address: 'Lekki Phase 1, Lagos State',
          latitude: 6.4433,
          longitude: 3.5106,
          instructions: 'Estate entrance, mention choma delivery'
        },
        pickupLocation: {
          address: 'choma Kitchen, Victoria Island, Lagos',
          latitude: 6.4281,
          longitude: 3.4219,
          instructions: 'Kitchen entrance at the back'
        },
        timeline: [
          {
            status: 'Pending Assignment',
            timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
            updatedBy: 'system'
          }
        ],
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        deliveryFee: 1000,
        distance: 15.7,
        priority: 'high'
      }
    ];

    const trackings = await DeliveryTracking.insertMany(sampleTrackings);
    console.log(`Inserted ${trackings.length} sample delivery trackings`);

    return trackings;
  } catch (error) {
    console.error('Error creating sample delivery trackings:', error);
    throw error;
  }
};

const seedDeliveryData = async () => {
  try {
    console.log('Starting delivery data seeding...');

    // Seed drivers first
    const drivers = await seedDrivers();

    // Get existing orders and customers for reference
    const orders = await Order.find().limit(10);
    const customers = await Customer.find().limit(5);

    if (orders.length === 0 || customers.length === 0) {
      console.log('Warning: No orders or customers found. Please seed basic data first.');
      return;
    }

    // Create sample delivery trackings
    const trackings = await createSampleDeliveryTrackings(drivers, orders, customers);

    console.log('✅ Delivery data seeding completed successfully!');
    console.log(`Summary:
    - ${drivers.length} drivers created
    - ${trackings.length} delivery trackings created`);

  } catch (error) {
    console.error('❌ Error seeding delivery data:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB().then(() => {
    seedDeliveryData().then(() => {
      console.log('Seeding completed. Exiting...');
      process.exit(0);
    }).catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
  });
}

module.exports = {
  seedDrivers,
  createSampleDeliveryTrackings,
  seedDeliveryData
};
