#!/bin/bash

# 🛰️ Galileosky Parser - One-Command Mobile Installation
# Run this script to install the Galileosky parser on your mobile phone

echo "========================================"
echo "  Galileosky Parser - Mobile Installer"
echo "========================================"

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo "❌ This script must be run in Termux on Android"
    echo "Please install Termux from F-Droid or Google Play Store"
    exit 1
fi

echo "📱 Installing Galileosky Parser on your mobile phone..."
echo ""

# Update packages and install dependencies
echo "📦 Installing required packages..."
pkg update -y
pkg install -y nodejs git sqlite wget curl

# Clone or update repository
echo "📥 Downloading OHW Parser..."
cd ~
if [ -d "ohw" ]; then
    echo "🔄 Updating existing installation..."
    cd ohw
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/haryowl/ohw.git
    cd ohw
fi

# Run the full installation script
echo "🔧 Running installation..."
chmod +x install-ohw-mobile.sh
./install-ohw-mobile.sh

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📱 Quick Start:"
echo "1. Run: ~/galileosky-start.sh"
echo "2. Open browser: http://localhost:3001"
echo "3. For mobile interface: http://localhost:3001/mobile"
echo "4. For peer sync: http://localhost:3001/peer-sync"
echo ""
echo "📞 Need help? Check: ~/galileosky-status.sh" 