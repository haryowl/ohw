const path = require('path');

module.exports = {
  env: 'mobile',
  
  // Optimize for mobile hardware
  http: {
    port: parseInt(process.env.PORT) || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    }
  },

  tcp: {
    port: parseInt(process.env.TCP_PORT) || 3003,
    timeout: parseInt(process.env.TCP_TIMEOUT) || 15000, // Reduced timeout
    maxConnections: 10 // Reduced for mobile
  },

  parser: {
    maxPacketSize: parseInt(process.env.MAX_PACKET_SIZE) || 512, // Reduced for mobile
    validateChecksum: true
  },

  database: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'data', 'mobile.sqlite'),
    logging: false, // Disable logging for performance
    pool: {
      max: 5, // Reduced connection pool
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  logging: {
    level: process.env.LOG_LEVEL || 'warn', // Reduced logging
    directory: path.join(__dirname, '..', '..', 'logs'),
    maxFiles: 3, // Keep only 3 log files
    maxSize: '5m' // Max 5MB per log file
  },

  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 60000 // Increased interval
  },

  // Mobile-specific optimizations
  mobile: {
    batteryOptimization: true,
    storageManagement: true,
    autoCleanup: true,
    maxStorageMB: 100,
    cleanupThreshold: 50, // MB
    keepDays: 30 // Keep data for 30 days
  },

  // Security for mobile deployment
  security: {
    allowedNetworks: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12'],
    requireAuth: false, // Disable for local network
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Performance tuning
  performance: {
    enableCompression: true,
    enableCaching: true,
    cacheMaxAge: 300, // 5 minutes
    enableGzip: true
  }
}; 