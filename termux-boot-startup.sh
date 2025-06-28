#!/data/data/com.termux/files/usr/bin/bash

# OHW Parser - Termux Boot Auto-Start Script
# This script will be executed when Termux starts up

# Set the project directory
PROJECT_DIR="$HOME/galileosky-parser"
LOG_FILE="$HOME/ohw-boot.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Create log file if it doesn't exist
touch "$LOG_FILE"

log_message "Termux boot script started"

# Wait a bit for system to fully boot
sleep 10

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_message "ERROR: Project directory not found at $PROJECT_DIR"
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR" || {
    log_message "ERROR: Cannot navigate to project directory"
    exit 1
}

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    log_message "ERROR: Node.js not found"
    exit 1
fi

# Check if the backend server file exists
if [ ! -f "backend/src/server.js" ]; then
    log_message "ERROR: Backend server file not found"
    exit 1
fi

# Start the server in background
log_message "Starting OHW Parser server..."
nohup node backend/src/server.js > "$HOME/ohw-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID for later use
echo $SERVER_PID > "$HOME/ohw-server.pid"

# Wait a moment and check if server started successfully
sleep 5
if kill -0 $SERVER_PID 2>/dev/null; then
    log_message "SUCCESS: OHW Parser server started with PID $SERVER_PID"
    log_message "Server logs: $HOME/ohw-server.log"
    log_message "Server running on port 3001"
else
    log_message "ERROR: Failed to start OHW Parser server"
    exit 1
fi

log_message "Boot script completed successfully" 