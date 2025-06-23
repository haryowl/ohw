#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Server Start Widget Script
# Place this file in ~/.shortcuts/ directory in Termux

# Set the project directory
PROJECT_DIR="/data/data/com.termux/files/home/gali-parse"

# Change to project directory
cd "$PROJECT_DIR"

# Check if backend is already running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "Server is already running!"
    exit 0
fi

# Start the server
echo "Starting Galileosky Server..."
echo "Project: $PROJECT_DIR"

# Start the enhanced backend
node termux-enhanced-backend.js

# Alternative commands you can uncomment:
# node backend/src/server.js
# npm start
# pm2 start ecosystem.config.js 