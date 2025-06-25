// backend/src/config/performance.js

const performanceConfig = {
    // WebSocket settings
    websocket: {
        maxPayload: 1024 * 1024, // 1MB max payload
        maxClientsPerDevice: 10,
        maxMessageQueueSize: 100,
        broadcastInterval: 1000, // ms between broadcasts
        heartbeatInterval: 30000, // ms
        compression: {
            enabled: true,
            threshold: 1024, // Only compress messages > 1KB
            level: 3 // Compression level (1-9)
        }
    },

    // Packet processing settings
    packetProcessing: {
        maxQueueSize: 1000,
        maxConcurrentProcessing: 5,
        processingTimeout: 30000, // 30 seconds
        batchSize: 10, // Records per batch
        batchDelay: 1, // ms between batches
        maxPacketSize: 1024 * 1024, // 1MB max packet size
        truncateLogs: true, // Truncate large packet logs
        logSizeLimit: 200 // Max hex characters to log
    },

    // Database settings
    database: {
        maxBatchSize: 100, // Records per database batch
        batchTimeout: 1000, // ms to wait for batch completion
        connectionPool: {
            min: 5,
            max: 20,
            acquire: 30000,
            idle: 10000
        }
    },

    // Memory management
    memory: {
        maxDevicesInMemory: 1000,
        maxRecordsInMemory: 10000,
        cleanupInterval: 60000, // 1 minute
        gcThreshold: 0.8 // Trigger cleanup when memory usage > 80%
    },

    // Rate limiting
    rateLimiting: {
        maxMessagesPerSecond: 1000,
        maxConnectionsPerIP: 10,
        burstSize: 100,
        windowMs: 60000 // 1 minute window
    },

    // Logging settings
    logging: {
        maxLogSize: 10 * 1024 * 1024, // 10MB
        maxLogFiles: 5,
        logLevel: process.env.LOG_LEVEL || 'info',
        enablePerformanceLogging: true
    },

    // Frontend settings
    frontend: {
        maxDevicesDisplay: 50,
        updateThrottle: 200, // ms
        maxMessageQueueSize: 100,
        autoRefreshInterval: 30000, // 30 seconds
        enableVirtualScrolling: true
    }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
    performanceConfig.websocket.maxClientsPerDevice = 20;
    performanceConfig.packetProcessing.maxConcurrentProcessing = 10;
    performanceConfig.memory.maxDevicesInMemory = 5000;
    performanceConfig.logging.logLevel = 'warn';
}

if (process.env.NODE_ENV === 'development') {
    performanceConfig.websocket.broadcastInterval = 500;
    performanceConfig.packetProcessing.batchDelay = 0;
    performanceConfig.logging.enablePerformanceLogging = true;
}

// Mobile-specific settings
if (process.env.MOBILE_MODE === 'true') {
    performanceConfig.websocket.maxPayload = 512 * 1024; // 512KB for mobile
    performanceConfig.packetProcessing.maxQueueSize = 500;
    performanceConfig.frontend.maxDevicesDisplay = 25;
    performanceConfig.frontend.updateThrottle = 500;
}

module.exports = performanceConfig; 