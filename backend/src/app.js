// backend/src/app.js

const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const http = require('http');
const websocketHandler = require('./services/websocketHandler');
const GalileoskyParser = require('./services/parser');
const deviceManager = require('./services/deviceManager');
const packetProcessor = require('./services/packetProcessor');
const dataAggregator = require('./services/dataAggregator');
const alertManager = require('./services/alertManager');
const logger = require('./utils/logger');
const Type33Handler = require('./services/type33Handler');
const WebSocket = require('ws');
const net = require('net');
const PacketTypeHandler = require('./services/packetTypeHandler');
const recordsRouter = require('./routes/records');

const server = http.createServer(app);

// Create parser instance
const parser = new GalileoskyParser();

app.use(cors(config.http.cors)); // Apply CORS middleware
app.use(express.json());

// Serve static files if frontend build exists
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
}

// Initialize WebSocket
websocketHandler.initialize(server);

// Mount routes directly
app.use('/api/devices', require('./routes/devices'));
app.use('/api/data', require('./routes/data'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/mapping', require('./routes/mapping'));
app.use('/api/records', recordsRouter);

// TCP Server for device connections
const tcpServer = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info('New device connected:', { address: clientAddress });

    let buffer = Buffer.alloc(0);
    let unsentData = Buffer.alloc(0);

    // Set socket options to prevent hanging connections
    socket.setKeepAlive(true, 60000); // 60 seconds
    socket.setTimeout(30000); // 30 seconds timeout

    socket.on('data', async (data) => {
        try {
            // Log raw data received
            logger.info('Raw data received:', {
                address: socket.remoteAddress + ':' + socket.remotePort,
                bufferLength: data.length,
                hex: data.toString('hex').toUpperCase(),
                length: data.length,
                timestamp: new Date().toISOString()
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
                // Only use the lower 15 bits for length
                const actualLength = rawLength & 0x7FFF;  // Mask with 0x7FFF to get only lower 15 bits
                const totalLength = actualLength + 3;  // HEAD + LENGTH + DATA + CRC

                // Log raw packet data for debugging
                logger.info('Raw packet data:', {
                    packetType: `0x${packetType.toString(16).padStart(2, '0')}`,
                    rawLength: `0x${rawLength.toString(16).padStart(4, '0')}`,
                    actualLength,
                    totalLength,
                    bufferLength: buffer.length,
                    hex: buffer.slice(0, Math.min(totalLength + 2, buffer.length)).toString('hex').toUpperCase(),
                    hasUnsentData: buffer.length > totalLength + 2,
                    timestamp: new Date().toISOString()
                });

                // Check if we have a complete packet
                if (buffer.length < totalLength + 2) {  // +2 for CRC
                    unsentData = Buffer.from(buffer);
                    break;
                }

                // Extract the complete packet
                const packet = buffer.slice(0, totalLength + 2);
                buffer = buffer.slice(totalLength + 2);

                // Determine packet type
                const isIgnorablePacket = packetType === 0x15;
                const isExtensionPacket = packetType !== 0x01 && !isIgnorablePacket;

                // Log packet details
                logger.info('Packet details:', {
                    address: socket.remoteAddress + ':' + socket.remotePort,
                    type: `0x${packetType.toString(16).padStart(2, '0')}`,
                    packetType: isIgnorablePacket ? 'Ignored' : (isExtensionPacket ? 'Extension' : 'Main Packet'),
                    length: actualLength,
                    totalLength,
                    bufferLength: buffer.length,
                    hasUnsentData: buffer.length > 0,
                    timestamp: new Date().toISOString()
                });

                // Handle different packet types
                if (isIgnorablePacket) {
                    logger.info('Ignoring packet type 0x15');
                    continue;
                }

                try {
                    if (isIgnorablePacket) {
                        // Handle ignorable packet (0x15)
                        const packetChecksum = packet.readUInt16LE(packet.length - 2);
                        const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                        socket.write(confirmation);
                        logger.info('Confirmation sent for ignorable packet:', {
                            address: socket.remoteAddress + ':' + socket.remotePort,
                            hex: confirmation.toString('hex').toUpperCase(),
                            checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                            timestamp: new Date().toISOString()
                        });
                    } else if (isExtensionPacket) {
                        // Handle extension packet
                        const packetChecksum = packet.readUInt16LE(packet.length - 2);
                        const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                        socket.write(confirmation);
                        logger.info('Confirmation sent for extension packet:', {
                            address: socket.remoteAddress + ':' + socket.remotePort,
                            hex: confirmation.toString('hex').toUpperCase(),
                            checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        // Handle main packet (both < 32 bytes and >= 32 bytes)
                        const parsedData = await parser.parse(packet);
                        
                        // Get the checksum from the received packet
                        const packetChecksum = packet.readUInt16LE(packet.length - 2);
                        const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                        
                        socket.write(confirmation);
                        logger.info('Confirmation sent:', {
                            address: socket.remoteAddress + ':' + socket.remotePort,
                            hex: confirmation.toString('hex').toUpperCase(),
                            checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                            packetLength: actualLength,
                            timestamp: new Date().toISOString()
                        });

                        // Process the parsed data
                        if (parsedData) {
                            // Handle the parsed data
                            logger.info('Parsed data:', {
                                address: socket.remoteAddress + ':' + socket.remotePort,
                                data: parsedData,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Error processing main packet:', {
                        address: socket.remoteAddress + ':' + socket.remotePort,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            logger.error('Error processing data:', {
                address: socket.remoteAddress + ':' + socket.remotePort,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('error', (error) => {
        logger.error('Socket error:', {
            error: error.message,
            address: clientAddress,
            timestamp: new Date().toISOString()
        });
        // Force close the socket on error
        socket.destroy();
    });

    socket.on('timeout', () => {
        logger.warn('Socket timeout, closing connection:', {
            address: clientAddress,
            timestamp: new Date().toISOString()
        });
        socket.destroy();
    });

    socket.on('close', (hadError) => {
        logger.info('Device disconnected:', {
            address: clientAddress,
            hadError,
            timestamp: new Date().toISOString()
        });
        // Clear buffer on disconnect
        buffer = Buffer.alloc(0);
        unsentData = Buffer.alloc(0);
    });

    socket.on('end', () => {
        logger.info('Device ended connection:', {
            address: clientAddress,
            timestamp: new Date().toISOString()
        });
        socket.destroy();
    });
});

// Start TCP server
const PORT = process.env.TCP_PORT || 3003;
tcpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`TCP server listening on port ${PORT} (all interfaces)`);
}).on('error', (error) => {
    logger.error('TCP server error:', error);
    process.exit(1);
});

// Handle server errors
tcpServer.on('error', (error) => {
    logger.error('TCP server error:', error);
});

// Handle server close
tcpServer.on('close', () => {
    logger.info('TCP server closed');
});

server.listen(config.http.port, '0.0.0.0', () => {
    logger.info(`HTTP server listening on port ${config.http.port} (all interfaces)`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Application error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Export both the Express app and TCP server
module.exports = { app, tcpServer };