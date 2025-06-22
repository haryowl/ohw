#!/bin/bash

# 🛰️ Galileosky Parser - Step by Step Termux Setup
# This script handles the complete setup process

set -e

echo "========================================"
echo "  Galileosky Parser - Step by Step Setup"
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
print_info "Step 1: Installing required packages..."
pkg install -y nodejs git wget curl

echo ""
print_info "Step 2: Creating simplified backend..."
cd backend

# Create simplified package.json
cat > package-simple.json << 'EOF'
{
  "name": "galileosky-parser-backend-simple",
  "version": "1.0.0",
  "description": "Galileosky Parser Backend (Simplified for Termux)",
  "main": "src/server-simple.js",
  "scripts": {
    "start": "node src/server-simple.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2"
  },
  "keywords": ["galileosky", "parser", "iot", "gps", "tracking"],
  "author": "haryowl",
  "license": "MIT"
}
EOF

echo ""
print_info "Step 3: Installing simplified dependencies..."
npm install --package-lock-only
npm ci --ignore-scripts

echo ""
print_info "Step 4: Creating simplified server..."
cat > src/server-simple.js << 'EOF'
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

let devices = [];
let records = [];
let connections = new Map();

const tcpServer = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP] New connection from ${clientId}`);
    
    connections.set(clientId, socket);
    
    socket.on('data', (data) => {
        console.log(`[TCP] Received data from ${clientId}:`, data.toString('hex'));
        
        const parsedData = {
            raw: data.toString('hex'),
            length: data.length,
            timestamp: new Date().toISOString()
        };
        
        records.push({
            id: Date.now(),
            deviceId: clientId,
            timestamp: new Date().toISOString(),
            data: parsedData
        });
        
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'data',
                    deviceId: clientId,
                    data: parsedData
                }));
            }
        });
    });
    
    socket.on('close', () => {
        console.log(`[TCP] Connection closed: ${clientId}`);
        connections.delete(clientId);
    });
});

wss.on('connection', (ws) => {
    console.log('[WS] New WebSocket connection');
    ws.send(JSON.stringify({
        type: 'init',
        devices: devices,
        records: records.slice(-100)
    }));
});

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

process.on('SIGINT', () => {
    console.log('\n[INFO] Shutting down servers...');
    tcpServer.close();
    server.close();
    process.exit(0);
});
EOF

echo ""
print_info "Step 5: Creating startup script..."
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
print_status "Setup completed!"
echo ""
echo "🚀 To start the server:"
echo "   ./start-simple.sh"
echo ""
echo "📱 Or start directly:"
echo "   cd backend && node src/server-simple.js"
echo ""
echo "🌐 Server will be available at:"
echo "   HTTP API: http://localhost:3001"
echo "   TCP Server: localhost:3003"
echo "   WebSocket: ws://localhost:3001" 