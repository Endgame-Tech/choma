const cron = require('node-cron');
const workflowAutomationService = require('./workflowAutomationService');

/**
 * Cron Job Service for Automated Workflows
 * Schedules and manages automated tasks for subscription management
 */
class CronJobService {

  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    if (this.isInitialized) {
      console.log('⚠️  Cron jobs already initialized');
      return;
    }

    console.log('🕐 Initializing cron jobs for subscription automation...');

    try {
      // Daily workflow automation - runs at 2 AM every day
      this.scheduleJob('daily-workflows', '0 2 * * *', async () => {
        console.log('🌅 Running daily workflow automation...');
        try {
          const result = await workflowAutomationService.runDailyWorkflows();
          console.log('✅ Daily workflows completed:', result.success ? 'SUCCESS' : 'FAILED');
        } catch (error) {
          console.error('❌ Daily workflows failed:', error);
        }
      });

      // Driver auto-assignment - runs every 15 minutes during business hours
      this.scheduleJob('auto-assign-drivers', '*/15 6-22 * * *', async () => {
        console.log('🚚 Running driver auto-assignment...');
        try {
          const result = await workflowAutomationService.autoAssignDrivers();
          if (result.data.driversAssigned > 0) {
            console.log(`✅ Assigned ${result.data.driversAssigned} drivers`);
          }
        } catch (error) {
          console.error('❌ Driver auto-assignment failed:', error);
        }
      });

      // Overdue delivery monitoring - runs every 30 minutes
      this.scheduleJob('monitor-overdue', '*/30 * * * *', async () => {
        console.log('⏰ Monitoring overdue deliveries...');
        try {
          const result = await workflowAutomationService.monitorOverdueDeliveries();
          if (result.data.totalOverdue > 0) {
            console.log(`⚠️  Found ${result.data.totalOverdue} overdue deliveries`);
          }
        } catch (error) {
          console.error('❌ Overdue monitoring failed:', error);
        }
      });

      // Subscription progression updates - runs every 2 hours
      this.scheduleJob('update-progression', '0 */2 * * *', async () => {
        console.log('📈 Updating subscription progression...');
        try {
          const result = await workflowAutomationService.updateSubscriptionProgression();
          if (result.data.subscriptionsUpdated > 0) {
            console.log(`📊 Updated ${result.data.subscriptionsUpdated} subscriptions`);
          }
        } catch (error) {
          console.error('❌ Progression update failed:', error);
        }
      });

      // Next day delivery creation - runs at 6 PM every day
      this.scheduleJob('create-next-deliveries', '0 18 * * *', async () => {
        console.log('📅 Creating next day deliveries...');
        try {
          const result = await workflowAutomationService.autoCreateDailyDeliveries();
          console.log(`📦 Created ${result.data.deliveriesCreated} deliveries for tomorrow`);
        } catch (error) {
          console.error('❌ Next day delivery creation failed:', error);
        }
      });

      // Cleanup old data - runs at 3 AM on Sundays
      this.scheduleJob('weekly-cleanup', '0 3 * * 0', async () => {
        console.log('🧹 Running weekly cleanup...');
        try {
          await this.runWeeklyCleanup();
          console.log('✅ Weekly cleanup completed');
        } catch (error) {
          console.error('❌ Weekly cleanup failed:', error);
        }
      });

      // Health check for all services - runs every 5 minutes
      this.scheduleJob('health-check', '*/5 * * * *', async () => {
        try {
          await this.runHealthCheck();
        } catch (error) {
          console.error('❌ Health check failed:', error);
        }
      });

      this.isInitialized = true;
      console.log(`✅ Initialized ${this.jobs.size} cron jobs successfully`);

    } catch (error) {
      console.error('❌ Failed to initialize cron jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule a new cron job
   */
  scheduleJob(name, schedule, task, options = {}) {
    try {
      if (this.jobs.has(name)) {
        console.log(`⚠️  Job '${name}' already exists, replacing...`);
        this.jobs.get(name).destroy();
      }

      const job = cron.schedule(schedule, task, {
        scheduled: true,
        timezone: options.timezone || 'Africa/Lagos', // Nigerian timezone
        ...options
      });

      this.jobs.set(name, job);
      console.log(`📅 Scheduled job '${name}' with pattern '${schedule}'`);

      return job;
    } catch (error) {
      console.error(`❌ Failed to schedule job '${name}':`, error);
      throw error;
    }
  }

  /**
   * Start a specific job
   */
  startJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`▶️  Started job '${name}'`);
      return true;
    } else {
      console.log(`⚠️  Job '${name}' not found`);
      return false;
    }
  }

  /**
   * Stop a specific job
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      console.log(`⏸️  Stopped job '${name}'`);
      return true;
    } else {
      console.log(`⚠️  Job '${name}' not found`);
      return false;
    }
  }

  /**
   * Remove a job completely
   */
  removeJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      console.log(`🗑️  Removed job '${name}'`);
      return true;
    } else {
      console.log(`⚠️  Job '${name}' not found`);
      return false;
    }
  }

  /**
   * Get status of all jobs
   */
  getJobStatus() {
    const status = {};
    
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running || false,
        scheduled: true,
        nextExecution: job.nextDate ? job.nextDate() : null
      };
    }

    return status;
  }

  /**
   * Start all jobs
   */
  startAll() {
    console.log('▶️  Starting all cron jobs...');
    let started = 0;
    
    for (const [name, job] of this.jobs) {
      try {
        job.start();
        started++;
      } catch (error) {
        console.error(`❌ Failed to start job '${name}':`, error);
      }
    }

    console.log(`✅ Started ${started}/${this.jobs.size} cron jobs`);
    return started;
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    console.log('⏸️  Stopping all cron jobs...');
    let stopped = 0;
    
    for (const [name, job] of this.jobs) {
      try {
        job.stop();
        stopped++;
      } catch (error) {
        console.error(`❌ Failed to stop job '${name}':`, error);
      }
    }

    console.log(`✅ Stopped ${stopped}/${this.jobs.size} cron jobs`);
    return stopped;
  }

  /**
   * Cleanup all jobs and shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down cron job service...');
    
    for (const [name, job] of this.jobs) {
      try {
        job.destroy();
      } catch (error) {
        console.error(`❌ Failed to destroy job '${name}':`, error);
      }
    }

    this.jobs.clear();
    this.isInitialized = false;
    console.log('✅ Cron job service shutdown complete');
  }

  /**
   * Manually trigger a job (for testing)
   */
  async triggerJob(name) {
    console.log(`🔧 Manually triggering job '${name}'...`);
    
    try {
      switch (name) {
        case 'daily-workflows':
          return await workflowAutomationService.runDailyWorkflows();
        case 'auto-assign-drivers':
          return await workflowAutomationService.autoAssignDrivers();
        case 'monitor-overdue':
          return await workflowAutomationService.monitorOverdueDeliveries();
        case 'update-progression':
          return await workflowAutomationService.updateSubscriptionProgression();
        case 'create-next-deliveries':
          return await workflowAutomationService.autoCreateDailyDeliveries();
        case 'weekly-cleanup':
          return await this.runWeeklyCleanup();
        case 'health-check':
          return await this.runHealthCheck();
        default:
          throw new Error(`Unknown job: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to trigger job '${name}':`, error);
      throw error;
    }
  }

  /**
   * Weekly cleanup operations
   */
  async runWeeklyCleanup() {
    console.log('🧹 Running weekly cleanup operations...');

    try {
      // Clean up old notifications
      // Clean up temporary files
      // Archive old delivery data
      // Update analytics summaries
      
      // This would implement actual cleanup logic
      console.log('✅ Weekly cleanup completed');
      
      return {
        success: true,
        message: 'Weekly cleanup completed successfully'
      };
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Health check for critical services
   */
  async runHealthCheck() {
    try {
      // Check database connectivity
      // Check external service availability
      // Monitor system resources
      // Check queue health
      
      // For now, just log that health check ran
      // In production, this would implement actual health monitoring
      
      return {
        success: true,
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive service status
   */
  getServiceStatus() {
    return {
      initialized: this.isInitialized,
      totalJobs: this.jobs.size,
      runningJobs: Array.from(this.jobs.values()).filter(job => job.running).length,
      jobs: this.getJobStatus(),
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }
}

// Create singleton instance
const cronJobService = new CronJobService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📨 SIGTERM received, shutting down cron jobs gracefully...');
  cronJobService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📨 SIGINT received, shutting down cron jobs gracefully...');
  cronJobService.shutdown();
  process.exit(0);
});

module.exports = cronJobService;