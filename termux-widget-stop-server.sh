#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Server Stop Widget Script
# Place this file in ~/.shortcuts/ directory in Termux

# Set the project directory
PROJECT_DIR="/data/data/com.termux/files/home/gali-parse"

# Change to project directory
cd "$PROJECT_DIR"

# Stop the server
echo "Stopping Galileosky Server..."

# Kill Node.js processes
pkill -f "node.*server.js"
pkill -f "node.*termux-enhanced-backend.js"

# Stop PM2 processes if using PM2
if command -v pm2 &> /dev/null; then
    pm2 stop all
    pm2 delete all
fi

echo "Server stopped!" 