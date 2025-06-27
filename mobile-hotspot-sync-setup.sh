#!/bin/bash

# ========================================
# MOBILE HOTSPOT PEER SYNC SETUP
# ========================================
# Setup script for mobile-to-mobile peer sync
# Last updated: 2025-01-27
# ========================================

echo "📱 ========================================"
echo "📱 MOBILE HOTSPOT PEER SYNC SETUP"
echo "📱 ========================================"
echo ""

# Function to get IP address
get_ip_address() {
    ip route get 1.1.1.1 | awk '{print $7}' | head -n1
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

# Function to display network info
display_network_info() {
    echo "🌐 NETWORK INFORMATION"
    echo "====================="
    echo "Current IP: $(get_ip_address)"
    echo "Network Interface: $(ip route | grep default | awk '{print $5}')"
    echo ""
    
    # Check if this device is hotspot provider
    if ip route | grep -q "192.168.43.1"; then
        echo "🔥 HOTSPOT PROVIDER DETECTED"
        echo "============================"
        echo "This device appears to be providing a hotspot"
        echo "Other devices should connect to: 192.168.43.1"
        echo ""
    else
        echo "📱 HOTSPOT CLIENT DETECTED"
        echo "=========================="
        echo "This device appears to be connected to a hotspot"
        echo "Connect to hotspot provider at: 192.168.43.1"
        echo ""
    fi
}

# Function to check backend status
check_backend_status() {
    echo "🔍 CHECKING BACKEND STATUS"
    echo "=========================="
    
    local current_ip=$(get_ip_address)
    
    # Check main backend (port 3000)
    if check_port 3000; then
        echo "✅ Main Backend: http://$current_ip:3000 (RUNNING)"
    else
        echo "❌ Main Backend: http://$current_ip:3000 (NOT RUNNING)"
    fi
    
    # Check peer sync (port 3001)
    if check_port 3001; then
        echo "✅ Peer Sync: http://$current_ip:3001 (RUNNING)"
        echo "🌐 Peer Sync UI: http://$current_ip:3001/mobile-peer-sync-ui.html"
    else
        echo "❌ Peer Sync: http://$current_ip:3001 (NOT RUNNING)"
    fi
    
    # Check TCP server (port 3003)
    if check_port 3003; then
        echo "✅ TCP Server: $current_ip:3003 (RUNNING)"
    else
        echo "❌ TCP Server: $current_ip:3003 (NOT RUNNING)"
    fi
    
    echo ""
}

# Function to start backend
start_backend() {
    echo "🚀 STARTING ENHANCED BACKEND"
    echo "============================"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    # Check if backend file exists
    if [ ! -f "termux-enhanced-backend.js" ]; then
        echo "❌ termux-enhanced-backend.js not found in current directory"
        exit 1
    fi
    
    # Start the backend
    echo "Starting enhanced backend..."
    node termux-enhanced-backend.js &
    
    # Wait a moment for servers to start
    sleep 3
    
    # Check status
    check_backend_status
}

# Function to setup hotspot (Android only)
setup_hotspot() {
    echo "🔥 HOTSPOT SETUP INSTRUCTIONS"
    echo "============================="
    echo "1. Go to Settings → Network & Internet"
    echo "2. Tap 'Hotspot & Tethering'"
    echo "3. Tap 'Wi-Fi Hotspot'"
    echo "4. Turn ON 'Wi-Fi Hotspot'"
    echo "5. Set Network Name: 'Galileosky-Hotspot'"
    echo "6. Set Password: 'galileosky123'"
    echo "7. Note the IP address (usually 192.168.43.1)"
    echo ""
}

# Function to connect to hotspot
connect_hotspot() {
    echo "📱 HOTSPOT CONNECTION INSTRUCTIONS"
    echo "=================================="
    echo "1. Go to Settings → Network & Internet → Wi-Fi"
    echo "2. Find 'Galileosky-Hotspot' in the list"
    echo "3. Tap to connect"
    echo "4. Enter password: 'galileosky123'"
    echo "5. Wait for connection to establish"
    echo "6. Note your assigned IP address"
    echo ""
}

# Function to test peer connection
test_peer_connection() {
    local peer_ip=$1
    echo "🔗 TESTING PEER CONNECTION"
    echo "=========================="
    echo "Testing connection to: $peer_ip"
    
    # Test HTTP connection
    if curl -s --connect-timeout 5 "http://$peer_ip:3001/api/status" > /dev/null; then
        echo "✅ HTTP connection successful"
    else
        echo "❌ HTTP connection failed"
    fi
    
    # Test peer sync endpoint
    if curl -s --connect-timeout 5 "http://$peer_ip:3001/peer/status" > /dev/null; then
        echo "✅ Peer sync connection successful"
    else
        echo "❌ Peer sync connection failed"
    fi
    
    echo ""
}

# Function to show sync instructions
show_sync_instructions() {
    local peer_ip=$1
    echo "🔄 SYNC INSTRUCTIONS"
    echo "===================="
    echo "1. Open browser on this device"
    echo "2. Navigate to: http://$peer_ip:3001/mobile-peer-sync-ui.html"
    echo "3. In 'Peer Server URL' field, enter: http://$peer_ip:3001"
    echo "4. Click 'Add Peer'"
    echo "5. Click 'Test Connection'"
    echo "6. Click '🔄 Sync Data' to start sync"
    echo "7. Monitor progress and results"
    echo ""
}

# Main menu
main_menu() {
    echo "📱 MOBILE HOTSPOT PEER SYNC SETUP"
    echo "=================================="
    echo "1. Display network information"
    echo "2. Check backend status"
    echo "3. Start enhanced backend"
    echo "4. Setup hotspot (instructions)"
    echo "5. Connect to hotspot (instructions)"
    echo "6. Test peer connection"
    echo "7. Show sync instructions"
    echo "8. Exit"
    echo ""
    read -p "Select option (1-8): " choice
    
    case $choice in
        1)
            display_network_info
            ;;
        2)
            check_backend_status
            ;;
        3)
            start_backend
            ;;
        4)
            setup_hotspot
            ;;
        5)
            connect_hotspot
            ;;
        6)
            read -p "Enter peer IP address: " peer_ip
            test_peer_connection $peer_ip
            ;;
        7)
            read -p "Enter peer IP address: " peer_ip
            show_sync_instructions $peer_ip
            ;;
        8)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    main_menu
}

# Check if running in Termux
if [ -d "/data/data/com.termux" ]; then
    echo "✅ Running in Termux environment"
else
    echo "⚠️  Not running in Termux. Some features may not work."
fi

echo ""

# Start main menu
main_menu 