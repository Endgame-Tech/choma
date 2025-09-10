const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const recurringDeliveryAnalyticsController = require('../../controllers/recurringDeliveryAnalyticsController');
const Customer = require('../../models/Customer');
const Chef = require('../../models/Chef');
const MealPlan = require('../../models/MealPlan');
const RecurringSubscription = require('../../models/RecurringSubscription');
const MealAssignment = require('../../models/MealAssignment');
const Admin = require('../../models/Admin');

// Create test app
const app = express();
app.use(express.json());

// Mock admin auth middleware
app.use('/api/admin', (req, res, next) => {
  req.user = { id: 'admin123', role: 'admin' };
  next();
});

// Mount routes
app.get('/api/admin/analytics/subscription-metrics', recurringDeliveryAnalyticsController.getSubscriptionMetrics);
app.get('/api/admin/analytics/meal-plan-popularity', recurringDeliveryAnalyticsController.getMealPlanPopularity);
app.get('/api/admin/analytics/chef-performance', recurringDeliveryAnalyticsController.getChefPerformance);
app.get('/api/admin/analytics/subscription-trends', recurringDeliveryAnalyticsController.getSubscriptionTrends);

describe('Recurring Delivery Analytics Controller', () => {
  let testUser, testChef, testMealPlan, testSubscription, testAssignment;

  beforeEach(async () => {
    // Create test data
    testUser = await Customer.create({
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      password: 'hashedpassword'
    });

    testChef = await Chef.create({
      fullName: 'Test Chef',
      email: 'chef@example.com',
      phone: '1234567891',
      password: 'hashedpassword',
      status: 'Active'
    });

    testMealPlan = await MealPlan.create({
      title: 'Test Meal Plan',
      description: 'Test meal plan for analytics',
      price: 5000,
      chef: testChef._id,
      imageUrl: 'test-image.jpg',
      meals: []
    });

    testSubscription = await RecurringSubscription.create({
      userId: testUser._id,
      mealPlanId: testMealPlan._id,
      status: 'active',
      frequency: 'daily',
      deliverySchedule: {
        timeSlot: { start: '12:00', end: '14:00' },
        address: 'Test Address, Lagos',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      startDate: new Date(),
      nextDeliveryDate: new Date()
    });

    testAssignment = await MealAssignment.create({
      subscriptionId: testSubscription._id,
      assignedChef: testChef._id,
      scheduledDate: new Date(),
      status: 'delivered',
      actualDeliveryTime: new Date()
    });
  });

  describe('GET /api/admin/analytics/subscription-metrics', () => {
    it('should return subscription metrics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('totalSubscriptions');
      expect(response.body.data).toHaveProperty('activeSubscriptions');
      expect(response.body.data).toHaveProperty('churnRate');
      expect(response.body.data).toHaveProperty('totalRecurringRevenue');
    });

    it('should handle period parameter', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics?period=7d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should calculate metrics correctly', async () => {
      // Create additional test data
      await RecurringSubscription.create({
        userId: testUser._id,
        mealPlanId: testMealPlan._id,
        status: 'paused',
        frequency: 'weekly',
        deliverySchedule: {
          timeSlot: { start: '10:00', end: '12:00' },
          address: 'Another Address',
          coordinates: { lat: 6.5244, lng: 3.3792 }
        },
        startDate: new Date(),
        nextDeliveryDate: new Date()
      });

      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);

      expect(response.body.data.totalSubscriptions).toBeGreaterThan(0);
      expect(response.body.data.activeSubscriptions).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/analytics/meal-plan-popularity', () => {
    it('should return meal plan popularity data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/meal-plan-popularity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include correct meal plan properties', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/meal-plan-popularity')
        .expect(200);

      if (response.body.data.length > 0) {
        const mealPlan = response.body.data[0];
        expect(mealPlan).toHaveProperty('planId');
        expect(mealPlan).toHaveProperty('planName');
        expect(mealPlan).toHaveProperty('activeSubscriptions');
        expect(mealPlan).toHaveProperty('totalRevenue');
        expect(mealPlan).toHaveProperty('popularityScore');
      }
    });

    it('should handle different periods', async () => {
      await request(app)
        .get('/api/admin/analytics/meal-plan-popularity?period=90d')
        .expect(200);
    });
  });

  describe('GET /api/admin/analytics/chef-performance', () => {
    it('should return chef performance data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/chef-performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include chef performance metrics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/chef-performance')
        .expect(200);

      if (response.body.data.length > 0) {
        const chef = response.body.data[0];
        expect(chef).toHaveProperty('chefId');
        expect(chef).toHaveProperty('chefName');
        expect(chef).toHaveProperty('totalDeliveries');
        expect(chef).toHaveProperty('onTimeDeliveryRate');
        expect(chef).toHaveProperty('consistencyScore');
      }
    });
  });

  describe('GET /api/admin/analytics/subscription-trends', () => {
    it('should return subscription trends', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-trends')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include trend data properties', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-trends')
        .expect(200);

      if (response.body.data.length > 0) {
        const trend = response.body.data[0];
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('newSubscriptions');
        expect(trend).toHaveProperty('cancellations');
        expect(trend).toHaveProperty('netGrowth');
      }
    });

    it('should handle yearly period with monthly grouping', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-trends?period=1y')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by temporarily breaking the connection
      const mongoose = require('mongoose');
      const originalFind = RecurringSubscription.aggregate;
      
      RecurringSubscription.aggregate = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to fetch');

      // Restore original method
      RecurringSubscription.aggregate = originalFind;
    });

    it('should handle invalid period parameters', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics?period=invalid')
        .expect(200); // Should default to 30d

      expect(response.body.success).toBe(true);
    });
  });

  describe('Data Accuracy', () => {
    it('should calculate churn rate correctly', async () => {
      // Create cancelled subscription
      await RecurringSubscription.create({
        userId: testUser._id,
        mealPlanId: testMealPlan._id,
        status: 'cancelled',
        frequency: 'daily',
        deliverySchedule: {
          timeSlot: { start: '12:00', end: '14:00' },
          address: 'Test Address',
          coordinates: { lat: 6.5244, lng: 3.3792 }
        },
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        nextDeliveryDate: new Date(),
        updatedAt: new Date() // Recent cancellation
      });

      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics?period=30d')
        .expect(200);

      expect(response.body.data.churnRate).toBeGreaterThan(0);
    });

    it('should calculate revenue metrics correctly', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/subscription-metrics')
        .expect(200);

      const { data } = response.body;
      
      if (data.totalRecurringRevenue > 0) {
        expect(data.averageRevenuePerSubscription).toBeGreaterThan(0);
        expect(data.customerLifetimeValue).toBeGreaterThanOrEqual(0);
      }
    });
  });
});