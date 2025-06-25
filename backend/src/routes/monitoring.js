const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const websocketHandler = require('../services/websocketHandler');
const packetProcessor = require('../services/packetProcessor');
const packetQueue = require('../services/packetQueue');

// Get system performance metrics
router.get('/performance', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Get WebSocket statistics
        const wsStats = websocketHandler.getConnectionStats();
        
        // Get packet processing statistics
        const processingStats = packetProcessor.getProcessingStats();
        
        // Get system memory usage
        const memoryUsage = process.memoryUsage();
        
        // Get uptime
        const uptime = process.uptime();
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        const metrics = {
            timestamp: new Date().toISOString(),
            responseTime,
            uptime: {
                seconds: uptime,
                formatted: formatUptime(uptime)
            },
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                external: Math.round(memoryUsage.external / 1024 / 1024), // MB
                arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) // MB
            },
            websocket: {
                ...wsStats,
                health: calculateWebSocketHealth(wsStats)
            },
            packetProcessing: {
                ...processingStats,
                health: calculateProcessingHealth(processingStats)
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid
            }
        };
        
        res.json(metrics);
    } catch (error) {
        logger.error('Error getting performance metrics:', error);
        res.status(500).json({ error: 'Failed to get performance metrics' });
    }
});

// Get detailed queue status
router.get('/queue', async (req, res) => {
    try {
        const queueStats = packetQueue.getStats();
        const wsStats = websocketHandler.getConnectionStats();
        
        const queueStatus = {
            timestamp: new Date().toISOString(),
            packetQueue: {
                ...queueStats,
                status: getQueueStatus(queueStats)
            },
            websocketQueues: {
                totalQueues: wsStats.messageQueues,
                devicesWithQueues: Array.from(websocketHandler.messageQueue.entries())
                    .filter(([deviceId, queue]) => queue.length > 0)
                    .map(([deviceId, queue]) => ({
                        deviceId,
                        queueSize: queue.length,
                        oldestMessage: queue[0]?.timestamp,
                        newestMessage: queue[queue.length - 1]?.timestamp
                    }))
            }
        };
        
        res.json(queueStatus);
    } catch (error) {
        logger.error('Error getting queue status:', error);
        res.status(500).json({ error: 'Failed to get queue status' });
    }
});

