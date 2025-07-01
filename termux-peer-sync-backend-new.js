// ========================================
// GALILEOSKY MOBILE BACKEND WITH PEER SYNC
// ========================================
// Enhanced mobile backend with peer-to-peer sync capabilities
// Last updated: 2025-01-27
// ========================================

const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const { networkInterfaces } = require('os');

// Clear startup identification
console.log('🚀 ========================================');
console.log('🚀 GALILEOSKY MOBILE BACKEND WITH PEER SYNC');
console.log('🚀 ========================================');
console.log('🚀 Enhanced mobile backend with peer-to-peer sync');
console.log('🚀 Last updated: 2025-01-27');
console.log('🚀 ========================================');
console.log('');

// Function to get IP address
function getIpAddress() {
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Get IP address
const ipAddress = getIpAddress();

// Ensure logs and data directories exist
const logsDir = path.join(__dirname, 'logs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Data storage files
const PARSED_DATA_FILE = path.join(dataDir, 'parsed_data.json');
const DEVICES_FILE = path.join(dataDir, 'devices.json');
const LAST_IMEI_FILE = path.join(dataDir, 'last_imei.json');

// Configuration constants
const MAX_RECORDS = 200000; // Maximum number of records to keep in memory and storage

// Global variables for IMEI persistence
let lastIMEI = null;
let parsedData = [];
let devices = new Map();

// Connection to IMEI mapping for multi-device support
const connectionToIMEI = new Map();

// Helper function to get IMEI from connection
function getIMEIFromConnection(connectionId) {
    return connectionToIMEI.get(connectionId) || null;
}

// Helper function to update device tracking
function updateDeviceTracking(imei, connectionId, data) {
    // Map connection to IMEI
    if (connectionId) {
        connectionToIMEI.set(connectionId, imei);
    }
    
    // Update device stats
    if (!devices.has(imei)) {
        devices.set(imei, {
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            recordCount: 0,
            totalRecords: 0,
            connectionId: connectionId,
            lastLocation: null
        });
    }
    
    const device = devices.get(imei);
    device.lastSeen = new Date().toISOString();
    device.recordCount += 1;
    device.totalRecords += 1;
    
    // Update last location if coordinates are available
    if (data.latitude && data.longitude) {
        device.lastLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp
        };
    }
    
    // Update connection ID if not set
    if (connectionId && !device.connectionId) {
        device.connectionId = connectionId;
    }
    
    console.log(`📱 Device ${imei} updated: ${device.totalRecords} total records`);
}

// Data persistence functions
function saveData() {
    try {
        // Save parsed data (keep only last MAX_RECORDS to prevent file from getting too large)
        const dataToSave = parsedData.slice(-MAX_RECORDS);
        fs.writeFileSync(PARSED_DATA_FILE, JSON.stringify(dataToSave, null, 2));
        
        // Save devices data
        const devicesData = Object.fromEntries(devices);
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(devicesData, null, 2));
        
        // Save last IMEI
        if (lastIMEI) {
            fs.writeFileSync(LAST_IMEI_FILE, JSON.stringify({ lastIMEI }, null, 2));
        }
        
        logger.info(`Data saved: ${dataToSave.length} records, ${devices.size} devices`);
    } catch (error) {
        logger.error('Error saving data:', { error: error.message });
    }
}

function loadData() {
    try {
        // Load parsed data
        if (fs.existsSync(PARSED_DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARSED_DATA_FILE, 'utf8'));
            parsedData = data;
            logger.info(`Loaded ${parsedData.length} records from storage`);
        }
        
        // Load devices data
        if (fs.existsSync(DEVICES_FILE)) {
            const devicesData = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
            devices = new Map(Object.entries(devicesData));
            logger.info(`Loaded ${devices.size} devices from storage`);
        }
        
        // Load last IMEI
        if (fs.existsSync(LAST_IMEI_FILE)) {
            const imeiData = JSON.parse(fs.readFileSync(LAST_IMEI_FILE, 'utf8'));
            lastIMEI = imeiData.lastIMEI;
            logger.info(`Loaded last IMEI: ${lastIMEI}`);
        }
        
    } catch (error) {
        logger.error('Error loading data:', { error: error.message });
        // If loading fails, start with empty data
        parsedData = [];
        devices = new Map();
        lastIMEI = null;
    }
}

