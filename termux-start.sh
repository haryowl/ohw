#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser - Android Server Startup Script
# For Termux on Android devices

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
    echo -e "${BLUE}  Galileosky Parser - Android   ${NC}"
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
    
    # Check available storage
    AVAILABLE_STORAGE=$(df -h /data | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_STORAGE" -lt 2 ]; then
        print_warning "Low storage space: ${AVAILABLE_STORAGE}GB available. 2GB+ recommended."
    fi
    
    # Check available memory
    TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        print_warning "Low memory: ${TOTAL_MEM}MB available. 2GB+ recommended."
    fi
    
    print_status "System requirements check completed"
}

# Function to get device information
get_device_info() {
    print_status "Device Information:"
    echo "  Model: $(getprop ro.product.model)"
    echo "  Manufacturer: $(getprop ro.product.manufacturer)"
    echo "  Android Version: $(getprop ro.build.version.release) (API $(getprop ro.build.version.sdk))"
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
    
    # Check WiFi status
    if command_exists dumpsys; then
        WIFI_STATUS=$(dumpsys wifi | grep "Wi-Fi is" | head -1)
        if [ -n "$WIFI_STATUS" ]; then
            echo "  WiFi: $WIFI_STATUS"
        fi
    fi
}

# Function to install Node.js and dependencies
install_nodejs() {
    print_status "Installing Node.js and dependencies..."
    
    # Update package list
    pkg update -y
    
    # Install essential packages
    pkg install nodejs git sqlite wget curl -y
    
    # Try to install build tools (optional)
    print_status "Installing build tools (optional)..."
    if pkg install build-essential -y 2>/dev/null; then
        print_status "Build tools installed successfully"
    else
        print_warning "Build tools not available, using pre-compiled packages"
        # Install alternative build tools if available
        pkg install clang make -y 2>/dev/null || print_warning "Alternative build tools not available"
    fi
    
    # Verify Node.js installation
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

# Function to install dependencies with fallback
install_dependencies() {
    print_status "Installing dependencies..."
    
    cd "$HOME/galileosky-parser"
    
    # Install root dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm install --no-optional || npm install --no-optional --legacy-peer-deps
    fi
    
    # Install backend dependencies
    if [ ! -d "backend/node_modules" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        npm install --no-optional || npm install --no-optional --legacy-peer-deps
        cd ..
    fi
    
    # Install frontend dependencies
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install --no-optional || npm install --no-optional --legacy-peer-deps
        cd ..
    fi
    
    # Build frontend with fallback
    if [ ! -d "frontend/build" ]; then
        print_status "Building frontend..."
        cd frontend
        
        # Try to build with standard settings
        if npm run build; then
            print_status "Frontend built successfully"
        else
            print_warning "Standard build failed, trying with legacy settings..."
            # Try with legacy settings
            npm run build --legacy-peer-deps || {
                print_warning "Build failed, using pre-built version if available"
                # Check if there's a pre-built version
                if [ -d "build" ]; then
                    print_status "Using existing build directory"
                else
                    print_error "Frontend build failed and no pre-built version available"
                    print_status "You may need to build on a different machine and copy the build folder"
                    exit 1
                fi
            }
        fi
        cd ..
    fi
    
    print_status "Dependencies installation completed"
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

# Function to start servers
start_servers() {
    print_status "Starting Galileosky Parser servers..."
    
    cd "$HOME/galileosky-parser"
    
    # Get IP address for display
    IP_ADDRESS=$(ip route get 1 | awk '{print $7; exit}')
    
    # Set environment variables
    export NODE_ENV=production
    export PORT=3001
    export TCP_PORT=3003
    export WS_PORT=3001
    
    # Start backend server
    print_status "Starting backend server..."
    cd backend
    node src/server.js &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server failed to start"
        exit 1
    fi
    
    # Start frontend server
    print_status "Starting frontend server..."
    cd frontend
    npx serve -s build -l 3002 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    sleep 3
    
    # Check if frontend is running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend server failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Display server information
    echo ""
    print_status "✅ Galileosky Parser is running!"
    echo ""
    echo "📱 Backend API: http://$IP_ADDRESS:3001"
    echo "🌐 Frontend: http://$IP_ADDRESS:3002"
    echo "📡 TCP Server: $IP_ADDRESS:3003"
    echo ""
    echo "🔗 Other devices can connect to:"
    echo "   http://$IP_ADDRESS:3002"
    echo ""
    echo "📊 Server Status:"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
    echo ""
    echo "Press Ctrl+C to stop servers"
    echo ""
    
    # Function to cleanup on exit
    cleanup() {
        print_status "Stopping servers..."
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        print_status "Servers stopped"
        exit 0
    }
    
    # Set up signal handlers
    trap cleanup INT TERM
    
    # Wait for servers
    wait
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start     Start the Galileosky Parser servers"
    echo "  stop      Stop running servers"
    echo "  status    Show server status"
    echo "  install   Install dependencies"
    echo "  config    Create mobile configuration"
    echo "  info      Show device and network information"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start servers"
    echo "  $0 status    # Check server status"
    echo "  $0 install   # Install dependencies"
    echo ""
    echo "Troubleshooting:"
    echo "  If you encounter build issues:"
    echo "  1. Try: $0 install"
    echo "  2. Build frontend on a different machine"
    echo "  3. Copy the build folder to frontend/build"
}

# Function to stop servers
stop_servers() {
    print_status "Stopping Galileosky Parser servers..."
    
    # Kill processes by port
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "serve.*build" 2>/dev/null || true
    
    print_status "Servers stopped"
}

# Function to check server status
check_status() {
    print_status "Checking server status..."
    
    # Check backend
    if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
        echo "✅ Backend server: Running (port 3001)"
    else
        echo "❌ Backend server: Not running"
    fi
    
    # Check frontend
    if netstat -tlnp 2>/dev/null | grep -q ":3002"; then
        echo "✅ Frontend server: Running (port 3002)"
    else
        echo "❌ Frontend server: Not running"
    fi
    
    # Check TCP server
    if netstat -tlnp 2>/dev/null | grep -q ":3003"; then
        echo "✅ TCP server: Running (port 3003)"
    else
        echo "❌ TCP server: Not running"
    fi
}

# Function to install build tools manually
install_build_tools() {
    print_status "Installing build tools manually..."
    
    # Update package list
    pkg update -y
    
    # Try different package names for build tools
    if pkg install build-essential -y 2>/dev/null; then
        print_status "build-essential installed successfully"
    elif pkg install clang make -y 2>/dev/null; then
        print_status "clang and make installed successfully"
    elif pkg install gcc make -y 2>/dev/null; then
        print_status "gcc and make installed successfully"
    else
        print_warning "No build tools available in package manager"
        print_status "You may need to build the frontend on a different machine"
        return 1
    fi
    
    return 0
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
            install_dependencies
            create_mobile_config
            start_servers
            ;;
        stop)
            stop_servers
            ;;
        status)
            check_status
            ;;
        install)
            check_requirements
            check_nodejs
            check_project
            install_dependencies
            ;;
        build-tools)
            install_build_tools
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
