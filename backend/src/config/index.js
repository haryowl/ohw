// backend/src/config/index.js
const path = require('path');
require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    
    http: {
        port: parseInt(process.env.HTTP_PORT) || 3000,
        cors: {
            origin: process.env.CORS_ORIGIN || '*'
        }
    },

    tcp: {
        port: parseInt(process.env.TCP_PORT) || 3003,
        timeout: parseInt(process.env.TCP_TIMEOUT) || 30000
    },

    parser: {
        maxPacketSize: parseInt(process.env.MAX_PACKET_SIZE) || 1024, // Default to 1024
        validateChecksum: true
    },

    database: {
        development: {
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', '..', 'data', 'dev.sqlite'),
            logging: console.log
        },
        test: {
            dialect: 'sqlite',
            storage: ':memory:',
            logging: false
        },
        production: {
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', '..', 'data', 'prod.sqlite'),
            logging: false
        },
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/galileosky'
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: path.join(__dirname, '..', '..', 'logs')
    },

    websocket: {
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000 // Default to 30000ms
    },

    parallel: {
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY) || Math.max(1, require('os').cpus().length - 1),
        batchSize: parseInt(process.env.BATCH_SIZE) || 100,
        enableWorkerThreads: process.env.ENABLE_WORKER_THREADS === 'true' || false
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
};

module.exports = config;
