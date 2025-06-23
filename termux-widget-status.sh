#!/data/data/com.termux/files/usr/bin/bash

# Galileosky Server Status Widget Script
# Place this file in ~/.shortcuts/ directory in Termux

# Set the project directory
PROJECT_DIR="/data/data/com.termux/files/home/gali-parse"

# Change to project directory
cd "$PROJECT_DIR"

echo "=== Galileosky Server Status ==="

# Check if server is running
if pgrep -f "node.*server.js" > /dev/null || pgrep -f "node.*termux-enhanced-backend.js" > /dev/null; then
    echo "✅ Server is RUNNING"
    echo ""
    echo "Processes:"
    ps aux | grep -E "(node.*server|termux-enhanced)" | grep -v grep
    
    echo ""
    echo "Ports in use:"
    netstat -tlnp 2>/dev/null | grep -E ":3001|:3000" || echo "No ports found"
    
    echo ""
    echo "Access URLs:"
    echo "Frontend: http://localhost:3001"
    echo "API: http://localhost:3001/api"
else
    echo "❌ Server is NOT RUNNING"
    echo ""
    echo "To start server, run:"
    echo "cd $PROJECT_DIR"
    echo "node termux-enhanced-backend.js"
fi 