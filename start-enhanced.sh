#!/bin/bash

echo "🚀 Starting Enhanced Galileosky Backend with Frontend..."
echo ""

# Check if files exist
if [ ! -f "termux-enhanced-backend.js" ]; then
    echo "❌ Enhanced backend file not found!"
    echo "Please run: bash setup-enhanced-backend.sh"
    exit 1
fi

if [ ! -f "simple-frontend.html" ]; then
    echo "❌ Frontend file not found!"
    echo "Please run: bash setup-enhanced-backend.sh"
    exit 1
fi

# Get IP address
IP_ADDRESS=$(ip route get 1 | awk '{print $7; exit}')
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS="localhost"
fi

echo "✅ Starting servers..."
echo "📱 Frontend will be available at: http://$IP_ADDRESS:3001"
echo "🔧 TCP server for devices: Port 3003"
echo "🌐 HTTP server for frontend: Port 3001"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start the enhanced backend
node termux-enhanced-backend.js 