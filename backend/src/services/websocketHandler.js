// backend/src/services/websocketHandler.js

const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');

class WebSocketHandler {
    constructor() {
        this.clients = new Map(); // deviceId -> Set of clients
        this.statistics = new Map(); // deviceId -> statistics
        this.messageQueue = new Map(); // deviceId -> queue of messages
        this.rateLimits = new Map(); // deviceId -> last broadcast time
        this.maxClientsPerDevice = 10; // Limit clients per device
        this.maxMessageQueueSize = 100; // Limit queued messages per device
        this.broadcastInterval = 1000; // Minimum time between broadcasts (ms)
    }

    initialize(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws',
            clientTracking: true,
            maxPayload: 1024 * 1024, // 1MB max payload
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                clientNoContextTakeover: true,
                serverNoContextTakeover: true,
                serverMaxWindowBits: 10,
                concurrencyLimit: 10,
                threshold: 1024
            }
        });
        
        this.wss.on('connection', this.handleConnection.bind(this));

        // Setup heartbeat interval
        setInterval(() => {
            this.checkConnections();
        }, config.websocket.heartbeatInterval);

        // Setup message queue processing
        setInterval(() => {
            this.processMessageQueues();
        }, 100); // Process queues every 100ms

        logger.info('WebSocket server initialized with optimizations');
    }

    checkConnections() {
        this.wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                logger.debug(`Terminating inactive WebSocket connection from ${ws.ip}`);
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping(null, false, true);
        });
    }

    handleConnection(ws, req) {
        ws.isAlive = true;
        ws.ip = req.socket.remoteAddress;
        ws.connectionTime = Date.now();
        ws.messageCount = 0;

        // Set connection limits
        ws.setMaxListeners(20);

        logger.debug(`New WebSocket connection from ${ws.ip}`);

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (message) => {
            try {
                // Rate limit incoming messages
                ws.messageCount++;
                if (ws.messageCount > 1000) { // Max 1000 messages per connection
                    logger.warn(`Rate limit exceeded for connection from ${ws.ip}`);
                    ws.close(1008, 'Rate limit exceeded');
                    return;
                }

                const data = JSON.parse(message);
                this.handleMessage(ws, data);
            } catch (error) {
                logger.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            this.handleDisconnect(ws);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error from ${ws.ip}:`, error);
        });
    }

    handleMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                this.subscribeToDevice(ws, message.deviceId);
                break;
            case 'unsubscribe':
                this.unsubscribeFromDevice(ws, message.deviceId);
                break;
            default:
                logger.warn('Unknown message type:', message.type);
        }
    }

    subscribeToDevice(ws, deviceId) {
        if (!this.clients.has(deviceId)) {
            this.clients.set(deviceId, new Set());
        }
        
        const deviceClients = this.clients.get(deviceId);
        
        // Check client limit per device
        if (deviceClients.size >= this.maxClientsPerDevice) {
            logger.warn(`Client limit reached for device ${deviceId}`);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Device subscription limit reached'
            }));
            return;
        }

        deviceClients.add(ws);
        ws.subscribedDevices = ws.subscribedDevices || new Set();
        ws.subscribedDevices.add(deviceId);

        // Send confirmation
        ws.send(JSON.stringify({
            type: 'subscribed',
            deviceId
        }));
    }

    unsubscribeFromDevice(ws, deviceId) {
        const deviceClients = this.clients.get(deviceId);
        if (deviceClients) {
            deviceClients.delete(ws);
        }
        if (ws.subscribedDevices) {
            ws.subscribedDevices.delete(deviceId);
        }
    }

    handleDisconnect(ws) {
        if (ws.subscribedDevices) {
            ws.subscribedDevices.forEach(deviceId => {
                const deviceClients = this.clients.get(deviceId);
                if (deviceClients) {
                    deviceClients.delete(ws);
                }
            });
        }
    }

    broadcastDeviceData(deviceId, data) {
        const clients = this.clients.get(deviceId);
        if (!clients || clients.size === 0) {
            return;
        }

        // Rate limiting check
        const now = Date.now();
        const lastBroadcast = this.rateLimits.get(deviceId) || 0;
        if (now - lastBroadcast < this.broadcastInterval) {
            // Queue the message instead of broadcasting immediately
            this.queueMessage(deviceId, data);
            return;
        }

        this.rateLimits.set(deviceId, now);
        this.broadcastToClients(clients, deviceId, data);
    }

    queueMessage(deviceId, data) {
        if (!this.messageQueue.has(deviceId)) {
            this.messageQueue.set(deviceId, []);
        }

        const queue = this.messageQueue.get(deviceId);
        
        // Limit queue size
        if (queue.length >= this.maxMessageQueueSize) {
            queue.shift(); // Remove oldest message
        }

        queue.push({
            data,
            timestamp: Date.now()
        });
    }

    processMessageQueues() {
        const now = Date.now();
        
        for (const [deviceId, queue] of this.messageQueue.entries()) {
            if (queue.length === 0) continue;

            const lastBroadcast = this.rateLimits.get(deviceId) || 0;
            if (now - lastBroadcast >= this.broadcastInterval) {
                // Process all queued messages for this device
                const clients = this.clients.get(deviceId);
                if (clients && clients.size > 0) {
                    this.rateLimits.set(deviceId, now);
                    
                    // Send the most recent message
                    const latestMessage = queue[queue.length - 1];
                    this.broadcastToClients(clients, deviceId, latestMessage.data);
                    
                    // Clear the queue
                    queue.length = 0;
                }
            }
        }
    }

    broadcastToClients(clients, deviceId, data) {
        const message = JSON.stringify({
            type: 'deviceData',
            deviceId,
            data,
            timestamp: Date.now()
        });

        let sentCount = 0;
        let errorCount = 0;

        clients.forEach(client => {
            try {
                if (client.readyState === WebSocket.OPEN) {
                    // Check if client buffer is not full
                    if (client.bufferedAmount < 1024 * 1024) { // 1MB buffer limit
                        client.send(message);
                        sentCount++;
                    } else {
                        logger.warn(`Client buffer full, skipping message for device ${deviceId}`);
                        errorCount++;
                    }
                }
            } catch (error) {
                logger.error(`Error sending to client:`, error);
                errorCount++;
            }
        });

        if (sentCount > 0) {
            logger.debug(`Broadcasted to ${sentCount} clients for device ${deviceId}${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
        }
    }

    updateStatistics(deviceId, stats) {
        this.statistics.set(deviceId, {
            ...stats,
            timestamp: new Date()
        });
    }

    // Get connection statistics
    getConnectionStats() {
        const stats = {
            totalConnections: this.wss.clients.size,
            devicesWithClients: this.clients.size,
            totalSubscriptions: 0,
            messageQueues: 0
        };

        for (const [deviceId, clients] of this.clients.entries()) {
            stats.totalSubscriptions += clients.size;
        }

        for (const [deviceId, queue] of this.messageQueue.entries()) {
            if (queue.length > 0) {
                stats.messageQueues++;
            }
        }

        return stats;
    }
}

module.exports = new WebSocketHandler();
