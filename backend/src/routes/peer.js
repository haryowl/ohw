const express = require('express');
const router = express.Router();
const PeerToPeerSync = require('../services/peerToPeerSync');
const logger = require('../utils/logger');

// Global peer sync instance
let peerSync = null;

// Initialize peer sync with data references
function initializePeerSync(parsedData, devices, lastIMEI) {
    if (!peerSync) {
        const deviceId = `mobile-${Math.random().toString(36).substr(2, 9)}`;
        peerSync = new PeerToPeerSync(deviceId, 3001);
        logger.info('Peer sync initialized', { deviceId });
    }
    return peerSync;
}

// Get peer sync status
router.get('/status', (req, res) => {
    try {
        // Get data from global scope (these should be passed from the mobile backend)
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        if (!peerSync) {
            return res.json({
                deviceId: 'not-initialized',
                isServerMode: false,
                port: 3001,
                lastSyncTime: null,
                syncInProgress: false,
                deviceIP: 'unknown',
                totalRecords: parsedData.length,
                totalDevices: devices.size,
                lastIMEI: lastIMEI
            });
        }

        const status = peerSync.getStatus();
        status.totalRecords = parsedData.length;
        status.totalDevices = devices.size;
        status.lastIMEI = lastIMEI;
        
        res.json(status);
    } catch (error) {
        logger.error('Error getting peer status:', error);
        res.status(500).json({ error: 'Failed to get peer status' });
    }
});

// Start peer server
router.post('/start', (req, res) => {
    try {
        const { deviceId } = req.body;
        
        // Get data references from global scope
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const peerSyncInstance = initializePeerSync(parsedData, devices, lastIMEI);
        
        if (deviceId) {
            peerSyncInstance.deviceId = deviceId;
        }

        peerSyncInstance.startPeerServer(parsedData, devices, lastIMEI);
        
        res.json({
            success: true,
            deviceId: peerSyncInstance.deviceId,
            port: peerSyncInstance.port,
            deviceIP: peerSyncInstance.getDeviceIP(),
            message: 'Peer server started successfully'
        });
    } catch (error) {
        logger.error('Error starting peer server:', error);
        res.status(500).json({ error: 'Failed to start peer server' });
    }
});

// Stop peer server
router.post('/stop', (req, res) => {
    try {
        if (peerSync) {
            peerSync.stopPeerServer();
            res.json({ success: true, message: 'Peer server stopped' });
        } else {
            res.json({ success: true, message: 'No peer server running' });
        }
    } catch (error) {
        logger.error('Error stopping peer server:', error);
        res.status(500).json({ error: 'Failed to stop peer server' });
    }
});

// Connect to peer and sync
router.post('/connect', async (req, res) => {
    try {
        const { peerUrl } = req.body;
        
        if (!peerUrl) {
            return res.status(400).json({ error: 'Peer URL is required' });
        }

        if (!peerSync) {
            return res.status(400).json({ error: 'Peer sync not initialized' });
        }

        // Get data references from global scope
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const result = await peerSync.connectToPeer(peerUrl, parsedData, devices, lastIMEI);
        
        res.json({
            success: true,
            newRecords: result.syncResult.newRecords,
            totalRecords: parsedData.length,
            message: `Sync completed: ${result.syncResult.newRecords} new records added`
        });
    } catch (error) {
        logger.error('Error connecting to peer:', error);
        res.status(500).json({ error: error.message || 'Failed to connect to peer' });
    }
});

// Export data to peer
router.get('/export', (req, res) => {
    try {
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const exportData = {
            deviceId: peerSync ? peerSync.deviceId : 'unknown',
            records: parsedData,
            devices: Object.fromEntries(devices),
            lastIMEI: lastIMEI,
            exportTime: new Date().toISOString()
        };

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Import data from peer
router.post('/import', (req, res) => {
    try {
        const importData = req.body;
        
        if (!importData || !importData.records) {
            return res.status(400).json({ error: 'Invalid import data' });
        }

        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();

        if (peerSync) {
            const result = peerSync.mergePeerData(parsedData, devices, importData);
            
            res.json({
                success: true,
                newRecords: result.newRecords,
                totalRecords: parsedData.length,
                message: `Imported ${result.newRecords} new records from peer`
            });
        } else {
            res.status(400).json({ error: 'Peer sync not initialized' });
        }
    } catch (error) {
        logger.error('Error importing data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Full bidirectional sync endpoint
router.post('/sync', (req, res) => {
    try {
        const peerData = req.body;
        
        if (!peerData || !peerData.records) {
            return res.status(400).json({ error: 'Invalid sync data' });
        }

        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        // Initialize peer sync if not already done
        const peerSyncInstance = initializePeerSync(parsedData, devices, lastIMEI);

        // Export our data to peer
        const exportData = {
            deviceId: peerSyncInstance.deviceId,
            records: parsedData,
            devices: Object.fromEntries(devices),
            lastIMEI: lastIMEI,
            exportTime: new Date().toISOString()
        };

        // Merge peer data into our data
        const mergeResult = peerSyncInstance.mergePeerData(parsedData, devices, peerData);

        // Return our data to peer and sync result
        res.json({
            success: true,
            peerData: exportData,
            syncResult: {
                newRecords: mergeResult.newRecords,
                totalRecords: parsedData.length
            },
            message: `Sync complete: ${mergeResult.newRecords} new records added`
        });

        logger.info('Peer sync completed', {
            newRecords: mergeResult.newRecords,
            totalRecords: parsedData.length,
            peerDeviceId: peerData.deviceId
        });
    } catch (error) {
        logger.error('Error during peer sync:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Get peer discovery info
router.get('/discovery', (req, res) => {
    try {
        const deviceIP = peerSync ? peerSync.getDeviceIP() : 'unknown';
        const port = peerSync ? peerSync.port : 3001;
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        
        res.json({
            deviceId: peerSync ? peerSync.deviceId : 'unknown',
            deviceIP: deviceIP,
            port: port,
            connectionUrl: `http://${deviceIP}:${port}/peer/sync`,
            isServerMode: peerSync ? peerSync.isServerMode : false,
            totalRecords: parsedData.length,
            totalDevices: devices.size,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting discovery info:', error);
        res.status(500).json({ error: 'Failed to get discovery info' });
    }
});

// Serve mobile peer sync UI
router.get('/mobile-peer-sync-ui.html', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const uiPath = path.join(__dirname, '../../../mobile-peer-sync-ui.html');
        
        if (fs.existsSync(uiPath)) {
            const content = fs.readFileSync(uiPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(content);
            logger.info('Served mobile peer sync UI');
        } else {
            res.status(404).send('<h1>Mobile Peer Sync UI not found</h1><p>File: mobile-peer-sync-ui.html</p>');
        }
    } catch (error) {
        logger.error('Error serving mobile peer sync UI:', error);
        res.status(500).send('<h1>Error serving mobile peer sync UI</h1>');
    }
});

module.exports = router; 