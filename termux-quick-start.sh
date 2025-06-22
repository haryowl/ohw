#!/bin/bash

# 🛰️ Galileosky Parser - Quick Start for Termux
# This script handles permissions and starts the simplified server

set -e

echo "========================================"
echo "  Galileosky Parser - Quick Start"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
print_info "Step 1: Fixing permissions..."
chmod +x termux-simple-install.sh
chmod +x start-simple.sh

echo ""
print_info "Step 2: Checking if simplified server exists..."
if [ ! -f "backend/src/server-simple.js" ]; then
    print_warning "Simplified server not found, running installer..."
    ./termux-simple-install.sh
else
    print_status "Simplified server found!"
fi

echo ""
print_info "Step 3: Starting the server..."
echo "🚀 Starting Galileosky Parser Backend (Simplified)..."
echo "📱 HTTP Server: http://localhost:3001"
echo "📡 TCP Server: localhost:3003"
echo "🔌 WebSocket: ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
cd backend
node src/server-simple.js 