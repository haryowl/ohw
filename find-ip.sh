#!/bin/bash

echo "🔍 Finding your device IP address..."
echo "===================================="

echo "Method 1: Using 'ip' command"
if command -v ip &> /dev/null; then
    echo "IP route method:"
    ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -1
    echo ""
fi

echo "Method 2: Using 'ifconfig'"
if command -v ifconfig &> /dev/null; then
    echo "Network interfaces:"
    ifconfig | grep "inet " | grep -v 127.0.0.1
    echo ""
fi

echo "Method 3: Using 'hostname'"
if command -v hostname &> /dev/null; then
    echo "Hostname -i:"
    hostname -i 2>/dev/null
    echo ""
fi

echo "Method 4: Using 'getprop' (Android specific)"
if command -v getprop &> /dev/null; then
    echo "Android system properties:"
    getprop | grep -i "dhcp\|wifi\|ip" | head -5
    echo ""
fi

echo "📱 Manual IP detection:"
echo "1. Go to Settings > Wi-Fi on your phone"
echo "2. Tap on your connected network"
echo "3. Look for 'IP address'"
echo ""
echo "🌐 Once you have your IP, access the frontend at:"
echo "   http://YOUR_IP_ADDRESS:3001" 