// Auto-save data every 30 seconds
let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        if (parsedData.length > 0 || devices.size > 0) {
            saveData();
        }
    }, 30000); // Save every 30 seconds
    logger.info('Auto-save enabled (every 30 seconds)');
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        logger.info('Auto-save disabled');
    }
}

// Configuration
const config = {
    tcpPort: process.env.TCP_PORT || 3003,
    httpPort: process.env.HTTP_PORT || 3001,
    host: '0.0.0.0',
    maxConnections: 100,
    connectionTimeout: 30000,
    keepAliveTime: 60000
};

// Simple logger
const logger = {
    info: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[INFO] ${timestamp} - ${message}`;
        console.log(logMessage);
        if (Object.keys(data).length > 0) {
            console.log('  Data:', JSON.stringify(data, null, 2));
        }
    },
    error: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[ERROR] ${timestamp} - ${message}`;
        console.error(logMessage);
        if (Object.keys(data).length > 0) {
            console.error('  Data:', JSON.stringify(data, null, 2));
        }
    },
    warn: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[WARN] ${timestamp} - ${message}`;
        console.warn(logMessage);
        if (Object.keys(data).length > 0) {
            console.warn('  Data:', JSON.stringify(data, null, 2));
        }
    }
};

// Track active connections
const activeConnections = new Map();
let tcpServer = null;
let httpServer = null;

// Tag definitions
const tagDefinitions = {
    '0x01': { type: 'uint8', description: 'Number Archive Records' },
    '0x02': { type: 'uint8', description: 'Number Event Records' },
    '0x03': { type: 'string', length: 15, description: 'IMEI' },
    '0x04': { type: 'uint8', description: 'Number Service Records' },
    '0x10': { type: 'uint16', description: 'Number Archive Records' },
    '0x20': { type: 'datetime', description: 'Date and Time' },
    '0x21': { type: 'uint16', description: 'Milliseconds' },
    '0x30': { type: 'coordinates', description: 'Coordinates' },
    '0x33': { type: 'speedDirection', description: 'Speed and Direction' },
    '0x34': { type: 'uint16', description: 'Height' },
    '0x35': { type: 'uint8', description: 'HDOP' },
    '0x40': { type: 'status', description: 'Status' },
    '0x41': { type: 'uint16', description: 'Supply Voltage' },
    '0x42': { type: 'uint16', description: 'Battery Voltage' },
    '0x43': { type: 'int16', description: 'Temperature' },
    '0x45': { type: 'uint8', description: 'Outputs' },
    '0x46': { type: 'uint8', description: 'Inputs' },
    '0x50': { type: 'uint16', description: 'Input Voltage 0' },
    '0x51': { type: 'uint16', description: 'Input Voltage 1' },
    '0x52': { type: 'uint16', description: 'Input Voltage 2' }
};

// Parse hex data function
function parseHexData(hexData) {
    const result = {};
    let offset = 0;
    
    while (offset < hexData.length) {
        const tag = hexData.substr(offset, 2);
        offset += 2;
        
        if (!tagDefinitions[tag]) {
            logger.warn(`Unknown tag: ${tag}`);
            break;
        }
        
        const definition = tagDefinitions[tag];
        let value;
        
        switch (definition.type) {
            case 'uint8':
                value = parseInt(hexData.substr(offset, 2), 16);
                offset += 2;
                break;
            case 'uint16':
                value = parseInt(hexData.substr(offset, 4), 16);
                offset += 4;
                break;
            case 'int16':
                const rawValue = parseInt(hexData.substr(offset, 4), 16);
                value = rawValue > 32767 ? rawValue - 65536 : rawValue;
                offset += 4;
                break;
            case 'string':
                const length = definition.length * 2; // Each character is 2 hex digits
                const hexString = hexData.substr(offset, length);
                value = Buffer.from(hexString, 'hex').toString('utf8').replace(/\0/g, '');
                offset += length;
                break;
            case 'datetime':
                const dateHex = hexData.substr(offset, 12);
                const year = parseInt(dateHex.substr(0, 4), 16);
                const month = parseInt(dateHex.substr(4, 2), 16);
                const day = parseInt(dateHex.substr(6, 2), 16);
                const hour = parseInt(dateHex.substr(8, 2), 16);
                const minute = parseInt(dateHex.substr(10, 2), 16);
                const second = parseInt(dateHex.substr(12, 2), 16);
                value = new Date(year, month - 1, day, hour, minute, second).toISOString();
                offset += 12;
                break;
            case 'coordinates':
                const latHex = hexData.substr(offset, 8);
                const lonHex = hexData.substr(offset + 8, 8);
                const lat = parseInt(latHex, 16) / 1000000;
                const lon = parseInt(lonHex, 16) / 1000000;
                value = { latitude: lat, longitude: lon };
                offset += 16;
                break;
            case 'speedDirection':
                const speedHex = hexData.substr(offset, 4);
                const directionHex = hexData.substr(offset + 4, 4);
                const speed = parseInt(speedHex, 16) / 10;
                const direction = parseInt(directionHex, 16) / 10;
                value = { speed, direction };
                offset += 8;
                break;
            case 'status':
                const statusHex = hexData.substr(offset, 4);
                const status = parseInt(statusHex, 16);
                value = {
                    status,
                    binary: status.toString(2).padStart(16, '0')
                };
                offset += 4;
                break;
            default:
                logger.warn(`Unknown type: ${definition.type}`);
                break;
        }
        
        result[definition.description] = value;
    }
    
    return result;
}

// TCP Server for Galileosky devices
function startTcpServer() {
    tcpServer = net.createServer((socket) => {
        const clientAddress = socket.remoteAddress;
        const connectionId = `${clientAddress}:${socket.remotePort}`;
        
        logger.info(`TCP client connected`, { address: connectionId });
        activeConnections.set(connectionId, socket);

        socket.on('data', (data) => {
            const hexData = data.toString('hex').toUpperCase();
            logger.info(`Received TCP data`, { address: connectionId, hex: hexData });
            
            try {
                const parsedData = parseHexData(hexData);
                const record = {
                    timestamp: new Date().toISOString(),
                    source: 'tcp',
                    address: connectionId,
                    rawData: hexData,
                    parsedData: parsedData
                };
                
                // Add to global parsed data
                parsedData.push(record);
                if (parsedData.length > MAX_RECORDS) {
                    parsedData.shift();
                }
                
                // Update devices map
                if (parsedData.IMEI) {
                    updateDeviceTracking(parsedData.IMEI, connectionId, parsedData);
                }
                
                // Emit to WebSocket clients
                if (io) {
                    io.emit('newData', record);
                }
                
            } catch (error) {
                logger.error('Error parsing TCP data', { error: error.message, hex: hexData });
            }
        });
        
        socket.on('close', () => {
            logger.info(`TCP client disconnected`, { address: connectionId });
            activeConnections.delete(connectionId);
            
            // Clean up IMEI mapping
            const imei = connectionToIMEI.get(connectionId);
            if (imei) {
                console.log(`🔌 Device ${imei} disconnected from ${connectionId}`);
                connectionToIMEI.delete(connectionId);
            }
        });
    });
    
    tcpServer.listen(config.tcpPort, config.host, () => {
        logger.info(`TCP server started on ${config.host}:${config.tcpPort}`);
    });

    tcpServer.on('error', (error) => {
        logger.error('TCP server error', { error: error.message });
    });
}

// HTTP Server with Express
function startHttpServer() {
    const app = express();
    
    // Enable CORS
    app.use(cors());
    
    // Parse JSON bodies
    app.use(express.json());
    
    // Serve static files
    app.use(express.static(__dirname));
    
    // API Routes
    app.get('/api/data', (req, res) => {
        res.json({
            records: parsedData, // Return ALL records for peer sync
            devices: Array.from(devices.entries()).map(([id, info]) => ({
                deviceId: id,
                lastSeen: info.lastSeen,
                totalRecords: info.totalRecords,
                connectionId: info.connectionId,
                lastLocation: info.lastLocation,
                isConnected: info.connectionId ? activeConnections.has(info.connectionId) : false
            })),
            lastIMEI: lastIMEI,
            totalRecords: parsedData.length,
            totalDevices: devices.size,
            activeConnections: activeConnections.size
        });
    });
    
    app.get('/api/status', (req, res) => {
        res.json({
            status: 'running',
            tcpConnections: activeConnections.size,
            totalDevices: devices.size,
            activeDevices: Array.from(devices.values()).filter(d => d.connectionId && activeConnections.has(d.connectionId)).length,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    });
    
    app.post('/api/clear', (req, res) => {
        parsedData = [];
        devices.clear();
        lastIMEI = null;
        connectionToIMEI.clear();
        saveData();
        res.json({ message: 'Data cleared successfully' });
    });
    
    // Serve mobile peer sync UI
    app.get('/mobile-peer-sync-ui.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'mobile-peer-sync-ui.html'));
    });
    
    // Create HTTP server
    httpServer = http.createServer(app);
    
    // Initialize Socket.IO
    const io = require('socket.io')(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    
    io.on('connection', (socket) => {
        logger.info('WebSocket client connected');
        
        socket.on('disconnect', () => {
            logger.info('WebSocket client disconnected');
        });
    });
    
    // Start HTTP server
    httpServer.listen(config.httpPort, config.host, () => {
        logger.info(`HTTP server started on ${config.host}:${config.httpPort}`);
    });
    
    return io;
}

// Graceful shutdown
function gracefulShutdown() {
    logger.info('Shutting down gracefully...');
    
    stopAutoSave();
    saveData();
    
    if (tcpServer) {
        tcpServer.close();
    }
    
    if (httpServer) {
        httpServer.close();
    }
    
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Main startup
async function startServer() {
    try {
        // Load existing data
        loadData();
        
        // Start auto-save
        startAutoSave();
        
        // Start servers
        startTcpServer();
        const io = startHttpServer();
        
        // Display server information
        console.log('');
        console.log('🎉 SERVER STARTED SUCCESSFULLY!');
        console.log('================================');
        console.log(`📱 Mobile Interface: http://${ipAddress}:${config.httpPort}`);
        console.log(`🌐 Peer Sync Interface: http://${ipAddress}:${config.httpPort}/mobile-peer-sync-ui.html`);
        console.log(`📡 TCP Server: ${ipAddress}:${config.tcpPort}`);
        console.log(`💾 Data Directory: ${dataDir}`);
        console.log(`📋 Logs Directory: ${logsDir}`);
        console.log('');
        console.log('📊 Server Status:');
        console.log(`   Records: ${parsedData.length}`);
        console.log(`   Total Devices: ${devices.size}`);
        console.log(`   Active Connections: ${activeConnections.size}`);
        console.log(`   Last IMEI: ${lastIMEI || 'None'}`);
        console.log('');
        console.log('🔧 Multi-Device Support: Enabled');
        console.log('   - Each device connection tracked separately');
        console.log('   - IMEI mapping per connection');
        console.log('   - Real-time device status monitoring');
        console.log('');
        console.log('⏹  Press Ctrl+C to stop the server');
        console.log('');
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

// Start the server
startServer(); 