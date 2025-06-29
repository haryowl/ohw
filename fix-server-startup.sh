#!/data/data/com.termux/files/usr/bin/bash

# Fix Script for OHW Parser Server Startup Issue
# This script resolves the server startup problem by using working backend alternatives

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "${BLUE}  OHW Parser - Server Fix       ${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header

print_status "Fixing OHW Parser server startup issue..."

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the galileosky-parser directory"
    exit 1
fi

# Step 1: Stop any existing processes
print_status "Step 1: Stopping any existing processes..."
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Remove PID file if it exists
rm -f ~/ohw-server.pid

# Step 2: Check available backend files
print_status "Step 2: Checking available backend files..."
cd ~/galileosky-parser

BACKEND_FILES=()
if [ -f "termux-enhanced-backend.js" ]; then
    BACKEND_FILES+=("termux-enhanced-backend.js")
fi
if [ -f "termux-simple-backend.js" ]; then
    BACKEND_FILES+=("termux-simple-backend.js")
fi
if [ -f "backend/src/server.js" ]; then
    BACKEND_FILES+=("backend/src/server.js")
fi

print_status "Found backend files: ${BACKEND_FILES[*]}"

# Step 3: Create working start script
print_status "Step 3: Creating working start script..."

cat > ~/ohw-start-working.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting OHW Parser (Working Version)..."

cd ~/galileosky-parser

# Check if already running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Try enhanced backend first
if [ -f "termux-enhanced-backend.js" ]; then
    echo "Starting enhanced backend..."
    nohup node termux-enhanced-backend.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
elif [ -f "termux-simple-backend.js" ]; then
    # Fallback to simple backend
    echo "Starting simple backend..."
    nohup node termux-simple-backend.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
elif [ -f "backend/src/server.js" ]; then
    # Try main server
    echo "Starting main server..."
    nohup node backend/src/server.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
else
    echo "❌ No backend files found"
    exit 1
fi

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

# Make it executable
chmod +x ~/ohw-start-working.sh

# Step 4: Update the original start script
print_status "Step 4: Updating original start script..."

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

# Try enhanced backend first (most reliable)
if [ -f "termux-enhanced-backend.js" ]; then
    echo "Starting enhanced backend..."
    nohup node termux-enhanced-backend.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
elif [ -f "termux-simple-backend.js" ]; then
    # Fallback to simple backend
    echo "Starting simple backend..."
    nohup node termux-simple-backend.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
elif [ -f "backend/src/server.js" ]; then
    # Try main server as last resort
    echo "Starting main server..."
    nohup node backend/src/server.js > "$HOME/ohw-server.log" 2>&1 &
    SERVER_PID=$!
else
    echo "❌ No backend files found"
    exit 1
fi

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

# Make it executable
chmod +x ~/ohw-start.sh

# Step 5: Test the server startup
print_status "Step 5: Testing server startup..."

# Start the server
~/ohw-start.sh

# Wait a moment for server to fully start
sleep 5

# Check if server is running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        print_status "✅ Server test successful"
        
        # Show server info
        echo ""
        echo "📊 Server Information:"
        echo "  PID: $PID"
        echo "  Local URL: http://localhost:3001"
        
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "  Network URL: http://$IP_ADDRESSES:3001"
        fi
        
        echo "  Logs: tail -f ~/ohw-server.log"
        
    else
        print_error "❌ Server test failed"
        exit 1
    fi
else
    print_error "❌ Server test failed - no PID file"
    exit 1
fi

# Step 6: Installation complete
print_status "Step 6: Server fix completed!"

echo ""
echo -e "${GREEN}🎉 OHW Parser server is now working!${NC}"
echo ""
echo "📋 Available commands:"
echo "  ~/ohw-start.sh         - Start the server (fixed)"
echo "  ~/ohw-start-working.sh - Alternative start script"
echo "  ~/ohw-status.sh        - Check server status"
echo "  ~/ohw-stop.sh          - Stop the server"
echo "  ~/ohw-restart.sh       - Restart the server"
echo ""
echo "🌐 Access URLs:"
echo "  Local:  http://localhost:3001"
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