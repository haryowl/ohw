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

// Parse packet data and extract useful information using proper Galileosky protocol
function parsePacketData(buffer) {
    const packetInfo = validatePacket(buffer);
    
    // Extract the data portion (skip header and length)
    const dataStart = 3;
    const dataEnd = packetInfo.expectedLength;
    const data = buffer.slice(dataStart, dataEnd);
    
    // Basic packet info
    const parsedInfo = {
        header: packetInfo.header,
        hasUnsentData: packetInfo.hasUnsentData,
        length: packetInfo.actualLength,
        timestamp: new Date().toISOString(),
        rawData: data.toString('hex').toUpperCase(),
        tags: {},
        parameters: {},
        records: []
    };
    
    // Parse based on packet type and size according to Galileosky protocol
    if (packetInfo.header === 0x01) {
        // Main Packet (0x01) - Parse based on size
        if (packetInfo.actualLength < 32) {
            // Single record main packet (< 32 bytes)
            parsedInfo.packetType = 'Single Record Main Packet';
            parsedInfo.records = [parseSingleRecord(data, 0)];
        } else {
            // Multiple records main packet (>= 32 bytes)
            parsedInfo.packetType = 'Multiple Records Main Packet';
            parsedInfo.records = parseMultipleRecords(data);
        }
    } else if (packetInfo.header === 0x15) {
        // Ignorable packet - just needs confirmation
        parsedInfo.packetType = 'Ignorable Packet';
        parsedInfo.records = [parseIgnorablePacket(data)];
    } else {
        // Extension packet
        parsedInfo.packetType = 'Extension Packet';
        parsedInfo.records = [parseExtensionPacket(data)];
    }
    
    // Extract common parameters from the first record
    if (parsedInfo.records.length > 0) {
        const firstRecord = parsedInfo.records[0];
        Object.assign(parsedInfo, firstRecord);
        
        // Combine all tags from all records
        parsedInfo.tags = {};
        parsedInfo.parameters = {};
        parsedInfo.records.forEach(record => {
            if (record.tags) {
                Object.assign(parsedInfo.tags, record.tags);
            }
            if (record.parameters) {
                Object.assign(parsedInfo.parameters, record.parameters);
            }
        });
    }
    
    // Extract common parameters for easy access
    if (parsedInfo.parameters['IMEI']) {
        parsedInfo.imei = parsedInfo.parameters['IMEI'];
        parsedInfo.deviceId = parsedInfo.parameters['IMEI'];
    }
    
    if (parsedInfo.parameters['Coordinates']) {
        const coords = parsedInfo.parameters['Coordinates'];
        parsedInfo.latitude = coords.latitude;
        parsedInfo.longitude = coords.longitude;
        parsedInfo.satellites = coords.satellites;
    }
    
    if (parsedInfo.parameters['Speed and Direction']) {
        const speedDir = parsedInfo.parameters['Speed and Direction'];
        parsedInfo.speed = speedDir.speed;
        parsedInfo.direction = speedDir.direction;
    }
    
    if (parsedInfo.parameters['Height']) {
        parsedInfo.height = parsedInfo.parameters['Height'];
    }
    
    if (parsedInfo.parameters['Supply Voltage']) {
        parsedInfo.supplyVoltage = parsedInfo.parameters['Supply Voltage'];
    }
    
    if (parsedInfo.parameters['Battery Voltage']) {
        parsedInfo.batteryVoltage = parsedInfo.parameters['Battery Voltage'];
    }
    
    if (parsedInfo.parameters['Inside Temperature']) {
        parsedInfo.temperature = parsedInfo.parameters['Inside Temperature'];
    }
    
    if (parsedInfo.parameters['Status']) {
        parsedInfo.status = parsedInfo.parameters['Status'];
    }
    
    // If no device ID found, create one from the packet hash
    if (!parsedInfo.deviceId) {
        const hash = require('crypto').createHash('md5').update(data).digest('hex').substring(0, 8);
        parsedInfo.deviceId = `DEV_${hash}`;
    }
    
    return parsedInfo;
}

