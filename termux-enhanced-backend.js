// ========================================
// GALILEOSKY ENHANCED BACKEND (FIXED VERSION)
// ========================================
// This is the ENHANCED backend with proper parsing fixes
// Last updated: 2025-06-24
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

// Import peer sync service
const PeerToPeerSync = require('./backend/src/services/peerToPeerSync');

// Clear startup identification
console.log('🚀 ========================================');
console.log('🚀 GALILEOSKY ENHANCED BACKEND (FIXED)');
console.log('🚀 ========================================');
console.log('🚀 This is the ENHANCED backend with parsing fixes');
console.log('🚀 Last updated: 2025-06-24');
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
function getIMEIFromConnection(clientAddress) {
    return connectionToIMEI.get(clientAddress) || null;
}

// Helper function to update device tracking
function updateDeviceTracking(imei, clientAddress, data) {
    // Map connection to IMEI
    if (clientAddress) {
        connectionToIMEI.set(clientAddress, imei);
    }
    
    console.log(`📱 updateDeviceTracking called with IMEI: ${imei}, clientAddress: ${clientAddress}`);
    
    // Update device stats
    if (!devices.has(imei)) {
        console.log(`📱 Creating new device entry for IMEI: ${imei}`);
        devices.set(imei, {
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            recordCount: 0,
            totalRecords: 0,
            clientAddress: clientAddress,
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
    
    // Update client address if not set
    if (clientAddress && !device.clientAddress) {
        device.clientAddress = clientAddress;
    }
    
    console.log(`📱 Device ${imei} updated: ${device.totalRecords} total records`);
    console.log(`📱 Current device keys:`, Array.from(devices.keys()));
}

// Data persistence functions
function saveData() {
    try {
        // Save parsed data (keep only last MAX_RECORDS to prevent file from getting too large)
        const dataToSave = parsedData.slice(-MAX_RECORDS);
        
        // Check if data is too large before stringifying
        const dataString = JSON.stringify(dataToSave, null, 2);
        if (dataString.length > 100 * 1024 * 1024) { // 100MB limit
            logger.warn('Data too large, truncating to last 50,000 records');
            const truncatedData = parsedData.slice(-50000);
            fs.writeFileSync(PARSED_DATA_FILE, JSON.stringify(truncatedData, null, 2));
        } else {
            fs.writeFileSync(PARSED_DATA_FILE, dataString);
        }
        
        // Save devices data
        const devicesData = Object.fromEntries(devices);
        console.log('💾 Saving devices with keys:', Object.keys(devicesData));
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(devicesData, null, 2));
        
        // Save last IMEI
        if (lastIMEI) {
            fs.writeFileSync(LAST_IMEI_FILE, JSON.stringify({ lastIMEI }, null, 2));
        }
        
        logger.info(`Data saved: ${dataToSave.length} records, ${devices.size} devices`);
    } catch (error) {
        logger.error('Error saving data:', { error: error.message });
        
        // If saving fails due to size, try to save with fewer records
        if (error.message.includes('Invalid string length') || error.message.includes('too large')) {
            try {
                logger.warn('Attempting to save with reduced data size...');
                const reducedData = parsedData.slice(-10000); // Keep only last 10,000 records
                fs.writeFileSync(PARSED_DATA_FILE, JSON.stringify(reducedData, null, 2));
                logger.info(`Data saved with reduced size: ${reducedData.length} records`);
            } catch (retryError) {
                logger.error('Failed to save even with reduced data:', { error: retryError.message });
            }
        }
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
            console.log('📂 Loading devices with keys:', Object.keys(devicesData));
            devices = new Map(Object.entries(devicesData));
            console.log('📂 Devices Map keys after load:', Array.from(devices.keys()));
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
    httpPort: process.env.HTTP_PORT || 3001, // Changed back to 3001 to restore original working config
    peerSyncPort: process.env.PEER_SYNC_PORT || 3002, // Peer sync port moved to 3002 to avoid conflict
    host: '0.0.0.0', // Keep as 0.0.0.0 for listening on all interfaces
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

// Initialize peer sync service
const deviceId = 'mobile-enhanced-' + Math.random().toString(36).substr(2, 9);
const peerSync = new PeerToPeerSync(deviceId, config.peerSyncPort);

// Tag definitions from tagDefinitions.js
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
    '0x43': { type: 'int8', description: 'Temperature' },
    '0x44': { type: 'uint32', description: 'Acceleration' },
    '0x45': { type: 'outputs', description: 'Outputs' },
    '0x46': { type: 'inputs', description: 'Inputs' },
    '0x47': { type: 'uint8', description: 'Eco Driving' },
    '0x48': { type: 'uint16', description: 'Expanded Status' },
    '0x49': { type: 'uint8', description: 'Transmission Channel' },
    '0x50': { type: 'uint16', description: 'Input Voltage 0' },
    '0x51': { type: 'uint16', description: 'Input Voltage 1' },
    '0x52': { type: 'uint16', description: 'Input Voltage 2' },
    '0x53': { type: 'uint16', description: 'Input Voltage 3' },
    '0x54': { type: 'uint16', description: 'Input Voltage 4' },
    '0x55': { type: 'uint16', description: 'Input Voltage 5' },
    '0x56': { type: 'uint16', description: 'Input Voltage 6' },
    '0xe2': { type: 'uint32', description: 'User Data 0' },
    '0xe3': { type: 'uint32', description: 'User Data 1' },
    '0xe4': { type: 'uint32', description: 'User Data 2' },
    '0xe5': { type: 'uint32', description: 'User Data 3' },
    '0xe6': { type: 'uint32', description: 'User Data 4' },
    '0xe7': { type: 'uint32', description: 'User Data 5' },
    '0xe8': { type: 'uint32', description: 'User Data 6' },
    '0xe9': { type: 'uint32', description: 'User Data 7' },
    '0x0001': { type: 'uint32_modbus', description: 'Modbus 0' },
    '0x0002': { type: 'uint32_modbus', description: 'Modbus 1' },
    '0x0003': { type: 'uint32_modbus', description: 'Modbus 2' },
    '0x0004': { type: 'uint32_modbus', description: 'Modbus 3' },
    '0x0005': { type: 'uint32_modbus', description: 'Modbus 4' },
    '0x0006': { type: 'uint32_modbus', description: 'Modbus 5' },
    '0x0007': { type: 'uint32_modbus', description: 'Modbus 6' },
    '0x0008': { type: 'uint32_modbus', description: 'Modbus 7' },
    '0x0009': { type: 'uint32_modbus', description: 'Modbus 8' },
    '0x000a': { type: 'uint32_modbus', description: 'Modbus 9' },
    '0x000b': { type: 'uint32_modbus', description: 'Modbus 10' },
    '0x000c': { type: 'uint32_modbus', description: 'Modbus 11' },
    '0x000d': { type: 'uint32_modbus', description: 'Modbus 12' },
    '0x000e': { type: 'uint32_modbus', description: 'Modbus 13' },
    '0x000f': { type: 'uint32_modbus', description: 'Modbus 14' },
    '0x0010': { type: 'uint32_modbus', description: 'Modbus 15' }
};

// Packet type handler
class PacketTypeHandler {
    static isMainPacket(packetType) {
        return packetType === 0x01;
    }

    static isIgnorablePacket(packetType) {
        return packetType === 0x15;
    }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Store latest data
let latestData = null;

// Calculate CRC16
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

// Validate packet structure and checksum
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

    console.log(`Packet validation - Header: 0x${header.toString(16)}, Length: ${actualLength}, HasUnsentData: ${hasUnsentData}`);

    // Check if we have the complete packet (HEAD + LENGTH + DATA + CRC)
    const expectedLength = actualLength + 3;  // Header (1) + Length (2) + Data
    if (buffer.length < expectedLength + 2) {  // +2 for CRC
        console.warn(`Incomplete packet: expected ${expectedLength + 2} bytes, got ${buffer.length} bytes`);
        throw new Error('Incomplete packet');
    }

    // For small packets (< 32 bytes), be more lenient with CRC validation
    if (actualLength < 32) {
        console.log(`Small packet detected (${actualLength} bytes) - skipping CRC validation`);
        return {
            hasUnsentData,
            actualLength,
            rawLength
        };
    }

    // Verify checksum for larger packets
    const calculatedChecksum = calculateCRC16(buffer.slice(0, expectedLength));
    const receivedChecksum = buffer.readUInt16LE(expectedLength);

    console.log(`CRC validation - Calculated: 0x${calculatedChecksum.toString(16)}, Received: 0x${receivedChecksum.toString(16)}`);

    if (calculatedChecksum !== receivedChecksum) {
        console.warn(`Checksum mismatch for packet with length ${actualLength}`);
        throw new Error('Checksum mismatch');
    }

    return {
        hasUnsentData,
        actualLength,
        rawLength
    };
}

// Parse extended tags (simplified from original working parser)
async function parseExtendedTags(buffer, offset) {
    const result = {};
    let currentOffset = offset;
    
    // Check if we have enough bytes for the length field
    if (currentOffset + 2 > buffer.length) {
        console.warn('Not enough bytes for extended tags length');
        return [result, currentOffset];
    }
    
    // Read the length of extended tags block (2 bytes)
    const length = buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
    
    const endOffset = currentOffset + length;
    
    // Check if the calculated end offset is within bounds
    if (endOffset > buffer.length) {
        console.warn(`Extended tags length ${length} would exceed buffer bounds. Available: ${buffer.length - currentOffset}`);
        return [result, currentOffset];
    }
    
    while (currentOffset < endOffset) {
        // Check if we have enough bytes for the tag
        if (currentOffset + 2 > endOffset) {
            console.warn('Not enough bytes for extended tag');
            break;
        }
        
        // Extended tags are 2 bytes each
        const tag = buffer.readUInt16LE(currentOffset);
        currentOffset += 2;
        
        // Look up extended tag definition
        const tagHex = `0x${tag.toString(16).padStart(4, '0')}`;
        const definition = tagDefinitions[tagHex];

        if (!definition) {
            console.warn(`Unknown extended tag: ${tagHex}`);
            // Skip 4 bytes for unknown extended tags, but check bounds
            if (currentOffset + 4 <= endOffset) {
            currentOffset += 4;
            } else {
                console.warn('Not enough bytes for unknown extended tag value');
                break;
            }
            continue;
        }

        let value;
        switch (definition.type) {
            case 'uint8':
                if (currentOffset + 1 <= endOffset) {
                value = buffer.readUInt8(currentOffset);
                currentOffset += 1;
                } else {
                    console.warn('Not enough bytes for uint8 value');
                    break;
                }
                break;
            case 'uint16':
                if (currentOffset + 2 <= endOffset) {
                value = buffer.readUInt16LE(currentOffset);
                currentOffset += 2;
                } else {
                    console.warn('Not enough bytes for uint16 value');
                    break;
                }
                break;
            case 'uint32':
                if (currentOffset + 4 <= endOffset) {
                value = buffer.readUInt32LE(currentOffset);
                currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for uint32 value');
                    break;
                }
                break;
            case 'uint32_modbus':
                if (currentOffset + 4 <= endOffset) {
                value = buffer.readUInt32LE(currentOffset)/100;
                currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for uint32_modbus value');
                    break;
                }
                break;
            case 'int8':
                if (currentOffset + 1 <= endOffset) {
                value = buffer.readInt8(currentOffset);
                currentOffset += 1;
                } else {
                    console.warn('Not enough bytes for int8 value');
                    break;
                }
                break;
            case 'int16':
                if (currentOffset + 2 <= endOffset) {
                value = buffer.readInt16LE(currentOffset);
                currentOffset += 2;
                } else {
                    console.warn('Not enough bytes for int16 value');
                    break;
                }
                break;
            case 'int32':
                if (currentOffset + 4 <= endOffset) {
                value = buffer.readInt32LE(currentOffset);
                currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for int32 value');
                    break;
                }
                break;
            default:
                console.warn(`Unsupported extended tag type: ${definition.type}`);
                if (currentOffset + 4 <= endOffset) {
                currentOffset += 4; // Default to 4 bytes
                } else {
                    console.warn('Not enough bytes for default extended tag value');
                    break;
                }
                value = null;
        }

        result[tagHex] = {
            value: value,
            type: definition.type,
            description: definition.description
        };
    }

    return [result, currentOffset];
}

// Parse main packet (adapted from original working parser)
async function parseMainPacket(buffer, offset = 0, actualLength) {
    try {
        const result = {
            header: buffer.readUInt8(offset),
            length: actualLength,
            rawLength: actualLength,
            records: []
        };

        let currentOffset = offset + 3;
        const endOffset = offset + actualLength;

        if (actualLength < 32) {
            // Single record packet
            console.log(`Processing small packet (< 32 bytes) with length: ${actualLength}`);
            const record = { tags: {} };
            let recordOffset = currentOffset;

            while (recordOffset < endOffset - 2) {
                const tag = buffer.readUInt8(recordOffset);
                recordOffset++;

                if (tag === 0xFE) {
                    const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                    Object.assign(record.tags, extendedTags);
                    recordOffset = newOffset;
                    continue;
                }

                const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                const definition = tagDefinitions[tagHex];

                console.log(`🔍 Small packet: Processing tag ${tagHex} at position ${recordOffset - 1}`);
                
                if (!definition) {
                    console.warn(`Unknown tag: ${tagHex}`);
                    continue;
                }

                let value;
                switch (definition.type) {
                    case 'uint8':
                        value = buffer.readUInt8(recordOffset);
                        recordOffset += 1;
                        break;
                    case 'uint16':
                        value = buffer.readUInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'uint32':
                        value = buffer.readUInt32LE(recordOffset);
                        recordOffset += 4;
                        break;
                    case 'uint32_modbus':
                        value = buffer.readUInt32LE(recordOffset)/100;
                        recordOffset += 4;
                        break;
                    case 'int8':
                        value = buffer.readInt8(recordOffset);
                        recordOffset += 1;
                        break;
                    case 'int16':
                        value = buffer.readInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'int32':
                        value = buffer.readInt32LE(recordOffset);
                        recordOffset += 4;
                        break;
                    case 'string':
                        value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                        recordOffset += definition.length;
                        break;
                    case 'datetime':
                        value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                        recordOffset += 4;
                        break;
                    case 'coordinates':
                        const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                        const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                        recordOffset++;
                        const lat = buffer.readInt32LE(recordOffset) / 1000000;
                        recordOffset += 4;
                        const lon = buffer.readInt32LE(recordOffset) / 1000000;
                        recordOffset += 4;
                        value = { latitude: lat, longitude: lon, satellites, correctness };
                        break;
                    case 'status':
                        value = buffer.readUInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'outputs':
                        const outputsValue = buffer.readUInt16LE(recordOffset);
                        const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                        value = {
                            raw: outputsValue,
                            binary: outputsBinary,
                            states: {}
                        };
                        for (let i = 0; i < 16; i++) {
                            value.states[`output${i}`] = outputsBinary[15 - i] === '1';
                        }
                        recordOffset += 2;
                        break;
                    case 'inputs':
                        const inputsValue = buffer.readUInt16LE(recordOffset);
                        const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                        value = {
                            raw: inputsValue,
                            binary: inputsBinary,
                            states: {}
                        };
                        for (let i = 0; i < 16; i++) {
                            value.states[`input${i}`] = inputsBinary[15 - i] === '1';
                        }
                        recordOffset += 2;
                        break;
                    case 'speedDirection':
                        const speedValue = buffer.readUInt16LE(recordOffset);
                        const directionValue = buffer.readUInt16LE(recordOffset + 2);
                        value = {
                            speed: speedValue / 10,
                            direction: directionValue / 10
                        };
                        recordOffset += 4;
                        break;
                    default:
                        console.warn(`Unsupported tag type: ${definition.type}`);
                        recordOffset += definition.length || 1;
                        value = null;
                }

                record.tags[tagHex] = {
                    value: value,
                    type: definition.type,
                    description: definition.description
                };

                console.log(`Small packet - Parsed tag ${tagHex}: ${value}`);

                if (tagHex === '0x03' && definition.type === 'string') {
                    lastIMEI = value;
                    console.log(`IMEI extracted from small packet: ${value}`);
                }
            }

            if (Object.keys(record.tags).length > 0) {
                result.records.push(record);
                console.log(`Small packet parsed with ${Object.keys(record.tags).length} tags: ${Object.keys(record.tags).join(', ')}`);
            }
        } else {
            // Multiple records packet - FIXED VERSION
            console.log('Processing multiple records packet with CORRECTED parser');
            
            // DEBUG: Count how many 0x10 tags (record starts) are in the packet
            let recordStartCount = 0;
            let recordStartPositions = [];
            for (let i = currentOffset; i < endOffset - 2; i++) {
                if (buffer.readUInt8(i) === 0x10) {
                    recordStartCount++;
                    recordStartPositions.push(i);
                }
            }
            console.log(`🔍 DEBUG: Found ${recordStartCount} record start tags (0x10) in packet data`);
            console.log(`🔍 DEBUG: Record start positions: ${recordStartPositions.join(', ')}`);
            
            let dataOffset = currentOffset;
            let recordIndex = 0;
            
            while (dataOffset < endOffset - 2) {
                // Look for next record start (0x10 tag)
                let recordStart = -1;
                for (let i = dataOffset; i < endOffset - 2; i++) {
                    if (buffer.readUInt8(i) === 0x10) {
                        recordStart = i;
                        break;
                    }
                }
                
                if (recordStart === -1) {
                    console.log('No more record starts found');
                    break;
                }
                
                console.log(`Parsing record ${recordIndex + 1} starting at position ${recordStart}`);
                
                // Parse this record completely
                const record = { tags: {} };
                let recordOffset = recordStart;
                
                while (recordOffset < endOffset - 2) {
                    const tag = buffer.readUInt8(recordOffset);
                    recordOffset++;
                    
                    // Check for end of record - look for next 0x10 tag or 0x00
                    if (tag === 0x00) {
                        console.log(`Record ${recordIndex + 1} ended at position ${recordOffset} (found 0x00)`);
                        break;
                    }
                    
                    // Check if we've reached the next record start (0x10 tag)
                    if (tag === 0x10 && recordOffset > recordStart + 1) {
                        console.log(`Record ${recordIndex + 1} ended at position ${recordOffset - 1} (found next 0x10)`);
                        recordOffset--; // Go back one position so the next iteration can process this 0x10
                        break;
                    }
                    
                    if (tag === 0xFE) {
                        const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                        Object.assign(record.tags, extendedTags);
                        recordOffset = newOffset;
                        continue;
                    }
                    
                    const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                    const definition = tagDefinitions[tagHex];
                    
                    console.log(`🔍 Record ${recordIndex + 1}: Processing tag ${tagHex} at position ${recordOffset - 1}`);
                    
                    if (!definition) {
                        console.warn(`Unknown tag: ${tagHex}`);
                        continue;
                    }
                    
                    let value;
                    switch (definition.type) {
                        case 'uint8':
                            value = buffer.readUInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'uint16':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'uint32':
                            value = buffer.readUInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'uint32_modbus':
                            value = buffer.readUInt32LE(recordOffset)/100;
                            recordOffset += 4;
                            break;
                        case 'int8':
                            value = buffer.readInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'int16':
                            value = buffer.readInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'int32':
                            value = buffer.readInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'string':
                            value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                            recordOffset += definition.length;
                            break;
                        case 'datetime':
                            value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                            recordOffset += 4;
                            break;
                        case 'coordinates':
                            const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                            const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                            recordOffset++;
                            const lat = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            const lon = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            value = { latitude: lat, longitude: lon, satellites, correctness };
                            break;
                        case 'status':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'outputs':
                            const outputsValue = buffer.readUInt16LE(recordOffset);
                            const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: outputsValue,
                                binary: outputsBinary,
                                states: {}
                            };
                            for (let i = 0; i < 16; i++) {
                                value.states[`output${i}`] = outputsBinary[15 - i] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'inputs':
                            const inputsValue = buffer.readUInt16LE(recordOffset);
                            const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: inputsValue,
                                binary: inputsBinary,
                                states: {}
                            };
                            for (let i = 0; i < 16; i++) {
                                value.states[`input${i}`] = inputsBinary[15 - i] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'speedDirection':
                            const speedValue = buffer.readUInt16LE(recordOffset);
                            const directionValue = buffer.readUInt16LE(recordOffset + 2);
                            value = {
                                speed: speedValue / 10,
                                direction: directionValue / 10
                            };
                            recordOffset += 4;
                            break;
                        default:
                            console.warn(`Unsupported tag type: ${definition.type}`);
                            recordOffset += definition.length || 1;
                            value = null;
                    }

                    record.tags[tagHex] = {
                        value: value,
                        type: definition.type,
                        description: definition.description
                    };

                    // Extract IMEI from multiple records packet
                    if (tagHex === '0x03' && definition.type === 'string') {
                        lastIMEI = value;
                        console.log(`IMEI extracted from multiple records packet: ${value}`);
                    }
                }

                if (Object.keys(record.tags).length > 0) {
                    result.records.push(record);
                    console.log(`Record ${recordIndex + 1} parsed with ${Object.keys(record.tags).length} tags`);
                }
                
                // FIXED: Properly advance to next record start position
                dataOffset = recordOffset;
                recordIndex++;
                
                console.log(`Advanced dataOffset to position ${dataOffset} for next record search`);
            }
            
            console.log(`📊 MULTIPLE RECORDS SUMMARY: Expected ${recordStartCount} records, processed ${result.records.length} records`);
        }

        return result;
    } catch (error) {
        console.error('Error parsing main packet:', error);
        throw error;
    }
}

// Parse ignorable packet
async function parseIgnorablePacket(buffer) {
    return {
        type: 'ignorable',
        header: buffer.readUInt8(0),
        length: buffer.readUInt16LE(1),
        raw: buffer
    };
}

// Main packet parsing function
async function parsePacket(buffer) {
    try {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a buffer');
        }

        console.log('Raw packet data:', buffer.toString('hex'));

        if (buffer.length < 3) {
            throw new Error('Packet too short');
        }

        const header = buffer.readUInt8(0);
        
        // Validate packet structure and checksum
        const { hasUnsentData, actualLength, rawLength } = validatePacket(buffer);
        
        console.log(`Parsing packet - Type: 0x${header.toString(16)}, Length: ${actualLength}, Small packet: ${actualLength < 32}`);
        
        // Use PacketTypeHandler to determine packet type
        if (PacketTypeHandler.isMainPacket(header)) {
            // This is a Head Packet or Main Packet
            const result = await parseMainPacket(buffer, 0, actualLength);
            result.hasUnsentData = hasUnsentData;
            result.actualLength = actualLength;
            result.rawLength = rawLength;
            
            // Add summary for small packets
            if (actualLength < 32) {
                console.log(`✅ Small packet processed successfully - Records: ${result.records.length}, Tags: ${result.records.map(r => Object.keys(r.tags).length).join(', ')}`);
            }
            
            return result;
        } else if (PacketTypeHandler.isIgnorablePacket(header)) {
            // This is an ignorable packet, just needs confirmation
            return await parseIgnorablePacket(buffer);
        } else {
            // This is an extension packet
            return {
                type: 'extension',
                header: header,
                length: buffer.readUInt16LE(1),
                hasUnsentData,
                actualLength,
                rawLength,
                raw: buffer
            };
        }
    } catch (error) {
        console.error('Parsing error:', error);
        throw error;
    }
}

// Add parsed data to storage
function addParsedData(data, clientAddress = null) {
    try {
        // Get IMEI from connection mapping or data
        let imei = getIMEIFromConnection(clientAddress);
        
        if (!imei && data.imei) {
            imei = data.imei;
        }
        
        if (!imei && data.deviceId) {
            imei = data.deviceId;
        }
        
        console.log(`📱 Got IMEI from connection mapping: ${imei}`);
        
        // If we have records to process
        if (data.records && Array.isArray(data.records)) {
            console.log(`🚀 ENHANCED PARSER: Processing ${data.records.length} records with optimized parser`);
            
            const startTime = Date.now();
            let processedRecords = 0;
            
            for (let recordIndex = 0; recordIndex < data.records.length; recordIndex++) {
                const record = data.records[recordIndex];
                
                // Extract IMEI from record if available
                let recordIMEI = imei;
                if (record.tags && record.tags['0x03'] && record.tags['0x03'].value) {
                    recordIMEI = record.tags['0x03'].value;
                    console.log(`📱 Final device IMEI for record: ${recordIMEI}`);
                }
                
                if (!recordIMEI) {
                    console.warn('No IMEI found for record, skipping');
                    continue;
                }
                
                // Create enhanced record with all available data
                const enhancedRecord = {
                    timestamp: new Date().toISOString(),
                    deviceId: recordIMEI,
                    imei: recordIMEI,
                    clientAddress: clientAddress,
                    recordIndex: recordIndex + 1,
                    
                    // Extract coordinates
                    latitude: record.tags && record.tags['0x30'] ? record.tags['0x30'].value.latitude : null,
                    longitude: record.tags && record.tags['0x30'] ? record.tags['0x30'].value.longitude : null,
                    satellites: record.tags && record.tags['0x30'] ? record.tags['0x30'].value.satellites : null,
                    correctness: record.tags && record.tags['0x30'] ? record.tags['0x30'].value.correctness : null,
                    
                    // Extract speed and direction
                    speed: record.tags && record.tags['0x33'] ? record.tags['0x33'].value.speed : null,
                    direction: record.tags && record.tags['0x33'] ? record.tags['0x33'].value.direction : null,
                    
                    // Extract height
                    height: record.tags && record.tags['0x34'] ? record.tags['0x34'].value : null,
                    
                    // Extract HDOP
                    hdop: record.tags && record.tags['0x35'] ? record.tags['0x35'].value : null,
                    
                    // Extract status
                    status: record.tags && record.tags['0x40'] ? record.tags['0x40'].value : null,
                    
                    // Extract voltages
                    supplyVoltage: record.tags && record.tags['0x41'] ? record.tags['0x41'].value : null,
                    batteryVoltage: record.tags && record.tags['0x42'] ? record.tags['0x42'].value : null,
                    
                    // Extract temperature
                    temperature: record.tags && record.tags['0x43'] ? record.tags['0x43'].value : null,
                    
                    // Extract outputs and inputs
                    outputs: record.tags && record.tags['0x45'] ? record.tags['0x45'].value : null,
                    inputs: record.tags && record.tags['0x46'] ? record.tags['0x46'].value : null,
                    
                    // Extract input voltages
                    inputVoltage0: record.tags && record.tags['0x50'] ? record.tags['0x50'].value : null,
                    inputVoltage1: record.tags && record.tags['0x51'] ? record.tags['0x51'].value : null,
                    inputVoltage2: record.tags && record.tags['0x52'] ? record.tags['0x52'].value : null,
                    inputVoltage3: record.tags && record.tags['0x53'] ? record.tags['0x53'].value : null,
                    inputVoltage4: record.tags && record.tags['0x54'] ? record.tags['0x54'].value : null,
                    inputVoltage5: record.tags && record.tags['0x55'] ? record.tags['0x55'].value : null,
                    
                    // Extract user data
                    userData0: record.tags && record.tags['0xe2'] ? record.tags['0xe2'].value : null,
                    userData1: record.tags && record.tags['0xe3'] ? record.tags['0xe3'].value : null,
                    userData2: record.tags && record.tags['0xe4'] ? record.tags['0xe4'].value : null,
                    
                    // Extract modbus data
                    modbus0: record.tags && record.tags['0x0001'] ? record.tags['0x0001'].value : null,
                    modbus1: record.tags && record.tags['0x0002'] ? record.tags['0x0002'].value : null,
                    
                    // Keep original tags for debugging
                    tags: record.tags || {},
                    
                    // Add archive number if available
                    archiveNumber: record.tags && record.tags['0x10'] ? record.tags['0x10'].value : null,
                    
                    // Add datetime if available
                    datetime: record.tags && record.tags['0x20'] ? record.tags['0x20'].value : null,
                    milliseconds: record.tags && record.tags['0x21'] ? record.tags['0x21'].value : null
                };
                
                // Add to parsed data
                parsedData.push(enhancedRecord);
                
                // Update device tracking
                updateDeviceTracking(recordIMEI, clientAddress, enhancedRecord);
                
                processedRecords++;
            }
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            const recordsPerSecond = Math.round((processedRecords / processingTime) * 1000);
            const msPerRecord = (processingTime / processedRecords).toFixed(2);
            
            console.log(`✅ PARSER FIXED: ${processedRecords} records processed in ${processingTime}ms`);
            console.log(`⚡ Performance: ${recordsPerSecond} records/second`);
            console.log(`📊 Speed: ${msPerRecord}ms per record`);
            
            // Count total tags found
            const totalTags = data.records.reduce((count, record) => {
                return count + (record.tags ? Object.keys(record.tags).length : 0);
            }, 0);
            console.log(`🔍 Tags found: ${totalTags}`);
            
            // Show memory usage
            console.log(`💾 Storage: ${parsedData.length}/${MAX_RECORDS} records in memory`);
            console.log(`📱 Active devices: ${devices.size}`);
            
            // Check if we need to trim data to prevent memory issues
            if (parsedData.length > MAX_RECORDS * 0.9) { // 90% of max
                const recordsToRemove = parsedData.length - MAX_RECORDS;
                parsedData.splice(0, recordsToRemove);
                console.log(`🧹 Memory management: Removed ${recordsToRemove} old records to prevent memory overflow`);
            }
            
        } else {
            // Handle single record (legacy format)
            console.log('Processing single record (legacy format)');
            
            const enhancedRecord = {
                timestamp: new Date().toISOString(),
                deviceId: imei || data.deviceId || 'unknown',
                imei: imei || data.imei || 'unknown',
                clientAddress: clientAddress,
                ...data
            };
            
            parsedData.push(enhancedRecord);
            
            if (imei) {
                updateDeviceTracking(imei, clientAddress, enhancedRecord);
            }
        }
        
        // Emit to Socket.IO clients
        if (parsedData.length > 0) {
            io.emit('deviceData', parsedData[parsedData.length - 1]);
        }
        
    } catch (error) {
        logger.error('Error adding parsed data:', { error: error.message });
    }
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
        activeConnections: activeConnections.size,
        lastUpdate: parsedData.length > 0 ? parsedData[0].timestamp : null,
        devices: Array.from(devices.entries()).map(([id, info]) => ({
            deviceId: id,
            lastSeen: info.lastSeen,
            totalRecords: info.totalRecords,
            clientAddress: info.clientAddress,
            lastLocation: info.lastLocation,
            isConnected: info.clientAddress ? activeConnections.has(info.clientAddress) : false
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
                    const parsedPacket = await parsePacket(packet);
                    
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
                    addParsedData(parsedPacket, clientAddress);

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
    
    // Clean up IMEI mapping
    const imei = connectionToIMEI.get(clientAddress);
    if (imei) {
        console.log(`🔌 Device ${imei} disconnected from ${clientAddress}`);
        connectionToIMEI.delete(clientAddress);
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
        logger.info(`TCP server accessible at: ${ipAddress}:${config.tcpPort}`);
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
    
    // Set headers only once at the beginning
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
            console.log('API /api/data/latest called, returning data:', {
                count: data.length,
                firstRecord: data[0] ? {
                    deviceId: data[0].deviceId,
                    imei: data[0].imei,
                    latitude: data[0].latitude,
                    longitude: data[0].longitude,
                    speed: data[0].speed,
                    direction: data[0].direction,
                    height: data[0].height,
                    satellites: data[0].satellites,
                    supplyVoltage: data[0].supplyVoltage,
                    batteryVoltage: data[0].batteryVoltage,
                    temperature: data[0].temperature,
                    status: data[0].status,
                    hasTags: !!data[0].tags,
                    tagCount: data[0].tags ? Object.keys(data[0].tags).length : 0
                } : null
            });
            res.writeHead(200);
            res.end(JSON.stringify(data));
        } else if (pathname === '/api/stats') {
            const stats = getDeviceStats();
            res.writeHead(200);
            res.end(JSON.stringify(stats));
        } else if (pathname === '/api/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                activeConnections: activeConnections.size,
                totalDevices: devices.size,
                totalRecords: parsedData.length
            }));
        } else if (pathname === '/api/devices') {
            const deviceList = Array.from(devices.entries()).map(([id, info]) => ({
                imei: id,
                name: `Device ${id}`,
                lastSeen: info.lastSeen,
                totalRecords: info.totalRecords,
                lastLocation: info.lastLocation
            }));
            res.writeHead(200);
            res.end(JSON.stringify(deviceList));
        } else if (pathname.match(/^\/api\/data\/(.+)\/tracking$/)) {
            const deviceId = pathname.match(/^\/api\/data\/(.+)\/tracking$/)[1];
            const startDate = new Date(parsedUrl.query.startDate);
            const endDate = new Date(parsedUrl.query.endDate);
            
            // Filter data for the specific device and time range
            const trackingData = parsedData.filter(record => {
                const recordDate = new Date(record.timestamp);
                return record.deviceId === deviceId && 
                       recordDate >= startDate && 
                       recordDate <= endDate &&
                       record.latitude && 
                       record.longitude;
            });
            
            // Sort by timestamp
            trackingData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            res.writeHead(200);
            res.end(JSON.stringify(trackingData));
        } else if (pathname.match(/^\/api\/data\/(.+)\/export$/)) {
            const deviceId = pathname.match(/^\/api\/data\/(.+)\/export$/)[1];
            const startDate = new Date(parsedUrl.query.startDate);
            const endDate = new Date(parsedUrl.query.endDate);
            
            // Filter data for the specific device and time range
            const exportData = parsedData.filter(record => {
                const recordDate = new Date(record.timestamp);
                return record.deviceId === deviceId && 
                       recordDate >= startDate && 
                       recordDate <= endDate;
            });
            
            // Sort by timestamp
            exportData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            res.writeHead(200);
            res.end(JSON.stringify(exportData));
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
        } else if (pathname === '/api/data/save' && req.method === 'POST') {
            // Manual save trigger
            saveData();
            res.writeHead(200);
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Data saved successfully',
                records: parsedData.length,
                devices: devices.size
            }));
        } else if (pathname === '/api/data/clear' && req.method === 'POST') {
            // Clear all data
            parsedData.length = 0;
            devices.clear();
            lastIMEI = null;
            
            // Delete storage files
            try {
                if (fs.existsSync(PARSED_DATA_FILE)) fs.unlinkSync(PARSED_DATA_FILE);
                if (fs.existsSync(DEVICES_FILE)) fs.unlinkSync(DEVICES_FILE);
                if (fs.existsSync(LAST_IMEI_FILE)) fs.unlinkSync(LAST_IMEI_FILE);
            } catch (error) {
                logger.error('Error deleting storage files:', { error: error.message });
            }
            
            res.writeHead(200);
            res.end(JSON.stringify({ 
                success: true, 
                message: 'All data cleared successfully'
            }));
        } else if (pathname === '/api/data/export' && req.method === 'GET') {
            // Export data as JSON
            const exportData = {
                timestamp: new Date().toISOString(),
                records: parsedData,
                devices: Object.fromEntries(devices),
                lastIMEI: lastIMEI,
                totalRecords: parsedData.length,
                totalDevices: devices.size
            };
            
            res.writeHead(200, {
                'Content-Disposition': `attachment; filename="galileosky_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
            });
            res.end(JSON.stringify(exportData, null, 2));
        } else if (pathname === '/api/data/storage-info' && req.method === 'GET') {
            // Get storage information
            const storageInfo = {
                parsedDataFile: {
                    exists: fs.existsSync(PARSED_DATA_FILE),
                    size: fs.existsSync(PARSED_DATA_FILE) ? fs.statSync(PARSED_DATA_FILE).size : 0,
                    path: PARSED_DATA_FILE
                },
                devicesFile: {
                    exists: fs.existsSync(DEVICES_FILE),
                    size: fs.existsSync(DEVICES_FILE) ? fs.statSync(DEVICES_FILE).size : 0,
                    path: DEVICES_FILE
                },
                lastImeiFile: {
                    exists: fs.existsSync(LAST_IMEI_FILE),
                    size: fs.existsSync(LAST_IMEI_FILE) ? fs.statSync(LAST_IMEI_FILE).size : 0,
                    path: LAST_IMEI_FILE
                },
                memoryData: {
                    records: parsedData.length,
                    devices: devices.size,
                    lastIMEI: lastIMEI
                },
                autoSave: {
                    enabled: autoSaveInterval !== null,
                    interval: 30000 // 30 seconds
                }
            };
            
            res.writeHead(200);
            res.end(JSON.stringify(storageInfo, null, 2));
        } else if (pathname === '/api/data' && req.method === 'GET') {
            // Return data in the format expected by peer sync
            // Convert devices Map to object with IMEI keys
            const devicesObject = {};
            devices.forEach((deviceInfo, imei) => {
                devicesObject[imei] = deviceInfo;
            });
            
            res.writeHead(200);
            res.end(JSON.stringify({
                records: parsedData,
                devices: devicesObject,
                lastIMEI: lastIMEI,
                totalRecords: parsedData.length,
                totalDevices: devices.size,
                activeConnections: devices.size
            }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    } catch (error) {
        logger.error('API error:', error);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
}

// Start HTTP server
function startHTTPServer() {
    httpServer = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        logger.info(`${req.method} ${pathname}`);
        
        // Handle peer sync requests
        if (pathname.startsWith('/peer/')) {
            console.log(`📱 Peer request: ${req.method} ${pathname}`);
            peerSync.handlePeerRequest(req, res, parsedData, devices, lastIMEI);
            return;
        }
        
        // Handle API requests
        if (pathname.startsWith('/api/')) {
            handleAPIRequest(req, res);
            return;
        }
        
        // Serve static files
        let filePath = pathname === '/' ? './simple-frontend.html' : '.' + pathname;
        
        // Special handling for mobile peer sync UI
        if (pathname === '/mobile-peer-sync-ui.html') {
            filePath = './mobile-peer-sync-ui.html';
            console.log('📱 Served mobile peer sync UI');
        }
        
        // Security: prevent directory traversal
        if (filePath.includes('..')) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        serveStaticFile(req, res, filePath);
    });

    // Attach Socket.IO to HTTP server
    io.attach(httpServer);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('Socket.IO client connected:', socket.id);
        
        // Send current data to new client
        if (parsedData.length > 0) {
            socket.emit('deviceData', parsedData[0]);
        }
        
        socket.on('disconnect', () => {
            console.log('Socket.IO client disconnected:', socket.id);
        });
        
        socket.on('error', (error) => {
            console.error('Socket.IO error:', error);
        });
    });

    httpServer.listen(config.httpPort, config.host, () => {
        logger.info(`HTTP server listening on ${config.host}:${config.httpPort}`);
        logger.info(`Frontend available at: http://${ipAddress}:${config.httpPort}`);
        logger.info(`API available at: http://${ipAddress}:${config.httpPort}/api/`);
        logger.info(`Socket.IO available at: http://${ipAddress}:${config.httpPort}`);
        logger.info(`Mobile Peer Sync UI: http://${ipAddress}:${config.httpPort}/mobile-peer-sync-ui.html`);
        
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
    
    // Save data before shutting down
    logger.info('Saving data before shutdown...');
    saveData();
    stopAutoSave();
    
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
    // Save data before exiting
    saveData();
    process.exit(1);
});

// Start both servers
logger.info('Starting Galileosky Parser (Enhanced Backend)');

// Load existing data on startup
logger.info('Loading existing data...');
loadData();

// Start auto-save
startAutoSave();

// Start peer sync server
logger.info('Starting peer sync server...');
peerSync.startPeerServer(parsedData, devices, lastIMEI);

// Start servers
startTCPServer();
startHTTPServer(); 