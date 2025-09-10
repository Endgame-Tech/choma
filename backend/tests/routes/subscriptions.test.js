const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const subscriptionRoutes = require('../../routes/subscriptions');
const Customer = require('../../models/Customer');
const Chef = require('../../models/Chef');
const MealPlan = require('../../models/MealPlan');
const RecurringSubscription = require('../../models/RecurringSubscription');
const MealAssignment = require('../../models/MealAssignment');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/subscriptions', subscriptionRoutes);

describe('Subscription Routes', () => {
  let testUser, testChef, testMealPlan, testSubscription;
  let userToken;

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
      description: 'Test meal plan for testing',
      price: 5000,
      chef: testChef._id,
      meals: []
    });

    testSubscription = await RecurringSubscription.create({
      userId: testUser._id,
      mealPlanId: testMealPlan._id,
      status: 'active',
      frequency: 'daily',
      deliverySchedule: {
        timeSlot: { start: '12:00', end: '14:00' },
        address: 'Test Address',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      startDate: new Date(),
      nextDeliveryDate: new Date()
    });

    // Create user token
    userToken = jwt.sign(
      { userId: testUser._id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  describe('GET /api/subscriptions', () => {
    it('should return user subscriptions', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.subscriptions)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/subscriptions')
        .expect(401);
    });
  });

  describe('POST /api/subscriptions', () => {
    it('should create new subscription', async () => {
      const subscriptionData = {
        mealPlanId: testMealPlan._id,
        frequency: 'weekly',
        deliverySchedule: {
          timeSlot: { start: '10:00', end: '12:00' },
          address: 'New Test Address',
          coordinates: { lat: 6.5244, lng: 3.3792 }
        }
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        frequency: 'daily'
        // Missing mealPlanId and deliverySchedule
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/subscriptions/:id/current-meal', () => {
    it('should return current meal for subscription', async () => {
      // Create a meal assignment
      const assignment = await MealAssignment.create({
        subscriptionId: testSubscription._id,
        scheduledDate: new Date(),
        status: 'preparing',
        assignedChef: testChef._id
      });

      const response = await request(app)
        .get(`/api/subscriptions/${testSubscription._id}/current-meal`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealAssignment).toBeDefined();
    });
  });

  describe('GET /api/subscriptions/:id/chef-status', () => {
    it('should return chef preparation status', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/${testSubscription._id}/chef-status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/subscriptions/:id/next-delivery', () => {
    it('should return next delivery information', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/${testSubscription._id}/next-delivery`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nextDelivery).toBeDefined();
    });
  });

  describe('POST /api/subscriptions/:id/skip-meal', () => {
    it('should skip meal delivery', async () => {
      const skipData = {
        skipDate: new Date(Date.now() + 86400000), // Tomorrow
        reason: 'Going out of town'
      };

      const response = await request(app)
        .post(`/api/subscriptions/${testSubscription._id}/skip-meal`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(skipData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/subscriptions/:id/reassign-chef', () => {
    it('should request chef reassignment', async () => {
      const reassignmentData = {
        reason: 'Chef consistently late',
        priority: 'normal'
      };

      const response = await request(app)
        .post(`/api/subscriptions/${testSubscription._id}/reassign-chef`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(reassignmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/subscriptions/:id/pause', () => {
    it('should pause active subscription', async () => {
      const response = await request(app)
        .put(`/api/subscriptions/${testSubscription._id}/pause`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Vacation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify subscription was paused
      const updatedSubscription = await RecurringSubscription.findById(testSubscription._id);
      expect(updatedSubscription.status).toBe('paused');
    });
  });

  describe('PUT /api/subscriptions/:id/resume', () => {
    it('should resume paused subscription', async () => {
      // First pause the subscription
      await RecurringSubscription.findByIdAndUpdate(testSubscription._id, { status: 'paused' });

      const response = await request(app)
        .put(`/api/subscriptions/${testSubscription._id}/resume`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify subscription was resumed
      const updatedSubscription = await RecurringSubscription.findById(testSubscription._id);
      expect(updatedSubscription.status).toBe('active');
    });
  });

  describe('DELETE /api/subscriptions/:id', () => {
    it('should cancel subscription', async () => {
      const response = await request(app)
        .delete(`/api/subscriptions/${testSubscription._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'No longer needed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify subscription was cancelled
      const updatedSubscription = await RecurringSubscription.findById(testSubscription._id);
      expect(updatedSubscription.status).toBe('cancelled');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/subscriptions/${fakeId}/current-meal`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should handle invalid subscription ID format', async () => {
      await request(app)
        .get('/api/subscriptions/invalid-id/current-meal')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should prevent unauthorized access to other users subscriptions', async () => {
      // Create another user and their subscription
      const otherUser = await Customer.create({
        fullName: 'Other User',
        email: 'other@example.com',
        phone: '9876543210',
        password: 'hashedpassword'
      });

      const otherSubscription = await RecurringSubscription.create({
        userId: otherUser._id,
        mealPlanId: testMealPlan._id,
        status: 'active',
        frequency: 'daily',
        deliverySchedule: {
          timeSlot: { start: '12:00', end: '14:00' },
          address: 'Other Address',
          coordinates: { lat: 6.5244, lng: 3.3792 }
        },
        startDate: new Date(),
        nextDeliveryDate: new Date()
      });

      // Try to access other user's subscription
      await request(app)
        .get(`/api/subscriptions/${otherSubscription._id}/current-meal`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});