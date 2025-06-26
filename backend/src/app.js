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
const packetQueue = require('./services/packetQueue');
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

// Global data references for mobile application (in-memory arrays)
global.parsedData = [];
global.devices = new Map();
global.lastIMEI = null;

app.use(cors(config.http.cors)); // Apply CORS middleware
app.use(express.json());

// Serve static files if frontend build exists
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
}

// Initialize WebSocket
websocketHandler.initialize(server);

// Monitor packet queue performance
packetQueue.on('queued', (item) => {
    logger.debug('Packet queued', {
        packetId: item.id,
        queueSize: packetQueue.queue.length,
        processingCount: packetQueue.processing.size
    });
});

packetQueue.on('processed', (item, processingTime) => {
    logger.debug('Packet processed', {
        packetId: item.id,
        processingTime,
        queueSize: packetQueue.queue.length
    });
});

packetQueue.on('failed', (item, error) => {
    logger.error('Packet processing failed permanently', {
        packetId: item.id,
        error: error.message,
        retries: item.retries
    });
});

// Log queue statistics periodically
setInterval(() => {
    const stats = packetQueue.getStats();
    if (stats.queueSize > 0 || stats.processingCount > 0) {
        logger.info('Packet queue statistics', stats);
    }
}, 60000); // Log every minute

// Mount routes directly
app.use('/api/devices', require('./routes/devices'));
app.use('/api/data', require('./routes/data'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/mapping', require('./routes/mapping'));
app.use('/api/records', recordsRouter);
app.use('/api/peer', require('./routes/peer'));

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

            // Process all complete packets in the buffer
            const packets = [];
            
            while (buffer.length >= 3) {  // Minimum packet size (HEAD + LENGTH)
                const packetType = buffer.readUInt8(0);
                const rawLength = buffer.readUInt16LE(1);
                // Only use the lower 15 bits for length
                const actualLength = rawLength & 0x7FFF;  // Mask with 0x7FFF to get only lower 15 bits
                const totalLength = actualLength + 3;  // HEAD + LENGTH + DATA + CRC

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
                    // Send confirmation immediately for ignorable packets
                    const packetChecksum = packet.readUInt16LE(packet.length - 2);
                    const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                    socket.write(confirmation);
                    logger.info('Confirmation sent for ignorable packet:', {
                        address: socket.remoteAddress + ':' + socket.remotePort,
                        hex: confirmation.toString('hex').toUpperCase(),
                        checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                        timestamp: new Date().toISOString()
                    });
                    continue;
                }

                if (isExtensionPacket) {
                    // Handle extension packet immediately
                    const packetChecksum = packet.readUInt16LE(packet.length - 2);
                    const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                    socket.write(confirmation);
                    logger.info('Confirmation sent for extension packet:', {
                        address: socket.remoteAddress + ':' + socket.remotePort,
                        hex: confirmation.toString('hex').toUpperCase(),
                        checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                        timestamp: new Date().toISOString()
                    });
                    continue;
                }

                // Queue main packets for asynchronous processing
                packets.push({
                    packet,
                    packetType,
                    actualLength,
                    totalLength
                });
            }

            // Queue all main packets for processing
            for (const packetInfo of packets) {
                const metadata = {
                    address: socket.remoteAddress + ':' + socket.remotePort,
                    packetType: `0x${packetInfo.packetType.toString(16).padStart(2, '0')}`,
                    length: packetInfo.actualLength,
                    timestamp: new Date().toISOString()
                };

                // Send confirmation immediately (don't wait for processing)
                const packetChecksum = packetInfo.packet.readUInt16LE(packetInfo.packet.length - 2);
                const confirmation = Buffer.from([0x02, packetChecksum & 0xFF, (packetChecksum >> 8) & 0xFF]);
                socket.write(confirmation);
                
                logger.info('Confirmation sent:', {
                    address: socket.remoteAddress + ':' + socket.remotePort,
                    hex: confirmation.toString('hex').toUpperCase(),
                    checksum: `0x${confirmation.slice(1).toString('hex').toUpperCase()}`,
                    packetLength: packetInfo.actualLength,
                    timestamp: new Date().toISOString()
                });

                // Queue packet for processing
                await packetQueue.enqueue(packetInfo.packet, socket, metadata);
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
});

// Handle server errors
tcpServer.on('error', (error) => {
    logger.error('TCP server error:', error);
});

// Handle server close
tcpServer.on('close', () => {
    logger.info('TCP server closed');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, starting graceful shutdown...');
    
    // Stop accepting new connections
    tcpServer.close(() => {
        logger.info('TCP server stopped accepting new connections');
    });
    
    // Clear packet queue
    await packetQueue.clear();
    
    // Close HTTP server
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, starting graceful shutdown...');
    
    // Stop accepting new connections
    tcpServer.close(() => {
        logger.info('TCP server stopped accepting new connections');
    });
    
    // Clear packet queue
    await packetQueue.clear();
    
    // Close HTTP server
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
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