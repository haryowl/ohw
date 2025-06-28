#!/bin/bash

echo "🚀 Setting up Mobile Synchronization System"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_success "Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm is installed: $(npm --version)"

# Install required dependencies
print_status "Installing dependencies..."
npm install express cors socket.io

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create directories
print_status "Creating directories..."
mkdir -p mobile-sync-data
mkdir -p logs

# Set permissions
chmod +x mobile-sync-service.js
chmod +x mobile-sync-client.js

print_success "Directories created and permissions set"

# Create configuration file
print_status "Creating configuration file..."
cat > mobile-sync-config.json << EOF
{
    "syncServer": {
        "port": 3002,
        "host": "0.0.0.0"
    },
    "mobileDevices": {
        "device1": {
            "id": "mobile-phone-1",
            "name": "Mobile Phone 1",
            "syncServerUrl": "http://YOUR_SERVER_IP:3002"
        },
        "device2": {
            "id": "mobile-phone-2", 
            "name": "Mobile Phone 2",
            "syncServerUrl": "http://YOUR_SERVER_IP:3002"
        }
    },
    "syncSettings": {
        "autoSyncInterval": 5,
        "maxRecords": 200000,
        "enableRealTimeSync": true
    }
}
EOF

print_success "Configuration file created: mobile-sync-config.json"

# Create startup script
print_status "Creating startup script..."
cat > start-mobile-sync.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Mobile Sync Service..."

# Load configuration
if [ -f "mobile-sync-config.json" ]; then
    echo "📋 Loading configuration..."
else
    echo "❌ Configuration file not found. Please run setup-mobile-sync.sh first."
    exit 1
fi

# Start the sync service
echo "📡 Starting sync server on port 3002..."
node mobile-sync-service.js &

# Save PID
echo $! > mobile-sync.pid

echo "✅ Mobile Sync Service started"
echo "📱 API: http://0.0.0.0:3002/api/"
echo "🔌 WebSocket: ws://0.0.0.0:3002"
echo "📊 Status: http://0.0.0.0:3002/api/sync/status"
echo ""
echo "To stop the service: ./stop-mobile-sync.sh"
EOF

chmod +x start-mobile-sync.sh

# Create stop script
cat > stop-mobile-sync.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Mobile Sync Service..."

