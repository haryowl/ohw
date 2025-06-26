#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# INTEGRATE STATIC IP INTO MOBILE BACKEND
# ========================================
# Adds static IP functionality to existing mobile backend files
# Last updated: 2025-01-27
# ========================================

set -e

echo "🔧 Integrating Static IP into Mobile Backend..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to backup file
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "Backed up: $file"
    fi
}

# Function to integrate static IP into backend file
integrate_static_ip() {
    local file="$1"
    local backup_file="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ ! -f "$file" ]; then
        print_warning "File not found: $file"
        return
    fi
    
    print_status "Integrating static IP into: $file"
    
    # Backup original file
    backup_file "$file"
    
    # Add static IP integration at the top of the file
    sed -i '1i\
// Static IP Integration\
const StaticIpIntegration = require("./mobile-static-ip-integration");\
const staticIp = new StaticIpIntegration();\
' "$file"
    
    # Replace localhost references with static IP
    sed -i 's/localhost:3000/staticIp.getPreferredIp() + ":3000"/g' "$file"
    sed -i 's/localhost:3001/staticIp.getPreferredIp() + ":3001"/g' "$file"
    sed -i 's/localhost:3003/staticIp.getPreferredIp() + ":3003"/g' "$file"
    
    # Add network info display
    sed -i '/console.log.*SERVER STARTED/a\
    staticIp.displayNetworkInfo();\
' "$file"
    
    print_success "Integrated static IP into: $file"
}

# Function to create enhanced startup script
create_enhanced_startup() {
    print_status "Creating enhanced startup script..."
    
    cat > start-with-static-ip.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# GALILEOSKY MOBILE SERVER WITH STATIC IP
# ========================================
# Enhanced startup script with static IP support
# Last updated: 2025-01-27
# ========================================

set -e

echo "🚀 Starting Galileosky Mobile Server with Static IP..."
echo "====================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if static IP is configured
if [ -f "config/static-ip.json" ]; then
    echo -e "${GREEN}✅ Static IP configuration found${NC}"
    STATIC_IP=$(grep '"ip_address"' config/static-ip.json | cut -d'"' -f4)
    echo -e "${BLUE}📡 Static IP: $STATIC_IP${NC}"
else
    echo -e "${YELLOW}⚠️  No static IP configuration found${NC}"
    echo -e "${BLUE}💡 To set up static IP, run:${NC}"
    echo "   curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash"
    echo ""
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    pkg update -y
    pkg install nodejs -y
fi

# Check if required packages are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Start the server
echo -e "${GREEN}🚀 Starting server...${NC}"
echo ""

# Use the appropriate backend file
if [ -f "termux-peer-sync-backend.js" ]; then
    node termux-peer-sync-backend.js
elif [ -f "termux-enhanced-backend.js" ]; then
    node termux-enhanced-backend.js
elif [ -f "termux-simple-backend.js" ]; then
    node termux-simple-backend.js
else
    echo -e "${YELLOW}⚠️  No backend file found. Creating simple backend...${NC}"
    curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-simple-backend.js > termux-simple-backend.js
    node termux-simple-backend.js
fi
EOF
    
    chmod +x start-with-static-ip.sh
    print_success "Created enhanced startup script: start-with-static-ip.sh"
}

# Function to create network status script
create_network_status() {
    print_status "Creating network status script..."
    
    cat > network-status.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# NETWORK STATUS FOR GALILEOSKY PARSER
# ========================================
# Shows current network configuration and server status
# Last updated: 2025-01-27
# ========================================

echo "🌐 Galileosky Parser Network Status"
echo "==================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get current IP
CURRENT_IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -z "$CURRENT_IP" ]; then
    CURRENT_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
fi

echo -e "${BLUE}Current IP:${NC} $CURRENT_IP"

# Check static IP configuration
if [ -f "config/static-ip.json" ]; then
    STATIC_IP=$(grep '"ip_address"' config/static-ip.json | cut -d'"' -f4)
    GATEWAY=$(grep '"gateway"' config/static-ip.json | cut -d'"' -f4)
    echo -e "${GREEN}Static IP:${NC} $STATIC_IP"
    echo -e "${BLUE}Gateway:${NC} $GATEWAY"
    echo -e "${GREEN}Status:${NC} Static IP configured"
else
    echo -e "${YELLOW}Static IP:${NC} Not configured"
    echo -e "${YELLOW}Status:${NC} Using dynamic IP"
fi

echo ""
echo "📱 Server URLs:"
echo "==============="

# Determine preferred IP
if [ -f "config/static-ip.json" ]; then
    PREFERRED_IP=$(grep '"ip_address"' config/static-ip.json | cut -d'"' -f4)
else
    PREFERRED_IP=$CURRENT_IP
fi

echo -e "${GREEN}Mobile Interface:${NC} http://$PREFERRED_IP:3000"
echo -e "${GREEN}Peer Sync Interface:${NC} http://$PREFERRED_IP:3001/mobile-peer-sync-ui.html"
echo -e "${GREEN}TCP Server:${NC} $PREFERRED_IP:3003"

echo ""
echo "🔧 Quick Actions:"
echo "================="
echo "1. Setup static IP: curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash"
echo "2. Start server: ./start-with-static-ip.sh"
echo "3. View logs: tail -f logs/server.log"
echo "4. Check data: ls -la data/"
EOF
    
    chmod +x network-status.sh
    print_success "Created network status script: network-status.sh"
}

# Main execution
main() {
    print_status "Starting static IP integration..."
    
    # Create config directory
    mkdir -p config
    
    # Integrate static IP into existing backend files
    integrate_static_ip "termux-peer-sync-backend.js"
    integrate_static_ip "termux-enhanced-backend.js"
    integrate_static_ip "termux-simple-backend.js"
    
    # Create enhanced startup script
    create_enhanced_startup
    
    # Create network status script
    create_network_status
    
    # Create static IP integration module if it doesn't exist
    if [ ! -f "mobile-static-ip-integration.js" ]; then
        print_status "Creating static IP integration module..."
        curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-integration.js > mobile-static-ip-integration.js
        print_success "Created mobile-static-ip-integration.js"
    fi
    
    echo ""
    echo "🎉 Static IP Integration Complete!"
    echo "=================================="
    echo ""
    print_success "Static IP functionality has been integrated into your mobile backend!"
    echo ""
    echo "📋 Available scripts:"
    echo "   ./start-with-static-ip.sh  - Start server with static IP support"
    echo "   ./network-status.sh        - Show network configuration"
    echo "   ./mobile-static-ip-setup.sh - Set up static IP configuration"
    echo ""
    echo "🌐 To set up static IP:"
    echo "   curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash"
    echo ""
    echo "🚀 To start the server:"
    echo "   ./start-with-static-ip.sh"
}

# Run main function
main 