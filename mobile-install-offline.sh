#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser Mobile Offline Installation Script
# This script sets up the mobile application without requiring internet

set -e  # Exit on any error

echo "🚀 Starting Galileosky Parser Mobile Offline Installation..."
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Check if Node.js is already installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first:"
    echo "   pkg install nodejs"
    echo "   or run the online installation script:"
    echo "   curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-install.sh | bash"
    exit 1
fi

print_success "Node.js found: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_warning "npm not found, but continuing with basic setup..."
else
    print_success "npm found: $(npm --version)"
fi

# Step 1: Navigate to home directory
cd /data/data/com.termux/files/home

# Step 2: Check if repository already exists
if [ -d "galileosky-parser" ]; then
    print_warning "Existing installation found."
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Updating existing installation..."
        cd galileosky-parser
        if command -v git &> /dev/null; then
            git pull origin main
        else
            print_warning "Git not available, skipping update"
        fi
    else
        print_status "Skipping update"
        cd galileosky-parser
    fi
else
    print_error "Repository not found. Please clone it first:"
    echo "   git clone https://github.com/haryowl/galileosky-parser.git"
    echo "   or run the online installation script"
    exit 1
fi

# Step 3: Create necessary directories
print_status "Creating necessary directories..."
mkdir -p config data logs output

# Step 4: Create configuration file
print_status "Creating configuration file..."
cat > config/config.json << 'EOF'
{
  "port": 3000,
  "host": "0.0.0.0",
  "database": {
    "path": "./data/parser.db"
  },
  "logging": {
    "level": "info",
    "file": "./logs/parser.log"
  }
}
EOF

# Step 5: Create startup script
print_status "Creating startup script..."
cat > start-mobile-server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
echo "🚀 Starting Galileosky Parser Mobile Server..."
echo "📱 Access the interface at: http://localhost:3000"
echo "🌐 Or from other devices: http://$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "localhost"):3000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""
node termux-enhanced-backend.js
EOF

chmod +x start-mobile-server.sh

# Step 6: Create peer sync startup script
print_status "Creating peer sync startup script..."
cat > start-peer-sync.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
echo "🚀 Starting Galileosky Parser with Peer Sync..."
echo "📱 Access the peer sync interface at: http://localhost:3001/mobile-peer-sync-ui.html"
echo "🌐 Or from other devices: http://$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "localhost"):3001/mobile-peer-sync-ui.html"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""
node termux-peer-sync-backend.js
EOF

chmod +x start-peer-sync.sh

# Step 7: Create simple startup script
print_status "Creating simple startup script..."
cat > start-simple.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
echo "🚀 Starting Galileosky Parser Simple Server..."
echo "📱 Access the interface at: http://localhost:3000"
echo "🌐 Or from other devices: http://$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "localhost"):3000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""
node termux-simple-backend.js
EOF

chmod +x start-simple.sh

# Step 8: Get IP address
IP_ADDRESS=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "localhost")

# Step 9: Display installation summary
echo ""
echo "🎉 Offline Installation Complete!"
echo "================================"
echo ""
print_success "Galileosky Parser Mobile has been set up successfully!"
echo ""
echo "📱 To start the server:"
echo "   cd /data/data/com.termux/files/home/galileosky-parser"
echo "   ./start-mobile-server.sh"
echo ""
echo "🔄 To start with peer sync:"
echo "   ./start-peer-sync.sh"
echo ""
echo "⚡ To start simple server:"
echo "   ./start-simple.sh"
echo ""
echo "🌐 Access the interfaces:"
echo "   Mobile Interface:  http://localhost:3000"
echo "   Peer Sync Interface: http://localhost:3001/mobile-peer-sync-ui.html"
echo "   Remote Access: http://${IP_ADDRESS}:3000"
echo "   Remote Peer Sync: http://${IP_ADDRESS}:3001/mobile-peer-sync-ui.html"
echo ""
echo "📋 Available commands:"
echo "   ./start-mobile-server.sh  - Start enhanced server"
echo "   ./start-peer-sync.sh      - Start with peer sync"
echo "   ./start-simple.sh         - Start simple server"
echo "   node termux-enhanced-backend.js  - Direct enhanced backend"
echo "   node termux-simple-backend.js    - Direct simple backend"
echo "   node termux-peer-sync-backend.js - Direct peer sync backend"
echo ""
echo "📚 For detailed instructions, see:"
echo "   MOBILE_INSTALLATION_GUIDE.md"
echo "   MOBILE_QUICK_REFERENCE.md"
echo "   PEER_SYNC_README.md"
echo ""
print_warning "Remember to keep your phone plugged in when running the server!"
echo ""
echo "🚀 Ready to start? Run: ./start-mobile-server.sh" 