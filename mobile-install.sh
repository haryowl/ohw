#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser Mobile Installation Script
# This script will set up the complete mobile application from scratch

set -e  # Exit on any error

echo "🚀 Starting Galileosky Parser Mobile Installation..."
echo "=================================================="

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

# Step 1: Update package lists and setup repositories
print_status "Updating package lists and setting up repositories..."
pkg update -y

# Step 2: Install essential packages (Node.js includes npm)
print_status "Installing essential packages..."
pkg install -y git curl wget nodejs

# Step 3: Verify installations
print_status "Verifying installations..."
if ! command -v node &> /dev/null; then
    print_error "Node.js installation failed"
    print_status "Trying alternative installation method..."
    
    # Try installing from NodeSource if pkg fails
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    pkg install -y nodejs
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js installation failed after retry"
        exit 1
    fi
fi

# Check if npm is available (it should be included with Node.js)
if ! command -v npm &> /dev/null; then
    print_warning "npm not found, installing separately..."
    pkg install -y npm
    
    if ! command -v npm &> /dev/null; then
        print_error "npm installation failed"
        print_status "Trying to install npm via Node.js..."
        # Try to install npm using Node.js
        curl -L https://www.npmjs.org/install.sh | sh
    fi
fi

if ! command -v git &> /dev/null; then
    print_error "Git installation failed"
    exit 1
fi

print_success "All packages installed successfully"
print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"
print_status "Git version: $(git --version)"

# Step 4: Navigate to home directory
cd /data/data/com.termux/files/home

# Step 5: Remove existing installation if present
if [ -d "galileosky-parser" ]; then
    print_warning "Existing installation found. Removing..."
    rm -rf galileosky-parser
fi

# Step 6: Clone repository
print_status "Cloning Galileosky Parser repository..."
git clone https://github.com/haryowl/galileosky-parser.git

if [ ! -d "galileosky-parser" ]; then
    print_error "Repository cloning failed"
    exit 1
fi

print_success "Repository cloned successfully"

# Step 7: Navigate to project directory
cd galileosky-parser

# Step 8: Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_warning "npm install failed, trying with --force..."
    npm install --force
    
    if [ $? -ne 0 ]; then
        print_error "npm install failed even with --force"
        print_status "Continuing without dependencies (some features may not work)"
    fi
fi

print_success "Dependencies installed successfully"

# Step 9: Create necessary directories
print_status "Creating necessary directories..."
mkdir -p config data logs output

# Step 10: Create configuration file
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

# Step 11: Create startup script
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

# Step 12: Create peer sync startup script
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

# Step 13: Get IP address
IP_ADDRESS=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "localhost")

# Step 14: Display installation summary
echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
print_success "Galileosky Parser Mobile has been installed successfully!"
echo ""
echo "📱 To start the server:"
echo "   cd /data/data/com.termux/files/home/galileosky-parser"
echo "   ./start-mobile-server.sh"
echo ""
echo "🔄 To start with peer sync:"
echo "   ./start-peer-sync.sh"
echo ""
echo "🌐 Access the interfaces:"
echo "   Mobile Interface:  http://localhost:3000"
echo "   Peer Sync Interface: http://localhost:3001/mobile-peer-sync-ui.html"
echo "   Remote Access: http://${IP_ADDRESS}:3000"
echo "   Remote Peer Sync: http://${IP_ADDRESS}:3001/mobile-peer-sync-ui.html"
echo ""
echo "📋 Available commands:"
echo "   ./start-mobile-server.sh  - Start the server"
echo "   ./start-peer-sync.sh      - Start with peer sync"
echo "   node termux-enhanced-backend.js  - Start enhanced backend"
echo "   node termux-simple-backend.js    - Start simple backend"
echo "   bash termux-quick-start.sh       - Quick start script"
echo ""
echo "📚 For detailed instructions, see:"
echo "   MOBILE_INSTALLATION_GUIDE.md"
echo "   MOBILE_QUICK_REFERENCE.md"
echo "   PEER_SYNC_README.md"
echo ""
print_warning "Remember to keep your phone plugged in when running the server!"
echo ""
echo "🚀 Ready to start? Run: ./start-mobile-server.sh" 