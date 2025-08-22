#!/bin/bash

# Production Deployment Script for Choma Backend
# This script handles PM2 deployment with proper environment setup

echo "🚀 Starting Choma Backend Production Deployment..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed globally. Installing..."
    npm install -g pm2
fi

# Set production environment
export NODE_ENV=production

# Stop existing processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop choma-backend 2>/dev/null || echo "No existing processes found"
pm2 delete choma-backend 2>/dev/null || echo "No existing processes to delete"

# Create logs directory
mkdir -p logs

# Start with PM2
echo "🔄 Starting backend with PM2 clustering..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show status
echo "📊 PM2 Process Status:"
pm2 status

echo "📝 To monitor logs:"
echo "  pm2 logs choma-backend"
echo ""
echo "📝 To monitor processes:"
echo "  pm2 monit"
echo ""
echo "📝 To restart:"
echo "  pm2 restart choma-backend"
echo ""
echo "✅ Deployment completed successfully!"