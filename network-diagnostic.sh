#!/bin/bash

# ========================================
# NETWORK DIAGNOSTIC SCRIPT
# ========================================
# Helps identify network configuration for peer sync
# Last updated: 2025-01-27
# ========================================

echo "🔍 ========================================"
echo "🔍 NETWORK DIAGNOSTIC SCRIPT"
echo "🔍 ========================================"
echo ""

# Function to get IP address
get_ip_address() {
    ip route get 1.1.1.1 | awk '{print $7}' | head -n1
}

# Function to get network interface
get_network_interface() {
    ip route | grep default | awk '{print $5}' | head -n1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if netstat -tuln | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Function to test connectivity
test_connectivity() {
    local target_ip=$1
    local port=$2
    local description=$3
    
    echo "Testing $description..."
    
    # Test ping
    if ping -c 1 -W 2 $target_ip > /dev/null 2>&1; then
        echo "  ✅ Ping: OK"
    else
        echo "  ❌ Ping: Failed"
        return 1
    fi
    
    # Test port
    if timeout 3 bash -c "</dev/tcp/$target_ip/$port" 2>/dev/null; then
        echo "  ✅ Port $port: OK"
        return 0
    else
        echo "  ❌ Port $port: Failed"
        return 1
    fi
}

# Get current network info
current_ip=$(get_ip_address)
network_interface=$(get_network_interface)

echo "🌐 CURRENT NETWORK INFORMATION"
echo "=============================="
echo "Current IP: $current_ip"
echo "Network Interface: $network_interface"
echo ""

# Detect network type
if [[ $current_ip == 192.168.43.* ]]; then
    echo "🔥 HOTSPOT NETWORK DETECTED"
    echo "============================"
    echo "This appears to be a mobile hotspot network"
    echo "Hotspot Provider IP: 192.168.43.1"
    echo "Your IP: $current_ip"
    echo ""
elif [[ $current_ip == 192.168.10.* ]]; then
    echo "🏠 LOCAL NETWORK DETECTED"
    echo "=========================="
    echo "This appears to be a local WiFi network"
    echo "Router IP: 192.168.10.1"
    echo "Your IP: $current_ip"
    echo ""
else
    echo "🌍 OTHER NETWORK DETECTED"
    echo "========================="
    echo "Network: $current_ip"
    echo ""
fi

# Check local services
echo "🔍 LOCAL SERVICES STATUS"
echo "========================"

if check_port 3000; then
    echo "✅ Main Backend (3000): RUNNING"
    echo "   URL: http://$current_ip:3000"
else
    echo "❌ Main Backend (3000): NOT RUNNING"
fi

if check_port 3001; then
    echo "✅ Peer Sync (3001): RUNNING"
    echo "   URL: http://$current_ip:3001"
    echo "   UI: http://$current_ip:3001/mobile-peer-sync-ui.html"
else
    echo "❌ Peer Sync (3001): NOT RUNNING"
fi

if check_port 3003; then
    echo "✅ TCP Server (3003): RUNNING"
    echo "   Address: $current_ip:3003"
else
    echo "❌ TCP Server (3003): NOT RUNNING"
fi

echo ""

# Test common peer IPs
echo "🔗 TESTING COMMON PEER IPs"
echo "=========================="

# Test hotspot provider IP
if [[ $current_ip != 192.168.43.1 ]]; then
    test_connectivity "192.168.43.1" 3001 "Hotspot Provider (192.168.43.1)"
    if [ $? -eq 0 ]; then
        echo "  🎯 RECOMMENDED: Use 192.168.43.1 as peer IP"
    fi
    echo ""
fi

# Test local network peers
if [[ $current_ip == 192.168.10.* ]]; then
    for i in {1..10}; do
        if [[ $current_ip != "192.168.10.$i" ]]; then
            test_connectivity "192.168.10.$i" 3001 "Local Peer (192.168.10.$i)"
            if [ $? -eq 0 ]; then
                echo "  🎯 FOUND PEER: 192.168.10.$i"
            fi
        fi
    done
    echo ""
fi

# Test the specific IP from logs
if [[ $current_ip != 192.168.10.167 ]]; then
    test_connectivity "192.168.10.167" 3001 "Specific Peer (192.168.10.167)"
    if [ $? -eq 0 ]; then
        echo "  🎯 FOUND PEER: 192.168.10.167"
    fi
    echo ""
fi

echo "📋 TROUBLESHOOTING TIPS"
echo "======================="
echo "1. If no peers found, ensure the other device is running the backend"
echo "2. Check firewall settings on both devices"
echo "3. Verify both devices are on the same network"
echo "4. Try restarting the backend on both devices"
echo ""

echo "🚀 QUICK SETUP COMMANDS"
echo "======================="
echo "# Start backend:"
echo "node termux-enhanced-backend.js"
echo ""
echo "# Test peer connection:"
echo "curl http://PEER_IP:3001/peer/status"
echo ""
echo "# Access peer sync UI:"
echo "http://PEER_IP:3001/mobile-peer-sync-ui.html"
echo "" 