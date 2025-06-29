#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser - One-Command Mobile Installation Script
# This script installs the OHW parser on a new mobile phone from scratch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  OHW Parser - Mobile Installer ${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header

print_status "Starting OHW Parser mobile installation..."

# Check if we're in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Step 1: Update and install packages
print_status "Step 1/8: Installing required packages..."
pkg update -y
pkg install nodejs git sqlite wget curl -y

# Verify installations
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js installation failed"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# Step 2: Download OHW Parser
print_status "Step 2/8: Downloading OHW Parser..."
cd ~

if [ -d "galileosky-parser" ]; then
    print_warning "Project directory already exists, removing..."
    rm -rf galileosky-parser
fi

git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser

if [ ! -f "package.json" ]; then
    print_error "Failed to download OHW Parser"
    exit 1
fi

print_status "OHW Parser downloaded successfully"

# Step 3: Install dependencies
print_status "Step 3/8: Installing dependencies..."

# Install root dependencies
npm install --no-optional

# Install backend dependencies with fallback for sqlite3
cd backend
print_status "Installing backend dependencies..."

# Try to install with optional dependencies first
if npm install --no-optional; then
    print_status "Backend dependencies installed successfully"
else
    print_warning "Backend installation failed, trying alternative approach..."
    
    # Install Python and build tools for sqlite3
    pkg install python clang make -y
    
    # Try installation again
    if npm install --no-optional; then
        print_status "Backend dependencies installed with build tools"
    else
        print_warning "sqlite3 build still failing, using alternative database..."
        
        # Create a simple backend configuration that doesn't require sqlite3
        cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=warn
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
USE_SIMPLE_DB=true
EOF
        
        # Try installing without sqlite3
        npm install --no-optional --ignore-scripts
        print_status "Backend dependencies installed (without sqlite3)"
    fi
fi
cd ..

# Install frontend dependencies
cd frontend
npm install --no-optional
cd ..

print_status "Dependencies installed successfully"

# Step 4: Setup frontend
print_status "Step 4/8: Setting up frontend..."

# Create build directory
mkdir -p frontend/build

# Try to build frontend, fallback to simple frontend if it fails
cd frontend
if npm run build 2>/dev/null; then
    print_status "Frontend built successfully"
else
    print_warning "Frontend build failed, using simple frontend"
    cp ../simple-frontend.html build/index.html
fi
cd ..

# Step 5: Configure mobile settings
print_status "Step 5/8: Configuring mobile settings..."

# Create data directories
mkdir -p backend/data backend/logs

# Create mobile configuration
cd backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=warn
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
EOF
cd ..

print_status "Mobile configuration created"

# Step 6: Create management scripts
print_status "Step 6/8: Creating management scripts..."

# Create start script
cat > ~/ohw-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting OHW Parser..."

cd ~/galileosky-parser

# Check if already running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Start the server
nohup node backend/src/server.js > "$HOME/ohw-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$HOME/ohw-server.pid"

# Wait and check if started successfully
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "🌐 Local URL: http://localhost:3001"
    
    # Get IP address
    IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
    if [ -n "$IP_ADDRESSES" ]; then
        echo "📱 Network URL: http://$IP_ADDRESSES:3001"
    fi
else
    echo "❌ Failed to start server"
    rm -f "$HOME/ohw-server.pid"
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
        
        # Get IP addresses
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "📱 Network URL: http://$IP_ADDRESSES:3001"
        fi
        
        # Show recent logs
        echo ""
        echo "📋 Recent Logs:"
        if [ -f "$HOME/ohw-server.log" ]; then
            tail -5 "$HOME/ohw-server.log"
        else
            echo "No logs found"
        fi
    else
        echo "❌ Server is not running (PID file exists but process not found)"
    fi
else
    echo "❌ Server is not running (no PID file)"
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
        rm -f "$HOME/ohw-server.pid"
    else
        echo "❌ Server was not running"
        rm -f "$HOME/ohw-server.pid"
    fi
else
    echo "❌ No PID file found"
fi
EOF

# Create restart script
cat > ~/ohw-restart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Restarting OHW Parser..."

# Stop if running
if [ -f "$HOME/ohw-stop.sh" ]; then
    source "$HOME/ohw-stop.sh"
fi

# Wait a moment
sleep 2

# Start again
if [ -f "$HOME/ohw-start.sh" ]; then
    source "$HOME/ohw-start.sh"
    echo "✅ Server restarted"
else
    echo "❌ Start script not found"
fi
EOF

# Make all scripts executable
chmod +x ~/ohw-*.sh

print_status "Management scripts created"

# Step 7: Test the installation
print_status "Step 7/8: Testing the installation..."

# Start the server
~/ohw-start.sh

# Wait a moment for server to fully start
sleep 5

# Check if server is running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        print_status "✅ Server test successful"
    else
        print_error "❌ Server test failed"
        exit 1
    fi
else
    print_error "❌ Server test failed - no PID file"
    exit 1
fi

# Step 8: Installation complete
print_status "Step 8/8: Installation complete!"

echo ""
echo -e "${GREEN}🎉 OHW Parser installed successfully!${NC}"
echo ""
echo "📋 Available commands:"
echo "  ~/ohw-start.sh   - Start the server"
echo "  ~/ohw-status.sh  - Check server status"
echo "  ~/ohw-stop.sh    - Stop the server"
echo "  ~/ohw-restart.sh - Restart the server"
echo ""
echo "🌐 Access URLs:"
echo "  Local:  http://localhost:3001"
IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
if [ -n "$IP_ADDRESSES" ]; then
    echo "  Network: http://$IP_ADDRESSES:3001"
fi
echo ""
echo "📱 Next steps:"
echo "  1. Open your browser and go to the URLs above"
echo "  2. Configure your tracking devices to send data"
echo "  3. Monitor logs with: tail -f ~/ohw-server.log"
echo ""
echo -e "${BLUE}The OHW Parser is now ready to receive tracking data!${NC}" 