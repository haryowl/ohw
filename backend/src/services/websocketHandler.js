// backend/src/services/websocketHandler.js

const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');

class WebSocketHandler {
    constructor() {
        this.clients = new Map(); // deviceId -> Set of clients
        this.statistics = new Map(); // deviceId -> statistics
    }

    initialize(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws',
            clientTracking: true
        });
        
        this.wss.on('connection', this.handleConnection.bind(this));

        // Setup heartbeat interval
        setInterval(() => {
            this.checkConnections();
        }, config.websocket.heartbeatInterval);

        logger.info('WebSocket server initialized');
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

        logger.debug(`New WebSocket connection from ${ws.ip}`);

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleMessage(ws, data);
            } catch (error) {
                logger.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            this.handleDisconnect(ws);
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
        this.clients.get(deviceId).add(ws);
        ws.subscribedDevices = ws.subscribedDevices || new Set();
        ws.subscribedDevices.add(deviceId);
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
        if (clients) {
            const message = JSON.stringify({
                type: 'deviceData',
                deviceId,
                data
            });

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }

    updateStatistics(deviceId, stats) {
        this.statistics.set(deviceId, {
            ...stats,
            timestamp: new Date()
        });
    }
}

module.exports = new WebSocketHandler();