// Get device connection status
router.get('/connections', async (req, res) => {
    try {
        const wsStats = websocketHandler.getConnectionStats();
        
        const connections = {
            timestamp: new Date().toISOString(),
            totalConnections: wsStats.totalConnections,
            devicesWithClients: wsStats.devicesWithClients,
            totalSubscriptions: wsStats.totalSubscriptions,
            devices: Array.from(websocketHandler.clients.entries()).map(([deviceId, clients]) => ({
                deviceId,
                clientCount: clients.size,
                activeClients: Array.from(clients).filter(client => client.readyState === 1).length
            }))
        };
        
        res.json(connections);
    } catch (error) {
        logger.error('Error getting connection status:', error);
        res.status(500).json({ error: 'Failed to get connection status' });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const wsStats = websocketHandler.getConnectionStats();
        const processingStats = packetProcessor.getProcessingStats();
        const memoryUsage = process.memoryUsage();
        
        // Calculate health scores
        const wsHealth = calculateWebSocketHealth(wsStats);
        const processingHealth = calculateProcessingHealth(processingStats);
        const memoryHealth = calculateMemoryHealth(memoryUsage);
        
        const overallHealth = Math.min(wsHealth.score, processingHealth.score, memoryHealth.score);
        
        const health = {
            status: overallHealth > 80 ? 'healthy' : overallHealth > 50 ? 'warning' : 'critical',
            score: overallHealth,
            timestamp: new Date().toISOString(),
            components: {
                websocket: wsHealth,
                processing: processingHealth,
                memory: memoryHealth
            },
            uptime: process.uptime()
        };
        
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Error in health check:', error);
        res.status(503).json({
            status: 'critical',
            score: 0,
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Clear queues (admin only)
router.post('/clear-queues', async (req, res) => {
    try {
        const clearedPackets = packetQueue.clearQueue();
        
        // Clear WebSocket message queues
        let clearedWebSocketMessages = 0;
        for (const [deviceId, queue] of websocketHandler.messageQueue.entries()) {
            clearedWebSocketMessages += queue.length;
            queue.length = 0;
        }
        
        logger.warn('Queues cleared by admin request', {
            clearedPackets,
            clearedWebSocketMessages
        });
        
        res.json({
            success: true,
            clearedPackets,
            clearedWebSocketMessages,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error clearing queues:', error);
        res.status(500).json({ error: 'Failed to clear queues' });
    }
});

// Helper functions
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function calculateWebSocketHealth(stats) {
    const maxConnections = 1000; // Reasonable limit
    const maxSubscriptions = 5000; // Reasonable limit
    
    const connectionScore = Math.max(0, 100 - (stats.totalConnections / maxConnections) * 100);
    const subscriptionScore = Math.max(0, 100 - (stats.totalSubscriptions / maxSubscriptions) * 100);
    const queueScore = stats.messageQueues === 0 ? 100 : Math.max(0, 100 - stats.messageQueues * 10);
    
    const score = Math.round((connectionScore + subscriptionScore + queueScore) / 3);
    
    return {
        score,
        status: score > 80 ? 'healthy' : score > 50 ? 'warning' : 'critical',
        details: {
            connections: { score: connectionScore, current: stats.totalConnections, max: maxConnections },
            subscriptions: { score: subscriptionScore, current: stats.totalSubscriptions, max: maxSubscriptions },
            queues: { score: queueScore, current: stats.messageQueues }
        }
    };
}

function calculateProcessingHealth(stats) {
    const maxQueueSize = 1000;
    const maxProcessingTime = 5000; // 5 seconds
    
    const queueScore = Math.max(0, 100 - (stats.queueStats.queueSize / maxQueueSize) * 100);
    const processingScore = stats.averageProcessingTime < maxProcessingTime ? 100 : 
        Math.max(0, 100 - ((stats.averageProcessingTime - maxProcessingTime) / maxProcessingTime) * 100);
    const errorScore = stats.totalErrors === 0 ? 100 : 
        Math.max(0, 100 - (stats.totalErrors / Math.max(stats.totalProcessed, 1)) * 100);
    
    const score = Math.round((queueScore + processingScore + errorScore) / 3);
    
    return {
        score,
        status: score > 80 ? 'healthy' : score > 50 ? 'warning' : 'critical',
        details: {
            queue: { score: queueScore, current: stats.queueStats.queueSize, max: maxQueueSize },
            processing: { score: processingScore, current: stats.averageProcessingTime, max: maxProcessingTime },
            errors: { score: errorScore, current: stats.totalErrors, total: stats.totalProcessed }
        }
    };
}

function calculateMemoryHealth(memoryUsage) {
    const maxHeapUsage = 1024 * 1024 * 1024; // 1GB
    const maxRSS = 2 * 1024 * 1024 * 1024; // 2GB
    
    const heapScore = Math.max(0, 100 - (memoryUsage.heapUsed / maxHeapUsage) * 100);
    const rssScore = Math.max(0, 100 - (memoryUsage.rss / maxRSS) * 100);
    
    const score = Math.round((heapScore + rssScore) / 2);
    
    return {
        score,
        status: score > 80 ? 'healthy' : score > 50 ? 'warning' : 'critical',
        details: {
            heap: { score: heapScore, used: memoryUsage.heapUsed, total: memoryUsage.heapTotal, max: maxHeapUsage },
            rss: { score: rssScore, current: memoryUsage.rss, max: maxRSS }
        }
    };
}

function getQueueStatus(stats) {
    if (stats.queueSize === 0) return 'empty';
    if (stats.queueSize < stats.maxQueueSize * 0.5) return 'normal';
    if (stats.queueSize < stats.maxQueueSize * 0.8) return 'warning';
    return 'critical';
}

module.exports = router; 