const SubscriptionDelivery = require('../models/SubscriptionDelivery');
const RecurringSubscription = require('../models/RecurringSubscription');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const notificationService = require('./notificationService');

/**
 * Monitoring Service for Subscription Management
 * Tracks performance, errors, and system health
 */
class MonitoringService {

  constructor() {
    this.metrics = {
      errors: [],
      performance: {},
      alerts: [],
      systemHealth: {}
    };
    this.alertThresholds = {
      deliveryFailureRate: 0.05, // 5%
      averageDeliveryDelay: 30, // 30 minutes
      chefUtilization: 0.9, // 90%
      driverUtilization: 0.9, // 90%
      subscriptionChurnRate: 0.1 // 10%
    };
  }

  /**
   * Log and track subscription management errors
   */
  logError(error, context = {}) {
    const errorLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message: error.message || error,
      stack: error.stack,
      context,
      severity: this.categorizeError(error, context),
      resolved: false
    };

    this.metrics.errors.push(errorLog);

    // Keep only last 1000 errors in memory
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-1000);
    }

    console.error('🚨 Subscription Management Error:', {
      id: errorLog.id,
      message: errorLog.message,
      severity: errorLog.severity,
      context: errorLog.context
    });

    // Auto-escalate high severity errors
    if (errorLog.severity === 'high' || errorLog.severity === 'critical') {
      this.escalateError(errorLog);
    }

    return errorLog.id;
  }

  /**
   * Categorize error severity
   */
  categorizeError(error, context) {
    const message = error.message?.toLowerCase() || '';
    const { operation, subscriptionId, deliveryId } = context;

    // Critical: System-wide failures
    if (message.includes('database') || message.includes('connection')) {
      return 'critical';
    }

    // High: Customer-facing failures
    if (operation === 'delivery_creation' || operation === 'delivery_status_update') {
      return 'high';
    }

    if (message.includes('payment') || message.includes('chef assignment')) {
      return 'high';
    }

    // Medium: Operational issues
    if (operation === 'driver_assignment' || operation === 'notification') {
      return 'medium';
    }

    // Low: Non-critical issues
    return 'low';
  }

  /**
   * Escalate high severity errors
   */
  async escalateError(errorLog) {
    console.log(`🆘 Escalating ${errorLog.severity} error: ${errorLog.id}`);
    
    try {
      // Send to admin dashboard
      // Send email/SMS alerts
      // Create incident ticket
      // For now, just log
      
      const alert = {
        id: Date.now().toString(),
        type: 'error_escalation',
        severity: errorLog.severity,
        errorId: errorLog.id,
        message: `${errorLog.severity.toUpperCase()}: ${errorLog.message}`,
        timestamp: new Date(),
        acknowledged: false
      };

      this.metrics.alerts.push(alert);
      
      // Would integrate with actual alerting system
      console.log('📧 Alert sent to admin team');
      
    } catch (escalationError) {
      console.error('❌ Failed to escalate error:', escalationError);
    }
  }

  /**
   * Monitor delivery performance metrics
   */
  async monitorDeliveryPerformance() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get delivery metrics for last 24 hours
      const deliveries = await SubscriptionDelivery.find({
        scheduledDate: { $gte: last24Hours, $lte: now }
      });

      const metrics = {
        total: deliveries.length,
        completed: deliveries.filter(d => d.status === 'delivered').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        overdue: deliveries.filter(d => d.isOverdue).length,
        onTime: deliveries.filter(d => d.metrics?.onTimeDelivery).length
      };

      metrics.completionRate = metrics.total > 0 ? metrics.completed / metrics.total : 0;
      metrics.failureRate = metrics.total > 0 ? metrics.failed / metrics.total : 0;
      metrics.onTimeRate = metrics.completed > 0 ? metrics.onTime / metrics.completed : 0;

      // Calculate average delay
      const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
      const totalDelay = completedDeliveries.reduce((sum, delivery) => {
        const scheduled = new Date(delivery.scheduledDate);
        const delivered = new Date(delivery.driverAssignment?.deliveredAt);
        return sum + Math.max(0, delivered.getTime() - scheduled.getTime());
      }, 0);

      metrics.averageDelayMinutes = completedDeliveries.length > 0 
        ? totalDelay / (completedDeliveries.length * 60 * 1000) 
        : 0;

      this.metrics.performance.delivery = {
        ...metrics,
        timestamp: now,
        period: '24h'
      };

      // Check thresholds and create alerts
      await this.checkDeliveryThresholds(metrics);

      return metrics;

    } catch (error) {
      this.logError(error, { operation: 'delivery_performance_monitoring' });
      return null;
    }
  }

  /**
   * Monitor subscription health
   */
  async monitorSubscriptionHealth() {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Active subscriptions
      const activeSubscriptions = await RecurringSubscription.countDocuments({
        status: 'active'
      });

      // New subscriptions in last 30 days
      const newSubscriptions = await RecurringSubscription.countDocuments({
        createdAt: { $gte: last30Days }
      });

      // Cancelled subscriptions in last 30 days
      const cancelledSubscriptions = await RecurringSubscription.countDocuments({
        status: 'cancelled',
        cancelledAt: { $gte: last30Days }
      });

      // Calculate churn rate
      const totalSubscriptionsStart = await RecurringSubscription.countDocuments({
        createdAt: { $lt: last30Days },
        $or: [
          { status: { $ne: 'cancelled' } },
          { cancelledAt: { $gte: last30Days } }
        ]
      });

      const churnRate = totalSubscriptionsStart > 0 
        ? cancelledSubscriptions / totalSubscriptionsStart 
        : 0;

      // Subscriptions at risk (poor delivery performance)
      const atRiskSubscriptions = await RecurringSubscription.countDocuments({
        status: 'active',
        'metrics.consecutiveDeliveryDays': 0,
        'metrics.totalMealsMissed': { $gte: 3 }
      });

      const metrics = {
        active: activeSubscriptions,
        new: newSubscriptions,
        cancelled: cancelledSubscriptions,
        churnRate,
        atRisk: atRiskSubscriptions,
        netGrowth: newSubscriptions - cancelledSubscriptions
      };

      this.metrics.performance.subscription = {
        ...metrics,
        timestamp: now,
        period: '30d'
      };

      // Check thresholds
      await this.checkSubscriptionThresholds(metrics);

      return metrics;

    } catch (error) {
      this.logError(error, { operation: 'subscription_health_monitoring' });
      return null;
    }
  }

  /**
   * Monitor chef and driver utilization
   */
  async monitorResourceUtilization() {
    try {
      // Chef utilization
      const chefAssignments = await SubscriptionChefAssignment.find({
        assignmentStatus: 'active'
      }).populate('chefId', 'maxSubscriptions');

      const chefMetrics = chefAssignments.reduce((acc, assignment) => {
        const chefId = assignment.chefId._id.toString();
        if (!acc[chefId]) {
          acc[chefId] = {
            assignments: 0,
            maxCapacity: assignment.chefId.maxSubscriptions || 10,
            utilization: 0
          };
        }
        acc[chefId].assignments++;
        acc[chefId].utilization = acc[chefId].assignments / acc[chefId].maxCapacity;
        return acc;
      }, {});

      const totalChefs = Object.keys(chefMetrics).length;
      const overutilizedChefs = Object.values(chefMetrics)
        .filter(chef => chef.utilization > this.alertThresholds.chefUtilization).length;

      const avgChefUtilization = totalChefs > 0 
        ? Object.values(chefMetrics)
            .reduce((sum, chef) => sum + chef.utilization, 0) / totalChefs
        : 0;

      // Driver utilization would be calculated similarly
      // For now, using placeholder values

      const metrics = {
        chef: {
          total: totalChefs,
          averageUtilization: avgChefUtilization,
          overutilized: overutilizedChefs,
          overutilizationRate: totalChefs > 0 ? overutilizedChefs / totalChefs : 0
        },
        driver: {
          total: 0, // Would calculate actual driver metrics
          averageUtilization: 0,
          overutilized: 0,
          overutilizationRate: 0
        }
      };

      this.metrics.performance.resource = {
        ...metrics,
        timestamp: new Date(),
        period: 'current'
      };

      // Check thresholds
      await this.checkResourceThresholds(metrics);

      return metrics;

    } catch (error) {
      this.logError(error, { operation: 'resource_utilization_monitoring' });
      return null;
    }
  }

  /**
   * Check delivery performance thresholds
   */
  async checkDeliveryThresholds(metrics) {
    const alerts = [];

    if (metrics.failureRate > this.alertThresholds.deliveryFailureRate) {
      alerts.push({
        type: 'delivery_failure_rate',
        severity: 'high',
        message: `Delivery failure rate (${(metrics.failureRate * 100).toFixed(1)}%) exceeds threshold`,
        value: metrics.failureRate,
        threshold: this.alertThresholds.deliveryFailureRate
      });
    }

    if (metrics.averageDelayMinutes > this.alertThresholds.averageDeliveryDelay) {
      alerts.push({
        type: 'delivery_delay',
        severity: 'medium',
        message: `Average delivery delay (${metrics.averageDelayMinutes.toFixed(1)}min) exceeds threshold`,
        value: metrics.averageDelayMinutes,
        threshold: this.alertThresholds.averageDeliveryDelay
      });
    }

    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  /**
   * Check subscription health thresholds
   */
  async checkSubscriptionThresholds(metrics) {
    const alerts = [];

    if (metrics.churnRate > this.alertThresholds.subscriptionChurnRate) {
      alerts.push({
        type: 'subscription_churn',
        severity: 'high',
        message: `Subscription churn rate (${(metrics.churnRate * 100).toFixed(1)}%) exceeds threshold`,
        value: metrics.churnRate,
        threshold: this.alertThresholds.subscriptionChurnRate
      });
    }

    if (metrics.atRisk > metrics.active * 0.2) { // More than 20% at risk
      alerts.push({
        type: 'subscriptions_at_risk',
        severity: 'medium',
        message: `High number of at-risk subscriptions: ${metrics.atRisk}`,
        value: metrics.atRisk,
        threshold: metrics.active * 0.2
      });
    }

    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  /**
   * Check resource utilization thresholds
   */
  async checkResourceThresholds(metrics) {
    const alerts = [];

    if (metrics.chef.averageUtilization > this.alertThresholds.chefUtilization) {
      alerts.push({
        type: 'chef_overutilization',
        severity: 'medium',
        message: `Average chef utilization (${(metrics.chef.averageUtilization * 100).toFixed(1)}%) exceeds threshold`,
        value: metrics.chef.averageUtilization,
        threshold: this.alertThresholds.chefUtilization
      });
    }

    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  /**
   * Create an alert
   */
  async createAlert(alertData) {
    const alert = {
      id: Date.now().toString(),
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };

    this.metrics.alerts.push(alert);

    // Keep only last 500 alerts
    if (this.metrics.alerts.length > 500) {
      this.metrics.alerts = this.metrics.alerts.slice(-500);
    }

    console.log(`🚨 Alert created: ${alert.type} - ${alert.message}`);

    // Send notification for high severity alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      await this.sendAlertNotification(alert);
    }

    return alert.id;
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      // Would integrate with actual notification service
      console.log(`📧 Sending alert notification: ${alert.type}`);
      
      // Example: Send to admin team
      // await notificationService.sendToAdmins({
      //   title: `${alert.severity.toUpperCase()} Alert: ${alert.type}`,
      //   body: alert.message,
      //   priority: alert.severity
      // });
      
    } catch (error) {
      console.error('❌ Failed to send alert notification:', error);
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth() {
    try {
      // Run all monitoring checks
      const [deliveryMetrics, subscriptionMetrics, resourceMetrics] = await Promise.all([
        this.monitorDeliveryPerformance(),
        this.monitorSubscriptionHealth(),
        this.monitorResourceUtilization()
      ]);

      // Calculate overall health score
      let healthScore = 100;

      // Reduce score based on issues
      if (deliveryMetrics?.failureRate > this.alertThresholds.deliveryFailureRate) {
        healthScore -= 20;
      }
      if (subscriptionMetrics?.churnRate > this.alertThresholds.subscriptionChurnRate) {
        healthScore -= 15;
      }
      if (resourceMetrics?.chef.averageUtilization > this.alertThresholds.chefUtilization) {
        healthScore -= 10;
      }

      // Factor in recent errors
      const recentErrors = this.getRecentErrors(1); // Last 1 hour
      const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
      const highErrors = recentErrors.filter(e => e.severity === 'high').length;

      healthScore -= (criticalErrors * 10) + (highErrors * 5);
      healthScore = Math.max(0, healthScore);

      let status = 'healthy';
      if (healthScore < 50) status = 'critical';
      else if (healthScore < 70) status = 'degraded';
      else if (healthScore < 90) status = 'warning';

      const systemHealth = {
        status,
        score: healthScore,
        timestamp: new Date(),
        metrics: {
          delivery: deliveryMetrics,
          subscription: subscriptionMetrics,
          resource: resourceMetrics
        },
        recentErrors: recentErrors.length,
        activeAlerts: this.metrics.alerts.filter(a => !a.acknowledged).length
      };

      this.metrics.systemHealth = systemHealth;

      return systemHealth;

    } catch (error) {
      this.logError(error, { operation: 'system_health_check' });
      return {
        status: 'error',
        score: 0,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Get recent errors within specified hours
   */
  getRecentErrors(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.errors.filter(error => error.timestamp >= cutoff);
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(days = 7) {
    // This would analyze historical data to show trends
    // For now, return current metrics
    return {
      delivery: this.metrics.performance.delivery,
      subscription: this.metrics.performance.subscription,
      resource: this.metrics.performance.resource,
      period: `${days}d`,
      trends: {
        delivery: 'stable', // Would calculate actual trends
        subscription: 'stable',
        resource: 'stable'
      }
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      console.log(`✅ Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      return true;
    }
    return false;
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    return {
      systemHealth: this.metrics.systemHealth,
      recentErrors: this.getRecentErrors(1), // Last hour
      activeAlerts: this.metrics.alerts.filter(a => !a.acknowledged),
      performance: this.metrics.performance,
      errorSummary: {
        total: this.metrics.errors.length,
        critical: this.metrics.errors.filter(e => e.severity === 'critical').length,
        high: this.metrics.errors.filter(e => e.severity === 'high').length,
        resolved: this.metrics.errors.filter(e => e.resolved).length
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Clear old data
   */
  cleanup() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    // Remove old errors
    this.metrics.errors = this.metrics.errors.filter(error => error.timestamp >= cutoff);

    // Remove acknowledged alerts older than 24 hours
    const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics.alerts = this.metrics.alerts.filter(alert => 
      !alert.acknowledged || alert.acknowledgedAt >= alertCutoff
    );

    console.log('🧹 Monitoring data cleanup completed');
  }
}

module.exports = new MonitoringService();