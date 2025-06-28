// backend/src/enhanced-server.js

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

// Import the enhanced backend with peer sync functionality
const { app, tcpServer } = require('./app');

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            logger.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Keep alive check
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Broadcast to WebSocket clients
function broadcast(topic, data) {
    console.log(`Broadcasting to ${wss.clients.size} clients:`, topic, data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ topic, data }));
        }
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(ws, data) {
    console.log('Received WebSocket message:', data);
    // Handle different message types here
    if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
    }
}

// Start the server
async function startServer() {
    try {
        // Sync database
        await sequelize.sync();
        console.log('Database synced');

        // Try to start HTTP server on different ports
        const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009];
        let server = null;
        let selectedPort = null;

        for (const port of ports) {
            try {
                server = await new Promise((resolve, reject) => {
                    const s = http.createServer(app).listen(port, '0.0.0.0', () => {
                        console.log(`🚀 Enhanced HTTP server listening on port ${port} (all interfaces)`);
                        console.log(`📱 Mobile Peer Sync UI: http://localhost:${port}/mobile-peer-sync-ui.html`);
                        console.log(`🔗 Peer Sync API: http://localhost:${port}/api/peer/status`);
                        console.log(`🔄 Direct Peer Sync: http://localhost:${port}/peer/sync`);
                        resolve(s);
                    }).on('error', (error) => {
                        if (error.code === 'EADDRINUSE') {
                            console.log(`Port ${port} is in use, trying next port...`);
                            resolve(null);
                        } else {
                            reject(error);
                        }
                    });
                });

                if (server) {
                    selectedPort = port;
                    break;
                }
            } catch (error) {
                console.error(`Error starting server on port ${port}:`, error);
            }
        }

        if (!server) {
            throw new Error('Could not start server on any available port');
        }

        // Attach WebSocket server to HTTP server
        server.on('upgrade', (request, socket, head) => {
            console.log('WebSocket upgrade request received');
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });

        console.log(`✅ Enhanced server ready with peer sync functionality on port ${selectedPort}`);

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down enhanced server...');
            await sequelize.close();
            server.close(() => {
                console.log('Enhanced server stopped');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Error starting enhanced server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(error => {
    console.error('Failed to start enhanced server:', error);
    process.exit(1);
});

module.exports = {
    app,
    httpServer: http.createServer(app),
    tcpServer,
    wss,
    broadcast
}; 