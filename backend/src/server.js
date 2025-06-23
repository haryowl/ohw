// backend/src/server.js

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const { sequelize } = require('./models');
const GalileoskyParser = require('./services/parser');
const deviceManager = require('./services/deviceManager');
const packetProcessor = require('./services/packetProcessor');
const logger = require('./utils/logger');
const config = require('./config');

const { app, tcpServer } = require('./app');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files if frontend build exists
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
}

// Create parser instance
const parser = new GalileoskyParser();

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

// Serve React app if frontend build exists
app.get('*', (req, res) => {
    if (fs.existsSync(frontendBuildPath)) {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    } else {
        res.status(404).json({ error: 'Frontend build not found' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Application error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

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
                        console.log(`HTTP server listening on port ${port} (all interfaces)`);
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

        console.log(`WebSocket server ready on port ${selectedPort}`);

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await sequelize.close();
            server.close(() => {
                console.log('Server stopped');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

module.exports = {
    app,
    httpServer: http.createServer(app),
    tcpServer,
    wss,
    broadcast
};
