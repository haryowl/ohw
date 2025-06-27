#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# MOBILE HOTSPOT STATIC IP SETUP
# ========================================
# Handles static IP setup for mobile phones in hotspot scenarios
# Works for both hotspot provider and hotspot client
# Last updated: 2025-01-27
# ========================================

set -e

echo "📱 Setting up Static IP for Mobile Hotspot Scenarios..."
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_hotspot() {
    echo -e "${PURPLE}[HOTSPOT]${NC} $1"
}

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Function to detect network scenario
detect_network_scenario() {
    print_status "Detecting network scenario..."
    
    # Try to get current IP
    CURRENT_IP=""
    if command -v ifconfig &> /dev/null; then
        CURRENT_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    else
        CURRENT_IP=$(netstat -rn | grep '^0.0.0.0' | awk '{print $2}' | head -1)
        if [ -z "$CURRENT_IP" ]; then
            CURRENT_IP=$(cat /proc/net/route | grep -v 'Iface' | awk '{print $2}' | head -1)
        fi
    fi
    
    if [ -z "$CURRENT_IP" ]; then
        print_error "Could not detect current IP address"
        return 1
    fi
    
    print_success "Current IP: $CURRENT_IP"
    
    # Detect scenario based on IP range
    if [[ $CURRENT_IP == 192.168.43.* ]]; then
        SCENARIO="HOTSPOT_PROVIDER"
        print_hotspot "Detected: Phone is providing hotspot (192.168.43.x range)"
        print_hotspot "Phone IP: $CURRENT_IP (typically 192.168.43.1)"
        print_hotspot "Other devices connect to this IP"
    elif [[ $CURRENT_IP == 10.0.0.* ]] || [[ $CURRENT_IP == 10.0.1.* ]]; then
        SCENARIO="HOTSPOT_PROVIDER"
        print_hotspot "Detected: Phone is providing hotspot (10.0.x.x range)"
        print_hotspot "Phone IP: $CURRENT_IP (typically 10.0.0.1)"
        print_hotspot "Other devices connect to this IP"
    elif [[ $CURRENT_IP == 192.168.1.* ]] || [[ $CURRENT_IP == 192.168.0.* ]]; then
        SCENARIO="HOTSPOT_CLIENT"
        print_hotspot "Detected: Phone is connected to WiFi/hotspot"
        print_hotspot "Phone IP: $CURRENT_IP"
        print_hotspot "Can set static IP on phone"
    else
        SCENARIO="UNKNOWN"
        print_warning "Unknown network scenario: $CURRENT_IP"
    fi
    
    return 0
}

# Function to get network info for hotspot provider
get_hotspot_provider_info() {
    print_status "Getting hotspot provider network info..."
    
    # For hotspot provider, the phone is typically 192.168.43.1 or 10.0.0.1
    if [[ $CURRENT_IP == 192.168.43.* ]]; then
        NETWORK_PREFIX="192.168.43"
        GATEWAY="192.168.43.1"
        SUBNET_MASK="24"
        DHCP_START="192.168.43.2"
        DHCP_END="192.168.43.254"
        STATIC_RANGE_START="192.168.43.200"
        STATIC_RANGE_END="192.168.43.254"
    elif [[ $CURRENT_IP == 10.0.0.* ]]; then
        NETWORK_PREFIX="10.0.0"
        GATEWAY="10.0.0.1"
        SUBNET_MASK="24"
        DHCP_START="10.0.0.2"
        DHCP_END="10.0.0.254"
        STATIC_RANGE_START="10.0.0.200"
        STATIC_RANGE_END="10.0.0.254"
    elif [[ $CURRENT_IP == 10.0.1.* ]]; then
        NETWORK_PREFIX="10.0.1"
        GATEWAY="10.0.1.1"
        SUBNET_MASK="24"
        DHCP_START="10.0.1.2"
        DHCP_END="10.0.1.254"
        STATIC_RANGE_START="10.0.1.200"
        STATIC_RANGE_END="10.0.1.254"
    fi
    
    print_success "Hotspot provider network configuration:"
    echo "   Network: $NETWORK_PREFIX.0/$SUBNET_MASK"
    echo "   Gateway: $GATEWAY"
    echo "   DHCP Range: $DHCP_START - $DHCP_END"
    echo "   Static Range: $STATIC_RANGE_START - $STATIC_RANGE_END"
}

