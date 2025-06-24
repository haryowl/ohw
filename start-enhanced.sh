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

# Debug: Show which file we're about to run
echo "🔍 Debug: About to run: $(pwd)/termux-enhanced-backend.js"
echo "🔍 Debug: File exists: $(ls -la termux-enhanced-backend.js)"
echo "🔍 Debug: File size: $(wc -c < termux-enhanced-backend.js) bytes"

# Get the device IP address - try multiple methods for Android/Termux compatibility
DEVICE_IP=""
if command -v ip &> /dev/null; then
    # Try using 'ip' command (more reliable on Android)
    DEVICE_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -1)
fi

if [ -z "$DEVICE_IP" ]; then
    # Fallback to ifconfig if available
    if command -v ifconfig &> /dev/null; then
        DEVICE_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
fi

if [ -z "$DEVICE_IP" ]; then
    # Last resort - try hostname with different options
    if command -v hostname &> /dev/null; then
        DEVICE_IP=$(hostname -i 2>/dev/null | awk '{print $1}')
    fi
fi

if [ -z "$DEVICE_IP" ]; then
    echo "📍 Device IP: Could not determine IP address"
    echo "🌐 Frontend will be available at: http://0.0.0.0:3001"
    echo "📱 For mobile access, try: http://YOUR_PHONE_IP:3001"
else
    echo "📍 Device IP: $DEVICE_IP"
    echo "🌐 Frontend will be available at: http://$DEVICE_IP:3001"
fi

# Start the enhanced backend
echo "🔄 Starting enhanced backend with full parameter parsing..."
echo "📡 Backend will listen on port 3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the enhanced backend with explicit path
node "$(pwd)/termux-enhanced-backend.js" 