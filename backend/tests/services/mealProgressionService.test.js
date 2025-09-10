const MealProgressionService = require('../../services/mealProgressionService');
const RecurringSubscription = require('../../models/RecurringSubscription');
const MealAssignment = require('../../models/MealAssignment');
const MealPlan = require('../../models/MealPlan');
const Customer = require('../../models/Customer');
const Chef = require('../../models/Chef');

describe('MealProgressionService', () => {
  let service;
  let testUser, testChef, testMealPlan, testSubscription;

  beforeEach(async () => {
    service = new MealProgressionService();

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
  });

  describe('processSubscriptionMealProgression', () => {
    it('should create meal assignment for active subscription', async () => {
      const result = await service.processSubscriptionMealProgression(testSubscription._id);

      expect(result.success).toBe(true);
      expect(result.mealAssignment).toBeDefined();

      // Verify meal assignment was created
      const assignment = await MealAssignment.findOne({ subscriptionId: testSubscription._id });
      expect(assignment).toBeTruthy();
      expect(assignment.status).toBe('scheduled');
    });

    it('should not process inactive subscription', async () => {
      // Update subscription to inactive
      await RecurringSubscription.findByIdAndUpdate(testSubscription._id, { status: 'cancelled' });

      const result = await service.processSubscriptionMealProgression(testSubscription._id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not active');
    });
  });

  describe('assignChefToMeal', () => {
    it('should assign chef to meal assignment', async () => {
      // Create a meal assignment first
      const assignment = await MealAssignment.create({
        subscriptionId: testSubscription._id,
        scheduledDate: new Date(),
        status: 'scheduled'
      });

      const result = await service.assignChefToMeal(assignment._id, testChef._id);

      expect(result.success).toBe(true);
      
      // Verify assignment was updated
      const updatedAssignment = await MealAssignment.findById(assignment._id);
      expect(updatedAssignment.assignedChef.toString()).toBe(testChef._id.toString());
      expect(updatedAssignment.status).toBe('chef_assigned');
    });

    it('should handle invalid chef assignment', async () => {
      const assignment = await MealAssignment.create({
        subscriptionId: testSubscription._id,
        scheduledDate: new Date(),
        status: 'scheduled'
      });

      const fakeChefId = new require('mongoose').Types.ObjectId();
      const result = await service.assignChefToMeal(assignment._id, fakeChefId);

      expect(result.success).toBe(false);
    });
  });

  describe('getCurrentMealForSubscription', () => {
    it('should return current meal assignment', async () => {
      // Create a meal assignment
      const assignment = await MealAssignment.create({
        subscriptionId: testSubscription._id,
        scheduledDate: new Date(),
        status: 'preparing',
        assignedChef: testChef._id
      });

      const result = await service.getCurrentMealForSubscription(testSubscription._id);

      expect(result.success).toBe(true);
      expect(result.mealAssignment).toBeDefined();
      expect(result.mealAssignment._id.toString()).toBe(assignment._id.toString());
    });

    it('should return null for subscription without current meal', async () => {
      const result = await service.getCurrentMealForSubscription(testSubscription._id);

      expect(result.success).toBe(true);
      expect(result.mealAssignment).toBeNull();
    });
  });

  describe('getSubscriptionMealTimeline', () => {
    it('should return meal progression timeline', async () => {
      // Create multiple meal assignments with different statuses
      await MealAssignment.create([
        {
          subscriptionId: testSubscription._id,
          scheduledDate: new Date(Date.now() - 86400000), // Yesterday
          status: 'delivered',
          assignedChef: testChef._id
        },
        {
          subscriptionId: testSubscription._id,
          scheduledDate: new Date(),
          status: 'preparing',
          assignedChef: testChef._id
        }
      ]);

      const result = await service.getSubscriptionMealTimeline(testSubscription._id);

      expect(result.success).toBe(true);
      expect(result.timeline).toBeDefined();
      expect(result.timeline.length).toBe(2);
    });
  });

  describe('formatMealResponse', () => {
    it('should format meal response correctly', async () => {
      const assignment = await MealAssignment.create({
        subscriptionId: testSubscription._id,
        scheduledDate: new Date(),
        status: 'scheduled'
      });

      const subscription = await RecurringSubscription.findById(testSubscription._id)
        .populate('mealPlanId');

      const result = await service.formatMealResponse(assignment, subscription);

      expect(result).toBeDefined();
      expect(result.id).toBe(assignment._id.toString());
      expect(result.status).toBe('scheduled');
      expect(result.subscription).toBeDefined();
      expect(result.mealPlan).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error by using invalid ObjectId
      const invalidId = 'invalid-id';

      const result = await service.processSubscriptionMealProgression(invalidId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing subscription', async () => {
      const fakeId = new require('mongoose').Types.ObjectId();
      
      const result = await service.processSubscriptionMealProgression(fakeId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});