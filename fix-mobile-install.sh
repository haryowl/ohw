#!/bin/bash

# 🛠️ OHW Parser - Mobile Installation Fix Script
# This script fixes common installation issues

set -e

echo "========================================"
echo "  OHW Parser - Installation Fix"
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
print_info "Step 1: Checking current directory..."

# Check what directory we're in
if [ -d "ohw" ]; then
    print_status "Found 'ohw' directory"
    cd ohw
elif [ -d "galileosky-parser" ]; then
    print_warning "Found 'galileosky-parser' directory, renaming to 'ohw'"
    mv galileosky-parser ohw
    cd ohw
elif [ -f "package.json" ] || [ -f "backend/package.json" ]; then
    print_status "Already in project directory"
else
    print_error "No project directory found"
    echo "Please run the installation script first:"
    echo "curl -sSL https://raw.githubusercontent.com/haryowl/ohw/main/install-mobile.sh | bash"
    exit 1
fi

echo ""
print_info "Step 2: Fixing npm dependencies..."

# Remove node_modules and package-lock.json to fix build issues
if [ -d "node_modules" ]; then
    print_info "Removing node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    print_info "Removing package-lock.json..."
    rm -f package-lock.json
fi

if [ -d "backend/node_modules" ]; then
    print_info "Removing backend node_modules..."
    rm -rf backend/node_modules
fi

if [ -f "backend/package-lock.json" ]; then
    print_info "Removing backend package-lock.json..."
    rm -f backend/package-lock.json
fi

echo ""
print_info "Step 3: Installing dependencies with fallback..."

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
print_info "Step 4: Creating data directories..."

# Create necessary directories
mkdir -p backend/data backend/logs backend/output

echo ""
print_info "Step 5: Creating mobile configuration..."

# Create mobile configuration
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
print_info "Step 6: Creating management scripts..."

# Create start script
cat > ~/ohw-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting OHW Parser..."

# Find the project directory
if [ -d "$HOME/ohw" ]; then
    cd "$HOME/ohw"
elif [ -d "$HOME/galileosky-parser" ]; then
    cd "$HOME/galileosky-parser"
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
else
    echo "❌ No backend file found"
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

# Make scripts executable
chmod +x ~/ohw-*.sh

echo ""
print_info "Step 7: Creating aliases for old script names..."

# Create aliases for backward compatibility
ln -sf ~/ohw-start.sh ~/galileosky-start.sh
ln -sf ~/ohw-status.sh ~/galileosky-status.sh
ln -sf ~/ohw-stop.sh ~/galileosky-stop.sh
ln -sf ~/ohw-restart.sh ~/galileosky-restart.sh

echo ""
print_status "🎉 Fix completed successfully!"
echo ""
echo "📱 Available commands:"
echo "  ~/ohw-start.sh         - Start the server (new)"
echo "  ~/galileosky-start.sh  - Start the server (alias)"
echo "  ~/ohw-status.sh        - Check server status"
echo "  ~/ohw-stop.sh          - Stop the server"
echo "  ~/ohw-restart.sh       - Restart the server"
echo ""
echo "🌐 Access URLs:"
echo "  Local: http://localhost:3001"
echo "  Mobile: http://localhost:3001/mobile"
echo "  Peer Sync: http://localhost:3001/peer-sync"
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
else
    echo ""
    print_info "To start the server later, run: ~/ohw-start.sh"
fi

echo ""
print_status "Fix complete! 🚀" 