if [ -f "mobile-sync.pid" ]; then
    PID=$(cat mobile-sync.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Service stopped (PID: $PID)"
    else
        echo "⚠️  Service was not running"
    fi
    rm -f mobile-sync.pid
else
    echo "⚠️  PID file not found"
fi
EOF

chmod +x stop-mobile-sync.sh

# Create integration script for Termux backend
print_status "Creating Termux backend integration script..."
cat > integrate-sync-with-termux.js << 'EOF'
// Integration script to add sync functionality to termux-enhanced-backend.js
const MobileSyncClient = require('./mobile-sync-client');

// Initialize sync client (replace with your server URL and device ID)
const syncClient = new MobileSyncClient('http://YOUR_SERVER_IP:3002', 'mobile-phone-1');

// Function to integrate with existing saveData function
function integrateWithSaveData() {
    // After saving data locally, also sync to server
    const originalSaveData = global.saveData;
    global.saveData = function() {
        // Call original save function
        originalSaveData();
        
        // Sync to server
        syncClient.uploadData(parsedData, devices, lastIMEI)
            .then(result => {
                console.log('📱 Data synced to server:', result);
            })
            .catch(error => {
                console.error('📱 Sync failed:', error.message);
            });
    };
}

// Function to integrate with existing loadData function
function integrateWithLoadData() {
    // After loading data locally, also download from server
    const originalLoadData = global.loadData;
    global.loadData = function() {
        // Call original load function
        originalLoadData();
        
        // Download from server and merge
        syncClient.downloadData()
            .then(result => {
                if (result && result.records) {
                    const mergedData = syncClient.mergeData(parsedData, result);
                    parsedData.length = 0;
                    parsedData.push(...mergedData);
                    console.log('📱 Data merged from server');
                }
            })
            .catch(error => {
                console.error('📱 Download failed:', error.message);
            });
    };
}

// Start auto sync
function startSync() {
    syncClient.startAutoSync(5); // Sync every 5 minutes
}

module.exports = {
    syncClient,
    integrateWithSaveData,
    integrateWithLoadData,
    startSync
};
EOF

print_success "Integration script created: integrate-sync-with-termux.js"

# Create usage instructions
print_status "Creating usage instructions..."
cat > MOBILE_SYNC_GUIDE.md << 'EOF'
# Mobile Synchronization Guide

## Overview
This system allows 2 mobile phones running the Galileosky parser to synchronize their databases through a central server.

## Architecture
- **Sync Server**: Central server (port 3002) that stores and distributes data
- **Mobile Clients**: Each mobile phone runs a sync client that uploads/downloads data
- **Real-time Updates**: WebSocket connections for instant synchronization

## Setup Instructions

### 1. Server Setup (Run on a computer or cloud server)
```bash
# Install dependencies
npm install express cors socket.io

# Start the sync server
node mobile-sync-service.js
```

### 2. Mobile Phone 1 Setup
```bash
# Edit configuration
nano mobile-sync-config.json
# Change YOUR_SERVER_IP to your server's IP address

# Integrate with Termux backend
# Add to termux-enhanced-backend.js:
const { syncClient, integrateWithSaveData, integrateWithLoadData, startSync } = require('./integrate-sync-with-termux.js');

# Initialize sync
integrateWithSaveData();
integrateWithLoadData();
startSync();
```

### 3. Mobile Phone 2 Setup
```bash
# Same as Phone 1, but change device ID to "mobile-phone-2"
```

## API Endpoints

### Sync Server (Port 3002)
- `GET /api/sync/status` - Get sync status
- `POST /api/sync/upload` - Upload data from mobile
- `POST /api/sync/download` - Download data to mobile
- `GET /api/sync/data` - Get all data (backup)
- `POST /api/sync/clear` - Clear all data

## Data Flow
1. **Phone 1** receives Galileosky data → Saves locally → Uploads to server
2. **Phone 2** downloads from server → Merges with local data → Saves locally
3. **Phone 2** receives new data → Saves locally → Uploads to server
4. **Phone 1** downloads from server → Merges with local data → Saves locally

## Features
- ✅ Automatic synchronization every 5 minutes
- ✅ Duplicate detection and prevention
- ✅ Real-time WebSocket notifications
- ✅ Offline support (queues sync when online)
- ✅ Data compression and optimization
- ✅ Conflict resolution
- ✅ Backup and restore functionality

## Monitoring
- Check sync status: `curl http://YOUR_SERVER_IP:3002/api/sync/status`
- View all data: `curl http://YOUR_SERVER_IP:3002/api/sync/data`
- Monitor logs: `tail -f logs/mobile-sync.log`

## Troubleshooting
1. **Connection Issues**: Check server IP and firewall settings
2. **Sync Failures**: Check network connectivity and server status
3. **Data Conflicts**: System automatically resolves conflicts by timestamp
4. **Performance**: Adjust sync interval in configuration

## Security Considerations
- Use HTTPS in production
- Implement authentication if needed
- Restrict server access to trusted devices
- Regular backup of sync data
EOF

print_success "Usage guide created: MOBILE_SYNC_GUIDE.md"

# Final instructions
echo ""
echo "🎉 Mobile Synchronization Setup Complete!"
echo "=========================================="
echo ""
print_status "Next steps:"
echo "1. Edit mobile-sync-config.json and set your server IP"
echo "2. Start the sync server: ./start-mobile-sync.sh"
echo "3. Integrate with your Termux backend on each mobile phone"
echo "4. Test synchronization between devices"
echo ""
print_status "Files created:"
echo "- mobile-sync-service.js (Sync server)"
echo "- mobile-sync-client.js (Mobile client)"
echo "- mobile-sync-config.json (Configuration)"
echo "- start-mobile-sync.sh (Start script)"
echo "- stop-mobile-sync.sh (Stop script)"
echo "- integrate-sync-with-termux.js (Integration script)"
echo "- MOBILE_SYNC_GUIDE.md (Usage guide)"
echo ""
print_warning "Remember to:"
echo "- Replace YOUR_SERVER_IP with your actual server IP"
echo "- Configure firewall to allow port 3002"
echo "- Test connectivity between devices"
echo ""
print_success "Setup complete! 🚀" 