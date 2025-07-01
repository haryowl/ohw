#!/bin/bash

# 🛰️ Galileosky Parser - Complete Mobile Installation Script
# This script automates the entire installation process for mobile phones

set -e

echo "========================================"
echo "  Galileosky Parser - Mobile Installer"
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    netstat -tulpn 2>/dev/null | grep -q ":$1 "
}

echo ""
print_info "Step 1: Checking prerequisites..."

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "backend/package.json" ]; then
    print_warning "Not in project directory, checking if we need to clone..."
    if [ ! -d "ohw" ]; then
        print_info "Cloning repository..."
        git clone https://github.com/haryowl/ohw.git
        cd ohw
    else
        cd ohw
    fi
fi

echo ""
print_info "Step 2: Updating package list..."
pkg update -y

echo ""
print_info "Step 3: Installing required packages..."
pkg install -y nodejs git sqlite wget curl

echo ""
print_info "Step 4: Verifying installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Git version: $(git --version)"

echo ""
print_info "Step 5: Installing project dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    npm install --no-optional
fi

# Install backend dependencies
if [ -d "backend" ]; then
    cd backend
    npm install --no-optional
    cd ..
fi

# Install frontend dependencies (optional)
if [ -d "frontend" ]; then
    cd frontend
    npm install --no-optional
    cd ..
fi

echo ""
print_info "Step 6: Creating data directories..."
mkdir -p backend/data backend/logs backend/output

echo ""
print_info "Step 7: Creating mobile configuration..."
cd backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=info
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
PEER_SYNC_ENABLED=true
PEER_SYNC_PORT=3004
EOF
cd ..

echo ""
print_info "Step 8: Creating management scripts..."

# Create start script
cat > ~/galileosky-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting Galileosky Parser..."

cd ~/ohw

# Check if already running
if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Start the enhanced backend
nohup node backend/src/enhanced-backend.js > "$HOME/galileosky-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$HOME/galileosky-server.pid"

# Wait and check if started successfully
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "🌐 Local URL: http://localhost:3001"
    echo "📡 TCP Server: localhost:3003"
    echo "🔄 Peer Sync: localhost:3004"
    
    # Get IP address
    IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
    if [ -n "$IP_ADDRESSES" ]; then
        echo "📱 Network URL: http://$IP_ADDRESSES:3001"
        echo "🔄 Peer Sync URL: http://$IP_ADDRESSES:3004"
    fi
else
    echo "❌ Failed to start server"
    rm -f "$HOME/galileosky-server.pid"
    exit 1
fi
EOF

# Create status script
cat > ~/galileosky-status.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "📊 Galileosky Parser Status"
echo "=========================="

# Check if server is running
if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is running (PID: $PID)"
        echo "🌐 Local URL: http://localhost:3001"
        echo "📡 TCP Server: localhost:3003"
        echo "🔄 Peer Sync: localhost:3004"
        
        # Get IP address
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "📱 Network URL: http://$IP_ADDRESSES:3001"
            echo "🔄 Peer Sync URL: http://$IP_ADDRESSES:3004"
        fi
        
        # Show recent logs
        echo ""
        echo "📋 Recent logs:"
        tail -10 "$HOME/galileosky-server.log"
    else
        echo "❌ Server is not running"
        rm -f "$HOME/galileosky-server.pid"
    fi
else
    echo "❌ Server is not running"
fi
EOF

# Create stop script
cat > ~/galileosky-stop.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping Galileosky Parser..."

if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Server stopped (PID: $PID)"
    else
        echo "⚠️ Server was not running"
    fi
    rm -f "$HOME/galileosky-server.pid"
else
    echo "⚠️ No server PID file found"
fi
EOF

# Create restart script
cat > ~/galileosky-restart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Restarting Galileosky Parser..."

# Stop if running
~/galileosky-stop.sh

# Wait a moment
sleep 2

# Start again
~/galileosky-start.sh
EOF

# Make scripts executable
chmod +x ~/galileosky-*.sh

echo ""
print_info "Step 9: Checking for port conflicts..."

# Check if ports are available
if port_in_use 3001; then
    print_warning "Port 3001 is already in use"
    echo "You may need to stop other services or change the port"
fi

if port_in_use 3003; then
    print_warning "Port 3003 is already in use"
fi

if port_in_use 3004; then
    print_warning "Port 3004 is already in use"
fi

echo ""
print_info "Step 10: Installation complete!"

echo ""
print_status "🎉 Galileosky Parser has been installed successfully!"
echo ""
echo "📱 Available commands:"
echo "  ~/galileosky-start.sh    - Start the server"
echo "  ~/galileosky-status.sh   - Check server status"
echo "  ~/galileosky-stop.sh     - Stop the server"
echo "  ~/galileosky-restart.sh  - Restart the server"
echo ""
echo "🌐 Access URLs:"
echo "  Local: http://localhost:3001"
echo "  Mobile: http://localhost:3001/mobile"
echo "  Peer Sync: http://localhost:3001/peer-sync"
echo ""
echo "📡 Server Ports:"
echo "  HTTP/WebSocket: 3001"
echo "  TCP (Devices): 3003"
echo "  Peer Sync: 3004"
echo ""

# Ask if user wants to start the server now
read -p "Do you want to start the server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Starting server..."
    ~/galileosky-start.sh
    
    echo ""
    print_status "Server started! You can now:"
    echo "1. Open your browser and go to http://localhost:3001"
    echo "2. Use the mobile interface at http://localhost:3001/mobile"
    echo "3. Set up peer-to-peer sync at http://localhost:3001/peer-sync"
    echo ""
    echo "To check server status: ~/galileosky-status.sh"
    echo "To stop the server: ~/galileosky-stop.sh"
else
    echo ""
    print_info "To start the server later, run: ~/galileosky-start.sh"
fi

echo ""
print_status "Installation complete! 🚀" 