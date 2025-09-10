const DriverAssignment = require('../models/DriverAssignment');
const RecurringSubscription = require('../models/RecurringSubscription');
const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const Customer = require('../models/Customer');
const notificationService = require('./notificationService');

/**
 * Driver Subscription Service
 * Business logic layer for driver subscription delivery management
 * Follows Single Responsibility Principle and clean architecture
 */
class DriverSubscriptionService {

  /**
   * Route Optimization Engine
   * Identifies and optimizes delivery routes for subscription customers
   */
  async optimizeDeliveryRoutes(driverId, dateRange = { days: 1 }) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + dateRange.days);

      // Get all delivery assignments for the driver in the date range
      const deliveryAssignments = await DriverAssignment
        .find({
          driverId,
          estimatedDeliveryTime: { $gte: startDate, $lte: endDate },
          status: { $in: ['assigned', 'picked_up'] }
        })
        .populate('subscriptionInfo.subscriptionId')
        .lean();

      // Group deliveries by area for route optimization
      const areaGroups = new Map();
      const timeSlotGroups = new Map();

      deliveryAssignments.forEach(assignment => {
        const area = assignment.deliveryLocation.area;
        const timeSlot = this.getTimeSlot(assignment.estimatedDeliveryTime);

        // Group by area
        if (!areaGroups.has(area)) {
          areaGroups.set(area, {
            area,
            deliveries: [],
            totalDistance: 0,
            estimatedTimeSaving: 0,
            subscriptionDeliveries: 0
          });
        }
        areaGroups.get(area).deliveries.push(assignment);
        areaGroups.get(area).totalDistance += assignment.totalDistance;
        if (assignment.subscriptionInfo.subscriptionId) {
          areaGroups.get(area).subscriptionDeliveries++;
        }

        // Group by time slot
        const timeAreaKey = `${timeSlot}_${area}`;
        if (!timeSlotGroups.has(timeAreaKey)) {
          timeSlotGroups.set(timeAreaKey, {
            timeSlot,
            area,
            deliveries: [],
            routeEfficiency: 0
          });
        }
        timeSlotGroups.get(timeAreaKey).deliveries.push(assignment);
      });

      // Calculate optimization opportunities
      const routeOptimizations = Array.from(areaGroups.values())
        .filter(group => group.deliveries.length >= 2)
        .map(group => {
          // Calculate time savings (15% reduction for area clustering)
          const individualTravelTime = group.deliveries.reduce((sum, d) => sum + d.estimatedDuration, 0);
          const optimizedTravelTime = individualTravelTime * 0.85; // 15% reduction
          group.estimatedTimeSaving = Math.round(individualTravelTime - optimizedTravelTime);
          
          // Generate optimal route sequence
          group.optimizedSequence = this.generateOptimalSequence(group.deliveries);
          
          // Calculate priority score (subscription deliveries get higher priority)
          group.priorityScore = group.subscriptionDeliveries * 2 + group.deliveries.length;
          
          return group;
        })
        .sort((a, b) => b.priorityScore - a.priorityScore);

      // Identify recurring customer patterns
      const recurringPatterns = await this.analyzeRecurringCustomerPatterns(driverId);

      return {
        totalOptimizations: routeOptimizations.length,
        totalTimeSaving: routeOptimizations.reduce((sum, opt) => sum + opt.estimatedTimeSaving, 0),
        routeOptimizations,
        recurringPatterns,
        recommendations: this.generateRouteRecommendations(routeOptimizations, recurringPatterns)
      };

    } catch (error) {
      console.error('❌ Error optimizing delivery routes:', error);
      throw new Error('Failed to optimize delivery routes');
    }
  }

  /**
   * Customer Relationship Analyzer
   * Analyzes delivery patterns and customer relationships for subscription management
   */
  async analyzeCustomerRelationships(driverId, period = '30d') {
    try {
      const startDate = this.getStartDateForPeriod(period);
      
      // Get all subscription deliveries for the driver
      const subscriptionDeliveries = await DriverAssignment
        .find({
          driverId,
          assignedAt: { $gte: startDate },
          'subscriptionInfo.subscriptionId': { $exists: true }
        })
        .populate('subscriptionInfo.subscriptionId')
        .populate('orderId', 'customer')
        .lean();

      // Group by customer and analyze relationships
      const customerGroups = new Map();

      subscriptionDeliveries.forEach(delivery => {
        const customerId = delivery.orderId.customer.toString();
        if (!customerGroups.has(customerId)) {
          customerGroups.set(customerId, {
            customerId,
            deliveries: [],
            subscriptions: new Set(),
            relationshipMetrics: {
              totalDeliveries: 0,
              onTimeDeliveries: 0,
              avgDeliveryTime: 0,
              consistencyScore: 0,
              lastDelivery: null,
              firstDelivery: null
            }
          });
        }

        const customerData = customerGroups.get(customerId);
        customerData.deliveries.push(delivery);
        customerData.subscriptions.add(delivery.subscriptionInfo.subscriptionId._id.toString());
      });

      // Calculate relationship metrics for each customer
      const customerRelationships = Array.from(customerGroups.values()).map(customer => {
        const deliveries = customer.deliveries.sort((a, b) => new Date(a.estimatedDeliveryTime) - new Date(b.estimatedDeliveryTime));
        
        const totalDeliveries = deliveries.length;
        const onTimeDeliveries = deliveries.filter(d => {
          if (!d.deliveredAt) return false;
          const deliveryTime = new Date(d.deliveredAt);
          const estimatedTime = new Date(d.estimatedDeliveryTime);
          return deliveryTime <= estimatedTime;
        }).length;

        const avgDeliveryTime = deliveries
          .filter(d => d.deliveredAt)
          .reduce((sum, d) => {
            const deliveryTime = new Date(d.deliveredAt);
            const estimatedTime = new Date(d.estimatedDeliveryTime);
            return sum + Math.max(0, deliveryTime - estimatedTime);
          }, 0) / Math.max(totalDeliveries, 1) / (1000 * 60); // Convert to minutes

        const consistencyScore = totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 0;

        customer.relationshipMetrics = {
          totalDeliveries,
          onTimeDeliveries,
          avgDeliveryTime: Math.round(avgDeliveryTime),
          consistencyScore,
          lastDelivery: deliveries[deliveries.length - 1]?.estimatedDeliveryTime,
          firstDelivery: deliveries[0]?.estimatedDeliveryTime,
          relationshipStrength: this.calculateRelationshipStrength(totalDeliveries, consistencyScore),
          subscriptionCount: customer.subscriptions.size
        };

        return customer;
      });

      // Sort by relationship strength
      customerRelationships.sort((a, b) => b.relationshipMetrics.relationshipStrength - a.relationshipMetrics.relationshipStrength);

      return {
        totalCustomers: customerRelationships.length,
        strongRelationships: customerRelationships.filter(c => c.relationshipMetrics.relationshipStrength >= 80).length,
        averageConsistencyScore: Math.round(
          customerRelationships.reduce((sum, c) => sum + c.relationshipMetrics.consistencyScore, 0) / 
          Math.max(customerRelationships.length, 1)
        ),
        customerRelationships: customerRelationships.slice(0, 20), // Top 20 customers
        insights: this.generateCustomerInsights(customerRelationships)
      };

    } catch (error) {
      console.error('❌ Error analyzing customer relationships:', error);
      throw new Error('Failed to analyze customer relationships');
    }
  }

  /**
   * Subscription Performance Analyzer
   * Provides insights into driver's subscription delivery performance
   */
  async analyzeSubscriptionPerformance(driverId, period = '30d') {
    try {
      const startDate = this.getStartDateForPeriod(period);
      
      // Get comprehensive performance data
      const performanceData = await DriverAssignment.aggregate([
        {
          $match: {
            driverId: driverId,
            assignedAt: { $gte: startDate },
            'subscriptionInfo.subscriptionId': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            totalSubscriptionDeliveries: { $sum: 1 },
            completedDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            totalEarnings: { $sum: '$totalEarning' },
            totalDistance: { $sum: '$totalDistance' },
            avgDeliveryTime: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'delivered'] },
                  { $subtract: ['$deliveredAt', '$estimatedDeliveryTime'] },
                  null
                ]
              }
            },
            uniqueSubscriptions: { $addToSet: '$subscriptionInfo.subscriptionId' },
            uniqueCustomers: { $addToSet: '$orderId' }
          }
        }
      ]);

      const data = performanceData[0] || {};

      // Calculate derived metrics
      const completionRate = data.totalSubscriptionDeliveries > 0 
        ? Math.round((data.completedDeliveries / data.totalSubscriptionDeliveries) * 100)
        : 0;

      const avgDeliveryTimeMinutes = data.avgDeliveryTime 
        ? Math.round(data.avgDeliveryTime / (1000 * 60))
        : 0;

      // Generate performance insights
      const insights = {
        performanceScore: this.calculateDriverPerformanceScore(data),
        improvementAreas: this.identifyDriverImprovementAreas(data),
        strengths: this.identifyDriverStrengths(data),
        recommendations: this.generateDriverRecommendations(data),
        trends: await this.analyzeTrends(driverId, period)
      };

      return {
        period,
        metrics: {
          totalSubscriptionDeliveries: data.totalSubscriptionDeliveries || 0,
          completedDeliveries: data.completedDeliveries || 0,
          completionRate,
          totalEarnings: data.totalEarnings || 0,
          totalDistance: data.totalDistance || 0,
          avgDeliveryTimeMinutes,
          uniqueSubscriptions: (data.uniqueSubscriptions || []).length,
          uniqueCustomers: (data.uniqueCustomers || []).length,
          earningsPerDelivery: data.completedDeliveries > 0 
            ? Math.round((data.totalEarnings || 0) / data.completedDeliveries)
            : 0
        },
        insights
      };

    } catch (error) {
      console.error('❌ Error analyzing subscription performance:', error);
      throw new Error('Failed to analyze subscription performance');
    }
  }

  /**
   * Subscription Communication Manager
   * Handles driver-customer communication for subscription deliveries
   */
  async facilitateCustomerCommunication(driverId, assignmentId, messageType, content) {
    try {
      // Validate assignment belongs to driver
      const assignment = await DriverAssignment
        .findOne({
          _id: assignmentId,
          driverId,
          'subscriptionInfo.subscriptionId': { $exists: true }
        })
        .populate('orderId', 'customer')
        .populate('subscriptionInfo.subscriptionId');

      if (!assignment) {
        throw new Error('Subscription assignment not found');
      }

      // Get customer details
      const customer = await Customer.findById(assignment.orderId.customer)
        .select('fullName email phone notificationPreferences');

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Prepare communication based on type
      let communicationData;
      
      switch (messageType) {
        case 'delivery_update':
          communicationData = {
            type: 'delivery_status',
            title: 'Subscription Delivery Update',
            message: content.message,
            assignmentId,
            driverId,
            metadata: {
              estimatedArrival: content.estimatedArrival,
              currentLocation: content.currentLocation,
              subscriptionDelivery: true
            }
          };
          break;
          
        case 'arrival_notification':
          communicationData = {
            type: 'delivery_arrival',
            title: 'Driver Arriving Soon',
            message: content.message || 'Your driver will arrive in a few minutes with your subscription meal.',
            assignmentId,
            driverId,
            metadata: {
              arrivalTime: content.arrivalTime,
              confirmationCode: assignment.confirmationCode,
              subscriptionDelivery: true
            }
          };
          break;
          
        case 'delivery_issue':
          communicationData = {
            type: 'delivery_issue',
            title: 'Subscription Delivery Issue',
            message: content.message,
            assignmentId,
            driverId,
            metadata: {
              issueType: content.issueType,
              resolutionOptions: content.resolutionOptions,
              subscriptionDelivery: true
            }
          };
          break;
          
        default:
          throw new Error('Invalid message type');
      }

      // Send notification through appropriate channels
      const notificationResult = await notificationService.sendDeliveryNotification(
        customer._id,
        communicationData
      );

      // Log communication in assignment record
      const communicationLog = {
        date: new Date(),
        type: messageType,
        from: 'driver',
        to: 'customer',
        subject: communicationData.title,
        message: communicationData.message,
        priority: messageType === 'delivery_issue' ? 'high' : 'normal'
      };

      await DriverAssignment.findByIdAndUpdate(
        assignmentId,
        { $push: { communications: communicationLog } }
      );

      return {
        success: true,
        communicationId: communicationLog.date.getTime().toString(),
        deliveryStatus: notificationResult
      };

    } catch (error) {
      console.error('❌ Error facilitating customer communication:', error);
      throw error;
    }
  }

  // Helper methods

  getTimeSlot(deliveryTime) {
    const hour = new Date(deliveryTime).getHours();
    if (hour < 11) return 'morning';
    if (hour < 15) return 'afternoon';
    return 'evening';
  }

  generateOptimalSequence(deliveries) {
    // Simple optimization based on coordinates
    // In a real implementation, this would use more sophisticated routing algorithms
    return deliveries.sort((a, b) => {
      const aLat = a.deliveryLocation.coordinates[1];
      const aLng = a.deliveryLocation.coordinates[0];
      const bLat = b.deliveryLocation.coordinates[1];
      const bLng = b.deliveryLocation.coordinates[0];
      
      // Sort by latitude first, then longitude
      return aLat - bLat || aLng - bLng;
    }).map((delivery, index) => ({
      sequenceNumber: index + 1,
      assignmentId: delivery._id,
      address: delivery.deliveryLocation.address,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime,
      isSubscription: !!delivery.subscriptionInfo.subscriptionId
    }));
  }

  async analyzeRecurringCustomerPatterns(driverId) {
    // Get recurring delivery patterns over the last 60 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const recurringDeliveries = await DriverAssignment
      .find({
        driverId,
        assignedAt: { $gte: startDate },
        'subscriptionInfo.subscriptionId': { $exists: true }
      })
      .populate('subscriptionInfo.subscriptionId', 'frequency')
      .lean();

    const patterns = {};
    recurringDeliveries.forEach(delivery => {
      const day = new Date(delivery.estimatedDeliveryTime).getDay();
      const area = delivery.deliveryLocation.area;
      const key = `${day}_${area}`;
      
      if (!patterns[key]) {
        patterns[key] = {
          dayOfWeek: day,
          area,
          deliveries: [],
          frequency: 0
        };
      }
      patterns[key].deliveries.push(delivery);
      patterns[key].frequency++;
    });

    return Object.values(patterns)
      .filter(pattern => pattern.frequency >= 3)
      .sort((a, b) => b.frequency - a.frequency);
  }

  generateRouteRecommendations(optimizations, patterns) {
    const recommendations = [];

    // Route clustering recommendations
    optimizations.forEach(opt => {
      if (opt.estimatedTimeSaving > 30) {
        recommendations.push({
          type: 'route_clustering',
          priority: 'high',
          message: `Cluster ${opt.deliveries.length} deliveries in ${opt.area} to save ${opt.estimatedTimeSaving} minutes`,
          action: 'Group deliveries by area and optimize sequence',
          impact: `${opt.estimatedTimeSaving} minutes saved`
        });
      }
    });

    // Recurring pattern recommendations
    patterns.forEach(pattern => {
      if (pattern.frequency >= 5) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeek];
        recommendations.push({
          type: 'recurring_pattern',
          priority: 'medium',
          message: `Regular pattern: ${pattern.frequency} recurring deliveries on ${dayName}s in ${pattern.area}`,
          action: 'Plan recurring route optimization for this pattern',
          impact: 'Improved customer relationships and efficiency'
        });
      }
    });

    return recommendations;
  }

  calculateRelationshipStrength(totalDeliveries, consistencyScore) {
    // Relationship strength based on delivery count and consistency
    const deliveryScore = Math.min(totalDeliveries * 10, 50); // Max 50 points for deliveries
    const consistencyWeight = consistencyScore * 0.5; // Max 50 points for consistency
    return Math.round(deliveryScore + consistencyWeight);
  }

  generateCustomerInsights(customerRelationships) {
    const insights = {
      topCustomers: customerRelationships.slice(0, 5).map(c => ({
        customerId: c.customerId,
        totalDeliveries: c.relationshipMetrics.totalDeliveries,
        consistencyScore: c.relationshipMetrics.consistencyScore,
        relationshipStrength: c.relationshipMetrics.relationshipStrength
      })),
      improvementOpportunities: customerRelationships
        .filter(c => c.relationshipMetrics.consistencyScore < 80 && c.relationshipMetrics.totalDeliveries >= 3)
        .slice(0, 3)
        .map(c => ({
          customerId: c.customerId,
          currentScore: c.relationshipMetrics.consistencyScore,
          totalDeliveries: c.relationshipMetrics.totalDeliveries,
          suggestion: 'Focus on consistent delivery timing to improve relationship'
        }))
    };

    return insights;
  }

  calculateDriverPerformanceScore(data) {
    const completionRate = data.totalSubscriptionDeliveries > 0 
      ? (data.completedDeliveries / data.totalSubscriptionDeliveries) * 100
      : 100;
    
    const timelinessScore = data.avgDeliveryTime ? Math.max(0, 100 - (data.avgDeliveryTime / (1000 * 60 * 10)) * 100) : 100;
    
    return Math.round((completionRate * 0.6) + (timelinessScore * 0.4));
  }

  identifyDriverImprovementAreas(data) {
    const areas = [];
    
    const completionRate = data.totalSubscriptionDeliveries > 0 
      ? (data.completedDeliveries / data.totalSubscriptionDeliveries) * 100
      : 100;
    
    if (completionRate < 90) areas.push('completion_rate');
    if (data.avgDeliveryTime && data.avgDeliveryTime > 10 * 60 * 1000) areas.push('delivery_timing');
    if ((data.uniqueCustomers || []).length < 5) areas.push('customer_coverage');
    
    return areas;
  }

  identifyDriverStrengths(data) {
    const strengths = [];
    
    const completionRate = data.totalSubscriptionDeliveries > 0 
      ? (data.completedDeliveries / data.totalSubscriptionDeliveries) * 100
      : 100;
    
    if (completionRate >= 95) strengths.push('high_completion_rate');
    if (data.avgDeliveryTime && data.avgDeliveryTime <= 5 * 60 * 1000) strengths.push('punctual_delivery');
    if ((data.uniqueCustomers || []).length >= 10) strengths.push('broad_customer_base');
    if ((data.totalEarnings || 0) > 50000) strengths.push('high_earnings');
    
    return strengths;
  }

  generateDriverRecommendations(data) {
    const recommendations = [];
    const improvementAreas = this.identifyDriverImprovementAreas(data);
    
    improvementAreas.forEach(area => {
      switch (area) {
        case 'completion_rate':
          recommendations.push({
            category: 'completion',
            priority: 'high',
            action: 'Focus on accepting and completing all assigned subscription deliveries',
            expectedImpact: 'Improve customer satisfaction and earnings'
          });
          break;
        case 'delivery_timing':
          recommendations.push({
            category: 'timing',
            priority: 'high',
            action: 'Use route optimization and leave earlier for deliveries',
            expectedImpact: 'Reduce average delivery delay by 5-10 minutes'
          });
          break;
        case 'customer_coverage':
          recommendations.push({
            category: 'coverage',
            priority: 'medium',
            action: 'Accept deliveries in different areas to build broader customer base',
            expectedImpact: 'Increase earning potential and customer relationships'
          });
          break;
      }
    });
    
    return recommendations;
  }

  async analyzeTrends(driverId, period) {
    // Simplified trend analysis - would compare with previous period
    return {
      performanceChange: '+5%',
      earningsChange: '+15%',
      customerSatisfactionChange: '+8%',
      efficiencyChange: '+12%'
    };
  }

  getStartDateForPeriod(period) {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return startDate;
  }
}

module.exports = new DriverSubscriptionService();