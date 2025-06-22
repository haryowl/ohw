const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Global variables for IMEI persistence
let lastIMEI = null;
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

// Tag definitions from tagDefinitions.js
const tagDefinitions = {
    '0x01': { type: 'uint8', description: 'Number Archive Records' },
    '0x02': { type: 'uint8', description: 'Number Event Records' },
    '0x03': { type: 'string', length: 15, description: 'IMEI' },
    '0x04': { type: 'uint8', description: 'Number Service Records' },
    '0x10': { type: 'uint8', description: 'Number Archive Records' },
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
    '0x44': { type: 'uint16', description: 'Acceleration' },
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
        hasUnsentData,
        actualLength,
        rawLength
    };
}

// Parse extended tags (0xFE) - following parser.js exactly
async function parseExtendedTags(buffer, offset) {
    const result = {};
    let currentOffset = offset;
    
    // Read the length of extended tags block (2 bytes)
    const length = buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
    
    const endOffset = currentOffset + length;
    
    while (currentOffset < endOffset) {
        // Extended tags are 2 bytes each
        const tag = buffer.readUInt16LE(currentOffset);
        currentOffset += 2;
        
        // Look up extended tag definition
        const tagHex = `0x${tag.toString(16).padStart(4, '0')}`;
        const definition = tagDefinitions[tagHex];

        if (!definition) {
            console.warn(`Unknown extended tag: ${tagHex}`);
            // Skip 4 bytes for unknown extended tags
            currentOffset += 4;
            continue;
        }

        let value;
        switch (definition.type) {
            case 'uint8':
                value = buffer.readUInt8(currentOffset);
                currentOffset += 1;
                break;
            case 'uint16':
                value = buffer.readUInt16LE(currentOffset);
                currentOffset += 2;
                break;
            case 'uint32':
                value = buffer.readUInt32LE(currentOffset);
                currentOffset += 4;
                break;
            case 'uint32_modbus':
                value = buffer.readUInt32LE(currentOffset)/100;
                currentOffset += 4;
                break;
            case 'int8':
                value = buffer.readInt8(currentOffset);
                currentOffset += 1;
                break;
            case 'int16':
                value = buffer.readInt16LE(currentOffset);
                currentOffset += 2;
                break;
            case 'int32':
                value = buffer.readInt32LE(currentOffset);
                currentOffset += 4;
                break;
            default:
                console.warn(`Unsupported extended tag type: ${definition.type}`);
                currentOffset += 4; // Default to 4 bytes
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

// Parse main packet following parser.js implementation
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
            const record = { tags: {} };
            let recordOffset = currentOffset;

            while (recordOffset < endOffset - 2) {
                const tag = buffer.readUInt8(recordOffset);
                recordOffset++;

                console.log('Found tag:', `0x${tag.toString(16).padStart(2, '0')}`);

                if (tag === 0xFE) {
                    const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                    Object.assign(record.tags, extendedTags);
                    recordOffset = newOffset;
                    continue;
                }

                const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                const definition = tagDefinitions[tagHex];

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

                if (tagHex === '0x03' && definition.type === 'string') {
                    lastIMEI = value;
                }
            }

            if (Object.keys(record.tags).length > 0) {
                result.records.push(record);
                console.log('Extracted tags:', Object.keys(record.tags));
                console.log('Sample tag data:', record.tags);
            }
        } else {
            // For packets >= 32 bytes, check if there's a 0x10 tag (Number Archive Records)
            let hasMultipleRecords = false;
            let searchOffset = currentOffset;
            
            // Look for 0x10 tag to determine if this is a single record or multiple records
            while (searchOffset < endOffset - 2) {
                if (buffer.readUInt8(searchOffset) === 0x10) {
                    hasMultipleRecords = true;
                    break;
                }
                searchOffset++;
            }

            console.log('Packet analysis:', {
                actualLength,
                hasMultipleRecords,
                searchOffset: searchOffset - currentOffset,
                timestamp: new Date().toISOString()
            });

            if (hasMultipleRecords) {
                // Multiple records - look for 0x10 tags
                while (currentOffset < endOffset - 2) {
                    if (buffer.readUInt8(currentOffset) !== 0x10) {
                        currentOffset++;
                        continue;
                    }

                    const record = { tags: {} };
                    let recordOffset = currentOffset;

                    while (recordOffset < endOffset - 2) {
                        const tag = buffer.readUInt8(recordOffset);
                        recordOffset++;

                        console.log('Found tag:', `0x${tag.toString(16).padStart(2, '0')}`);

                        if (tag === 0x10 && recordOffset > currentOffset + 1) {
                            recordOffset--;
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

                        if (tagHex === '0x03' && definition.type === 'string') {
                            lastIMEI = value;
                        }
                    }

                    if (Object.keys(record.tags).length > 0) {
                        result.records.push(record);
                        console.log('Extracted tags:', Object.keys(record.tags));
                        console.log('Sample tag data:', record.tags);
                    }

                    currentOffset = recordOffset;
                }
            } else {
                // Single record - parse directly from currentOffset
                console.log('Processing single record packet');
                const record = { tags: {} };
                let recordOffset = currentOffset;

                while (recordOffset < endOffset - 2) {
                    const tag = buffer.readUInt8(recordOffset);
                    recordOffset++;

                    console.log('Found tag:', `0x${tag.toString(16).padStart(2, '0')}`);

                    if (tag === 0xFE) {
                        const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                        Object.assign(record.tags, extendedTags);
                        recordOffset = newOffset;
                        continue;
                    }

                    const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                    const definition = tagDefinitions[tagHex];

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

                    if (tagHex === '0x03' && definition.type === 'string') {
                        lastIMEI = value;
                    }
                }

                if (Object.keys(record.tags).length > 0) {
                    result.records.push(record);
                    console.log('Extracted tags:', Object.keys(record.tags));
                    console.log('Sample tag data:', record.tags);
                }
            }
        }

        console.log('Raw packet data:', buffer.toString('hex'));
        console.log('Packet length:', actualLength);
        console.log('Current offset:', currentOffset);
        console.log('End offset:', endOffset);

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
        
        // Use PacketTypeHandler to determine packet type
        if (PacketTypeHandler.isMainPacket(header)) {
            // This is a Head Packet or Main Packet
            const result = await parseMainPacket(buffer, 0, actualLength);
            result.hasUnsentData = hasUnsentData;
            result.actualLength = actualLength;
            result.rawLength = rawLength;
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
function addParsedData(data) {
    if (!data || typeof data !== 'object') return;
    
    // If this is a main packet with records, extract data from the first record
    if (data.records && data.records.length > 0) {
        const record = data.records[0];
        const tags = record.tags;
        
        // Extract common fields from tags
        const extractedData = {
            timestamp: new Date().toISOString(),
            deviceId: lastIMEI || 'unknown', // Use persisted IMEI
            imei: lastIMEI || null,
            latitude: null,
            longitude: null,
            satellites: null,
            correctness: null,
            speed: null,
            direction: null,
            altitude: null,
            course: null,
            hdop: null,
            vdop: null,
            pdop: null,
            temperature: null,
            voltage: null,
            inputs: null,
            outputs: null,
            status: null,
            rawData: data,
            tags: tags
        };
        
        // Extract IMEI (tag 0x03) and persist it
        if (tags['0x03']) {
            extractedData.imei = tags['0x03'].value;
            extractedData.deviceId = tags['0x03'].value;
            lastIMEI = tags['0x03'].value; // Persist IMEI for future packets
            console.log('IMEI extracted and persisted:', lastIMEI);
        }
        
        // Extract coordinates (tag 0x20)
        if (tags['0x20']) {
            const coords = tags['0x20'].value;
            if (coords && typeof coords === 'object') {
                extractedData.latitude = coords.latitude;
                extractedData.longitude = coords.longitude;
                extractedData.satellites = coords.satellites;
                extractedData.correctness = coords.correctness;
                console.log('Coordinates extracted:', { lat: coords.latitude, lon: coords.longitude });
            }
        }
        
        // Extract speed and direction (tag 0x21)
        if (tags['0x21']) {
            const speedDir = tags['0x21'].value;
            if (speedDir && typeof speedDir === 'object') {
                extractedData.speed = speedDir.speed;
                extractedData.direction = speedDir.direction;
                console.log('Speed/Direction extracted:', { speed: speedDir.speed, direction: speedDir.direction });
            }
        }
        
        // Extract altitude (tag 0x22)
        if (tags['0x22']) {
            extractedData.altitude = tags['0x22'].value;
            console.log('Altitude extracted:', tags['0x22'].value);
        }
        
        // Extract course (tag 0x23)
        if (tags['0x23']) {
            extractedData.course = tags['0x23'].value;
            console.log('Course extracted:', tags['0x23'].value);
        }
        
        // Extract HDOP (tag 0x24)
        if (tags['0x24']) {
            extractedData.hdop = tags['0x24'].value;
            console.log('HDOP extracted:', tags['0x24'].value);
        }
        
        // Extract VDOP (tag 0x25)
        if (tags['0x25']) {
            extractedData.vdop = tags['0x25'].value;
            console.log('VDOP extracted:', tags['0x25'].value);
        }
        
        // Extract PDOP (tag 0x26)
        if (tags['0x26']) {
            extractedData.pdop = tags['0x26'].value;
            console.log('PDOP extracted:', tags['0x26'].value);
        }
        
        // Extract temperature (tag 0x30)
        if (tags['0x30']) {
            extractedData.temperature = tags['0x30'].value;
            console.log('Temperature extracted:', tags['0x30'].value);
        }
        
        // Extract voltage (tag 0x31)
        if (tags['0x31']) {
            extractedData.voltage = tags['0x31'].value;
            console.log('Voltage extracted:', tags['0x31'].value);
        }
        
        // Extract inputs (tag 0x40)
        if (tags['0x40']) {
            extractedData.inputs = tags['0x40'].value;
            console.log('Inputs extracted:', tags['0x40'].value);
        }
        
        // Extract outputs (tag 0x41)
        if (tags['0x41']) {
            extractedData.outputs = tags['0x41'].value;
            console.log('Outputs extracted:', tags['0x41'].value);
        }
        
        // Extract status (tag 0x50)
        if (tags['0x50']) {
            extractedData.status = tags['0x50'].value;
            console.log('Status extracted:', tags['0x50'].value);
        }
        
        // Add to data array
        parsedData.unshift(extractedData);
        
        // Limit data to last 1000 records
        if (parsedData.length > 1000) {
            parsedData = parsedData.slice(0, 1000);
        }
        
        // Track device
        if (extractedData.deviceId && extractedData.deviceId !== 'unknown') {
            devices.set(extractedData.deviceId, {
                lastSeen: new Date(),
                lastLocation: {
                    latitude: extractedData.latitude,
                    longitude: extractedData.longitude
                },
                totalRecords: (devices.get(extractedData.deviceId)?.totalRecords || 0) + 1
            });
        }
        
        console.log('Final extracted data:', {
            deviceId: extractedData.deviceId,
            imei: extractedData.imei,
            latitude: extractedData.latitude,
            longitude: extractedData.longitude,
            speed: extractedData.speed,
            temperature: extractedData.temperature,
            voltage: extractedData.voltage
        });
        
        logger.info(`Added data for device: ${extractedData.deviceId || 'unknown'}`);
        
    } else {
        // Handle other packet types (ignorable, extension, etc.)
        const simpleData = {
            timestamp: new Date().toISOString(),
            deviceId: lastIMEI || data.deviceId || 'unknown',
            imei: lastIMEI || data.imei,
            type: data.header ? `0x${data.header.toString(16).padStart(2, '0')}` : 'unknown',
            rawData: data
        };
        
        parsedData.unshift(simpleData);
        
        if (parsedData.length > 1000) {
            parsedData = parsedData.slice(0, 1000);
        }
        
        logger.info(`Added data for device: ${simpleData.deviceId || 'unknown'}`);
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
            console.log('API /api/data/latest called, returning data:', {
                count: data.length,
                firstRecord: data[0] ? {
                    deviceId: data[0].deviceId,
                    imei: data[0].imei,
                    latitude: data[0].latitude,
                    longitude: data[0].longitude,
                    speed: data[0].speed,
                    temperature: data[0].temperature,
                    voltage: data[0].voltage
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