// Parse single record (for packets < 32 bytes)
function parseSingleRecord(buffer, offset) {
    const record = {
        tags: {},
        parameters: {}
    };
    
    let currentOffset = offset;
    
    while (currentOffset < buffer.length - 2) { // -2 for CRC
        const tag = buffer.readUInt8(currentOffset);
        
        // Stop if we encounter a null byte (separator)
        if (tag === 0) {
            break;
        }
        
        try {
            const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
            const tagDef = getTagDefinition(tagHex);
            
            if (tagDef) {
                const [tagValue, newOffset] = parseTagValue(buffer, currentOffset, tagDef);
                if (tagValue !== null) {
                    record.tags[tagHex] = {
                        name: tagDef.name,
                        value: tagValue,
                        type: tagDef.type,
                        description: tagDef.description
                    };
                    
                    // Add to parameters for easy access
                    record.parameters[tagDef.name] = tagValue;
                }
                currentOffset = newOffset;
            } else {
                // Unknown tag, skip it
                currentOffset++;
            }
        } catch (error) {
            // Skip this tag and continue
            currentOffset++;
        }
    }
    
    return record;
}

// Parse multiple records (for packets >= 32 bytes)
function parseMultipleRecords(buffer) {
    const records = [];
    let currentOffset = 0;
    
    // Look for 0x10 tags to identify multiple records
    while (currentOffset < buffer.length - 2) { // -2 for CRC
        // Find the next 0x10 tag (Archive Record Number)
        let recordStart = -1;
        for (let i = currentOffset; i < buffer.length - 2; i++) {
            if (buffer.readUInt8(i) === 0x10) {
                recordStart = i;
                break;
            }
        }
        
        if (recordStart === -1) {
            // No more 0x10 tags found
            break;
        }
        
        // Parse this record
        const record = { tags: {} };
        let recordOffset = recordStart;
        
        while (recordOffset < buffer.length - 2) {
            const tag = buffer.readUInt8(recordOffset);
            recordOffset++;
            
            // Stop if we encounter another 0x10 tag (next record)
            if (tag === 0x10 && recordOffset > recordStart + 1) {
                recordOffset--;
                break;
            }
            
            // Stop if we encounter a null byte (separator)
            if (tag === 0) {
                break;
            }
            
            try {
                const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                const tagDef = getTagDefinition(tagHex);
                
                if (tagDef) {
                    const [tagValue, newOffset] = parseTagValue(buffer, recordOffset, tagDef);
                    if (tagValue !== null) {
                        record.tags[tagHex] = {
                            name: tagDef.name,
                            value: tagValue,
                            type: tagDef.type,
                            description: tagDef.description
                        };
                    }
                    recordOffset = newOffset;
                } else {
                    // Unknown tag, skip it
                    recordOffset++;
                }
            } catch (error) {
                // Skip this tag and continue
                recordOffset++;
            }
        }
        
        // Add record if it has tags
        if (Object.keys(record.tags).length > 0) {
            records.push(record);
        }
        
        // Move to next potential record
        currentOffset = recordStart + 1;
    }
    
    return records;
}

// Parse ignorable packet (0x15)
function parseIgnorablePacket(buffer) {
    return {
        tags: {},
        parameters: {},
        packetType: 'Ignorable Packet',
        message: 'Ignorable packet - only confirmation needed'
    };
}

// Parse extension packet
function parseExtensionPacket(buffer) {
    return {
        tags: {},
        parameters: {},
        packetType: 'Extension Packet',
        rawData: buffer.toString('hex').toUpperCase(),
        message: 'Extension packet - raw data only'
    };
}

