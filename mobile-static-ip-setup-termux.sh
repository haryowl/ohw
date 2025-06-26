#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# MOBILE STATIC IP SETUP FOR GALILEOSKY PARSER (TERMUX)
# ========================================
# Sets up static IP configuration for mobile server
# Compatible with Termux environment
# Last updated: 2025-01-27
# ========================================

set -e  # Exit on any error

echo "🌐 Setting up Static IP for Galileosky Parser Mobile Server..."
echo "============================================================="

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

# Function to get current network info using Termux-compatible commands
get_network_info() {
    print_status "Detecting current network configuration..."
    
    # Try to get IP using ifconfig (if available)
    if command -v ifconfig &> /dev/null; then
        CURRENT_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
        print_success "Using ifconfig to detect IP"
    else
        # Try using netstat
        CURRENT_IP=$(netstat -rn | grep '^0.0.0.0' | awk '{print $2}' | head -1)
        if [ -z "$CURRENT_IP" ]; then
            # Try using /proc/net/route
            CURRENT_IP=$(cat /proc/net/route | grep -v 'Iface' | awk '{print $2}' | head -1)
        fi
        print_success "Using netstat/proc to detect IP"
    fi
    
    if [ -z "$CURRENT_IP" ]; then
        print_error "Could not detect current IP address"
        print_status "Please ensure WiFi is connected"
        print_status "You can manually set the IP address later"
        CURRENT_IP="192.168.1.100"  # Default fallback
    fi
    
    # Get gateway (try multiple methods)
    GATEWAY=""
    if command -v route &> /dev/null; then
        GATEWAY=$(route -n | grep '^0.0.0.0' | awk '{print $2}' | head -1)
    elif [ -f "/proc/net/route" ]; then
        GATEWAY=$(cat /proc/net/route | grep -v 'Iface' | awk '{print $3}' | head -1)
    fi
    
    if [ -z "$GATEWAY" ]; then
        print_warning "Could not detect gateway, using common defaults"
        # Try to guess gateway from IP
        if [[ $CURRENT_IP == 192.168.* ]]; then
            GATEWAY="192.168.1.1"
        elif [[ $CURRENT_IP == 10.0.* ]]; then
            GATEWAY="10.0.0.1"
        else
            GATEWAY="192.168.1.1"
        fi
    fi
    
    # Set subnet mask
    SUBNET_MASK="24"
    
    # Calculate network prefix
    NETWORK_PREFIX=$(echo $CURRENT_IP | cut -d. -f1-3)
    
    print_success "Current network configuration:"
    echo "   Current IP: $CURRENT_IP"
    echo "   Gateway: $GATEWAY"
    echo "   Subnet: $NETWORK_PREFIX.0/$SUBNET_MASK"
}

# Function to suggest static IP
suggest_static_ip() {
    print_status "Suggesting static IP configuration..."
    
    # Suggest IP in the range 192.168.1.200-254 or 10.0.0.200-254
    if [[ $NETWORK_PREFIX == "192.168.1" ]]; then
        SUGGESTED_IP="$NETWORK_PREFIX.200"
    elif [[ $NETWORK_PREFIX == "10.0.0" ]] || [[ $NETWORK_PREFIX == "10.0.1" ]]; then
        SUGGESTED_IP="$NETWORK_PREFIX.200"
    else
        # For other networks, use .200
        SUGGESTED_IP="$NETWORK_PREFIX.200"
    fi
    
    print_success "Suggested static IP: $SUGGESTED_IP"
    echo "   This IP should be available in your network"
    echo "   Other devices can connect to: http://$SUGGESTED_IP:3000"
    echo "   Peer sync available at: http://$SUGGESTED_IP:3001"
}

