#!/bin/bash

# Setup Enhanced Galileosky Backend with Frontend
cd ~/gali-parse

echo "Setting up Enhanced Galileosky Backend with Frontend..."

# Create the enhanced backend
cat > termux-enhanced-backend.js << 'EOF'
const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// In-memory storage for parsed data
let parsedData = [];
let devices = new Map();

// Configuration
const config = {
    tcpPort: process.env.TCP_PORT || 3003,
    httpPort: process.env.HTTP_PORT || 3001,
    host: '0.0.0.0',
    maxConnections: 100,
    connectionTimeout: 30000,
    keepAliveTime: 60000
};

// MIME types for HTTP server
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Simple logger
const logger = {
    info: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[INFO] ${timestamp} - ${message}`;
        console.log(logMessage);
        if (data.address) {
            console.log(`  Address: ${data.address}`);
        }
        if (data.hex) {
            console.log(`  Data: ${data.hex}`);
        }
    },
    error: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[ERROR] ${timestamp} - ${message}`;
        console.error(logMessage);
        if (data.address) {
            console.error(`  Address: ${data.address}`);
        }
        if (data.error) {
            console.error(`  Error: ${data.error}`);
        }
    },
    warn: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[WARN] ${timestamp} - ${message}`;
        console.warn(logMessage);
        if (data.address) {
            console.warn(`  Address: ${data.address}`);
        }
    }
};

// Track active connections
const activeConnections = new Map();
let tcpServer = null;
let httpServer = null;

// Calculate CRC16 for packet validation
function calculateCRC16(buffer) {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc = crc >> 1;
            }
        }
    }
    return crc;
}

// Validate packet structure
function validatePacket(buffer) {
    if (buffer.length < 3) {
        throw new Error('Packet too short');
    }

    const header = buffer.readUInt8(0);
    const rawLength = buffer.readUInt16LE(1);
    
    // Extract high-order bit for archive data indicator
    const hasUnsentData = (rawLength & 0x8000) !== 0;
    
    // Extract 15 low-order bits for packet length
    const actualLength = rawLength & 0x7FFF;

    // Check if we have the complete packet (HEAD + LENGTH + DATA + CRC)
    const expectedLength = actualLength + 3;  // Header (1) + Length (2) + Data
    if (buffer.length < expectedLength + 2) {  // +2 for CRC
        throw new Error('Incomplete packet');
    }

    // Verify checksum
    const calculatedChecksum = calculateCRC16(buffer.slice(0, expectedLength));
    const receivedChecksum = buffer.readUInt16LE(expectedLength);

    if (calculatedChecksum !== receivedChecksum) {
        throw new Error('Checksum mismatch');
    }

    return {
        header,
        hasUnsentData,
        actualLength,
        rawLength,
        expectedLength
    };
}

// Parse packet data and extract useful information
function parsePacketData(buffer) {
    const packetInfo = validatePacket(buffer);
    
    // Extract the data portion (skip header and length)
    const dataStart = 3;
    const dataEnd = packetInfo.expectedLength;
    const data = buffer.slice(dataStart, dataEnd);
    
    // Try to extract basic information from the data
    const parsedInfo = {
        header: packetInfo.header,
        hasUnsentData: packetInfo.hasUnsentData,
        length: packetInfo.actualLength,
        timestamp: new Date().toISOString(),
        rawData: data.toString('hex').toUpperCase()
    };
    
    // Try to extract IMEI if present (common in Galileosky packets)
    if (data.length >= 15) {
        // Look for IMEI pattern (15 digits)
        const dataHex = data.toString('hex');
        const imeiMatch = dataHex.match(/([0-9a-f]{15})/i);
        if (imeiMatch) {
            parsedInfo.imei = imeiMatch[1];
            parsedInfo.deviceId = imeiMatch[1];
        }
    }
    
    // Try to extract coordinates if present
    if (data.length >= 20) {
        try {
            // Common position: 4 bytes for lat, 4 bytes for lon
            const lat = data.readInt32LE(0) / 1000000;
            const lon = data.readInt32LE(4) / 1000000;
            
            if (lat !== 0 && lon !== 0 && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                parsedInfo.latitude = lat;
                parsedInfo.longitude = lon;
            }
        } catch (e) {
            // Ignore coordinate parsing errors
        }
    }
    
    return parsedInfo;
}

// Add parsed data to storage
function addParsedData(data) {
    if (!data || typeof data !== 'object') return;
    
    // Add timestamp if not present
    if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
    }
    
    // Add device ID if not present
    if (!data.deviceId && data.imei) {
        data.deviceId = data.imei;
    }
    
    // Add to data array
    parsedData.unshift(data);
    
    // Limit data to last 1000 records
    if (parsedData.length > 1000) {
        parsedData = parsedData.slice(0, 1000);
    }
    
    // Track device
    if (data.deviceId) {
        devices.set(data.deviceId, {
            lastSeen: new Date(),
            lastLocation: {
                latitude: data.latitude,
                longitude: data.longitude
            },
            totalRecords: (devices.get(data.deviceId)?.totalRecords || 0) + 1
        });
    }
    
    logger.info(`Added data for device: ${data.deviceId || 'unknown'}`);
}

// Get latest data
function getLatestData(limit = 100) {
    return parsedData.slice(0, limit);
}

// Get device statistics
function getDeviceStats() {
    const stats = {
        totalRecords: parsedData.length,
        activeDevices: devices.size,
        lastUpdate: parsedData.length > 0 ? parsedData[0].timestamp : null,
        devices: Array.from(devices.entries()).map(([id, info]) => ({
            deviceId: id,
            lastSeen: info.lastSeen,
            totalRecords: info.totalRecords,
            lastLocation: info.lastLocation
        }))
    };
    
    return stats;
}

// Handle TCP connection
function handleConnection(socket) {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info('New device connected:', { address: clientAddress });

    let buffer = Buffer.alloc(0);
    let unsentData = Buffer.alloc(0);

    // Set socket options
    socket.setKeepAlive(true, config.keepAliveTime);
    socket.setTimeout(config.connectionTimeout);

    socket.on('data', async (data) => {
        try {
            // Log raw data received
            logger.info('Raw data received:', {
                address: clientAddress,
                hex: data.toString('hex').toUpperCase(),
                length: data.length
            });

            // Combine any unsent data with new data
            if (unsentData.length > 0) {
                buffer = Buffer.concat([unsentData, data]);
                unsentData = Buffer.alloc(0);
            } else {
                buffer = data;
            }

            while (buffer.length >= 3) {  // Minimum packet size (HEAD + LENGTH)
                const packetType = buffer.readUInt8(0);
                const rawLength = buffer.readUInt16LE(1);
                const actualLength = rawLength & 0x7FFF;  // Mask with 0x7FFF
                const totalLength = actualLength + 3;  // HEAD + LENGTH + DATA + CRC

                // Log packet details
                logger.info('Processing packet:', {
                    address: clientAddress,
                    type: `0x${packetType.toString(16).padStart(2, '0')}`,
                    length: actualLength,
                    totalLength,
                    bufferLength: buffer.length
                });

                // Check if we have a complete packet
                if (buffer.length < totalLength + 2) {  // +2 for CRC
                    unsentData = Buffer.from(buffer);
                    break;
                }

                // Extract the complete packet
                const packet = buffer.slice(0, totalLength + 2);
                buffer = buffer.slice(totalLength + 2);

                try {
                    // Parse the packet
                    const parsedPacket = parsePacketData(packet);
                    
                    // Get the checksum from the received packet
                    const packetChecksum = packet.readUInt16LE(packet.length - 2);
                    const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                    
                    // Send confirmation
                    socket.write(confirmation);
                    logger.info('Confirmation sent:', {
                        address: clientAddress,
                        hex: confirmation.toString('hex').toUpperCase(),
                        checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`
                    });

                    // Log parsed data
                    logger.info('Packet parsed successfully:', {
                        address: clientAddress,
                        header: `0x${parsedPacket.header.toString(16).padStart(2, '0')}`,
                        length: parsedPacket.length,
                        hasUnsentData: parsedPacket.hasUnsentData,
                        deviceId: parsedPacket.deviceId || 'unknown'
                    });

                    // Add to storage for frontend
                    addParsedData(parsedPacket);

                } catch (error) {
                    logger.error('Error processing packet:', {
                        address: clientAddress,
                        error: error.message
                    });
                    
                    // Send error confirmation
                    const errorConfirmation = Buffer.from([0x02, 0x3F, 0x00]);
                    socket.write(errorConfirmation);
                    logger.info('Error confirmation sent:', {
                        address: clientAddress,
                        hex: errorConfirmation.toString('hex').toUpperCase()
                    });
                }
            }
        } catch (error) {
            logger.error('Error processing data:', {
                address: clientAddress,
                error: error.message
            });
        }
    });

    socket.on('error', (error) => {
        logger.error('Socket error:', {
            address: clientAddress,
            error: error.message
        });
        cleanupConnection(clientAddress);
    });

    socket.on('timeout', () => {
        logger.warn('Socket timeout, closing connection:', { address: clientAddress });
        cleanupConnection(clientAddress);
    });

    socket.on('close', (hadError) => {
        logger.info('Device disconnected:', { address: clientAddress, hadError });
        cleanupConnection(clientAddress);
    });

    socket.on('end', () => {
        logger.info('Device ended connection:', { address: clientAddress });
        cleanupConnection(clientAddress);
    });
}