// Get tag definition
function getTagDefinition(tagHex) {
    const tagDefinitions = {
        // Basic Device Information
        '0x01': { name: 'Hardware Version', type: 'uint8', length: 1, description: 'Hardware version of the device' },
        '0x02': { name: 'Firmware Version', type: 'uint8', length: 1, description: 'Firmware version of the device' },
        '0x03': { name: 'IMEI', type: 'string', length: 15, description: 'IMEI number of the device' },
        '0x04': { name: 'Device Identifier', type: 'uint16', length: 2, description: 'Identifier of the device' },
        
        // Archive and Time Information
        '0x10': { name: 'Archive Record Number', type: 'uint16', length: 2, description: 'Sequential number of archive record' },
        '0x20': { name: 'Date Time', type: 'datetime', length: 4, description: 'Date and time in Unix timestamp format' },
        '0x21': { name: 'Milliseconds', type: 'uint16', length: 2, description: 'Milliseconds (0-999) to complete date and time value' },
        
        // Location and Navigation
        '0x30': { name: 'Coordinates', type: 'coordinates', length: 9, description: 'GPS/GLONASS coordinates and satellites info' },
        '0x33': { name: 'Speed and Direction', type: 'speedDirection', length: 4, description: 'Speed in km/h and direction in degrees' },
        '0x34': { name: 'Height', type: 'int16', length: 2, description: 'Height above sea level in meters' },
        '0x35': { name: 'HDOP', type: 'uint8', length: 1, description: 'HDOP or cellular location error in meters' },
        
        // Device Status
        '0x40': { name: 'Status', type: 'status', length: 2, description: 'Device status bits' },
        '0x41': { name: 'Supply Voltage', type: 'uint16', length: 2, description: 'Supply voltage in mV' },
        '0x42': { name: 'Battery Voltage', type: 'uint16', length: 2, description: 'Battery voltage in mV' },
        '0x43': { name: 'Inside Temperature', type: 'int8', length: 1, description: 'Internal temperature in °C' },
        '0x44': { name: 'Acceleration', type: 'uint32', length: 4, description: 'Acceleration' },
        '0x45': { name: 'Status of outputs', type: 'outputs', length: 2, description: 'Status of outputs' },
        '0x46': { name: 'Status of inputs', type: 'inputs', length: 2, description: 'Status of inputs' },
        '0x47': { name: 'ECO and driving style', type: 'uint32', length: 4, description: 'ECO and driving style' },
        '0x48': { name: 'Expanded status of the device', type: 'uint16', length: 2, description: 'Expanded status of the device' },
        '0x49': { name: 'Transmission channel', type: 'uint8', length: 1, description: 'Transmission channel' },
        
        // Input voltages
        '0x50': { name: 'Input voltage 0', type: 'uint16', length: 2, description: 'Input voltage 0' },
        '0x51': { name: 'Input voltage 1', type: 'uint16', length: 2, description: 'Input voltage 1' },
        '0x52': { name: 'Input voltage 2', type: 'uint16', length: 2, description: 'Input voltage 2' },
        '0x53': { name: 'Input voltage 3', type: 'uint16', length: 2, description: 'Input voltage 3' },
        '0x54': { name: 'Input 4 Values', type: 'uint16', length: 2, description: 'Input 4 Values' },
        '0x55': { name: 'Input 5 Values', type: 'uint16', length: 2, description: 'Input 5 Values' },
        '0x56': { name: 'Input 6 Values', type: 'uint16', length: 2, description: 'Input 6 Values' },
        '0x57': { name: 'Input 7 Values', type: 'uint16', length: 2, description: 'Input 7 Values' },
        '0x58': { name: 'RS232 0', type: 'uint16', length: 2, description: 'RS232 0' },
        '0x59': { name: 'RS232 1', type: 'uint16', length: 2, description: 'RS232 1' },
        
        // GSM Information
        '0x60': { name: 'GSM Network Code', type: 'uint32', length: 4, description: 'GSM network code (extended)' },
        '0x61': { name: 'GSM Location Area Code', type: 'uint32', length: 4, description: 'GSM location area code (extended)' },
        '0x62': { name: 'GSM Signal Level', type: 'uint8', length: 1, description: 'GSM signal level (0-31)' },
        '0x63': { name: 'GSM Cell ID', type: 'uint16', length: 2, description: 'GSM cell identifier' },
        '0x64': { name: 'GSM Area Code', type: 'uint16', length: 2, description: 'GSM area code' },
        '0x65': { name: 'GSM Operator Code', type: 'uint16', length: 2, description: 'GSM operator code' },
        '0x66': { name: 'GSM Base Station', type: 'uint16', length: 2, description: 'GSM base station identifier' },
        '0x67': { name: 'GSM Country Code', type: 'uint16', length: 2, description: 'GSM country code' },
        '0x68': { name: 'GSM Network Code', type: 'uint16', length: 2, description: 'GSM network code' },
        '0x69': { name: 'GSM Location Area Code', type: 'uint16', length: 2, description: 'GSM location area code' },
        
        // Sensors
        '0x73': { name: 'Temperature Sensor', type: 'int16', length: 2, description: 'Temperature sensor reading in °C' },
        '0x74': { name: 'Humidity Sensor', type: 'uint8', length: 1, description: 'Humidity sensor reading in %' },
        '0x75': { name: 'Pressure Sensor', type: 'uint16', length: 2, description: 'Pressure sensor reading in hPa' },
        '0x76': { name: 'Light Sensor', type: 'uint16', length: 2, description: 'Light sensor reading in lux' },
        '0x77': { name: 'Accelerometer', type: 'int16', length: 2, description: 'Accelerometer readings (X, Y, Z) in m/s²' },
        
        // User data
        '0xe2': { name: 'User data 0', type: 'uint32', length: 4, description: 'User data 0' },
        '0xe3': { name: 'User data 1', type: 'uint32', length: 4, description: 'User data 1' },
        '0xe4': { name: 'User data 2', type: 'uint32', length: 4, description: 'User data 2' },
        '0xe5': { name: 'User data 3', type: 'uint32', length: 4, description: 'User data 3' },
        '0xe6': { name: 'User data 4', type: 'uint32', length: 4, description: 'User data 4' },
        '0xe7': { name: 'User data 5', type: 'uint32', length: 4, description: 'User data 5' },
        '0xe8': { name: 'User data 6', type: 'uint32', length: 4, description: 'User data 6' },
        '0xe9': { name: 'User data 7', type: 'uint32', length: 4, description: 'User data 7' }
    };
    
    return tagDefinitions[tagHex];
}

