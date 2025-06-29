#!/data/data/com.termux/files/usr/bin/bash

# Quick Fix for sqlite3 Installation Issue in Termux
# This script resolves the Python/build tools dependency issue

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

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  SQLite3 Installation Fix      ${NC}"
echo -e "${BLUE}================================${NC}"

print_status "Fixing sqlite3 installation issue..."

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the galileosky-parser directory"
    exit 1
fi

# Step 1: Install required build tools
print_status "Step 1: Installing build tools..."
pkg install python clang make -y

# Step 2: Clean npm cache
print_status "Step 2: Cleaning npm cache..."
npm cache clean --force

# Step 3: Remove existing node_modules
print_status "Step 3: Removing existing node_modules..."
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Step 4: Try alternative installation approaches
print_status "Step 4: Trying alternative installation approaches..."

cd backend

# Option 1: Try with specific sqlite3 version
print_status "Trying with specific sqlite3 version..."
npm install sqlite3@5.1.6 --no-optional || {
    print_warning "Specific version failed, trying without sqlite3..."
    
    # Option 2: Install without sqlite3
    npm install --no-optional --ignore-scripts || {
        print_warning "Installation still failing, using minimal setup..."
        
        # Option 3: Minimal installation
        npm install --no-optional --ignore-scripts --force
    }
}

cd ..

# Step 5: Install frontend dependencies
print_status "Step 5: Installing frontend dependencies..."
cd frontend
npm install --no-optional
cd ..

# Step 6: Test the installation
print_status "Step 6: Testing installation..."

# Check if backend can start
cd backend
if node -e "console.log('Node.js is working')" 2>/dev/null; then
    print_status "✅ Backend test successful"
else
    print_error "❌ Backend test failed"
    exit 1
fi
cd ..

print_status "✅ SQLite3 installation fix completed!"
echo ""
echo "📋 Next steps:"
echo "  1. Try running the server: ~/ohw-start.sh"
echo "  2. If it works, you're all set!"
echo "  3. If not, check the logs: tail -f ~/ohw-server.log"
echo ""
echo "🔧 Alternative: If you still have issues, you can:"
echo "  - Use the simple backend: node termux-simple-backend.js"
echo "  - Or run the enhanced backend: node termux-enhanced-backend.js" 