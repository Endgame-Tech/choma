module.exports = {
  apps: [{
    name: 'choma-backend',
    script: './backend/index.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5001 // Use Render's PORT or default to 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 10000,
      instances: process.env.WEB_CONCURRENCY || 'max', // Render optimization
      max_memory_restart: '500M' // Render memory limits
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5001,
      instances: 2 // Use 2 instances in development
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5001,
      instances: 2, // Fewer instances for staging
      max_memory_restart: '300M'
    },
    // Performance optimizations
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart settings
    watch: false, // Disable in production
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health monitoring
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-git-repo',
      path: '/var/www/choma',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};