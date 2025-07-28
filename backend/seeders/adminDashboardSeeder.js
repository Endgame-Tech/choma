require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const Chef = require('../models/Chef');
const connectDB = require('../config/db');

// Sample customer data
const sampleCustomers = [
  {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+2348012345678',
    password: 'password123',
    status: 'Active',
    dietaryPreferences: ['Vegan', 'Gluten-Free'],
    city: 'Lagos',
    address: '123 Victoria Island, Lagos'
  },
  {
    fullName: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+2348023456789',
    password: 'password123',
    status: 'Active',
    dietaryPreferences: ['Keto'],
    city: 'Lagos',
    address: '456 Maitama, Abuja'
  },
  {
    fullName: 'Ahmed Hassan',
    email: 'ahmed.hassan@example.com',
    phone: '+2348034567890',
    password: 'password123',
    status: 'Active',
    dietaryPreferences: ['Halal'],
    city: 'Lagos',
    address: '789 Sabon Gari, Kano'
  },
  {
    fullName: 'Blessing Okoro',
    email: 'blessing.okoro@example.com',
    phone: '+2348045678901',
    password: 'password123',
    status: 'Active',
    dietaryPreferences: ['Vegetarian'],
    city: 'Lagos',
    address: '321 GRA, Port Harcourt'
  },
  {
    fullName: 'Emeka Okafor',
    email: 'emeka.okafor@example.com',
    phone: '+2348056789012',
    password: 'password123',
    status: 'Inactive',
    dietaryPreferences: ['Pescatarian'],
    city: 'Lagos',
    address: '654 Independence Layout, Enugu'
  }
];

// Sample chef data
const sampleChefs = [
  {
    fullName: 'Chef Adunni Williams',
    email: 'adunni.williams@choma.com',
    password: 'password123',
    phone: '+2348067890123',
    specialties: ['Nigerian Cuisine', 'Continental'],
    status: 'Active',
    rating: 4.8,
    totalOrdersCompleted: 156,
    location: {
      city: 'Lagos',
      area: 'Victoria Island',
      address: '123 Chef Street, Victoria Island'
    },
    experience: 8,
    availability: 'Available',
    currentCapacity: 3,
    maxCapacity: 12
  },
  {
    fullName: 'Chef Ibrahim Yusuf',
    email: 'ibrahim.yusuf@choma.com',
    password: 'password123',
    phone: '+2348078901234',
    specialties: ['Nigerian Cuisine', 'Continental'],
    status: 'Active',
    rating: 4.6,
    totalOrdersCompleted: 89,
    location: {
      city: 'Abuja',
      area: 'Maitama',
      address: '456 Chef Plaza, Maitama'
    },
    experience: 5,
    availability: 'Available',
    currentCapacity: 2,
    maxCapacity: 10
  },
  {
    fullName: 'Chef Chioma Adeleke',
    email: 'chioma.adeleke@choma.com',
    password: 'password123',
    phone: '+2348089012345',
    specialties: ['Nigerian Cuisine', 'Healthy Meals'],
    status: 'Active',
    rating: 4.9,
    totalOrdersCompleted: 203,
    location: {
      city: 'Enugu',
      area: 'Independence Layout',
      address: '789 Chef Avenue, Independence Layout'
    },
    experience: 12,
    availability: 'Available',
    currentCapacity: 1,
    maxCapacity: 15
  }
];

