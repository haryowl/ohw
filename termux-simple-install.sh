#!/bin/bash

# 🛰️ Galileosky Parser - Simple Termux Installation
# This script avoids sqlite3 build issues

set -e

echo "========================================"
echo "  Galileosky Parser - Simple Termux Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
print_info "Step 1: Updating package list..."
pkg update -y

echo ""
print_info "Step 2: Installing required packages..."
pkg install -y nodejs git wget curl

echo ""
print_info "Step 3: Checking installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Git version: $(git --version)"

echo ""
print_info "Step 4: Cloning repository..."
if [ -d "galileosky-parser" ]; then
    print_warning "Repository already exists, updating..."
    cd galileosky-parser
    git pull origin main
else
    git clone https://github.com/haryowl/galileosky-parser.git
    cd galileosky-parser
fi

echo ""
print_info "Step 5: Creating simplified backend..."
cd backend

# Create a simplified package.json without sqlite3
cat > package-simple.json << 'EOF'
{
  "name": "galileosky-parser-backend-simple",
  "version": "1.0.0",
  "description": "Galileosky Parser Backend (Simplified for Termux)",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "net": "^1.0.2",
    "fs": "^0.0.1-security",
    "path": "^0.12.7",
    "querystring": "^0.2.1",
    "url": "^0.11.3",
    "http": "^0.0.1-security",
    "https": "^1.0.0",
    "os": "^0.1.2",
    "util": "^0.12.5",
    "events": "^3.3.0",
    "stream": "^0.0.2",
    "buffer": "^6.0.3",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["galileosky", "parser", "iot", "gps", "tracking"],
  "author": "haryowl",
  "license": "MIT"
}
EOF

echo ""
print_info "Step 6: Installing simplified dependencies..."
npm install --package-lock-only
npm ci --ignore-scripts

echo ""
print_info "Step 7: Creating simplified server..."
cat > src/server-simple.js << 'EOF'
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (no database needed)
let devices = [];
let records = [];
let connections = new Map();

// TCP Server for Galileosky devices
const tcpServer = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP] New connection from ${clientId}`);
    
    connections.set(clientId, socket);
    
    socket.on('data', (data) => {
        console.log(`[TCP] Received data from ${clientId}:`, data.toString('hex'));
        
        // Parse Galileosky data (simplified)
        const parsedData = parseGalileoskyData(data);
        if (parsedData) {
            records.push({
                id: Date.now(),
                deviceId: clientId,
                timestamp: new Date().toISOString(),
                data: parsedData,
                raw: data.toString('hex')
            });
            
            // Broadcast to WebSocket clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'data',
                        deviceId: clientId,
                        data: parsedData
                    }));
                }
            });
        }
    });
    
    socket.on('close', () => {
        console.log(`[TCP] Connection closed: ${clientId}`);
        connections.delete(clientId);
    });
    
    socket.on('error', (err) => {
        console.error(`[TCP] Error from ${clientId}:`, err.message);
        connections.delete(clientId);
    });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[WS] New WebSocket connection');
    
    // Send current devices and records
    ws.send(JSON.stringify({
        type: 'init',
        devices: devices,
        records: records.slice(-100) // Last 100 records
    }));
    
    ws.on('close', () => {
        console.log('[WS] WebSocket connection closed');
    });
});

// API Routes
app.get('/api/devices', (req, res) => {
    res.json(devices);
});

app.get('/api/data/:deviceId', (req, res) => {
    const deviceId = req.params.deviceId;
    const deviceRecords = records.filter(r => r.deviceId === deviceId);
    res.json(deviceRecords);
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        connections: connections.size,
        records: records.length,
        devices: devices.length,
        uptime: process.uptime()
    });
});

// Simple Galileosky parser
function parseGalileoskyData(data) {
    try {
        // Basic parsing - extract what we can
        const hex = data.toString('hex');
        return {
            raw: hex,
            length: data.length,
            timestamp: new Date().toISOString(),
            parsed: {
                packetType: hex.substring(0, 2),
                dataLength: hex.substring(2, 4),
                payload: hex.substring(4)
            }
        };
    } catch (error) {
        console.error('Parse error:', error);
        return null;
    }
}

// Start servers
const PORT = process.env.PORT || 3001;
const TCP_PORT = process.env.TCP_PORT || 3003;

tcpServer.listen(TCP_PORT, () => {
    console.log(`[TCP] Server listening on port ${TCP_PORT}`);
});

server.listen(PORT, () => {
    console.log(`[HTTP] Server running on port ${PORT}`);
    console.log(`[INFO] Galileosky Parser Backend (Simplified) started`);
    console.log(`[INFO] TCP Server: localhost:${TCP_PORT}`);
    console.log(`[INFO] HTTP Server: http://localhost:${PORT}`);
    console.log(`[INFO] WebSocket: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[INFO] Shutting down servers...');
    tcpServer.close();
    server.close();
    process.exit(0);
});
EOF

echo ""
print_info "Step 8: Creating startup script..."
cat > ../start-simple.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
echo "Starting Galileosky Parser Backend (Simplified)..."
echo "HTTP Server: http://localhost:3001"
echo "TCP Server: localhost:3003"
echo "Press Ctrl+C to stop"
node src/server-simple.js
EOF

chmod +x ../start-simple.sh

echo ""
print_status "Simplified installation completed!"
echo ""
echo "🚀 To start the simplified backend:"
echo "   ./start-simple.sh"
echo ""
echo "📱 Features:"
echo "   ✅ TCP server for Galileosky devices"
echo "   ✅ WebSocket for real-time updates"
echo "   ✅ HTTP API endpoints"
echo "   ✅ In-memory storage (no database)"
echo "   ✅ No build dependencies required"
echo ""
echo "🌐 Access URLs:"
echo "   HTTP API: http://localhost:3001"
echo "   TCP Server: localhost:3003"
echo "   WebSocket: ws://localhost:3001"
echo ""
print_info "This simplified version works without sqlite3 or Python!" 