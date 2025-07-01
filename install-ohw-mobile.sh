#!/bin/bash

# 🛰️ OHW Parser - Complete Mobile Installation Script
# Single command installation for new mobile phones

set -e

echo "========================================"
echo "  OHW Parser - Mobile Installation"
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
    echo "Please install Termux from F-Droid or Google Play Store"
    exit 1
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
print_info "Step 5: Cleaning up any existing installations..."

# Remove any existing installations
cd ~
if [ -d "galileosky-parser" ]; then
    print_warning "Removing old galileosky-parser directory..."
    rm -rf galileosky-parser
fi

if [ -d "ohw" ]; then
    print_warning "Removing old ohw directory..."
    rm -rf ohw
fi

# Remove old management scripts
rm -f ~/galileosky-*.sh
rm -f ~/ohw-*.sh

echo ""
print_info "Step 6: Downloading OHW Parser..."
git clone https://github.com/haryowl/ohw.git
cd ohw

echo ""
print_info "Step 7: Installing dependencies with fallback..."

# Install root dependencies with fallback
if [ -f "package.json" ]; then
    print_info "Installing root dependencies..."
    npm install --no-optional --ignore-scripts || npm install --no-optional --ignore-scripts --force
fi

# Install backend dependencies with fallback
if [ -d "backend" ]; then
    cd backend
    print_info "Installing backend dependencies..."
    npm install --no-optional --ignore-scripts || npm install --no-optional --ignore-scripts --force
    cd ..
fi

# Install frontend dependencies (optional)
if [ -d "frontend" ]; then
    cd frontend
    print_info "Installing frontend dependencies..."
    npm install --no-optional --ignore-scripts || npm install --no-optional --ignore-scripts --force
    cd ..
fi

echo ""
print_info "Step 8: Creating data directories..."
mkdir -p backend/data backend/logs backend/output

echo ""
print_info "Step 9: Creating mobile configuration..."
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
print_info "Step 10: Creating management scripts..."

# Create start script
cat > ~/ohw-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting OHW Parser..."

# Find the project directory
if [ -d "$HOME/ohw" ]; then
    cd "$HOME/ohw"
else
    echo "❌ Project directory not found"
    echo "Please run the installation script first"
    exit 1
fi

# Check if already running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Try different backend files
if [ -f "backend/src/enhanced-backend.js" ]; then
    BACKEND_FILE="backend/src/enhanced-backend.js"
elif [ -f "termux-enhanced-backend.js" ]; then
    BACKEND_FILE="termux-enhanced-backend.js"
elif [ -f "backend/src/server.js" ]; then
    BACKEND_FILE="backend/src/server.js"
elif [ -f "termux-simple-backend.js" ]; then
    BACKEND_FILE="termux-simple-backend.js"
else
    echo "❌ No backend file found"
    echo "Available files:"
    find . -name "*.js" -type f | grep -E "(backend|server|termux)" | head -10
    exit 1
fi

echo "📁 Using backend: $BACKEND_FILE"

# Start the backend
nohup node "$BACKEND_FILE" > "$HOME/ohw-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$HOME/ohw-server.pid"

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
    rm -f "$HOME/ohw-server.pid"
    echo "📋 Check logs: tail -f $HOME/ohw-server.log"
    exit 1
fi
EOF

# Create status script
cat > ~/ohw-status.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "📊 OHW Parser Status"
echo "==================="

# Check if server is running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
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
        tail -10 "$HOME/ohw-server.log"
    else
        echo "❌ Server is not running"
        rm -f "$HOME/ohw-server.pid"
    fi
else
    echo "❌ Server is not running"
fi
EOF

# Create stop script
cat > ~/ohw-stop.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping OHW Parser..."

if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Server stopped (PID: $PID)"
    else
        echo "⚠️ Server was not running"
    fi
    rm -f "$HOME/ohw-server.pid"
else
    echo "⚠️ No server PID file found"
fi
EOF

# Create restart script
cat > ~/ohw-restart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Restarting OHW Parser..."

# Stop if running
~/ohw-stop.sh

# Wait a moment
sleep 2

# Start again
~/ohw-start.sh
EOF

# Create update script
cat > ~/ohw-update.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Updating OHW Parser..."

# Stop server if running
~/ohw-stop.sh

# Update repository
cd ~/ohw
git pull origin main

# Reinstall dependencies
npm install --no-optional --ignore-scripts || npm install --no-optional --ignore-scripts --force

if [ -d "backend" ]; then
    cd backend
    npm install --no-optional --ignore-scripts || npm install --no-optional --ignore-scripts --force
    cd ..
fi

echo "✅ Update completed!"
echo "To start the server: ~/ohw-start.sh"
EOF

# Make scripts executable
chmod +x ~/ohw-*.sh

echo ""
print_info "Step 11: Creating aliases for backward compatibility..."

# Create aliases for backward compatibility
ln -sf ~/ohw-start.sh ~/galileosky-start.sh
ln -sf ~/ohw-status.sh ~/galileosky-status.sh
ln -sf ~/ohw-stop.sh ~/galileosky-stop.sh
ln -sf ~/ohw-restart.sh ~/galileosky-restart.sh

echo ""
print_info "Step 12: Checking for port conflicts..."

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
print_status "🎉 OHW Parser has been installed successfully!"
echo ""
echo "📱 Available commands:"
echo "  ~/ohw-start.sh         - Start the server"
echo "  ~/ohw-status.sh        - Check server status"
echo "  ~/ohw-stop.sh          - Stop the server"
echo "  ~/ohw-restart.sh       - Restart the server"
echo "  ~/ohw-update.sh        - Update to latest version"
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
    ~/ohw-start.sh
    
    echo ""
    print_status "Server started! You can now:"
    echo "1. Open your browser and go to http://localhost:3001"
    echo "2. Use the mobile interface at http://localhost:3001/mobile"
    echo "3. Set up peer-to-peer sync at http://localhost:3001/peer-sync"
    echo ""
    echo "To check server status: ~/ohw-status.sh"
    echo "To stop the server: ~/ohw-stop.sh"
    echo "To update later: ~/ohw-update.sh"
else
    echo ""
    print_info "To start the server later, run: ~/ohw-start.sh"
fi

echo ""
print_status "Installation complete! 🚀"
echo ""
echo "📞 Quick Reference:"
echo "  Start: ~/ohw-start.sh"
echo "  Status: ~/ohw-status.sh"
echo "  Stop: ~/ohw-stop.sh"
echo "  Update: ~/ohw-update.sh" 