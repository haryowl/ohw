#!/bin/bash

# ========================================
# PEER SYNC STARTUP SCRIPT
# ========================================
# Starts the Galileosky Parser with Peer Sync
# Last updated: 2025-01-27
# ========================================

echo "🚀 Starting Galileosky Parser with Peer Sync..."
echo ""

# Function to get IP address
get_ip_address() {
    # Try to get IP from wlan0 first (WiFi)
    local ip=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
    
    # If no wlan0, try other interfaces
    if [ -z "$ip" ]; then
        ip=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
    fi
    
    # If still no IP, use localhost
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo "$ip"
}

# Get IP address
IP_ADDRESS=$(get_ip_address)

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if required files exist
if [ ! -f "termux-peer-sync-backend.js" ]; then
    echo "❌ termux-peer-sync-backend.js not found. Please ensure you're in the correct directory."
    exit 1
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data

echo "🔧 Configuration:"
echo "   IP Address: $IP_ADDRESS"
echo "   HTTP Port: 3001"
echo "   TCP Port: 3003"
echo ""

echo "📱 Access the peer sync interface at: http://$IP_ADDRESS:3001/mobile-peer-sync-ui.html"
echo "🌐 Or from other devices: http://$IP_ADDRESS:3001/mobile-peer-sync-ui.html"
echo "⏹  Press Ctrl+C to stop the server"
echo ""

# Start the server
node termux-peer-sync-backend.js 