# Function to create static IP configuration
create_static_config() {
    print_status "Creating static IP configuration..."
    
    # Create config directory
    mkdir -p /data/data/com.termux/files/home/galileosky-parser/config
    
    # Create static IP config
    cat > /data/data/com.termux/files/home/galileosky-parser/config/static-ip.json << EOF
{
  "static_ip": {
    "enabled": true,
    "interface": "wlan0",
    "ip_address": "$SUGGESTED_IP",
    "gateway": "$GATEWAY",
    "subnet_mask": "$SUBNET_MASK",
    "dns_servers": ["8.8.8.8", "8.8.4.4"],
    "description": "Static IP for Galileosky Parser Mobile Server"
  },
  "server": {
    "http_port": 3000,
    "peer_sync_port": 3001,
    "tcp_port": 3003,
    "host": "0.0.0.0"
  },
  "network": {
    "current_ip": "$CURRENT_IP",
    "network_prefix": "$NETWORK_PREFIX",
    "last_updated": "$(date -Iseconds)"
  }
}
EOF
    
    print_success "Static IP configuration created:"
    echo "   File: /data/data/com.termux/files/home/galileosky-parser/config/static-ip.json"
}

# Function to create network setup script
create_network_script() {
    print_status "Creating network setup script..."
    
    cat > /data/data/com.termux/files/home/galileosky-parser/setup-static-ip.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Parser Static IP Setup Script
# This script configures static IP for the mobile server

set -e

# Load configuration
CONFIG_FILE="/data/data/com.termux/files/home/galileosky-parser/config/static-ip.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found. Run mobile-static-ip-setup-termux.sh first."
    exit 1
fi

# Parse configuration
STATIC_IP=$(grep '"ip_address"' "$CONFIG_FILE" | cut -d'"' -f4)
GATEWAY=$(grep '"gateway"' "$CONFIG_FILE" | cut -d'"' -f4)
SUBNET_MASK=$(grep '"subnet_mask"' "$CONFIG_FILE" | cut -d'"' -f4)

echo "🌐 Setting up static IP: $STATIC_IP"
echo "=================================="

echo "📋 Manual setup instructions:"
echo "   1. Go to Android Settings > Network & Internet > WiFi"
echo "   2. Long press your WiFi network > Modify network"
echo "   3. Expand Advanced options"
echo "   4. Set IP settings to 'Static'"
echo "   5. Set IP address to: $STATIC_IP"
echo "   6. Set Gateway to: $GATEWAY"
echo "   7. Set Network prefix length to: $SUBNET_MASK"
echo "   8. Save the configuration"
echo ""
echo "🔄 After setting static IP, restart the Galileosky server"
EOF
    
    chmod +x /data/data/com.termux/files/home/galileosky-parser/setup-static-ip.sh
    
    print_success "Network setup script created:"
    echo "   File: /data/data/com.termux/files/home/galileosky-parser/setup-static-ip.sh"
}

# Function to update startup scripts with static IP
update_startup_scripts() {
    print_status "Updating startup scripts with static IP..."
    
    cd /data/data/com.termux/files/home/galileosky-parser
    
    # Update mobile server startup script
    if [ -f "start-mobile-server.sh" ]; then
        sed -i "s/localhost:3000/$SUGGESTED_IP:3000/g" start-mobile-server.sh
        sed -i "s/localhost:3001/$SUGGESTED_IP:3001/g" start-mobile-server.sh
        print_success "Updated start-mobile-server.sh"
    fi
    
    # Update peer sync startup script
    if [ -f "start-peer-sync.sh" ]; then
        sed -i "s/localhost:3001/$SUGGESTED_IP:3001/g" start-peer-sync.sh
        print_success "Updated start-peer-sync.sh"
    fi
    
    # Update simple startup script
    if [ -f "start-simple.sh" ]; then
        sed -i "s/localhost:3000/$SUGGESTED_IP:3000/g" start-simple.sh
        print_success "Updated start-simple.sh"
    fi
}

