#!/bin/bash

echo "🚀 Starting Galileosky Enhanced Parser Backend..."
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if the enhanced backend file exists
if [ ! -f "termux-enhanced-backend.js" ]; then
    echo "❌ Enhanced backend file not found: termux-enhanced-backend.js"
    exit 1
fi

# Get the device IP address
DEVICE_IP=$(hostname -I | awk '{print $1}')
echo "📍 Device IP: $DEVICE_IP"

# Start the enhanced backend
echo "🔄 Starting enhanced backend with full parameter parsing..."
echo "📡 Backend will listen on port 3001"
echo "🌐 Frontend will be available at: http://$DEVICE_IP:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the enhanced backend
node termux-enhanced-backend.js 