# Function to get network info for hotspot client
get_hotspot_client_info() {
    print_status "Getting hotspot client network info..."
    
    # Calculate network prefix
    NETWORK_PREFIX=$(echo $CURRENT_IP | cut -d. -f1-3)
    
    # Get gateway
    GATEWAY=""
    if command -v route &> /dev/null; then
        GATEWAY=$(route -n | grep '^0.0.0.0' | awk '{print $2}' | head -1)
    elif [ -f "/proc/net/route" ]; then
        GATEWAY=$(cat /proc/net/route | grep -v 'Iface' | awk '{print $3}' | head -1)
    fi
    
    if [ -z "$GATEWAY" ]; then
        # Guess gateway based on IP
        if [[ $NETWORK_PREFIX == "192.168.1" ]]; then
            GATEWAY="192.168.1.1"
        elif [[ $NETWORK_PREFIX == "192.168.0" ]]; then
            GATEWAY="192.168.0.1"
        else
            GATEWAY="$NETWORK_PREFIX.1"
        fi
    fi
    
    SUBNET_MASK="24"
    SUGGESTED_IP="$NETWORK_PREFIX.200"
    
    print_success "Hotspot client network configuration:"
    echo "   Current IP: $CURRENT_IP"
    echo "   Network: $NETWORK_PREFIX.0/$SUBNET_MASK"
    echo "   Gateway: $GATEWAY"
    echo "   Suggested Static IP: $SUGGESTED_IP"
}

# Function to create hotspot provider configuration
create_hotspot_provider_config() {
    print_status "Creating hotspot provider configuration..."
    
    mkdir -p /data/data/com.termux/files/home/galileosky-parser/config
    
    cat > /data/data/com.termux/files/home/galileosky-parser/config/hotspot-provider.json << EOF
{
  "hotspot_provider": {
    "enabled": true,
    "phone_ip": "$CURRENT_IP",
    "gateway": "$GATEWAY",
    "subnet_mask": "$SUBNET_MASK",
    "network": "$NETWORK_PREFIX.0/$SUBNET_MASK",
    "dhcp_range": "$DHCP_START - $DHCP_END",
    "static_range": "$STATIC_RANGE_START - $STATIC_RANGE_END",
    "description": "Mobile phone providing hotspot"
  },
  "server": {
    "http_port": 3000,
    "peer_sync_port": 3001,
    "tcp_port": 3003,
    "host": "0.0.0.0"
  },
  "client_instructions": {
    "title": "Instructions for devices connecting to this hotspot",
    "steps": [
      "Connect to this phone's hotspot",
      "Set static IP in range: $STATIC_RANGE_START - $STATIC_RANGE_END",
      "Set Gateway to: $GATEWAY",
      "Set DNS to: 8.8.8.8",
      "Connect to server at: $CURRENT_IP:3000"
    ]
  },
  "network": {
    "scenario": "HOTSPOT_PROVIDER",
    "last_updated": "$(date -Iseconds)"
  }
}
EOF
    
    print_success "Hotspot provider configuration created"
}

