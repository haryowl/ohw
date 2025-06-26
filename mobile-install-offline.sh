#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser Mobile Installation Script (Offline-Friendly)
# This script handles network connectivity issues and provides fallback options

set -e  # Exit on any error

echo "🚀 Starting Galileosky Parser Mobile Installation (Offline-Friendly)..."
echo "====================================================================="

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to try package installation with fallback
try_install_package() {
    local package=$1
    local fallback_method=$2
    
    print_status "Trying to install $package..."
    
    if command_exists pkg; then
        if pkg install -y "$package" 2>/dev/null; then
            print_success "$package installed successfully"
            return 0
        else
            print_warning "pkg install failed for $package"
        fi
    fi
    
    if [ -n "$fallback_method" ]; then
        print_status "Trying fallback method for $package..."
        eval "$fallback_method"
    fi
    
    return 1
}

# Step 1: Check existing installations
print_status "Checking existing installations..."

NODE_INSTALLED=false
NPM_INSTALLED=false
GIT_INSTALLED=false

if command_exists node; then
    print_success "Node.js already installed: $(node --version)"
    NODE_INSTALLED=true
fi

if command_exists npm; then
    print_success "npm already installed: $(npm --version)"
    NPM_INSTALLED=true
fi

if command_exists git; then
    print_success "Git already installed: $(git --version)"
    GIT_INSTALLED=true
fi

# Step 2: Try to update package lists (with error handling)
print_status "Attempting to update package lists..."
if command_exists pkg; then
    pkg update -y || print_warning "Package update failed, continuing with available packages"
else
    print_warning "pkg command not found"
fi

# Step 3: Install missing packages
if [ "$NODE_INSTALLED" = false ]; then
    try_install_package "nodejs" "print_warning 'Node.js installation failed. Please install manually.'"
fi

if [ "$NPM_INSTALLED" = false ]; then
    try_install_package "npm" "print_warning 'npm installation failed. Please install manually.'"
fi

if [ "$GIT_INSTALLED" = false ]; then
    try_install_package "git" "print_warning 'Git installation failed. Please install manually.'"
fi

# Step 4: Verify critical installations
print_status "Verifying installations..."

CRITICAL_ERROR=false

if ! command_exists node; then
    print_error "Node.js is required but not installed"
    print_warning "Please install Node.js manually:"
    print_warning "1. Try: pkg install nodejs"
    print_warning "2. Or download from: https://nodejs.org/"
    CRITICAL_ERROR=true
fi

if ! command_exists npm; then
    print_error "npm is required but not installed"
    print_warning "Please install npm manually:"
    print_warning "1. Try: pkg install npm"
    print_warning "2. Or install with Node.js"
    CRITICAL_ERROR=true
fi

if ! command_exists git; then
    print_warning "Git not found, will try alternative download method"
    # We'll handle this in the download step
fi

if [ "$CRITICAL_ERROR" = true ]; then
    print_error "Critical dependencies missing. Please install them manually and run this script again."
    exit 1
fi

print_success "All critical packages verified"

# Step 5: Navigate to home directory
cd /data/data/com.termux/files/home

# Step 6: Remove existing installation if present
if [ -d "galileosky-parser" ]; then
    print_warning "Existing installation found. Removing..."
    rm -rf galileosky-parser
fi

# Step 7: Download repository
print_status "Downloading Galileosky Parser repository..."

if command_exists git; then
    print_status "Using Git to clone repository..."
    if git clone https://github.com/haryowl/galileosky-parser.git; then
        print_success "Repository cloned successfully"
    else
        print_error "Git clone failed"
        exit 1
    fi
else
    print_warning "Git not available, trying curl download..."
    if command_exists curl; then
        print_status "Downloading repository as ZIP..."
        curl -L -o galileosky-parser.zip https://github.com/haryowl/galileosky-parser/archive/refs/heads/main.zip
        if [ -f "galileosky-parser.zip" ]; then
            print_status "Extracting ZIP file..."
            unzip galileosky-parser.zip
            mv galileosky-parser-main galileosky-parser
            rm galileosky-parser.zip
            print_success "Repository downloaded and extracted successfully"
        else
            print_error "Failed to download repository"
            exit 1
        fi
    else
        print_error "Neither Git nor curl available. Please install one of them manually."
        exit 1
    fi
fi

if [ ! -d "galileosky-parser" ]; then
    print_error "Repository download failed"
    exit 1
fi

# Step 8: Navigate to project directory
cd galileosky-parser

# Step 9: Install Node.js dependencies
print_status "Installing Node.js dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_warning "npm install failed, trying with --force..."
    npm install --force || print_error "npm install failed completely"
fi

# Step 10: Create necessary directories
print_status "Creating necessary directories..."
mkdir -p config data logs output

# Step 11: Create configuration file
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

# Step 12: Create startup script
print_status "Creating startup script..."
cat > start-mobile-server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
echo "🚀 Starting Galileosky Parser Mobile Server..."
echo "📱 Access the interface at: http://localhost:3000"
echo "🌐 Or from other devices: http://$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo 'localhost'):3000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""
node termux-enhanced-backend.js
EOF

chmod +x start-mobile-server.sh

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
echo "🌐 Access the mobile interface:"
echo "   Local:  http://localhost:3000"
echo "   Remote: http://${IP_ADDRESS}:3000"
echo ""
echo "📋 Available commands:"
echo "   ./start-mobile-server.sh  - Start the server"
echo "   node termux-enhanced-backend.js  - Start enhanced backend"
echo "   node termux-simple-backend.js    - Start simple backend"
echo "   bash termux-quick-start.sh       - Quick start script"
echo ""
echo "📚 For detailed instructions, see:"
echo "   MOBILE_INSTALLATION_GUIDE.md"
echo "   MOBILE_QUICK_REFERENCE.md"
echo ""
print_warning "Remember to keep your phone plugged in when running the server!"
echo ""
echo "🚀 Ready to start? Run: ./start-mobile-server.sh" 