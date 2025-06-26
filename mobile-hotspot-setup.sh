#!/data/data/com.termux/files/usr/bin/bash

# ========================================
# MOBILE HOTSPOT STATIC IP SETUP
# ========================================
# Handles static IP setup for mobile phones in hotspot scenarios
# Last updated: 2025-01-27
# ========================================

set -e

echo "📱 Mobile Hotspot Static IP Setup"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_hotspot() {
    echo -e "${PURPLE}[HOTSPOT]${NC} $1"
}

# Get current IP
get_current_ip() {
    if command -v ifconfig &> /dev/null; then
        CURRENT_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    else
        CURRENT_IP=$(netstat -rn | grep '^0.0.0.0' | awk '{print $2}' | head -1)
    fi
    
    if [ -z "$CURRENT_IP" ]; then
        print_warning "Could not detect IP, using default"
        CURRENT_IP="192.168.1.100"
    fi
    
    echo "$CURRENT_IP"
}

# Detect scenario
detect_scenario() {
    local ip="$1"
    
    if [[ $ip == 192.168.43.* ]]; then
        echo "PROVIDER"
    elif [[ $ip == 10.0.0.* ]] || [[ $ip == 10.0.1.* ]]; then
        echo "PROVIDER"
    else
        echo "CLIENT"
    fi
}

# Main execution
main() {
    CURRENT_IP=$(get_current_ip)
    SCENARIO=$(detect_scenario "$CURRENT_IP")
    
    print_info "Current IP: $CURRENT_IP"
    print_info "Scenario: $SCENARIO"
    echo ""
    
    if [ "$SCENARIO" = "PROVIDER" ]; then
        print_hotspot "📡 PHONE IS PROVIDING HOTSPOT"
        print_hotspot "Phone IP: $CURRENT_IP (typically static)"
        print_hotspot "Other devices connect to this IP"
        echo ""
        print_success "Server URLs for other devices:"
        echo "   Mobile Interface: http://$CURRENT_IP:3000"
        echo "   Peer Sync: http://$CURRENT_IP:3001/mobile-peer-sync-ui.html"
        echo "   TCP Server: $CURRENT_IP:3003"
        echo ""
        print_info "Instructions for connecting devices:"
        echo "   1. Connect to this phone's hotspot"
        echo "   2. Set static IP in range: 192.168.43.200-254"
        echo "   3. Set Gateway to: 192.168.43.1"
        echo "   4. Access server at: http://$CURRENT_IP:3000"
        
    else
        print_hotspot "📱 PHONE IS CONNECTED TO HOTSPOT"
        print_hotspot "Current IP: $CURRENT_IP"
        print_hotspot "Can set static IP on phone"
        echo ""
        
        # Calculate suggested static IP
        NETWORK_PREFIX=$(echo $CURRENT_IP | cut -d. -f1-3)
        SUGGESTED_IP="$NETWORK_PREFIX.200"
        
        print_success "Suggested static IP: $SUGGESTED_IP"
        echo ""
        print_info "To set static IP:"
        echo "   1. Go to Android Settings > Network & Internet > WiFi"
        echo "   2. Long press your WiFi network > Modify network"
        echo "   3. Expand Advanced options"
        echo "   4. Set IP settings to 'Static'"
        echo "   5. Set IP address to: $SUGGESTED_IP"
        echo "   6. Set Gateway to: $NETWORK_PREFIX.1"
        echo "   7. Set Network prefix length to: 24"
        echo "   8. Save the configuration"
        echo ""
        print_success "After static IP setup, server will be at:"
        echo "   http://$SUGGESTED_IP:3000"
    fi
    
    echo ""
    print_success "Ready to start server!"
    echo "Run: ./start-peer-sync.sh"
}

main 