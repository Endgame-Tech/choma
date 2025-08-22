#!/usr/bin/env node

/**
 * External Ping Service for Render Keep-Alive
 * Run this on any server, local machine, or cron job to keep your Render service awake
 */

const https = require('https');
const http = require('http');

class ExternalPinger {
  constructor(url) {
    this.url = url || process.env.RENDER_SERVICE_URL;
    this.interval = 14 * 60 * 1000; // 14 minutes
    this.running = false;
    
    if (!this.url) {
      console.error('❌ No URL provided. Set RENDER_SERVICE_URL environment variable or pass as argument');
      process.exit(1);
    }
    
    console.log(`🎯 Target URL: ${this.url}`);
    console.log(`⏰ Ping interval: ${this.interval / 1000 / 60} minutes`);
  }

  ping() {
    return new Promise((resolve) => {
      const pingUrl = `${this.url}/ping`;
      const protocol = pingUrl.startsWith('https:') ? https : http;
      const startTime = Date.now();
      
      console.log(`📡 [${new Date().toISOString()}] Pinging: ${pingUrl}`);
      
      const req = protocol.get(pingUrl, { timeout: 30000 }, (res) => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          console.log(`✅ Success - ${responseTime}ms - Status: ${res.statusCode}`);
          resolve(true);
        } else {
          console.log(`❌ Failed - ${responseTime}ms - Status: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`⏰ Timeout after 30 seconds`);
        resolve(false);
      });

      req.on('error', (error) => {
        console.log(`❌ Error: ${error.message}`);
        resolve(false);
      });
    });
  }

  async healthCheck() {
    return new Promise((resolve) => {
      const healthUrl = `${this.url}/health`;
      const protocol = healthUrl.startsWith('https:') ? https : http;
      
      const req = protocol.get(healthUrl, { timeout: 30000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            console.log(`🏥 Health Status: ${health.status} - Uptime: ${Math.round(health.uptime)}s`);
            resolve(health);
          } catch (e) {
            console.log(`🏥 Health check response: ${data}`);
            resolve({ status: 'unknown' });
          }
        });
      });

      req.on('error', () => resolve({ status: 'error' }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'timeout' });
      });
    });
  }

  async start() {
    this.running = true;
    console.log(`🚀 Starting external pinger for ${this.url}`);
    
    // Initial ping
    await this.ping();
    await this.healthCheck();
    
    // Set up interval
    const intervalId = setInterval(async () => {
      if (!this.running) return;
      
      const success = await this.ping();
      if (success) {
        // Occasionally check full health
        if (Math.random() < 0.2) { // 20% chance
          await this.healthCheck();
        }
      }
    }, this.interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down external pinger...');
      this.running = false;
      clearInterval(intervalId);
      process.exit(0);
    });

    console.log(`✅ External pinger started. Press Ctrl+C to stop.`);
  }

  // One-time ping for testing
  async once() {
    console.log('🧪 Running one-time ping test...');
    const pingSuccess = await this.ping();
    const health = await this.healthCheck();
    
    return {
      pingSuccess,
      health,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const url = args[0] || process.env.RENDER_SERVICE_URL;
  
  if (!url) {
    console.log('Usage: node external-ping.js <render-url>');
    console.log('   or: RENDER_SERVICE_URL=https://your-app.onrender.com node external-ping.js');
    console.log('');
    console.log('Options:');
    console.log('  --once    Run a single ping test');
    console.log('  --help    Show this help');
    process.exit(1);
  }

  const pinger = new ExternalPinger(url);
  
  if (args.includes('--once')) {
    pinger.once().then(result => {
      console.log('\n📊 Test Results:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.pingSuccess ? 0 : 1);
    });
  } else if (args.includes('--help')) {
    console.log('External Render Ping Service');
    console.log('Keeps your Render service awake by pinging every 14 minutes');
    process.exit(0);
  } else {
    pinger.start();
  }
}

module.exports = ExternalPinger;