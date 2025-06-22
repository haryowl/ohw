#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser - Backend Only (Termux)
# No frontend build required

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
    echo -e "${BLUE}  Galileosky Parser - Backend   ${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check if running on Android
    if ! command_exists getprop; then
        print_error "This script must be run on Android with Termux"
        exit 1
    fi
    
    # Check Android version
    ANDROID_VERSION=$(getprop ro.build.version.sdk)
    if [ "$ANDROID_VERSION" -lt 24 ]; then
        print_error "Android 7.0+ (API 24+) required. Current: API $ANDROID_VERSION"
        exit 1
    fi
    
    print_status "System requirements check completed"
}

# Function to get device information
get_device_info() {
    print_status "Device Information:"
    echo "  Model: $(getprop ro.product.model)"
    echo "  Android Version: $(getprop ro.build.version.release)"
    echo "  Architecture: $(uname -m)"
    echo "  Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo "  Storage: $(df -h /data | tail -1 | awk '{print $4}') available"
}

# Function to get network information
get_network_info() {
    print_status "Network Information:"
    
    # Get IP addresses
    IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
    if [ -n "$IP_ADDRESSES" ]; then
        echo "  IP Address: $IP_ADDRESSES"
    else
        echo "  IP Address: Not connected"
    fi
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    # Update package list
    pkg update -y
    
    # Install essential packages (no build tools)
    pkg install nodejs git sqlite wget curl -y
    
    # Verify installation
    if ! command_exists node; then
        print_error "Node.js installation failed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"
}

# Function to check if Node.js is installed
check_nodejs() {
    if ! command_exists node; then
        print_error "Node.js not found. Installing..."
        install_nodejs
    else
        NODE_VERSION=$(node --version)
        NPM_VERSION=$(npm --version)
        print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"
    fi
}

# Function to check if project exists
check_project() {
    if [ ! -d "$HOME/galileosky-parser" ]; then
        print_error "Project not found. Please clone the project first:"
        echo "  git clone https://github.com/haryowl/galileosky-parser.git"
        echo "  cd galileosky-parser"
        exit 1
    fi
}

# Function to install backend dependencies
install_backend_dependencies() {
    print_status "Installing backend dependencies..."
    
    cd "$HOME/galileosky-parser/backend"
    
    # Install backend dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install --no-optional || npm install --no-optional --legacy-peer-deps
    fi
    
    print_status "Backend dependencies installed"
    cd ..
}

# Function to create mobile configuration
create_mobile_config() {
    print_status "Creating mobile configuration..."
    
    cd "$HOME/galileosky-parser/backend"
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=warn
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
EOF
        print_status "Created .env file"
    fi
    
    # Create data directory
    mkdir -p data
    mkdir -p logs
    
    cd ..
}

# Function to start backend server
start_backend() {
    print_status "Starting Galileosky Parser backend server..."
    
    cd "$HOME/galileosky-parser/backend"
    
    # Get IP address for display
    IP_ADDRESS=$(ip route get 1 | awk '{print $7; exit}')
    
    # Set environment variables
    export NODE_ENV=production
    export PORT=3001
    export TCP_PORT=3003
    export WS_PORT=3001
    
    # Start backend server
    print_status "Starting backend server..."
    node src/server.js &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server failed to start"
        exit 1
    fi
    
    # Display server information
    echo ""
    print_status "✅ Galileosky Parser Backend is running!"
    echo ""
    echo "📱 Backend API: http://$IP_ADDRESS:3001"
    echo "📡 TCP Server: $IP_ADDRESS:3003"
    echo "🔌 WebSocket: ws://$IP_ADDRESS:3001/ws"
    echo ""
    echo "🔗 API Endpoints:"
    echo "   Devices: http://$IP_ADDRESS:3001/api/devices"
    echo "   Mobile Status: http://$IP_ADDRESS:3001/api/mobile/status"
    echo "   Data: http://$IP_ADDRESS:3001/api/data"
    echo ""
    echo "📊 Server Status:"
    echo "   Backend PID: $BACKEND_PID"
    echo ""
    echo "Press Ctrl+C to stop server"
    echo ""
    
    # Function to cleanup on exit
    cleanup() {
        print_status "Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null
        print_status "Backend server stopped"
        exit 0
    }
    
    # Set up signal handlers
    trap cleanup INT TERM
    
    # Wait for server
    wait
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start     Start the backend server only"
    echo "  stop      Stop running backend server"
    echo "  status    Show server status"
    echo "  install   Install backend dependencies"
    echo "  config    Create mobile configuration"
    echo "  info      Show device and network information"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start backend server"
    echo "  $0 status    # Check server status"
    echo "  $0 install   # Install dependencies"
    echo ""
    echo "Note: This script runs backend only (no frontend)"
}

# Function to stop server
stop_server() {
    print_status "Stopping Galileosky Parser backend server..."
    
    # Kill backend process
    pkill -f "node.*server.js" 2>/dev/null || true
    
    print_status "Backend server stopped"
}

# Function to check server status
check_status() {
    print_status "Checking backend server status..."
    
    # Check backend
    if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
        echo "✅ Backend server: Running (port 3001)"
        
        # Get process info
        PID=$(netstat -tlnp 2>/dev/null | grep ":3001" | awk '{print $7}' | cut -d'/' -f1)
        if [ -n "$PID" ]; then
            echo "   Process ID: $PID"
        fi
    else
        echo "❌ Backend server: Not running"
    fi
    
    # Check TCP server
    if netstat -tlnp 2>/dev/null | grep -q ":3003"; then
        echo "✅ TCP server: Running (port 3003)"
    else
        echo "❌ TCP server: Not running"
    fi
}

# Function to test API
test_api() {
    print_status "Testing API endpoints..."
    
    # Test devices endpoint
    if curl -s http://localhost:3001/api/devices >/dev/null 2>&1; then
        echo "✅ Devices API: Working"
    else
        echo "❌ Devices API: Not responding"
    fi
    
    # Test mobile status endpoint
    if curl -s http://localhost:3001/api/mobile/status >/dev/null 2>&1; then
        echo "✅ Mobile Status API: Working"
    else
        echo "❌ Mobile Status API: Not responding"
    fi
}

# Main script logic
main() {
    print_header
    
    case "${1:-start}" in
        start)
            check_requirements
            get_device_info
            get_network_info
            check_nodejs
            check_project
            install_backend_dependencies
            create_mobile_config
            start_backend
            ;;
        stop)
            stop_server
            ;;
        status)
            check_status
            ;;
        test)
            test_api
            ;;
        install)
            check_requirements
            check_nodejs
            check_project
            install_backend_dependencies
            ;;
        config)
            check_project
            create_mobile_config
            ;;
        info)
            get_device_info
            get_network_info
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 