// Cleanup connection
function cleanupConnection(clientAddress) {
    const socket = activeConnections.get(clientAddress);
    if (socket) {
        try {
            socket.destroy();
        } catch (error) {
            logger.error('Error destroying socket:', { address: clientAddress, error: error.message });
        }
        activeConnections.delete(clientAddress);
    }
}

// Start TCP server
function startTCPServer() {
    tcpServer = net.createServer((socket) => {
        if (activeConnections.size >= config.maxConnections) {
            logger.warn('Max connections reached, rejecting connection:', { address: socket.remoteAddress });
            socket.destroy();
            return;
        }
        
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        activeConnections.set(clientAddress, socket);
        handleConnection(socket);
    });

    tcpServer.listen(config.tcpPort, config.host, () => {
        logger.info(`TCP server listening on port ${config.tcpPort} (all interfaces)`);
    });

    tcpServer.on('error', (error) => {
        logger.error('TCP server error:', { error: error.message });
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${config.tcpPort} is already in use`);
            process.exit(1);
        }
    });
}

// Serve static files
function serveStaticFile(req, res, filePath) {
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Handle API requests
function handleAPIRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    try {
        if (pathname === '/api/data/latest') {
            const limit = parseInt(parsedUrl.query.limit) || 100;
            const data = getLatestData(limit);
            res.writeHead(200);
            res.end(JSON.stringify(data));
        } else if (pathname === '/api/stats') {
            const stats = getDeviceStats();
            res.writeHead(200);
            res.end(JSON.stringify(stats));
        } else if (pathname === '/api/devices') {
            const deviceList = Array.from(devices.entries()).map(([id, info]) => ({
                deviceId: id,
                lastSeen: info.lastSeen,
                totalRecords: info.totalRecords,
                lastLocation: info.lastLocation
            }));
            res.writeHead(200);
            res.end(JSON.stringify(deviceList));
        } else if (pathname === '/api/data/add' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    addParsedData(data);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: 'Data added successfully' }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: 'Invalid JSON data' }));
                }
            });
            return;
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    } catch (error) {
        logger.error('API error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

// Start HTTP server
function startHTTPServer() {
    httpServer = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        logger.info(`${req.method} ${pathname}`);
        
        // Handle API requests
        if (pathname.startsWith('/api/')) {
            handleAPIRequest(req, res);
            return;
        }
        
        // Serve static files
        let filePath = pathname === '/' ? './simple-frontend.html' : '.' + pathname;
        
        // Security: prevent directory traversal
        if (filePath.includes('..')) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        serveStaticFile(req, res, filePath);
    });

    httpServer.listen(config.httpPort, config.host, () => {
        logger.info(`HTTP server listening on ${config.host}:${config.httpPort}`);
        logger.info(`Frontend available at: http://${config.host}:${config.httpPort}`);
        logger.info(`API available at: http://${config.host}:${config.httpPort}/api/`);
    });

    httpServer.on('error', (error) => {
        logger.error('HTTP server error:', { error: error.message });
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${config.httpPort} is already in use`);
            process.exit(1);
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down servers...');
    
    // Close all active connections
    for (const [clientAddress, socket] of activeConnections) {
        try {
            socket.destroy();
        } catch (error) {
            logger.error('Error closing connection:', { address: clientAddress, error: error.message });
        }
    }
    
    // Close TCP server
    if (tcpServer) {
        tcpServer.close(() => {
            logger.info('TCP server stopped');
        });
    }
    
    // Close HTTP server
    if (httpServer) {
        httpServer.close(() => {
            logger.info('HTTP server stopped');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', { error: error.message });
    process.exit(1);
});

// Start both servers
logger.info('Starting Galileosky Parser (Enhanced Backend)');
startTCPServer();
startHTTPServer();
EOF

# Create the frontend HTML file
cat > simple-frontend.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galileosky Parser - Simple Frontend</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }

        .status-bar {
            background: #ecf0f1;
            padding: 15px 20px;
            border-bottom: 1px solid #bdc3c7;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #e74c3c;
            animation: pulse 2s infinite;
        }

        .status-dot.connected {
            background: #27ae60;
        }

        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }

        .btn-primary {
            background: #3498db;
            color: white;
        }

        .btn-primary:hover {
            background: #2980b9;
        }

        .btn-success {
            background: #27ae60;
            color: white;
        }

        .btn-success:hover {
            background: #229954;
        }

        .btn-warning {
            background: #f39c12;
            color: white;
        }

        .btn-warning:hover {
            background: #e67e22;
        }

        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
            min-height: 600px;
        }

        .map-container {
            background: #f8f9fa;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #dee2e6;
        }

        .map-container h3 {
            padding: 15px;
            background: #343a40;
            color: white;
            margin: 0;
        }

        #map {
            height: 500px;
            width: 100%;
        }

        .data-container {
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #dee2e6;
            overflow: hidden;
        }

        .data-container h3 {
            padding: 15px;
            background: #343a40;
            color: white;
            margin: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .table-container {
            max-height: 500px;
            overflow-y: auto;
            padding: 15px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .data-table th,
        .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }

        .data-table th {
            background: #495057;
            color: white;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .data-table tr:hover {
            background: #f8f9fa;
        }

        .data-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            font-style: italic;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
        }

        .stat-label {
            color: #6c757d;
            margin-top: 5px;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }
            
            .status-bar {
                flex-direction: column;
                align-items: stretch;
            }
            
            .controls {
                justify-content: center;
            }
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            color: #6c757d;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Galileosky Parser</h1>
            <p>Real-time GPS Tracking & Data Visualization</p>
        </div>

        <div class="status-bar">
            <div class="status-indicator">
                <div class="status-dot" id="connectionStatus"></div>
                <span id="statusText">Connecting...</span>
            </div>
            <div class="controls">
                <button class="btn btn-primary" onclick="refreshData()">🔄 Refresh</button>
                <button class="btn btn-success" onclick="downloadData()">📥 Download CSV</button>
                <button class="btn btn-warning" onclick="clearData()">🗑️ Clear Data</button>
            </div>
        </div>

        <div class="content">
            <div class="map-container">
                <h3>📍 Live Tracking Map</h3>
                <div id="map"></div>
            </div>

            <div class="data-container">
                <h3>
                    📊 Parsed Data
                    <span id="dataCount">(0 records)</span>
                </h3>
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    Loading data...
                </div>
                <div class="table-container">
                    <table class="data-table" id="dataTable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Device</th>
                                <th>Latitude</th>
                                <th>Longitude</th>
                                <th>Speed</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="dataTableBody">
                            <tr>
                                <td colspan="6" class="no-data">No data available yet...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalRecords">0</div>
                <div class="stat-label">Total Records</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeDevices">0</div>
                <div class="stat-label">Active Devices</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="lastUpdate">-</div>
                <div class="stat-label">Last Update</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="avgSpeed">0</div>
                <div class="stat-label">Avg Speed (km/h)</div>
            </div>
        </div>
    </div>

    <script>
        // Configuration
        const config = {
            serverUrl: window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`,
            refreshInterval: 5000, // 5 seconds
            maxRecords: 1000
        };

        // Global variables
        let map;
        let markers = new Map();
        let dataRecords = [];
        let isConnected = false;
        let refreshTimer;

        // Initialize the application
        function init() {
            initializeMap();
            startDataRefresh();
            updateStatus('Connecting to server...', false);
        }

        // Initialize Leaflet map
        function initializeMap() {
            map = L.map('map').setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }

        // Start periodic data refresh
        function startDataRefresh() {
            refreshTimer = setInterval(refreshData, config.refreshInterval);
        }

        // Refresh data from server
        async function refreshData() {
            try {
                showLoading(true);
                const response = await fetch(`${config.serverUrl}/api/data/latest`);
                if (response.ok) {
                    const data = await response.json();
                    handleDeviceData(data);
                    updateStatus('Connected', true);
                } else {
                    updateStatus('Server error', false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                updateStatus('Connection failed', false);
            } finally {
                showLoading(false);
            }
        }

        // Handle incoming device data
        function handleDeviceData(data) {
            if (!data || !Array.isArray(data)) return;
            
            data.forEach(record => {
                if (record.latitude && record.longitude) {
                    addOrUpdateMarker(record);
                }
                addDataRecord(record);
            });
            
            updateStats();
        }

        // Add or update marker on map
        function addOrUpdateMarker(record) {
            const deviceId = record.deviceId || record.imei || 'unknown';
            const lat = parseFloat(record.latitude);
            const lng = parseFloat(record.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return;
            
            if (markers.has(deviceId)) {
                // Update existing marker
                const marker = markers.get(deviceId);
                marker.setLatLng([lat, lng]);
                marker.bindPopup(createPopupContent(record));
            } else {
                // Create new marker
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '🚗',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                }).addTo(map);
                
                marker.bindPopup(createPopupContent(record));
                markers.set(deviceId, marker);
            }
            
            // Fit map to show all markers
            if (markers.size === 1) {
                map.setView([lat, lng], 12);
            } else {
                const group = new L.featureGroup(Array.from(markers.values()));
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }

        // Create popup content for markers
        function createPopupContent(record) {
            return `
                <div style="min-width: 200px;">
                    <h4>Device: ${record.deviceId || record.imei || 'Unknown'}</h4>
                    <p><strong>Time:</strong> ${new Date(record.timestamp).toLocaleString()}</p>
                    <p><strong>Location:</strong> ${record.latitude}, ${record.longitude}</p>
                    <p><strong>Speed:</strong> ${record.speed || 0} km/h</p>
                    <p><strong>Status:</strong> ${record.status || 'Unknown'}</p>
                </div>
            `;
        }

        // Add data record to table
        function addDataRecord(record) {
            // Add to beginning of array
            dataRecords.unshift(record);
            
            // Limit records
            if (dataRecords.length > config.maxRecords) {
                dataRecords = dataRecords.slice(0, config.maxRecords);
            }
            
            updateDataTable();
        }

        // Update data table
        function updateDataTable() {
            const tbody = document.getElementById('dataTableBody');
            const countElement = document.getElementById('dataCount');
            
            countElement.textContent = `(${dataRecords.length} records)`;
            
            if (dataRecords.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No data available yet...</td></tr>';
                return;
            }
            
            tbody.innerHTML = dataRecords.map(record => `
                <tr>
                    <td>${new Date(record.timestamp).toLocaleString()}</td>
                    <td>${record.deviceId || record.imei || 'Unknown'}</td>
                    <td>${record.latitude ? parseFloat(record.latitude).toFixed(6) : '-'}</td>
                    <td>${record.longitude ? parseFloat(record.longitude).toFixed(6) : '-'}</td>
                    <td>${record.speed ? parseFloat(record.speed).toFixed(1) + ' km/h' : '-'}</td>
                    <td>${record.status || 'Unknown'}</td>
                </tr>
            `).join('');
        }

        // Update statistics
        function updateStats() {
            document.getElementById('totalRecords').textContent = dataRecords.length;
            
            const uniqueDevices = new Set(dataRecords.map(r => r.deviceId || r.imei)).size;
            document.getElementById('activeDevices').textContent = uniqueDevices;
            
            if (dataRecords.length > 0) {
                const lastRecord = dataRecords[0];
                document.getElementById('lastUpdate').textContent = 
                    new Date(lastRecord.timestamp).toLocaleTimeString();
                
                const speeds = dataRecords
                    .map(r => parseFloat(r.speed))
                    .filter(s => !isNaN(s));
                
                const avgSpeed = speeds.length > 0 
                    ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)
                    : '0';
                document.getElementById('avgSpeed').textContent = avgSpeed;
            }
        }

        // Update connection status
        function updateStatus(message, connected) {
            const statusDot = document.getElementById('connectionStatus');
            const statusText = document.getElementById('statusText');
            
            statusText.textContent = message;
            statusDot.className = 'status-dot' + (connected ? ' connected' : '');
        }

        // Show/hide loading indicator
        function showLoading(show) {
            const loading = document.getElementById('loading');
            loading.className = show ? 'loading show' : 'loading';
        }

        // Download data as CSV
        function downloadData() {
            if (dataRecords.length === 0) {
                alert('No data to download');
                return;
            }
            
            const headers = ['Time', 'Device ID', 'Latitude', 'Longitude', 'Speed (km/h)', 'Status'];
            const csvContent = [
                headers.join(','),
                ...dataRecords.map(record => [
                    new Date(record.timestamp).toISOString(),
                    record.deviceId || record.imei || 'Unknown',
                    record.latitude || '',
                    record.longitude || '',
                    record.speed || '',
                    record.status || ''
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `galileosky_data_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        // Clear all data
        function clearData() {
            if (confirm('Are you sure you want to clear all data?')) {
                dataRecords = [];
                markers.clear();
                map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });
                updateDataTable();
                updateStats();
            }
        }

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', init);

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshTimer) {
                clearInterval(refreshTimer);
            }
        });
    </script>
</body>
</html>
EOF

echo "✅ Enhanced backend and frontend created successfully!"
echo ""
echo "🚀 To start the enhanced backend with frontend:"
echo "   node termux-enhanced-backend.js"
echo ""
echo "📱 Access the frontend at:"
echo "   http://YOUR_PHONE_IP:3001"
echo ""
echo "🔧 TCP server for devices:"
echo "   Port 3003"
echo ""
echo "🌐 HTTP server for frontend:"
echo "   Port 3001" 