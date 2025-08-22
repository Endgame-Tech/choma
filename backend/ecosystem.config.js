module.exports = {
  apps: [{
    name: 'choma-backend',
    script: './index.js',
    instances: process.env.WEB_CONCURRENCY || 2, // Render optimization
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 10000,
    },
    
    // Performance optimizations for Render
    max_memory_restart: '450M', // Conservative for Render's 512MB limit
    node_args: '--max-old-space-size=400',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart settings
    watch: false, // Disable in production
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health monitoring
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }]
};