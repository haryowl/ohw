#!/bin/bash

# ========================================
# MOBILE PEER SYNC STARTUP SCRIPT
# ========================================
# Starts the mobile backend with peer-to-peer sync
# Last updated: 2025-01-27
# ========================================

echo "🚀 ========================================"
echo "🚀 STARTING MOBILE PEER SYNC BACKEND"
echo "🚀 ========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if required files exist
if [ ! -f "termux-peer-sync-backend.js" ]; then
    echo "❌ termux-peer-sync-backend.js not found. Please ensure you're in the correct directory."
    exit 1
fi

if [ ! -f "mobile-peer-sync.js" ]; then
    echo "❌ mobile-peer-sync.js not found. Please ensure you're in the correct directory."
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
mkdir -p backend/src/services

# Check if peer sync service exists, if not copy from root
if [ ! -f "backend/src/services/peerToPeerSync.js" ]; then
    echo "📋 Setting up peer sync service..."
    cp mobile-peer-sync.js backend/src/services/peerToPeerSync.js 2>/dev/null || echo "⚠️  Could not copy peer sync service"
fi

# Set environment variables
export TCP_PORT=3003
export HTTP_PORT=3001
export NODE_ENV=production

echo "🔧 Configuration:"
echo "   TCP Port: $TCP_PORT"
echo "   HTTP Port: $HTTP_PORT"
echo "   Environment: $NODE_ENV"
echo ""

# Start the mobile peer sync backend
echo "🚀 Starting mobile peer sync backend..."
echo "📱 Peer sync will be available on port 3001"
echo "🌐 Web interface: http://localhost:3001/mobile-peer-sync-ui.html"
echo "📡 TCP server: localhost:$TCP_PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node termux-peer-sync-backend.js 