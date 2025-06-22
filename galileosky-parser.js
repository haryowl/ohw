const net = require('net');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'combined.log') 
        })
    ]
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Configuration
const config = {
    port: process.env.PORT || 5025,
    host: process.env.HOST || '0.0.0.0',
    maxRetries: 5,
    retryDelay: 5000, // 5 seconds
    maxConnections: 100,
    connectionTimeout: 30000, // 30 seconds
    keepAliveInterval: 30000, // 30 seconds
    keepAliveProbes: 3,
    keepAliveTime: 60 // 60 seconds
};

// Track active connections
const activeConnections = new Map();
let server = null;
let isShuttingDown = false;

// Function to check if port is in use
async function isPortInUse(port) {
    return new Promise((resolve) => {
        const testServer = net.createServer();
        testServer.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        testServer.once('listening', () => {
            testServer.close();
            resolve(false);
        });
        testServer.listen(port);
    });
}

// Function to find available port
async function findAvailablePort(startPort) {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
        if (port > startPort + 100) { // Limit port range
            throw new Error('No available ports found');
        }
    }
    return port;
}

// Function to handle client connection
function handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    
    logger.info(`New connection from ${clientId}`);
    activeConnections.set(clientId, socket);

    // Set socket options
    socket.setKeepAlive(true, config.keepAliveTime);
    socket.setTimeout(config.connectionTimeout);

    // Handle data
    socket.on('data', (data) => {
        try {
            logger.info(`Received data from ${clientId}: ${data.toString('hex')}`);
            const parsedPacket = parser.parse(data);
            // Process data here
        } catch (error) {
            logger.error('Error processing packet:', {
                error: error.message,
                address: clientId,
                timestamp: new Date().toISOString()
            });
            // Send error confirmation
            socket.write(Buffer.from([0x02, 0x3F, 0x00]));
            logger.info('Error confirmation sent after processing error:', {
                hex: '023F00',
                address: clientId,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        logger.error(`Socket error for ${clientId}: ${error.message}`);
        cleanupConnection(clientId);
    });

    // Handle timeout
    socket.on('timeout', () => {
        logger.warn(`Connection timeout for ${clientId}`);
        cleanupConnection(clientId);
    });

    // Handle close
    socket.on('close', () => {
        logger.info(`Connection closed for ${clientId}`);
        cleanupConnection(clientId);
    });
}

// Function to cleanup connection
function cleanupConnection(clientId) {
    const socket = activeConnections.get(clientId);
    if (socket) {
        try {
            socket.destroy();
        } catch (error) {
            logger.error(`Error destroying socket for ${clientId}: ${error.message}`);
        }
        activeConnections.delete(clientId);
    }
}

// Function to start server
async function startServer() {
    if (server) {
        logger.warn('Server already running');
        return;
    }

    try {
        // Check if port is in use
        const portInUse = await isPortInUse(config.port);
        if (portInUse) {
            logger.warn(`Port ${config.port} is in use, attempting to find available port`);
            config.port = await findAvailablePort(config.port);
            logger.info(`Using port ${config.port}`);
        }

        // Create server
        server = net.createServer((socket) => {
            if (activeConnections.size >= config.maxConnections) {
                logger.warn(`Max connections reached, rejecting connection from ${socket.remoteAddress}`);
                socket.destroy();
                return;
            }
            handleConnection(socket);
        });

        // Handle server errors
        server.on('error', (error) => {
            logger.error(`Server error: ${error.message}`);
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use`);
                process.exit(1);
            }
        });

        // Start server
        server.listen(config.port, config.host, () => {
            logger.info(`Server listening on ${config.host}:${config.port}`);
        });

    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Function to stop server
async function stopServer() {
    if (!server) {
        logger.warn('Server not running');
        return;
    }

    isShuttingDown = true;
    logger.info('Shutting down server...');

    // Close all active connections
    for (const [clientId, socket] of activeConnections) {
        try {
            socket.end();
            logger.info(`Closed connection to ${clientId}`);
        } catch (error) {
            logger.error(`Error closing connection to ${clientId}: ${error.message}`);
        }
    }

    // Close server
    return new Promise((resolve) => {
        server.close(() => {
            logger.info('Server stopped');
            server = null;
            isShuttingDown = false;
            resolve();
        });
    });
}

// Handle process signals
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await stopServer();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await stopServer();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    stopServer().then(() => {
        process.exit(1);
    });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
});

// Start server
startServer().catch((error) => {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
}); 