# Function to create QR codes for easy connection
create_qr_codes() {
    print_status "Creating QR codes for easy connection..."
    
    cd /data/data/com.termux/files/home/galileosky-parser
    
    # Create QR code directory
    mkdir -p qr-codes
    
    # Create QR code for HTTP interface
    cat > qr-codes/http-interface.txt << EOF
Galileosky Parser Mobile Interface
==================================
URL: http://$SUGGESTED_IP:3000
IP: $SUGGESTED_IP
Port: 3000
EOF
    
    # Create QR code for peer sync interface
    cat > qr-codes/peer-sync-interface.txt << EOF
Galileosky Parser Peer Sync Interface
=====================================
URL: http://$SUGGESTED_IP:3001/mobile-peer-sync-ui.html
IP: $SUGGESTED_IP
Port: 3001
EOF
    
    # Create connection info file
    cat > connection-info.txt << EOF
🌐 GALILEOSKY PARSER MOBILE SERVER
==================================
Static IP: $SUGGESTED_IP
Gateway: $GATEWAY
Subnet: $NETWORK_PREFIX.0/$SUBNET_MASK

📱 ACCESS URLs:
===============
Mobile Interface: http://$SUGGESTED_IP:3000
Peer Sync Interface: http://$SUGGESTED_IP:3001/mobile-peer-sync-ui.html
TCP Server: $SUGGESTED_IP:3003

🔧 SETUP INSTRUCTIONS:
======================
1. Go to Android Settings > Network & Internet > WiFi
2. Long press your WiFi network > Modify network
3. Expand Advanced options
4. Set IP settings to 'Static'
5. Set IP address to: $SUGGESTED_IP
6. Set Gateway to: $GATEWAY
7. Set Network prefix length to: $SUBNET_MASK
8. Save the configuration

📋 STARTUP COMMANDS:
====================
./start-mobile-server.sh  - Start mobile server
./start-peer-sync.sh      - Start with peer sync
./start-simple.sh         - Start simple server

📅 Last updated: $(date)
EOF
    
    print_success "QR codes and connection info created:"
    echo "   qr-codes/http-interface.txt"
    echo "   qr-codes/peer-sync-interface.txt"
    echo "   connection-info.txt"
}

# Function to create enhanced startup script
create_enhanced_startup() {
    print_status "Creating enhanced startup script..."
    
    cat > /data/data/com.termux/files/home/galileosky-parser/start-with-static-ip.sh << 'EOF'
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
    echo "   curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup-termux.sh | bash"
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
    
    chmod +x /data/data/com.termux/files/home/galileosky-parser/start-with-static-ip.sh
    print_success "Created enhanced startup script: start-with-static-ip.sh"
}

# Main execution
main() {
    get_network_info
    suggest_static_ip
    
    echo ""
    read -p "Do you want to proceed with static IP setup? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setup cancelled"
        exit 0
    fi
    
    create_static_config
    create_network_script
    update_startup_scripts
    create_qr_codes
    create_enhanced_startup
    
    echo ""
    echo "🎉 Static IP Setup Complete!"
    echo "============================"
    echo ""
    print_success "Static IP configuration created successfully!"
    echo ""
    echo "📱 Your Galileosky Parser server will be available at:"
    echo "   Mobile Interface: http://$SUGGESTED_IP:3000"
    echo "   Peer Sync Interface: http://$SUGGESTED_IP:3001/mobile-peer-sync-ui.html"
    echo "   TCP Server: $SUGGESTED_IP:3003"
    echo ""
    echo "🔧 To apply static IP configuration:"
    echo "   1. Go to Android Settings > Network & Internet > WiFi"
    echo "   2. Long press your WiFi network > Modify network"
    echo "   3. Expand Advanced options"
    echo "   4. Set IP settings to 'Static'"
    echo "   5. Set IP address to: $SUGGESTED_IP"
    echo "   6. Set Gateway to: $GATEWAY"
    echo "   7. Set Network prefix length to: $SUBNET_MASK"
    echo "   8. Save the configuration"
    echo ""
    echo "📋 For detailed instructions, see: connection-info.txt"
    echo ""
    echo "🚀 Ready to start? Run: ./start-with-static-ip.sh"
}

# Run main function
main 