const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// In-memory storage for parsed data
let parsedData = [];
let devices = new Map();

// Configuration
const config = {
    port: process.env.HTTP_PORT || 3001,
    host: '0.0.0.0'
};

// MIME types
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
    info: (message) => {
        const timestamp = new Date().toISOString();
        console.log(`[INFO] ${timestamp} - ${message}`);
    },
    error: (message, error) => {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR] ${timestamp} - ${message}`, error || '');
    }
};

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

// Create HTTP server
const server = http.createServer((req, res) => {
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

// Start server
server.listen(config.port, config.host, () => {
    logger.info(`HTTP server listening on ${config.host}:${config.port}`);
    logger.info(`Frontend available at: http://${config.host}:${config.port}`);
    logger.info(`API available at: http://${config.host}:${config.port}/api/`);
});

// Handle server errors
server.on('error', (error) => {
    logger.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down HTTP server...');
    server.close(() => {
        logger.info('HTTP server stopped');
        process.exit(0);
    });
});

// Export functions for external use
module.exports = {
    addParsedData,
    getLatestData,
    getDeviceStats,
    logger
};

// Example: Add some test data if running in development
if (process.env.NODE_ENV === 'development') {
    logger.info('Development mode: Adding test data...');
    
    // Add test data every 10 seconds
    setInterval(() => {
        const testData = {
            deviceId: 'TEST001',
            imei: '123456789012345',
            timestamp: new Date().toISOString(),
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
            speed: Math.random() * 100,
            status: 'Active',
            altitude: Math.random() * 1000,
            heading: Math.random() * 360
        };
        
        addParsedData(testData);
    }, 10000);
} 