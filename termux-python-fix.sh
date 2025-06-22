#!/bin/bash

# 🛰️ Galileosky Parser - Python Fix for Termux
# This script fixes the Python configuration for npm

set -e

echo "========================================"
echo "  Galileosky Parser - Python Fix"
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
print_info "Step 1: Installing Python and build tools..."
pkg install -y python build-essential

echo ""
print_info "Step 2: Setting Python environment variables..."
export PYTHON=$(which python)
export PYTHONPATH=$(which python)

echo "Python path: $PYTHON"

echo ""
print_info "Step 3: Setting npm Python configuration..."
npm config set python "$PYTHON"

echo ""
print_info "Step 4: Setting node-gyp Python configuration..."
npm config set python "$PYTHON"

echo ""
print_info "Step 5: Installing backend dependencies..."
cd backend

# Clean npm cache
npm cache clean --force

# Install with specific Python path
print_warning "Installing dependencies (this may take a while)..."
npm install --python="$PYTHON" --build-from-source

echo ""
print_info "Step 6: Testing sqlite3 installation..."
if node -e "console.log('SQLite3 test:', require('sqlite3') ? 'SUCCESS' : 'FAILED')" 2>/dev/null; then
    print_status "SQLite3 installation successful!"
else
    print_warning "SQLite3 installation may have issues, trying alternative approach..."
    
    # Try installing sqlite3 separately
    npm install sqlite3 --python="$PYTHON" --build-from-source
fi

echo ""
print_info "Step 7: Creating startup script..."
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
print_status "Python fix completed!"
echo ""
echo "🚀 To start the backend server:"
echo "   ./start-backend.sh"
echo ""
echo "📱 If you still get sqlite3 errors, try the simplified version:"
echo "   ./termux-simple-install.sh" 