# Function to create hotspot client configuration
create_hotspot_client_config() {
    print_status "Creating hotspot client configuration..."
    
    mkdir -p /data/data/com.termux/files/home/galileosky-parser/config
    
    cat > /data/data/com.termux/files/home/galileosky-parser/config/hotspot-client.json << EOF
{
  "hotspot_client": {
    "enabled": true,
    "current_ip": "$CURRENT_IP",
    "static_ip": "$SUGGESTED_IP",
    "gateway": "$GATEWAY",
    "subnet_mask": "$SUBNET_MASK",
    "network": "$NETWORK_PREFIX.0/$SUBNET_MASK",
    "description": "Mobile phone connected to hotspot"
  },
  "server": {
    "http_port": 3000,
    "peer_sync_port": 3001,
    "tcp_port": 3003,
    "host": "0.0.0.0"
  },
  "setup_instructions": {
    "title": "Static IP Setup Instructions",
    "steps": [
      "Go to Android Settings > Network & Internet > WiFi",
      "Long press your WiFi network > Modify network",
      "Expand Advanced options",
      "Set IP settings to 'Static'",
      "Set IP address to: $SUGGESTED_IP",
      "Set Gateway to: $GATEWAY",
      "Set Network prefix length to: $SUBNET_MASK",
      "Save the configuration"
    ]
  },
  "network": {
    "scenario": "HOTSPOT_CLIENT",
    "last_updated": "$(date -Iseconds)"
  }
}
EOF
    
    print_success "Hotspot client configuration created"
}

# Function to create connection info
create_connection_info() {
    print_status "Creating connection information..."
    
    cd /data/data/com.termux/files/home/galileosky-parser
    
    if [ "$SCENARIO" = "HOTSPOT_PROVIDER" ]; then
        cat > connection-info-hotspot-provider.txt << EOF
📱 MOBILE HOTSPOT PROVIDER SETUP
=================================
Phone IP: $CURRENT_IP
Network: $NETWORK_PREFIX.0/$SUBNET_MASK
Gateway: $GATEWAY

🌐 SERVER URLs (for other devices):
===================================
Mobile Interface: http://$CURRENT_IP:3000
Peer Sync Interface: http://$CURRENT_IP:3001/mobile-peer-sync-ui.html
TCP Server: $CURRENT_IP:3003

📋 INSTRUCTIONS FOR CONNECTING DEVICES:
======================================
1. Connect to this phone's hotspot
2. Set static IP in range: $STATIC_RANGE_START - $STATIC_RANGE_END
3. Set Gateway to: $GATEWAY
4. Set DNS to: 8.8.8.8
5. Access server at: http://$CURRENT_IP:3000

💡 TIPS:
========
- Phone IP is typically static when providing hotspot
- Other devices should use static IPs in the suggested range
- Server is accessible from any device connected to this hotspot

📅 Last updated: $(date)
EOF
        print_success "Created connection-info-hotspot-provider.txt"
        
    elif [ "$SCENARIO" = "HOTSPOT_CLIENT" ]; then
        cat > connection-info-hotspot-client.txt << EOF
📱 MOBILE HOTSPOT CLIENT SETUP
==============================
Current IP: $CURRENT_IP
Suggested Static IP: $SUGGESTED_IP
Network: $NETWORK_PREFIX.0/$SUBNET_MASK
Gateway: $GATEWAY

🌐 SERVER URLs (after static IP setup):
=======================================
Mobile Interface: http://$SUGGESTED_IP:3000
Peer Sync Interface: http://$SUGGESTED_IP:3001/mobile-peer-sync-ui.html
TCP Server: $SUGGESTED_IP:3003

🔧 STATIC IP SETUP INSTRUCTIONS:
================================
1. Go to Android Settings > Network & Internet > WiFi
2. Long press your WiFi network > Modify network
3. Expand Advanced options
4. Set IP settings to 'Static'
5. Set IP address to: $SUGGESTED_IP
6. Set Gateway to: $GATEWAY
7. Set Network prefix length to: $SUBNET_MASK
8. Save the configuration

💡 TIPS:
========
- Static IP ensures consistent server address
- Other devices can connect reliably to your server
- Server will be accessible at the static IP address

📅 Last updated: $(date)
EOF
        print_success "Created connection-info-hotspot-client.txt"
    fi
}