async function seedAdminDashboard() {
  try {
    console.log('Starting admin dashboard data seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await Customer.deleteMany({});
    await Chef.deleteMany({});
    await Order.deleteMany({});
    await Subscription.deleteMany({});
    
    // Insert customers one by one to avoid customerId conflicts
    console.log('Creating customers...');
    const customers = [];
    for (const customerData of sampleCustomers) {
      try {
        const customer = new Customer(customerData);
        await customer.save();
        customers.push(customer);
      } catch (error) {
        console.log(`Skipping customer ${customerData.email}: ${error.message}`);
      }
    }
    console.log(`Created ${customers.length} customers`);
    
    // Insert chefs one by one to avoid chefId conflicts
    console.log('Creating chefs...');
    const chefs = [];
    for (const chefData of sampleChefs) {
      try {
        const chef = new Chef(chefData);
        await chef.save();
        chefs.push(chef);
      } catch (error) {
        console.log(`Skipping chef ${chefData.email}: ${error.message}`);
      }
    }
    console.log(`Created ${chefs.length} chefs`);
    
    // Get meal plans (assuming they exist from mealPlanSeeder)
    const mealPlans = await MealPlan.find({ isActive: true });
    console.log(`Found ${mealPlans.length} meal plans`);
    
    if (mealPlans.length === 0) {
      console.log('No meal plans found. Please run mealPlanSeeder first.');
      return;
    }
    
    // Create subscriptions
    console.log('Creating subscriptions...');
    const subscriptions = [];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const mealPlan = mealPlans[i % mealPlans.length];
      const startDate = new Date('2024-06-01');
      const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days later
      
      // Create active subscription
      const subscription = {
        subscriptionId: `SUB_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        userId: customer._id,
        mealPlanId: mealPlan._id,
        frequency: ['Daily', 'Twice Daily', 'Thrice Daily'][Math.floor(Math.random() * 3)],
        duration: ['Weekly', 'Monthly'][Math.floor(Math.random() * 2)],
        startDate: startDate,
        endDate: endDate,
        nextDelivery: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        totalPrice: mealPlan.basePrice,
        price: mealPlan.basePrice,
        paymentStatus: 'Paid',
        transactionId: `TXN_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        deliveryAddress: customer.address,
        paymentMethod: ['paystack', 'transfer'][Math.floor(Math.random() * 2)]
      };
      
      subscriptions.push(subscription);
    }
    
    // Insert subscriptions one by one to avoid subscriptionId conflicts
    const createdSubscriptions = [];
    for (const subscriptionData of subscriptions) {
      try {
        const subscription = new Subscription(subscriptionData);
        await subscription.save();
        createdSubscriptions.push(subscription);
      } catch (error) {
        console.log(`Skipping subscription: ${error.message}`);
      }
    }
    console.log(`Created ${createdSubscriptions.length} subscriptions`);
    
    // Create orders
    console.log('Creating orders...');
    const orders = [];
    
    const orderStatuses = ['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    const paymentStatuses = ['Paid', 'Pending', 'Failed', 'Refunded'];
    const paymentMethods = ['Card', 'Transfer', 'Cash on Delivery'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    
    for (let i = 0; i < 50; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const subscription = createdSubscriptions.find(sub => sub.userId.toString() === customer._id.toString());
      const mealPlan = mealPlans[Math.floor(Math.random() * mealPlans.length)];
      
      // Create order with random data
      const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      const order = {
        orderNumber: `ORD_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        customer: customer._id,
        subscription: subscription ? subscription._id : null,
        orderStatus: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        totalAmount: mealPlan.basePrice + Math.random() * 5000,
        deliveryDate: new Date(orderDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(orderDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdDate: orderDate,
        deliveryAddress: customer.address,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        orderItems: [
          {
            name: mealPlan.planName,
            quantity: 1,
            price: mealPlan.basePrice
          }
        ],
        assignedChef: chefs[Math.floor(Math.random() * chefs.length)]._id,
        delegationStatus: ['Not Assigned', 'Assigned', 'Accepted', 'In Progress', 'Completed'][Math.floor(Math.random() * 5)],
        paymentReference: `PAY_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };
      
      orders.push(order);
    }
    
    // Insert orders one by one to avoid orderNumber conflicts
    const createdOrders = [];
    for (const orderData of orders) {
      try {
        const order = new Order(orderData);
        await order.save();
        createdOrders.push(order);
      } catch (error) {
        console.log(`Skipping order: ${error.message}`);
      }
    }
    console.log(`Created ${createdOrders.length} orders`);
    
    // Update chef order counts
    console.log('Updating chef statistics...');
    for (const chef of chefs) {
      const orderCount = await Order.countDocuments({ 
        assignedChef: chef._id,
        orderStatus: 'Delivered'
      });
      await Chef.findByIdAndUpdate(chef._id, { totalOrdersCompleted: orderCount });
    }
    
    console.log('Admin dashboard seeding completed successfully!');
    console.log('Summary:');
    console.log(`Customers: ${customers.length}`);
    console.log(`Chefs: ${chefs.length}`);
    console.log(`Subscriptions: ${createdSubscriptions.length}`);
    console.log(`Orders: ${createdOrders.length}`);
    console.log(`Meal Plans: ${mealPlans.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error seeding admin dashboard data:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedAdminDashboard();
}

module.exports = seedAdminDashboard;