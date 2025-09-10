const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const Customer = require('../../models/Customer');
const Chef = require('../../models/Chef');
const MealPlan = require('../../models/MealPlan');
const RecurringSubscription = require('../../models/RecurringSubscription');
const MealAssignment = require('../../models/MealAssignment');
const ChefReassignmentRequest = require('../../models/ChefReassignmentRequest');

// Import routes
const adminRoutes = require('../../routes/admin');

// Create test app
const app = express();
app.use(express.json());

// Mock admin authentication middleware
app.use('/api/admin', (req, res, next) => {
  req.user = { 
    id: 'admin123', 
    email: 'admin@test.com',
    role: 'super_admin' 
  };
  next();
});

app.use('/api/admin', adminRoutes);

describe('Admin Dashboard Integration Tests', () => {
  let testUser, testChef, testMealPlan, testSubscription;
  let testData = {};

  beforeEach(async () => {
    // Create comprehensive test data for integration testing
    testUser = await Customer.create({
      fullName: 'Test Customer',
      email: 'customer@example.com',
      phone: '1234567890',
      password: 'hashedpassword'
    });

    testChef = await Chef.create({
      fullName: 'Master Chef',
      email: 'chef@example.com',
      phone: '1234567891',
      password: 'hashedpassword',
      status: 'Active',
      location: {
        area: 'Lagos Island',
        coordinates: [6.5244, 3.3792]
      },
      maxDailyCapacity: 15,
      specializations: ['Nigerian', 'Continental']
    });

    testMealPlan = await MealPlan.create({
      title: 'Premium Nigerian Delights',
      description: 'Authentic Nigerian meals prepared by expert chefs',
      price: 8500,
      chef: testChef._id,
      imageUrl: 'https://example.com/meal-plan.jpg',
      meals: [],
      status: 'published'
    });

    testSubscription = await RecurringSubscription.create({
      userId: testUser._id,
      mealPlanId: testMealPlan._id,
      status: 'active',
      frequency: 'daily',
      deliverySchedule: {
        timeSlot: { start: '12:00', end: '14:00' },
        address: '123 Victoria Island, Lagos, Nigeria',
        coordinates: { lat: 6.4281, lng: 3.4219 }
      },
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      nextDeliveryDate: new Date()
    });

    // Create meal assignments with various statuses
    const assignments = [
      {
        subscriptionId: testSubscription._id,
        assignedChef: testChef._id,
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'delivered',
        actualDeliveryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000), // 1 hour after scheduled
        statusHistory: [
          { status: 'scheduled', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedBy: 'system' },
          { status: 'chef_assigned', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000), updatedBy: 'admin' },
          { status: 'preparing', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 7200000), updatedBy: 'chef' },
          { status: 'delivered', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10800000), updatedBy: 'driver' }
        ]
      },
      {
        subscriptionId: testSubscription._id,
        assignedChef: testChef._id,
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        status: 'delivered',
        actualDeliveryTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 7200000), // 2 hours after
        statusHistory: [
          { status: 'scheduled', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), updatedBy: 'system' },
          { status: 'delivered', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 7200000), updatedBy: 'driver' }
        ]
      },
      {
        subscriptionId: testSubscription._id,
        assignedChef: testChef._id,
        scheduledDate: new Date(), // Today
        status: 'preparing',
        statusHistory: [
          { status: 'scheduled', timestamp: new Date(Date.now() - 3600000), updatedBy: 'system' },
          { status: 'preparing', timestamp: new Date(Date.now() - 1800000), updatedBy: 'chef' }
        ]
      }
    ];

    await MealAssignment.insertMany(assignments);

    // Create a chef reassignment request
    await ChefReassignmentRequest.create({
      subscriptionId: testSubscription._id,
      currentChefId: testChef._id,
      requestedBy: testUser._id,
      reason: 'Chef is consistently 30 minutes late',
      priority: 'high',
      status: 'pending'
    });

    testData = {
      user: testUser,
      chef: testChef,
      mealPlan: testMealPlan,
      subscription: testSubscription
    };
  });

  describe('Analytics Dashboard Integration', () => {
    it('should provide comprehensive subscription metrics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      const metrics = response.body.data;

      // Verify all key metrics are present
      expect(metrics).toHaveProperty('totalSubscriptions');
      expect(metrics).toHaveProperty('activeSubscriptions');
      expect(metrics).toHaveProperty('pausedSubscriptions');
      expect(metrics).toHaveProperty('cancelledSubscriptions');
      expect(metrics).toHaveProperty('churnRate');
      expect(metrics).toHaveProperty('totalRecurringRevenue');
      expect(metrics).toHaveProperty('customerLifetimeValue');

      // Verify data consistency
      expect(metrics.totalSubscriptions).toBeGreaterThanOrEqual(
        metrics.activeSubscriptions + metrics.pausedSubscriptions + metrics.cancelledSubscriptions
      );
      expect(metrics.totalRecurringRevenue).toBeGreaterThan(0);
    });

    it('should show meal plan popularity with correct rankings', async () => {
      // Create additional meal plan for comparison
      const secondMealPlan = await MealPlan.create({
        title: 'Basic Plan',
        description: 'Simple meals',
        price: 3500,
        chef: testChef._id,
        imageUrl: 'basic-plan.jpg',
        meals: []
      });

      const response = await request(app)
        .get('/api/admin/analytics/meal-plan-popularity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const plan = response.body.data[0];
        expect(plan).toHaveProperty('planId');
        expect(plan).toHaveProperty('planName');
        expect(plan).toHaveProperty('popularityScore');
        expect(plan.popularityScore).toBeGreaterThanOrEqual(0);
        expect(plan.popularityScore).toBeLessThanOrEqual(100);
      }
    });

    it('should display chef performance metrics accurately', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/chef-performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const chef = response.body.data[0];
        expect(chef.chefName).toBe('Master Chef');
        expect(chef.totalDeliveries).toBeGreaterThan(0);
        expect(chef.onTimeDeliveryRate).toBeGreaterThanOrEqual(0);
        expect(chef.onTimeDeliveryRate).toBeLessThanOrEqual(100);
        expect(chef.consistencyScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Delivery Monitoring Dashboard Integration', () => {
    it('should provide real-time delivery data', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/admin/deliveries/monitor?date=${today}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const delivery = response.body.data[0];
        expect(delivery).toHaveProperty('customerName');
        expect(delivery).toHaveProperty('mealTitle');
        expect(delivery).toHaveProperty('chefName');
        expect(delivery).toHaveProperty('status');
        expect(delivery).toHaveProperty('scheduledTimeSlot');
        expect(delivery).toHaveProperty('timeline');
      }
    });

    it('should provide accurate delivery statistics', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/admin/deliveries/stats?date=${today}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const stats = response.body.data;

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('preparing');
      expect(stats).toHaveProperty('delivered');
      expect(stats).toHaveProperty('overdue');
      expect(stats).toHaveProperty('onTime');

      // Verify data consistency
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.delivered + stats.preparing + stats.scheduled + stats.ready + stats.outForDelivery + stats.failed)
        .toBeLessThanOrEqual(stats.total);
    });

    it('should filter deliveries by status correctly', async () => {
      const response = await request(app)
        .get('/api/admin/deliveries/monitor?status=preparing')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned deliveries should have 'preparing' status
      response.body.data.forEach(delivery => {
        expect(delivery.status).toBe('preparing');
      });
    });
  });

  describe('Chef Workload Management Integration', () => {
    it('should display chef workload with accurate metrics', async () => {
      const response = await request(app)
        .get('/api/admin/chefs/workload')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const chef = response.body.data[0];
        expect(chef.fullName).toBe('Master Chef');
        expect(chef).toHaveProperty('workloadScore');
        expect(chef).toHaveProperty('activeAssignments');
        expect(chef).toHaveProperty('onTimeDeliveryRate');
        expect(chef).toHaveProperty('consistencyScore');
        expect(chef).toHaveProperty('status');
        expect(['available', 'busy', 'overloaded']).toContain(chef.status);
      }
    });

    it('should show pending reassignment requests', async () => {
      const response = await request(app)
        .get('/api/admin/chefs/reassignment-requests')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const request = response.body.data[0];
      expect(request.customerName).toBe('Test Customer');
      expect(request.currentChefName).toBe('Master Chef');
      expect(request.reason).toBe('Chef is consistently 30 minutes late');
      expect(request.priority).toBe('high');
      expect(request.status).toBe('pending');
    });

    it('should allow chef assignment to subscriptions', async () => {
      const response = await request(app)
        .post('/api/admin/chefs/assign')
        .send({
          chefId: testChef._id.toString(),
          subscriptionId: testSubscription._id.toString(),
          assignedBy: 'admin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Chef assigned');
    });

    it('should handle reassignment request approval', async () => {
      // First, get the request ID
      const requestsResponse = await request(app)
        .get('/api/admin/chefs/reassignment-requests')
        .expect(200);

      const requestId = requestsResponse.body.data[0]._id;

      // Create a new chef for reassignment
      const newChef = await Chef.create({
        fullName: 'Alternative Chef',
        email: 'alt-chef@example.com',
        phone: '9876543210',
        password: 'hashedpassword',
        status: 'Active',
        location: { area: 'Mainland', coordinates: [6.5244, 3.3792] }
      });

      const response = await request(app)
        .post(`/api/admin/chefs/reassignment-requests/${requestId}/approve`)
        .send({ newChefId: newChef._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved');
    });
  });

  describe('Cross-Dashboard Data Consistency', () => {
    it('should maintain data consistency across all dashboard endpoints', async () => {
      // Fetch data from all dashboards
      const [metricsRes, popularityRes, performanceRes, workloadRes] = await Promise.all([
        request(app).get('/api/admin/analytics/subscription-metrics'),
        request(app).get('/api/admin/analytics/meal-plan-popularity'),
        request(app).get('/api/admin/analytics/chef-performance'),
        request(app).get('/api/admin/chefs/workload')
      ]);

      // All requests should succeed
      [metricsRes, popularityRes, performanceRes, workloadRes].forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // Check data consistency
      const metrics = metricsRes.body.data;
      const chefs = performanceRes.body.data;
      const workloads = workloadRes.body.data;

      // Same chef should appear in both chef-related endpoints
      if (chefs.length > 0 && workloads.length > 0) {
        const chefFromPerformance = chefs.find(c => c.chefName === 'Master Chef');
        const chefFromWorkload = workloads.find(c => c.fullName === 'Master Chef');
        
        expect(chefFromPerformance).toBeTruthy();
        expect(chefFromWorkload).toBeTruthy();
      }

      // Active subscription count should be consistent
      expect(metrics.activeSubscriptions).toBeGreaterThan(0);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();

      // Make multiple concurrent requests
      const requests = [
        request(app).get('/api/admin/analytics/subscription-metrics'),
        request(app).get('/api/admin/deliveries/monitor'),
        request(app).get('/api/admin/chefs/workload'),
        request(app).get('/api/admin/analytics/chef-performance'),
        request(app).get('/api/admin/deliveries/stats')
      ];

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // All responses should be successful
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      // Clear all data
      await Promise.all([
        MealAssignment.deleteMany({}),
        RecurringSubscription.deleteMany({}),
        ChefReassignmentRequest.deleteMany({})
      ]);

      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSubscriptions).toBe(0);
      expect(response.body.data.activeSubscriptions).toBe(0);
      expect(response.body.data.totalRecurringRevenue).toBe(0);
    });

    it('should handle invalid date parameters', async () => {
      const response = await request(app)
        .get('/api/admin/deliveries/monitor?date=invalid-date')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should default to today's data
    });

    it('should handle non-existent chef reassignment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/admin/chefs/reassignment-requests/${fakeId}/approve`)
        .send({ newChefId: testChef._id.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Performance and Caching', () => {
    it('should complete analytics queries within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);
        
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Create additional test data
      const additionalChefs = [];
      for (let i = 0; i < 5; i++) {
        additionalChefs.push({
          fullName: `Chef ${i}`,
          email: `chef${i}@example.com`,
          phone: `12345${i}${i}${i}${i}${i}`,
          password: 'hashedpassword',
          status: 'Active',
          location: { area: 'Lagos', coordinates: [6.5244, 3.3792] }
        });
      }
      await Chef.insertMany(additionalChefs);

      const response = await request(app)
        .get('/api/admin/chefs/workload')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(1);
    });
  });
});