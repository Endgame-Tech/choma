#!/bin/bash

# Render Production Startup Script
echo "🚀 Starting Choma Backend on Render..."

# Check if we're on Render (has RENDER environment variable)
if [ ! -z "$RENDER" ]; then
    echo "📡 Render environment detected"
    
    # Set optimized settings for Render
    export NODE_OPTIONS="--max-old-space-size=512"
    
    # Create logs directory
    mkdir -p logs
    
    # Check if PM2 is available
    if command -v pm2 >/dev/null 2>&1; then
        echo "✅ Using PM2 clustering"
        # Use reduced instances for Render's memory constraints
        export WEB_CONCURRENCY=2
        
        echo "📁 Using local ecosystem config"
        pm2 start ecosystem.config.js --env production --no-daemon
    else
        echo "⚠️ PM2 not available, using Node.js directly"
        node index.js
    fi
else
    echo "💻 Local development environment"
    npm run dev
fi