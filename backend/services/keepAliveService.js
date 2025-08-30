const https = require('https');
const http = require('http');

class KeepAliveService {
  constructor() {
    this.pingInterval = null;
    this.pingUrl = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_URL;
    this.pingFrequency = 10 * 60 * 1000; // 10 minutes (before 15min sleep)
    this.isEnabled = process.env.NODE_ENV === 'production' && !!this.pingUrl;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
  }

  start() {
    if (!this.isEnabled) {
      console.log('⏭️ Keep-alive service disabled (not in production or no URL)');
      return;
    }

    console.log(`🔄 Starting keep-alive service for: ${this.pingUrl}`);
    console.log(`📡 Ping frequency: ${this.pingFrequency / 1000 / 60} minutes`);
    
    // Initial ping after 1 minute
    setTimeout(() => this.ping(), 60000);
    
    // Set up regular interval
    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.pingFrequency);
  }

  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('🛑 Keep-alive service stopped');
    }
  }

  ping() {
    const pingEndpoint = `${this.pingUrl}/health`;
    const protocol = pingEndpoint.startsWith('https:') ? https : http;
    
    console.log(`📡 Pinging: ${pingEndpoint}`);
    
    const startTime = Date.now();
    const req = protocol.get(pingEndpoint, {
      timeout: 30000 // 30 second timeout
    }, (res) => {
      const responseTime = Date.now() - startTime;
      
      if (res.statusCode === 200) {
        console.log(`✅ Ping successful - ${responseTime}ms - Status: ${res.statusCode}`);
        this.consecutiveFailures = 0;
        
        // Log response time for monitoring
        if (responseTime > 5000) {
          console.log(`⚠️ Slow response detected: ${responseTime}ms`);
        }
      } else {
        this.handlePingFailure(`HTTP ${res.statusCode}`, responseTime);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      this.handlePingFailure('Timeout (>30s)', Date.now() - startTime);
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      this.handlePingFailure(error.message, responseTime);
    });
  }

  handlePingFailure(reason, responseTime) {
    this.consecutiveFailures++;
    console.log(`❌ Ping failed - ${responseTime}ms - Reason: ${reason}`);
    console.log(`🔄 Consecutive failures: ${this.consecutiveFailures}/${this.maxFailures}`);
    
    if (this.consecutiveFailures >= this.maxFailures) {
      console.log(`🚨 Max failures reached. Service might be down. Continuing to ping...`);
      // Could add notification service here (email, Slack, etc.)
    }
  }

  // Health check for the keep-alive service itself
  getStatus() {
    return {
      enabled: this.isEnabled,
      pingUrl: this.pingUrl,
      frequency: `${this.pingFrequency / 1000 / 60} minutes`,
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.maxFailures,
      isRunning: !!this.pingInterval
    };
  }
}

// Singleton instance
const keepAliveService = new KeepAliveService();

// Graceful shutdown
process.on('SIGTERM', () => {
  keepAliveService.stop();
});

process.on('SIGINT', () => {
  keepAliveService.stop();
});

module.exports = keepAliveService;