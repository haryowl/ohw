#!/bin/bash

# 🛰️ Galileosky Parser - Fixed Termux Installation
# This script handles the Python and sqlite3 build issues

set -e

echo "========================================"
echo "  Galileosky Parser - Fixed Termux Setup"
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
print_info "Step 1: Updating package list..."
pkg update -y

echo ""
print_info "Step 2: Installing required packages..."
pkg install -y nodejs git python wget curl

echo ""
print_info "Step 3: Installing build tools..."
pkg install -y build-essential python-dev

echo ""
print_info "Step 4: Checking installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Python version: $(python --version)"
echo "Git version: $(git --version)"

echo ""
print_info "Step 5: Cloning repository..."
if [ -d "galileosky-parser" ]; then
    print_warning "Repository already exists, updating..."
    cd galileosky-parser
    git pull origin main
else
    git clone https://github.com/haryowl/galileosky-parser.git
    cd galileosky-parser
fi

echo ""
print_info "Step 6: Installing backend dependencies with Python fix..."
cd backend

# Set Python path for node-gyp
export PYTHON=$(which python)
npm config set python $(which python)

# Install dependencies with specific flags to avoid sqlite3 issues
print_warning "Installing dependencies (this may take a while)..."
npm install --no-optional --ignore-scripts

# Try to install sqlite3 separately with Python path
print_info "Installing sqlite3 with Python support..."
npm install sqlite3 --build-from-source --python=$(which python)

echo ""
print_info "Step 7: Testing installation..."
if node -e "console.log('Node.js working:', require('sqlite3') ? 'SQLite3 OK' : 'SQLite3 failed')" 2>/dev/null; then
    print_status "Backend installation successful!"
else
    print_warning "SQLite3 installation may have issues, but continuing..."
fi

echo ""
print_info "Step 8: Creating startup script..."
cat > ../start-backend.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
echo "Starting Galileosky Parser Backend..."
echo "Server will be available at: http://localhost:3001"
echo "Press Ctrl+C to stop"
node src/server.js
EOF

chmod +x ../start-backend.sh

echo ""
print_status "Installation completed!"
echo ""
echo "🚀 To start the backend server:"
echo "   ./start-backend.sh"
echo ""
echo "📱 Your device info:"
echo "   Model: $(getprop ro.product.model 2>/dev/null || echo 'Unknown')"
echo "   Android: $(getprop ro.build.version.release 2>/dev/null || echo 'Unknown')"
echo "   Architecture: $(uname -m)"
echo "   Memory: $(free -h | grep Mem | awk '{print $2}' 2>/dev/null || echo 'Unknown')"
echo ""
echo "🌐 The server will be available at:"
echo "   http://localhost:3001"
echo "   http://$(hostname -I | awk '{print $1}' 2>/dev/null || echo 'your-ip'):3001"
echo ""
print_info "For frontend access, use a web browser on your phone or computer" 