# Function to create startup script
create_hotspot_startup_script() {
    print_status "Creating hotspot startup script..."
    
    cd /data/data/com.termux/files/home/galileosky-parser
    
    cat > start-hotspot-server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# HOTSPOT SERVER STARTUP SCRIPT
# ========================================
# Starts Galileosky server optimized for hotspot scenarios
# Last updated: 2025-01-27
# ========================================

set -e

echo "📱 Starting Galileosky Hotspot Server..."
echo "======================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Check scenario
if [ -f "config/hotspot-provider.json" ]; then
    echo -e "${PURPLE}📡 Hotspot Provider Mode${NC}"
    PHONE_IP=$(grep '"phone_ip"' config/hotspot-provider.json | cut -d'"' -f4)
    echo -e "${BLUE}Phone IP: $PHONE_IP${NC}"
    echo -e "${GREEN}Other devices connect to: http://$PHONE_IP:3000${NC}"
elif [ -f "config/hotspot-client.json" ]; then
    echo -e "${PURPLE}📱 Hotspot Client Mode${NC}"
    STATIC_IP=$(grep '"static_ip"' config/hotspot-client.json | cut -d'"' -f4)
    echo -e "${BLUE}Static IP: $STATIC_IP${NC}"
    echo -e "${GREEN}Server accessible at: http://$STATIC_IP:3000${NC}"
else
    echo -e "${YELLOW}⚠️  No hotspot configuration found${NC}"
    echo -e "${BLUE}💡 Run the hotspot setup script first${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    pkg update -y
    pkg install nodejs -y
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Start server
echo -e "${GREEN}🚀 Starting server...${NC}"
echo ""

if [ -f "termux-peer-sync-backend.js" ]; then
    node termux-peer-sync-backend.js
elif [ -f "termux-enhanced-backend.js" ]; then
    node termux-enhanced-backend.js
else
    echo -e "${YELLOW}⚠️  No backend file found. Creating simple backend...${NC}"
    curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-simple-backend.js > termux-simple-backend.js
    node termux-simple-backend.js
fi
EOF
    
    chmod +x start-hotspot-server.sh
    print_success "Created start-hotspot-server.sh"
}

# Main execution
main() {
    if ! detect_network_scenario; then
        print_error "Failed to detect network scenario"
        exit 1
    fi
    
    echo ""
    print_hotspot "Network Scenario: $SCENARIO"
    echo ""
    
    if [ "$SCENARIO" = "HOTSPOT_PROVIDER" ]; then
        get_hotspot_provider_info
        echo ""
        print_hotspot "📡 PHONE IS PROVIDING HOTSPOT"
        print_hotspot "Phone IP: $CURRENT_IP (static from carrier)"
        print_hotspot "Other devices connect to this IP"
        echo ""
        read -p "Create hotspot provider configuration? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_hotspot_provider_config
            create_connection_info
            create_hotspot_startup_script
        fi
        
    elif [ "$SCENARIO" = "HOTSPOT_CLIENT" ]; then
        get_hotspot_client_info
        echo ""
        print_hotspot "📱 PHONE IS CONNECTED TO HOTSPOT"
        print_hotspot "Current IP: $CURRENT_IP"
        print_hotspot "Suggested Static IP: $SUGGESTED_IP"
        echo ""
        read -p "Create hotspot client configuration and set up static IP? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_hotspot_client_config
            create_connection_info
            create_hotspot_startup_script
        fi
        
    else
        print_warning "Unknown scenario. Manual configuration may be required."
    fi
    
    echo ""
    echo "🎉 Hotspot Configuration Complete!"
    echo "=================================="
    echo ""
    print_success "Configuration files created successfully!"
    echo ""
    echo "📋 Next Steps:"
    if [ "$SCENARIO" = "HOTSPOT_PROVIDER" ]; then
        echo "   1. Start the server: ./start-hotspot-server.sh"
        echo "   2. Other devices connect to: http://$CURRENT_IP:3000"
        echo "   3. See connection-info-hotspot-provider.txt for details"
    elif [ "$SCENARIO" = "HOTSPOT_CLIENT" ]; then
        echo "   1. Set static IP in Android WiFi settings"
        echo "   2. Start the server: ./start-hotspot-server.sh"
        echo "   3. Server will be at: http://$SUGGESTED_IP:3000"
        echo "   4. See connection-info-hotspot-client.txt for details"
    fi
    echo ""
}

# Run main function
main 