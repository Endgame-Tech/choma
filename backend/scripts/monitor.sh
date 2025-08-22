#!/bin/bash

# Production Monitoring Script for Choma Backend
# Provides comprehensive monitoring and health checks

echo "📊 Choma Backend Monitoring Dashboard"
echo "======================================"

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    exit 1
fi

# Show PM2 status
echo "🔍 PM2 Process Status:"
pm2 jlist | jq -r '.[] | "Name: \(.name) | Status: \(.pm2_env.status) | CPU: \(.pm2_env.axm_monitor["CPU usage"].value) | Memory: \(.pm2_env.axm_monitor["Used Heap Size"].value)"' 2>/dev/null || pm2 status

echo ""
echo "💾 Memory Usage:"
pm2 jlist | jq -r '.[] | "Process: \(.name) | Memory: \(.pm2_env.axm_monitor["Used Heap Size"].value) | Heap Used: \(.pm2_env.axm_monitor["Heap Usage"].value)"' 2>/dev/null || echo "Run 'pm2 monit' for detailed memory monitoring"

echo ""
echo "🌐 Network & Health Check:"
# Check if the server is responding
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ API Health Check: PASSED"
    curl -s http://localhost:5001/health | jq '.' 2>/dev/null || echo "API is responding"
else
    echo "❌ API Health Check: FAILED"
fi

echo ""
echo "📈 Recent Logs (last 20 lines):"
pm2 logs choma-backend --lines 20 --nostream 2>/dev/null || echo "No logs available"

echo ""
echo "🔄 Restart History:"
pm2 jlist | jq -r '.[] | "Process: \(.name) | Restarts: \(.pm2_env.restart_time) | Uptime: \(.pm2_env.pm_uptime)"' 2>/dev/null || echo "Run 'pm2 show choma-backend' for detailed info"

echo ""
echo "📝 Available Commands:"
echo "  pm2 monit          - Real-time monitoring"
echo "  pm2 logs           - View live logs"
echo "  pm2 restart        - Restart all processes"
echo "  pm2 reload         - Zero-downtime reload"
echo "  pm2 stop           - Stop all processes"
echo "  ./scripts/deploy.sh - Deploy/restart"