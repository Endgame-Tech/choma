#!/bin/bash

# Restart backend script for environment variable changes
echo "🔄 Restarting backend server to load new environment variables..."

# Navigate to backend directory
cd backend

# Stop any running processes (if using PM2, adjust accordingly)
pkill -f "node.*index.js" 2>/dev/null || echo "No existing backend process found"

# Wait a moment
sleep 2

# Start the backend server
echo "🚀 Starting backend server..."
npm start &

echo "✅ Backend server restarted. Environment variables should now be loaded."
echo "📋 Make sure to check the logs to verify the Google Maps API key is working."