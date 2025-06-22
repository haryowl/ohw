// backend/config/production.js

module.exports = {
    env: 'production',
    http: {
        port: parseInt(process.env.HTTP_PORT) || 3000,
        cors: {
            origin: process.env.CORS_ORIGIN || false,
            credentials: true
        }
    },
    tcp: {
        port: parseInt(process.env.TCP_PORT) || 5000,
        timeout: parseInt(process.env.TCP_TIMEOUT) || 30000,
        maxConnections: parseInt(process.env.TCP_MAX_CONNECTIONS) || 100
    },
    websocket: {
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined'
    },
    parser: {
        validateChecksum: true
    }
};
