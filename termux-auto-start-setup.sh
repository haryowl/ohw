#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser - Termux Auto-Start Setup Script
# This script helps configure auto-start functionality

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
    echo -e "${BLUE}  OHW Parser - Auto-Start Setup ${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header

print_status "Setting up auto-start for OHW Parser in Termux..."

# Check if we're in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Check if project exists
if [ ! -d "$HOME/galileosky-parser" ]; then
    print_error "OHW Parser project not found in $HOME/galileosky-parser"
    print_status "Please clone the project first:"
    echo "  git clone https://github.com/haryowl/galileosky-parser.git"
    exit 1
fi

# Install Termux:Boot if not installed
if ! pkg list-installed | grep -q "termux-boot"; then
    print_status "Installing Termux:Boot package..."
    pkg install termux-boot -y
else
    print_status "Termux:Boot already installed"
fi

# Create boot directory if it doesn't exist
BOOT_DIR="$HOME/.termux/boot"
mkdir -p "$BOOT_DIR"

# Copy the boot script
print_status "Setting up boot script..."
cp "$HOME/galileosky-parser/termux-boot-startup.sh" "$BOOT_DIR/ohw-parser-boot.sh"
chmod +x "$BOOT_DIR/ohw-parser-boot.sh"

# Create a simple status check script
cat > "$HOME/ohw-status.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser Status Check Script

echo "=== OHW Parser Status ==="

# Check if server is running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is running (PID: $PID)"
        echo "🌐 Access URL: http://localhost:3001"
        
        # Get IP addresses
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "📱 Network URL: http://$IP_ADDRESSES:3001"
        fi
    else
        echo "❌ Server is not running (PID file exists but process not found)"
    fi
else
    echo "❌ Server is not running (no PID file)"
fi

# Show recent logs
echo ""
echo "=== Recent Boot Logs ==="
if [ -f "$HOME/ohw-boot.log" ]; then
    tail -10 "$HOME/ohw-boot.log"
else
    echo "No boot logs found"
fi

echo ""
echo "=== Recent Server Logs ==="
if [ -f "$HOME/ohw-server.log" ]; then
    tail -10 "$HOME/ohw-server.log"
else
    echo "No server logs found"
fi
EOF

chmod +x "$HOME/ohw-status.sh"

# Create a stop script
cat > "$HOME/ohw-stop.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser Stop Script

echo "Stopping OHW Parser server..."

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

chmod +x "$HOME/ohw-stop.sh"

# Create a restart script
cat > "$HOME/ohw-restart.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser Restart Script

echo "Restarting OHW Parser server..."

# Stop if running
if [ -f "$HOME/ohw-stop.sh" ]; then
    source "$HOME/ohw-stop.sh"
fi

# Wait a moment
sleep 2

# Start again
if [ -f "$HOME/ohw-boot-startup.sh" ]; then
    source "$HOME/ohw-boot-startup.sh"
    echo "✅ Server restarted"
else
    echo "❌ Boot script not found"
fi
EOF

chmod +x "$HOME/ohw-restart.sh"

print_status "Auto-start setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  $HOME/ohw-status.sh   - Check server status"
echo "  $HOME/ohw-stop.sh     - Stop the server"
echo "  $HOME/ohw-restart.sh  - Restart the server"
echo ""
echo "🔄 Auto-start is now configured!"
echo "   The server will start automatically when Termux boots up."
echo ""
echo "📱 To test auto-start:"
echo "   1. Close Termux completely"
echo "   2. Reopen Termux"
echo "   3. Run: $HOME/ohw-status.sh"
echo ""
echo "⚠️  Note: Termux:Boot requires the Termux:Boot app to be installed"
echo "   and enabled in your Android system settings." 