// Parse tag value based on type
function parseTagValue(buffer, offset, tagDef) {
    const tag = buffer.readUInt8(offset);
    offset++; // Skip tag byte
    
    try {
        let value;
        let bytesRead = 0;

        switch (tagDef.type) {
            case 'uint8':
                value = buffer.readUInt8(offset);
                bytesRead = 1;
                break;

            case 'uint16':
                value = buffer.readUInt16LE(offset);
                bytesRead = 2;
                break;

            case 'uint32':
                value = buffer.readUInt32LE(offset);
                bytesRead = 4;
                break;

            case 'int8':
                value = buffer.readInt8(offset);
                bytesRead = 1;
                break;

            case 'int16':
                value = buffer.readInt16LE(offset);
                bytesRead = 2;
                break;

            case 'int32':
                value = buffer.readInt32LE(offset);
                bytesRead = 4;
                break;

            case 'string':
                if (tagDef.length) {
                    value = buffer.slice(offset, offset + tagDef.length).toString('ascii');
                    bytesRead = tagDef.length;
                } else {
                    const strLength = buffer.readUInt8(offset);
                    value = buffer.slice(offset + 1, offset + 1 + strLength).toString('ascii');
                    bytesRead = strLength + 1;
                }
                break;

            case 'coordinates':
                const satellites = buffer.readUInt8(offset) & 0x0F;
                const correctness = (buffer.readUInt8(offset) >> 4) & 0x0F;
                const lat = buffer.readInt32LE(offset + 1) / 1000000;
                const lon = buffer.readInt32LE(offset + 5) / 1000000;
                value = { 
                    latitude: lat, 
                    longitude: lon, 
                    satellites,
                    correctness,
                    source: correctness === 0 ? 'GPS/GLONASS' : 
                           correctness === 2 ? 'Cellular' : 'Unknown'
                };
                bytesRead = 9;
                break;

            case 'speedDirection':
                const speed = buffer.readUInt16LE(offset) / 10; // Convert to km/h
                const direction = buffer.readUInt16LE(offset + 2);
                value = { speed, direction };
                bytesRead = 4;
                break;

            case 'datetime':
                value = new Date(buffer.readUInt32LE(offset) * 1000);
                bytesRead = 4;
                break;

            case 'status':
                value = buffer.readUInt16LE(offset);
                bytesRead = 2;
                break;

            case 'outputs':
                value = buffer.readUInt16LE(offset);
                bytesRead = 2;
                break;

            case 'inputs':
                value = buffer.readUInt16LE(offset);
                bytesRead = 2;
                break;

            default:
                // For unknown types, try to read as many bytes as specified
                if (tagDef.length && offset + tagDef.length <= buffer.length) {
                    value = buffer.slice(offset, offset + tagDef.length).toString('hex').toUpperCase();
                    bytesRead = tagDef.length;
                } else {
                    return [null, offset];
                }
        }

        return [value, offset + bytesRead];

    } catch (error) {
        return [null, offset];
    }
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