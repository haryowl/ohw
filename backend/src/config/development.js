// backend/config/development.js

module.exports = {
    env: 'development',
    http: {
        port: parseInt(process.env.HTTP_PORT) || 3001,
        cors: {
            origin: 'http://localhost:3000',
            credentials: true
        }
    },
    tcp: {
        port: parseInt(process.env.TCP_PORT) || 5001,
        timeout: 30000,
        maxConnections: 100
    },
    websocket: {
        heartbeatInterval: 30000
    },
    logging: {
        level: 'debug',
        format: 'dev'
    },
    parser: {
        maxPacketSize: 1024,
        validateChecksum: true
    }
};
