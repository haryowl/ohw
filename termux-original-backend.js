const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Import original parser components
const tagDefinitions = require('./original/tagDefinitions');
const TagParser = require('./original/tagParser');

class GalileoskyParser {
    constructor() {
        this.maxPacketSize = 32768;
        this.validateChecksum = true;
        this.parsers = new Map();
        this.initializeParsers();
        this.streamBuffer = null;
        this.lastIMEI = null;
        this.parsedData = [];
        this.devices = new Map();
    }

    initializeParsers() {
        this.packetTypes = {
            0x01: this.parseMainPacket,
            0x15: this.parseIgnorablePacket
        };
    }

    async parse(buffer) {
        try {
            if (!Buffer.isBuffer(buffer)) {
                throw new Error('Input must be a buffer');
            }

            console.log('Raw packet data:', buffer.toString('hex'));

            if (buffer.length < 3) {
                throw new Error('Packet too short');
            }

            const header = buffer.readUInt8(0);
            
            const { hasUnsentData, actualLength, rawLength } = this.validatePacket(buffer);
            
            if (this.isMainPacket(header)) {
                const result = await this.parseMainPacket(buffer, 0, actualLength);
                result.hasUnsentData = hasUnsentData;
                result.actualLength = actualLength;
                result.rawLength = rawLength;
                return result;
            } else if (this.isIgnorablePacket(header)) {
                return await this.parseIgnorablePacket(buffer);
            } else {
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

    validatePacket(buffer) {
        if (buffer.length < 3) {
            throw new Error('Packet too short');
        }

        const header = buffer.readUInt8(0);
        const rawLength = buffer.readUInt16LE(1);
        
        const hasUnsentData = (rawLength & 0x8000) !== 0;
        const actualLength = rawLength & 0x7FFF;

        const expectedLength = actualLength + 3;
        if (buffer.length < expectedLength + 2) {
            throw new Error('Incomplete packet');
        }

        if (this.validateChecksum) {
            const calculatedChecksum = this.calculateCRC16(buffer.slice(0, expectedLength));
            const receivedChecksum = buffer.readUInt16LE(expectedLength);

            if (calculatedChecksum !== receivedChecksum) {
                throw new Error('Checksum mismatch');
            }
        }

        return {
            hasUnsentData,
            actualLength,
            rawLength
        };
    }

    calculateCRC16(buffer) {
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

    async parseMainPacket(buffer, offset = 0, actualLength) {
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
                const record = { tags: {} };
                let recordOffset = currentOffset;

                while (recordOffset < endOffset - 2) {
                    const tag = buffer.readUInt8(recordOffset);
                    recordOffset++;

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
                        case 'coordinates':
                            value = this.parseCoordinates(buffer, recordOffset);
                            recordOffset += definition.length;
                            break;
                        case 'speedDirection':
                            value = this.parseSpeedDirection(buffer, recordOffset);
                            recordOffset += 4;
                            break;
                        case 'status':
                            value = this.parseStatus(buffer, recordOffset);
                            recordOffset += 2;
                            break;
                        case 'datetime':
                            value = this.parseTimestamp(buffer.readUInt32LE(recordOffset));
                            recordOffset += 4;
                            break;
                        case 'outputs':
                        case 'inputs':
                            value = this.parseInputsOutputs(buffer, recordOffset);
                            recordOffset += 2;
                            break;
                        default:
                            console.warn(`Unhandled tag type: ${definition.type} for tag ${tagHex}`);
                            recordOffset += definition.length;
                            continue;
                    }

                    record.tags[definition.name] = {
                        value: value,
                        type: definition.type,
                        description: definition.description
                    };
                }

                result.records.push(record);
            } else {
                // Handle larger packets with multiple records
                while (currentOffset < endOffset) {
                    const record = await this.parseRecord(buffer, currentOffset);
                    if (record) {
                        result.records.push(record);
                        currentOffset += record.length || 32;
                    } else {
                        break;
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('Error parsing main packet:', error);
            throw error;
        }
    }

    parseCoordinates(buffer, offset) {
        const lat = buffer.readInt32LE(offset) / 100000;
        const lon = buffer.readInt32LE(offset + 4);
        const satellites = buffer.readUInt8(offset + 8);
        
        return {
            latitude: lat,
            longitude: lon,
            satellites: satellites
        };
    }

    parseSpeedDirection(buffer, offset) {
        const speed = buffer.readUInt16LE(offset) / 10; // km/h
        const direction = buffer.readUInt16LE(offset + 2); // degrees
        
        return {
            speed: speed,
            direction: direction
        };
    }

    parseStatus(buffer, offset) {
        const status = buffer.readUInt16LE(offset);
        
        return {
            raw: status,
            gps: (status & 0x01) !== 0,
            gsm: (status & 0x02) !== 0,
            power: (status & 0x04) !== 0,
            ignition: (status & 0x08) !== 0,
            movement: (status & 0x10) !== 0,
            alarm: (status & 0x20) !== 0
        };
    }

    parseTimestamp(seconds) {
        return new Date(seconds * 1000);
    }

    parseInputsOutputs(buffer, offset) {
        const value = buffer.readUInt16LE(offset);
        const bits = [];
        
        for (let i = 0; i < 16; i++) {
            bits.push((value & (1 << i)) !== 0);
        }
        
        return {
            raw: value,
            bits: bits
        };
    }

    async parseRecord(buffer, offset) {
        // Simplified record parsing
        const record = { tags: {} };
        let recordOffset = offset;
        
        while (recordOffset < offset + 32 && recordOffset < buffer.length - 2) {
            const tag = buffer.readUInt8(recordOffset);
            recordOffset++;

            const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
            const definition = tagDefinitions[tagHex];

            if (!definition) {
                continue;
            }

            let value;
            try {
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
                    case 'coordinates':
                        value = this.parseCoordinates(buffer, recordOffset);
                        recordOffset += definition.length;
                        break;
                    case 'speedDirection':
                        value = this.parseSpeedDirection(buffer, recordOffset);
                        recordOffset += 4;
                        break;
                    case 'status':
                        value = this.parseStatus(buffer, recordOffset);
                        recordOffset += 2;
                        break;
                    case 'datetime':
                        value = this.parseTimestamp(buffer.readUInt32LE(recordOffset));
                        recordOffset += 4;
                        break;
                    default:
                        recordOffset += definition.length;
                        continue;
                }

                record.tags[definition.name] = {
                    value: value,
                    type: definition.type,
                    description: definition.description
                };
            } catch (error) {
                console.warn(`Error parsing tag ${tagHex}:`, error);
                break;
            }
        }

        record.length = recordOffset - offset;
        return record;
    }

    isMainPacket(header) {
        return header === 0x01;
    }

    isIgnorablePacket(header) {
        return header === 0x15;
    }

    async parseIgnorablePacket(buffer) {
        return {
            type: 'ignorable',
            header: buffer.readUInt8(0),
            length: buffer.readUInt16LE(1),
            raw: buffer
        };
    }

    addParsedData(data) {
        const timestamp = new Date();
        const entry = {
            timestamp: timestamp,
            data: data,
            imei: this.extractIMEI(data)
        };
        
        this.parsedData.push(entry);
        
        // Keep only last 1000 entries to prevent memory issues
        if (this.parsedData.length > 1000) {
            this.parsedData = this.parsedData.slice(-1000);
        }
        
        // Update device info
        if (entry.imei) {
            this.devices.set(entry.imei, {
                lastSeen: timestamp,
                data: entry.data
            });
        }
    }

    extractIMEI(data) {
        if (data.records && data.records.length > 0) {
            const record = data.records[0];
            if (record.tags && record.tags.IMEI) {
                return record.tags.IMEI.value;
            }
        }
        return null;
    }

    getParsedData() {
        return this.parsedData;
    }

    getDevices() {
        return Array.from(this.devices.entries()).map(([imei, info]) => ({
            imei: imei,
            lastSeen: info.lastSeen,
            data: info.data
        }));
    }
}

class GalileoSkyServer {
    constructor(tcpPort = 3003, httpPort = 3001) {
        this.tcpPort = tcpPort;
        this.httpPort = httpPort;
        this.tcpServer = null;
        this.httpServer = null;
        this.parser = new GalileoskyParser();
        this.streamBuffers = new Map();
        this.isFirstPacket = new Map();
    }

    start() {
        this.startTCPServer();
        this.startHTTPServer();
    }

    startTCPServer() {
        console.log(`Starting TCP server on port ${this.tcpPort}...`);
        
        this.tcpServer = net.createServer((socket) => {
            console.log('Client connected:', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort
            });

            this.streamBuffers.set(socket, Buffer.alloc(0));
            this.isFirstPacket.set(socket, true);

            socket.on('data', async (data) => {
                try {
                    console.log('Received data from client:', {
                        remoteAddress: socket.remoteAddress,
                        dataLength: data.length,
                        firstBytes: data.slice(0, 10).toString('hex')
                    });

                    const buffer = this.streamBuffers.get(socket);
                    this.streamBuffers.set(socket, Buffer.concat([buffer, data]));
                    await this.processStreamBuffer(socket);
                } catch (error) {
                    console.error('Error processing data:', error);
                }
            });

            socket.on('end', () => {
                console.log('Client disconnected:', {
                    remoteAddress: socket.remoteAddress,
                    remotePort: socket.remotePort
                });
                this.streamBuffers.delete(socket);
                this.isFirstPacket.delete(socket);
            });

            socket.on('error', (error) => {
                console.error('Socket error:', {
                    remoteAddress: socket.remoteAddress,
                    error: error.message
                });
                this.streamBuffers.delete(socket);
                this.isFirstPacket.delete(socket);
            });
        });

        this.tcpServer.listen(this.tcpPort, '0.0.0.0', () => {
            console.log(`TCP server listening on port ${this.tcpPort}`);
        });
    }

    async processStreamBuffer(socket) {
        const buffer = this.streamBuffers.get(socket);
        const isFirst = this.isFirstPacket.get(socket);
        
        while (buffer.length > 0) {
            console.log('Buffer state:', {
                length: buffer.length,
                content: buffer.toString('hex'),
                firstBytes: buffer.slice(0, Math.min(10, buffer.length)).toString('hex')
            });

            if (buffer.length < 3) {
                console.log('Waiting for more data...');
                break;
            }

            const packetType = buffer[0];
            const length = buffer.readUInt16LE(1);

            console.log('Packet header:', {
                type: `0x${packetType.toString(16)}`,
                length: length,
                bufferLength: buffer.length,
                isFirstPacket: isFirst
            });

            if (length > 32767) {
                console.error('Invalid packet length:', length);
                this.streamBuffers.set(socket, buffer.slice(1));
                continue;
            }

            const expectedLength = length + 5;
            if (buffer.length < expectedLength) {
                console.log('Incomplete packet, waiting for more data...');
                
                // Send confirmation packet
                const confirmationPacket = Buffer.from([0x02, 0x3F, 0xFA]);
                if (socket.writable) {
                    socket.write(confirmationPacket, (err) => {
                        if (err) {
                            console.error('Error sending confirmation:', err);
                        } else {
                            console.log('Confirmation sent successfully');
                        }
                    });
                }
                break;
            }

            try {
                const packetData = buffer.slice(0, expectedLength);
                const parsed = await this.parser.parse(packetData);
                
                console.log('Parsed packet:', JSON.stringify(parsed, null, 2));
                
                // Add to parsed data
                this.parser.addParsedData(parsed);
                
                // Send confirmation
                const confirmationPacket = Buffer.from([0x02, 0x3F, 0xFA]);
                if (socket.writable) {
                    socket.write(confirmationPacket, (err) => {
                        if (err) {
                            console.error('Error sending confirmation:', err);
                        } else {
                            console.log('Confirmation sent successfully');
                        }
                    });
                }
                
                // Remove processed packet from buffer
                this.streamBuffers.set(socket, buffer.slice(expectedLength));
                this.isFirstPacket.set(socket, false);
                
            } catch (error) {
                console.error('Error parsing packet:', error);
                // Remove first byte and continue
                this.streamBuffers.set(socket, buffer.slice(1));
            }
        }
    }

    startHTTPServer() {
        console.log(`Starting HTTP server on port ${this.httpPort}...`);
        
        this.httpServer = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.url === '/api/data') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: this.parser.getParsedData(),
                    devices: this.parser.getDevices()
                }));
                return;
            }

            if (req.url === '/api/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    status: 'connected',
                    timestamp: new Date().toISOString(),
                    dataCount: this.parser.getParsedData().length,
                    deviceCount: this.parser.getDevices().length
                }));
                return;
            }

            if (req.url === '/api/download') {
                const data = this.parser.getParsedData();
                let csv = 'Timestamp,IMEI,Latitude,Longitude,Speed,Direction,Voltage,Temperature,Status\n';
                
                data.forEach(entry => {
                    const record = entry.data.records && entry.data.records[0];
                    if (record && record.tags) {
                        const tags = record.tags;
                        csv += `${entry.timestamp.toISOString()},`;
                        csv += `${entry.imei || 'N/A'},`;
                        csv += `${tags.Coordinates ? tags.Coordinates.value.latitude : 'N/A'},`;
                        csv += `${tags.Coordinates ? tags.Coordinates.value.longitude : 'N/A'},`;
                        csv += `${tags['Speed and Direction'] ? tags['Speed and Direction'].value.speed : 'N/A'},`;
                        csv += `${tags['Speed and Direction'] ? tags['Speed and Direction'].value.direction : 'N/A'},`;
                        csv += `${tags['Supply Voltage'] ? tags['Supply Voltage'].value : 'N/A'},`;
                        csv += `${tags['Inside Temperature'] ? tags['Inside Temperature'].value : 'N/A'},`;
                        csv += `${tags.Status ? tags.Status.value.raw : 'N/A'}\n`;
                    }
                });

                res.writeHead(200, {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="galileosky_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv"`
                });
                res.end(csv);
                return;
            }

            // Serve frontend
            if (req.url === '/' || req.url === '/index.html') {
                this.serveFrontend(res);
                return;
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        });

        this.httpServer.listen(this.httpPort, '0.0.0.0', () => {
            console.log(`HTTP server listening on port ${this.httpPort}`);
        });
    }

    serveFrontend(res) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galileosky Parser - Mobile</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .status-bar {
            background: #34495e;
            color: white;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-connected { background: #27ae60; }
        .status-disconnected { background: #e74c3c; }
        
        .container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 120px);
        }
        
        .map-container {
            flex: 1;
            min-height: 300px;
            position: relative;
        }
        
        #map {
            height: 100%;
            width: 100%;
        }
        
        .controls {
            background: white;
            padding: 15px;
            border-top: 1px solid #ddd;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .btn:hover {
            background: #2980b9;
        }
        
        .btn-success {
            background: #27ae60;
        }
        
        .btn-success:hover {
            background: #229954;
        }
        
        .data-table {
            background: white;
            margin: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .table-header {
            background: #34495e;
            color: white;
            padding: 15px;
            font-weight: bold;
        }
        
        .table-content {
            max-height: 300px;
            overflow-y: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .device-info {
            background: white;
            margin: 15px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .device-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }
        
        .device-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
        }
        
        .device-imei {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .device-time {
            color: #7f8c8d;
            font-size: 12px;
        }
        
        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
            
            .device-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Galileosky Parser</h1>
        <p>Mobile Data Visualization</p>
    </div>
    
    <div class="status-bar">
        <div>
            <span class="status-indicator" id="statusIndicator"></span>
            <span id="statusText">Connecting...</span>
        </div>
        <div>
            <span id="dataCount">0</span> records | 
            <span id="deviceCount">0</span> devices
        </div>
    </div>
    
    <div class="container">
        <div class="map-container">
            <div id="map"></div>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="refreshData()">Refresh Data</button>
            <button class="btn btn-success" onclick="downloadData()">Download CSV</button>
            <button class="btn" onclick="clearMap()">Clear Map</button>
        </div>
        
        <div class="device-info">
            <div class="table-header">Connected Devices</div>
            <div class="device-grid" id="deviceGrid">
                <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                    No devices connected
                </div>
            </div>
        </div>
        
        <div class="data-table">
            <div class="table-header">Latest Data</div>
            <div class="table-content">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>IMEI</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th>Speed</th>
                            <th>Direction</th>
                            <th>Voltage</th>
                            <th>Temperature</th>
                        </tr>
                    </thead>
                    <tbody id="dataTable">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #7f8c8d;">
                                No data available
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        let map;
        let markers = new Map();
        let updateInterval;
        
        // Initialize map
        function initMap() {
            map = L.map('map').setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }
        
        // Update status
        function updateStatus(connected) {
            const indicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            
            if (connected) {
                indicator.className = 'status-indicator status-connected';
                statusText.textContent = 'Connected';
            } else {
                indicator.className = 'status-indicator status-disconnected';
                statusText.textContent = 'Disconnected';
            }
        }
        
        // Update data counts
        function updateCounts(dataCount, deviceCount) {
            document.getElementById('dataCount').textContent = dataCount;
            document.getElementById('deviceCount').textContent = deviceCount;
        }
        
        // Update data table
        function updateDataTable(data) {
            const tbody = document.getElementById('dataTable');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No data available</td></tr>';
                return;
            }
            
            const recentData = data.slice(-10).reverse(); // Show last 10 entries
            
            tbody.innerHTML = recentData.map(entry => {
                const record = entry.data.records && entry.data.records[0];
                if (!record || !record.tags) return '';
                
                const tags = record.tags;
                const coords = tags.Coordinates ? tags.Coordinates.value : null;
                const speedDir = tags['Speed and Direction'] ? tags['Speed and Direction'].value : null;
                
                return \`
                    <tr>
                        <td>\${entry.timestamp}</td>
                        <td>\${entry.imei || 'N/A'}</td>
                        <td>\${coords ? coords.latitude.toFixed(6) : 'N/A'}</td>
                        <td>\${coords ? coords.longitude.toFixed(6) : 'N/A'}</td>
                        <td>\${speedDir ? speedDir.speed.toFixed(1) + ' km/h' : 'N/A'}</td>
                        <td>\${tags['Speed and Direction'] ? tags['Speed and Direction'].value.direction : 'N/A'}</td>
                        <td>\${tags['Supply Voltage'] ? tags['Supply Voltage'].value : 'N/A'}</td>
                        <td>\${tags['Inside Temperature'] ? tags['Inside Temperature'].value + '°C' : 'N/A'}</td>
                    </tr>
                \`;
            }).join('');
        }
        
        // Update device grid
        function updateDeviceGrid(devices) {
            const grid = document.getElementById('deviceGrid');
            
            if (!devices || devices.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 20px; color: #7f8c8d;">No devices connected</div>';
                return;
            }
            
            grid.innerHTML = devices.map(device => {
                const lastSeen = new Date(device.lastSeen).toLocaleString();
                return \`
                    <div class="device-card">
                        <div class="device-imei">\${device.imei}</div>
                        <div class="device-time">Last seen: \${lastSeen}</div>
                    </div>
                \`;
            }).join('');
        }
        
        // Update map markers
        function updateMapMarkers(data) {
            if (!data) return;
            
            data.forEach(entry => {
                const record = entry.data.records && entry.data.records[0];
                if (!record || !record.tags) return;
                
                const coords = record.tags.Coordinates ? record.tags.Coordinates.value : null;
                if (!coords || !coords.latitude || !coords.longitude) return;
                
                const imei = entry.imei || 'Unknown';
                const speedDir = record.tags['Speed and Direction'] ? record.tags['Speed and Direction'].value : null;
                const voltage = record.tags['Supply Voltage'] ? record.tags['Supply Voltage'].value : null;
                const temp = record.tags['Inside Temperature'] ? record.tags['Inside Temperature'].value : null;
                
                const popupContent = \`
                    <strong>IMEI:</strong> \${imei}<br>
                    <strong>Speed:</strong> \${speedDir ? speedDir.speed.toFixed(1) + ' km/h' : 'N/A'}<br>
                    <strong>Voltage:</strong> \${voltage ? (voltage / 1000).toFixed(2) + 'V' : 'N/A'}<br>
                    <strong>Temperature:</strong> \${temp ? temp + '°C' : 'N/A'}<br>
                    <strong>Time:</strong> \${entry.timestamp}
                \`;
                
                if (markers.has(imei)) {
                    // Update existing marker
                    const marker = markers.get(imei);
                    marker.setLatLng([coords.latitude, coords.longitude]);
                    marker.getPopup().setContent(popupContent);
                } else {
                    // Create new marker
                    const marker = L.marker([coords.latitude, coords.longitude])
                        .bindPopup(popupContent)
                        .addTo(map);
                    markers.set(imei, marker);
                }
            });
        }
        
        // Fetch data from API
        async function fetchData() {
            try {
                const response = await fetch('/api/data');
                const result = await response.json();
                
                if (result.success) {
                    updateDataTable(result.data);
                    updateDeviceGrid(result.devices);
                    updateMapMarkers(result.data);
                    updateCounts(result.data.length, result.devices.length);
                    updateStatus(true);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                updateStatus(false);
            }
        }
        
        // Check status
        async function checkStatus() {
            try {
                const response = await fetch('/api/status');
                const result = await response.json();
                
                if (result.success) {
                    updateStatus(true);
                    updateCounts(result.dataCount, result.deviceCount);
                }
            } catch (error) {
                updateStatus(false);
            }
        }
        
        // Refresh data
        function refreshData() {
            fetchData();
        }
        
        // Download data
        function downloadData() {
            window.open('/api/download', '_blank');
        }
        
        // Clear map
        function clearMap() {
            markers.forEach(marker => map.removeLayer(marker));
            markers.clear();
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            initMap();
            checkStatus();
            fetchData();
            
            // Set up periodic updates
            updateInterval = setInterval(() => {
                checkStatus();
                fetchData();
            }, 5000); // Update every 5 seconds
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        });
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    stop() {
        if (this.tcpServer) {
            this.tcpServer.close();
            console.log('TCP server stopped');
        }
        if (this.httpServer) {
            this.httpServer.close();
            console.log('HTTP server stopped');
        }
    }
}

// Start the server
const server = new GalileoSkyServer(3003, 3001);
server.start();

console.log('Galileosky Parser Server started');
console.log('TCP Server: port 3003');
console.log('HTTP Server: port 3001');
console.log('Frontend: http://localhost:3001');
console.log('API Endpoints:');
console.log('  GET /api/data - Get parsed data');
console.log('  GET /api/status - Get server status');
console.log('  GET /api/download - Download CSV');
console.log('');
console.log('Press Ctrl+C to stop the server'); 